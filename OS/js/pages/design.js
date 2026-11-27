/* Chapter 12 — Design decisions, principles, glossary, final quiz */
(function () {
  'use strict';
  var $ = Core.$, esc = Core.esc;

  /* trade-offs */
  var TO = [
    ['🏗️ Kernel structure', ['Monolithic', 'Everything in one kernel. Fast direct calls; a bad driver can crash it all.'], ['Microkernel', 'Tiny kernel, services in user space. Robust and secure; more message-passing overhead.'], 'Monolithic + loadable modules. Speed and a huge driver ecosystem won; robustness comes from careful review and testing.'],
    ['⏱️ Multitasking', ['Cooperative', 'Programs hand back the CPU when they feel like it. Simple, but one greedy app freezes all.'], ['Preemptive', 'The timer interrupt forces turns. Responsive and fair, but needs locking everywhere.'], 'Preemptive — and the kernel itself can be preempted too (full real-time PREEMPT_RT was merged in 6.12).'],
    ['🎯 Scheduling goal', ['Throughput', 'Finish the most work per second (fewer switches, bigger slices).'], ['Latency / fairness', 'Everyone gets a quick, fair turn (more switches).'], 'Fairness with latency awareness (EEVDF), plus separate classes: SCHED_BATCH for throughput, SCHED_FIFO/RR/DEADLINE for real-time.'],
    ['🧮 Promising memory', ['Strict accounting', 'Never promise more than you have. Safe, but wastes RAM (most promises are never used).'], ['Overcommit', 'Promise more, hand out frames only when touched. Efficient, but needs an OOM killer.'], 'Heuristic overcommit by default (vm.overcommit_memory=0), with the OOM killer as the safety net. Strict mode is one sysctl away.'],
    ['💾 Writing to disk', ['Write-through', 'Every write goes to disk now. Safe, slow.'], ['Write-back cache', 'Collect writes in RAM, flush later. Fast, but a crash loses recent data.'], 'Write-back page cache for speed, and fsync()/O_SYNC for programs that need durability. Mechanism for both, policy is yours.'],
    ['📒 Crash safety', ['Journaling', 'Write the plan, then do it (ext4, XFS). Mature and fast.'], ['Copy-on-write', 'Never overwrite; write new, flip a pointer (btrfs, ZFS). Snapshots & checksums for free.'], 'Both live in the kernel. ext4/XFS are common defaults; btrfs is default on Fedora and openSUSE.'],
    ['🔒 Locking', ['One big lock', 'Simple and obviously correct, but only one CPU can be in the kernel.'], ['Fine-grained locks', 'Scales to many CPUs, but complex and deadlock-prone.'], 'Fine-grained locks + lock-free tricks like RCU and per-CPU data. The Big Kernel Lock was removed in 2011.'],
    ['🔔 Device events', ['Interrupts', 'Efficient when events are rare.'], ['Polling', 'Efficient when events are constant (no interrupt storm).'], 'Both, adaptively: NAPI switches network cards from interrupts to polling under load; io_uring can poll too.'],
    ['🧵 Threads', ['1:1', 'Every thread is a kernel task. Simple, uses all cores.'], ['M:N', 'Many user threads on few kernel threads. Cheap switches, complex.'], '1:1 (NPTL). Languages like Go build M:N "goroutines" on top in user space.'],
    ['🔌 Interfaces', ['Stable everything', 'Freeze internal APIs so out-of-tree drivers keep working.'], ['Stable only at the edge', 'Keep the user-space ABI rock-solid, but refactor the inside freely.'], '"We do not break userspace" — system calls stay stable forever, while in-kernel APIs change freely. So drivers belong upstream, in the kernel tree.'],
    ['🛡️ Security model', ['DAC only', 'Owners decide (rwx). Simple, but root is all-powerful.'], ['DAC + MAC', 'Add system-wide rules even root obeys.'], 'DAC + capabilities + pluggable LSMs (SELinux, AppArmor, Landlock) + seccomp. Defense in depth.'],
    ['📦 Isolation', ['Virtual machines', 'Separate kernels: strongest walls, heavier.'], ['Containers', 'Shared kernel: lightweight, weaker walls.'], 'Both! KVM makes Linux a hypervisor; namespaces + cgroups make containers. Pick per job (or mix with micro-VMs).']
  ];
  $('#seesaws').innerHTML = TO.map(function (t) {
    return '<div class="card"><h4>' + t[0] + '</h4><div class="seesaw"><div class="side"><h5>' + t[1][0] + '</h5><p class="small">' + t[1][1] + '</p></div><div class="vs">vs</div><div class="side"><h5>' + t[2][0] + '</h5><p class="small">' + t[2][1] + '</p></div></div>' +
      '<p style="margin-bottom:0"><span class="stamp">🐧 Linux chose</span> ' + t[3] + '</p></div>';
  }).join('');

  /* principles */
  var PR = [
    ['🎭', 'Abstraction', 'Hide messy hardware behind clean ideas: process, file, socket, virtual memory.'],
    ['🪄', 'Virtualize resources', 'Each program believes it has its own CPU and its own memory.'],
    ['⚙️', 'Mechanism ≠ policy', 'The kernel offers tools (cgroups, scheduler classes); admins and programs decide how to use them.'],
    ['📄', 'Everything is a file', 'One small interface — open/read/write/close — for almost everything.'],
    ['🧩', 'Small tools, composed', 'Do one thing well; connect with pipes. Unix philosophy.'],
    ['🔑', 'Least privilege', 'Give only the powers needed: users, capabilities, sudo for one command.'],
    ['🧱', 'Isolation', 'CPU rings, private address spaces, namespaces: mistakes stay contained.'],
    ['😴', 'Be lazy (on purpose)', 'Demand paging, copy-on-write, lazy allocation: don\'t do work until it\'s needed.'],
    ['⚡', 'Cache everything', 'CPU caches, TLB, page cache, dentry cache — reuse what you just did.'],
    ['🪜', 'Indirection', 'Page tables, file descriptors, inodes, VFS — a level in between makes things flexible.'],
    ['📦', 'Batch it', 'Buffered I/O, NAPI, io_uring: amortize costly transitions.'],
    ['🛟', 'Fail safely', 'Journals, OOM killer, watchdogs, restarts — expect failure and recover.'],
    ['🤝', 'Never break users', 'Stable system call interface: programs from 20 years ago still run.'],
    ['📏', 'Measure, don\'t guess', 'strace, perf, eBPF: let data, not hunches, drive decisions.']
  ];
  $('#principlesGrid').innerHTML = PR.map(function (p, i) { return '<div class="card ' + ['c-y', 'c-p', 'c-b', 'c-g', 'c-o', 'c-v', 'c-t'][i % 7] + '"><span class="big-ic">' + p[0] + '</span><h4>' + p[1] + '</h4><p>' + p[2] + '</p></div>'; }).join('');

  /* big picture */
  var big = SK.chain([
    { id: 'b1', icon: '⏰', label: 'already booted', sub: 'ch 2 · systemd', c: 'orange' },
    { id: 'b2', icon: '🖱️', label: 'you click', sub: 'ch 7 · interrupt', c: 'purple' },
    { id: 'b3', icon: '🧬', label: 'fork + exec', sub: 'ch 3 · new process', c: 'pink' },
    { id: 'b4', icon: '🧮', label: 'page faults', sub: 'ch 5 · load code', c: 'green' },
    { id: 'b5', icon: '📁', label: 'open profile', sub: 'ch 6 · VFS + cache', c: 'yellow' },
    { id: 'b6', icon: '⚖️', label: 'scheduler', sub: 'ch 3 · CPU turns', c: 'pink' },
    { id: 'b7', icon: '🌐', label: 'DNS + TCP', sub: 'ch 7 · sockets', c: 'blue' },
    { id: 'b8', icon: '🤝', label: 'tabs talk', sub: 'ch 8 · IPC', c: 'teal' },
    { id: 'b9', icon: '🔐', label: 'sandboxed', sub: 'ch 9 · seccomp', c: 'red' },
    { id: 'b10', icon: '📦', label: 'server answers', sub: 'ch 10 · container', c: 'blue' },
    { id: 'b11', icon: '🎨', label: 'pixels!', sub: 'ch 7 · GPU driver', c: 'purple' },
    { id: 'b12', icon: '💾', label: 'save a file', sub: 'ch 6 · journal', c: 'green' }
  ], { cols: 6, mcols: 2, nw: 130, nh: 100, gx: 30, gy: 56, mnw: 180, mgx: 30, fs: 16 });
  var BD = SK.diagram('#bigD', big);
  SK.flow(BD, [
    { on: ['b1'], say: '⏰ Long ago (well, this morning): firmware → GRUB → kernel → <b>systemd</b> started your desktop. <a href="boot.html">Chapter 2</a>' },
    { on: ['b2'], go: [['b1', 'b2', {}]], say: '🖱️ You click the Firefox icon. The mouse raises an <b>interrupt</b>; the kernel turns it into an input event for your desktop. <a href="kernel.html#interrupts">Chapter 7</a>' },
    { on: ['b3'], go: [['b2', 'b3', {}]], say: '🧬 The desktop calls <b>fork()</b> + <b>execve("firefox")</b>. A new process with its own PID is born. <a href="processes.html#fork">Chapter 3</a>' },
    { on: ['b4'], go: [['b3', 'b4', {}]], say: '🧮 Firefox\'s code isn\'t loaded all at once: each first touch is a <b>page fault</b> that maps it in. libc is <b>shared</b> with every other program. <a href="memory.html">Chapter 5</a>' },
    { on: ['b5'], go: [['b4', 'b5', {}]], say: '📁 It opens its profile with <code>openat()</code>/<code>read()</code>: VFS → ext4 → mostly served from the <b>page cache</b>. <a href="files.html">Chapter 6</a>' },
    { on: ['b6'], go: [['b5', 'b6', {}]], say: '⚖️ Dozens of Firefox threads compete with your music player and everything else; the <b>scheduler</b> keeps it fair and snappy. <a href="processes.html#linux">Chapter 3</a>' },
    { on: ['b7'], go: [['b6', 'b7', {}]], say: '🌐 <code>socket()</code>, DNS lookup, TCP handshake, TLS — all through the kernel\'s <b>network stack</b> and NIC driver. <a href="kernel.html#net">Chapter 7</a>' },
    { on: ['b8'], go: [['b7', 'b8', {}]], say: '🤝 Firefox is many processes (one per site); they talk over <b>IPC</b> — pipes, shared memory, Unix sockets. <a href="concurrency.html#ipc">Chapter 8</a>' },
    { on: ['b9'], go: [['b8', 'b9', {}]], say: '🔐 Each web-content process is <b>sandboxed</b> with seccomp and namespaces, so a malicious page can\'t read your files. <a href="security.html#layers">Chapter 9</a>' },
    { on: ['b10'], go: [['b9', 'b10', {}]], say: '📦 Far away, the website\'s server is probably a <b>container</b> on a Linux machine — namespaces, cgroups, overlay layers. <a href="containers.html">Chapter 10</a>' },
    { on: ['b11'], go: [['b10', 'b11', {}]], say: '🎨 The page is drawn through the GPU <b>driver</b> (DRM) and appears on screen. <a href="kernel.html#drivers">Chapter 7</a>' },
    { on: ['b12'], go: [['b11', 'b12', {}]], say: '💾 You download a picture: <code>write()</code> → page cache (dirty) → <b>journal</b> → DMA to the SSD. Every chapter, in one click. 🎉 <a href="files.html#journal">Chapter 6</a>' }
  ]);

  /* glossary */
  var G = [
    ['ABI', 'Application Binary Interface: the exact rules compiled programs use to talk to the OS (system call numbers, calling conventions).'],
    ['Boot loader', 'Small program (GRUB) that loads the kernel into memory and starts it.'],
    ['Page cache', 'Spare RAM holding copies of file data, so repeated reads are instant. Shown as buff/cache.'],
    ['cgroup', 'Control group: limits and measures CPU, memory, I/O and process count for a group of processes.'],
    ['Context switch', 'Saving one task\'s CPU state and loading another\'s so they can share a core.'],
    ['Copy-on-write', 'Share data until someone writes; only then make a private copy. Makes fork() cheap.'],
    ['Daemon', 'A background service process (sshd, cron). Usually started by systemd.'],
    ['Deadlock', 'Tasks waiting on each other in a circle, forever.'],
    ['Device driver', 'Kernel code that knows how to talk to a specific piece of hardware.'],
    ['DMA', 'Direct Memory Access: devices copy data to/from RAM without the CPU moving each byte.'],
    ['eBPF', 'Safe mini-programs loaded into the kernel for tracing, networking and security.'],
    ['File descriptor', 'A small number (0, 1, 2, 3…) a process uses to refer to an open file, pipe or socket.'],
    ['FHS', 'Filesystem Hierarchy Standard: the standard Linux folder layout (/etc, /usr, /var…).'],
    ['fork()', 'System call that creates a child process as a copy of the caller.'],
    ['execve()', 'System call that replaces the current program with a new one (same PID).'],
    ['futex', 'Fast userspace mutex: lock in user space, ask the kernel only when you must wait.'],
    ['Hypervisor', 'Software that runs virtual machines (KVM, Xen, VMware).'],
    ['init / systemd', 'The first user process (PID 1); starts and supervises everything else.'],
    ['initramfs', 'A tiny file system loaded into RAM at boot to help mount the real root disk.'],
    ['inode', 'The record that describes a file: owner, permissions, size, timestamps, data block locations.'],
    ['Interrupt', 'A signal from hardware (or a timer) that makes the CPU pause and run a kernel handler.'],
    ['IPC', 'Inter-Process Communication: pipes, signals, shared memory, sockets, message queues.'],
    ['Kernel', 'The core of the OS that runs in privileged mode and manages all hardware.'],
    ['Kernel module', 'Code (often a driver) that can be loaded into a running kernel (.ko files).'],
    ['Mutex', 'A lock that lets only one thread at a time into a critical section.'],
    ['Namespace', 'Gives a process its own private view of a global resource (PIDs, network, mounts…).'],
    ['nice', 'A process\'s politeness, −20 (greedy) to +19 (very polite); changes its CPU share.'],
    ['OOM killer', 'Kernel feature that kills a process when memory and swap are exhausted.'],
    ['OverlayFS', 'A union file system that stacks read-only layers under a writable one (Docker images).'],
    ['Page', 'A fixed-size chunk of memory, usually 4 KB. RAM is managed page by page.'],
    ['Page fault', 'A trap when a program touches a page that isn\'t currently mapped; the kernel fixes it or kills the program.'],
    ['Page table', 'Per-process map from virtual pages to physical frames, used by the MMU.'],
    ['PID', 'Process ID: the number that identifies a process.'],
    ['Pipe', 'A one-way kernel buffer connecting one process\'s output to another\'s input (|).'],
    ['Preemption', 'Taking the CPU away from a task so another can run.'],
    ['Process', 'A running program with its own memory, files and state.'],
    ['Race condition', 'A bug where the result depends on the unlucky timing of threads.'],
    ['RCU', 'Read-Copy-Update: a lock-free way to let readers run while writers publish new versions.'],
    ['root', 'The all-powerful administrator account, UID 0.'],
    ['Scheduler', 'Kernel part that decides which task runs on which CPU, and for how long.'],
    ['Semaphore', 'A counter-based lock that allows up to N holders.'],
    ['Shell', 'A program that reads your commands and runs them (bash, zsh).'],
    ['Signal', 'A small asynchronous message to a process (SIGTERM, SIGKILL, SIGINT…).'],
    ['Socket', 'An endpoint for network or local communication, used like a file descriptor.'],
    ['Swap', 'Disk space used to hold memory pages when RAM is full.'],
    ['System call', 'The doorway from a user program into the kernel (read, write, fork…).'],
    ['Thread', 'An independent path of execution inside a process, sharing its memory.'],
    ['TLB', 'Translation Lookaside Buffer: CPU cache of recent virtual→physical translations.'],
    ['UEFI', 'Modern firmware that starts the computer and launches the boot loader.'],
    ['User space', 'Where normal programs run, with restricted privileges (ring 3).'],
    ['VFS', 'Virtual File System: one interface in front of all the different file systems.'],
    ['Virtual memory', 'Giving each process its own private address space, mapped onto real RAM (or disk).'],
    ['Program counter (RIP)', 'CPU register holding the address of the next instruction to fetch.'],
    ['Fetch–decode–execute', 'The CPU\'s endless loop: read the next instruction, work out what it means, do it.'],
    ['Pipeline', 'Overlapping the stages of several instructions so the CPU finishes more per cycle.'],
    ['Cache line', 'The 64-byte chunk the CPU moves between RAM and its caches.'],
    ['ELF', 'The file format of Linux programs: header (entry point), code and data segments.'],
    ['Minor / major fault', 'Page faults fixed from RAM alone (minor) or needing disk I/O (major).'],
    ['DRAM', 'Main memory made of tiny leaky capacitors that must be refreshed every 64 ms.'],
    ['VRAM', 'The graphics card\'s own high-bandwidth memory (GDDR/HBM) used by the GPU.'],
    ['Framebuffer', 'A grid of pixels in memory holding the picture the screen shows.'],
    ['DRM / KMS', 'Linux\'s graphics subsystem: manages GPU memory and sets display modes.'],
    ['Zombie', 'A finished process whose exit code hasn\'t been collected by its parent yet.']
  ];
  function drawG() {
    var q = $('#gq').value.trim().toLowerCase();
    var list = G.filter(function (g) { return !q || g[0].toLowerCase().indexOf(q) >= 0 || g[1].toLowerCase().indexOf(q) >= 0; });
    $('#gloss').innerHTML = list.map(function (g) { return '<div class="card"><b>' + esc(g[0]) + '</b>' + esc(g[1]) + '</div>'; }).join('') || '<p class="muted">No match. Try another word!</p>';
    $('#gCount').textContent = list.length + ' / ' + G.length + ' words';
  }
  $('#gq').addEventListener('input', drawG); drawG();

  /* final quiz + certificate */
  Core.quiz('#quizBox', [
    { q: 'An Operating System mainly…', a: ['Makes games', 'Manages hardware and lets programs share it safely', 'Is the screen', 'Is a web browser'], c: 1, why: 'Chapter 0: manage, share, protect, simplify.' },
    { q: 'Which is the first user-space process Linux starts?', a: ['GRUB', 'bash', 'systemd (PID 1)', 'Firefox'], c: 2, why: 'Chapter 2: the kernel runs /sbin/init → systemd as PID 1.' },
    { q: 'fork() then exec() is how…', a: ['Files are deleted', 'A shell starts a new program', 'Memory is freed', 'The disk is formatted'], c: 1, why: 'Chapter 3: copy the shell, then replace the copy with the new program.' },
    { q: 'What makes each process think it owns all the memory?', a: ['Swap', 'Virtual memory with page tables', 'The GPU', 'cgroups'], c: 1, why: 'Chapter 5: each process has its own page table mapping virtual pages to physical frames.' },
    { q: 'Which path shows live info about process 1234?', a: ['/etc/1234', '/proc/1234', '/home/1234', '/boot/1234'], c: 1, why: 'Chapter 6: /proc is a virtual file system with one folder per PID.' },
    { q: 'An inode stores everything about a file EXCEPT…', a: ['Its owner', 'Its size', 'Its name', 'Where its data blocks are'], c: 2, why: 'Chapter 6: names live in directory entries; that\'s how hard links work.' },
    { q: 'How does a user program enter the kernel?', a: ['A system call', 'A reboot', 'A pipe', 'A thread'], c: 0, why: 'Chapter 7: system calls are the only doors into kernel mode.' },
    { q: 'Linux\'s kernel design is…', a: ['Microkernel', 'Monolithic with loadable modules', 'Exokernel', 'No kernel'], c: 1, why: 'Chapter 7 & 11: all core subsystems in one kernel, with modules.' },
    { q: 'Taking locks in a consistent global order prevents…', a: ['Page faults', 'Deadlocks', 'Interrupts', 'Booting'], c: 1, why: 'Chapter 8: it breaks the circular-wait condition.' },
    { q: 'chmod 600 secret.txt means…', a: ['Everyone can read it', 'Only the owner can read and write it', 'Only root can run it', 'Nobody can open it'], c: 1, why: 'Chapter 9: 6 = rw for owner, 0 for group and others.' },
    { q: 'Docker containers are isolated by ___ and limited by ___.', a: ['cgroups; namespaces', 'namespaces; cgroups', 'GRUB; UEFI', 'pipes; signals'], c: 1, why: 'Chapter 10: namespaces control what you see; cgroups control what you use.' },
    { q: 'Linux writes saved files to the page cache first and flushes later. This trades…', a: ['Security for color', 'A little durability for a lot of speed (fix with fsync)', 'CPU for GPU', 'Nothing'], c: 1, why: 'Chapter 12: write-back caching is fast; fsync() gives durability when you need it.' }
  ], {
    pass: 9,
    onFinish: function (right) {
      if (right >= 9) {
        $('#certWrap').hidden = false; $('#certDate').textContent = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) + ' · score ' + right + '/12';
        var nm = Core.store.get('cert-name', ''); $('#certName').value = nm; $('#certWho').textContent = nm || 'You';
        $('#certWrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
  $('#certName').addEventListener('input', function () { var v = this.value.trim(); $('#certWho').textContent = v || 'You'; Core.store.set('cert-name', v); });
  $('#certPrint').addEventListener('click', function () { window.print(); });
})();
