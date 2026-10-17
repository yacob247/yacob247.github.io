/*!
 * rain.js — Standalone WebGL2 thunderstorm
 *
 * Drop-in usage. Just add to any HTML page:
 *
 *   <script src="rain.js"></script>
 *
 * It will inject a fullscreen canvas, its own control panel,
 * a click-to-start hint, and begin rendering the storm.
 * Everything (HTML, CSS, WebGL, audio) lives inside this file.
 *
 * Library usage (optional):
 *
 *   window.StormRain.create(canvasEl, options)  -> storm instance
 *   window.StormRain.instance                   -> the auto-booted instance
 *
 * MIT License.
 */
(function () {
  'use strict';

  if (window.__rainJsLoaded) return;
  window.__rainJsLoaded = true;

  const VERSION = '1.0.0';

  /* ============================================================
     MATRICES
     ============================================================ */
  const M4 = () => new Float32Array(16);

  function m4perspective(o, fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2);
    o[0] = t / asp; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = t; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = (f + n) / (n - f); o[11] = -1;
    o[12] = 0; o[13] = 0; o[14] = 2 * f * n / (n - f); o[15] = 0;
    return o;
  }

  function m4lookAt(o, ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    let zx = ex - cx, zy = ey - cy, zz = ez - cz;
    let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
    l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * ex + xy * ey + xz * ez);
    o[13] = -(yx * ex + yy * ey + yz * ez);
    o[14] = -(zx * ex + zy * ey + zz * ez);
    o[15] = 1;
    return o;
  }

  function m4mul(o, a, b) {
    for (let i = 0; i < 4; i++) {
      const a0 = a[i], a1 = a[i + 4], a2 = a[i + 8], a3 = a[i + 12];
      o[i]      = a0 * b[0]  + a1 * b[1]  + a2 * b[2]  + a3 * b[3];
      o[i + 4]  = a0 * b[4]  + a1 * b[5]  + a2 * b[6]  + a3 * b[7];
      o[i + 8]  = a0 * b[8]  + a1 * b[9]  + a2 * b[10] + a3 * b[11];
      o[i + 12] = a0 * b[12] + a1 * b[13] + a2 * b[14] + a3 * b[15];
    }
    return o;
  }

  function m4invert(o, m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
    const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
    const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
    const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) { o.set(m); return o; }
    det = 1 / det;
    o[0]  = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    o[1]  = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    o[2]  = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    o[3]  = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4]  = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    o[5]  = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    o[6]  = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    o[7]  = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8]  = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    o[9]  = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  }

  /* ============================================================
     SHADER HELPERS
     ============================================================ */
  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('StormRain shader compile error: ' + log + '\n' + src);
    }
    return s;
  }

  function link(gl, vs, fs) {
    const p = gl.createProgram();
    const v = compile(gl, gl.VERTEX_SHADER, vs);
    const f = compile(gl, gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error('StormRain program link error: ' + log);
    }
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace('[0]', '');
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  }

  /* ============================================================
     SHARED GLSL
     ============================================================ */
  const GLSL_COMMON = `
  float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),
               mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);
  }
  float fbm2(vec2 p){
    return 0.55*vnoise(p)+0.30*vnoise(p*2.07+vec2(5.2,1.3))+0.15*vnoise(p*4.13+vec2(1.7,9.1));
  }
  float fbm3(vec2 p){
    return 0.5*vnoise(p)+0.25*vnoise(p*2.11+vec2(3.1,7.7))
         + 0.15*vnoise(p*4.23+vec2(8.3,1.9))+0.10*vnoise(p*8.37+vec2(2.7,4.4));
  }
  float luminance(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
`;

  const GLSL_SKY_FN = `
  vec3 skySample(vec3 dir, vec3 sunDir, vec3 sunColor, float t, float cloudAmt) {
    float y = dir.y;
    vec3 zenith  = vec3(0.14, 0.17, 0.22);
    vec3 mid     = vec3(0.30, 0.34, 0.40);
    vec3 horizon = vec3(0.58, 0.60, 0.64);
    vec3 sky = mix(horizon, mid, smoothstep(0.0, 0.35, y));
    sky      = mix(sky, zenith, smoothstep(0.25, 0.85, y));
    float hband = smoothstep(0.30, -0.02, y) * smoothstep(-0.20, -0.02, y);
    sky = mix(sky, vec3(0.42, 0.44, 0.48), hband * 0.5);
    float sd = max(dot(dir, sunDir), 0.0);
    sky += sunColor * pow(sd, 6.0) * 0.18;
    sky += sunColor * pow(sd, 60.0) * 0.35;

    if (y > 0.005 && cloudAmt > 0.001) {
      vec2 uv = dir.xz / (y + 0.14) * 0.65;
      vec2 drift = vec2(t * 0.0060, -t * 0.0035);
      float n1 = fbm3(uv * 0.55 + drift);
      float n2 = fbm3(uv * 1.45 - drift * 1.4 + vec2(3.1, 7.7));
      float n3 = fbm3(uv * 3.60 + drift * 2.2);
      vec2 uvV = dir.xz / (y + 0.05) * 1.5;
      float billow = fbm2(uvV * 0.9 + drift * 0.7);
      float coverage = n1 * 0.55 + n2 * 0.28 + n3 * 0.17;
      coverage = max(coverage, billow * 0.85);
      coverage = smoothstep(0.34, 0.72, coverage);
      float thickness = smoothstep(0.05, 0.55, y) * coverage;
      float edgeGlow = pow(max(dot(dir, sunDir), 0.0), 3.0) * (1.0 - coverage);
      float base = 1.0 - thickness * 0.75;
      vec3 cloudDark  = vec3(0.16, 0.18, 0.22);
      vec3 cloudMidC  = vec3(0.42, 0.44, 0.48);
      vec3 cloudLitC  = vec3(0.86, 0.86, 0.85);
      vec3 cloud = mix(cloudDark, cloudLitC, clamp(base * 0.55 + edgeGlow * 1.4, 0.0, 1.0));
      cloud = mix(cloud, cloudMidC, 0.35);
      cloud += sunColor * edgeGlow * 0.55;
      sky = mix(sky, cloud, coverage * cloudAmt);
    }
    return sky;
  }
`;

  /* ============================================================
     SKY PASS
     ============================================================ */
  const skyVS = `#version 300 es
  layout(location=0) in vec2 aPos;
  out vec2 vNdc;
  void main(){ vNdc = aPos; gl_Position = vec4(aPos, 0.999999, 1.0); }`;

  const skyFS = `#version 300 es
  precision highp float;
  in vec2 vNdc;
  out vec4 outColor;
  uniform mat4 uInvVP;
  uniform vec3 uCamPos, uSunDir, uSunColor;
  uniform float uTime, uRainIntensity, uCloudAmt, uSkyOn;
  ${GLSL_COMMON}
  ${GLSL_SKY_FN}
  void main(){
    if (uSkyOn < 0.5) {
      outColor = vec4(0.20, 0.23, 0.28, 1.0);
      return;
    }

    vec4 nh = uInvVP * vec4(vNdc, -1.0, 1.0);
    vec4 fh = uInvVP * vec4(vNdc,  1.0, 1.0);
    vec3 dir = normalize(fh.xyz/fh.w - nh.xyz/nh.w);
    vec3 col = skySample(dir, uSunDir, uSunColor, uTime, uCloudAmt);

    float horizon = smoothstep(0.25, -0.05, dir.y) * smoothstep(-0.15, 0.0, dir.y);
    vec3 curtain = vec3(0.42, 0.44, 0.48);
    float depthInRain = smoothstep(0.30, -0.05, dir.y);
    col = mix(col, curtain, horizon * uRainIntensity * 0.55);
    col = mix(col, curtain * 0.85, depthInRain * uRainIntensity * 0.20);
    outColor = vec4(col, 1.0);
  }`;

  /* ============================================================
     GROUND
     ============================================================ */
  const groundVS = `#version 300 es
  layout(location=0) in vec3 aPos;
  uniform mat4 uVP;
  uniform vec2 uGridOffset;
  out vec3 vWorldPos, vNormal;
  void main(){
    vec2 wp = aPos.xz + uGridOffset;
    vec3 p = vec3(wp.x, 0.0, wp.y);
    vWorldPos = p; vNormal = vec3(0.0, 1.0, 0.0);
    gl_Position = uVP * vec4(p, 1.0);
  }`;

  const groundFS = `#version 300 es
  precision highp float;
  in vec3 vWorldPos, vNormal;
  out vec4 outColor;
  uniform float uTime, uRainIntensity, uCloudAmt;
  uniform vec3 uCamPos, uSunDir, uSunColor;
  ${GLSL_COMMON}
  ${GLSL_SKY_FN}

  void main(){
    vec3 N = vec3(0.0, 1.0, 0.0);
    vec3 V = normalize(uCamPos - vWorldPos);
    vec2 p = vWorldPos.xz;

    float puddle = fbm2(p * 0.045 + vec2(11.7, 3.4));
    puddle = smoothstep(0.40, 0.65, puddle);

    float puddleEdge = fbm2(p * 0.22 + vec2(2.1, 8.9));
    puddle *= mix(0.7, 1.0, puddleEdge);

    float grain1 = vnoise(p * 6.5);
    float grain2 = vnoise(p * 18.0);
    float grain = grain1 * 0.6 + grain2 * 0.4;

    vec3 dryCol = vec3(0.14, 0.135, 0.13) + grain * 0.035;
    vec3 wetCol = vec3(0.030, 0.034, 0.042) + grain * 0.008;

    vec3 surface = mix(dryCol, wetCol, puddle);

    vec2 rippleUv1 = p * 1.1 + vec2(sin(uTime * 0.7) * 0.1, cos(uTime * 0.5) * 0.1);
    vec2 rippleUv2 = p * 2.4 + vec2(-sin(uTime * 0.9) * 0.08, sin(uTime * 0.6) * 0.08);
    float rip = vnoise(rippleUv1) * 0.6 + vnoise(rippleUv2) * 0.4;

    vec3 R = reflect(-V, N);
    float rippleStrength = puddle * 0.02;
    R.xz += (vec2(rip, rip) - 0.5) * rippleStrength;
    vec3 refl = skySample(R, uSunDir, uSunColor, uTime, uCloudAmt);

    float NdV = max(dot(N, V), 0.0);
    float fres = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
    float reflectAmt = fres * (0.15 + 0.85 * puddle);

    vec3 col = mix(surface, refl, reflectAmt);

    vec3 H = normalize(uSunDir + V);
    float NdH = max(dot(N, H), 0.0);
    float specTight = pow(NdH, 500.0);
    float specBroad = pow(NdH, 40.0);
    col += uSunColor * specTight * puddle * 0.9;
    col += uSunColor * specBroad * (0.20 + puddle * 0.35);

    float ripplesCol = (rip - 0.5) * 0.08 * puddle;
    col += ripplesCol;

    float d = length(vWorldPos - uCamPos);
    vec3 lowSky = vec3(0.34, 0.36, 0.42);
    float fogAmt = smoothstep(8.0, 110.0, d);
    fogAmt = mix(fogAmt, min(1.0, fogAmt * 1.25), uRainIntensity);
    col = mix(col, lowSky, fogAmt);
    col *= 1.0 - fogAmt * 0.12;

    outColor = vec4(col, 1.0);
  }`;

  /* ============================================================
     RAIN
     ============================================================ */
  const rainVS = `#version 300 es
  layout(location=0) in vec2 aQuad;
  layout(location=1) in vec3 aPos;
  layout(location=2) in vec3 aVel;
  layout(location=3) in vec2 aSize;
  layout(location=4) in float aSeed;
  uniform mat4 uVP;
  uniform vec3 uCamPos;
  out vec2  vUv;
  out float vFade;
  out float vSeed;
  out vec3  vWorldPos;
  void main(){
    vec3 toCam = uCamPos - aPos;
    float dist = length(toCam);
    vec3 V = toCam / dist;
    vec3 dir = normalize(aVel);
    vec3 right = cross(dir, V);
    float rl = length(right);
    right = rl > 1e-4 ? right / rl : vec3(1.0, 0.0, 0.0);
    vec3 up = -dir;
    float t = (aQuad.y + 1.0) * 0.5;
    float lengthScale = mix(1.0, 0.30, smoothstep(2.5, 0.5, dist));
    vec3 worldPos = aPos + right * (aQuad.x * aSize.y * 0.5)
                         + up    * (t * aSize.x * lengthScale);
    gl_Position = uVP * vec4(worldPos, 1.0);
    vUv = vec2(aQuad.x, t);
    vFade = smoothstep(85.0, 40.0, dist) * smoothstep(0.8, 3.0, dist);
    vSeed = aSeed;
    vWorldPos = worldPos;
  }`;

  const rainFS = `#version 300 es
  precision highp float;
  in vec2  vUv;
  in float vFade;
  in float vSeed;
  in vec3  vWorldPos;
  out vec4 outColor;
  uniform vec3 uCamPos, uSunDir, uSunColor;
  uniform float uTime, uRainIntensity, uCloudAmt;
  ${GLSL_COMMON}
  ${GLSL_SKY_FN}
  void main(){
    float wx = vUv.x;
    float widthFade = exp(-wx * wx * 8.0);
    float ly = vUv.y;
    float headFade = smoothstep(0.00, 0.05, ly);
    float tailFade = 1.0 - smoothstep(0.55, 1.00, ly);
    float lengthFade = headFade * tailFade;

    vec3 viewRay = normalize(vWorldPos - uCamPos);
    float elev = viewRay.y;

    vec3 behind = elev > 0.005
      ? skySample(viewRay, uSunDir, uSunColor, uTime, uCloudAmt)
      : vec3(0.06, 0.07, 0.09);

    float bgLum = luminance(behind);
    float backlit = pow(max(dot(viewRay, uSunDir), 0.0), 2.5);

    vec3 dropCol = behind * 0.72 + uSunColor * backlit * 0.55 + vec3(0.015, 0.018, 0.022);

    float alpha = 0.06;
    alpha += backlit * 0.35;
    alpha *= 0.15 + 0.85 * smoothstep(0.02, 0.40, bgLum);
    alpha *= 0.85;
    alpha *= uRainIntensity;
    alpha *= widthFade * lengthFade * vFade;
    alpha *= mix(0.55, 1.25, vSeed);
    alpha = clamp(alpha, 0.0, 0.55);

    outColor = vec4(dropCol, alpha);
  }`;

  /* ============================================================
     SPLASH
     ============================================================ */
  const splashVS = `#version 300 es
  layout(location=0) in vec2 aQuad;
  layout(location=1) in vec3 aPos;
  layout(location=2) in float aSize;
  layout(location=3) in float aAlpha;
  layout(location=4) in float aSeed;
  uniform mat4 uVP;
  uniform vec3 uCamPos;
  out vec2  vUv;
  out float vAlpha;
  out float vSeed;
  out vec3  vWorldPos;
  void main(){
    vec3 toCam = uCamPos - aPos;
    vec3 V = normalize(toCam);
    vec3 up = vec3(0.0, 1.0, 0.0);
    if (abs(dot(up, V)) > 0.99) up = vec3(0.0, 0.0, 1.0);
    vec3 right = normalize(cross(up, V));
    vec3 upV   = cross(V, right);
    vec3 wp = aPos + right * (aQuad.x * aSize) + upV * (aQuad.y * aSize);
    gl_Position = uVP * vec4(wp, 1.0);
    vUv = aQuad;
    vAlpha = aAlpha;
    vSeed = aSeed;
    vWorldPos = wp;
  }`;

  const splashFS = `#version 300 es
  precision highp float;
  in vec2  vUv;
  in float vAlpha;
  in float vSeed;
  in vec3  vWorldPos;
  out vec4 outColor;
  uniform vec3 uCamPos, uSunDir, uSunColor;
  void main(){
    float r = length(vUv);
    if (r > 1.0) discard;
    float core = exp(-r * r * 5.0);
    vec3 V = normalize(vWorldPos - uCamPos);
    float backlit = pow(max(dot(V, uSunDir), 0.0), 3.0);
    vec3 col = vec3(0.78, 0.86, 0.98);
    col += uSunColor * backlit * 1.2;
    col += vec3(0.9, 0.95, 1.0) * core * 0.35;
    float a = core * vAlpha;
    outColor = vec4(col, a);
  }`;

  /* ============================================================
     RIPPLES
     ============================================================ */
  const rippleVS = `#version 300 es
  layout(location=0) in vec2 aQuad;
  layout(location=1) in vec3 aPos;
  layout(location=2) in float aAge;
  layout(location=3) in float aStrength;
  uniform mat4 uVP;
  out vec2  vUv;
  out float vAge;
  out float vStrength;
  void main(){
    float maxR = 2.2 * aStrength;
    float r = maxR * aAge;
    vec3 wp = aPos + vec3(aQuad.x * r, 0.003, aQuad.y * r);
    gl_Position = uVP * vec4(wp, 1.0);
    vUv = aQuad;
    vAge = aAge;
    vStrength = aStrength;
  }`;

  const rippleFS = `#version 300 es
  precision highp float;
  in vec2  vUv;
  in float vAge;
  in float vStrength;
  out vec4 outColor;
  void main(){
    float r = length(vUv);
    float ringRadius = 0.92;
    float ringWidth  = mix(0.18, 0.06, vAge);
    float ring = 1.0 - smoothstep(0.0, ringWidth, abs(r - ringRadius));
    float fade = (1.0 - vAge) * (1.0 - vAge);
    fade *= vStrength;
    float inner = (1.0 - smoothstep(0.0, 0.55, r)) * 0.15 * (1.0 - vAge);
    float alpha = (ring * 0.55 + inner) * fade;
    alpha = clamp(alpha, 0.0, 0.8);
    vec3 col = vec3(0.78, 0.86, 0.98);
    outColor = vec4(col, alpha);
  }`;

  /* ============================================================
     AUDIO ENGINE (per-instance)
     ============================================================ */
  function createAudio() {
    let ctx = null;
    let master = null;
    let rainGain = null;
    let rainSrc = null;
    let rainFilter = null;
    let rainHighShelf = null;
    let rainLowShelf = null;
    let enabled = true;
    let started = false;
    let targetLevel = 0.65;

    function init() {
      if (ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { enabled = false; return; }
      ctx = new Ctx();

      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);

      // ---- Rain loop (pink-ish noise, filtered) ----
      const bufLen = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);

      // Paul Kellet's economical pink noise
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufLen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      rainSrc = ctx.createBufferSource();
      rainSrc.buffer = buf;
      rainSrc.loop = true;
      rainSrc.playbackRate.value = 1.0;

      rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 4200;
      rainFilter.Q.value = 0.6;

      rainHighShelf = ctx.createBiquadFilter();
      rainHighShelf.type = 'highshelf';
      rainHighShelf.frequency.value = 6000;
      rainHighShelf.gain.value = -8;

      rainLowShelf = ctx.createBiquadFilter();
      rainLowShelf.type = 'lowshelf';
      rainLowShelf.frequency.value = 400;
      rainLowShelf.gain.value = 3;

      rainGain = ctx.createGain();
      rainGain.gain.value = 0;

      rainSrc.connect(rainFilter);
      rainFilter.connect(rainHighShelf);
      rainHighShelf.connect(rainLowShelf);
      rainLowShelf.connect(rainGain);
      rainGain.connect(master);
    }

    function start() {
      if (!enabled) return;
      init();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!started) {
        rainSrc.start();
        started = true;
      }
    }

    function setRainLevel(level) {
      targetLevel = level;
      if (!ctx || !rainGain) return;
      rainGain.gain.setTargetAtTime(level * 0.7, ctx.currentTime, 0.25);
    }

    function splash(force) {
      if (!enabled || !ctx || !started) return;
      const now = ctx.currentTime;
      const dur = 0.08 + Math.min(force, 3.0) * 0.05;
      const bufLen = Math.max(64, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        const t = i / bufLen;
        const env = Math.exp(-t * 7.0) * (1.0 - t);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.85 + Math.random() * 0.45;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 320 + Math.min(force, 3) * 260 + Math.random() * 200;
      bp.Q.value = 1.2;

      const g = ctx.createGain();
      g.gain.value = Math.min(0.28, 0.05 + force * 0.045);

      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(now);
      src.stop(now + dur + 0.05);
    }

    function setEnabled(on) {
      enabled = on;
      if (!ctx) return;
      if (on) {
        if (ctx.state === 'suspended') ctx.resume();
        if (rainGain) rainGain.gain.setTargetAtTime(targetLevel * 0.7, ctx.currentTime, 0.15);
      } else {
        if (rainGain) rainGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.15);
      }
    }

    function dispose() {
      try {
        if (rainSrc) rainSrc.stop();
      } catch (e) { /* already stopped */ }
      if (ctx && ctx.close) ctx.close();
      ctx = null;
    }

    return {
      start: start,
      setRainLevel: setRainLevel,
      splash: splash,
      setEnabled: setEnabled,
      dispose: dispose
    };
  }

  /* ============================================================
     PUBLIC FACTORY
     ============================================================ */
  function create(canvas, options) {
    if (!canvas) throw new Error('StormRain: a canvas element is required');
    const opts = options || {};

    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    if (!gl) throw new Error('StormRain: WebGL2 is not available');

    /* ---------------- configuration ---------------- */
    const config = {
      fov:           opts.fov != null ? opts.fov : 62,
      near:          opts.near != null ? opts.near : 0.1,
      far:           opts.far != null ? opts.far : 600,
      maxPixelRatio: opts.maxPixelRatio || 1.75,
      rainCount:     opts.rainCount || 4500,
      pointerLock:   opts.pointerLock !== false,
      eyeHeight:     opts.eyeHeight != null ? opts.eyeHeight : 1.65,
      walkSpeed:     opts.walkSpeed != null ? opts.walkSpeed : 3.2,
      runSpeed:      opts.runSpeed != null ? opts.runSpeed : 7.0,
      jumpSpeed:     opts.jumpSpeed != null ? opts.jumpSpeed : 5.2,
      gravity:       opts.gravity != null ? opts.gravity : 22,
      mouseSpeed:    opts.mouseSpeed != null ? opts.mouseSpeed : 0.003
    };

    const WIND = opts.wind || [0.55, 0.18];

    const sunDir = (function () {
      const v = opts.sunDirection || [0.55, 0.20, 0.55];
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / l, v[1] / l, v[2] / l];
    })();
    const sunColor = opts.sunColor || [1.00, 0.88, 0.70];

    /* ---------------- layers ---------------- */
    const Layer = {
      sky: true,
      clouds: true,
      ground: true,
      rain: true,
      splash: true,
      sound: true,
      rainLevel: opts.rainLevel != null ? opts.rainLevel : 1.0
    };
    if (opts.layers) {
      for (const k in opts.layers) {
        if (typeof Layer[k] === 'boolean') Layer[k] = !!opts.layers[k];
      }
    }

    /* ---------------- tiny event emitter ---------------- */
    const listeners = Object.create(null);
    function on(evt, fn) {
      (listeners[evt] || (listeners[evt] = [])).push(fn);
      return api;
    }
    function off(evt, fn) {
      const l = listeners[evt];
      if (!l) return api;
      if (!fn) { delete listeners[evt]; return api; }
      const i = l.indexOf(fn);
      if (i >= 0) l.splice(i, 1);
      return api;
    }
    function emit(evt, a, b) {
      const l = listeners[evt];
      if (!l) return;
      for (let i = 0; i < l.length; i++) {
        try { l[i](a, b); } catch (e) { console.error(e); }
      }
    }

    /* ============================================================
       PROGRAMS
       ============================================================ */
    const progSky    = link(gl, skyVS, skyFS);
    const progGround = link(gl, groundVS, groundFS);
    const progRain   = link(gl, rainVS, rainFS);
    const progSplash = link(gl, splashVS, splashFS);
    const progRipple = link(gl, rippleVS, rippleFS);

    /* ============================================================
       BASE QUAD
       ============================================================ */
    const baseQuadVAO = gl.createVertexArray();
    const baseQuadBuf = gl.createBuffer();
    gl.bindVertexArray(baseQuadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, baseQuadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    /* ============================================================
       SKY VAO
       ============================================================ */
    const skyVAO = gl.createVertexArray();
    gl.bindVertexArray(skyVAO);
    {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);

    /* ============================================================
       GROUND MESH
       ============================================================ */
    function makeGrid(size, segs) {
      const half = size / 2, step = size / segs;
      const v = new Float32Array((segs + 1) * (segs + 1) * 3);
      let k = 0;
      for (let j = 0; j <= segs; j++) {
        for (let i = 0; i <= segs; i++) {
          v[k++] = -half + i * step;
          v[k++] = 0;
          v[k++] = -half + j * step;
        }
      }
      const idx = new Uint32Array(segs * segs * 6);
      let m = 0;
      for (let j = 0; j < segs; j++) {
        for (let i = 0; i < segs; i++) {
          const a = j * (segs + 1) + i, b = a + 1, c = a + segs + 1, d = c + 1;
          idx[m++] = a; idx[m++] = c; idx[m++] = b;
          idx[m++] = b; idx[m++] = c; idx[m++] = d;
        }
      }
      return { v, idx };
    }

    const GROUND_SIZE = opts.groundSize || 500;
    const GROUND_SEGS = opts.groundSegments || 100;
    const groundMesh = makeGrid(GROUND_SIZE, GROUND_SEGS);
    const groundVAO = gl.createVertexArray();
    gl.bindVertexArray(groundVAO);
    {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, groundMesh.v, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, groundMesh.idx, gl.STATIC_DRAW);
    }
    gl.bindVertexArray(null);

    /* ============================================================
       RAIN SYSTEM
       ============================================================ */
    const RAIN_COUNT = config.rainCount;
    const RAIN_HALF  = 55;
    const RAIN_TOP   = 22;
    const RAIN_FLOOR = 0;
    const RAIN_FLOATS = 9;
    const rainData = new Float32Array(RAIN_COUNT * RAIN_FLOATS);
    const drops = new Array(RAIN_COUNT);

    function spawnDrop(i, camX, camZ, initial) {
      const r = Math.random();
      let L, W, fall, seed;
      if (r < 0.06) {
        L = 0.70 + Math.random() * 0.55; W = 0.011 + Math.random() * 0.007;
        fall = 7.0 + Math.random() * 2.5; seed = 0.55 + Math.random() * 0.45;
      } else if (r < 0.30) {
        L = 0.40 + Math.random() * 0.35; W = 0.007 + Math.random() * 0.005;
        fall = 6.0 + Math.random() * 2.0; seed = 0.7 + Math.random() * 0.6;
      } else {
        L = 0.20 + Math.random() * 0.22; W = 0.004 + Math.random() * 0.003;
        fall = 5.0 + Math.random() * 1.8; seed = 0.45 + Math.random() * 0.5;
      }
      const x = camX + (Math.random() * 2 - 1) * RAIN_HALF;
      const z = camZ + (Math.random() * 2 - 1) * RAIN_HALF;
      const y = initial
        ? RAIN_FLOOR + Math.random() * (RAIN_TOP - RAIN_FLOOR)
        : RAIN_TOP - Math.random() * 1.5;
      const windX = WIND[0] * 0.9 + Math.random() * 0.3;
      const windZ = WIND[1] * 0.9 + Math.random() * 0.15;
      drops[i] = {
        x: x, y: y, z: z,
        vx: windX, vy: -fall, vz: windZ,
        length: L, width: W, seed: seed
      };
    }

    for (let i = 0; i < RAIN_COUNT; i++) spawnDrop(i, 0, 0, true);

    function writeRainData() {
      let k = 0;
      for (let i = 0; i < RAIN_COUNT; i++) {
        const d = drops[i];
        rainData[k++] = d.x; rainData[k++] = d.y; rainData[k++] = d.z;
        rainData[k++] = d.vx; rainData[k++] = d.vy; rainData[k++] = d.vz;
        rainData[k++] = d.length; rainData[k++] = d.width;
        rainData[k++] = d.seed;
      }
    }

    const rainVAO = gl.createVertexArray();
    const rainBuf = gl.createBuffer();
    gl.bindVertexArray(rainVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, baseQuadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, rainBuf);
    gl.bufferData(gl.ARRAY_BUFFER, rainData, gl.DYNAMIC_DRAW);
    const RSTRIDE = RAIN_FLOATS * 4;
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, RSTRIDE, 0);  gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, RSTRIDE, 12); gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, RSTRIDE, 24); gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, RSTRIDE, 32); gl.vertexAttribDivisor(4, 1);
    gl.bindVertexArray(null);

    /* ============================================================
       SPLASH SYSTEM
       ============================================================ */
    const SPLASH_MAX = opts.splashCount || 700;
    const splash = [];
    for (let i = 0; i < SPLASH_MAX; i++) {
      splash.push({
        x: 0, y: -1, z: 0, vx: 0, vy: 0, vz: 0,
        size: 0, life: 0, maxLife: 1, active: false, seed: 0
      });
    }
    let splashCursor = 0;

    const SPLASH_FLOATS = 6;
    const splashData = new Float32Array(SPLASH_MAX * SPLASH_FLOATS);

    const splashVAO = gl.createVertexArray();
    const splashBuf = gl.createBuffer();
    gl.bindVertexArray(splashVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, baseQuadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, splashBuf);
    gl.bufferData(gl.ARRAY_BUFFER, splashData, gl.DYNAMIC_DRAW);
    const SSTRIDE = SPLASH_FLOATS * 4;
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, SSTRIDE, 0);  gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, SSTRIDE, 12); gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, SSTRIDE, 16); gl.vertexAttribDivisor(3, 1);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, SSTRIDE, 20); gl.vertexAttribDivisor(4, 1);
    gl.bindVertexArray(null);

    function spawnSplash(x, z, force) {
      const count = Math.floor(8 + force * 12);
      for (let i = 0; i < count; i++) {
        const s = splash[splashCursor];
        splashCursor = (splashCursor + 1) % SPLASH_MAX;
        const ang = Math.random() * Math.PI * 2;
        const radialSpeed = force * (0.6 + Math.random() * 1.2);
        const upSpeed = force * (1.8 + Math.random() * 2.2);
        const jitter = 0.15;
        s.x = x + Math.cos(ang) * 0.10;
        s.y = 0.02 + Math.random() * 0.05;
        s.z = z + Math.sin(ang) * 0.10;
        s.vx = Math.cos(ang) * radialSpeed + (Math.random() - 0.5) * jitter;
        s.vy = upSpeed + (Math.random() - 0.5) * 0.3;
        s.vz = Math.sin(ang) * radialSpeed + (Math.random() - 0.5) * jitter;
        s.size = 0.015 + Math.random() * 0.035;
        s.maxLife = 0.55 + Math.random() * 0.55;
        s.life = s.maxLife;
        s.seed = Math.random();
        s.active = true;
      }
    }

    function updateSplashes(dt) {
      for (let i = 0; i < SPLASH_MAX; i++) {
        const s = splash[i];
        if (!s.active) continue;
        s.vy -= 9.81 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        s.life -= dt;
        if (s.life <= 0 || s.y < 0.0) { s.active = false; s.y = -1; }
      }
    }

    function writeSplashData() {
      let k = 0;
      for (let i = 0; i < SPLASH_MAX; i++) {
        const s = splash[i];
        const t = s.active ? Math.max(0, s.life / s.maxLife) : 0;
        const alpha = s.active ? Math.pow(t, 0.6) * 0.85 : 0.0;
        const size = s.active ? s.size * (1.0 + (1.0 - t) * 0.6) : 0.0;
        splashData[k++] = s.x;
        splashData[k++] = Math.max(s.y, -1);
        splashData[k++] = s.z;
        splashData[k++] = size;
        splashData[k++] = alpha;
        splashData[k++] = s.seed;
      }
    }

    /* ============================================================
       RIPPLE SYSTEM
       ============================================================ */
    const RIPPLE_MAX = opts.rippleCount || 60;
    const ripples = [];
    for (let i = 0; i < RIPPLE_MAX; i++) {
      ripples.push({ x: 0, z: 0, age: 0, strength: 0, active: false });
    }
    let rippleCursor = 0;

    const RIP_FLOATS = 4;
    const rippleData = new Float32Array(RIPPLE_MAX * RIP_FLOATS);

    const rippleVAO = gl.createVertexArray();
    const rippleBuf = gl.createBuffer();
    gl.bindVertexArray(rippleVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, baseQuadBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, rippleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, rippleData, gl.DYNAMIC_DRAW);
    const PSTRIDE = RIP_FLOATS * 4;
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, PSTRIDE, 0);  gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, PSTRIDE, 12); gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, PSTRIDE, 16); gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);

    function spawnRipple(x, z, strength) {
      const r = ripples[rippleCursor];
      rippleCursor = (rippleCursor + 1) % RIPPLE_MAX;
      r.x = x; r.z = z;
      r.age = 0;
      r.strength = strength;
      r.active = true;
    }

    function updateRipples(dt) {
      for (let i = 0; i < RIPPLE_MAX; i++) {
        const r = ripples[i];
        if (!r.active) continue;
        r.age += dt * 0.85;
        if (r.age >= 1.0) r.active = false;
      }
    }

    function writeRippleData() {
      let k = 0;
      for (let i = 0; i < RIPPLE_MAX; i++) {
        const r = ripples[i];
        rippleData[k++] = r.x;
        rippleData[k++] = 0;
        rippleData[k++] = r.z;
        rippleData[k++] = r.active ? Math.min(r.age, 1.0) : 1.0;
        rippleData[k++] = r.active ? r.strength : 0.0;
      }
    }

    /* ============================================================
       AUDIO
       ============================================================ */
    const audio = createAudio();

    /* ============================================================
       PLAYER
       ============================================================ */
    const startPos = opts.startPosition || [0, 0, 10];
    const player = {
      pos: [startPos[0], startPos[1], startPos[2]],
      yaw: opts.startYaw || 0,
      pitch: opts.startPitch != null ? opts.startPitch : -0.05,
      vy: 0,
      onGround: true
    };

    const step = { accum: 0, side: 0, bobPhase: 0 };
    const keys = Object.create(null);

    let running = false;
    let paused = false;

    const view = M4();
    const proj = M4();
    const vp = M4();
    const invVP = M4();

    /* ---------------- pointer lock ---------------- */
    function requestPointerLock() {
      if (!config.pointerLock) return;
      if (canvas.requestPointerLock) canvas.requestPointerLock();
    }
    function exitPointerLock() {
      if (document.exitPointerLock) document.exitPointerLock();
    }
    function isLocked() {
      return document.pointerLockElement === canvas;
    }

    function onMouseMove(e) {
      if (config.pointerLock && document.pointerLockElement !== canvas) return;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      player.yaw   -= dx * config.mouseSpeed;
      player.pitch -= dy * config.mouseSpeed;
      player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
    }

    function onKeyDown(e) {
      keys[e.code] = true;
      // Prevent page scroll while playing
      if (running && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
        e.preventDefault();
      }
    }
    function onKeyUp(e) { keys[e.code] = false; }

    function onPointerLockChange() {
      const locked = isLocked();
      emit(locked ? 'lock' : 'unlock');
    }

    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    /* ---------------- camera ---------------- */
    function stepLength(speed) { return 0.55 + speed * 0.055; }

    function updateCamera(dt) {
      const cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
      const cy = Math.cos(player.yaw),   sy = Math.sin(player.yaw);
      const fwd = [sy * cp, sp, -cy * cp];
      const fwdFlat = [sy, 0, -cy];
      const fl = Math.hypot(fwdFlat[0], fwdFlat[2]) || 1;
      fwdFlat[0] /= fl; fwdFlat[2] /= fl;
      const rx = fwdFlat[2], rz = -fwdFlat[0];

      let vx = 0, vz = 0;
      if (keys['KeyW']) { vx += fwdFlat[0]; vz += fwdFlat[2]; }
      if (keys['KeyS']) { vx -= fwdFlat[0]; vz -= fwdFlat[2]; }
      if (keys['KeyA']) { vx -= rx; vz -= rz; }
      if (keys['KeyD']) { vx += rx; vz += rz; }

      const l = Math.hypot(vx, vz);
      let speed = 0;
      if (l > 0.0001) {
        speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? config.runSpeed : config.walkSpeed;
        vx = vx / l * speed;
        vz = vz / l * speed;
      }

      const oldX = player.pos[0];
      const oldZ = player.pos[2];
      player.pos[0] += vx * dt;
      player.pos[2] += vz * dt;

      player.vy -= config.gravity * dt;
      player.pos[1] += player.vy * dt;

      let justLanded = false;
      let landingForce = 0;
      if (player.pos[1] <= 0) {
        if (!player.onGround && player.vy < -1.0) {
          justLanded = true;
          landingForce = Math.min(4.5, -player.vy * 0.55);
        }
        player.pos[1] = 0;
        player.vy = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }

      if (keys['Space'] && player.onGround) {
        player.vy = config.jumpSpeed;
        player.onGround = false;
      }

      const moveDist = Math.hypot(player.pos[0] - oldX, player.pos[2] - oldZ);
      if (player.onGround && moveDist > 0.0001) {
        step.accum += moveDist;
        const stride = stepLength(speed);
        if (step.accum >= stride) {
          step.accum -= stride;
          step.side = 1 - step.side;
          const lateralSign = step.side === 0 ? -1 : 1;
          const footX = player.pos[0] + rx * lateralSign * 0.18;
          const footZ = player.pos[2] + rz * lateralSign * 0.18;
          const force = (speed > config.walkSpeed + 0.1) ? 1.9 : 1.0;
          spawnSplash(footX, footZ, force);
          spawnRipple(footX, footZ, force * 0.9);
          audio.splash(force);
        }
      } else if (speed < 0.1) {
        step.accum = Math.min(step.accum, stepLength(speed) * 0.5);
      }

      if (justLanded && landingForce > 0.5) {
        spawnRipple(player.pos[0], player.pos[2], landingForce * 0.9);
        spawnSplash(player.pos[0], player.pos[2], landingForce * 1.4);
        audio.splash(landingForce * 1.1);
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          const rr = 0.25 + Math.random() * 0.35;
          spawnSplash(player.pos[0] + Math.cos(a) * rr,
                      player.pos[2] + Math.sin(a) * rr,
                      landingForce * 0.9);
        }
      }

      if (player.onGround && speed > 0.3) {
        step.bobPhase += dt * (speed > config.walkSpeed + 0.1 ? 9.5 : 6.5);
      } else {
        step.bobPhase += dt * 2.0;
      }
      const bobAmp = (speed > config.walkSpeed + 0.1 ? 0.035 : 0.022) * (speed > 0.1 ? 1 : 0);
      const bobY = Math.sin(step.bobPhase) * bobAmp;
      const bobX = Math.cos(step.bobPhase * 0.5) * bobAmp * 0.6;

      const cx = player.pos[0] + rx * bobX;
      const cz = player.pos[2] + rz * bobX;
      const cy2 = player.pos[1] + config.eyeHeight + bobY;

      m4lookAt(view, cx, cy2, cz,
               cx + fwd[0], cy2 + fwd[1], cz + fwd[2], 0, 1, 0);

      return [cx, cy2, cz];
    }

    /* ---------------- rain sim ---------------- */
    function updateRain(dt, camX, camZ) {
      for (let i = 0; i < RAIN_COUNT; i++) {
        const d = drops[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        if (d.y <= RAIN_FLOOR) { spawnDrop(i, camX, camZ, false); continue; }
        if (d.x < camX - RAIN_HALF) d.x += RAIN_HALF * 2;
        if (d.x > camX + RAIN_HALF) d.x -= RAIN_HALF * 2;
        if (d.z < camZ - RAIN_HALF) d.z += RAIN_HALF * 2;
        if (d.z > camZ + RAIN_HALF) d.z -= RAIN_HALF * 2;
      }
    }

    /* ============================================================
       RESIZE
       ============================================================ */
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
      const w = Math.floor(canvas.clientWidth * dpr) || Math.floor(window.innerWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr) || Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    }
    window.addEventListener('resize', resize);
    resize();

    /* ============================================================
       RENDER LOOP
       ============================================================ */
    let rafId = 0;
    let lastT = performance.now();
    let statTimer = 0;
    let frames = 0;
    let fps = 0;
    let lastAudioLevel = -1;

    function frame(now) {
      rafId = requestAnimationFrame(frame);

      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      if (paused || !running) return;

      const time = now / 1000;

      const camPos = updateCamera(dt);
      updateRain(dt, camPos[0], camPos[2]);
      updateSplashes(dt);
      updateRipples(dt);

      const rainIntensity = Layer.rain ? Layer.rainLevel : 0.0;
      const audioLevel = Layer.sound ? Layer.rainLevel : 0;
      if (audioLevel !== lastAudioLevel) {
        audio.setRainLevel(audioLevel);
        lastAudioLevel = audioLevel;
      }

      m4perspective(proj, config.fov * Math.PI / 180,
                    canvas.width / canvas.height, config.near, config.far);
      m4mul(vp, proj, view);
      m4invert(invVP, vp);

      /* ---- SKY ---- */
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.BLEND);
      gl.clearColor(0.06, 0.07, 0.09, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(progSky.p);
      gl.uniformMatrix4fv(progSky.u.uInvVP, false, invVP);
      gl.uniform3fv(progSky.u.uSunDir, sunDir);
      gl.uniform3fv(progSky.u.uSunColor, sunColor);
      gl.uniform3f(progSky.u.uCamPos, camPos[0], camPos[1], camPos[2]);
      gl.uniform1f(progSky.u.uTime, time);
      gl.uniform1f(progSky.u.uRainIntensity, rainIntensity);
      gl.uniform1f(progSky.u.uCloudAmt, Layer.clouds ? 1.0 : 0.0);
      gl.uniform1f(progSky.u.uSkyOn, Layer.sky ? 1.0 : 0.0);
      gl.bindVertexArray(skyVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);

      /* ---- GROUND ---- */
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);

      if (Layer.ground) {
        gl.useProgram(progGround.p);
        gl.uniformMatrix4fv(progGround.u.uVP, false, vp);
        gl.uniform2f(progGround.u.uGridOffset, camPos[0], camPos[2]);
        gl.uniform1f(progGround.u.uTime, time);
        gl.uniform1f(progGround.u.uRainIntensity, rainIntensity);
        gl.uniform1f(progGround.u.uCloudAmt, Layer.clouds ? 1.0 : 0.0);
        gl.uniform3f(progGround.u.uCamPos, camPos[0], camPos[1], camPos[2]);
        gl.uniform3fv(progGround.u.uSunDir, sunDir);
        gl.uniform3fv(progGround.u.uSunColor, sunColor);
        gl.bindVertexArray(groundVAO);
        gl.drawElements(gl.TRIANGLES, groundMesh.idx.length, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
      }

      /* ---- Transparent passes ---- */
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);

      /* ---- RIPPLES ---- */
      if (Layer.ground) {
        writeRippleData();
        gl.bindBuffer(gl.ARRAY_BUFFER, rippleBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, rippleData);
        gl.useProgram(progRipple.p);
        gl.uniformMatrix4fv(progRipple.u.uVP, false, vp);
        gl.bindVertexArray(rippleVAO);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, RIPPLE_MAX);
        gl.bindVertexArray(null);
      }

      /* ---- RAIN ---- */
      if (Layer.rain) {
        writeRainData();
        gl.bindBuffer(gl.ARRAY_BUFFER, rainBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, rainData);
        gl.useProgram(progRain.p);
        gl.uniformMatrix4fv(progRain.u.uVP, false, vp);
        gl.uniform3f(progRain.u.uCamPos, camPos[0], camPos[1], camPos[2]);
        gl.uniform3fv(progRain.u.uSunDir, sunDir);
        gl.uniform3fv(progRain.u.uSunColor, sunColor);
        gl.uniform1f(progRain.u.uTime, time);
        gl.uniform1f(progRain.u.uRainIntensity, Layer.rainLevel);
        gl.uniform1f(progRain.u.uCloudAmt, Layer.clouds ? 1.0 : 0.0);
        gl.bindVertexArray(rainVAO);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, RAIN_COUNT);
        gl.bindVertexArray(null);
      }

      /* ---- SPLASHES ---- */
      if (Layer.splash) {
        writeSplashData();
        gl.bindBuffer(gl.ARRAY_BUFFER, splashBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, splashData);
        gl.useProgram(progSplash.p);
        gl.uniformMatrix4fv(progSplash.u.uVP, false, vp);
        gl.uniform3f(progSplash.u.uCamPos, camPos[0], camPos[1], camPos[2]);
        gl.uniform3fv(progSplash.u.uSunDir, sunDir);
        gl.uniform3fv(progSplash.u.uSunColor, sunColor);
        gl.bindVertexArray(splashVAO);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, SPLASH_MAX);
        gl.bindVertexArray(null);
      }

      gl.depthMask(true);

      /* ---- stats ---- */
      frames++;
      statTimer += dt;
      if (statTimer >= 0.5) {
        fps = Math.round(frames / statTimer);
        frames = 0;
        statTimer = 0;
        emit('stats', { fps: fps, drops: Layer.rain ? RAIN_COUNT : 0 });
      }
    }

    /* ============================================================
       PUBLIC API
       ============================================================ */
    const api = {
      version: VERSION,
      gl: gl,
      canvas: canvas,
      player: player,
      wind: WIND,
      sunDir: sunDir,
      sunColor: sunColor,
      config: config,

      on: on,
      off: off,

      /** Begin rendering + resume audio + grab pointer lock. */
      start: function () {
        const wasRunning = running;
        running = true;
        paused = false;
        lastT = performance.now();
        audio.start();
        audio.setEnabled(Layer.sound);
        requestPointerLock();
        if (!wasRunning) emit('start');
        return api;
      },

      /** Stop updating/rendering (keeps GL resources). */
      stop: function () {
        running = false;
        return api;
      },

      pause: function () { paused = true; return api; },
      resume: function () { paused = false; lastT = performance.now(); return api; },
      isRunning: function () { return running && !paused; },
      isLocked: isLocked,
      requestPointerLock: requestPointerLock,
      exitPointerLock: exitPointerLock,

      /** Set a layer on/off. name: sky|clouds|ground|rain|splash|sound */
      setLayer: function (name, on) {
        if (!(name in Layer) || typeof Layer[name] !== 'boolean') {
          throw new Error('StormRain: unknown layer "' + name + '"');
        }
        Layer[name] = !!on;
        if (name === 'sound') audio.setEnabled(Layer.sound);
        emit('layerchange', { name: name, value: Layer[name] });
        return api;
      },

      /** Bulk-set layers, e.g. setLayers({ rain: false }) */
      setLayers: function (obj) {
        for (const k in obj) {
          if (typeof Layer[k] === 'boolean') api.setLayer(k, obj[k]);
        }
        return api;
      },

      getLayer: function (name) { return Layer[name]; },
      getLayers: function () {
        return {
          sky: Layer.sky, clouds: Layer.clouds, ground: Layer.ground,
          rain: Layer.rain, splash: Layer.splash, sound: Layer.sound,
          rainLevel: Layer.rainLevel
        };
      },

      /** 0..2 multiplier for rain density / audio */
      setRainLevel: function (v) {
        Layer.rainLevel = Math.max(0, Math.min(2, +v || 0));
        return api;
      },
      getRainLevel: function () { return Layer.rainLevel; },

      /** Teleport / reorient the player. */
      setPlayerPosition: function (x, y, z) {
        if (x != null) player.pos[0] = x;
        if (y != null) player.pos[1] = y;
        if (z != null) player.pos[2] = z;
        return api;
      },
      setPlayerRotation: function (yaw, pitch) {
        if (yaw != null) player.yaw = yaw;
        if (pitch != null) player.pitch = Math.max(-1.45, Math.min(1.45, pitch));
        return api;
      },

      /** Fire a splash + ripple at a world position (e.g. from your own logic). */
      splashAt: function (x, z, force) {
        force = force == null ? 1 : force;
        spawnSplash(x, z, force);
        spawnRipple(x, z, force * 0.9);
        audio.splash(force);
        return api;
      },

      resize: resize,

      dispose: function () {
        cancelAnimationFrame(rafId);
        canvas.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', resize);
        document.removeEventListener('pointerlockchange', onPointerLockChange);
        audio.dispose();

        const buffers = [baseQuadBuf, rainBuf, splashBuf, rippleBuf];
        buffers.forEach(function (b) { if (b) gl.deleteBuffer(b); });
        [baseQuadVAO, skyVAO, groundVAO, rainVAO, splashVAO, rippleVAO]
          .forEach(function (v) { if (v) gl.deleteVertexArray(v); });
        [progSky, progGround, progRain, progSplash, progRipple]
          .forEach(function (p) { if (p) gl.deleteProgram(p.p); });

        running = false;
        emit('dispose');
        for (const k in listeners) delete listeners[k];
      }
    };

    // Kick off the render loop immediately (rendering is gated on `running`)
    rafId = requestAnimationFrame(frame);

    if (opts.autostart) api.start();

    return api;
  }

  /* ============================================================
     LIBRARY EXPORT
     ============================================================ */
  const lib = {
    version: VERSION,
    create: create,
    instance: null
  };

  /* ============================================================
     BOOTSTRAP — inject canvas, styles, UI, hint, and start
     ============================================================ */
  const OPTIONS = {
    rainCount: 4500,
    rainLevel: 1.0,
    sunDirection: [0.55, 0.20, 0.55],
    sunColor:    [1.00, 0.88, 0.70],
    wind:        [0.55, 0.18],
    groundSize: 500,
    groundSegments: 100,
    startPosition: [0, 0, 10],
    eyeHeight: 1.65,
    walkSpeed: 3.2,
    runSpeed: 7.0,
    jumpSpeed: 5.2,
    layers: { sky: true, clouds: true, ground: true, rain: true, splash: true, sound: true }
  };

  const CSS = `
    html, body { margin:0; padding:0; height:100%; overflow:hidden; background:#05080b; }
    .rainjs-canvas {
      position:fixed; inset:0;
      display:block; width:100vw; height:100vh;
      cursor:default;
    }
    .rainjs-info {
      position:fixed; top:14px; left:14px; color:#fff;
      font:13px system-ui, sans-serif;
      background:rgba(0,0,0,0.45); padding:8px 14px;
      border-radius:6px; pointer-events:none; z-index:10;
    }
    .rainjs-hint-bar {
      position:fixed; bottom:14px; left:50%; transform:translateX(-50%);
      color:rgba(255,255,255,0.6); font:12px system-ui; z-index:10;
      pointer-events:none; white-space:nowrap;
    }
    .rainjs-ui {
      position:fixed; top:14px; right:14px;
      background:rgba(10,14,20,0.72);
      border:1px solid rgba(255,255,255,0.12);
      border-radius:8px; padding:12px 14px;
      font:12px/1.7 system-ui, sans-serif;
      color:#dce6f2; z-index:20;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      min-width:160px; user-select:none;
    }
    .rainjs-ui h4 {
      margin:0 0 8px; font-size:11px; letter-spacing:1.4px;
      text-transform:uppercase; color:#7fb8d8; font-weight:600;
    }
    .rainjs-ui label {
      display:flex; align-items:center; gap:8px;
      cursor:pointer; padding:2px 0;
    }
    .rainjs-ui label:hover { color:#fff; }
    .rainjs-ui input[type=checkbox] {
      appearance:none; -webkit-appearance:none;
      width:14px; height:14px; border-radius:3px;
      border:1px solid rgba(255,255,255,0.35);
      background:rgba(255,255,255,0.05);
      cursor:pointer; position:relative; transition: all .15s;
      margin:0;
    }
    .rainjs-ui input[type=checkbox]:checked {
      background:#3fbbe0; border-color:#3fbbe0;
    }
    .rainjs-ui input[type=checkbox]:checked::after {
      content:''; position:absolute; left:4px; top:1px;
      width:4px; height:8px; border:solid #0a0e14;
      border-width:0 2px 2px 0; transform:rotate(45deg);
    }
    .rainjs-ui .rainjs-row {
      display:flex; align-items:center; gap:8px; margin-top:8px;
    }
    .rainjs-ui .rainjs-row input[type=range] { flex:1; }
    .rainjs-ui .rainjs-row span { opacity:.6; min-width:34px; }
    .rainjs-hint {
      position:fixed; inset:0;
      display:flex; align-items:center; justify-content:center;
      background:rgba(5,8,11,0.55);
      color:#dce6f2; font:15px system-ui, sans-serif;
      z-index:30; cursor:pointer;
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }
    .rainjs-hint .rainjs-hint-box {
      background:rgba(10,14,20,0.9);
      padding:22px 32px; border-radius:12px;
      border:1px solid rgba(255,255,255,0.15);
      text-align:center;
    }
    .rainjs-hint .rainjs-hint-box small {
      display:block; opacity:.55; margin-top:8px; font-size:12px;
    }
  `;

  function injectStyles() {
    if (document.getElementById('rainjs-styles')) return;
    const style = document.createElement('style');
    style.id = 'rainjs-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function createUI(storm, onRainLevel) {
    const panel = document.createElement('div');
    panel.className = 'rainjs-ui';
    panel.innerHTML =
      '<h4>Layers</h4>' +
      '<label><input type="checkbox" data-layer="sky" checked> Sky</label>' +
      '<label><input type="checkbox" data-layer="clouds" checked> Clouds</label>' +
      '<label><input type="checkbox" data-layer="ground" checked> Ground</label>' +
      '<label><input type="checkbox" data-layer="rain" checked> Rain</label>' +
      '<label><input type="checkbox" data-layer="splash" checked> Splashes</label>' +
      '<label><input type="checkbox" data-layer="sound" checked> Sound</label>' +
      '<div class="rainjs-row"><span>Rain</span>' +
      '<input type="range" data-rain min="0" max="200" value="100"></div>';
    document.body.appendChild(panel);

    panel.querySelectorAll('input[data-layer]').forEach((el) => {
      el.addEventListener('change', () => {
        storm.setLayer(el.dataset.layer, el.checked);
      });
    });
    panel.querySelector('input[data-rain]').addEventListener('input', (e) => {
      const v = e.target.value / 100;
      storm.setRainLevel(v);
      if (onRainLevel) onRainLevel(v);
    });
    return panel;
  }

  function createInfoBar() {
    const el = document.createElement('div');
    el.className = 'rainjs-info';
    el.innerHTML = 'Storm — <span id="rainjs-state">Heavy rain</span>';
    document.body.appendChild(el);
    return el.querySelector('#rainjs-state');
  }

  function createHintBar() {
    const el = document.createElement('div');
    el.className = 'rainjs-hint-bar';
    el.textContent = 'Click · Mouse look · WASD walk · Shift run · Space jump';
    document.body.appendChild(el);
  }

  function createClickHint(onClick) {
    const hint = document.createElement('div');
    hint.className = 'rainjs-hint';
    hint.innerHTML =
      '<div class="rainjs-hint-box">' +
      'Click anywhere to start' +
      '<small>Mouse look · WASD walk · Shift run · Space jump · ESC to release</small>' +
      '</div>';
    document.body.appendChild(hint);

    const firstClick = () => {
      hint.style.display = 'none';
      window.removeEventListener('mousedown', firstClick);
      onClick();
    };
    window.addEventListener('mousedown', firstClick);
    return hint;
  }

  function boot() {
    injectStyles();

    const canvas = document.createElement('canvas');
    canvas.className = 'rainjs-canvas';
    document.body.appendChild(canvas);

    const stateEl = createInfoBar();
    createHintBar();

    const storm = create(canvas, OPTIONS);
    lib.instance = storm;
    storm.start();

    createUI(storm, (lvl) => {
      if (stateEl) stateEl.textContent = 'Heavy · ' + Math.round(lvl * 100) + '%';
    });

    createClickHint(() => {
      // Resume audio + grab pointer lock inside the user gesture.
      storm.start();
    });
  }

  window.StormRain = lib;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();