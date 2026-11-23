# Shaderland ✨

An interactive, visual, one-stop guide to shaders — 16 "levels" from *what is a shader?* to raymarching, post-processing and GPU particle simulations. Everything moving on the page is a real shader running on your GPU, drawn by a tiny hand-made WebGL2 engine (no libraries).

## Run it

```bash
python3 serve.py
```

Then open http://localhost:8765. (You can also just double-click `index.html`; the local server only disables caching while you edit.)

Needs a browser with WebGL2 (any recent Chrome, Edge, Firefox or Safari).

## What's inside

| Level | Topic | Interactive bits |
|---|---|---|
| 01 | What is a shader? | Pixel Machine (live values per pixel), CPU vs GPU painting race |
| 02 | Hardware | 3D PC diorama with a frame's journey, 3D CPU vs GPU chips |
| 03 | Graphics pipeline | 7-stage 3D stepper, draggable rasterization playground |
| 04 | Vertex shaders & spaces | Model→World→View→NDC→Screen morph, vertex shader editor |
| 05 | Attributes / uniforms / varyings | Animated data-flow diagram |
| 06 | Fragment shaders | 9-step shader "recipe" with uv grid & pixel readout |
| 07 | GLSL toolbox | 12 function graphs painted as pixels, swizzle machine |
| 08 | Lighting | 11 shading models with live code, N/L/V/R/H vector lab |
| 09 | Textures | GPU picking UV ↔ texel, filtering, mipmaps, wrap modes |
| 10 | Parallelism | Warp divergence simulator, latency hiding |
| 11 | Raymarching | 2D sphere tracing, 3D SDF scene with step heat-map |
| 12 | Post-processing | 13 effects with a before/after slider |
| 13 | GPGPU | Up to 1M particles simulated in float textures |
| 14 | Shader family | All shader types, same shader in GLSL/HLSL/MSL/WGSL/SPIR-V |
| 15 | Playground | Live-compiling fragment shader editor with presets |
| 16 | Boss level | Quiz + flip-card glossary + resources |

## Code map

- `js/core/engine.js` — the "Prism" engine: math, geometry, renderer, orbit camera, 3D labels, and a stage manager that creates/frees WebGL contexts as you scroll (browsers cap how many can be alive).
- `js/core/ui.js` — GLSL syntax highlighter, live code editor, tabs, toasts, XP/level system.
- `js/demos/*.js` — one file per level.
- `css/style.css` — the neon synthwave theme.
