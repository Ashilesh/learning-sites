// Relationship engine: turns parsed Kubernetes resources into a typed graph.
//
// Every edge carries the manifest path that produced it, so the UI can explain *why*
// two resources are connected. Edges are "explicit" (a field names the target) or
// "inferred" (a DNS name such as svc.ns.svc.cluster.local appears in env/config).

import { groupOf, kindKey, isClusterScoped, kindInfo, RESOURCE_TO_KIND, WORKLOAD_KINDS } from './kinds.js';
import { matchMap, matchLabelSelector, isEmptySelector, selectorToString, compileCalicoSelector } from './selectors.js';
import { chartFromSource } from './parse.js';

export const EDGE_TYPES = {
  selects: { category: 'network', label: 'selects pods' },
  routes: { category: 'network', label: 'routes to' },
  intercepts: { category: 'network', label: 'handles traffic for' },
  attaches: { category: 'network', label: 'attaches to' },
  mirrors: { category: 'network', label: 'mirrors traffic to' },
  governs: { category: 'network', label: 'governing service' },
  aliases: { category: 'network', label: 'aliases' },
  calls: { category: 'network', label: 'calls' },
  scrapes: { category: 'network', label: 'scrapes metrics from' },
  'traffic-policy': { category: 'network', label: 'traffic policy for' },
  'attaches-network': { category: 'network', label: 'attaches network' },
  backs: { category: 'network', label: 'endpoints for' },
  delegates: { category: 'network', label: 'delegates to' },
  'dns-ref': { category: 'network', label: 'references host', inferred: true },
  mounts: { category: 'config', label: 'mounts' },
  env: { category: 'config', label: 'env from' },
  'pull-secret': { category: 'config', label: 'pulls images with' },
  uses: { category: 'config', label: 'uses' },
  writes: { category: 'config', label: 'creates' },
  'reads-from': { category: 'config', label: 'reads from' },
  references: { category: 'config', label: 'references' },
  'runs-as': { category: 'identity', label: 'runs as' },
  grants: { category: 'identity', label: 'grants role' },
  binds: { category: 'identity', label: 'binds subject' },
  permits: { category: 'identity', label: 'permits access to' },
  'token-for': { category: 'identity', label: 'token for' },
  'applies-to': { category: 'policy', label: 'applies to' },
  'ingress-from': { category: 'policy', label: 'allows ingress from' },
  'egress-to': { category: 'policy', label: 'allows egress to' },
  'allows-from': { category: 'policy', label: 'allows requests from' },
  scales: { category: 'policy', label: 'scales' },
  protects: { category: 'policy', label: 'disruption budget for' },
  targets: { category: 'policy', label: 'targets' },
  'grants-ref': { category: 'policy', label: 'allows references from' },
  'issued-by': { category: 'pki', label: 'issued by' },
  tls: { category: 'pki', label: 'serves TLS with' },
  ca: { category: 'pki', label: 'trusts CA from' },
  'cert-for': { category: 'pki', label: 'certificate for' },
  'inject-ca': { category: 'pki', label: 'CA injected from' },
  'signs-with': { category: 'pki', label: 'signs with' },
  claims: { category: 'storage', label: 'storage class' },
  'bound-to': { category: 'storage', label: 'bound to' },
  priority: { category: 'platform', label: 'priority class' },
  runtime: { category: 'platform', label: 'runtime class' },
  class: { category: 'platform', label: 'class' },
  'owned-by': { category: 'platform', label: 'owned by' },
};

const GW = 'gateway.networking.k8s.io';
const ISTIO_NET = 'networking.istio.io';
const CM = 'cert-manager.io';
const RBAC = 'rbac.authorization.k8s.io';

const DEFAULT_GROUP = {
  Gateway: GW, GatewayClass: GW, HTTPRoute: GW, GRPCRoute: GW, TLSRoute: GW, TCPRoute: GW, UDPRoute: GW,
  Certificate: CM, Issuer: CM, ClusterIssuer: CM, Role: RBAC, ClusterRole: RBAC, RoleBinding: RBAC,
  ClusterRoleBinding: RBAC, Deployment: 'apps', StatefulSet: 'apps', DaemonSet: 'apps', ReplicaSet: 'apps',
  Job: 'batch', CronJob: 'batch', IngressClass: 'networking.k8s.io', Ingress: 'networking.k8s.io',
  NetworkPolicy: 'networking.k8s.io', StorageClass: 'storage.k8s.io', PriorityClass: 'scheduling.k8s.io',
  RuntimeClass: 'node.k8s.io', NetworkAttachmentDefinition: 'k8s.cni.cncf.io', VirtualService: ISTIO_NET,
  DestinationRule: ISTIO_NET, ServiceEntry: ISTIO_NET, SecretStore: 'external-secrets.io',
  ClusterSecretStore: 'external-secrets.io', TriggerAuthentication: 'keda.sh',
};

const WELL_KNOWN_EXTERNAL = (n) =>
  (n.kind === 'ServiceAccount' && n.name === 'default') ||
  (n.kind === 'ClusterRole' && (/^system:/.test(n.name) || ['view', 'edit', 'admin', 'cluster-admin'].includes(n.name))) ||
  (n.kind === 'PriorityClass' && /^system-/.test(n.name)) ||
  ['StorageClass', 'IngressClass', 'GatewayClass', 'RuntimeClass'].includes(n.kind);

const str = (x) => (typeof x === 'string' && x.trim() ? x.trim() : null);
const arr = (x) => (Array.isArray(x) ? x : []);
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
const PEER_COLLAPSE = 6;
const BREAKING = new Set(['mounts', 'env', 'runs-as', 'pull-secret']);
const HARD = new Set([...BREAKING, 'routes', 'attaches', 'tls', 'grants', 'binds', 'issued-by', 'signs-with', 'governs', 'scales', 'ca', 'calls', 'attaches-network']);
const SYSTEM_NAMESPACES = new Set(['default', 'kube-system', 'kube-public', 'kube-node-lease']);
const DNS_LABEL = /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/;

export const DEFAULT_OPTIONS = {
  defaultNamespace: 'default',
  clusterDomain: 'cluster.local',
  certManagerNamespace: 'cert-manager',
  trustNamespace: 'cert-manager',
  istioRootNamespace: 'istio-system',
  inferDns: true,
};

export function analyze(resources, options = {}) {
  const o = { ...DEFAULT_OPTIONS, ...Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined && v !== '')) };
  const g = new Graph(o);
  g.build(resources);
  return g.result();
}

class Graph {
  constructor(o) {
    this.o = o;
    this.nodes = new Map();
    this.byKey = new Map();
    this.edges = new Map();
    this.pairs = new Set();
    this.namespaces = new Map();
    this.findings = [];
    this.crdScopes = new Map();
    this.seHosts = new Map();
    this.gwChecks = [];
    this.generatedBy = new Map();
    this.unmatched = [];
  }

  // ------------------------------------------------------------------ build
  build(resources) {
    for (const { obj: r } of resources) {
      if (r.kind === 'CustomResourceDefinition' && r.spec?.names?.kind && r.spec?.group) {
        this.crdScopes.set(kindKey(r.spec.names.kind, r.spec.group), r.spec.scope);
      }
    }
    for (const r of resources) this.addResource(r.obj, r.source);
    this.ensureNamespace(this.o.defaultNamespace, { release: true });

    const defined = [...this.nodes.values()].filter((n) => n.status === 'defined');
    for (const n of defined) if (n.kind === 'ServiceEntry') this.indexServiceEntry(n);
    for (const n of defined) {
      try { this.handle(n); } catch (e) { n.notes.push(`Analysis error: ${e.message}`); }
    }
    for (const n of defined) {
      try { this.handleMetadata(n); } catch (e) { n.notes.push(`Analysis error: ${e.message}`); }
    }
    this.checkGatewayApi();
    if (this.o.inferDns) for (const n of defined) this.inferDns(n);
    this.finalize();
  }

  ensureNamespace(name, { defined = false, labels, obj: nsObj, source, release = false } = {}) {
    if (!name) return null;
    let ns = this.namespaces.get(name);
    if (!ns) {
      ns = { id: `ns:${name}`, name, defined: false, release: false, labels: {}, obj: null, source: null, count: 0 };
      this.namespaces.set(name, ns);
    }
    if (defined) { ns.defined = true; ns.obj = nsObj; ns.source = source; ns.labels = { ...(labels || {}) }; }
    if (release) ns.release = true;
    return ns;
  }

  nsLabels(name) {
    const ns = this.namespaces.get(name);
    return { ...(ns?.labels || {}), 'kubernetes.io/metadata.name': name, 'projectcalico.org/name': name };
  }

  addResource(r, source) {
    const kind = r.kind;
    const group = groupOf(r.apiVersion);
    const meta = r.metadata || {};
    const name = String(meta.name || meta.generateName);
    if (kind === 'Namespace') {
      const existing = this.namespaces.get(name);
      if (existing?.defined) this.duplicate(`Namespace ${name}`, source, existing.source);
      this.ensureNamespace(name, { defined: true, labels: meta.labels, obj: r, source });
      return;
    }
    const cluster = isClusterScoped(kind, group, this.crdScopes);
    const namespace = cluster ? null : String(meta.namespace || this.o.defaultNamespace);
    const id = nodeId(kind, group, namespace, name);
    if (this.nodes.has(id)) {
      this.duplicate(`${kind} ${namespace ? namespace + '/' : ''}${name}`, source, this.nodes.get(id).source, id);
      return;
    }
    const { category, abbrev } = kindInfo(kind);
    const ann = obj(meta.annotations);
    const n = {
      id, kind, group, apiVersion: r.apiVersion || '', name, namespace, clusterScoped: cluster,
      status: 'defined', category, abbrev, labels: obj(meta.labels), annotations: ann, source,
      chart: chartFromSource(source), hook: str(ann['helm.sh/hook']), obj: r, notes: [],
    };
    const tpl = podTemplate(r);
    if (tpl) { n.pod = tpl; n.podLabels = obj(tpl.meta.labels); n.isWorkload = true; }
    this.insertNode(n);
    if (namespace) this.ensureNamespace(namespace).count++;
  }

  insertNode(n) {
    this.nodes.set(n.id, n);
    const k = `${n.kind}|${n.namespace ?? ''}|${n.name}`;
    if (!this.byKey.has(k)) this.byKey.set(k, []);
    this.byKey.get(k).push(n);
  }

  duplicate(what, a, b, id) {
    this.findings.push({
      severity: 'error', code: 'duplicate', title: `Duplicate resource: ${what}`,
      message: `Rendered more than once${[a, b].some(Boolean) ? ` (${[...new Set([a, b].filter(Boolean))].join(' and ')})` : ''}. Helm refuses to install a release that defines the same object twice.`,
      nodes: id ? [id] : [],
    });
  }

  find(kind, namespace, name, group = null) {
    const list = this.byKey.get(`${kind}|${namespace ?? ''}|${name}`);
    if (!list || !list.length) return null;
    if (group === null || group === undefined) return list[0];
    const exact = list.find((n) => n.group === group);
    if (exact) return exact;
    // apiVersion omitted (e.g. scaleTargetRef without apiVersion) → accept any defined match
    if (group === '') return list.find((n) => n.status === 'defined') || null;
    return null;
  }

  /** Resolve a reference to a resource, creating an "external" node when the chart does not define it. */
  ref({ kind, group = null, namespace = null, name }, from, type, detail, extra = {}) {
    name = str(name);
    kind = str(kind);
    if (!name || !kind || name.includes('{{')) return null;
    const effGroup = group ?? DEFAULT_GROUP[kind] ?? '';
    const cluster = isClusterScoped(kind, effGroup, this.crdScopes);
    let ns = cluster ? null : (str(namespace) || from.namespace || this.o.defaultNamespace);
    if (!cluster && !str(namespace) && from.namespace === null) {
      // A cluster-scoped object (BGPPeer, ClusterIssuer...) naming a namespaced one without a namespace:
      // prefer the single matching object the chart defines, wherever it lives.
      const hits = [...this.nodes.values()].filter((x) => x.kind === kind && x.name === name && x.status === 'defined');
      if (hits.length === 1) ns = hits[0].namespace;
    }
    let target = this.find(kind, ns, name, group);
    if (!target) {
      if (extra.onlyExisting) return null;
      target = this.addPlaceholder(kind, effGroup, ns, name, 'external');
    }
    if (extra.skipIfLinked && (this.pairs.has(`${from.id}|${target.id}`))) return null;
    return this.addEdge(from.id, target.id, type, detail, extra);
  }

  addPlaceholder(kind, group, namespace, name, status) {
    const id = nodeId(kind, group, namespace, name);
    const existing = this.nodes.get(id);
    if (existing) return existing;
    const { category, abbrev } = kindInfo(kind);
    const n = {
      id, kind, group, apiVersion: group ? `${group}/*` : 'v1', name, namespace, clusterScoped: namespace === null,
      status, category, abbrev, labels: {}, annotations: {}, source: null, chart: null, hook: null, obj: null, notes: [],
    };
    this.insertNode(n);
    if (namespace && namespace !== '__external') this.ensureNamespace(namespace);
    return n;
  }

  /** Pseudo node outside any namespace: CIDR blocks, users, external hosts, "any namespace". */
  external(kind, name) {
    return this.addPlaceholder(kind, '', '__external', name, 'pseudo');
  }

  /** Pseudo node for a pod selector that matched nothing in a namespace. */
  selectorNode(namespace, selText) {
    return this.addPlaceholder('PodSelector', '', namespace, `{${selText}}`, 'pseudo');
  }

  nsTarget(name) {
    const ns = this.ensureNamespace(name);
    return ns.id;
  }

  addEdge(source, target, type, detail, extra = {}) {
    if (!source || !target || source === target) return null;
    const t = EDGE_TYPES[type] || { category: 'config', label: type };
    const key = `${source}|${target}|${type}`;
    let e = this.edges.get(key);
    if (!e) {
      e = {
        id: `e${this.edges.size + 1}`, source, target, type, label: extra.label || t.label,
        category: extra.category || t.category, inferred: !!(extra.inferred ?? t.inferred), details: [],
      };
      this.edges.set(key, e);
      if (!e.inferred) this.pairs.add(`${source}|${target}`);
    }
    if (extra.optional) e.optional = true;
    if (detail && e.details.length < 25 && !e.details.some((d) => d.path === detail.path && d.text === detail.text)) {
      e.details.push(detail);
    }
    return e;
  }

  markGenerated(nodeId, byId) {
    if (!this.generatedBy.has(nodeId)) this.generatedBy.set(nodeId, new Set());
    this.generatedBy.get(nodeId).add(byId);
  }

  /** Link a policy to the workloads a peer selector matched; broad selectors collapse into one selector node. */
  linkPeers(n, matched, namespaces, selText, type, detail, extra) {
    if (matched.length <= PEER_COLLAPSE) {
      for (const w of matched) this.addEdge(n.id, w.id, type, detail, extra);
      return;
    }
    const nss = [...new Set(matched.map((w) => w.namespace))];
    const pseudo = nss.length === 1 ? this.selectorNode(nss[0], selText) : this.external('PodSelector', `{${selText}} in ${nss.length} namespaces`);
    pseudo.matches = [...new Set([...(pseudo.matches || []), ...matched.map((w) => w.id)])];
    this.addEdge(n.id, pseudo.id, type, { ...detail, text: [detail?.text, `${matched.length} workloads`].filter(Boolean).join(', ') }, extra);
  }

  workloads(namespaces) {
    const out = [];
    for (const n of this.nodes.values()) {
      if (!n.isWorkload) continue;
      if (namespaces === null || namespaces === undefined) out.push(n);
      else if (Array.isArray(namespaces) ? namespaces.includes(n.namespace) : n.namespace === namespaces) out.push(n);
    }
    return out;
  }

  unmatchedSelector(n, what, selText, severity = 'info') {
    this.unmatched.push({ node: n, what, selText, severity });
  }

  // --------------------------------------------------------------- handlers
  handle(n) {
    const k = n.kind;
    const grp = n.group;
    if (n.pod) this.podSpec(n);
    switch (k) {
      case 'Service': return this.service(n);
      case 'StatefulSet': return this.statefulSet(n);
      case 'Ingress': return this.ingress(n);
      case 'Gateway': return grp === ISTIO_NET ? this.istioGateway(n) : this.gatewayApiGateway(n);
      case 'HTTPRoute': case 'GRPCRoute': case 'TLSRoute': case 'TCPRoute': case 'UDPRoute': return this.route(n);
      case 'ReferenceGrant': return this.referenceGrant(n);
      case 'BackendTLSPolicy': return this.backendTlsPolicy(n);
      case 'NetworkPolicy':
        if (grp.includes('projectcalico.org')) return this.calicoPolicy(n, false);
        return this.networkPolicy(n);
      case 'GlobalNetworkPolicy': return this.calicoPolicy(n, true);
      case 'CiliumNetworkPolicy': return this.ciliumPolicy(n, false);
      case 'CiliumClusterwideNetworkPolicy': return this.ciliumPolicy(n, true);
      case 'RoleBinding': return this.binding(n, false);
      case 'ClusterRoleBinding': return this.binding(n, true);
      case 'Role': return this.role(n);
      case 'ServiceAccount': return this.serviceAccount(n);
      case 'Secret': return this.secret(n);
      case 'HorizontalPodAutoscaler': return this.scaleTarget(n, n.obj.spec?.scaleTargetRef, 'spec.scaleTargetRef');
      case 'VerticalPodAutoscaler': return this.scaleTarget(n, n.obj.spec?.targetRef, 'spec.targetRef');
      case 'ScaledObject': return this.keda(n);
      case 'PodDisruptionBudget': return this.pdb(n);
      case 'PersistentVolumeClaim': return this.pvc(n);
      case 'PersistentVolume': return this.pv(n);
      case 'Endpoints': return this.endpoints(n);
      case 'EndpointSlice': return this.endpointSlice(n);
      case 'MutatingWebhookConfiguration': case 'ValidatingWebhookConfiguration': return this.webhooks(n);
      case 'APIService': return this.apiService(n);
      case 'CustomResourceDefinition': return this.crd(n);
      case 'Certificate': if (grp === CM) return this.certificate(n); break;
      case 'Issuer': case 'ClusterIssuer': if (grp === CM) return this.issuer(n); break;
      case 'Bundle': if (grp === 'trust.cert-manager.io') return this.trustBundle(n); break;
      case 'ExternalSecret': return this.externalSecret(n);
      case 'SealedSecret': return this.ref({ kind: 'Secret', group: '', name: n.obj.spec?.template?.metadata?.name || n.name }, n, 'writes', { path: 'metadata.name' });
      case 'VirtualService': return this.virtualService(n);
      case 'DestinationRule': return this.destinationRule(n);
      case 'ServiceEntry': return this.serviceEntry(n);
      case 'Sidecar': return this.sidecar(n);
      case 'PeerAuthentication': case 'RequestAuthentication': case 'Telemetry': case 'WasmPlugin':
        return this.istioSelectorPolicy(n, n.obj.spec?.selector?.matchLabels, 'spec.selector.matchLabels');
      case 'EnvoyFilter': return this.istioSelectorPolicy(n, n.obj.spec?.workloadSelector?.labels, 'spec.workloadSelector.labels');
      case 'AuthorizationPolicy': return this.authorizationPolicy(n);
      case 'ServiceMonitor': return this.serviceMonitor(n);
      case 'PodMonitor': return this.podMonitor(n);
    }
    this.generic(n);
  }

  podSpec(n) {
    const { spec: sp, path: p } = n.pod;
    const sa = str(sp.serviceAccountName) || str(sp.serviceAccount);
    if (sa) this.ref({ kind: 'ServiceAccount', group: '', name: sa }, n, 'runs-as', { path: `${p}.serviceAccountName` });
    arr(sp.imagePullSecrets).forEach((s, i) =>
      this.ref({ kind: 'Secret', group: '', name: s?.name }, n, 'pull-secret', { path: `${p}.imagePullSecrets[${i}].name` }));
    if (str(sp.priorityClassName)) this.ref({ kind: 'PriorityClass', group: 'scheduling.k8s.io', name: sp.priorityClassName }, n, 'priority', { path: `${p}.priorityClassName` });
    if (str(sp.runtimeClassName)) this.ref({ kind: 'RuntimeClass', group: 'node.k8s.io', name: sp.runtimeClassName }, n, 'runtime', { path: `${p}.runtimeClassName` });

    arr(sp.volumes).forEach((v, i) => {
      if (!v || typeof v !== 'object') return;
      const vp = `${p}.volumes[${i}]`;
      const text = v.name ? `volume “${v.name}”` : undefined;
      if (v.configMap) this.ref({ kind: 'ConfigMap', group: '', name: v.configMap.name }, n, 'mounts', { path: `${vp}.configMap.name`, text }, { optional: v.configMap.optional });
      if (v.secret) this.ref({ kind: 'Secret', group: '', name: v.secret.secretName }, n, 'mounts', { path: `${vp}.secret.secretName`, text }, { optional: v.secret.optional });
      if (v.persistentVolumeClaim) this.ref({ kind: 'PersistentVolumeClaim', group: '', name: v.persistentVolumeClaim.claimName }, n, 'mounts', { path: `${vp}.persistentVolumeClaim.claimName`, text }, { category: 'storage' });
      arr(v.projected?.sources).forEach((s, j) => {
        if (s?.configMap) this.ref({ kind: 'ConfigMap', group: '', name: s.configMap.name }, n, 'mounts', { path: `${vp}.projected.sources[${j}].configMap.name`, text }, { optional: s.configMap.optional });
        if (s?.secret) this.ref({ kind: 'Secret', group: '', name: s.secret.name }, n, 'mounts', { path: `${vp}.projected.sources[${j}].secret.name`, text }, { optional: s.secret.optional });
        if (s?.clusterTrustBundle?.name) this.ref({ kind: 'ClusterTrustBundle', group: 'certificates.k8s.io', name: s.clusterTrustBundle.name }, n, 'mounts', { path: `${vp}.projected.sources[${j}].clusterTrustBundle`, text }, { category: 'pki' });
      });
      const sc = v.ephemeral?.volumeClaimTemplate?.spec?.storageClassName;
      if (str(sc)) this.ref({ kind: 'StorageClass', group: 'storage.k8s.io', name: sc }, n, 'claims', { path: `${vp}.ephemeral.volumeClaimTemplate.spec.storageClassName`, text });
      for (const [key, val] of Object.entries(v)) {
        if (key === 'secret' || key === 'configMap') continue;
        const ref = val?.secretRef || val?.nodePublishSecretRef;
        if (ref && str(ref.name)) this.ref({ kind: 'Secret', group: '', name: ref.name }, n, 'uses', { path: `${vp}.${key}`, text });
        if (str(val?.secretName) && key !== 'secret') this.ref({ kind: 'Secret', group: '', name: val.secretName }, n, 'uses', { path: `${vp}.${key}.secretName`, text });
      }
    });

    for (const field of ['initContainers', 'containers', 'ephemeralContainers']) {
      arr(sp[field]).forEach((c, ci) => {
        if (!c) return;
        const cp = `${p}.${field}[${ci}]`;
        const cn = c.name ? `container “${c.name}”` : 'container';
        arr(c.envFrom).forEach((ef, j) => {
          if (ef?.configMapRef) this.ref({ kind: 'ConfigMap', group: '', name: ef.configMapRef.name }, n, 'env', { path: `${cp}.envFrom[${j}].configMapRef`, text: cn }, { optional: ef.configMapRef.optional });
          if (ef?.secretRef) this.ref({ kind: 'Secret', group: '', name: ef.secretRef.name }, n, 'env', { path: `${cp}.envFrom[${j}].secretRef`, text: cn }, { optional: ef.secretRef.optional });
        });
        arr(c.env).forEach((ev, j) => {
          const vf = ev?.valueFrom;
          if (!vf) return;
          const text = `${cn} env ${ev.name}`;
          if (vf.configMapKeyRef) this.ref({ kind: 'ConfigMap', group: '', name: vf.configMapKeyRef.name }, n, 'env', { path: `${cp}.env[${j}].valueFrom.configMapKeyRef`, text }, { optional: vf.configMapKeyRef.optional });
          if (vf.secretKeyRef) this.ref({ kind: 'Secret', group: '', name: vf.secretKeyRef.name }, n, 'env', { path: `${cp}.env[${j}].valueFrom.secretKeyRef`, text }, { optional: vf.secretKeyRef.optional });
        });
      });
    }

    const nets = n.pod.meta?.annotations?.['k8s.v1.cni.cncf.io/networks'];
    if (str(nets)) {
      for (const att of parseMultus(nets)) {
        this.ref({ kind: 'NetworkAttachmentDefinition', group: 'k8s.cni.cncf.io', namespace: att.namespace, name: att.name }, n,
          'attaches-network', { path: `${n.pod.metaPath}.annotations[k8s.v1.cni.cncf.io/networks]`, text: att.iface ? `interface ${att.iface}` : undefined });
      }
    }
  }

  service(n) {
    const sp = obj(n.obj.spec);
    if (sp.type === 'ExternalName' && str(sp.externalName)) {
      const t = this.resolveHost(sp.externalName, n.namespace, { ghost: true, externalHosts: true });
      if (t) this.addEdge(n.id, t.id, 'aliases', { path: 'spec.externalName', text: sp.externalName });
      return;
    }
    const sel = obj(sp.selector);
    if (!Object.keys(sel).length) return;
    const matched = this.workloads(n.namespace).filter((w) => matchMap(sel, w.podLabels));
    for (const w of matched) this.addEdge(n.id, w.id, 'selects', { path: 'spec.selector', text: selectorToString(sel) });
    if (!matched.length) this.unmatchedSelector(n, 'spec.selector', selectorToString(sel), 'warn');
  }

  statefulSet(n) {
    const sp = obj(n.obj.spec);
    if (str(sp.serviceName)) this.ref({ kind: 'Service', group: '', name: sp.serviceName }, n, 'governs', { path: 'spec.serviceName' });
    arr(sp.volumeClaimTemplates).forEach((t, i) => {
      const sc = t?.spec?.storageClassName;
      if (str(sc)) this.ref({ kind: 'StorageClass', group: 'storage.k8s.io', name: sc }, n, 'claims', { path: `spec.volumeClaimTemplates[${i}].spec.storageClassName`, text: t.metadata?.name });
    });
  }

  ingress(n) {
    const sp = obj(n.obj.spec);
    const ann = n.annotations;
    const cls = str(sp.ingressClassName) || str(ann['kubernetes.io/ingress.class']);
    if (cls) this.ref({ kind: 'IngressClass', group: 'networking.k8s.io', name: cls }, n, 'class', { path: sp.ingressClassName ? 'spec.ingressClassName' : 'metadata.annotations[kubernetes.io/ingress.class]' });
    const issued = str(ann['cert-manager.io/cluster-issuer']) || str(ann['cert-manager.io/issuer']);
    arr(sp.tls).forEach((t, i) => {
      if (!str(t?.secretName)) return;
      const e = this.ref({ kind: 'Secret', group: '', name: t.secretName }, n, 'tls', { path: `spec.tls[${i}].secretName`, text: arr(t.hosts).join(', ') || undefined });
      if (e && issued) this.markGenerated(e.target, n.id);
    });
    const backend = (b, path) => {
      if (!b) return;
      const svc = b.service?.name || b.serviceName;
      const port = b.service?.port?.number || b.service?.port?.name || b.servicePort;
      if (str(svc)) this.ref({ kind: 'Service', group: '', name: svc }, n, 'routes', { path, text: port ? `port ${port}` : undefined });
      if (b.resource?.name) this.ref({ kind: b.resource.kind, group: b.resource.apiGroup ?? '', name: b.resource.name }, n, 'routes', { path: `${path}.resource` });
    };
    backend(sp.defaultBackend || sp.backend, 'spec.defaultBackend');
    arr(sp.rules).forEach((r, i) => arr(r?.http?.paths).forEach((pth, j) =>
      backend(pth?.backend, `spec.rules[${i}].http.paths[${j}].backend`)));
    for (const key of ['auth-tls-secret', 'proxy-ssl-secret', 'auth-secret']) {
      const v = str(ann[`nginx.ingress.kubernetes.io/${key}`]);
      if (!v) continue;
      const [ns, name] = splitNsName(v, n.namespace);
      this.ref({ kind: 'Secret', group: '', namespace: ns, name }, n, key === 'auth-secret' ? 'uses' : 'ca', { path: `metadata.annotations[nginx.ingress.kubernetes.io/${key}]` }, { category: 'pki' });
    }
    const db = str(ann['nginx.ingress.kubernetes.io/default-backend']);
    if (db) { const [ns, name] = splitNsName(db, n.namespace); this.ref({ kind: 'Service', group: '', namespace: ns, name }, n, 'routes', { path: 'metadata.annotations[nginx.ingress.kubernetes.io/default-backend]' }); }
  }

  gatewayApiGateway(n) {
    const sp = obj(n.obj.spec);
    if (str(sp.gatewayClassName)) this.ref({ kind: 'GatewayClass', group: GW, name: sp.gatewayClassName }, n, 'class', { path: 'spec.gatewayClassName' });
    const issued = str(n.annotations['cert-manager.io/cluster-issuer']) || str(n.annotations['cert-manager.io/issuer']);
    arr(sp.listeners).forEach((l, i) => {
      arr(l?.tls?.certificateRefs).forEach((c, j) => {
        if (!c) return;
        const e = this.ref({ kind: c.kind || 'Secret', group: c.group ?? '', namespace: c.namespace, name: c.name }, n, 'tls',
          { path: `spec.listeners[${i}].tls.certificateRefs[${j}]`, text: l.name ? `listener ${l.name}` : undefined });
        if (e) { this.gwChecks.push({ type: 'cert', from: n, edge: e }); if (issued) this.markGenerated(e.target, n.id); }
      });
      arr(l?.tls?.frontendValidation?.caCertificateRefs).forEach((c, j) => {
        const e = this.ref({ kind: c?.kind || 'ConfigMap', group: c?.group ?? '', namespace: c?.namespace, name: c?.name }, n, 'ca', { path: `spec.listeners[${i}].tls.frontendValidation.caCertificateRefs[${j}]` });
        if (e) this.gwChecks.push({ type: 'cert', from: n, edge: e });
      });
    });
    const pr = sp.infrastructure?.parametersRef;
    if (pr?.name) this.ref({ kind: pr.kind, group: pr.group ?? '', name: pr.name }, n, 'uses', { path: 'spec.infrastructure.parametersRef' });
  }

  route(n) {
    const sp = obj(n.obj.spec);
    arr(sp.parentRefs).forEach((p, i) => {
      if (!p) return;
      const e = this.ref({ kind: p.kind || 'Gateway', group: p.group ?? GW, namespace: p.namespace, name: p.name }, n, 'attaches',
        { path: `spec.parentRefs[${i}]`, text: p.sectionName ? `listener ${p.sectionName}` : undefined });
      if (e) this.gwChecks.push({ type: 'parent', from: n, edge: e, ref: p });
    });
    const backendRef = (b, path, type) => {
      if (!b) return;
      const e = this.ref({ kind: b.kind || 'Service', group: b.group ?? '', namespace: b.namespace, name: b.name }, n, type,
        { path, text: b.port ? `port ${b.port}` : undefined });
      if (e) this.gwChecks.push({ type: 'backend', from: n, edge: e });
    };
    const filters = (fs, path) => arr(fs).forEach((f, k) => {
      if (f?.requestMirror?.backendRef) backendRef(f.requestMirror.backendRef, `${path}[${k}].requestMirror.backendRef`, 'mirrors');
      if (f?.extensionRef?.name) this.ref({ kind: f.extensionRef.kind, group: f.extensionRef.group ?? '', name: f.extensionRef.name }, n, 'uses', { path: `${path}[${k}].extensionRef` });
    });
    arr(sp.rules).forEach((r, i) => {
      arr(r?.backendRefs).forEach((b, j) => {
        backendRef(b, `spec.rules[${i}].backendRefs[${j}]`, 'routes');
        filters(b?.filters, `spec.rules[${i}].backendRefs[${j}].filters`);
      });
      filters(r?.filters, `spec.rules[${i}].filters`);
    });
  }

  referenceGrant(n) {
    const sp = obj(n.obj.spec);
    arr(sp.from).forEach((f, i) => {
      if (!str(f?.namespace)) return;
      if (f.namespace !== n.namespace) this.addEdge(n.id, this.nsTarget(f.namespace), 'grants-ref', { path: `spec.from[${i}]`, text: `${f.kind || '*'} in ${f.namespace}` });
    });
    arr(sp.to).forEach((t, i) => {
      if (str(t?.name)) this.ref({ kind: t.kind, group: t.group ?? '', name: t.name }, n, 'targets', { path: `spec.to[${i}]` }, { onlyExisting: true });
    });
  }

  backendTlsPolicy(n) {
    const sp = obj(n.obj.spec);
    this.targetRefs(n);
    arr(sp.validation?.caCertificateRefs).forEach((c, i) =>
      this.ref({ kind: c?.kind || 'ConfigMap', group: c?.group ?? '', name: c?.name }, n, 'ca', { path: `spec.validation.caCertificateRefs[${i}]` }));
  }

  /** Policy attachment (Gateway API / Envoy Gateway / Istio): spec.targetRef / spec.targetRefs */
  targetRefs(n) {
    const sp = obj(n.obj.spec);
    const refs = [...arr(sp.targetRefs).map((t, i) => [t, `spec.targetRefs[${i}]`]), ...(sp.targetRef ? [[sp.targetRef, 'spec.targetRef']] : [])];
    for (const [t, path] of refs) {
      if (!t || !str(t.name)) continue;
      this.ref({ kind: t.kind, group: t.group ?? (t.apiVersion ? groupOf(t.apiVersion) : null), namespace: t.namespace, name: t.name }, n, 'targets',
        { path, text: t.sectionName ? `section ${t.sectionName}` : undefined });
    }
    return refs.length > 0;
  }

  networkPolicy(n) {
    const sp = obj(n.obj.spec);
    this.applyLabelSelector(n, sp.podSelector, 'spec.podSelector', [n.namespace], 'pods');
    const types = arr(sp.policyTypes);
    if (types.includes('Ingress') && !arr(sp.ingress).length) n.notes.push('Denies all ingress to the selected pods');
    if (types.includes('Egress') && !arr(sp.egress).length) n.notes.push('Denies all egress from the selected pods');
    const rule = (list, field, type) => arr(list).forEach((r, i) => {
      const peers = arr(r?.[field]);
      const ports = portsText(r?.ports);
      if (!peers.length) n.notes.push(`${type === 'ingress-from' ? 'Allows ingress from anywhere' : 'Allows egress to anywhere'}${ports ? ` on ${ports}` : ''}`);
      peers.forEach((peer, j) => this.k8sPeer(n, peer, type, `spec.${type === 'ingress-from' ? 'ingress' : 'egress'}[${i}].${field}[${j}]`, ports));
    });
    rule(sp.ingress, 'from', 'ingress-from');
    rule(sp.egress, 'to', 'egress-to');
  }

  applyLabelSelector(n, sel, path, namespaces, what, keyMap) {
    if (isEmptySelector(sel)) {
      n.namespaceWide = true;
      n.notes.push(namespaces === null ? 'Applies to every pod in the cluster' : `Applies to every pod in namespace ${namespaces.join(', ')}`);
      return;
    }
    const matched = this.workloads(namespaces).filter((w) => matchLabelSelector(sel, w.podLabels, keyMap));
    for (const w of matched) this.addEdge(n.id, w.id, 'applies-to', { path, text: selectorToString(sel) });
    if (!matched.length) this.unmatchedSelector(n, path, selectorToString(sel));
  }

  k8sPeer(n, peer, type, path, ports) {
    if (!peer || typeof peer !== 'object') return;
    const text = ports ? `ports ${ports}` : undefined;
    if (peer.ipBlock?.cidr) {
      const ex = arr(peer.ipBlock.except);
      const t = this.external('IPBlock', ex.length ? `${peer.ipBlock.cidr} except ${ex.join(', ')}` : peer.ipBlock.cidr);
      this.addEdge(n.id, t.id, type, { path, text });
      return;
    }
    let nsNames = [n.namespace];
    let all = false;
    let nsSelText = null;
    if (peer.namespaceSelector) {
      const m = this.matchNamespaces(peer.namespaceSelector);
      all = m.all; nsNames = m.names; nsSelText = m.selText;
    }
    const podSel = peer.podSelector;
    if (podSel && !isEmptySelector(podSel)) {
      const selText = selectorToString(podSel);
      if (!all && !nsNames.length) {
        const t = this.external('NamespaceSelector', `pods {${selText}} in namespaces {${nsSelText}}`);
        this.addEdge(n.id, t.id, type, { path, text });
        return;
      }
      const matched = this.workloads(all ? null : nsNames).filter((w) => matchLabelSelector(podSel, w.podLabels));
      this.linkPeers(n, matched, nsNames, selText, type, { path, text });
      if (!matched.length) {
        if (all) this.addEdge(n.id, this.external('PodSelector', `{${selText}} in any namespace`).id, type, { path, text });
        else for (const ns of nsNames) this.addEdge(n.id, this.selectorNode(ns, selText).id, type, { path, text });
      }
      return;
    }
    if (all) { this.addEdge(n.id, this.external('AnyNamespace', 'all namespaces').id, type, { path, text }); return; }
    if (!nsNames.length) { this.addEdge(n.id, this.external('NamespaceSelector', `namespaces {${nsSelText}}`).id, type, { path, text }); return; }
    for (const ns of nsNames) {
      if (ns === n.namespace) n.notes.push(`${type === 'ingress-from' ? 'Allows ingress from' : 'Allows egress to'} every pod in its own namespace${ports ? ` on ${ports}` : ''}`);
      else this.addEdge(n.id, this.nsTarget(ns), type, { path, text: text ? `all pods, ${text}` : 'all pods' });
    }
  }

  matchNamespaces(sel) {
    if (isEmptySelector(sel)) return { all: true, names: [] };
    const selText = selectorToString(sel);
    const ml = obj(sel.matchLabels);
    let explicit = null;
    if (str(ml['kubernetes.io/metadata.name'])) explicit = [ml['kubernetes.io/metadata.name']];
    for (const e of arr(sel.matchExpressions)) {
      if (e?.key === 'kubernetes.io/metadata.name' && e.operator === 'In') explicit = arr(e.values).map(String);
    }
    if (explicit) {
      for (const x of explicit) this.ensureNamespace(x);
      return { all: false, names: explicit, selText };
    }
    const names = [...this.namespaces.keys()].filter((x) => matchLabelSelector(sel, this.nsLabels(x)));
    return { all: false, names, selText };
  }

  calicoPolicy(n, global) {
    const sp = obj(n.obj.spec);
    const allNs = [...this.namespaces.keys()];
    let scope = global ? allNs : [n.namespace];
    if (global && str(sp.namespaceSelector)) {
      const nsPred = compileCalicoSelector(sp.namespaceSelector);
      if (nsPred) scope = allNs.filter((x) => nsPred(this.nsLabels(x)));
    }
    const selExpr = sp.selector ?? 'all()';
    const pred = compileCalicoSelector(selExpr);
    if (!pred) n.notes.push(`Could not parse selector: ${selExpr}`);
    else if (/^\s*(all\(\))?\s*$/.test(String(selExpr))) {
      n.namespaceWide = true;
      n.notes.push(global ? 'Applies to every endpoint in the cluster' : `Applies to every pod in namespace ${n.namespace}`);
    } else {
      const matched = this.workloads(scope).filter((w) => pred(w.podLabels));
      for (const w of matched) this.addEdge(n.id, w.id, 'applies-to', { path: 'spec.selector', text: String(selExpr) });
      if (!matched.length) this.unmatchedSelector(n, 'spec.selector', String(selExpr));
    }
    const ruleSide = (list, field, type) => arr(list).forEach((r, i) => {
      const side = r?.[field];
      const path = `spec.${type === 'ingress-from' ? 'ingress' : 'egress'}[${i}].${field}`;
      const action = r?.action || 'Allow';
      const label = action === 'Deny' ? (type === 'ingress-from' ? 'denies ingress from' : 'denies egress to') : undefined;
      const ports = arr(r?.destination?.ports).join(', ');
      const text = [action !== 'Allow' ? action : null, ports ? `ports ${ports}` : null].filter(Boolean).join(', ') || undefined;
      if (!side || typeof side !== 'object' || !Object.keys(side).length) return;
      arr(side.nets).forEach((cidr) => this.addEdge(n.id, this.external('IPBlock', String(cidr)).id, type, { path: `${path}.nets`, text }, { label }));
      if (side.services?.name) this.ref({ kind: 'Service', group: '', namespace: side.services.namespace, name: side.services.name }, n, type, { path: `${path}.services`, text }, { label });
      let nsScope = global ? allNs : [n.namespace];
      let explicitNs = null;
      if (str(side.namespaceSelector)) {
        const p2 = compileCalicoSelector(side.namespaceSelector);
        explicitNs = [...String(side.namespaceSelector).matchAll(/(?:projectcalico\.org\/name|kubernetes\.io\/metadata\.name)\s*==\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
        explicitNs.forEach((x) => this.ensureNamespace(x));
        nsScope = p2 ? [...this.namespaces.keys()].filter((x) => p2(this.nsLabels(x))) : explicitNs;
      }
      if (str(side.selector)) {
        const p3 = compileCalicoSelector(side.selector);
        const matched = p3 ? this.workloads(nsScope).filter((w) => p3(w.podLabels)) : [];
        this.linkPeers(n, matched, nsScope, side.selector, type, { path: `${path}.selector`, text }, { label });
        if (!matched.length) {
          if (nsScope.length === 1) this.addEdge(n.id, this.selectorNode(nsScope[0], side.selector).id, type, { path: `${path}.selector`, text }, { label });
          else this.addEdge(n.id, this.external('PodSelector', `${side.selector}${side.namespaceSelector ? ` in ${side.namespaceSelector}` : ''}`).id, type, { path: `${path}.selector`, text }, { label });
        }
      } else if (str(side.namespaceSelector)) {
        if (nsScope.length) for (const ns of nsScope) { if (ns !== n.namespace) this.addEdge(n.id, this.nsTarget(ns), type, { path: `${path}.namespaceSelector`, text }, { label }); }
        else this.addEdge(n.id, this.external('NamespaceSelector', `namespaces {${side.namespaceSelector}}`).id, type, { path: `${path}.namespaceSelector`, text }, { label });
      }
      const sas = side.serviceAccounts;
      if (sas && arr(sas.names).length && nsScope.length === 1) {
        for (const sa of sas.names) this.ref({ kind: 'ServiceAccount', group: '', namespace: nsScope[0], name: sa }, n, type, { path: `${path}.serviceAccounts`, text }, { label });
      }
    });
    ruleSide(sp.ingress, 'source', 'ingress-from');
    ruleSide(sp.egress, 'destination', 'egress-to');
  }

  ciliumPolicy(n, clusterwide) {
    const specs = n.obj.specs ? arr(n.obj.specs).map((s, i) => [s, `specs[${i}]`]) : [[obj(n.obj.spec), 'spec']];
    for (const [sp, base] of specs) {
      if (!sp) continue;
      if (sp.endpointSelector) {
        const { sel, namespaces } = ciliumSelector(sp.endpointSelector);
        this.applyLabelSelector(n, sel, `${base}.endpointSelector`, namespaces || (clusterwide ? null : [n.namespace]), 'pods');
      }
      const side = (list, prefix, type) => arr(list).forEach((r, i) => {
        if (!r) return;
        const path = `${base}.${type === 'ingress-from' ? 'ingress' : 'egress'}[${i}]`;
        const ports = arr(r.toPorts).flatMap((tp) => arr(tp?.ports).map((p) => `${p?.port}${p?.protocol ? '/' + p.protocol : ''}`)).join(', ');
        const text = ports ? `ports ${ports}` : undefined;
        arr(r[`${prefix}Endpoints`]).forEach((es, j) => {
          const { sel, namespaces } = ciliumSelector(es);
          const scope = namespaces || (clusterwide ? null : [n.namespace]);
          if (isEmptySelector(sel)) {
            if (scope === null) this.addEdge(n.id, this.external('AnyNamespace', 'all endpoints').id, type, { path: `${path}.${prefix}Endpoints[${j}]`, text });
            else for (const ns of scope) if (ns !== n.namespace) this.addEdge(n.id, this.nsTarget(ns), type, { path: `${path}.${prefix}Endpoints[${j}]`, text });
            return;
          }
          const matched = this.workloads(scope).filter((w) => matchLabelSelector(sel, w.podLabels));
          this.linkPeers(n, matched, scope, selectorToString(sel), type, { path: `${path}.${prefix}Endpoints[${j}]`, text });
          if (!matched.length) {
            const selText = selectorToString(sel);
            if (scope && scope.length === 1) this.addEdge(n.id, this.selectorNode(scope[0], selText).id, type, { path: `${path}.${prefix}Endpoints[${j}]`, text });
            else this.addEdge(n.id, this.external('PodSelector', `{${selText}} in any namespace`).id, type, { path: `${path}.${prefix}Endpoints[${j}]`, text });
          }
        });
        [...arr(r[`${prefix}CIDR`]), ...arr(r[`${prefix}CIDRSet`]).map((c) => c?.cidr)].filter(Boolean)
          .forEach((cidr) => this.addEdge(n.id, this.external('IPBlock', String(cidr)).id, type, { path: `${path}.${prefix}CIDR`, text }));
        arr(r[`${prefix}Entities`]).forEach((ent) => this.addEdge(n.id, this.external('Entity', `cilium:${ent}`).id, type, { path: `${path}.${prefix}Entities`, text }));
        arr(r.toFQDNs).forEach((f) => {
          const h = f?.matchName || f?.matchPattern;
          if (h) this.addEdge(n.id, this.external('ExternalHost', h).id, type, { path: `${path}.toFQDNs`, text });
        });
        arr(r.toServices).forEach((s, j) => {
          const k = s?.k8sService;
          if (k?.serviceName) this.ref({ kind: 'Service', group: '', namespace: k.namespace, name: k.serviceName }, n, type, { path: `${path}.toServices[${j}]`, text });
        });
      });
      side(sp.ingress, 'from', 'ingress-from');
      side(sp.egress, 'to', 'egress-to');
      side(sp.ingressDeny, 'from', 'ingress-from');
      side(sp.egressDeny, 'to', 'egress-to');
    }
  }

  binding(n, cluster) {
    const rr = obj(n.obj.roleRef);
    if (str(rr.name)) this.ref({ kind: rr.kind || (cluster ? 'ClusterRole' : 'Role'), group: RBAC, name: rr.name }, n, 'grants', { path: 'roleRef' });
    arr(n.obj.subjects).forEach((s, i) => {
      if (!s || !str(s.name)) return;
      const path = `subjects[${i}]`;
      if (s.kind === 'ServiceAccount') {
        this.ref({ kind: 'ServiceAccount', group: '', namespace: s.namespace || (cluster ? null : n.namespace), name: s.name }, n, 'binds', { path });
      } else if (s.kind === 'Group' && /^system:serviceaccounts:/.test(s.name)) {
        const ns = s.name.slice('system:serviceaccounts:'.length);
        if (ns !== n.namespace) this.addEdge(n.id, this.nsTarget(ns), 'binds', { path, text: 'all service accounts' });
        else n.notes.push('Binds every service account in its own namespace');
      } else if (s.kind === 'User' || s.kind === 'Group') {
        this.addEdge(n.id, this.external(s.kind, s.name).id, 'binds', { path });
      }
    });
  }

  role(n) {
    arr(n.obj.rules).forEach((r, i) => {
      const names = arr(r?.resourceNames);
      if (!names.length) return;
      for (const res of arr(r.resources)) {
        const kind = RESOURCE_TO_KIND[String(res).split('/')[0]];
        if (!kind) continue;
        for (const nm of names) {
          this.ref({ kind, group: null, name: nm }, n, 'permits', { path: `rules[${i}]`, text: arr(r.verbs).join(', ') }, { onlyExisting: true });
        }
      }
    });
  }

  serviceAccount(n) {
    arr(n.obj.secrets).forEach((s, i) => this.ref({ kind: 'Secret', group: '', name: s?.name }, n, 'uses', { path: `secrets[${i}]` }));
    arr(n.obj.imagePullSecrets).forEach((s, i) => this.ref({ kind: 'Secret', group: '', name: s?.name }, n, 'pull-secret', { path: `imagePullSecrets[${i}]` }));
  }

  secret(n) {
    const sa = n.annotations['kubernetes.io/service-account.name'];
    if (str(sa)) this.ref({ kind: 'ServiceAccount', group: '', name: sa }, n, 'token-for', { path: 'metadata.annotations[kubernetes.io/service-account.name]' });
  }

  scaleTarget(n, t, path) {
    if (!t || !str(t.name)) return;
    const sp = obj(n.obj.spec);
    const text = sp.maxReplicas ? `${sp.minReplicas ?? 1}–${sp.maxReplicas} replicas` : undefined;
    this.ref({ kind: t.kind || 'Deployment', group: t.apiVersion ? groupOf(t.apiVersion) : '', name: t.name }, n, 'scales', { path, text });
  }

  keda(n) {
    const sp = obj(n.obj.spec);
    this.scaleTarget(n, sp.scaleTargetRef && { kind: 'Deployment', ...sp.scaleTargetRef }, 'spec.scaleTargetRef');
    arr(sp.triggers).forEach((t, i) => {
      const a = t?.authenticationRef;
      if (a?.name) this.ref({ kind: a.kind || 'TriggerAuthentication', group: 'keda.sh', name: a.name }, n, 'uses', { path: `spec.triggers[${i}].authenticationRef` });
    });
  }

  pdb(n) {
    const sp = obj(n.obj.spec);
    const text = sp.minAvailable !== undefined ? `minAvailable ${sp.minAvailable}` : sp.maxUnavailable !== undefined ? `maxUnavailable ${sp.maxUnavailable}` : undefined;
    if (isEmptySelector(sp.selector)) { n.notes.push('Empty selector: applies to every pod in the namespace'); return; }
    const matched = this.workloads(n.namespace).filter((w) => matchLabelSelector(sp.selector, w.podLabels));
    for (const w of matched) this.addEdge(n.id, w.id, 'protects', { path: 'spec.selector', text });
    if (!matched.length) this.unmatchedSelector(n, 'spec.selector', selectorToString(sp.selector), 'warn');
  }

  pvc(n) {
    const sp = obj(n.obj.spec);
    if (str(sp.storageClassName)) this.ref({ kind: 'StorageClass', group: 'storage.k8s.io', name: sp.storageClassName }, n, 'claims', { path: 'spec.storageClassName' });
    if (str(sp.volumeName)) this.ref({ kind: 'PersistentVolume', group: '', name: sp.volumeName }, n, 'bound-to', { path: 'spec.volumeName' });
  }

  pv(n) {
    const sp = obj(n.obj.spec);
    if (str(sp.storageClassName)) this.ref({ kind: 'StorageClass', group: 'storage.k8s.io', name: sp.storageClassName }, n, 'claims', { path: 'spec.storageClassName' });
    const c = sp.claimRef;
    if (c?.name) this.ref({ kind: 'PersistentVolumeClaim', group: '', namespace: c.namespace, name: c.name }, n, 'bound-to', { path: 'spec.claimRef' });
  }

  endpoints(n) {
    const svc = this.find('Service', n.namespace, n.name, '');
    if (svc) this.addEdge(n.id, svc.id, 'backs', { path: 'metadata.name' });
  }

  endpointSlice(n) {
    const s = n.labels['kubernetes.io/service-name'];
    if (str(s)) this.ref({ kind: 'Service', group: '', name: s }, n, 'backs', { path: 'metadata.labels[kubernetes.io/service-name]' });
  }

  webhooks(n) {
    arr(n.obj.webhooks).forEach((w, i) => {
      const s = w?.clientConfig?.service;
      if (s?.name) this.ref({ kind: 'Service', group: '', namespace: s.namespace, name: s.name }, n, 'calls', { path: `webhooks[${i}].clientConfig.service`, text: w.name });
      if (str(w?.clientConfig?.url)) this.scanString(n, w.clientConfig.url, `webhooks[${i}].clientConfig.url`);
    });
  }

  apiService(n) {
    const s = n.obj.spec?.service;
    if (s?.name) this.ref({ kind: 'Service', group: '', namespace: s.namespace, name: s.name }, n, 'calls', { path: 'spec.service' });
  }

  crd(n) {
    const s = n.obj.spec?.conversion?.webhook?.clientConfig?.service || n.obj.spec?.conversion?.webhookClientConfig?.service;
    if (s?.name) this.ref({ kind: 'Service', group: '', namespace: s.namespace, name: s.name }, n, 'calls', { path: 'spec.conversion.webhook.clientConfig.service' });
  }

  certificate(n) {
    const sp = obj(n.obj.spec);
    if (str(sp.secretName)) this.ref({ kind: 'Secret', group: '', name: sp.secretName }, n, 'writes', { path: 'spec.secretName' }, { category: 'pki' });
    const ir = obj(sp.issuerRef);
    if (str(ir.name)) this.ref({ kind: ir.kind || 'Issuer', group: ir.group || CM, name: ir.name }, n, 'issued-by', { path: 'spec.issuerRef' });
    for (const [k, ks] of Object.entries(obj(sp.keystores))) {
      const ps = ks?.passwordSecretRef?.name;
      if (str(ps)) this.ref({ kind: 'Secret', group: '', name: ps }, n, 'uses', { path: `spec.keystores.${k}.passwordSecretRef` });
    }
    const names = [...arr(sp.dnsNames), sp.commonName].filter((x) => typeof x === 'string');
    for (const h of names) {
      const t = this.resolveHost(h.replace(/^\*\./, ''), n.namespace, { ghost: false, strongOnly: true });
      if (t) this.addEdge(n.id, t.id, 'cert-for', { path: 'spec.dnsNames', text: h });
    }
  }

  issuer(n) {
    const sp = obj(n.obj.spec);
    const ns = n.kind === 'ClusterIssuer' ? this.o.certManagerNamespace : n.namespace;
    if (str(sp.ca?.secretName)) this.ref({ kind: 'Secret', group: '', namespace: ns, name: sp.ca.secretName }, n, 'signs-with', { path: 'spec.ca.secretName' });
    if (str(sp.acme?.privateKeySecretRef?.name)) {
      // cert-manager creates the ACME account key on first registration
      const e = this.ref({ kind: 'Secret', group: '', namespace: ns, name: sp.acme.privateKeySecretRef.name }, n, 'uses', { path: 'spec.acme.privateKeySecretRef', text: 'ACME account key' }, { category: 'pki' });
      if (e) this.markGenerated(e.target, n.id);
    }
    if (sp.selfSigned) n.notes.push('Self-signed issuer');
    this.generic(n, ns);
  }

  trustBundle(n) {
    const sp = obj(n.obj.spec);
    const tns = this.o.trustNamespace;
    arr(sp.sources).forEach((s, i) => {
      if (s?.configMap?.name) this.ref({ kind: 'ConfigMap', group: '', namespace: tns, name: s.configMap.name }, n, 'reads-from', { path: `spec.sources[${i}].configMap`, text: s.configMap.key }, { category: 'pki' });
      if (s?.secret?.name) this.ref({ kind: 'Secret', group: '', namespace: tns, name: s.secret.name }, n, 'reads-from', { path: `spec.sources[${i}].secret`, text: s.secret.key }, { category: 'pki' });
      if (s?.useDefaultCAs) n.notes.push('Includes the default public CA bundle');
    });
    const tgt = obj(sp.target);
    const kinds = [tgt.configMap && 'ConfigMap', tgt.secret && 'Secret'].filter(Boolean);
    const nsSel = tgt.namespaceSelector;
    const targets = [...this.namespaces.values()]
      .filter((x) => x.count > 0 || x.defined)
      .filter((x) => !nsSel || matchLabelSelector(nsSel, this.nsLabels(x.name)))
      .map((x) => x.name);
    for (const kind of kinds) {
      for (const ns of targets) {
        this.ref({ kind, group: '', namespace: ns, name: n.name }, n, 'writes', { path: 'spec.target', text: `key ${(tgt.configMap || tgt.secret)?.key ?? ''}` }, { category: 'pki' });
      }
    }
    n.notes.push(`Distributes ${kinds.join(' + ') || 'nothing'} “${n.name}” to ${nsSel ? 'namespaces matching ' + selectorToString(nsSel) : 'every namespace'}`);
  }

  externalSecret(n) {
    const sp = obj(n.obj.spec);
    const name = sp.target?.name || n.name;
    this.ref({ kind: 'Secret', group: '', name }, n, 'writes', { path: 'spec.target.name' });
    const ssr = sp.secretStoreRef;
    if (ssr?.name) this.ref({ kind: ssr.kind || 'SecretStore', group: 'external-secrets.io', name: ssr.name }, n, 'reads-from', { path: 'spec.secretStoreRef' });
  }

  indexServiceEntry(n) {
    for (const h of arr(n.obj.spec?.hosts)) if (str(h)) this.seHosts.set(h.toLowerCase(), n);
  }

  serviceEntry(n) {
    const sp = obj(n.obj.spec);
    const sel = sp.workloadSelector?.labels;
    if (sel && Object.keys(sel).length) {
      for (const w of this.workloads(n.namespace).filter((x) => matchMap(sel, x.podLabels))) this.addEdge(n.id, w.id, 'selects', { path: 'spec.workloadSelector.labels' });
    }
    arr(sp.endpoints).forEach((e, i) => {
      if (str(e?.address)) {
        const t = this.resolveHost(e.address, n.namespace, { ghost: true, strongOnly: true });
        if (t) this.addEdge(n.id, t.id, 'routes', { path: `spec.endpoints[${i}].address`, text: e.address });
      }
    });
  }

  virtualService(n) {
    const sp = obj(n.obj.spec);
    arr(sp.hosts).forEach((h, i) => {
      const t = this.resolveHost(h, n.namespace, { ghost: false });
      if (t) this.addEdge(n.id, t.id, 'intercepts', { path: `spec.hosts[${i}]`, text: h });
    });
    arr(sp.gateways).forEach((gw, i) => {
      if (!str(gw) || gw === 'mesh') return;
      const [ns, name] = splitNsName(gw, n.namespace);
      this.ref({ kind: 'Gateway', group: ISTIO_NET, namespace: ns, name }, n, 'attaches', { path: `spec.gateways[${i}]` });
    });
    const dest = (d, path, type = 'routes') => {
      if (!str(d?.host)) return;
      const t = this.resolveHost(d.host, n.namespace, { ghost: true, externalHosts: true });
      if (t) this.addEdge(n.id, t.id, type, { path, text: [d.subset && `subset ${d.subset}`, d.port?.number && `port ${d.port.number}`].filter(Boolean).join(', ') || d.host });
    };
    for (const proto of ['http', 'tcp', 'tls']) {
      arr(sp[proto]).forEach((r, i) => {
        arr(r?.route).forEach((rt, j) => dest(rt?.destination, `spec.${proto}[${i}].route[${j}].destination`));
        if (r?.mirror) dest(r.mirror, `spec.${proto}[${i}].mirror`, 'mirrors');
        arr(r?.mirrors).forEach((m, j) => dest(m?.destination, `spec.${proto}[${i}].mirrors[${j}].destination`, 'mirrors'));
        if (r?.delegate?.name) this.ref({ kind: 'VirtualService', group: ISTIO_NET, namespace: r.delegate.namespace, name: r.delegate.name }, n, 'delegates', { path: `spec.${proto}[${i}].delegate` });
      });
    }
  }

  destinationRule(n) {
    const sp = obj(n.obj.spec);
    if (str(sp.host)) {
      const t = this.resolveHost(sp.host, n.namespace, { ghost: true, externalHosts: true });
      if (t) this.addEdge(n.id, t.id, 'traffic-policy', { path: 'spec.host', text: sp.host });
    }
    const creds = [[sp.trafficPolicy?.tls?.credentialName, 'spec.trafficPolicy.tls.credentialName'],
      ...arr(sp.trafficPolicy?.portLevelSettings).map((p, i) => [p?.tls?.credentialName, `spec.trafficPolicy.portLevelSettings[${i}].tls.credentialName`]),
      ...arr(sp.subsets).map((s, i) => [s?.trafficPolicy?.tls?.credentialName, `spec.subsets[${i}].trafficPolicy.tls.credentialName`])];
    for (const [c, path] of creds) if (str(c)) this.ref({ kind: 'Secret', group: '', name: c }, n, 'tls', { path }, { label: 'client TLS with' });
    const ws = sp.workloadSelector?.matchLabels;
    if (ws && Object.keys(ws).length) for (const w of this.workloads(n.namespace).filter((x) => matchMap(ws, x.podLabels))) this.addEdge(n.id, w.id, 'applies-to', { path: 'spec.workloadSelector' });
  }

  istioGateway(n) {
    const sp = obj(n.obj.spec);
    const sel = obj(sp.selector);
    let runsIn = n.namespace;
    if (Object.keys(sel).length) {
      const matched = this.workloads(null).filter((w) => matchMap(sel, w.podLabels));
      for (const w of matched) this.addEdge(n.id, w.id, 'selects', { path: 'spec.selector', text: selectorToString(sel) }, { label: 'runs on' });
      if (matched.length) runsIn = matched[0].namespace;
      else n.notes.push(`Gateway pods {${selectorToString(sel)}} are not part of this chart`);
    }
    arr(sp.servers).forEach((s, i) => {
      if (str(s?.tls?.credentialName)) this.ref({ kind: 'Secret', group: '', namespace: runsIn, name: s.tls.credentialName }, n, 'tls', { path: `spec.servers[${i}].tls.credentialName`, text: arr(s.hosts).join(', ') || undefined });
    });
  }

  sidecar(n) {
    const sp = obj(n.obj.spec);
    this.istioSelectorPolicy(n, sp.workloadSelector?.labels, 'spec.workloadSelector.labels');
    arr(sp.egress).forEach((e, i) => arr(e?.hosts).forEach((h) => {
      const [ns] = String(h).split('/');
      if (ns && ns !== '*' && ns !== '.' && ns !== '~' && ns !== n.namespace) this.addEdge(n.id, this.nsTarget(ns), 'egress-to', { path: `spec.egress[${i}].hosts`, text: h });
    }));
  }

  istioSelectorPolicy(n, labels, path) {
    if (this.targetRefs(n)) return;
    const sel = obj(labels);
    if (!Object.keys(sel).length) {
      n.namespaceWide = true;
      n.notes.push(n.namespace === this.o.istioRootNamespace ? 'Mesh-wide (defined in the Istio root namespace)' : `Applies to every workload in namespace ${n.namespace}`);
    } else {
      const matched = this.workloads(n.namespace).filter((w) => matchMap(sel, w.podLabels));
      for (const w of matched) this.addEdge(n.id, w.id, 'applies-to', { path, text: selectorToString(sel) });
      if (!matched.length) this.unmatchedSelector(n, path, selectorToString(sel));
    }
    if (n.kind === 'RequestAuthentication') {
      arr(n.obj.spec?.jwtRules).forEach((r, i) => { if (str(r?.jwksUri)) this.scanString(n, r.jwksUri, `spec.jwtRules[${i}].jwksUri`); });
    }
  }

  authorizationPolicy(n) {
    const sp = obj(n.obj.spec);
    this.istioSelectorPolicy(n, sp.selector?.matchLabels, 'spec.selector.matchLabels');
    const action = sp.action || 'ALLOW';
    const label = action === 'DENY' ? 'denies requests from' : action === 'ALLOW' ? undefined : `${action.toLowerCase()} for requests from`;
    arr(sp.rules).forEach((r, i) => arr(r?.from).forEach((f, j) => {
      const s = f?.source;
      if (!s) return;
      const path = `spec.rules[${i}].from[${j}].source`;
      for (const p of arr(s.principals)) {
        const m = /(?:^|\/)ns\/([^/]+)\/sa\/([^/]+)$/.exec(String(p));
        if (m && !m[1].includes('*') && !m[2].includes('*')) this.ref({ kind: 'ServiceAccount', group: '', namespace: m[1], name: m[2] }, n, 'allows-from', { path: `${path}.principals`, text: p }, { label });
        else if (m && !m[1].includes('*') && m[1] !== n.namespace) this.addEdge(n.id, this.nsTarget(m[1]), 'allows-from', { path: `${path}.principals`, text: p }, { label });
      }
      for (const ns of arr(s.namespaces)) {
        if (String(ns).includes('*')) continue;
        if (ns !== n.namespace) this.addEdge(n.id, this.nsTarget(ns), 'allows-from', { path: `${path}.namespaces`, text: ns }, { label });
        else n.notes.push(`${label ? 'Denies' : 'Allows'} requests from its own namespace`);
      }
      for (const ip of arr(s.ipBlocks)) this.addEdge(n.id, this.external('IPBlock', String(ip)).id, 'allows-from', { path: `${path}.ipBlocks` }, { label });
    }));
    if (action === 'ALLOW' && sp.rules === undefined) n.notes.push('No rules: denies all requests to the selected workloads');
  }

  serviceMonitor(n) {
    const sp = obj(n.obj.spec);
    const nss = sp.namespaceSelector?.any ? null : arr(sp.namespaceSelector?.matchNames).length ? sp.namespaceSelector.matchNames : [n.namespace];
    if (nss) nss.forEach((x) => this.ensureNamespace(x));
    const svcs = [...this.nodes.values()].filter((x) => x.kind === 'Service' && x.status === 'defined' && (nss === null || nss.includes(x.namespace)));
    const matched = svcs.filter((s) => !isEmptySelector(sp.selector) && matchLabelSelector(sp.selector, s.labels));
    for (const s of matched) this.addEdge(n.id, s.id, 'scrapes', { path: 'spec.selector', text: selectorToString(sp.selector) });
    if (!matched.length) this.unmatchedSelector(n, 'spec.selector', selectorToString(sp.selector));
    this.generic(n);
  }

  podMonitor(n) {
    const sp = obj(n.obj.spec);
    const nss = sp.namespaceSelector?.any ? null : arr(sp.namespaceSelector?.matchNames).length ? sp.namespaceSelector.matchNames : [n.namespace];
    const matched = isEmptySelector(sp.selector) ? [] : this.workloads(nss).filter((w) => matchLabelSelector(sp.selector, w.podLabels));
    for (const w of matched) this.addEdge(n.id, w.id, 'scrapes', { path: 'spec.selector', text: selectorToString(sp.selector) });
    if (!matched.length) this.unmatchedSelector(n, 'spec.selector', selectorToString(sp.selector));
  }

  /** Generic scan for CRDs and anything without a dedicated handler. */
  generic(n, defaultNs) {
    this.targetRefs(n);
    const spec = n.obj.spec;
    if (!spec || typeof spec !== 'object') return;
    const ns = defaultNs || n.namespace || undefined;
    const visit = (v, path, depth) => {
      if (depth > 12 || !v || typeof v !== 'object') return;
      if (Array.isArray(v)) { v.slice(0, 200).forEach((x, i) => visit(x, `${path}[${i}]`, depth + 1)); return; }
      for (const [k, val] of Object.entries(v)) {
        const p = `${path}.${k}`;
        const kind = refKindForKey(k, val);
        if (kind) {
          const items = Array.isArray(val) ? val : [val];
          items.forEach((it) => {
            const name = typeof it === 'string' ? it : it?.name;
            const tns = typeof it === 'object' && str(it?.namespace) ? it.namespace : ns;
            if (str(name)) {
              const onlyExisting = kind === 'Service';
              const type = kind === 'Service' ? 'calls' : kind === 'ServiceAccount' ? 'runs-as' : 'references';
              const ref = kind === 'Issuer' ? { kind: it.kind || 'Issuer', group: it.group || CM, name } : { kind, group: '', namespace: tns, name };
              this.ref(ref, n, type, { path: p }, { skipIfLinked: true, onlyExisting, category: kind === 'Secret' || kind === 'ConfigMap' ? 'config' : undefined });
            }
          });
          if (typeof val !== 'object') continue;
        }
        if (typeof val === 'object') visit(val, p, depth + 1);
      }
    };
    visit(spec, 'spec', 0);
  }

  handleMetadata(n) {
    const ann = n.annotations;
    const ica = str(ann['cert-manager.io/inject-ca-from']);
    if (ica) { const [ns, name] = splitNsName(ica, n.namespace); this.ref({ kind: 'Certificate', group: CM, namespace: ns, name }, n, 'inject-ca', { path: 'metadata.annotations[cert-manager.io/inject-ca-from]' }); }
    const icas = str(ann['cert-manager.io/inject-ca-from-secret']);
    if (icas) { const [ns, name] = splitNsName(icas, n.namespace); this.ref({ kind: 'Secret', group: '', namespace: ns, name }, n, 'inject-ca', { path: 'metadata.annotations[cert-manager.io/inject-ca-from-secret]' }); }
    const ci = str(ann['cert-manager.io/cluster-issuer']);
    if (ci) this.ref({ kind: 'ClusterIssuer', group: CM, name: ci }, n, 'issued-by', { path: 'metadata.annotations[cert-manager.io/cluster-issuer]' }, { label: 'certificates issued by' });
    const is = str(ann['cert-manager.io/issuer']);
    if (is) this.ref({ kind: str(ann['cert-manager.io/issuer-kind']) || 'Issuer', group: str(ann['cert-manager.io/issuer-group']) || CM, name: is }, n, 'issued-by', { path: 'metadata.annotations[cert-manager.io/issuer]' }, { label: 'certificates issued by' });
    arr(n.obj.metadata?.ownerReferences).forEach((o, i) => {
      if (o?.name && o.kind) this.ref({ kind: o.kind, group: groupOf(o.apiVersion), name: o.name }, n, 'owned-by', { path: `metadata.ownerReferences[${i}]` });
    });
  }

  // ------------------------------------------------------- Gateway API rules
  checkGatewayApi() {
    const grants = [...this.nodes.values()].filter((x) => x.kind === 'ReferenceGrant' && x.status === 'defined');
    const hasGrant = (from, target) => grants.some((gr) => gr.namespace === target.namespace &&
      arr(gr.obj.spec?.from).some((f) => f && f.namespace === from.namespace && f.kind === from.kind && (f.group || '') === (from.group || '')) &&
      arr(gr.obj.spec?.to).some((t) => t && t.kind === target.kind && (t.group || '') === (target.group || '') && (!t.name || t.name === target.name)));
    for (const c of this.gwChecks) {
      const target = this.nodes.get(c.edge.target);
      const from = c.from;
      if (!target || !target.namespace || target.namespace === from.namespace) continue;
      c.edge.crossNamespaceRef = true;
      if (c.type === 'parent') {
        if (target.status !== 'defined' || target.kind !== 'Gateway') continue;
        const listeners = arr(target.obj.spec?.listeners).filter((l) => !c.ref?.sectionName || l?.name === c.ref.sectionName);
        const ok = listeners.some((l) => {
          const fromNs = l?.allowedRoutes?.namespaces?.from || 'Same';
          if (fromNs === 'All') return true;
          if (fromNs === 'Selector') return matchLabelSelector(l.allowedRoutes.namespaces.selector, this.nsLabels(from.namespace));
          return false;
        });
        c.edge.allowed = ok;
        if (!ok) this.findings.push({
          severity: 'error', code: 'gateway-attach-denied',
          title: `${from.kind} ${from.namespace}/${from.name} cannot attach to Gateway ${target.namespace}/${target.name}`,
          message: `The Gateway's listeners${c.ref?.sectionName ? ` (${c.ref.sectionName})` : ''} only accept routes from ${listeners.map((l) => l?.allowedRoutes?.namespaces?.from || 'Same').join('/') || 'Same'} namespace(s). Set allowedRoutes.namespaces.from to All or a Selector that matches namespace ${from.namespace}.`,
          nodes: [from.id, target.id], edges: [c.edge.id],
        });
      } else {
        const ok = hasGrant(from, target);
        c.edge.allowed = ok;
        if (!ok) this.findings.push({
          severity: 'error', code: 'missing-reference-grant',
          title: `Cross-namespace reference without ReferenceGrant: ${from.kind} ${from.namespace}/${from.name} → ${target.kind} ${target.namespace}/${target.name}`,
          message: `Gateway API ignores this ${c.type === 'cert' ? 'certificate' : 'backend'} reference unless a ReferenceGrant in namespace ${target.namespace} allows ${from.kind} from namespace ${from.namespace}.`,
          nodes: [from.id, target.id], edges: [c.edge.id],
        });
      }
    }
  }

  // ---------------------------------------------------------- DNS inference
  resolveHost(raw, ns, { ghost = true, externalHosts = false, strongOnly = false } = {}) {
    let h = str(raw);
    if (!h) return null;
    h = h.toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^[^@/]*@/, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');
    if (!h || h.includes('*') || h.includes('{{')) return null;
    const se = this.seHosts.get(h);
    if (se) return se;
    const cd = this.o.clusterDomain.toLowerCase();
    let svc, sns, strong = false;
    const strip = (suffix) => {
      const rest = h.slice(0, -suffix.length).split('.');
      if (rest.length < 2) return false;
      svc = rest[rest.length - 2]; sns = rest[rest.length - 1]; strong = true;
      return true;
    };
    if (h.endsWith(`.svc.${cd}`)) { if (!strip(`.svc.${cd}`)) return null; }
    else if (h.endsWith('.svc')) { if (!strip('.svc')) return null; }
    else if (strongOnly) return null;
    else {
      const parts = h.split('.');
      if (parts.length === 1) { svc = h; sns = ns; }
      else if (parts.length === 2 && this.namespaces.has(parts[1])) { svc = parts[0]; sns = parts[1]; }
      else return externalHosts && /^[a-z0-9.-]+$/.test(h) ? this.external('ExternalHost', h) : null;
    }
    if (!sns || !DNS_LABEL.test(svc) || !DNS_LABEL.test(sns)) return null;
    const found = this.find('Service', sns, svc, '');
    if (found) return found;
    if (!ghost) return null;
    if (!strong && !this.namespaces.has(sns)) return null;
    return this.addPlaceholder('Service', '', sns, svc, 'external');
  }

  inferDns(n) {
    if (n.kind === 'CustomResourceDefinition') return;
    walkStrings(n.obj, '', (s, path) => this.scanString(n, s, path), n.kind);
    if (n.kind === 'Secret' && n.obj.data && typeof n.obj.data === 'object') {
      for (const [k, v] of Object.entries(n.obj.data)) {
        const dec = decodeB64(v);
        if (dec) this.scanString(n, dec, `data.${k}`);
      }
    }
  }

  scanString(n, s, path) {
    if (typeof s !== 'string' || s.length < 3 || s.length > 4_000_000) return;
    const lower = s.toLowerCase();
    const hits = new Map();
    if (lower.includes('.')) {
      const cd = this.o.clusterDomain.toLowerCase();
      for (const m of lower.matchAll(HOST_RE)) {
        const tok = m[1];
        const isSvc = tok.endsWith('.svc') || tok.endsWith(`.svc.${cd}`);
        if (!isSvc && tok.split('.').length !== 2) continue;
        const t = this.resolveHost(tok, n.namespace, { ghost: isSvc });
        if (t && t.kind === 'Service') hits.set(t.id, tok);
      }
    }
    if (n.namespace) {
      const local = this.localServices(n.namespace);
      if (local.size) {
        for (const re of [URL_SHORT_RE, HOSTPORT_RE]) {
          for (const m of lower.matchAll(re)) if (local.has(m[1])) hits.set(local.get(m[1]).id, m[0]);
        }
        if (/\.env\[\d+\]\.value$/.test(path) && local.has(lower.trim())) hits.set(local.get(lower.trim()).id, lower.trim());
      }
    }
    for (const [tid, tok] of hits) {
      if (tid === n.id || this.pairs.has(`${n.id}|${tid}`) || this.pairs.has(`${tid}|${n.id}`)) continue;
      this.addEdge(n.id, tid, 'dns-ref', { path, text: tok });
    }
  }

  localServices(ns) {
    if (!this._local) {
      this._local = new Map();
      for (const x of this.nodes.values()) {
        if (x.kind !== 'Service' || x.status !== 'defined') continue;
        if (!this._local.has(x.namespace)) this._local.set(x.namespace, new Map());
        this._local.get(x.namespace).set(x.name, x);
      }
    }
    return this._local.get(ns) || new Map();
  }

  // --------------------------------------------------------------- finalize
  finalize() {
    const incoming = new Map();
    for (const e of this.edges.values()) {
      if (!incoming.has(e.target)) incoming.set(e.target, []);
      incoming.get(e.target).push(e);
    }
    for (const n of this.nodes.values()) {
      if (n.status !== 'external') continue;
      const writers = (incoming.get(n.id) || []).filter((e) => e.type === 'writes');
      if (writers.length || this.generatedBy.has(n.id)) {
        n.status = 'generated';
        n.generatedBy = [...new Set([...writers.map((e) => e.source), ...(this.generatedBy.get(n.id) || [])])];
      }
    }
    const nsOf = (id) => {
      if (id.startsWith('ns:')) return id.slice(3);
      const x = this.nodes.get(id);
      return x ? x.namespace : null;
    };
    for (const e of this.edges.values()) {
      e.sourceNs = nsOf(e.source);
      e.targetNs = nsOf(e.target);
      if (e.sourceNs === '__external' || e.targetNs === '__external') e.scope = 'external';
      else if (e.sourceNs === null || e.targetNs === null) e.scope = 'cluster';
      else e.scope = e.sourceNs === e.targetNs ? 'same' : 'cross';
    }
    this.buildFindings(incoming);
  }

  buildFindings(incoming) {
    const label = (n) => `${n.kind} ${n.namespace && n.namespace !== '__external' ? n.namespace + '/' : ''}${n.name}`;
    const IMPORTANT = new Set(['Secret', 'ConfigMap', 'PersistentVolumeClaim', 'Service', 'ServiceAccount', 'Issuer', 'ClusterIssuer', 'Role', 'ClusterRole', 'Gateway', 'NetworkAttachmentDefinition', 'Certificate']);
    for (const n of this.nodes.values()) {
      if (n.status !== 'external' || WELL_KNOWN_EXTERNAL(n)) continue;
      const refs = (incoming.get(n.id) || []);
      const hard = refs.filter((e) => !e.inferred && !e.optional);
      if (!refs.length) continue;
      const onlyInferred = !hard.length;
      const breaks = hard.some((e) => BREAKING.has(e.type));
      const severity = onlyInferred ? 'info' : (breaks || hard.some((e) => HARD.has(e.type))) && IMPORTANT.has(n.kind) ? 'warn' : 'info';
      const who = [...new Set(refs.map((e) => this.nodes.get(e.source)).filter(Boolean).map(label))];
      const elsewhere = ['Secret', 'ConfigMap', 'PersistentVolumeClaim', 'ServiceAccount'].includes(n.kind)
        ? [...this.nodes.values()].filter((x) => x.status === 'defined' && x.kind === n.kind && x.name === n.name && x.namespace !== n.namespace)
        : [];
      if (elsewhere.length && breaks) {
        this.findings.push({
          severity: 'error', code: 'cross-namespace-mount',
          title: `${label(n)} does not exist, but ${elsewhere.map(label).join(', ')} does`,
          message: `${who.slice(0, 6).join(', ')} ${who.length > 1 ? 'look' : 'looks'} for ${n.kind} “${n.name}” in namespace ${n.namespace}. Pods can only use ${n.kind}s from their own namespace, so the copy in ${elsewhere.map((x) => x.namespace).join(', ')} is not visible to them.`,
          nodes: [n.id, ...elsewhere.map((x) => x.id), ...refs.map((e) => e.source)], edges: refs.map((e) => e.id),
        });
        continue;
      }
      this.findings.push({
        severity, code: onlyInferred ? 'external-service' : 'missing-reference',
        title: onlyInferred ? `Talks to ${label(n)}, which is outside this chart` : `${label(n)} is referenced but not defined`,
        message: `${onlyInferred ? 'Referenced by host name from' : 'Referenced by'} ${who.slice(0, 6).join(', ')}${who.length > 6 ? ` and ${who.length - 6} more` : ''}.${breaks ? ' Pods that mount or read it will not start until it exists.' : onlyInferred ? ' Make sure it is deployed (by another release) before this chart.' : ' It must already exist in the cluster or come from another release.'}`,
        nodes: [n.id, ...refs.map((e) => e.source)], edges: refs.map((e) => e.id),
      });
    }
    for (const u of this.unmatched) {
      this.findings.push({
        severity: u.severity, code: 'selector-no-match',
        title: `${label(u.node)} selects nothing`,
        message: `${u.what} {${u.selText}} matches no workload defined by this chart.`,
        nodes: [u.node.id],
      });
    }
    const releaseNs = this.o.defaultNamespace;
    for (const ns of this.namespaces.values()) {
      if (ns.count > 0 && !ns.defined && ns.name !== releaseNs && !SYSTEM_NAMESPACES.has(ns.name)) {
        this.findings.push({
          severity: 'warn', code: 'namespace-not-created',
          title: `Namespace ${ns.name} must exist before install`,
          message: `${ns.count} resource(s) are placed in namespace ${ns.name}, which this chart does not create and which is not the release namespace (${releaseNs}).`,
          nodes: [...this.nodes.values()].filter((x) => x.namespace === ns.name && x.status === 'defined').map((x) => x.id),
        });
      }
    }
    const unused = new Map();
    for (const n of this.nodes.values()) {
      if (n.status !== 'defined' || !['ConfigMap', 'Secret', 'ServiceAccount', 'PersistentVolumeClaim'].includes(n.kind)) continue;
      if (n.kind === 'Secret' && n.obj.type === 'kubernetes.io/service-account-token') continue;
      const refs = (incoming.get(n.id) || []).filter((e) => !e.inferred);
      if (!refs.length) { if (!unused.has(n.kind)) unused.set(n.kind, []); unused.get(n.kind).push(n); }
    }
    for (const [kind, list] of unused) {
      this.findings.push({
        severity: 'info', code: 'unreferenced',
        title: `${list.length} ${kind}${list.length > 1 ? 's are' : ' is'} not referenced by anything in this chart`,
        message: `${list.slice(0, 8).map((x) => label(x)).join(', ')}${list.length > 8 ? ` and ${list.length - 8} more` : ''}. They may be consumed by tools outside the chart, or be left over.`,
        nodes: list.map((x) => x.id),
      });
    }
    const order = { error: 0, warn: 1, info: 2 };
    this.findings.sort((a, b) => order[a.severity] - order[b.severity]);
  }

  result() {
    const nodes = [...this.nodes.values()].map(({ pod, ...rest }) => rest);
    const edges = [...this.edges.values()];
    const namespaces = [...this.namespaces.values()].map((ns) => ({ ...ns }));
    const byKind = {};
    for (const n of nodes) if (n.status === 'defined') byKind[n.kind] = (byKind[n.kind] || 0) + 1;
    const byCategory = {};
    for (const e of edges) byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    const byScope = { same: 0, cross: 0, cluster: 0, external: 0 };
    for (const e of edges) byScope[e.scope]++;
    return {
      options: this.o,
      nodes, edges, namespaces, findings: this.findings,
      stats: {
        resources: nodes.filter((n) => n.status === 'defined').length + namespaces.filter((n) => n.defined).length,
        external: nodes.filter((n) => n.status === 'external').length,
        generated: nodes.filter((n) => n.status === 'generated').length,
        namespaces: namespaces.length, edges: edges.length, byKind, byCategory, byScope,
      },
    };
  }
}

// ----------------------------------------------------------------- helpers

export function nodeId(kind, group, namespace, name) {
  return `${kindKey(kind, group)}|${namespace ?? ''}|${name}`;
}

function podTemplate(r) {
  const k = r.kind;
  const s = obj(r.spec);
  if (k === 'Pod') return { spec: s, meta: obj(r.metadata), path: 'spec', metaPath: 'metadata' };
  if (k === 'CronJob') {
    const t = s.jobTemplate?.spec?.template;
    return t ? { spec: obj(t.spec), meta: obj(t.metadata), path: 'spec.jobTemplate.spec.template.spec', metaPath: 'spec.jobTemplate.spec.template.metadata' } : null;
  }
  const t = s.template;
  if (t && typeof t === 'object' && (Array.isArray(t.spec?.containers) || WORKLOAD_KINDS.has(k))) {
    return { spec: obj(t.spec), meta: obj(t.metadata), path: 'spec.template.spec', metaPath: 'spec.template.metadata' };
  }
  return null;
}

function parseMultus(v) {
  const s = v.trim();
  if (s.startsWith('[')) {
    try {
      return arr(JSON.parse(s)).filter((x) => x?.name).map((x) => ({ name: x.name, namespace: x.namespace, iface: x.interface }));
    } catch { return []; }
  }
  return s.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
    const [ref, iface] = x.split('@');
    const [a, b] = ref.split('/');
    return b ? { namespace: a, name: b, iface } : { name: a, iface };
  });
}

function splitNsName(v, defNs) {
  const s = String(v).trim();
  const i = s.indexOf('/');
  return i === -1 ? [defNs, s] : [s.slice(0, i), s.slice(i + 1)];
}

function portsText(ports) {
  return arr(ports).map((p) => (p?.port !== undefined ? `${p.port}${p.endPort ? '-' + p.endPort : ''}${p.protocol && p.protocol !== 'TCP' ? '/' + p.protocol : ''}` : null)).filter(Boolean).join(', ');
}

function ciliumKey(k) {
  return String(k).replace(/^(k8s|any|reserved):/, '');
}

function ciliumSelector(sel) {
  const s = obj(sel);
  const ml = {};
  let namespaces = null;
  for (const [key, v] of Object.entries(obj(s.matchLabels))) {
    const k = ciliumKey(key);
    if (k === 'io.kubernetes.pod.namespace') namespaces = [String(v)];
    else ml[k] = v;
  }
  const me = [];
  for (const e of arr(s.matchExpressions)) {
    if (!e) continue;
    const k = ciliumKey(e.key);
    if (k === 'io.kubernetes.pod.namespace' && e.operator === 'In') namespaces = arr(e.values).map(String);
    else me.push({ ...e, key: k });
  }
  return { sel: { matchLabels: ml, matchExpressions: me }, namespaces };
}

const SECRET_REF_KEY = /^(.*[sS]ecret(Key)?Ref|secretRef|existingSecret|secretName|credentialsSecret|tlsSecret)$/;
const CM_REF_KEY = /^(.*[cC]onfigMap(Key)?Ref|configMapRef|configMapName|existingConfigMap)$/;

function refKindForKey(k, val) {
  const isRefObj = (v) => (typeof v === 'string') || (v && typeof v === 'object' && !Array.isArray(v) && typeof v.name === 'string') ||
    (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && typeof x.name === 'string'));
  if (!isRefObj(val)) return null;
  if (SECRET_REF_KEY.test(k)) return 'Secret';
  if (CM_REF_KEY.test(k)) return 'ConfigMap';
  if (k === 'serviceAccountName' && typeof val === 'string') return 'ServiceAccount';
  if (k === 'claimName' && typeof val === 'string') return 'PersistentVolumeClaim';
  if (k === 'issuerRef' && typeof val === 'object') return 'Issuer';
  if ((k === 'serviceName' && typeof val === 'string') || (k === 'serviceRef' && typeof val === 'object')) return 'Service';
  return null;
}

const SKIP_ANN = /^(meta\.helm\.sh\/|helm\.sh\/|checksum\/|kubectl\.kubernetes\.io\/last-applied)/;

function walkStrings(root, _path, visit, kind) {
  const walk = (v, path, depth) => {
    if (depth > 30 || v === null || v === undefined) return;
    if (typeof v === 'string') { visit(v, path); return; }
    if (typeof v !== 'object') return;
    if (Array.isArray(v)) { for (let i = 0; i < v.length && i < 5000; i++) walk(v[i], `${path}[${i}]`, depth + 1); return; }
    for (const [k, val] of Object.entries(v)) {
      if (depth === 0) {
        if (k === 'status' || k === 'kind' || k === 'apiVersion') continue;
        if (k === 'metadata') {
          for (const [ak, av] of Object.entries(obj(val?.annotations))) if (!SKIP_ANN.test(ak) && typeof av === 'string') visit(av, `metadata.annotations[${ak}]`);
          continue;
        }
        if (kind === 'Secret' && k === 'data') continue;
        if (kind === 'ConfigMap' && k === 'binaryData') continue;
      }
      if (k === 'image' || k === 'labels' || k === 'matchLabels') continue;
      walk(val, path ? `${path}.${k}` : k, depth + 1);
    }
  };
  walk(root, '', 0);
}

function decodeB64(v) {
  if (typeof v !== 'string' || v.length > 2_000_000) return null;
  try {
    const bin = globalThis.atob(v.replace(/\s+/g, ''));
    // only scan things that look like text
    if (/[\x00-\x08\x0e-\x1f]/.test(bin.slice(0, 2000))) return null;
    return bin;
  } catch { return null; }
}

const HOST_RE = /(?<![a-z0-9_-])((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?![a-z0-9_-])/g;
const URL_SHORT_RE = /\b[a-z][a-z0-9+.-]*:\/\/(?:[^\s@/]*@)?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?=[:/?#\s"'`,;)]|$)/g;
const HOSTPORT_RE = /(?<![a-z0-9._/:@$-])([a-z0-9](?:[a-z0-9-]*[a-z0-9])?):(\d{2,5})(?![0-9a-z.-])/g;
