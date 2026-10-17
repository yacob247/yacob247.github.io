/* ============================================================================
   dawn2day.js — standalone dawn → sunrise → sunny transition
   ----------------------------------------------------------------------------
   <script src="dawn2day.js"></script>          // auto-boots full UI
   <script>window.DAWN_AUTOBOOT = false;</script> // opt out, use API only

   API:
     const dawn = new DawnToDay(canvas);
     dawn.setTime(0.35);        // scrub 0..1
     dawn.setPlaying(false);
     dawn.start();
   ============================================================================ */
(function (global) {
  "use strict";

  /* ======================================================================
     SHADERS
     ====================================================================== */

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
uniform float uSunAngSize;
uniform vec3  uSunDiscColor;
uniform float uSunDiscIntensity;

uniform vec3  uZenithColor;
uniform vec3  uHorizonColor;
uniform vec3  uSunGlowColor;
uniform float uSunGlowStrength;

uniform float uCenterY, uPlanetR;
uniform float uCloudBottom, uCloudTop, uCloudThick;

uniform float uCoverage, uSoftness, uDensity, uLightAbsorb;
uniform float uShapeScale, uShapeScaleY;
uniform float uDetailScale, uDetailScaleY, uDetailStrength;
uniform float uVertMode;
uniform vec2  uWindOffset, uDetailOffset;

uniform vec3  uAmbient;
uniform float uAmbientStrength;
uniform vec3  uAerialColor;
uniform float uAerial;
uniform float uMaxDist;

uniform float uExposure;

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

/* ---------- planet occlusion for the sun ray ----------
   Returns true if the planet blocks the sun from point p.
   Critical at dawn — makes low-angle light only hit high clouds. */
bool sunOccluded(vec3 p){
    vec3 C  = vec3(0.0, -uCenterY, 0.0);
    vec3 op = p - C;
    float b = dot(op, uSunDir);
    float c = dot(op, op) - uPlanetR * uPlanetR;
    float disc = b*b - c;
    if (disc < 0.0) return false;
    float t = -b - sqrt(disc);
    return t > 0.0;
}

/* ---------- light march ---------- */
float lightMarch(vec3 p, out bool occluded){
    occluded = sunOccluded(p);
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
            bool occl;
            float od   = lightMarch(p, occl) * uDensity;
            vec3  sunT = multiScatterTrans(od);
            float pw   = 1.0;
            if (occl){
                sunT *= 0.0;
                // even in planet shadow the cloud picks up a little sky light
            }
            float powder = 1.0 - exp(-d * 6.0);
            pw = mix(1.0, powder, powderMix);
            source += uSunColor * uSunIntensity * ph * sunT * pw * sigC;
            source += uAmbient * uAmbientStrength * (0.25 + 0.75*d) * sigC;
        }
        source += uAerialColor * sigA;

        L += source * (T * integ);
        T *= stepT;
    }

    return vec4(L, T);
}

/* ---------- sky (gradient + sun glow + sun disc) ---------- */
vec3 skyBackground(vec3 rd){
    float hy = clamp(rd.y, 0.0, 1.0);
    vec3 sky = mix(uHorizonColor, uZenithColor, pow(hy, 0.55));

    float cosA = dot(rd, uSunDir);
    float glow = pow(max(cosA, 0.0), 14.0);
    sky += uSunGlowColor * glow * uSunGlowStrength;

    // far horizon floor color (when looking below y=0)
    if (rd.y < 0.0){
        float dn = clamp(-rd.y, 0.0, 1.0);
        sky = mix(uHorizonColor * 0.75, uHorizonColor * 0.35,
                  smoothstep(0.0, 0.35, dn));
        sky += uSunGlowColor * pow(max(cosA, 0.0), 18.0) * uSunGlowStrength * 0.4;
    }
    return sky;
}

/* ---------- tonemap ---------- */
vec3 aces(vec3 x){
    const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}

void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5*uResolution) / uResolution.y;
    vec3 rd = normalize(uCamForward*uFocal + uCamRight*uv.x + uCamUp*uv.y);

    /* sky */
    vec3 sky = skyBackground(rd);

    /* sun disc (only shows when above horizon) */
    float ang = acos(clamp(dot(rd, uSunDir), -1.0, 1.0));
    float disc = 1.0 - smoothstep(uSunAngSize*0.85, uSunAngSize*1.15, ang);
    float above = smoothstep(-0.02, 0.02, uSunDir.y);
    sky += uSunDiscColor * disc * uSunDiscIntensity * above;

    /* clouds composite over sky */
    vec4 cl = marchClouds(rd);
    vec3 col = sky * cl.a + cl.rgb;

    col *= uExposure;
    col = aces(col);
    col = pow(col, vec3(1.0/2.2));
    gl_FragColor = vec4(col, 1.0);
}
`;

  /* ======================================================================
     KEYFRAMES — dawn to day
     Each keyframe is a full parameter set. Interpolation is smoothstep'd.
     ====================================================================== */

  const KEYFRAMES = [
    /* 0.00 — Pre-dawn. Sun just below horizon, faint warm glow in the east. */
    {
      t: 0.00,
      sunElev: -8, sunAzim: 90,
      zenith:        [0.020, 0.040, 0.110],
      horizon:       [0.140, 0.075, 0.075],
      sunGlowColor:  [1.00, 0.35, 0.15], sunGlowStrength: 1.6,
      sunColor:      [1.00, 0.55, 0.30], sunIntensity: 0.55,
      sunDiscColor:  [1.00, 0.55, 0.35], sunDiscIntensity: 1.0,
      sunAngSize: 0.0043,
      ambient: [0.10, 0.12, 0.22], ambientStrength: 0.55,
      aerialColor: [0.10, 0.08, 0.10], aerial: 0.015,
      exposure: 1.35,
      wind: [5.0, 1.5], windMul: 1.35,
    },
    /* 0.14 — First light. Deep orange wedge near horizon. */
    {
      t: 0.14,
      sunElev: -3, sunAzim: 90,
      zenith:        [0.045, 0.075, 0.180],
      horizon:       [0.520, 0.200, 0.090],
      sunGlowColor:  [1.00, 0.42, 0.18], sunGlowStrength: 1.9,
      sunColor:      [1.00, 0.62, 0.35], sunIntensity: 1.1,
      sunDiscColor:  [1.00, 0.58, 0.35], sunDiscIntensity: 1.4,
      sunAngSize: 0.0043,
      ambient: [0.20, 0.16, 0.22], ambientStrength: 0.65,
      aerialColor: [0.30, 0.14, 0.10], aerial: 0.018,
      exposure: 1.30,
      wind: [5.5, 1.8], windMul: 1.35,
    },
    /* 0.32 — Sunrise. Sun crosses horizon. Red disc, magenta clouds. */
    {
      t: 0.32,
      sunElev: 1, sunAzim: 90,
      zenith:        [0.090, 0.140, 0.310],
      horizon:       [0.850, 0.420, 0.180],
      sunGlowColor:  [1.00, 0.60, 0.30], sunGlowStrength: 2.1,
      sunColor:      [1.00, 0.72, 0.50], sunIntensity: 3.5,
      sunDiscColor:  [1.00, 0.55, 0.30], sunDiscIntensity: 2.4,
      sunAngSize: 0.0043,
      ambient: [0.35, 0.24, 0.28], ambientStrength: 0.80,
      aerialColor: [0.55, 0.28, 0.16], aerial: 0.022,
      exposure: 1.20,
      wind: [6.0, 2.0], windMul: 1.35,
    },
    /* 0.52 — Golden hour. Warm yellows, long low light. */
    {
      t: 0.52,
      sunElev: 12, sunAzim: 100,
      zenith:        [0.150, 0.240, 0.460],
      horizon:       [0.900, 0.650, 0.380],
      sunGlowColor:  [1.00, 0.75, 0.45], sunGlowStrength: 1.5,
      sunColor:      [1.00, 0.88, 0.68], sunIntensity: 7.5,
      sunDiscColor:  [1.00, 0.85, 0.60], sunDiscIntensity: 3.0,
      sunAngSize: 0.0043,
      ambient: [0.45, 0.38, 0.42], ambientStrength: 0.90,
      aerialColor: [0.75, 0.60, 0.42], aerial: 0.018,
      exposure: 1.08,
      wind: [6.2, 2.0], windMul: 1.35,
    },
    /* 0.75 — Morning. Warm white sun, blue overhead starting to win. */
    {
      t: 0.75,
      sunElev: 28, sunAzim: 115,
      zenith:        [0.180, 0.360, 0.760],
      horizon:       [0.720, 0.780, 0.900],
      sunGlowColor:  [1.00, 0.92, 0.75], sunGlowStrength: 0.9,
      sunColor:      [1.00, 0.95, 0.85], sunIntensity: 12.0,
      sunDiscColor:  [1.00, 0.96, 0.85], sunDiscIntensity: 4.2,
      sunAngSize: 0.0043,
      ambient: [0.42, 0.50, 0.72], ambientStrength: 0.62,
      aerialColor: [0.62, 0.72, 0.88], aerial: 0.013,
      exposure: 1.02,
      wind: [6.5, 2.0], windMul: 1.35,
    },
    /* 1.00 — Full sunny day. Bright blue sky, white clouds. */
    {
      t: 1.00,
      sunElev: 50, sunAzim: 128,
      zenith:        [0.200, 0.420, 0.850],
      horizon:       [0.600, 0.740, 0.920],
      sunGlowColor:  [1.00, 0.96, 0.88], sunGlowStrength: 0.55,
      sunColor:      [1.00, 0.965, 0.90], sunIntensity: 15.0,
      sunDiscColor:  [1.00, 0.98, 0.92], sunDiscIntensity: 4.8,
      sunAngSize: 0.0043,
      ambient: [0.42, 0.55, 0.78], ambientStrength: 0.55,
      aerialColor: [0.42, 0.60, 0.88], aerial: 0.011,
      exposure: 1.00,
      wind: [6.5, 2.0], windMul: 1.35,
    },
  ];

  /* cloud shape stays constant — we're only changing lighting & sky */
  const CLOUD_SHAPE = {
    coverage: 0.42, softness: 0.24, density: 7.0, lightAbsorb: 1.0,
    cloudBottomKm: 1.35, cloudTopKm: 3.60, vertMode: 0,
    shapeScale: 0.34, shapeScaleY: 1.35,
    detailScale: 2.40, detailScaleY: 3.60, detailStrength: 0.38,
  };

  const PLANET_R = 6371.0;

  /* ======================================================================
     TIMELINE EVALUATOR
     ====================================================================== */

  const lerp = (a, b, t) => a + (b - a) * t;
  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const smooth = (t) => t * t * (3 - 2 * t);

  function sampleTimeline(t) {
    t = Math.max(0, Math.min(1, t));
    let i = 0;
    for (; i < KEYFRAMES.length - 1; i++) {
      if (t <= KEYFRAMES[i + 1].t) break;
    }
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[Math.min(i + 1, KEYFRAMES.length - 1)];

    if (a === b) return Object.assign({}, a);

    const span = Math.max(b.t - a.t, 1e-6);
    const u = smooth((t - a.t) / span);

    return {
      sunElev:  lerp(a.sunElev,  b.sunElev,  u),
      sunAzim:  lerp(a.sunAzim,  b.sunAzim,  u),
      zenith:        lerp3(a.zenith,        b.zenith,        u),
      horizon:       lerp3(a.horizon,       b.horizon,       u),
      sunGlowColor:  lerp3(a.sunGlowColor,  b.sunGlowColor,  u),
      sunGlowStrength: lerp(a.sunGlowStrength, b.sunGlowStrength, u),
      sunColor:      lerp3(a.sunColor,      b.sunColor,      u),
      sunIntensity:  lerp(a.sunIntensity,   b.sunIntensity,  u),
      sunDiscColor:  lerp3(a.sunDiscColor,  b.sunDiscColor,  u),
      sunDiscIntensity: lerp(a.sunDiscIntensity, b.sunDiscIntensity, u),
      sunAngSize:    lerp(a.sunAngSize,     b.sunAngSize,    u),
      ambient:       lerp3(a.ambient,       b.ambient,       u),
      ambientStrength: lerp(a.ambientStrength, b.ambientStrength, u),
      aerialColor:   lerp3(a.aerialColor,   b.aerialColor,   u),
      aerial:        lerp(a.aerial,         b.aerial,        u),
      exposure:      lerp(a.exposure,       b.exposure,      u),
      wind:          [lerp(a.wind[0], b.wind[0], u), lerp(a.wind[1], b.wind[1], u)],
      windMul:       lerp(a.windMul,        b.windMul,       u),
    };
  }

  /* ======================================================================
     RENDERER
     ====================================================================== */

  class DawnToDay {
    constructor(canvas, options = {}) {
      if (!canvas) throw new Error("DawnToDay: canvas is required");
      this.canvas = canvas;
      this.opts = Object.assign({
        quality: 0.65,
        fov: 58,
        camAltitudeKm: 0.05,
        maxDist: 60,
        steps: 96,
        loopSeconds: 45,
      }, options);

      const gl = canvas.getContext("webgl", {
        alpha: false, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      }) || canvas.getContext("experimental-webgl");
      if (!gl) throw new Error("WebGL not supported");
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
      this.time = 0;             // seconds, for shader dithering
      this.timelineT = 0.0;      // 0..1 scrub
      this.timeScale = 1.0;
      this.playing = true;
      this.yaw = 0.15;
      this.pitch = 0.10;
      this.zoom = 1.4;

      this.windOffset = [0, 0];
      this.detailOffset = [0, 0];

      this.fps = 0;
      this._fpsAcc = 0; this._fpsN = 0;

      this._raf = null; this._last = 0; this._running = false;

      this._onResize = this._resize.bind(this);
      if (typeof window !== "undefined") window.addEventListener("resize", this._onResize);
      this._resize();
      this._bindPointer();
    }

    _buildProgram(vs, fs) {
      const gl = this.gl;
      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          const log = gl.getShaderInfoLog(sh);
          console.error(log, src);
          throw new Error("Shader compile error: " + log);
        }
        return sh;
      };
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw new Error("Program link error: " + gl.getProgramInfoLog(p));
      return p;
    }

    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const q = this.opts.quality;
      const w = Math.max(1, Math.floor((this.canvas.clientWidth || 1) * dpr * q));
      const h = Math.max(1, Math.floor((this.canvas.clientHeight || 1) * dpr * q));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w; this.canvas.height = h;
        this.gl.viewport(0, 0, w, h);
      }
    }

    _bindPointer() {
      const c = this.canvas;
      let drag = false, lx = 0, ly = 0;
      const down = (e) => {
        drag = true; c.classList.add("dawn-dragging");
        lx = e.clientX; ly = e.clientY;
        c.setPointerCapture?.(e.pointerId);
      };
      const move = (e) => {
        if (!drag) return;
        const dx = e.clientX - lx, dy = e.clientY - ly;
        lx = e.clientX; ly = e.clientY;
        this.yaw   -= dx * 0.0032;
        this.pitch += dy * 0.0032;
        this.pitch = Math.max(-0.60, Math.min(1.35, this.pitch));
      };
      const up = (e) => {
        drag = false; c.classList.remove("dawn-dragging");
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

    /* ------------------------- public API ------------------------- */
    setTime(t) { this.timelineT = Math.max(0, Math.min(1, t)); return this; }
    setPlaying(p) { this.playing = !!p; return this; }
    setTimeScale(s) { this.timeScale = s; return this; }
    setZoom(z) { this.zoom = Math.max(0.3, Math.min(4, z)); return this; }
    setPitch(p) { this.pitch = p; return this; }
    setYaw(y) { this.yaw = y; return this; }

    /* ------------------------- shader setter ------------------------- */
    _set(loc, v) {
      if (loc == null) return;
      const gl = this.gl;
      if (typeof v === "number") { gl.uniform1f(loc, v); return; }
      if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
      else if (v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    }

    /* ------------------------- frame ------------------------- */
    tick(dt) {
      const gl = this.gl, u = this.u;
      dt = Math.min(dt, 0.1);
      this.time += dt;

      if (this.playing) {
        this.timelineT += (dt / this.opts.loopSeconds) * this.timeScale;
        // hold at the end briefly then loop back
        if (this.timelineT > 1.05) this.timelineT -= 1.10;
        if (this.timelineT < 0) this.timelineT += 1.10;
      }

      const p = sampleTimeline(this.timelineT);

      // wind advection in the noise field
      const wx = p.wind[0] / 1000, wz = p.wind[1] / 1000;
      const ts = this.timeScale;
      this.windOffset[0] += wx * dt * ts;
      this.windOffset[1] += wz * dt * ts;
      this.detailOffset[0] += wx * dt * ts * (p.windMul - 1);
      this.detailOffset[1] += wz * dt * ts * (p.windMul - 1);

      // camera basis
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const fwd = [cp * sy, sp, cp * cy];
      let rx = -fwd[2], ry = 0, rz = fwd[0];
      let rl = Math.hypot(rx, ry, rz) || 1;
      rx /= rl; ry /= rl; rz /= rl;
      const ux = ry * fwd[2] - rz * fwd[1];
      const uy = rz * fwd[0] - rx * fwd[2];
      const uz = rx * fwd[1] - ry * fwd[0];

      // sun direction from elevation + azimuth
      const e = p.sunElev * Math.PI / 180;
      const a = p.sunAzim * Math.PI / 180;
      const sun = [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];

      const centerY = PLANET_R + this.opts.camAltitudeKm;
      const cBot = PLANET_R + CLOUD_SHAPE.cloudBottomKm;
      const cTop = PLANET_R + CLOUD_SHAPE.cloudTopKm;
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
      this._set(u.uSunAngSize, p.sunAngSize);
      this._set(u.uSunDiscColor, p.sunDiscColor);
      this._set(u.uSunDiscIntensity, p.sunDiscIntensity);

      this._set(u.uZenithColor,  p.zenith);
      this._set(u.uHorizonColor, p.horizon);
      this._set(u.uSunGlowColor, p.sunGlowColor);
      this._set(u.uSunGlowStrength, p.sunGlowStrength);

      this._set(u.uCenterY, centerY);
      this._set(u.uPlanetR, PLANET_R);
      this._set(u.uCloudBottom, cBot);
      this._set(u.uCloudTop, cTop);
      this._set(u.uCloudThick, cTop - cBot);

      this._set(u.uCoverage, CLOUD_SHAPE.coverage);
      this._set(u.uSoftness, CLOUD_SHAPE.softness);
      this._set(u.uDensity, CLOUD_SHAPE.density);
      this._set(u.uLightAbsorb, CLOUD_SHAPE.lightAbsorb);
      this._set(u.uShapeScale, CLOUD_SHAPE.shapeScale);
      this._set(u.uShapeScaleY, CLOUD_SHAPE.shapeScaleY);
      this._set(u.uDetailScale, CLOUD_SHAPE.detailScale);
      this._set(u.uDetailScaleY, CLOUD_SHAPE.detailScaleY);
      this._set(u.uDetailStrength, CLOUD_SHAPE.detailStrength);
      this._set(u.uVertMode, CLOUD_SHAPE.vertMode);
      this._set(u.uWindOffset, this.windOffset);
      this._set(u.uDetailOffset, this.detailOffset);

      this._set(u.uAmbient, p.ambient);
      this._set(u.uAmbientStrength, p.ambientStrength);
      this._set(u.uAerialColor, p.aerialColor);
      this._set(u.uAerial, p.aerial);
      this._set(u.uMaxDist, this.opts.maxDist);
      this._set(u.uExposure, p.exposure);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    start() {
      if (this._running) return this;
      this._running = true;
      this._last = performance.now();
      const loop = (now) => {
        if (!this._running) return;
        const dt = (now - this._last) / 1000;
        this._last = now;
        this.tick(dt);

        this._fpsAcc += dt; this._fpsN++;
        if (this._fpsAcc >= 0.5) {
          this.fps = this._fpsN / this._fpsAcc;
          this._fpsAcc = 0; this._fpsN = 0;
          if (this.onStats) this.onStats(this.fps);
          if (this.onTime) this.onTime(this.timelineT);
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
      if (typeof window !== "undefined") window.removeEventListener("resize", this._onResize);
      const gl = this.gl;
      gl.deleteBuffer(this.vbo);
      gl.deleteProgram(this.program);
    }
  }

  /* ======================================================================
     EXPORT + AUTO-BOOT UI
     ====================================================================== */

  const API = { DawnToDay, KEYFRAMES, sampleTimeline };

  global.DawnToDay = DawnToDay;
  global.DawnToDayAPI = API;

  if (typeof module !== "undefined" && module.exports) module.exports = API;

  /* ---------------------- AUTO-BOOT ---------------------- */

  function autoboot() {
    if (global.DAWN_AUTOBOOT === false) return;
    if (typeof document === "undefined") return;
    if (document.getElementById("dawn-root")) return;

    /* ---------- CSS ---------- */
    const css = document.createElement("style");
    css.textContent = `
#dawn-root, #dawn-root * { box-sizing: border-box; margin:0; padding:0; }
#dawn-root { position:fixed; inset:0; background:#05070b; overflow:hidden;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
#dawn-root canvas { display:block; width:100vw; height:100vh; cursor:grab;
  touch-action:none; }
#dawn-root canvas.dawn-dragging { cursor:grabbing; }
#dawn-ui { position:fixed; left:16px; bottom:16px; z-index:10;
  padding:14px 16px; border-radius:14px; display:flex; flex-direction:column;
  gap:10px; min-width:340px; color:#dbe6f5;
  background:rgba(10,14,22,.62); backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.12);
  box-shadow:0 10px 40px rgba(0,0,0,.5); user-select:none; }
#dawn-ui .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
#dawn-ui .lbl { font-size:10px; letter-spacing:.08em; text-transform:uppercase;
  color:#8ea3c0; font-weight:700; }
#dawn-ui input[type=range] { accent-color:#ffb14d; }
#dawn-ui .scrub { width:100%; height:22px; }
#dawn-ui .btn { padding:7px 12px; border-radius:8px; cursor:pointer;
  font-size:12px; font-weight:600; color:#dbe6f5;
  background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.14);
  transition:.15s; white-space:nowrap; }
#dawn-ui .btn:hover { background:rgba(255,255,255,.15); }
#dawn-ui .btn.playing {
  background:linear-gradient(180deg,#4d8dff,#2f6be0);
  border-color:#6aa3ff; color:#fff;
  box-shadow:0 0 16px rgba(77,141,255,.55); }
#dawn-ui .phase { font-size:11px; color:#ffcf8f; font-weight:700;
  letter-spacing:.05em; }
#dawn-ui .stats { font-size:10px; color:#7b8ca6;
  font-variant-numeric:tabular-nums; margin-left:auto; }
#dawn-ui .zslider { width:90px; }
#dawn-hint { position:fixed; top:16px; left:50%; transform:translateX(-50%);
  z-index:10; padding:7px 14px; border-radius:20px; font-size:11px;
  color:#a5b6cc; background:rgba(10,14,22,.55);
  border:1px solid rgba(255,255,255,.10); backdrop-filter:blur(10px);
  pointer-events:none; letter-spacing:.03em; }
`;
    document.head.appendChild(css);

    /* ---------- DOM ---------- */
    const root = document.createElement("div");
    root.id = "dawn-root";
    const canvas = document.createElement("canvas");
    root.appendChild(canvas);
    document.body.appendChild(root);

    const ui = document.createElement("div");
    ui.id = "dawn-ui";
    ui.innerHTML = `
      <div class="row">
        <button class="btn playing" id="dawn-play">⏸ Pause</button>
        <span class="phase" id="dawn-phase">Pre-dawn</span>
        <span class="stats" id="dawn-stats">—</span>
      </div>
      <div class="row">
        <span class="lbl">Time</span>
        <input class="scrub" id="dawn-scrub" type="range" min="0" max="1" step="0.001" value="0">
      </div>
      <div class="row">
        <span class="lbl">Speed</span>
        <input class="zslider" id="dawn-speed" type="range" min="0" max="4" step="0.05" value="1">
        <span class="lbl">Zoom</span>
        <input class="zslider" id="dawn-zoom" type="range" min="0.5" max="3" step="0.05" value="1.4">
      </div>
    `;
    document.body.appendChild(ui);

    const hint = document.createElement("div");
    hint.id = "dawn-hint";
    hint.textContent = "Drag to look around · Scrub the Time slider";
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 8000);

    /* ---------- boot renderer ---------- */
    let r;
    try { r = new DawnToDay(canvas); }
    catch (e) {
      document.body.innerHTML =
        "<pre style='color:#f88;padding:24px;font-family:monospace'>" + e.message + "</pre>";
      return;
    }

    /* ---------- wire UI ---------- */
    const playBtn = document.getElementById("dawn-play");
    const scrub   = document.getElementById("dawn-scrub");
    const speed   = document.getElementById("dawn-speed");
    const zoom    = document.getElementById("dawn-zoom");
    const stats   = document.getElementById("dawn-stats");
    const phaseEl = document.getElementById("dawn-phase");

    playBtn.onclick = () => {
      r.setPlaying(!r.playing);
      playBtn.classList.toggle("playing", r.playing);
      playBtn.textContent = r.playing ? "⏸ Pause" : "▶ Play";
    };
    scrub.oninput  = () => { r.setTime(parseFloat(scrub.value)); };
    speed.oninput  = () => { r.setTimeScale(parseFloat(speed.value)); };
    zoom.oninput   = () => { r.setZoom(parseFloat(zoom.value)); };

    r.onStats = (fps) => { stats.textContent = fps.toFixed(0) + " fps"; };
    r.onTime  = (t) => {
      if (r.playing) scrub.value = String(t);
      phaseEl.textContent = phaseLabel(t);
    };

    r.start();

    function phaseLabel(t) {
      if (t < 0.10) return "Pre-dawn";
      if (t < 0.25) return "First light";
      if (t < 0.42) return "Sunrise";
      if (t < 0.62) return "Golden hour";
      if (t < 0.85) return "Morning";
      return "Full day";
    }

    global.__dawn = r;
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoboot);
    } else {
      autoboot();
    }
  }

})(typeof window !== "undefined" ? window : globalThis);