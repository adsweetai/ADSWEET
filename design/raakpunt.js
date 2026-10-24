/* AdSweet · Het Raakpunt. Motor: "Sculpture Hero" door guglielmogiannattasio.it (WebGL2-deeltjes op de GPU), overgezet in raakpunt-engine.js.
   <raakpunt-hero theme="light|dark" hinttext="..." backdrop="adsweet">  vult zijn ouder; zoekt [data-hero], [data-hero-nav] en [data-hero-content].
   <raakpunt-beeld theme="light|dark" orient="landscape|portrait">       stilstaande sculptuur.
   Beelden: assets/adsweet-sculptuur-(gsm-)licht|nacht.jpg. Ontbreken ze, dan tekent de motor de voorlopige sculptuur. */
(function () {
"use strict";
/* Liquid particle engine, ported from "Sculpture Hero" by guglielmogiannattasio.it (WebGL2 GPGPU particles). */
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

const NOISE = `
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*f*(f*(f*6.0-15.0)+10.0);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }
vec2 ambientField(vec2 uv, float t){
  vec2 q = uv*vec2(3.2,1.7);
  vec2 a = vec2(vnoise(q+vec2(t*0.11,0.0))-0.5, vnoise(q+vec2(5.2,t*0.08)+3.1)-0.5);
  vec2 q2 = uv*vec2(7.5,4.0) + vec2(-t*0.19, t*0.13);
  vec2 b = vec2(vnoise(q2+1.7)-0.5, vnoise(q2+9.3)-0.5);
  return a + b*0.45;
}
`;
const ENERGY = `
float energyAt(vec2 rectPx, vec2 mouse, float radius, float presence, float wakeEnergy){
  vec2 d = rectPx - mouse;
  float f = exp(-dot(d,d)/(radius*radius))*presence;
  return smoothstep(0.06, 0.5, f*1.15 + wakeEnergy*1.7);
}
`;
const QUAD_VS = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;
const FLOW_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform vec2 uSize;
uniform float uRadius;
uniform float uPresence;
uniform float uDecay;
vec2 decV(vec4 c){ return (c.rg*255.0-128.0)/127.0; }
void main(){
  vec2 v0 = decV(texture(uPrev, vUv));
  vec2 uv = vUv - v0*uTexel*2.5;
  vec4 c = texture(uPrev, uv)*0.52
    + 0.12*(texture(uPrev, uv+vec2(uTexel.x,0.0)) + texture(uPrev, uv-vec2(uTexel.x,0.0))
          + texture(uPrev, uv+vec2(0.0,uTexel.y)) + texture(uPrev, uv-vec2(0.0,uTexel.y)));
  vec2 v = decV(c);
  float p = c.b;
  vec2 d = (vUv-uMouse)*uSize;
  float f = exp(-dot(d,d)/(uRadius*uRadius))*uPresence;
  float sp = clamp(length(uVel)*2.5, 0.0, 1.0);
  v += uVel*f*0.22;
  p = max(p, f*sp);
  v *= uDecay;
  p *= uDecay;
  v = sign(v)*max(abs(v)-1.2/127.0, 0.0);
  p = max(p-1.2/255.0, 0.0);
  v = clamp(v, -1.0, 1.0);
  o = vec4((v*127.0+128.0)/255.0, p, 1.0);
}
`;
const SIM_FS = `#version 300 es
precision highp float;
out vec4 o;
uniform sampler2D uState;
uniform sampler2D uHome;
uniform sampler2D uFlow;
uniform vec2 uSize;
uniform vec2 uMouse;
uniform float uRadius;
uniform float uPresence;
uniform float uStrength;
uniform float uSpread;
uniform float uTurb;
uniform float uReturn;
uniform float uTime;
uniform float uDt;
uniform float uIntro;
${NOISE}
vec2 curl(vec2 p){
  const float e = 0.35;
  float a = vnoise(p+vec2(0.0,e)) - vnoise(p-vec2(0.0,e));
  float b = vnoise(p+vec2(e,0.0)) - vnoise(p-vec2(e,0.0));
  return vec2(a, -b)/(2.0*e);
}
void main(){
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 hm = texelFetch(uHome, ij, 0);
  if(hm.w <= 0.0){ o = vec4(0.0); return; }
  vec4 st = texelFetch(uState, ij, 0);
  vec2 off = st.xy;
  vec2 vel = st.zw;
  float sd = hm.z;
  float light = 0.45 + sd*1.1;
  vec2 p = hm.xy*uSize + off;
  vec4 fl = texture(uFlow, clamp(p/uSize, 0.0, 1.0));
  vec2 wake = (fl.rg*255.0-128.0)/127.0;
  float pr = fl.b;
  vec2 toM = p - uMouse;
  float r2 = dot(toM,toM);
  float f = exp(-r2/(uRadius*uRadius))*uPresence;
  vec2 n = toM*inversesqrt(r2+1.0);
  float e = clamp(pr*2.0 + f, 0.0, 1.0);
  vec2 acc = vec2(0.0);
  acc += n*f*1.25*uStrength*uSpread*light;
  acc += vec2(-n.y, n.x)*f*1.45*uStrength*uSpread*(0.4+sd);
  acc += (wake*42.0*uSpread*light - vel)*e*0.08;
  vec2 q = p*0.0095 + vec2(uTime*0.35, -uTime*0.2);
  vec2 c = curl(q) + 0.5*curl(q*2.3 + 7.1);
  acc += c*(e*1.2*uSpread + uIntro*1.5)*uTurb*light;
  float k = (0.006 + 0.02*uReturn)*(0.65+sd*0.7)*(1.0 - uIntro*0.75);
  acc -= off*k;
  vel += acc*uDt;
  vel *= pow(mix(0.93, 0.955, e), uDt);
  off += vel*uDt;
  if(dot(off,off) < 0.0004 && dot(vel,vel) < 0.0004){ off = vec2(0.0); vel = vec2(0.0); }
  o = vec4(off, vel);
}
`;
const PART_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
uniform sampler2D uState;
uniform sampler2D uHome;
uniform sampler2D uCol;
uniform sampler2D uFlow;
uniform int uTexW;
uniform vec4 uRect;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uRadius;
uniform float uPresence;
uniform float uDot;
uniform float uTime;
uniform float uAmbient;
uniform float uStreak;
uniform float uIntroVis;
uniform float uRest;
uniform vec3 uTint;
out vec2 vLocal;
out float vHalfLen;
out float vR;
out vec3 vCol;
out float vA;
${NOISE}
${ENERGY}
void main(){
  int id = gl_InstanceID;
  ivec2 ij = ivec2(id % uTexW, id / uTexW);
  vec4 hm = texelFetch(uHome, ij, 0);
  vec4 st = texelFetch(uState, ij, 0);
  vec4 cl = texelFetch(uCol, ij, 0);
  float wakeE = texture(uFlow, hm.xy).b;
  float E = energyAt(hm.xy*uRect.zw, uMouse, uRadius, uPresence, wakeE);
  float lift = smoothstep(0.35, 2.5, length(st.xy));
  float a = max(max(E, lift), max(uRest, 1.0-uIntroVis));
  if(a < 0.01 || hm.w <= 0.0){ gl_Position = vec4(2.0,2.0,2.0,1.0); return; }
  vec2 base = uRect.xy + hm.xy*uRect.zw + st.xy;
  base -= ambientField(hm.xy, uTime)*10.0*uAmbient;
  vec2 v = st.zw;
  float sp = length(v);
  vec2 dir = sp > 0.001 ? v/sp : vec2(1.0,0.0);
  float r = uDot*hm.w*0.5;
  float len = min(sp*1.25, 18.0)*uStreak;
  vec2 lc = aCorner*vec2(r + len*0.5 + 1.0, r + 1.0);
  vec2 center = base - dir*len*0.5;
  vec2 world = center + dir*lc.x + vec2(-dir.y, dir.x)*lc.y;
  vec2 clip = world/uRes*2.0-1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  vLocal = lc;
  vHalfLen = len*0.5;
  vR = r;
  vec3 col = cl.rgb*uTint;
  float glint = smoothstep(2.0, 16.0, sp);
  col = mix(col, min(col*1.18 + vec3(0.07,0.075,0.085), vec3(1.0)), glint*0.75);
  vCol = col;
  vA = a;
}
`;
const PART_FS = `#version 300 es
precision highp float;
in vec2 vLocal;
in float vHalfLen;
in float vR;
in vec3 vCol;
in float vA;
uniform float uDpr;
out vec4 o;
void main(){
  vec2 q = vec2(max(abs(vLocal.x)-vHalfLen, 0.0), vLocal.y);
  float d = length(q) - vR;
  float a = clamp(0.5 - d*uDpr, 0.0, 1.0);
  float tail = vHalfLen > 0.0 ? clamp(0.5 - vLocal.x/(2.0*(vHalfLen+vR)), 0.0, 1.0) : 0.0;
  a *= 1.0 - tail*0.55;
  a *= vA;
  if(a < 0.004) discard;
  o = vec4(vCol*a, a);
}
`;
const IMAGE_FS = `#version 300 es
precision highp float;
out vec4 o;
uniform sampler2D uImg;
uniform sampler2D uFlow;
uniform vec2 uRes;
uniform float uDpr;
uniform vec4 uRect;
uniform vec3 uBg;
uniform vec3 uImgBg;
uniform vec2 uMouse;
uniform float uPresence;
uniform float uRadius;
uniform float uStrength;
uniform float uTime;
uniform float uAmbient;
uniform float uIntroVis;
uniform float uRest;
uniform float uAlphaMode;
${NOISE}
${ENERGY}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y*uDpr - gl_FragCoord.y)/uDpr;
  vec2 size = uRect.zw;
  vec2 uv = (px-uRect.xy)/size;
  if(uv.x < -0.05 || uv.x > 1.05 || uv.y < -0.12 || uv.y > 1.12){ o = vec4(0.0); return; }
  vec4 fl = texture(uFlow, clamp(uv,0.0,1.0));
  vec2 vel = (fl.rg*255.0-128.0)/127.0;
  vec2 rp = uv*size;
  vec2 toM = rp - uMouse;
  float fall = exp(-dot(toM,toM)/(uRadius*uRadius))*uPresence;
  vec2 disp = -toM*0.22*uStrength*fall - vel*10.0*uStrength;
  disp += ambientField(uv, uTime)*10.0*uAmbient;
  vec2 suv = uv + disp/size;
  vec4 tx = texture(uImg, suv);
  vec3 col = tx.rgb;
  vec2 e = smoothstep(vec2(0.0), vec2(0.004,0.01), suv) * smoothstep(vec2(1.0), vec2(0.996,0.99), suv);
  float key = uAlphaMode > 0.5 ? tx.a : smoothstep(0.012, 0.05, length(col-uImgBg));
  float k = key*e.x*e.y;
  float E = energyAt(rp, uMouse, uRadius, uPresence, fl.b);
  float show = (1.0 - max(E, uRest))*uIntroVis;
  vec3 mat = uAlphaMode > 0.5 ? col : col*(uBg/max(uImgBg, vec3(0.001)));
  float A = k*show;
  o = vec4(mat*A, A);
}
`;

function compile(gl, vs, fs) {
  const make = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error("Shader: " + log); }
    return sh;
  };
  const p = gl.createProgram();
  const v = make(gl.VERTEX_SHADER, vs), f = make(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v); gl.attachShader(p, f);
  gl.bindAttribLocation(p, 0, "aPos");
  gl.linkProgram(p); gl.deleteShader(v); gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Link: " + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); if (info) u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

const TEX_W = 1024;
const SETTLE_FRAMES = 270;

class LiquidEngine {
  constructor(canvas, opts, onFail) {
    this.lastImage = null; this.onFirstFrame = null;
    this.canvas = canvas; this.opts = opts; this.onFail = onFail;
    this.lowPower = false; this.stateFormat = { internal: 0, type: 0 };
    this.imgTex = null; this.flowTex = []; this.flowFb = []; this.flowW = 256; this.flowH = 104; this.flowIdx = 0; this.flowDirty = false;
    this.homeTex = null; this.colTex = null; this.stateTex = []; this.stateFb = []; this.stateIdx = 0; this.texH = 1; this.n = 0; this.gridW = 1; this.stateDirty = false;
    this.alphaMode = false; this.imgBg = [0.918, 0.914, 0.906]; this.flowing = 0;
    this.aspect = 2.5; this.rect = { x: 0, y: 0, w: 1, h: 1 }; this.cssW = 1; this.cssH = 1;
    this.target = { x: -9999, y: -9999 }; this.mouse = { x: -9999, y: -9999 }; this.prevMouse = { x: -9999, y: -9999 }; this.mvel = { x: 0, y: 0 };
    this.presence = 0; this.presenceTarget = 0; this.burst = 0; this.lastInput = -1e9; this.settle = 1e9; this.touchRelease = 0;
    this.time = 0; this.introT = 1; this.raf = 0; this.running = false; this.last = 0; this.skip = 0; this.visible = true; this.ready = false; this.destroyed = false; this.lost = false;
    this.homeData = null;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || window.matchMedia("(pointer: coarse)").matches;
    this.onLost = (e) => { e.preventDefault(); this.lost = true; this.stop(); this.onFail(); };
    this.frame = this.frame.bind(this);
    this.initGL();
    canvas.addEventListener("webglcontextlost", this.onLost, false);
  }
  initGL() {
    const gl = this.gl;
    const full = gl.getExtension("EXT_color_buffer_float");
    const half = full ? null : gl.getExtension("EXT_color_buffer_half_float");
    if (!full && !half) throw new Error("No float render targets");
    this.stateFormat = { internal: gl.RGBA16F, type: gl.HALF_FLOAT };
    this.pFlow = compile(gl, QUAD_VS, FLOW_FS);
    this.pSim = compile(gl, QUAD_VS, SIM_FS);
    this.pPart = compile(gl, PART_VS, PART_FS);
    this.pImg = compile(gl, QUAD_VS, IMAGE_FS);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    for (let i = 0; i < 2; i++) {
      const t = this.makeTex(gl.RGBA8, this.flowW, this.flowH, gl.RGBA, gl.UNSIGNED_BYTE, null, gl.LINEAR);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      this.flowTex.push(t); this.flowFb.push(fb);
    }
    this.clearFlow();
  }
  makeTex(internal, w, h, format, type, data, filter) {
    const gl = this.gl; const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  clearFlow() {
    const gl = this.gl;
    for (const fb of this.flowFb) { gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, this.flowW, this.flowH); gl.clearColor(128 / 255, 128 / 255, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.flowDirty = false;
  }
  clearState() {
    const gl = this.gl;
    for (const fb of this.stateFb) { gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, TEX_W, this.texH); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.stateDirty = false;
  }
  setImage(img) {
    if (this.destroyed || this.lost) return;
    const gl = this.gl;
    this.lastImage = img;
    this.aspect = img.naturalWidth / img.naturalHeight || 2.5;
    this.flowH = Math.max(32, Math.round(this.flowW / this.aspect));
    for (const t of this.flowTex) { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.flowW, this.flowH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); }
    this.clearFlow();
    if (this.imgTex) gl.deleteTexture(this.imgTex);
    this.imgTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.imgTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.buildParticles(img);
    this.ready = true;
    if (this.opts.intro && !this.opts.reducedMotion) this.startIntro();
    this.wake();
  }
  buildParticles(img) {
    const gl = this.gl;
    const baseGrid = this.lowPower ? 640 : 1000;
    const gw = Math.round(baseGrid * Math.sqrt(clamp(this.opts.density, 0.15, 2)));
    const gh = Math.max(1, Math.round(gw / this.aspect));
    this.gridW = gw;
    const c = document.createElement("canvas"); c.width = gw; c.height = gh;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, gw, gh);
    const data = ctx.getImageData(0, 0, gw, gh).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4 * 7) if (data[i] < 250) transparent++;
    this.alphaMode = transparent > data.length / (4 * 7) / 20;
    if (this.opts.imgBg) this.imgBg = this.opts.imgBg;
    else if (!this.alphaMode) {
      let r = 0, g = 0, b = 0, n = 0;
      const pw = Math.max(2, Math.round(gw * 0.012));
      for (const [cx, cy] of [[0, 0], [gw - pw, 0], [0, gh - pw], [gw - pw, gh - pw]]) {
        for (let y = cy; y < cy + pw; y++) for (let x = cx; x < cx + pw; x++) { const i = (y * gw + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
      }
      this.imgBg = [r / n / 255, g / n / 255, b / n / 255];
    }
    const home = [], col = [];
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const i = (y * gw + x) * 4;
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      if (this.alphaMode) { const a = data[i + 3] / 255; if (a < 0.12) continue; if (a < 0.5 && Math.random() > a * 2) continue; }
      else { const dev = Math.hypot(r - this.imgBg[0], g - this.imgBg[1], b - this.imgBg[2]); if (dev < 0.03) continue; if (dev < 0.07 && Math.random() > (dev - 0.03) / 0.04) continue; }
      const jx = (Math.random() - 0.5) * 0.6, jy = (Math.random() - 0.5) * 0.6;
      home.push((x + 0.5 + jx) / gw, (y + 0.5 + jy) / gh, Math.random(), 0.85 + Math.random() * 0.3);
      col.push(data[i], data[i + 1], data[i + 2], 255);
    }
    const n = home.length / 4;
    this.n = n; this.texH = Math.max(1, Math.ceil(n / TEX_W));
    const total = TEX_W * this.texH;
    const homeArr = new Float32Array(total * 4); homeArr.set(home);
    const colArr = new Uint8Array(total * 4); colArr.set(col);
    for (const t of [this.homeTex, this.colTex, ...this.stateTex]) if (t) gl.deleteTexture(t);
    for (const f of this.stateFb) gl.deleteFramebuffer(f);
    this.stateTex = []; this.stateFb = [];
    this.homeTex = this.makeTex(gl.RGBA32F, TEX_W, this.texH, gl.RGBA, gl.FLOAT, homeArr, gl.NEAREST);
    this.colTex = this.makeTex(gl.RGBA8, TEX_W, this.texH, gl.RGBA, gl.UNSIGNED_BYTE, colArr, gl.NEAREST);
    for (let i = 0; i < 2; i++) {
      const t = this.makeTex(this.stateFormat.internal, TEX_W, this.texH, gl.RGBA, this.stateFormat.type, null, gl.NEAREST);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Float FBO incomplete");
      this.stateTex.push(t); this.stateFb.push(fb);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.homeData = homeArr;
    this.clearState();
  }
  startIntro() {
    const gl = this.gl, home = this.homeData;
    if (!home) return;
    const w = this.rect.w > 10 ? this.rect.w : 1300;
    const total = TEX_W * this.texH;
    const st = new Float32Array(total * 4);
    for (let i = 0; i < this.n; i++) {
      const hx = home[i * 4] - 0.5, hy = home[i * 4 + 1] - 0.5, sd = home[i * 4 + 2];
      const ang = (Math.random() - 0.5) * 0.9 + (hx > 0 ? 0 : Math.PI);
      const dist = w * (0.04 + Math.random() * 0.14) * (0.5 + Math.abs(hx) * 1.4);
      st[i * 4] = Math.cos(ang) * dist + hx * w * 0.25 * sd;
      st[i * 4 + 1] = Math.sin(ang) * dist * 0.55 + hy * 120 * (Math.random() - 0.5);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.stateIdx]);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.stateFormat.internal, TEX_W, this.texH, 0, gl.RGBA, gl.FLOAT, st);
    this.introT = 0; this.stateDirty = true;
  }
  setOptions(o) {
    const rebuild = (o.density !== undefined && o.density !== this.opts.density) || (o.imgBg !== undefined && String(o.imgBg) !== String(this.opts.imgBg));
    this.opts = Object.assign({}, this.opts, o);
    if (rebuild && this.ready && this.lastImage) { try { this.buildParticles(this.lastImage); } catch (e) { this.onFail(); } }
    this.wake();
  }
  resize(cssW, cssH, rect) {
    this.cssW = Math.max(1, cssW); this.cssH = Math.max(1, cssH); this.rect = rect;
    let dpr = Math.min(window.devicePixelRatio || 1, this.lowPower ? 1.5 : 2);
    const px = this.cssW * this.cssH * dpr * dpr;
    if (px > 4.5e6) dpr = Math.max(1, Math.sqrt(4.5e6 / (this.cssW * this.cssH)));
    const w = Math.round(this.cssW * dpr), h = Math.round(this.cssH * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.draw();
  }
  setVisible(v) { this.visible = v; if (v) this.wake(); else this.stop(); }
  pointer(type, x, y, touch) {
    if (!this.opts.interactive || this.lost) return;
    const now = performance.now();
    if (type === "leave" || type === "up") { if (touch) this.touchRelease = now + 260; else this.presenceTarget = 0; this.wake(); return; }
    if (this.mouse.x < -9000 || type === "down") { this.mouse.x = this.prevMouse.x = x; this.mouse.y = this.prevMouse.y = y; }
    this.target.x = x; this.target.y = y; this.presenceTarget = 1; this.lastInput = now; this.settle = 0;
    if (type === "down") { this.burst = 1; this.touchRelease = 0; }
    this.wake();
  }
  wake() {
    if (!this.ready || this.running || !this.visible || this.destroyed || this.lost) { if (this.ready && !this.running) this.draw(); return; }
    this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  radiusPx() { return this.opts.radius * clamp(this.rect.w / 1400, 0.6, 1.25); }
  strength() { return this.opts.strength * (this.opts.reducedMotion ? 0.5 : 1); }
  frame(now) {
    if (!this.running) return;
    const rawMs = now - this.last;
    const dt = clamp(rawMs / 16.6667, 0.25, 3);
    this.last = now;
    const o = this.opts;
    const ambientOn = o.ambient && !o.reducedMotion;
    if (this.touchRelease && now > this.touchRelease) { this.presenceTarget = 0; this.touchRelease = 0; }
    const ease = 1 - Math.pow(1 - 0.22, dt);
    this.mouse.x += (this.target.x - this.mouse.x) * ease; this.mouse.y += (this.target.y - this.mouse.y) * ease;
    const vx = (this.mouse.x - this.prevMouse.x) / dt, vy = (this.mouse.y - this.prevMouse.y) / dt;
    this.prevMouse.x = this.mouse.x; this.prevMouse.y = this.mouse.y;
    this.mvel.x += (clamp(vx, -60, 60) - this.mvel.x) * 0.5; this.mvel.y += (clamp(vy, -60, 60) - this.mvel.y) * 0.5;
    const pk = this.presenceTarget > this.presence ? 0.1 : 0.035;
    this.presence += (this.presenceTarget - this.presence) * (1 - Math.pow(1 - pk, dt));
    if (this.presence < 0.001 && this.presenceTarget === 0) this.presence = 0;
    const fk = this.presenceTarget > this.flowing ? 0.05 : 0.018;
    this.flowing += (this.presenceTarget - this.flowing) * (1 - Math.pow(1 - fk, dt));
    if (this.flowing < 0.002 && this.presenceTarget === 0) this.flowing = 0;
    if (this.introT < 1) this.introT = Math.min(1, this.introT + Math.min(rawMs, 100) / 3200);
    const interacting = this.presence > 0.001 || this.burst > 0;
    this.settle = interacting ? 0 : this.settle + dt;
    const active = interacting || this.settle < SETTLE_FRAMES || this.introT < 1;
    if (!active) {
      if (this.flowDirty) this.clearFlow();
      if (this.stateDirty) this.clearState();
      if (!ambientOn) { this.draw(); this.firstFrame(); this.stop(); return; }
      this.raf = requestAnimationFrame(this.frame);
      if (this.skip++ % 2) return;
      this.time += (dt * 2 * o.speed) / 60;
      this.draw(); this.firstFrame(); return;
    }
    this.raf = requestAnimationFrame(this.frame);
    this.time += (dt * o.speed * (1 + this.flowing * 1.6)) / 60;
    this.stepFlow(dt); this.stepSim(dt);
    this.burst = Math.max(0, this.burst - 0.1 * dt);
    this.draw(); this.firstFrame();
  }
  firstFrame() {
    if (this.onFirstFrame) { const cb = this.onFirstFrame; this.onFirstFrame = null; requestAnimationFrame(() => cb()); }
  }
  stepFlow(dt) {
    const gl = this.gl, P = this.pFlow, dst = 1 - this.flowIdx, r = this.rect;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.flowFb[dst]); gl.viewport(0, 0, this.flowW, this.flowH);
    gl.disable(gl.BLEND); gl.useProgram(P.p); gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx]); gl.uniform1i(P.u.uPrev, 0);
    gl.uniform2f(P.u.uTexel, 1 / this.flowW, 1 / this.flowH);
    gl.uniform2f(P.u.uMouse, (this.mouse.x - r.x) / r.w, (this.mouse.y - r.y) / r.h);
    gl.uniform2f(P.u.uVel, clamp(this.mvel.x / 40, -1, 1), clamp(this.mvel.y / 40, -1, 1));
    gl.uniform2f(P.u.uSize, r.w, r.h);
    gl.uniform1f(P.u.uRadius, this.radiusPx());
    gl.uniform1f(P.u.uPresence, Math.max(this.presence, this.burst));
    gl.uniform1f(P.u.uDecay, Math.pow(0.968, dt));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.flowIdx = dst; this.flowDirty = true;
  }
  stepSim(dt) {
    if (!this.n) return;
    const gl = this.gl, P = this.pSim, o = this.opts, r = this.rect, dst = 1 - this.stateIdx;
    const intro = o.reducedMotion || !o.intro ? 0 : Math.pow(1 - this.introT, 2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.stateFb[dst]); gl.viewport(0, 0, TEX_W, this.texH);
    gl.disable(gl.BLEND); gl.useProgram(P.p); gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.stateIdx]); gl.uniform1i(P.u.uState, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.homeTex); gl.uniform1i(P.u.uHome, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx]); gl.uniform1i(P.u.uFlow, 2);
    gl.uniform2f(P.u.uSize, r.w, r.h);
    gl.uniform2f(P.u.uMouse, this.mouse.x - r.x, this.mouse.y - r.y);
    gl.uniform1f(P.u.uRadius, this.radiusPx());
    gl.uniform1f(P.u.uPresence, Math.max(this.presence, this.burst));
    gl.uniform1f(P.u.uStrength, this.strength() * (1 + this.burst * 1.5));
    gl.uniform1f(P.u.uSpread, clamp(o.spread, 0, 2));
    gl.uniform1f(P.u.uTurb, clamp(o.turbulence, 0, 2) * (o.reducedMotion ? 0.3 : 1));
    gl.uniform1f(P.u.uReturn, clamp(o.returnSpeed, 0, 2));
    gl.uniform1f(P.u.uTime, this.time);
    gl.uniform1f(P.u.uDt, dt);
    gl.uniform1f(P.u.uIntro, intro);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.stateIdx = dst; this.stateDirty = true;
  }
  draw() {
    if (!this.ready || this.lost || this.destroyed) return;
    const gl = this.gl, o = this.opts, r = this.rect, rm = o.reducedMotion;
    const introVis = rm || !o.intro ? 1 : Math.pow(this.introT, 2.2);
    const base = o.ambient && !rm ? clamp(o.ambientIntensity, 0, 2) : 0;
    const amb = base + this.flowing * 0.85 * clamp(o.liquid, 0, 2) * (rm ? 0.3 : 1);
    const rest = o.restStyle === "particles" ? 1 : 0;
    const [br, bg, bb] = o.bg; const [ir, ig, ib] = this.imgBg;
    const dpr = this.canvas.width / this.cssW;
    const pres = Math.max(this.presence, this.burst);
    const mx = this.mouse.x - r.x, my = this.mouse.y - r.y;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindVertexArray(this.vao); gl.disable(gl.BLEND);
    const I = this.pImg; gl.useProgram(I.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.imgTex); gl.uniform1i(I.u.uImg, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx]); gl.uniform1i(I.u.uFlow, 1);
    gl.uniform2f(I.u.uRes, this.cssW, this.cssH); gl.uniform1f(I.u.uDpr, dpr);
    gl.uniform4f(I.u.uRect, r.x, r.y, r.w, r.h);
    gl.uniform3f(I.u.uBg, br, bg, bb); gl.uniform3f(I.u.uImgBg, ir, ig, ib);
    gl.uniform2f(I.u.uMouse, mx, my); gl.uniform1f(I.u.uPresence, pres);
    gl.uniform1f(I.u.uRadius, this.radiusPx()); gl.uniform1f(I.u.uStrength, this.strength());
    gl.uniform1f(I.u.uTime, this.time); gl.uniform1f(I.u.uAmbient, amb);
    gl.uniform1f(I.u.uIntroVis, introVis); gl.uniform1f(I.u.uRest, rest);
    gl.uniform1f(I.u.uAlphaMode, this.alphaMode ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!this.n || (!this.stateDirty && rest === 0 && introVis >= 1)) return;
    const P = this.pPart; gl.useProgram(P.p);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.stateTex[this.stateIdx]); gl.uniform1i(P.u.uState, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.homeTex); gl.uniform1i(P.u.uHome, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.colTex); gl.uniform1i(P.u.uCol, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.flowTex[this.flowIdx]); gl.uniform1i(P.u.uFlow, 3);
    gl.uniform1i(P.u.uTexW, TEX_W);
    gl.uniform4f(P.u.uRect, r.x, r.y, r.w, r.h);
    gl.uniform2f(P.u.uRes, this.cssW, this.cssH);
    gl.uniform2f(P.u.uMouse, mx, my);
    gl.uniform1f(P.u.uRadius, this.radiusPx());
    gl.uniform1f(P.u.uPresence, pres);
    const spacing = r.w / this.gridW;
    gl.uniform1f(P.u.uDot, spacing * 1.45 * clamp(o.dotSize, 0.2, 3));
    gl.uniform1f(P.u.uTime, this.time); gl.uniform1f(P.u.uAmbient, amb);
    gl.uniform1f(P.u.uStreak, (o.streaks ? 1 : 0) * (0.45 + 0.55 * introVis));
    gl.uniform1f(P.u.uIntroVis, introVis); gl.uniform1f(P.u.uRest, rest); gl.uniform1f(P.u.uDpr, dpr);
    if (this.alphaMode) gl.uniform3f(P.u.uTint, 1, 1, 1);
    else gl.uniform3f(P.u.uTint, br / Math.max(ir, 0.001), bg / Math.max(ig, 0.001), bb / Math.max(ib, 0.001));
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
    gl.disable(gl.BLEND);
  }
}

/* ---------- Het Raakpunt als voorbeeldbeeld: zijden strengen die samenkomen in een robijnrode parel ---------- */
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
function makeSculpture(dark) {
  const W = 2000, H = 800, cx = W / 2, cy = H / 2;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"); const R = rng(dark ? 11 : 7);
  const pal = dark
    ? [[244, 238, 226], [226, 211, 182], [205, 186, 150], [168, 160, 150], [250, 247, 240]]
    : [[132, 116, 92], [168, 150, 120], [104, 98, 92], [196, 182, 156], [78, 72, 66]];
  g.lineCap = "round";
  for (const side of [-1, 1]) {
    const N = 1300;
    for (let i = 0; i < N; i++) {
      const phase = R() * Math.PI * 2, twist = 1.25 + R() * 0.35;
      const x0 = cx + side * (W * (0.36 + R() * 0.1));
      const amp = 70 + R() * 120, yoff = (R() - 0.5) * 60;
      const col = pal[Math.floor(R() * pal.length)];
      const steps = 70; g.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const env = Math.pow(1 - t, 0.85);
        const ang = phase + side * twist * t * Math.PI * 2;
        const x = x0 + (cx - x0) * t + side * Math.sin(ang * 0.5) * 14 * env;
        const y = cy + (Math.sin(ang) * amp + yoff) * env * (0.55 + 0.45 * Math.cos(t * Math.PI * 0.5));
        s ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      const shade = 0.75 + 0.25 * Math.cos(phase);
      g.strokeStyle = `rgba(${col.map(v => Math.round(Math.min(255, v * shade))).join(",")},${dark ? 0.32 : 0.36})`;
      g.lineWidth = 0.7 + R() * 1.3; g.stroke();
    }
    // stof en parels aan de buitenkant
    for (let i = 0; i < 2600; i++) {
      const t = Math.pow(R(), 0.7);
      const x = cx + side * W * (0.28 + t * 0.17 + (R() - 0.5) * 0.05);
      const y = cy + (R() - 0.5) * (110 + t * 260) * (0.6 + R() * 0.4);
      if (Math.abs(x - cx) > W * 0.47 && R() < 0.85) continue;
      const col = pal[Math.floor(R() * pal.length)];
      const r = R() < 0.03 ? 3 + R() * 6 : 0.8 + R() * 1.6;
      if (r > 3) {
        const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
        gr.addColorStop(0, dark ? "rgba(255,252,246,.95)" : "rgba(250,247,240,.95)");
        gr.addColorStop(1, `rgba(${col.join(",")},.9)`);
        g.fillStyle = gr;
      } else g.fillStyle = `rgba(${col.join(",")},${0.35 + R() * 0.5})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  }
  // de robijnrode parel
  const br = 22;
  const gr = g.createRadialGradient(cx - br * 0.35, cy - br * 0.4, br * 0.1, cx, cy, br);
  gr.addColorStop(0, "#F58AA4"); gr.addColorStop(0.35, "#D0284F"); gr.addColorStop(1, "#7C0F2B");
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, br, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,.75)"; g.beginPath(); g.ellipse(cx - 7, cy - 8, 6, 4, -0.6, 0, Math.PI * 2); g.fill();
  return c.toDataURL("image/png");
}



/* ---------- AdSweet: web components rond de motor ---------- */
const BG = { light: [234 / 255, 232 / 255, 227 / 255], dark: [17 / 255, 17 / 255, 16 / 255] };
const FILES = { light: "assets/adsweet-sculptuur-licht.jpg", dark: "assets/adsweet-sculptuur-nacht.jpg", "light-p": "assets/adsweet-sculptuur-gsm-licht.jpg", "dark-p": "assets/adsweet-sculptuur-gsm-nacht.jpg" };
const cache = {}, fileOk = {};
function procedural(dark, portrait) {
  const key = (dark ? "d" : "l") + (portrait ? "p" : "");
  if (cache[key]) return cache[key];
  const land = makeSculpture(dark);
  if (!portrait) return (cache[key] = Promise.resolve(land));
  return (cache[key] = new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas"); c.width = 800; c.height = 1000;
      const g = c.getContext("2d"); g.translate(400, 500); g.rotate(Math.PI / 2); g.drawImage(im, -1000, -400, 2000, 800);
      res(c.toDataURL("image/png"));
    };
    im.src = land;
  }));
}
function resolveSrc(dark, portrait) {
  const f = FILES[(dark ? "dark" : "light") + (portrait ? "-p" : "")];
  if (fileOk[f] === true) return Promise.resolve(f);
  if (fileOk[f] === false) return procedural(dark, portrait);
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => { fileOk[f] = true; res(f); };
    im.onerror = () => { fileOk[f] = false; procedural(dark, portrait).then(res); };
    im.src = f;
  });
}
const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
const mqCoarse = window.matchMedia("(hover: none), (pointer: coarse)");

class RaakpuntHero extends HTMLElement {
  static get observedAttributes() { return ["theme", "hinttext", "backdrop"]; }
  get theme() { return this.getAttribute("theme"); }
  set theme(v) { if (v != null) this.setAttribute("theme", v); }
  get hinttext() { return this.getAttribute("hinttext"); }
  set hinttext(v) { if (v != null) this.setAttribute("hinttext", v); }
  connectedCallback() {
    if (!this._built) this._build();
    this._io && this._io.observe(this);
    this._load();
  }
  disconnectedCallback() {
    if (this.engine) this.engine.stop();
    this._io && this._io.disconnect();
    this._ro && this._ro.disconnect();
    if (this._hero && this._handlers) for (const [k, f] of this._handlers) this._hero.removeEventListener(k, f);
    try { const ext = this.engine && this.engine.gl.getExtension("WEBGL_lose_context"); ext && ext.loseContext(); } catch (e) {}
    this.engine = null; this._built = false; this.innerHTML = "";
  }
  attributeChangedCallback(name) {
    if (!this._built) return;
    if (name === "theme") this._load();
    if (name === "hinttext") this.hintText.textContent = this.getAttribute("hinttext") || "";
    if (name === "backdrop") { this.backdrop.textContent = this.getAttribute("backdrop") || ""; this._layout(); }
  }
  _build() {
    this._built = true; this._tok = 0; this.aspect = 2.5; this.gl = "pending";
    Object.assign(this.style, { display: "block", position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none" });
    const mk = (tag, css) => { const e = document.createElement(tag); Object.assign(e.style, css); return e; };
    this.backdrop = mk("div", { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", whiteSpace: "nowrap", userSelect: "none", fontWeight: "600", letterSpacing: "-.06em", lineHeight: ".8", color: "color-mix(in srgb, var(--ink) 5%, transparent)" });
    this.backdrop.textContent = this.getAttribute("backdrop") || "";
    this.backdrop.setAttribute("aria-hidden", "true");
    this.fallback = mk("img", { position: "absolute", display: "block", maxWidth: "none", opacity: "0", transition: "opacity .5s ease" });
    this.fallback.alt = "";
    this.canvas = mk("canvas", { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block", opacity: "0", transition: "opacity .5s ease" });
    this.hint = mk("div", { position: "absolute", transform: "translate(-50%, 0)", display: "flex", alignItems: "center", gap: "10px", whiteSpace: "nowrap", fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-muted)", transition: "opacity .8s ease" });
    const dot = mk("span", { width: "6px", height: "6px", borderRadius: "50%", background: "var(--robijn)", animation: mqReduce.matches ? "none" : "as-hint 2.4s ease-in-out infinite" });
    this.hintText = mk("span", {}); this.hintText.textContent = this.getAttribute("hinttext") || "";
    this.hint.append(dot, this.hintText); this.hint.setAttribute("aria-hidden", "true");
    const sr = mk("span", { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" });
    sr.textContent = this.getAttribute("label") || "";
    this.append(this.backdrop, this.fallback, this.canvas, this.hint, sr);
    try { this.engine = new LiquidEngine(this.canvas, this._opts(), () => this._fail()); } catch (e) { this.engine = null; this._fail(); }
    this._hero = this.closest("[data-hero]") || this.parentElement;
    this._ro = new ResizeObserver(() => this._layout());
    this._ro.observe(this);
    const nav = this._hero.querySelector("[data-hero-nav]"), content = this._hero.querySelector("[data-hero-content]");
    nav && this._ro.observe(nav); content && this._ro.observe(content);
    this._io = new IntersectionObserver((es) => { for (const e of es) this.engine && this.engine.setVisible(e.isIntersecting && !document.hidden); });
    this._vis = () => this.engine && this.engine.setVisible(!document.hidden);
    document.addEventListener("visibilitychange", this._vis);
    mqReduce.addEventListener && mqReduce.addEventListener("change", () => this.engine && this.engine.setOptions({ reducedMotion: mqReduce.matches }));
    const pos = (e) => { const b = this.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    const touched = () => { this.hint.style.opacity = "0"; };
    this._handlers = [
      ["pointermove", (e) => { const t = e.pointerType === "touch"; if (t && e.buttons === 0 && e.pressure === 0) return; const [x, y] = pos(e); this.engine && this.engine.pointer("move", x, y, t); touched(); }],
      ["pointerdown", (e) => { const [x, y] = pos(e); this.engine && this.engine.pointer("down", x, y, e.pointerType === "touch"); touched(); }],
      ["pointerup", (e) => { const [x, y] = pos(e); this.engine && this.engine.pointer("up", x, y, e.pointerType === "touch"); }],
      ["pointercancel", (e) => { const [x, y] = pos(e); this.engine && this.engine.pointer("up", x, y, e.pointerType === "touch"); }],
      ["pointerleave", (e) => { const [x, y] = pos(e); this.engine && this.engine.pointer("leave", x, y, e.pointerType === "touch"); }],
    ];
    for (const [k, f] of this._handlers) this._hero.addEventListener(k, f, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this._layout());
  }
  _opts() {
    return { interactive: true, strength: 1, radius: 220, density: 1, dotSize: 1, spread: 1, turbulence: 1, liquid: 1, streaks: true,
      restStyle: "image", returnSpeed: 1, ambient: false, ambientIntensity: 1, speed: 1, intro: true, reducedMotion: mqReduce.matches,
      bg: BG[this.getAttribute("theme") === "dark" ? "dark" : "light"], imgBg: null };
  }
  _fail() { this.gl = "off"; this.canvas.style.opacity = "0"; this.fallback.style.opacity = "1"; }
  _rect(w, band) {
    const bandH = Math.max(80, band.bottom - band.top), a = this.aspect;
    let rw, maxH;
    if (w >= 1024) { rw = w * 1.02; maxH = bandH * 1.1; }
    else if (w >= 640) { rw = w * 1.3; maxH = bandH * 1.15; }
    else if (a < 1.3) { rw = w; maxH = bandH; }
    else { rw = w * 1.9; maxH = bandH * 1.2; }
    if (rw / a > maxH) rw = maxH * a;
    const rh = rw / a;
    return { x: w / 2 - rw / 2, y: (band.top + band.bottom) / 2 - rh / 2, w: rw, h: rh };
  }
  _layout() {
    if (!this._built) return;
    const hb = this.getBoundingClientRect(), w = hb.width, h = hb.height;
    if (w < 2 || h < 2) return;
    const nav = this._hero.querySelector("[data-hero-nav]"), content = this._hero.querySelector("[data-hero-content]");
    const top = nav ? nav.getBoundingClientRect().bottom - hb.top + 8 : 0;
    const bottom = content ? content.getBoundingClientRect().top - hb.top - 8 : h;
    const band = { top, bottom: Math.max(top + 80, bottom) };
    const portrait = w < 640;
    if (this._portrait !== undefined && portrait !== this._portrait) { this._portrait = portrait; this._load(); return; }
    const r = this._rect(w, band);
    const chars = Math.max(1, this.backdrop.textContent.length);
    this.backdrop.style.fontSize = Math.min((band.bottom - band.top) * 0.95, (w * 0.92) / (chars * 0.56)) + "px";
    this.backdrop.style.top = (band.top + band.bottom) / 2 + "px";
    Object.assign(this.fallback.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
    this.hint.style.display = portrait ? "none" : "flex";
    this.hint.style.left = clamp(r.x + r.w / 2, 80, w - 80) + "px";
    this.hint.style.top = Math.min(r.y + r.h * 0.95, band.bottom - 20) + "px";
    if (mqCoarse.matches && !this.getAttribute("hinttext-set")) {}
    this.engine && this.engine.resize(w, h, r);
  }
  _load() {
    if (!this._built) return;
    const dark = this.getAttribute("theme") === "dark";
    const portrait = this.getBoundingClientRect().width < 640;
    this._portrait = portrait;
    const my = ++this._tok, swapping = this.gl === "on";
    if (swapping) { this.canvas.style.transitionDuration = ".25s"; this.canvas.style.opacity = "0"; }
    resolveSrc(dark, portrait).then((src) => {
      if (my !== this._tok) return;
      const img = new Image(); img.decoding = "async";
      img.onload = () => setTimeout(() => {
        if (my !== this._tok || !this._built) return;
        this.fallback.src = src;
        this.aspect = img.naturalWidth / img.naturalHeight || 2.5;
        this._layout();
        if (this.engine && this.gl !== "off") {
          try {
            this.engine.setOptions({ bg: BG[dark ? "dark" : "light"], reducedMotion: mqReduce.matches });
            this.engine.onFirstFrame = () => { if (my !== this._tok) return; this.gl = "on"; this.canvas.style.transitionDuration = ".5s"; this.canvas.style.opacity = "1"; this.fallback.style.opacity = "0"; };
            this.engine.setImage(img); this._layout();
          } catch (e) { this._fail(); }
        } else this.fallback.style.opacity = "1";
      }, swapping ? 260 : 0);
      img.src = src;
    });
  }
}

class RaakpuntBeeld extends HTMLElement {
  static get observedAttributes() { return ["theme", "orient"]; }
  get theme() { return this.getAttribute("theme"); }
  set theme(v) { if (v != null) this.setAttribute("theme", v); }
  connectedCallback() {
    if (!this._img) {
      Object.assign(this.style, { display: "block", position: this.style.position || "relative", width: this.style.width || "100%", height: this.style.height || "100%" });
      this._img = document.createElement("img");
      Object.assign(this._img.style, { display: "block", width: "100%", height: "100%", objectFit: "contain", transition: "opacity .3s ease", WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)", maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)" });
      this._img.alt = this.getAttribute("alt") || "";
      this._img.setAttribute("aria-hidden", this.getAttribute("alt") ? "false" : "true");
      this.append(this._img);
    }
    this._load();
  }
  attributeChangedCallback() { if (this._img) this._load(); }
  _load() {
    const dark = this.getAttribute("theme") === "dark", portrait = this.getAttribute("orient") === "portrait";
    this._t = (this._t || 0) + 1; const my = this._t;
    resolveSrc(dark, portrait).then((src) => { if (this._t === my && this._img) this._img.src = src; });
  }
}
if (!customElements.get("raakpunt-hero")) customElements.define("raakpunt-hero", RaakpuntHero);
if (!customElements.get("raakpunt-beeld")) customElements.define("raakpunt-beeld", RaakpuntBeeld);

})();
