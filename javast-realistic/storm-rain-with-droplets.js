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
 * MIT License.
 */
(function () {
  'use strict';

  if (window.__rainJsLoaded) return;
  window.__rainJsLoaded = true;

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
    let yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
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
      o[i]      = a0 * b[0] + a1 * b[1] + a2 * b[2] + a3 * b[3];
      o[i + 4]  = a0 * b[4] + a1 * b[5] + a2 * b[6] + a3 * b[7];
      o[i + 8]  = a0 * b[8] + a1 * b[9] + a2 * b[10] + a3 * b[11];
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
    if (!det) { o.set(m); return; }
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
  }

  /* ============================================================
     SHADER HELPERS
     ============================================================ */
  function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Shader error: ' + log);
    }
    return s;
  }
  function linkProgram(gl, vsSrc, fsSrc) {
    const p = gl.createProgram();
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error('Link error: ' + log);
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
     GLSL CHUNKS
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
     SHADER SOURCES
     ============================================================ */
  const SHADERS = {
    sky: {
      vs: `#version 300 es
        layout(location=0) in vec2 aPos;
        out vec2 vNdc;
        void main(){ vNdc = aPos; gl_Position = vec4(aPos, 0.999999, 1.0); }`,
      fs: `#version 300 es
        precision highp float;
        in vec2 vNdc;
        out vec4 outColor;
        uniform mat4 uInvVP;
        uniform vec3 uCamPos, uSunDir, uSunColor;
        uniform float uTime, uRainIntensity, uCloudAmt, uSkyOn;
        ${GLSL_COMMON}
        ${GLSL_SKY_FN}
        void main(){
          if (uSkyOn < 0.5) { outColor = vec4(0.20, 0.23, 0.28, 1.0); return; }
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
        }`,
    },
    ground: {
      vs: `#version 300 es
        layout(location=0) in vec3 aPos;
        uniform mat4 uVP;
        uniform vec2 uGridOffset;
        out vec3 vWorldPos, vNormal;
        void main(){
          vec2 wp = aPos.xz + uGridOffset;
          vec3 p = vec3(wp.x, 0.0, wp.y);
          vWorldPos = p; vNormal = vec3(0.0, 1.0, 0.0);
          gl_Position = uVP * vec4(p, 1.0);
        }`,
      fs: `#version 300 es
        precision highp float;
        in vec3 vWorldPos, vNormal;
        out vec4 outColor;
        uniform float uTime, uRainIntensity, uCloudAmt;
        uniform vec3 uCamPos, uSunDir, uSunColor;
        ${GLSL_COMMON}
        ${GLSL_SKY_FN}
        float dropRipples(vec2 p, float t) {
          float total = 0.0;
          for (int k = 0; k < 3; k++) {
            float scale = float(k+1) * 0.9;
            vec2 cell = floor(p / scale);
            vec2 uv = fract(p / scale) - 0.5;
            float h = hash21(cell + float(k) * 13.7);
            float phase = fract(t * (1.2 + h * 0.5) + h * 7.13);
            float r = length(uv) * 1.5;
            float ring = smoothstep(phase - 0.08, phase, r) *
                         (1.0 - smoothstep(phase, phase + 0.15, r));
            float fade = (1.0 - phase) * (1.0 - phase);
            total += ring * fade * (1.0 - float(k) * 0.25);
          }
          return clamp(total, 0.0, 1.0);
        }
        void main(){
          vec3 N = vec3(0.0, 1.0, 0.0);
          vec3 V = normalize(uCamPos - vWorldPos);
          vec2 p = vWorldPos.xz;
          float puddle = fbm2(p * 0.045 + vec2(11.7, 3.4));
          puddle = smoothstep(0.40, 0.65, puddle);
          float puddleEdge = fbm2(p * 0.22 + vec2(2.1, 8.9));
          puddle *= mix(0.7, 1.0, puddleEdge);
          float grain = vnoise(p * 6.5) * 0.6 + vnoise(p * 18.0) * 0.4;
          vec3 dryCol = vec3(0.14, 0.135, 0.13) + grain * 0.035;
          vec3 wetCol = vec3(0.030, 0.034, 0.042) + grain * 0.008;
          vec3 surface = mix(dryCol, wetCol, puddle);
          float impacts = dropRipples(p, uTime);
          impacts *= uRainIntensity;
          vec3 R = reflect(-V, N);
          float rippleDistort = vnoise(p * 2.4 + vec2(uTime * 0.5, uTime * 0.3)) * 0.02 * puddle;
          R.xz += (rippleDistort - 0.01);
          vec3 refl = skySample(R, uSunDir, uSunColor, uTime, uCloudAmt);
          float NdV = max(dot(N, V), 0.0);
          float fres = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
          float reflectAmt = fres * (0.15 + 0.85 * puddle);
          vec3 col = mix(surface, refl, reflectAmt);
          vec3 ringSky = skySample(vec3(R.x, 0.25, R.z), uSunDir, uSunColor, uTime, uCloudAmt);
          col = mix(col, ringSky * 1.4, impacts * 0.35);
          vec3 H = normalize(uSunDir + V);
          float NdH = max(dot(N, H), 0.0);
          col += uSunColor * pow(NdH, 500.0) * puddle * 0.9;
          col += uSunColor * pow(NdH, 40.0) * (0.20 + puddle * 0.35);
          float d = length(vWorldPos - uCamPos);
          vec3 lowSky = vec3(0.34, 0.36, 0.42);
          float fogAmt = smoothstep(8.0, 110.0, d);
          fogAmt = mix(fogAmt, min(1.0, fogAmt * 1.25), uRainIntensity);
          col = mix(col, lowSky, fogAmt);
          col *= 1.0 - fogAmt * 0.12;
          outColor = vec4(col, 1.0);
        }`,
    },
    rain: {
      vs: `#version 300 es
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
        }`,
      fs: `#version 300 es
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
          vec3 behind = viewRay.y > 0.005
            ? skySample(viewRay, uSunDir, uSunColor, uTime, uCloudAmt)
            : vec3(0.06, 0.07, 0.09);
          float bgLum = luminance(behind);
          float backlit = pow(max(dot(viewRay, uSunDir), 0.0), 2.5);
          vec3 dropCol = behind * 0.85 + uSunColor * backlit * 0.35 + vec3(0.01, 0.012, 0.015);
          float alpha = 0.06;
          alpha += backlit * 0.30;
          alpha *= 0.15 + 0.85 * smoothstep(0.02, 0.40, bgLum);
          alpha *= 0.85;
          alpha *= uRainIntensity;
          alpha *= widthFade * lengthFade * vFade;
          alpha *= mix(0.55, 1.25, vSeed);
          alpha = clamp(alpha, 0.0, 0.55);
          outColor = vec4(dropCol, alpha);
        }`,
    },
    splash: {
      vs: `#version 300 es
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
        }`,
      fs: `#version 300 es
        precision highp float;
        in vec2  vUv;
        in float vAlpha;
        in float vSeed;
        in vec3  vWorldPos;
        out vec4 outColor;
        uniform vec3 uCamPos, uSunDir, uSunColor;
        uniform float uTime, uCloudAmt;
        ${GLSL_COMMON}
        ${GLSL_SKY_FN}
        void main(){
          float r2 = dot(vUv, vUv);
          if (r2 > 1.0) discard;
          float z = sqrt(max(0.0, 1.0 - r2));
          vec3 n = vec3(vUv, z);
          vec3 V = normalize(vWorldPos - uCamPos);
          vec3 behind = skySample(V, uSunDir, uSunColor, uTime, uCloudAmt);
          float fres = pow(1.0 - z, 2.2);
          vec3 interior = vec3(0.035, 0.045, 0.058);
          vec3 col = mix(interior, behind, fres * 0.92);
          float a = vSeed * 6.2831853;
          vec3 L = normalize(vec3(cos(a) * 0.42, 0.82, sin(a) * 0.42));
          float spec = pow(max(dot(n, L), 0.0), 90.0);
          col += uSunColor * spec * 1.3;
          float alpha = (0.15 + fres * 0.85) * vAlpha;
          alpha = clamp(alpha, 0.0, 0.80);
          if (alpha < 0.004) discard;
          outColor = vec4(col, alpha);
        }`,
    },
    ripple: {
      vs: `#version 300 es
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
        }`,
      fs: `#version 300 es
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
          vec3 col = vec3(0.45, 0.55, 0.72);
          outColor = vec4(col, alpha);
        }`,
    },
    crown: {
      vs: `#version 300 es
        layout(location=0) in vec3 aCyl;
        layout(location=1) in vec3 aInstPos;
        layout(location=2) in float aAge;
        layout(location=3) in float aStrength;
        layout(location=4) in float aSeed;
        uniform mat4 uVP;
        out float vAge;
        out float vH;
        out float vAng;
        out float vSeed;
        out vec3  vWorldPos;
        void main(){
          float e = clamp(aAge, 0.0, 1.0);
          float ang = atan(aCyl.z, aCyl.x);
          float sN1 = fract(sin(ang * 12.9898 + aSeed * 78.233) * 43758.5453);
          float sN2 = fract(sin(ang * 43.7000 + aSeed * 12.310) * 43758.5453);
          float spike = 0.55 + sN1 * 0.55 + sN2 * 0.25;
          float expand   = smoothstep(0.00, 0.28, e);
          float collapse = 1.0 - smoothstep(0.62, 1.00, e);
          float rimR = aStrength * 0.30 * expand * collapse;
          float h = aCyl.y;
          float rimH = aStrength * 0.14 * sin(e * 3.14159265) * spike;
          float r = rimR * mix(0.55, 1.00, h);
          float wobble = sin(ang * 6.0 + aSeed * 9.0 + e * 7.0) * 0.012 * aStrength;
          float y = h * rimH + wobble * h;
          vec3 wp = vec3(aInstPos.x + aCyl.x * r,
                         aInstPos.y + y,
                         aInstPos.z + aCyl.z * r);
          vWorldPos = wp;
          vAge = e;
          vH = h;
          vAng = ang;
          vSeed = aSeed;
          gl_Position = uVP * vec4(wp, 1.0);
        }`,
      fs: `#version 300 es
        precision highp float;
        in float vAge;
        in float vH;
        in float vAng;
        in float vSeed;
        in vec3  vWorldPos;
        out vec4 outColor;
        uniform vec3 uCamPos, uSunDir, uSunColor;
        uniform float uTime, uCloudAmt;
        ${GLSL_COMMON}
        ${GLSL_SKY_FN}
        void main(){
          float e = vAge;
          float baseFade = smoothstep(0.0, 0.18, vH);
          float rimGlow  = smoothstep(0.35, 1.00, vH);
          float sN = fract(sin(vAng * 12.9898 + vSeed * 78.233) * 43758.5453);
          float spikeMask = mix(0.35, 1.15, sN);
          float lifeFade = 1.0 - e;
          lifeFade *= lifeFade;
          float alpha = (0.10 + rimGlow * 0.55) * baseFade * lifeFade * spikeMask;
          alpha = clamp(alpha, 0.0, 0.62);
          if (alpha < 0.004) discard;
          vec3 outward = normalize(vec3(cos(vAng), 0.0, sin(vAng)));
          vec3 normal = normalize(outward + vec3(0.0, 0.35 * vH, 0.0));
          vec3 V = normalize(uCamPos - vWorldPos);
          float NdV = max(dot(normal, V), 0.0);
          float fres = 0.04 + 0.96 * pow(1.0 - NdV, 3.5);
          vec3 R = reflect(-V, normal);
          vec3 refl = R.y > 0.005
            ? skySample(R, uSunDir, uSunColor, uTime, uCloudAmt)
            : vec3(0.055, 0.065, 0.080);
          vec3 body = mix(vec3(0.030, 0.038, 0.050), vec3(0.28, 0.33, 0.40), rimGlow);
          vec3 col = mix(body, refl, clamp(fres * 0.95, 0.0, 1.0));
          vec3 Hv = normalize(uSunDir + V);
          float NdH = max(dot(normal, Hv), 0.0);
          col += uSunColor * pow(NdH, 120.0) * 0.9 * rimGlow;
          col += uSunColor * pow(NdH, 20.0) * 0.10 * rimGlow;
          outColor = vec4(col, alpha);
        }`,
    },
    jet: {
      vs: `#version 300 es
        layout(location=0) in vec2 aQuad;
        layout(location=1) in vec3 aInstPos;
        layout(location=2) in float aAge;
        layout(location=3) in float aStrength;
        layout(location=4) in float aSeed;
        uniform mat4 uVP;
        uniform vec3 uCamPos;
        out vec2  vUv;
        out float vAge;
        out float vStrength;
        void main(){
          float e = clamp(aAge, 0.0, 1.0);
          float jetH = aStrength * 0.30 * sin(pow(e, 0.65) * 3.14159265);
          float h = (aQuad.y + 1.0) * 0.5;
          float bottomR = aStrength * 0.040 * (1.0 - 0.45 * e);
          float topR    = aStrength * 0.010 * sin(e * 3.14159265);
          float r = mix(bottomR, topR, pow(h, 0.7));
          vec3 toCam = uCamPos - aInstPos;
          vec3 up = vec3(0.0, 1.0, 0.0);
          vec3 right = cross(up, toCam);
          float rl = length(right);
          right = rl > 1e-4 ? right / rl : vec3(1.0, 0.0, 0.0);
          vec3 wp = vec3(aInstPos.x, aInstPos.y, aInstPos.z)
                  + up    * (h * jetH)
                  + right * (aQuad.x * r);
          vUv = aQuad;
          vAge = e;
          vStrength = aStrength;
          gl_Position = uVP * vec4(wp, 1.0);
        }`,
      fs: `#version 300 es
        precision highp float;
        in vec2  vUv;
        in float vAge;
        in float vStrength;
        out vec4 outColor;
        uniform vec3 uCamPos, uSunDir, uSunColor;
        uniform float uTime, uCloudAmt;
        ${GLSL_COMMON}
        ${GLSL_SKY_FN}
        void main(){
          float x = vUv.x;
          float h = (vUv.y + 1.0) * 0.5;
          float profile = exp(-x * x * 7.0);
          float coreGlow = exp(-x * x * 40.0);
          float topFade = 1.0 - smoothstep(0.80, 1.00, h);
          float botFade = smoothstep(0.00, 0.10, h);
          float lifeFade = 1.0 - vAge;
          lifeFade *= lifeFade;
          float alpha = (profile * 0.55 + coreGlow * 0.55) * topFade * botFade * lifeFade;
          alpha *= vStrength;
          alpha = clamp(alpha, 0.0, 0.75);
          if (alpha < 0.004) discard;
          vec3 sky = skySample(vec3(0.0, 0.6, 0.8), uSunDir, uSunColor, uTime, uCloudAmt);
          vec3 col = mix(vec3(0.045, 0.055, 0.070), sky, 0.65);
          col += uSunColor * coreGlow * 0.35;
          outColor = vec4(col, alpha);
        }`,
    },
  };

  /* ============================================================
     MESH BUILDERS
     ============================================================ */
  function makeGrid(size, segs) {
    const half = size / 2, step = size / segs;
    const v = new Float32Array((segs + 1) * (segs + 1) * 3);
    let k = 0;
    for (let j = 0; j <= segs; j++) for (let i = 0; i <= segs; i++) {
      v[k++] = -half + i * step;
      v[k++] = 0;
      v[k++] = -half + j * step;
    }
    const idx = new Uint32Array(segs * segs * 6);
    let m = 0;
    for (let j = 0; j < segs; j++) for (let i = 0; i < segs; i++) {
      const a = j * (segs + 1) + i, b = a + 1, c = a + segs + 1, d = c + 1;
      idx[m++] = a; idx[m++] = c; idx[m++] = b;
      idx[m++] = b; idx[m++] = c; idx[m++] = d;
    }
    return { v, idx };
  }

  function makeCrownMesh(radialSegs, heightSegs) {
    const verts = [];
    const idx = [];
    for (let h = 0; h <= heightSegs; h++) {
      const y = h / heightSegs;
      for (let a = 0; a <= radialSegs; a++) {
        const ang = (a / radialSegs) * Math.PI * 2;
        verts.push(Math.cos(ang), y, Math.sin(ang));
      }
    }
    const ringSize = radialSegs + 1;
    for (let h = 0; h < heightSegs; h++) {
      for (let a = 0; a < radialSegs; a++) {
        const i0 = h * ringSize + a;
        const i1 = i0 + 1;
        const i2 = (h + 1) * ringSize + a;
        const i3 = i2 + 1;
        idx.push(i0, i2, i1);
        idx.push(i1, i2, i3);
      }
    }
    return { verts: new Float32Array(verts), idx: new Uint16Array(idx) };
  }

  /* ============================================================
     PROCEDURAL AUDIO
     ============================================================ */
  function createAudio() {
    let ctx = null, master = null;
    let rainGain = null, rainSrc = null;
    let windGain = null, windSrc = null;
    let enabled = true, started = false, targetLevel = 0.65;

    function init() {
      if (ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { enabled = false; return; }
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.42;
      master.connect(ctx.destination);

      const bufLen = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
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
      rainSrc.buffer = buf; rainSrc.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass'; rainFilter.frequency.value = 4200; rainFilter.Q.value = 0.6;
      const hs = ctx.createBiquadFilter();
      hs.type = 'highshelf'; hs.frequency.value = 6000; hs.gain.value = -8;
      const ls = ctx.createBiquadFilter();
      ls.type = 'lowshelf'; ls.frequency.value = 400; ls.gain.value = 3;
      rainGain = ctx.createGain(); rainGain.gain.value = 0;
      rainSrc.connect(rainFilter); rainFilter.connect(hs); hs.connect(ls);
      ls.connect(rainGain); rainGain.connect(master);

      const wBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const wData = wBuf.getChannelData(0);
      let w0 = 0, w1 = 0;
      for (let i = 0; i < bufLen; i++) {
        const white = Math.random() * 2 - 1;
        w0 = 0.99 * w0 + white * 0.01;
        w1 = 0.95 * w1 + white * 0.03;
        wData[i] = (w0 + w1) * 0.8;
      }
      windSrc = ctx.createBufferSource();
      windSrc.buffer = wBuf; windSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass'; windFilter.frequency.value = 180;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
    }

    return {
      start() {
        if (!enabled) return;
        init();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        if (!started) { rainSrc.start(); windSrc.start(); started = true; }
      },
      setRainLevel(level) {
        targetLevel = level;
        if (!ctx || !rainGain) return;
        rainGain.gain.setTargetAtTime(level * 0.65, ctx.currentTime, 0.25);
        windGain.gain.setTargetAtTime(level * 0.15, ctx.currentTime, 0.35);
      },
      dropImpact(intensity) {
        if (!enabled || !ctx || !started) return;
        const now = ctx.currentTime;
        const dur = 0.02 + Math.random() * 0.03;
        const bufLen = Math.max(32, Math.floor(ctx.sampleRate * dur));
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          const t = i / bufLen;
          data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 12.0);
        }
        const src = ctx.createBufferSource(); src.buffer = buf;
        src.playbackRate.value = 0.9 + Math.random() * 0.6;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 2500; bp.Q.value = 2.5;
        const g = ctx.createGain(); g.gain.value = 0.015 + intensity * 0.035;
        src.connect(bp); bp.connect(g); g.connect(master);
        src.start(now); src.stop(now + dur + 0.02);
      },
      splash(force) {
        if (!enabled || !ctx || !started) return;
        const now = ctx.currentTime;
        const dur = 0.08 + Math.min(force, 3.0) * 0.05;
        const bufLen = Math.max(64, Math.floor(ctx.sampleRate * dur));
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          const t = i / bufLen;
          data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 7.0) * (1.0 - t);
        }
        const src = ctx.createBufferSource(); src.buffer = buf;
        src.playbackRate.value = 0.85 + Math.random() * 0.45;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 320 + Math.min(force, 3) * 260 + Math.random() * 200;
        bp.Q.value = 1.2;
        const g = ctx.createGain();
        g.gain.value = Math.min(0.32, 0.06 + force * 0.05);
        src.connect(bp); bp.connect(g); g.connect(master);
        src.start(now); src.stop(now + dur + 0.05);
      },
      setEnabled(on) {
        enabled = on;
        if (!ctx) return;
        if (on) {
          if (ctx.state === 'suspended') ctx.resume();
          if (rainGain) rainGain.gain.setTargetAtTime(targetLevel * 0.65, ctx.currentTime, 0.15);
          if (windGain) windGain.gain.setTargetAtTime(targetLevel * 0.15, ctx.currentTime, 0.15);
        } else {
          if (rainGain) rainGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.15);
          if (windGain) windGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.15);
        }
      },
    };
  }

  /* ============================================================
     STORM RAIN
     ============================================================ */
  const OPTIONS = {
    rainCount: 4500,
    rainLevel: 1.0,
    sunDir:    [0.55, 0.20, 0.55],
    sunColor:  [1.00, 0.88, 0.70],
    wind:      [0.55, 0.18],
    groundSize: 500,
    groundSegs: 100,
    layers: { sky: true, clouds: true, ground: true, rain: true, splash: true, sound: true },
    player: {
      startPos: [0, 0, 10],
      eyeHeight: 1.65,
      walkSpeed: 3.2,
      runSpeed: 7.0,
      jumpSpeed: 5.2,
    },
  };

  class StormRain {
    constructor(canvas, options) {
      this.opt = options || OPTIONS;
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
      if (!this.gl) throw new Error('rain.js: WebGL2 required');

      this._time = 0;
      this._running = false;

      this.proj = M4(); this.view = M4(); this.vp = M4(); this.invVP = M4();

      const sd = this.opt.sunDir;
      const sl = Math.hypot(sd[0], sd[1], sd[2]) || 1;
      this.sunDir = [sd[0] / sl, sd[1] / sl, sd[2] / sl];
      this.sunColor = this.opt.sunColor;
      this.wind = this.opt.wind;

      this.layers = Object.assign({}, this.opt.layers);
      this.rainLevel = this.opt.rainLevel;

      this._initPrograms();
      this._initBaseQuad();
      this._initSky();
      this._initGround();
      this._initCrownMesh();
      this._initRain();
      this._initSplash();
      this._initRipple();
      this._initCrowns();
      this._initJets();
      this._initPlayer();
      this._initInput();

      this.audio = createAudio();
      this.nextDropSound = 0;

      this._resize = this._resize.bind(this);
      window.addEventListener('resize', this._resize);
      this._resize();
    }

    /* --- init --- */
    _initPrograms() {
      const gl = this.gl;
      this.progSky    = linkProgram(gl, SHADERS.sky.vs,    SHADERS.sky.fs);
      this.progGround = linkProgram(gl, SHADERS.ground.vs, SHADERS.ground.fs);
      this.progRain   = linkProgram(gl, SHADERS.rain.vs,   SHADERS.rain.fs);
      this.progSplash = linkProgram(gl, SHADERS.splash.vs, SHADERS.splash.fs);
      this.progRipple = linkProgram(gl, SHADERS.ripple.vs, SHADERS.ripple.fs);
      this.progCrown  = linkProgram(gl, SHADERS.crown.vs,  SHADERS.crown.fs);
      this.progJet    = linkProgram(gl, SHADERS.jet.vs,    SHADERS.jet.fs);
    }
    _initBaseQuad() {
      const gl = this.gl;
      this.baseQuadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.baseQuadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    }
    _initSky() {
      const gl = this.gl;
      this.skyVAO = gl.createVertexArray();
      gl.bindVertexArray(this.skyVAO);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
    }
    _initGround() {
      const gl = this.gl;
      this.groundMesh = makeGrid(this.opt.groundSize, this.opt.groundSegs);
      this.groundVAO = gl.createVertexArray();
      gl.bindVertexArray(this.groundVAO);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, this.groundMesh.v, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.groundMesh.idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
    }
    _initCrownMesh() {
      this.crownMesh = makeCrownMesh(28, 5);
    }
    _initRain() {
      const gl = this.gl;
      const N = this.opt.rainCount;
      const FLOATS = 9;
      this.rainCount = N;
      this.rainHalf = 55;
      this.rainTop = 22;
      this.rainFloor = 0;
      this.rainData = new Float32Array(N * FLOATS);
      this.drops = new Array(N);
      for (let i = 0; i < N; i++) this._spawnDrop(i, 0, 0, true);

      this.rainVAO = gl.createVertexArray();
      gl.bindVertexArray(this.rainVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.baseQuadBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const rb = gl.createBuffer();
      this.rainBuf = rb;
      gl.bindBuffer(gl.ARRAY_BUFFER, rb);
      gl.bufferData(gl.ARRAY_BUFFER, this.rainData, gl.DYNAMIC_DRAW);
      const S = FLOATS * 4;
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 0);  gl.vertexAttribDivisor(1, 1);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 12); gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, S, 24); gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, S, 32); gl.vertexAttribDivisor(4, 1);
      gl.bindVertexArray(null);
    }
    _initSplash() {
      const gl = this.gl;
      this.splashMax = 900;
      this.splashFloats = 6;
      this.splashData = new Float32Array(this.splashMax * this.splashFloats);
      this.splash = [];
      for (let i = 0; i < this.splashMax; i++) {
        this.splash.push({ x: 0, y: -1, z: 0, vx: 0, vy: 0, vz: 0, size: 0, life: 0, maxLife: 1, active: false, seed: 0 });
      }
      this.splashCursor = 0;
      this.splashVAO = gl.createVertexArray();
      gl.bindVertexArray(this.splashVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.baseQuadBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const sb = gl.createBuffer();
      this.splashBuf = sb;
      gl.bindBuffer(gl.ARRAY_BUFFER, sb);
      gl.bufferData(gl.ARRAY_BUFFER, this.splashData, gl.DYNAMIC_DRAW);
      const S = this.splashFloats * 4;
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 0);  gl.vertexAttribDivisor(1, 1);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, S, 12); gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 16); gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, S, 20); gl.vertexAttribDivisor(4, 1);
      gl.bindVertexArray(null);
    }
    _initRipple() {
      const gl = this.gl;
      this.rippleMax = 80;
      this.rippleFloats = 4;
      this.rippleData = new Float32Array(this.rippleMax * this.rippleFloats);
      this.ripples = [];
      for (let i = 0; i < this.rippleMax; i++) this.ripples.push({ x: 0, z: 0, age: 0, strength: 0, active: false });
      this.rippleCursor = 0;
      this.rippleVAO = gl.createVertexArray();
      gl.bindVertexArray(this.rippleVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.baseQuadBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const b = gl.createBuffer();
      this.rippleBuf = b;
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, this.rippleData, gl.DYNAMIC_DRAW);
      const S = this.rippleFloats * 4;
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 0);  gl.vertexAttribDivisor(1, 1);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, S, 12); gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 16); gl.vertexAttribDivisor(3, 1);
      gl.bindVertexArray(null);
    }
    _initCrowns() {
      const gl = this.gl;
      this.crownMax = 220;
      this.crownFloats = 6;
      this.crownData = new Float32Array(this.crownMax * this.crownFloats);
      this.crowns = [];
      for (let i = 0; i < this.crownMax; i++) this.crowns.push({ x: 0, z: 0, age: 0, strength: 0, active: false, seed: 0 });
      this.crownCursor = 0;
      this.crownVAO = gl.createVertexArray();
      gl.bindVertexArray(this.crownVAO);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, this.crownMesh.verts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.crownMesh.idx, gl.STATIC_DRAW);
      const inst = gl.createBuffer();
      this.crownInstBuf = inst;
      gl.bindBuffer(gl.ARRAY_BUFFER, inst);
      gl.bufferData(gl.ARRAY_BUFFER, this.crownData, gl.DYNAMIC_DRAW);
      const S = this.crownFloats * 4;
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 0);  gl.vertexAttribDivisor(1, 1);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, S, 12); gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 16); gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, S, 20); gl.vertexAttribDivisor(4, 1);
      gl.bindVertexArray(null);
    }
    _initJets() {
      const gl = this.gl;
      this.jetMax = 220;
      this.jetFloats = 6;
      this.jetData = new Float32Array(this.jetMax * this.jetFloats);
      this.jets = [];
      for (let i = 0; i < this.jetMax; i++) this.jets.push({ x: 0, z: 0, age: 0, strength: 0, active: false, seed: 0 });
      this.jetCursor = 0;
      this.jetVAO = gl.createVertexArray();
      gl.bindVertexArray(this.jetVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.baseQuadBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const b = gl.createBuffer();
      this.jetBuf = b;
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, this.jetData, gl.DYNAMIC_DRAW);
      const S = this.jetFloats * 4;
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 0);  gl.vertexAttribDivisor(1, 1);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, S, 12); gl.vertexAttribDivisor(2, 1);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 16); gl.vertexAttribDivisor(3, 1);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, S, 20); gl.vertexAttribDivisor(4, 1);
      gl.bindVertexArray(null);
    }
    _initPlayer() {
      const p = this.opt.player;
      this.player = {
        pos: p.startPos.slice(),
        yaw: 0, pitch: -0.05,
        vy: 0, onGround: true,
        eyeHeight: p.eyeHeight,
        walkSpeed: p.walkSpeed,
        runSpeed: p.runSpeed,
        jumpSpeed: p.jumpSpeed,
      };
      this.step = { accum: 0, side: 0, bobPhase: 0 };
      this.keys = {};
    }
    _initInput() {
      const canvas = this.canvas;
      const onMove = (e) => {
        if (document.pointerLockElement !== canvas) return;
        this.player.yaw   -= (e.movementX || 0) * 0.003;
        this.player.pitch -= (e.movementY || 0) * 0.003;
        this.player.pitch = Math.max(-1.45, Math.min(1.45, this.player.pitch));
      };
      canvas.addEventListener('mousemove', onMove);
      window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }
    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.gl.viewport(0, 0, w, h);
    }

    /* --- spawning --- */
    _spawnDrop(i, camX, camZ, initial) {
      const r = Math.random();
      let L, W, fall, seed;
      if (r < 0.06)      { L = 0.70 + Math.random() * 0.55; W = 0.011 + Math.random() * 0.007; fall = 7.0 + Math.random() * 2.5; seed = 0.55 + Math.random() * 0.45; }
      else if (r < 0.30) { L = 0.40 + Math.random() * 0.35; W = 0.007 + Math.random() * 0.005; fall = 6.0 + Math.random() * 2.0; seed = 0.7 + Math.random() * 0.6; }
      else               { L = 0.20 + Math.random() * 0.22; W = 0.004 + Math.random() * 0.003; fall = 5.0 + Math.random() * 1.8; seed = 0.45 + Math.random() * 0.5; }
      const x = camX + (Math.random() * 2 - 1) * this.rainHalf;
      const z = camZ + (Math.random() * 2 - 1) * this.rainHalf;
      const y = initial
        ? this.rainFloor + Math.random() * (this.rainTop - this.rainFloor)
        : this.rainTop - Math.random() * 1.5;
      const windX = this.wind[0] * 0.9 + Math.random() * 0.3;
      const windZ = this.wind[1] * 0.9 + Math.random() * 0.15;
      this.drops[i] = { x, y, z, vx: windX, vy: -fall, vz: windZ, length: L, width: W, seed };
    }
    _spawnRipple(x, z, s) {
      const r = this.ripples[this.rippleCursor];
      this.rippleCursor = (this.rippleCursor + 1) % this.rippleMax;
      r.x = x; r.z = z; r.age = 0; r.strength = s; r.active = true;
    }
    _spawnCrown(x, z, s) {
      const c = this.crowns[this.crownCursor];
      this.crownCursor = (this.crownCursor + 1) % this.crownMax;
      c.x = x; c.z = z; c.age = 0;
      c.strength = Math.min(s, 3.0);
      c.seed = Math.random();
      c.active = true;
    }
    _spawnJet(x, z, s) {
      const j = this.jets[this.jetCursor];
      this.jetCursor = (this.jetCursor + 1) % this.jetMax;
      j.x = x; j.z = z; j.age = 0;
      j.strength = Math.min(s, 3.0);
      j.seed = Math.random();
      j.active = true;
    }
    _spawnSpatter(x, z, force) {
      const count = Math.max(3, Math.floor(3 + force * 4));
      for (let i = 0; i < count; i++) {
        const s = this.splash[this.splashCursor];
        this.splashCursor = (this.splashCursor + 1) % this.splashMax;
        const ang = Math.random() * Math.PI * 2;
        const rimR = 0.10 + Math.random() * 0.20;
        s.x = x + Math.cos(ang) * rimR;
        s.y = 0.02 + Math.random() * 0.08;
        s.z = z + Math.sin(ang) * rimR;
        const outward = force * (1.0 + Math.random() * 1.4);
        const upward  = force * (0.30 + Math.random() * 0.55);
        s.vx = Math.cos(ang) * outward;
        s.vy = upward;
        s.vz = Math.sin(ang) * outward;
        s.size = 0.005 + Math.random() * 0.010;
        s.maxLife = 0.18 + Math.random() * 0.22;
        s.life = s.maxLife;
        s.seed = Math.random();
        s.active = true;
      }
    }
    _impact(x, z, force) {
      force = Math.min(force, 3.2);
      this._spawnCrown(x, z, force);
      this._spawnJet(x, z, force * 0.85);
      this._spawnRipple(x, z, force * 0.9);
      this._spawnSpatter(x, z, force);
    }

    /* --- simulation --- */
    _updateCamera(dt) {
      const p = this.player;
      const keys = this.keys;
      const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
      const cy = Math.cos(p.yaw),   sy = Math.sin(p.yaw);
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
        speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? p.runSpeed : p.walkSpeed;
        vx = vx / l * speed;
        vz = vz / l * speed;
      }

      const oldX = p.pos[0], oldZ = p.pos[2];
      p.pos[0] += vx * dt;
      p.pos[2] += vz * dt;

      p.vy -= 22 * dt;
      p.pos[1] += p.vy * dt;

      let justLanded = false, landingForce = 0;
      if (p.pos[1] <= 0) {
        if (!p.onGround && p.vy < -1.0) {
          justLanded = true;
          landingForce = Math.min(4.5, -p.vy * 0.55);
        }
        p.pos[1] = 0; p.vy = 0; p.onGround = true;
      } else {
        p.onGround = false;
      }

      if (keys['Space'] && p.onGround) {
        p.vy = p.jumpSpeed;
        p.onGround = false;
      }

      const moveDist = Math.hypot(p.pos[0] - oldX, p.pos[2] - oldZ);
      const st = this.step;
      if (p.onGround && moveDist > 0.0001) {
        st.accum += moveDist;
        const stride = 0.55 + speed * 0.055;
        if (st.accum >= stride) {
          st.accum -= stride;
          st.side = 1 - st.side;
          const lateralSign = st.side === 0 ? -1 : 1;
          const footX = p.pos[0] + rx * lateralSign * 0.18;
          const footZ = p.pos[2] + rz * lateralSign * 0.18;
          const force = (speed > p.walkSpeed + 0.1) ? 1.7 : 0.95;
          this._impact(footX, footZ, force);
          this.audio.splash(force);
        }
      } else if (speed < 0.1) {
        st.accum = Math.min(st.accum, (0.55 + speed * 0.055) * 0.5);
      }

      if (justLanded && landingForce > 0.5) {
        this._impact(p.pos[0], p.pos[2], landingForce);
        this.audio.splash(landingForce * 1.1);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + Math.random() * 0.6;
          const rr = 0.22 + Math.random() * 0.28;
          this._impact(p.pos[0] + Math.cos(a) * rr, p.pos[2] + Math.sin(a) * rr, landingForce * 0.55);
        }
      }

      if (p.onGround && speed > 0.3) {
        st.bobPhase += dt * (speed > p.walkSpeed + 0.1 ? 9.5 : 6.5);
      } else {
        st.bobPhase += dt * 2.0;
      }
      const bobAmp = (speed > p.walkSpeed + 0.1 ? 0.035 : 0.022) * (speed > 0.1 ? 1 : 0);
      const bobY = Math.sin(st.bobPhase) * bobAmp;
      const bobX = Math.cos(st.bobPhase * 0.5) * bobAmp * 0.6;

      const cx = p.pos[0] + rx * bobX;
      const cz = p.pos[2] + rz * bobX;
      const cy2 = p.pos[1] + p.eyeHeight + bobY;

      m4lookAt(this.view, cx, cy2, cz, cx + fwd[0], cy2 + fwd[1], cz + fwd[2], 0, 1, 0);
      return [cx, cy2, cz];
    }
    _updateRain(dt, camX, camZ, time) {
      const N = this.rainCount;
      const half = this.rainHalf;
      for (let i = 0; i < N; i++) {
        const d = this.drops[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;

        if (d.y <= this.rainFloor) {
          const dx = d.x - camX, dz = d.z - camZ;
          const d2 = dx * dx + dz * dz;
          if (d2 < 400) {
            if (Math.random() < 0.06) this._spawnRipple(d.x, d.z, 0.25 + Math.random() * 0.35);
            if (Math.random() < 0.012) this._spawnCrown(d.x, d.z, 0.18 + Math.random() * 0.18);
          }
          this._spawnDrop(i, camX, camZ, false);
          continue;
        }
        if (d.x < camX - half) d.x += half * 2;
        if (d.x > camX + half) d.x -= half * 2;
        if (d.z < camZ - half) d.z += half * 2;
        if (d.z > camZ + half) d.z -= half * 2;
      }
      if (this.layers.sound && this.layers.rain && time > this.nextDropSound) {
        this.audio.dropImpact(this.rainLevel * (0.5 + Math.random() * 0.6));
        this.nextDropSound = time + 0.04 + Math.random() * 0.05;
      }
    }
    _updateSplashes(dt) {
      const drag = Math.exp(-3.4 * dt);
      for (let i = 0; i < this.splashMax; i++) {
        const s = this.splash[i];
        if (!s.active) continue;
        s.vy -= 9.81 * dt;
        s.vx *= drag; s.vz *= drag;
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        s.life -= dt;
        if (s.life <= 0 || (s.y <= 0 && s.vy < 0)) { s.active = false; s.y = -1; }
      }
    }
    _updateRipples(dt) {
      for (let i = 0; i < this.rippleMax; i++) {
        const r = this.ripples[i];
        if (!r.active) continue;
        r.age += dt * 0.85;
        if (r.age >= 1) r.active = false;
      }
    }
    _updateCrowns(dt) {
      for (let i = 0; i < this.crownMax; i++) {
        const c = this.crowns[i];
        if (!c.active) continue;
        c.age += dt * 4.2;
        if (c.age >= 1) c.active = false;
      }
    }
    _updateJets(dt) {
      for (let i = 0; i < this.jetMax; i++) {
        const j = this.jets[i];
        if (!j.active) continue;
        j.age += dt * 4.2;
        if (j.age >= 1) j.active = false;
      }
    }

    /* --- buffer writers --- */
    _writeRain() {
      const d = this.rainData;
      let k = 0;
      for (let i = 0; i < this.rainCount; i++) {
        const s = this.drops[i];
        d[k++] = s.x; d[k++] = s.y; d[k++] = s.z;
        d[k++] = s.vx; d[k++] = s.vy; d[k++] = s.vz;
        d[k++] = s.length; d[k++] = s.width; d[k++] = s.seed;
      }
    }
    _writeSplash() {
      const d = this.splashData;
      let k = 0;
      for (let i = 0; i < this.splashMax; i++) {
        const s = this.splash[i];
        const t = s.active ? Math.max(0, s.life / s.maxLife) : 0;
        const a = s.active ? Math.pow(t, 1.15) : 0;
        const sz = s.active ? s.size * (0.85 + 0.25 * t) : 0;
        d[k++] = s.x; d[k++] = Math.max(s.y, -1); d[k++] = s.z;
        d[k++] = sz; d[k++] = a; d[k++] = s.seed;
      }
    }
    _writeRipples() {
      const d = this.rippleData;
      let k = 0;
      for (let i = 0; i < this.rippleMax; i++) {
        const r = this.ripples[i];
        d[k++] = r.x; d[k++] = 0; d[k++] = r.z;
        d[k++] = r.active ? Math.min(r.age, 1) : 1;
        d[k++] = r.active ? r.strength : 0;
      }
    }
    _writeCrowns() {
      const d = this.crownData;
      let k = 0;
      for (let i = 0; i < this.crownMax; i++) {
        const c = this.crowns[i];
        d[k++] = c.x; d[k++] = 0; d[k++] = c.z;
        d[k++] = c.active ? Math.min(c.age, 1) : 1;
        d[k++] = c.active ? c.strength : 0;
        d[k++] = c.seed;
      }
    }
    _writeJets() {
      const d = this.jetData;
      let k = 0;
      for (let i = 0; i < this.jetMax; i++) {
        const j = this.jets[i];
        d[k++] = j.x; d[k++] = 0; d[k++] = j.z;
        d[k++] = j.active ? Math.min(j.age, 1) : 1;
        d[k++] = j.active ? j.strength : 0;
        d[k++] = j.seed;
      }
    }

    /* --- main frame --- */
    _frame(now) {
      if (!this._running) return;
      this._rafId = requestAnimationFrame(this._frameBound);

      const dt = Math.min((now - this._lastT) / 1000, 0.05);
      this._lastT = now;
      this._time += dt;
      const time = this._time;

      const gl = this.gl;
      const cam = this._updateCamera(dt);

      this._updateRain(dt, cam[0], cam[2], time);
      this._updateSplashes(dt);
      this._updateRipples(dt);
      this._updateCrowns(dt);
      this._updateJets(dt);

      const rainI = this.layers.rain ? this.rainLevel : 0;
      this.audio.setRainLevel(this.layers.sound ? this.rainLevel : 0);

      m4perspective(this.proj, 62 * Math.PI / 180, this.canvas.width / this.canvas.height, 0.1, 600);
      m4mul(this.vp, this.proj, this.view);
      m4invert(this.invVP, this.vp);

      /* sky */
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.BLEND);
      gl.clearColor(0.06, 0.07, 0.09, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      let s = this.progSky;
      gl.useProgram(s.p);
      gl.uniformMatrix4fv(s.u.uInvVP, false, this.invVP);
      gl.uniform3fv(s.u.uSunDir, this.sunDir);
      gl.uniform3fv(s.u.uSunColor, this.sunColor);
      gl.uniform3f(s.u.uCamPos, cam[0], cam[1], cam[2]);
      gl.uniform1f(s.u.uTime, time);
      gl.uniform1f(s.u.uRainIntensity, rainI);
      gl.uniform1f(s.u.uCloudAmt, this.layers.clouds ? 1 : 0);
      gl.uniform1f(s.u.uSkyOn, this.layers.sky ? 1 : 0);
      gl.bindVertexArray(this.skyVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);

      /* ground */
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      if (this.layers.ground) {
        const g = this.progGround;
        gl.useProgram(g.p);
        gl.uniformMatrix4fv(g.u.uVP, false, this.vp);
        gl.uniform2f(g.u.uGridOffset, cam[0], cam[2]);
        gl.uniform1f(g.u.uTime, time);
        gl.uniform1f(g.u.uRainIntensity, rainI);
        gl.uniform1f(g.u.uCloudAmt, this.layers.clouds ? 1 : 0);
        gl.uniform3f(g.u.uCamPos, cam[0], cam[1], cam[2]);
        gl.uniform3fv(g.u.uSunDir, this.sunDir);
        gl.uniform3fv(g.u.uSunColor, this.sunColor);
        gl.bindVertexArray(this.groundVAO);
        gl.drawElements(gl.TRIANGLES, this.groundMesh.idx.length, gl.UNSIGNED_INT, 0);
        gl.bindVertexArray(null);
      }

      /* blended */
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);

      if (this.layers.ground && this.layers.rain) {
        this._writeRipples();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.rippleBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.rippleData);
        const p = this.progRipple;
        gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uVP, false, this.vp);
        gl.bindVertexArray(this.rippleVAO);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.rippleMax);
        gl.bindVertexArray(null);
      }

      if (this.layers.ground && this.layers.splash) {
        this._writeCrowns();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.crownInstBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.crownData);
        const p = this.progCrown;
        gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uVP, false, this.vp);
        gl.uniform3f(p.u.uCamPos, cam[0], cam[1], cam[2]);
        gl.uniform3fv(p.u.uSunDir, this.sunDir);
        gl.uniform3fv(p.u.uSunColor, this.sunColor);
        gl.uniform1f(p.u.uTime, time);
        gl.uniform1f(p.u.uCloudAmt, this.layers.clouds ? 1 : 0);
        gl.bindVertexArray(this.crownVAO);
        gl.drawElementsInstanced(gl.TRIANGLES, this.crownMesh.idx.length, gl.UNSIGNED_SHORT, 0, this.crownMax);
        gl.bindVertexArray(null);
      }

      if (this.layers.splash) {
        this._writeJets();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.jetBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.jetData);
        const p = this.progJet;
        gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uVP, false, this.vp);
        gl.uniform3f(p.u.uCamPos, cam[0], cam[1], cam[2]);
        gl.uniform3fv(p.u.uSunDir, this.sunDir);
        gl.uniform3fv(p.u.uSunColor, this.sunColor);
        gl.uniform1f(p.u.uTime, time);
        gl.uniform1f(p.u.uCloudAmt, this.layers.clouds ? 1 : 0);
        gl.bindVertexArray(this.jetVAO);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.jetMax);
        gl.bindVertexArray(null);
      }

      if (this.layers.rain) {
        this._writeRain();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.rainBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.rainData);
        const p = this.progRain;
        gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uVP, false, this.vp);
        gl.uniform3f(p.u.uCamPos, cam[0], cam[1], cam[2]);
        gl.uniform3fv(p.u.uSunDir, this.sunDir);
        gl.uniform3fv(p.u.uSunColor, this.sunColor);
        gl.uniform1f(p.u.uTime, time);
        gl.uniform1f(p.u.uRainIntensity, this.rainLevel);
        gl.uniform1f(p.u.uCloudAmt, this.layers.clouds ? 1 : 0);
        gl.bindVertexArray(this.rainVAO);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.rainCount);
        gl.bindVertexArray(null);
      }

      if (this.layers.splash) {
        this._writeSplash();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.splashBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.splashData);
        const p = this.progSplash;
        gl.useProgram(p.p);
        gl.uniformMatrix4fv(p.u.uVP, false, this.vp);
        gl.uniform3f(p.u.uCamPos, cam[0], cam[1], cam[2]);
        gl.uniform3fv(p.u.uSunDir, this.sunDir);
        gl.uniform3fv(p.u.uSunColor, this.sunColor);
        gl.uniform1f(p.u.uTime, time);
        gl.uniform1f(p.u.uCloudAmt, this.layers.clouds ? 1 : 0);
        gl.bindVertexArray(this.splashVAO);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.splashMax);
        gl.bindVertexArray(null);
      }

      gl.depthMask(true);
    }

    /* --- public --- */
    start() {
      if (this._running) return this;
      this._running = true;
      this._lastT = performance.now();
      this._frameBound = (now) => this._frame(now);
      this._rafId = requestAnimationFrame(this._frameBound);
      return this;
    }
    stop() {
      this._running = false;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = null;
      return this;
    }
    setLayer(name, on) {
      if (name in this.layers) {
        this.layers[name] = !!on;
        if (name === 'sound') this.audio.setEnabled(!!on);
      }
      return this;
    }
    setRainLevel(level) {
      this.rainLevel = Math.max(0, Math.min(2, +level));
      return this;
    }
  }

  /* ============================================================
     BOOTSTRAP — inject canvas, styles, UI, hint, and start
     ============================================================ */
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

    const storm = new StormRain(canvas, OPTIONS);
    storm.start();

    createUI(storm, (lvl) => {
      if (stateEl) stateEl.textContent = 'Heavy · ' + Math.round(lvl * 100) + '%';
    });

    createClickHint(() => {
      storm.audio.start();
      storm.audio.setEnabled(storm.layers.sound);
      if (canvas.requestPointerLock) canvas.requestPointerLock();
    });

    window.StormRain = storm;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();