/* LEVEL 14 — the shader family: same shader in five languages */
(function () {
  'use strict';
  const { $ } = SL;
  const LANGS = {
    glsl: { name: 'GLSL', full: 'OpenGL Shading Language', where: ['WebGL', 'OpenGL', 'OpenGL ES (Android)', 'Godot (similar)', 'Shadertoy'],
      note: 'The language this whole page is written in. C-like, with built-in vector types like <code>vec3</code> and functions like <code>mix()</code>.',
      code: `#version 300 es
precision highp float;
uniform vec2 u_resolution;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 red  = vec3(1.0, 0.2, 0.4);
  vec3 blue = vec3(0.2, 0.4, 1.0);
  fragColor = vec4(mix(red, blue, uv.x), 1.0);
}` },
    hlsl: { name: 'HLSL', full: 'High-Level Shading Language', where: ['DirectX 11/12', 'Xbox', 'Unity', 'Unreal Engine', 'Vulkan (via DXC)'],
      note: 'Microsoft’s language. Same ideas, different words: <code>float3</code> instead of <code>vec3</code>, <code>lerp</code> instead of <code>mix</code>, and “semantics” like <code>SV_Target</code>.',
      code: `cbuffer Params : register(b0) {
  float2 resolution;
};

float4 main(float4 pos : SV_Position) : SV_Target {
  float2 uv = pos.xy / resolution;
  float3 red  = float3(1.0, 0.2, 0.4);
  float3 blue = float3(0.2, 0.4, 1.0);
  return float4(lerp(red, blue, uv.x), 1.0);
}` },
    msl: { name: 'MSL', full: 'Metal Shading Language', where: ['iPhone & iPad', 'Mac', 'Apple Vision Pro'],
      note: 'Apple’s language, based on C++. Inputs are tagged with <code>[[attributes]]</code> and functions are marked <code>fragment</code> or <code>vertex</code>.',
      code: `#include <metal_stdlib>
using namespace metal;

fragment float4 frag(float4 pos [[position]],
                     constant float2 &resolution [[buffer(0)]]) {
  float2 uv = pos.xy / resolution;
  float3 red  = float3(1.0, 0.2, 0.4);
  float3 blue = float3(0.2, 0.4, 1.0);
  return float4(mix(red, blue, uv.x), 1.0);
}` },
    wgsl: { name: 'WGSL', full: 'WebGPU Shading Language', where: ['WebGPU (Chrome, Edge, Safari, Firefox)', 'wgpu (Rust)', 'Deno / Node'],
      note: 'The newest one, made for WebGPU. Rust-flavoured syntax: <code>let</code>, <code>fn</code>, <code>-&gt;</code>, and types like <code>vec3f</code>. Also supports compute shaders on the web.',
      code: `@group(0) @binding(0) var<uniform> resolution: vec2f;

@fragment
fn main(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / resolution;
  let red  = vec3f(1.0, 0.2, 0.4);
  let blue = vec3f(0.2, 0.4, 1.0);
  return vec4f(mix(red, blue, uv.x), 1.0);
}` },
    spirv: { name: 'SPIR-V', full: 'Standard Portable Intermediate Representation', where: ['Vulkan', 'OpenGL 4.6', 'OpenCL', 'target of glslang / DXC / Naga'],
      note: 'Not something you write by hand! It’s the <b>compiled</b> binary form that GLSL/HLSL get turned into for Vulkan. This is a human-readable disassembly of the same shader.',
      code: `; SPIR-V (binary) shown as text
%main = OpFunction %void None %3
%5    = OpLabel
%13   = OpLoad %v4float %gl_FragCoord
%14   = OpVectorShuffle %v2float %13 %13 0 1
%17   = OpLoad %v2float %u_resolution
%18   = OpFDiv %v2float %14 %17
%26   = OpCompositeExtract %float %18 0
%27   = OpExtInst %v3float %glsl FMix %red %blue %26
%28   = OpCompositeConstruct %v4float %27 %float_1
        OpStore %fragColor %28
        OpReturn
        OpFunctionEnd` },
  };
  SL.tabs('#lang-tabs', (k) => {
    const L = LANGS[k], pre = $('#lang-code');
    pre.classList.remove('hl-done'); SL.renderCode(pre, L.code);
    $('#lang-info').innerHTML = `<b>${L.name}</b><small class="muted">${L.full}</small><div class="where">${L.where.map((w) => `<span>${w}</span>`).join('')}</div><p>${L.note}</p>`;
    SL.xp.award('lang-' + k, 5, null);
  }, 'glsl');
})();
