# ✏️ OS Sketchbook

A fun, visual, hand-drawn guide to Operating Systems — explained with **Linux** — from "what is an OS?" to how the CPU fetches instructions, page faults, RAM vs VRAM, namespaces, cgroups and Docker. Vibrant sketchbook theme by day, midnight neon by night; works on phones.

## A 100% static site

No server code, no build step, no internet needed. Everything (three.js, fonts) is bundled in this folder.

- **Just open `index.html`** in a browser (double-click works), or
- upload the whole folder to any static host: GitHub Pages, Netlify, Cloudflare Pages, S3, a USB stick…

(Optional local preview server: `python3 -m http.server` — not required.)

## Chapters

| # | Page | What's inside |
|---|------|---------------|
| 0 | `index.html` | What an OS is, restaurant analogy, OS on/off, 8 jobs, layer cake, types, learning map |
| 1 | `lab.html` | 3D lab with 17 animated stories: a Linux PC (tour, boot, run a command, fetch an instruction, RAM, RAM vs VRAM, everything-is-a-file, save a file, network), plus worlds of their own: layer cake, inside the CPU chip, pipeline factory, page-fault journey, inside a RAM chip, inside a graphics card, folder tree, container ship |
| 2 | `boot.html` | UEFI → GRUB → kernel → initramfs → systemd, boot log, units, process tree |
| 3 | `processes.html` | Processes, states, fork/exec lab, threads, context switch, scheduling simulator, fair-share race |
| 4 | `cpu.html` | 3D CPU chip & pipeline factory, instructions & machine code, fetch–decode–execute toy CPU, file → fetch journey, who does what (CPU vs OS), pipelines, caches, ELF |
| 5 | `memory.html` | 3D page-fault journey, RAM chip and graphics card; memory hierarchy, virtual memory, MMU/TLB lab, page faults step by step, page replacement, RAM-pressure game, copy-on-write, buddy allocator, how DRAM chips work, RAM vs VRAM |
| 6 | `files.html` | Everything is a file, `ls -l` decoder, FHS explorer, file descriptors, inode/link lab, VFS, mounting, journaling |
| 7 | `kernel.html` | User vs kernel mode, system calls, interrupts, DMA, drivers & modules, kernel designs, network stack |
| 8 | `concurrency.html` | Race-condition lab, locks, semaphore lot, dining philosophers, pipes, signals, IPC |
| 9 | `security.html` | Users, permission calculator, special bits, sudo, defense layers, capabilities, ASLR |
| 10 | `containers.html` | VM vs container, namespaces toggler, cgroups simulator, OverlayFS lab, `docker run` internals, DIY container |
| 11 | `playground.html` | A pretend Linux shell (virtual file system, pipes, tab completion) with 12 missions |
| 12 | `design.html` | Design trade-offs & Linux's choices, principles, best practices, big picture, glossary, final quiz + certificate |

## Folder layout

- `css/style.css`, `css/pages.css` — theme and components; `css/fonts.css` + `fonts/` — self-hosted fonts (Caveat, Patrick Hand, JetBrains Mono; SIL Open Font License)
- `vendor/three.min.js` — three.js r147 (MIT) for the 3D lab
- `js/core.js` — header, chapter drawer, theme toggle, quizzes, stickers (progress lives in your browser's localStorage)
- `js/sketch.js` — tiny engine for hand-sketched SVG diagrams and step-by-step "flow" animations
- `js/lab3d.js` — the 3D lab (toon-shaded, outlined models)
- `js/pages/*.js` — each chapter's interactive simulations

Command outputs shown on the pages are realistic, trimmed examples; numbers on your machine will differ.
