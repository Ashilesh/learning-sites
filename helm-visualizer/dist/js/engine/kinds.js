// Kind metadata: scope, display category and short label.
//
// Categories drive node colour in the graph:
//   workload · network · config · identity · policy · pki · storage · platform · external

const CLUSTER_SCOPED = new Set([
  // core / built-in
  'Namespace', 'Node', 'PersistentVolume', 'StorageClass', 'VolumeAttachment', 'CSIDriver', 'CSINode',
  'ClusterRole', 'ClusterRoleBinding', 'CustomResourceDefinition', 'PriorityClass', 'RuntimeClass',
  'IngressClass', 'GatewayClass', 'MutatingWebhookConfiguration', 'ValidatingWebhookConfiguration',
  'ValidatingAdmissionPolicy', 'ValidatingAdmissionPolicyBinding', 'MutatingAdmissionPolicy',
  'MutatingAdmissionPolicyBinding', 'APIService', 'PodSecurityPolicy', 'CertificateSigningRequest',
  'FlowSchema', 'PriorityLevelConfiguration', 'ClusterTrustBundle', 'StorageVersionMigration',
  'IPAddress', 'ServiceCIDR', 'DeviceClass',
  // CRDs (group qualified where the kind name is common)
  'ClusterIssuer.cert-manager.io', 'Bundle.trust.cert-manager.io',
  'ClusterSecretStore.external-secrets.io', 'ClusterExternalSecret.external-secrets.io',
  'GlobalNetworkPolicy.projectcalico.org', 'GlobalNetworkPolicy.crd.projectcalico.org',
  'GlobalNetworkSet.projectcalico.org', 'FelixConfiguration.projectcalico.org',
  'FelixConfiguration.crd.projectcalico.org', 'BGPConfiguration.projectcalico.org',
  'BGPConfiguration.crd.projectcalico.org', 'BGPPeer.projectcalico.org', 'BGPPeer.crd.projectcalico.org',
  'IPPool.projectcalico.org', 'IPPool.crd.projectcalico.org', 'IPReservation.projectcalico.org',
  'HostEndpoint.projectcalico.org', 'ClusterInformation.projectcalico.org',
  'KubeControllersConfiguration.projectcalico.org', 'Tier.projectcalico.org',
  'CiliumClusterwideNetworkPolicy.cilium.io', 'CiliumNode.cilium.io', 'CiliumIdentity.cilium.io',
  'CiliumLoadBalancerIPPool.cilium.io', 'CiliumBGPClusterConfig.cilium.io',
  'ClusterPolicy.kyverno.io', 'ClusterCleanupPolicy.kyverno.io',
  'ClusterIssuer', 'ClusterSecretStore', 'GlobalNetworkPolicy', 'CiliumClusterwideNetworkPolicy',
  'AdminNetworkPolicy.policy.networking.k8s.io', 'BaselineAdminNetworkPolicy.policy.networking.k8s.io',
]);

const KIND_INFO = {
  // workloads
  Deployment: ['workload', 'DEP'], StatefulSet: ['workload', 'STS'], DaemonSet: ['workload', 'DS'],
  ReplicaSet: ['workload', 'RS'], ReplicationController: ['workload', 'RC'], Job: ['workload', 'JOB'],
  CronJob: ['workload', 'CJ'], Pod: ['workload', 'POD'], Rollout: ['workload', 'RO'],
  // network
  Service: ['network', 'SVC'], Ingress: ['network', 'ING'], IngressClass: ['network', 'IC'],
  Endpoints: ['network', 'EP'], EndpointSlice: ['network', 'EPS'], Gateway: ['network', 'GW'],
  GatewayClass: ['network', 'GWC'], HTTPRoute: ['network', 'HTTP'], GRPCRoute: ['network', 'GRPC'],
  TLSRoute: ['network', 'TLS'], TCPRoute: ['network', 'TCP'], UDPRoute: ['network', 'UDP'],
  VirtualService: ['network', 'VS'], DestinationRule: ['network', 'DR'], ServiceEntry: ['network', 'SE'],
  WorkloadEntry: ['network', 'WE'], NetworkAttachmentDefinition: ['network', 'NAD'],
  IPPool: ['network', 'POOL'], BGPPeer: ['network', 'BGP'], BGPConfiguration: ['network', 'BGPC'],
  FelixConfiguration: ['platform', 'FLX'], EnvoyFilter: ['network', 'EF'], ExternalHost: ['external', 'HOST'],
  // config
  ConfigMap: ['config', 'CM'], Secret: ['config', 'SEC'], ExternalSecret: ['config', 'ES'],
  SealedSecret: ['config', 'SS'], SecretStore: ['config', 'STORE'], ClusterSecretStore: ['config', 'CSS'],
  // identity
  ServiceAccount: ['identity', 'SA'], Role: ['identity', 'ROLE'], ClusterRole: ['identity', 'CR'],
  RoleBinding: ['identity', 'RB'], ClusterRoleBinding: ['identity', 'CRB'], User: ['external', 'USER'],
  Group: ['external', 'GRP'],
  // policy
  NetworkPolicy: ['policy', 'NP'], GlobalNetworkPolicy: ['policy', 'GNP'],
  CiliumNetworkPolicy: ['policy', 'CNP'], CiliumClusterwideNetworkPolicy: ['policy', 'CCNP'],
  AdminNetworkPolicy: ['policy', 'ANP'], PeerAuthentication: ['policy', 'PA'],
  AuthorizationPolicy: ['policy', 'AP'], RequestAuthentication: ['policy', 'RA'], Sidecar: ['policy', 'SC'],
  Telemetry: ['policy', 'TEL'], WasmPlugin: ['policy', 'WASM'],
  PodDisruptionBudget: ['policy', 'PDB'], HorizontalPodAutoscaler: ['policy', 'HPA'],
  VerticalPodAutoscaler: ['policy', 'VPA'], ScaledObject: ['policy', 'KEDA'],
  ResourceQuota: ['policy', 'QUOTA'], LimitRange: ['policy', 'LIMIT'], PriorityClass: ['platform', 'PC'],
  RuntimeClass: ['platform', 'RTC'], BackendTLSPolicy: ['policy', 'BTLS'],
  ClientTrafficPolicy: ['policy', 'CTP'], BackendTrafficPolicy: ['policy', 'BTP'],
  SecurityPolicy: ['policy', 'SECP'], ReferenceGrant: ['policy', 'GRANT'],
  MutatingWebhookConfiguration: ['policy', 'MWH'], ValidatingWebhookConfiguration: ['policy', 'VWH'],
  // pki
  Certificate: ['pki', 'CERT'], Issuer: ['pki', 'ISS'], ClusterIssuer: ['pki', 'CISS'],
  CertificateRequest: ['pki', 'CSR'], Bundle: ['pki', 'BNDL'], ClusterTrustBundle: ['pki', 'CTB'],
  // storage
  PersistentVolumeClaim: ['storage', 'PVC'], PersistentVolume: ['storage', 'PV'], StorageClass: ['storage', 'SC'],
  // platform / misc
  Namespace: ['platform', 'NS'], CustomResourceDefinition: ['platform', 'CRD'], APIService: ['platform', 'API'],
  ServiceMonitor: ['network', 'SM'], PodMonitor: ['network', 'PM'], PrometheusRule: ['platform', 'RULE'],
  // pseudo kinds used for selector / external peers
  PodSelector: ['external', 'PODS'], IPBlock: ['external', 'CIDR'], AnyNamespace: ['external', 'ANY'],
  Entity: ['external', 'ENT'], NamespaceSelector: ['external', 'NSS'],
  TriggerAuthentication: ['config', 'TA'],
};

export const CATEGORIES = ['workload', 'network', 'config', 'identity', 'policy', 'pki', 'storage', 'platform', 'external'];

export function groupOf(apiVersion) {
  if (!apiVersion || typeof apiVersion !== 'string') return '';
  const i = apiVersion.indexOf('/');
  return i === -1 ? '' : apiVersion.slice(0, i);
}

export function kindKey(kind, group) {
  return group ? `${kind}.${group}` : kind;
}

export function isClusterScoped(kind, group, crdScopes) {
  const key = kindKey(kind, group);
  if (crdScopes && crdScopes.has(key)) return crdScopes.get(key) === 'Cluster';
  if (CLUSTER_SCOPED.has(key)) return true;
  // Only fall back to the bare kind for built-in groups, so a namespaced CRD that happens
  // to share a name (e.g. fleet "Bundle") is not mistaken for a cluster-scoped one.
  if (!group || group.endsWith('.k8s.io') || BUILTIN_GROUPS.has(group)) return CLUSTER_SCOPED.has(kind);
  return false;
}

const BUILTIN_GROUPS = new Set(['apps', 'batch', 'policy', 'autoscaling', 'apiextensions.k8s.io',
  'rbac.authorization.k8s.io', 'networking.k8s.io', 'storage.k8s.io', 'scheduling.k8s.io',
  'admissionregistration.k8s.io', 'apiregistration.k8s.io', 'node.k8s.io', 'certificates.k8s.io',
  'discovery.k8s.io', 'flowcontrol.apiserver.k8s.io', 'gateway.networking.k8s.io']);

export function kindInfo(kind) {
  const info = KIND_INFO[kind];
  if (info) return { category: info[0], abbrev: info[1] };
  // Unknown CRD: derive an abbreviation from the capital letters (VirtualMachine → VM)
  const caps = (kind.match(/[A-Z]/g) || []).join('');
  const abbrev = (caps.length >= 2 ? caps : kind.slice(0, 4)).slice(0, 4).toUpperCase();
  return { category: 'platform', abbrev };
}

// Plural resource name (RBAC rules) → kind, for resourceNames grants.
export const RESOURCE_TO_KIND = {
  secrets: 'Secret', configmaps: 'ConfigMap', services: 'Service', serviceaccounts: 'ServiceAccount',
  persistentvolumeclaims: 'PersistentVolumeClaim', deployments: 'Deployment', statefulsets: 'StatefulSet',
  daemonsets: 'DaemonSet', pods: 'Pod', jobs: 'Job', cronjobs: 'CronJob', leases: 'Lease',
  endpoints: 'Endpoints', ingresses: 'Ingress', certificates: 'Certificate', issuers: 'Issuer',
};

export const WORKLOAD_KINDS = new Set(['Deployment', 'StatefulSet', 'DaemonSet', 'ReplicaSet',
  'ReplicationController', 'Job', 'CronJob', 'Pod', 'Rollout']);
