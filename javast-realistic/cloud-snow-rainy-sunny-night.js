/* ============================================================================
   clouds.js — standalone procedural cloud renderer
   ----------------------------------------------------------------------------
   Auto-boots a UI when loaded via <script src="clouds.js">.

   Or use programmatically:

     const sky = new Clouds.SunnyClouds(canvas);
     sky.start();

     const c = new Clouds.CloudLayer(canvas, Clouds.PRESETS.rainy);
     c.start();

   Exposed on window.Clouds (also module.exports if bundled).
   ============================================================================ */
(function (global) {
  "use strict";

  /* ==========================================================================
     SHADERS
     ========================================================================== */

  const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

  const FRAG = `
precision highp float;

#define PI 3.141592653589793
#define MAX_STEPS 96
#define LIGHT_STEPS 6

uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uCamRight, uCamUp, uCamForward;
uniform float uFocal;
uniform int   uSteps;

uniform vec3  uSunDir, uSunColor;
uniform float uSunIntensity;

uniform float uCenterY, uCloudBottom, uCloudTop, uCloudThick;

uniform float uCoverage, uSoftness, uDensity, uLightAbsorb;
uniform float uShapeScale, uShapeScaleY;
uniform float uDetailScale, uDetailScaleY, uDetailStrength;
uniform float uVertMode;
uniform vec2  uWindOffset, uDetailOffset;

uniform vec3  uAmbient;
uniform float uAmbientStrength;
uniform vec3  uBgColor;
uniform float uAerial;
uniform float uMaxDist;

uniform float uRainVeil;
uniform float uRainSlant;

/* ---------- hash / noise ---------- */
float hash13(vec3 p3){
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec3 x){
    vec3 i = floor(x), f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n000=hash13(i+vec3(0,0,0)), n100=hash13(i+vec3(1,0,0));
    float n010=hash13(i+vec3(0,1,0)), n110=hash13(i+vec3(1,1,0));
    float n001=hash13(i+vec3(0,0,1)), n101=hash13(i+vec3(1,0,1));
    float n011=hash13(i+vec3(0,1,1)), n111=hash13(i+vec3(1,1,1));
    return mix(
        mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y),
        mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
}
float fbm3(vec3 p){
    float s=0.0,a=0.5,n=0.0;
    for(int i=0;i<3;i++){ s+=a*vnoise(p); n+=a; p=p*2.03+vec3(11.3,5.7,17.1); a*=0.5; }
    return s/n;
}
float fbm4(vec3 p){
    float s=0.0,a=0.5,n=0.0;
    for(int i=0;i<4;i++){ s+=a*vnoise(p); n+=a; p=p*2.03+vec3(11.3,5.7,17.1); a*=0.5; }
    return s/n;
}

/* ---------- phase ---------- */
float hg(float c,float g){
    float g2=g*g;
    float d=max(1.0+g2-2.0*g*c,1e-4);
    return (1.0-g2)/(4.0*PI*d*sqrt(d));
}
float cloudPhase(float c){ return mix(hg(c,0.78), hg(c,-0.35), 0.28); }

/* ---------- vertical profile ---------- */
float vertProfile(float hf){
    float a,b;
    if (uVertMode < 0.5){
        a = smoothstep(0.0, 0.10, hf);
        b = 1.0 - smoothstep(0.45, 1.00, hf);
    } else if (uVertMode < 1.5){
        a = smoothstep(0.0, 0.28, hf);
        b = 1.0 - smoothstep(0.72, 1.00, hf);
    } else {
        a = smoothstep(0.0, 0.04, hf);
        b = 1.0 - smoothstep(0.85, 1.00, hf);
    }
    return a*b;
}

/* ---------- cloud density ---------- */
float cloudShape(vec3 pos, int lod){
    float r  = length(pos - vec3(0.0, -uCenterY, 0.0));
    float hf = (r - uCloudBottom) / uCloudThick;
    if (hf < 0.0 || hf > 1.0) return 0.0;
    float vert = vertProfile(hf);
    if (vert <= 0.0) return 0.0;

    vec3 wp = pos + vec3(uWindOffset.x, 0.0, uWindOffset.y);
    vec3 sp = vec3(wp.x*uShapeScale, wp.y*uShapeScaleY, wp.z*uShapeScale);

    float base = (lod==0) ? fbm4(sp) : fbm3(sp);
    float d = smoothstep(1.0 - uCoverage, 1.0 - uCoverage + uSoftness, base);
    if (d <= 0.0) return 0.0;

    if (lod==0 && uDetailStrength > 0.0){
        vec3 dp = vec3((wp.x+uDetailOffset.x)*uDetailScale,
                        wp.y*uDetailScaleY,
                       (wp.z+uDetailOffset.y)*uDetailScale);
        float det = fbm3(dp);
        d = clamp(d - det*uDetailStrength*(1.0-d), 0.0, 1.0);
    }
    return d*vert;
}

/* ---------- shell intersection ---------- */
float shellHit(vec3 rd, float Rs){
    float H = uCenterY;
    float b = -H * rd.y;
    float c = H*H - Rs*Rs;
    float disc = b*b - c;
    if (disc < 0.0) return -1.0;
    float s = sqrt(disc);
    float denom = b - s;
    if (abs(denom) < 1e-9) return -1.0;
    return c / denom;
}

/* ---------- light march ---------- */
float lightMarch(vec3 p){
    float ds = uCloudThick / float(LIGHT_STEPS) * 0.55;
    float od = 0.0;
    vec3 sp = p;
    for (int i=0;i<LIGHT_STEPS;i++){
        sp += uSunDir * ds;
        od += cloudShape(sp, 1);
        if (od > 6.0) break;
    }
    return od * ds;
}
vec3 multiScatterTrans(float od){
    float o = od * uLightAbsorb;
    vec3 t1 = vec3(exp(-o*1.00));
    vec3 t2 = vec3(exp(-o*0.45));
    vec3 t3 = vec3(exp(-o*0.16));
    return t1*0.55 + t2*0.30 + t3*0.15;
}

/* ---------- volumetric march ---------- */
vec4 marchClouds(vec3 rd){
    float tB = shellHit(rd, uCloudBottom);
    if (tB < 0.0) return vec4(0.0,0.0,0.0,1.0);
    float tT = shellHit(rd, uCloudTop);
    if (tT < 0.0) return vec4(0.0,0.0,0.0,1.0);
    tB = max(tB, 0.0);
    tT = min(tT, uMaxDist);
    if (tT <= tB) return vec4(0.0,0.0,0.0,1.0);

    float span = tT - tB;
    float jitter = hash13(vec3(gl_FragCoord.xy, fract(uTime)*137.0));

    float cosT = dot(rd, uSunDir);
    float ph   = cloudPhase(cosT);
    float powderMix = clamp(-cosT, 0.0, 1.0) * 0.55;

    vec3  L = vec3(0.0);
    float T = 1.0;
    float tPrev = tB;

    for (int i=0;i<MAX_STEPS;i++){
        if (i >= uSteps) break;
        if (T < 0.006) break;

        float u  = (float(i) + jitter) / float(uSteps);
        float tC = tB + span * u * u;
        float dt = tC - tPrev;
        if (dt <= 0.0) continue;
        tPrev = tC;

        vec3  p    = rd * tC;
        float d    = cloudShape(p, 0);
        float sigC = d * uDensity;
        float sigA = uAerial;
        float totalSigma = sigC + sigA;

        float stepT = exp(-totalSigma * dt);
        float integ = (1.0 - stepT) / max(totalSigma, 1e-6);

        vec3 source = vec3(0.0);
        if (sigC > 0.005){
            float od   = lightMarch(p) * uDensity;
            vec3  sunT = multiScatterTrans(od);
            float powder = 1.0 - exp(-d * 6.0);
            float pw     = mix(1.0, powder, powderMix);
            source += uSunColor * uSunIntensity * ph * sunT * pw * sigC;
            source += uAmbient * uAmbientStrength * (0.25 + 0.75*d) * sigC;
        }
        source += uBgColor * sigA;

        L += source * (T * integ);
        T *= stepT;
    }

    return vec4(L, T);
}

/* ---------- rain shafts (screen space) ---------- */
float rainStreaks(vec2 frag, float t, float slant){
    vec2 uv = frag / uResolution.y;
    uv.x += uv.y * slant;
    float s = 0.0;
    {
        vec2 p  = vec2(uv.x * 55.0, uv.y * 9.0 - t * 26.0);
        vec2 id = floor(p);
        vec2 fr = fract(p);
        float on = step(0.70, hash13(vec3(id, 1.0)));
        float x  = hash13(vec3(id, 3.0)) * 0.75 + 0.12;
        float d  = abs(fr.x - x);
        float a = smoothstep(0.05, 0.0, d) * on;
        a *= smoothstep(0.0, 0.15, fr.y) * smoothstep(1.0, 0.5, fr.y);
        s += a * 0.75;
    }
    {
        vec2 p  = vec2(uv.x * 30.0, uv.y * 6.0 - t * 15.0);
        vec2 id = floor(p);
        vec2 fr = fract(p);
        float on = step(0.62, hash13(vec3(id, 7.0)));
        float x  = hash13(vec3(id, 5.0)) * 0.85 + 0.07;
        float d  = abs(fr.x - x);
        float a = smoothstep(0.10, 0.0, d) * on;
        s += a * 0.35;
    }
    return s;
}

/* ---------- tonemap ---------- */
vec3 aces(vec3 x){
    const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*uResolution) / uResolution.y;
    vec3 rd = normalize(uCamForward*uFocal + uCamRight*uv.x + uCamUp*uv.y);

    vec4 cl = marchClouds(rd);
    vec3 col = uBgColor * cl.a + cl.rgb;

    if (uRainVeil > 0.001){
        float r = rainStreaks(gl_FragCoord.xy, uTime, uRainSlant);
        col = mix(col, col * 1.15 + vec3(0.05,0.06,0.08), r * uRainVeil * 0.55);
        col *= 1.0 - uRainVeil * 0.18;
    }

    col = aces(col);
    col = pow(col, vec3(1.0/2.2));
    gl_FragColor = vec4(col, 1.0);
}
`;

  /* ==========================================================================
     PRESETS
     ========================================================================== */

  const PRESETS = {
    sunny: {
      label: "Sunny",
      bg: [0.42, 0.60, 0.88],
      coverage: 0.42, softness: 0.24, density: 7.0, lightAbsorb: 1.0,
      cloudBottomKm: 1.35, cloudTopKm: 3.60, vertMode: 0,
      shapeScale: 0.34, shapeScaleY: 1.35,
      detailScale: 2.40, detailScaleY: 3.60, detailStrength: 0.38,
      wind: [6.5, 2.0], windMul: 1.35,
      sunElev: 48, sunAzim: 128,
      sunColor: [1.00, 0.965, 0.90], sunIntensity: 15.0,
      ambient: [0.42, 0.55, 0.78], ambientStrength: 0.55,
      aerial: 0.011,
      rainVeil: 0.0, rainSlant: 0.13,
    },
    snowy: {
      label: "Snowy",
      bg: [0.70, 0.75, 0.82],
      coverage: 0.86, softness: 0.30, density: 9.5, lightAbsorb: 1.0,
      cloudBottomKm: 0.80, cloudTopKm: 3.20, vertMode: 1,
      shapeScale: 0.26, shapeScaleY: 2.20,
      detailScale: 2.20, detailScaleY: 4.50, detailStrength: 0.42,
      wind: [11.0, -3.5], windMul: 1.30,
      sunElev: 17, sunAzim: 200,
      sunColor: [1.00, 0.96, 0.90], sunIntensity: 5.0,
      ambient: [0.72, 0.78, 0.88], ambientStrength: 1.40,
      aerial: 0.020,
      rainVeil: 0.0, rainSlant: 0.13,
    },
    /* Rainy = sunny, but bigger / darker / lower-hanging cumulus. */
    rainy: {
      label: "Rainy",
      bg: [0.30, 0.32, 0.36],
      coverage: 0.60, softness: 0.30, density: 10.5, lightAbsorb: 1.10,
      cloudBottomKm: 0.95, cloudTopKm: 3.40, vertMode: 0,
      shapeScale: 0.15, shapeScaleY: 0.95,
      detailScale: 1.55, detailScaleY: 2.30, detailStrength: 0.34,
      wind: [18.0, -6.0], windMul: 1.35,
      sunElev: 22, sunAzim: 95,
      sunColor: [0.80, 0.80, 0.84], sunIntensity: 3.2,
      ambient: [0.26, 0.28, 0.33], ambientStrength: 1.05,
      aerial: 0.022,
      rainVeil: 0.65, rainSlant: 0.20,
    },
    night: {
      label: "Night",
      bg: [0.020, 0.035, 0.075],
      coverage: 0.34, softness: 0.28, density: 6.0, lightAbsorb: 1.0,
      cloudBottomKm: 1.60, cloudTopKm: 4.00, vertMode: 1,
      shapeScale: 0.28, shapeScaleY: 1.10,
      detailScale: 2.00, detailScaleY: 3.00, detailStrength: 0.30,
      wind: [2.2, 0.8], windMul: 1.25,
      sunElev: 38, sunAzim: 250,
      sunColor: [0.60, 0.70, 1.00], sunIntensity: 1.6,
      ambient: [0.10, 0.15, 0.30], ambientStrength: 0.95,
      aerial: 0.008,
      rainVeil: 0.0, rainSlant: 0.13,
    },
  };

  const PLANET_R = 6371.0;

  /* ==========================================================================
     BASE CLASS
     ========================================================================== */

  class CloudLayer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} preset  one of PRESETS.*
     * @param {object} [options] { quality, fov, camAltitudeKm, maxDist, steps }
     */
    constructor(canvas, preset, options = {}) {
      if (!canvas) throw new Error("CloudLayer: canvas is required");

      this.canvas = canvas;
      this._basePreset = Object.assign({}, preset);
      this.preset = Object.assign({}, preset);
      this.opts = Object.assign({
        quality: 0.65,
        fov: 58,
        camAltitudeKm: 0.05,
        maxDist: 60,
        steps: 96,
      }, options);

      const gl = canvas.getContext("webgl", {
        alpha: false, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      }) || canvas.getContext("experimental-webgl");

      if (!gl) throw new Error("WebGL not supported on this device.");
      this.gl = gl;

      this.program = this._buildProgram(VERT, FRAG);
      gl.useProgram(this.program);

      this.vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(this.program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      this.u = {};
      const n = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(this.program, i);
        const name = info.name.replace(/\[0\]$/, "");
        this.u[name] = gl.getUniformLocation(this.program, name);
      }

      /* state */
      this.time = 0;
      this.windOffset = [0, 0];
      this.detailOffset = [0, 0];
      this.yaw = 0;
      this.pitch = 0.20;
      this.zoom = 1.4;
      this.timeScale = 1.0;
      this.paused = false;

      this.fps = 0;
      this._fpsAcc = 0;
      this._fpsN = 0;

      this._raf = null;
      this._last = 0;
      this._running = false;

      this._onResize = this._resize.bind(this);
      if (typeof window !== "undefined") {
        window.addEventListener("resize", this._onResize);
      }
      this._resize();
      this._bindPointer();
    }

    /* ---------------------------------------------------------------- */
    _buildProgram(vsSrc, fsSrc) {
      const gl = this.gl;
      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          const log = gl.getShaderInfoLog(sh);
          console.error(log, src);
          throw new Error("Shader compile error: " + log);
        }
        return sh;
      };
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vsSrc));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw new Error("Program link error: " + gl.getProgramInfoLog(p));
      }
      return p;
    }

    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const q = this.opts.quality;
      const cw = this.canvas.clientWidth || 1;
      const ch = this.canvas.clientHeight || 1;
      const w = Math.max(1, Math.floor(cw * dpr * q));
      const h = Math.max(1, Math.floor(ch * dpr * q));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
        this.gl.viewport(0, 0, w, h);
      }
    }

    _bindPointer() {
      const c = this.canvas;
      let drag = false, lx = 0, ly = 0;
      const down = (e) => {
        drag = true; c.classList.add("clouds-dragging");
        lx = e.clientX; ly = e.clientY;
        c.setPointerCapture?.(e.pointerId);
      };
      const move = (e) => {
        if (!drag) return;
        const dx = e.clientX - lx, dy = e.clientY - ly;
        lx = e.clientX; ly = e.clientY;
        this.yaw   -= dx * 0.0032;
        this.pitch += dy * 0.0032;
        this.pitch = Math.max(-0.55, Math.min(1.30, this.pitch));
      };
      const up = (e) => {
        drag = false; c.classList.remove("clouds-dragging");
        c.releasePointerCapture?.(e.pointerId);
      };
      c.addEventListener("pointerdown", down);
      c.addEventListener("pointermove", move);
      c.addEventListener("pointerup", up);
      c.addEventListener("pointercancel", up);
      this._unbindPointer = () => {
        c.removeEventListener("pointerdown", down);
        c.removeEventListener("pointermove", move);
        c.removeEventListener("pointerup", up);
        c.removeEventListener("pointercancel", up);
      };
    }

    _set(loc, v) {
      if (loc == null) return;
      const gl = this.gl;
      if (typeof v === "number") { gl.uniform1f(loc, v); return; }
      if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
      else if (v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    }

    /* ----------------------------------------------------------------
       Public API
       ---------------------------------------------------------------- */
    setZoom(z) { this.zoom = Math.max(0.3, Math.min(4, z)); return this; }
    setTimeScale(s) { this.timeScale = s; return this; }
    setPaused(p) { this.paused = !!p; return this; }
    setPitch(p) { this.pitch = p; return this; }
    setYaw(y) { this.yaw = y; return this; }

    setPreset(preset) {
      this._basePreset = Object.assign({}, preset);
      this.preset = Object.assign({}, preset);
      return this;
    }

    resetPreset() {
      this.preset = Object.assign({}, this._basePreset);
      return this;
    }

    setParams(obj) {
      Object.assign(this.preset, obj);
      return this;
    }

    /** Advance one frame. dt in seconds. */
    tick(dt) {
      const gl = this.gl, p = this.preset, u = this.u;
      dt = Math.min(dt, 0.1);

      if (!this.paused) {
        this.time += dt;
        const wx = p.wind[0] / 1000;
        const wz = p.wind[1] / 1000;
        const ts = this.timeScale;
        this.windOffset[0] += wx * dt * ts;
        this.windOffset[1] += wz * dt * ts;
        this.detailOffset[0] += wx * dt * ts * (p.windMul - 1);
        this.detailOffset[1] += wz * dt * ts * (p.windMul - 1);
      }

      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const fwd = [cp * sy, sp, cp * cy];

      let rx = -fwd[2], ry = 0, rz = fwd[0];
      let rl = Math.hypot(rx, ry, rz) || 1;
      rx /= rl; ry /= rl; rz /= rl;
      const ux = ry * fwd[2] - rz * fwd[1];
      const uy = rz * fwd[0] - rx * fwd[2];
      const uz = rx * fwd[1] - ry * fwd[0];

      const e = p.sunElev * Math.PI / 180;
      const a = p.sunAzim * Math.PI / 180;
      const sun = [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];

      const centerY = PLANET_R + this.opts.camAltitudeKm;
      const cBot = PLANET_R + p.cloudBottomKm;
      const cTop = PLANET_R + p.cloudTopKm;
      const focal = (1.0 / Math.tan((this.opts.fov * Math.PI / 180) * 0.5)) * this.zoom;

      gl.useProgram(this.program);

      this._set(u.uResolution, [this.canvas.width, this.canvas.height]);
      this._set(u.uTime, this.time);
      this._set(u.uCamRight, [rx, ry, rz]);
      this._set(u.uCamUp, [ux, uy, uz]);
      this._set(u.uCamForward, fwd);
      this._set(u.uFocal, focal);
      if (u.uSteps) gl.uniform1i(u.uSteps, this.opts.steps | 0);

      this._set(u.uSunDir, sun);
      this._set(u.uSunColor, p.sunColor);
      this._set(u.uSunIntensity, p.sunIntensity);

      this._set(u.uCenterY, centerY);
      this._set(u.uCloudBottom, cBot);
      this._set(u.uCloudTop, cTop);
      this._set(u.uCloudThick, cTop - cBot);

      this._set(u.uCoverage, p.coverage);
      this._set(u.uSoftness, p.softness);
      this._set(u.uDensity, p.density);
      this._set(u.uLightAbsorb, p.lightAbsorb);
      this._set(u.uShapeScale, p.shapeScale);
      this._set(u.uShapeScaleY, p.shapeScaleY);
      this._set(u.uDetailScale, p.detailScale);
      this._set(u.uDetailScaleY, p.detailScaleY);
      this._set(u.uDetailStrength, p.detailStrength);
      this._set(u.uVertMode, p.vertMode);
      this._set(u.uWindOffset, this.windOffset);
      this._set(u.uDetailOffset, this.detailOffset);

      this._set(u.uAmbient, p.ambient);
      this._set(u.uAmbientStrength, p.ambientStrength);
      this._set(u.uBgColor, p.bg);
      this._set(u.uAerial, p.aerial);
      this._set(u.uMaxDist, this.opts.maxDist);

      this._set(u.uRainVeil, p.rainVeil);
      this._set(u.uRainSlant, p.rainSlant);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /** Start own render loop. */
    start() {
      if (this._running) return this;
      this._running = true;
      this._last = performance.now();

      const loop = (now) => {
        if (!this._running) return;
        const dt = (now - this._last) / 1000;
        this._last = now;

        this.tick(dt);

        this._fpsAcc += dt;
        this._fpsN++;
        if (this._fpsAcc >= 0.5) {
          this.fps = this._fpsN / this._fpsAcc;
          this._fpsAcc = 0; this._fpsN = 0;
          if (this.onStats) this.onStats(this.fps);
        }
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
      return this;
    }

    stop() {
      this._running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
      return this;
    }

    destroy() {
      this.stop();
      this._unbindPointer?.();
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", this._onResize);
      }
      const gl = this.gl;
      gl.deleteBuffer(this.vbo);
      gl.deleteProgram(this.program);
    }
  }

  /* ==========================================================================
     CONCRETE WEATHER CLASSES
     ========================================================================== */

  class SunnyClouds extends CloudLayer {
    constructor(canvas, options) { super(canvas, PRESETS.sunny, options); }
  }
  class SnowyClouds extends CloudLayer {
    constructor(canvas, options) { super(canvas, PRESETS.snowy, options); }
  }
  class RainyClouds extends CloudLayer {
    constructor(canvas, options) { super(canvas, PRESETS.rainy, options); }
  }
  class NightClouds extends CloudLayer {
    constructor(canvas, options) { super(canvas, PRESETS.night, options); }
  }

  /* ==========================================================================
     SCENE — multi-canvas UI with toggle checkboxes
     ========================================================================== */

  const WEATHER_DEFS = [
    { key: "sunny", Label: SunnyClouds },
    { key: "snowy", Label: SnowyClouds },
    { key: "rainy", Label: RainyClouds },
    { key: "night", Label: NightClouds },
  ];

  class CloudScene {
    constructor(options = {}) {
      this.opts = Object.assign({
        quality: 0.55,
        steps: 72,
        zoom: 1.4,
        timeScale: 1.0,
        preload: "sunny",    // which checkbox starts ticked
      }, options);

      this.layers = {};
      this.paused = false;
      this._raf = null;
      this._last = 0;
    }

    /* -------------------------------------------------------------- */
    static _injectCSS() {
      if (typeof document === "undefined") return;
      if (document.getElementById("clouds-style")) return;
      const s = document.createElement("style");
      s.id = "clouds-style";
      s.textContent = `
#clouds-scene, #clouds-scene * { box-sizing: border-box; margin: 0; padding: 0; }
#clouds-scene {
  position: fixed; inset: 0; display: flex; flex-direction: column;
  background: #0a0d12; color: #dbe6f5; overflow: hidden; z-index: 9999;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.clouds-header {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  padding: 12px 16px; background: rgba(10,14,22,.75);
  border-bottom: 1px solid rgba(255,255,255,.08);
  backdrop-filter: blur(12px);
}
.clouds-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.clouds-label {
  font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
  color: #8ea3c0; font-weight: 700;
}
.clouds-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px; cursor: pointer;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.12);
  font-size: 12px; font-weight: 600; user-select: none; transition: .15s;
}
.clouds-toggle:hover { background: rgba(255,255,255,.12); }
.clouds-toggle input { accent-color: #4d8dff; cursor: pointer; }
.clouds-toggle:has(input:checked) {
  background: linear-gradient(180deg,#4d8dff,#2f6be0);
  border-color: #6aa3ff; color: #fff;
  box-shadow: 0 0 16px rgba(77,141,255,.5);
}
.clouds-btn {
  padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;
  font-weight: 600; color: #dbe6f5; background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.14); transition: .15s;
}
.clouds-btn:hover { background: rgba(255,255,255,.15); }
.clouds-btn.paused {
  background: linear-gradient(180deg,#ffb14d,#e08c2f);
  border-color: #ffc76a; color: #1a1200;
  box-shadow: 0 0 16px rgba(255,177,77,.5);
}
.clouds-slider { width: 100px; accent-color: #4d8dff; }
.clouds-stats {
  font-size: 10px; color: #7b8ca6; font-variant-numeric: tabular-nums;
  margin-left: auto;
}
.clouds-grid {
  flex: 1; display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 6px; padding: 6px; min-height: 0; overflow: auto;
}
.clouds-tile {
  position: relative; background: #000; border-radius: 8px;
  overflow: hidden; min-height: 240px;
}
.clouds-tile canvas {
  display: block; width: 100%; height: 100%; cursor: grab;
  touch-action: none;
}
.clouds-tile canvas.clouds-dragging { cursor: grabbing; }
.clouds-hint {
  position: absolute; inset: 0; display: grid; place-items: center;
  color: #4a5a70; font-size: 13px; text-align: center; pointer-events: none;
  padding: 20px;
}
.clouds-empty {
  grid-column: 1 / -1; display: grid; place-items: center;
  color: #4a5a70; font-size: 14px; padding: 40px; text-align: center;
}
`;
      document.head.appendChild(s);
    }

    /* -------------------------------------------------------------- */
    mount(parent) {
      if (typeof document === "undefined") {
        throw new Error("CloudScene.mount requires a DOM environment.");
      }
      CloudScene._injectCSS();

      const target = parent || document.body;
      this.root = document.createElement("div");
      this.root.id = "clouds-scene";

      /* ---------- header ---------- */
      const header = document.createElement("div");
      header.className = "clouds-header";

      const toggleRow = document.createElement("div");
      toggleRow.className = "clouds-row";

      const showLabel = document.createElement("span");
      showLabel.className = "clouds-label";
      showLabel.textContent = "Show:";
      toggleRow.appendChild(showLabel);

      /* ---------- grid ---------- */
      const grid = document.createElement("div");
      grid.className = "clouds-grid";
      this.grid = grid;

      /* ---------- empty hint ---------- */
      const empty = document.createElement("div");
      empty.className = "clouds-empty";
      empty.textContent = "Tick a weather preset above to view it.";
      grid.appendChild(empty);
      this._empty = empty;

      /* ---------- build one toggle + tile per preset ---------- */
      WEATHER_DEFS.forEach(({ key, Label }) => {
        const preset = PRESETS[key];

        // toggle
        const wrap = document.createElement("label");
        wrap.className = "clouds-toggle";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        const txt = document.createElement("span");
        txt.textContent = preset.label;
        wrap.appendChild(cb);
        wrap.appendChild(txt);
        toggleRow.appendChild(wrap);

        // tile
        const tile = document.createElement("div");
        tile.className = "clouds-tile";
        tile.style.display = "none";
        const canvas = document.createElement("canvas");
        const hint = document.createElement("div");
        hint.className = "clouds-hint";
        hint.textContent = "Initializing…";
        tile.appendChild(canvas);
        tile.appendChild(hint);
        grid.appendChild(tile);

        this.layers[key] = {
          key, Class: Label, preset,
          cb, tile, canvas, hint,
          renderer: null,
          visible: false,
        };

        cb.addEventListener("change", () => {
          this._setVisible(key, cb.checked);
        });
      });

      /* ---------- zoom slider ---------- */
      const zoomLbl = document.createElement("span");
      zoomLbl.className = "clouds-label";
      zoomLbl.textContent = "Zoom";
      const zoomInp = document.createElement("input");
      zoomInp.type = "range";
      zoomInp.min = "0.5"; zoomInp.max = "3";
      zoomInp.step = "0.05"; zoomInp.value = String(this.opts.zoom);
      zoomInp.className = "clouds-slider";
      zoomInp.addEventListener("input", () => {
        const v = parseFloat(zoomInp.value);
        this.opts.zoom = v;
        Object.values(this.layers).forEach(l => {
          if (l.renderer) l.renderer.setZoom(v);
        });
      });

      /* ---------- speed slider ---------- */
      const speedLbl = document.createElement("span");
      speedLbl.className = "clouds-label";
      speedLbl.textContent = "Speed";
      const speedInp = document.createElement("input");
      speedInp.type = "range";
      speedInp.min = "0"; speedInp.max = "6";
      speedInp.step = "0.1"; speedInp.value = String(this.opts.timeScale);
      speedInp.className = "clouds-slider";
      speedInp.addEventListener("input", () => {
        const v = parseFloat(speedInp.value);
        this.opts.timeScale = v;
        Object.values(this.layers).forEach(l => {
          if (l.renderer) l.renderer.setTimeScale(v);
        });
      });

      /* ---------- pause ---------- */
      const pauseBtn = document.createElement("button");
      pauseBtn.className = "clouds-btn";
      pauseBtn.textContent = "⏸ Pause motion";
      pauseBtn.addEventListener("click", () => {
        this.paused = !this.paused;
        pauseBtn.classList.toggle("paused", this.paused);
        pauseBtn.textContent = this.paused
          ? "▶ Resume motion" : "⏸ Pause motion";
        Object.values(this.layers).forEach(l => {
          if (l.renderer) l.renderer.setPaused(this.paused);
        });
      });

      /* ---------- stats ---------- */
      const stats = document.createElement("span");
      stats.className = "clouds-stats";
      stats.textContent = "—";
      this._statsEl = stats;

      const controls = document.createElement("div");
      controls.className = "clouds-row";
      controls.appendChild(zoomLbl);
      controls.appendChild(zoomInp);
      controls.appendChild(speedLbl);
      controls.appendChild(speedInp);
      controls.appendChild(pauseBtn);
      controls.appendChild(stats);

      header.appendChild(toggleRow);
      header.appendChild(controls);
      this.root.appendChild(header);
      this.root.appendChild(grid);
      target.appendChild(this.root);

      /* preload */
      if (this.opts.preload && this.layers[this.opts.preload]) {
        const l = this.layers[this.opts.preload];
        l.cb.checked = true;
        this._setVisible(this.opts.preload, true);
      }

      this._startLoop();
      return this;
    }

    /* -------------------------------------------------------------- */
    _setVisible(key, on) {
      const l = this.layers[key];
      if (!l) return;

      l.visible = on;
      l.tile.style.display = on ? "block" : "none";

      if (on) {
        this._ensureLayer(key);
      }
      this._refreshEmpty();
    }

    _ensureLayer(key) {
      const l = this.layers[key];
      if (l.renderer) {
        l.hint.style.display = "none";
        return;
      }
      try {
        l.renderer = new l.Class(l.canvas, {
          quality: this.opts.quality,
          steps: this.opts.steps,
        });
        l.renderer.setZoom(this.opts.zoom);
        l.renderer.setTimeScale(this.opts.timeScale);
        l.renderer.setPaused(this.paused);
        // force a resize once layout has settled
        requestAnimationFrame(() => {
          l.renderer._resize();
          l.hint.style.display = "none";
        });
      } catch (err) {
        console.error("Clouds: failed to init", key, err);
        l.hint.textContent = "WebGL failed: " + err.message;
      }
    }

    _refreshEmpty() {
      const any = Object.values(this.layers).some(l => l.visible);
      this._empty.style.display = any ? "none" : "grid";
    }

    /* -------------------------------------------------------------- */
    _startLoop() {
      if (this._raf) return;
      this._last = performance.now();
      let fpsAcc = 0, fpsN = 0;

      const loop = (now) => {
        const dt = Math.min((now - this._last) / 1000, 0.1);
        this._last = now;

        let drawn = 0;
        for (const k in this.layers) {
          const l = this.layers[k];
          if (l.renderer && l.visible) {
            l.renderer.tick(dt);
            drawn++;
          }
        }

        fpsAcc += dt; fpsN++;
        if (fpsAcc >= 0.5) {
          const fps = fpsN / fpsAcc;
          fpsAcc = 0; fpsN = 0;
          if (this._statsEl) {
            this._statsEl.textContent =
              `${fps.toFixed(0)} fps · ${drawn} layer${drawn === 1 ? "" : "s"}`;
          }
        }
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    /* -------------------------------------------------------------- */
    setPresetVisible(key, on) {
      const l = this.layers[key];
      if (!l) return this;
      l.cb.checked = !!on;
      this._setVisible(key, !!on);
      return this;
    }

    destroy() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
      Object.values(this.layers).forEach(l => {
        if (l.renderer) l.renderer.destroy();
      });
      if (this.root && this.root.parentNode) {
        this.root.parentNode.removeChild(this.root);
      }
    }
  }

  /* ==========================================================================
     EXPORTS + AUTO-BOOT
     ========================================================================== */

  const API = {
    CloudLayer,
    SunnyClouds,
    SnowyClouds,
    RainyClouds,
    NightClouds,
    CloudScene,
    PRESETS,

    /** Convenience: mount a scene into `parent` (default document.body). */
    mount(parent, options) {
      const scene = new CloudScene(options || {});
      scene.mount(parent || (typeof document !== "undefined" ? document.body : null));
      return scene;
    },
  };

  global.Clouds = API;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }

  /* ----------------------- auto-boot ----------------------- */
  function autoboot() {
    if (global.CLOUDS_AUTOBOOT === false) return;
    if (typeof document === "undefined") return;
    if (document.getElementById("clouds-scene")) return;
    try {
      global.__cloudsScene = new CloudScene().mount(document.body);
    } catch (e) {
      console.error("Clouds autoboot failed:", e);
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoboot);
    } else {
      autoboot();
    }
  }

})(typeof window !== "undefined" ? window : globalThis);