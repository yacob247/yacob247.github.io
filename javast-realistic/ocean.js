/* ============================================================
   ABYSS OCEAN ENGINE — standalone
   Include with: <script src="ocean.js"></script>
   Optional config (set before the script tag):
     window.AbyssOcean = { canvasId: 'my-canvas', fishCount: 100 };
   ============================================================ */
(function () {
'use strict';

/* ============================================================
   CANVAS & GL — auto-creates a fullscreen canvas if missing
   ============================================================ */
const OPTS = Object.assign({
  canvasId:  'ocean-canvas',
  fishCount: 150,
}, window.AbyssOcean || {});

let canvas = document.getElementById(OPTS.canvasId);
if (!canvas) {
  canvas = document.createElement('canvas');
  canvas.id = OPTS.canvasId;
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:0';
  document.body.appendChild(canvas);
}

const gl = canvas.getContext('webgl2', {
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
if (!gl) {
  console.error('[Abyss Ocean] WebGL2 not supported in this browser.');
  return;
}

/* ============================================================
   MATRICES
   ============================================================ */
const M4 = () => new Float32Array(16);
function m4perspective(o, fovy, asp, n, f) {
  const t = 1/Math.tan(fovy/2);
  o[0]=t/asp;o[1]=0;o[2]=0;o[3]=0;
  o[4]=0;o[5]=t;o[6]=0;o[7]=0;
  o[8]=0;o[9]=0;o[10]=(f+n)/(n-f);o[11]=-1;
  o[12]=0;o[13]=0;o[14]=2*f*n/(n-f);o[15]=0;
  return o;
}
function m4lookAt(o, ex,ey,ez, cx,cy,cz, ux,uy,uz) {
  let zx=ex-cx, zy=ey-cy, zz=ez-cz;
  let l=Math.hypot(zx,zy,zz); zx/=l; zy/=l; zz/=l;
  let xx=uy*zz-uz*zy, xy=uz*zx-ux*zz, xz=ux*zy-uy*zx;
  l=Math.hypot(xx,xy,xz); xx/=l; xy/=l; xz/=l;
  let yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
  o[0]=xx;o[1]=yx;o[2]=zx;o[3]=0;
  o[4]=xy;o[5]=yy;o[6]=zy;o[7]=0;
  o[8]=xz;o[9]=yz;o[10]=zz;o[11]=0;
  o[12]=-(xx*ex+xy*ey+xz*ez);
  o[13]=-(yx*ex+yy*ey+yz*ez);
  o[14]=-(zx*ex+zy*ey+zz*ez);
  o[15]=1;
  return o;
}
function m4mul(o, a, b) {
  for (let i=0;i<4;i++){
    const a0=a[i],a1=a[i+4],a2=a[i+8],a3=a[i+12];
    o[i]    = a0*b[0]+a1*b[1]+a2*b[2]+a3*b[3];
    o[i+4]  = a0*b[4]+a1*b[5]+a2*b[6]+a3*b[7];
    o[i+8]  = a0*b[8]+a1*b[9]+a2*b[10]+a3*b[11];
    o[i+12] = a0*b[12]+a1*b[13]+a2*b[14]+a3*b[15];
  }
  return o;
}
function m4invert(o, a) {
  const a00=a[0],a01=a[1],a02=a[2],a03=a[3];
  const a10=a[4],a11=a[5],a12=a[6],a13=a[7];
  const a20=a[8],a21=a[9],a22=a[10],a23=a[11];
  const a30=a[12],a31=a[13],a32=a[14],a33=a[15];
  const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10;
  const b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12;
  const b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30;
  const b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
  let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
  if (!det) return o;
  det = 1/det;
  o[0]=(a11*b11-a12*b10+a13*b09)*det;
  o[1]=(a02*b10-a01*b11-a03*b09)*det;
  o[2]=(a31*b05-a32*b04+a33*b03)*det;
  o[3]=(a22*b04-a21*b05-a23*b03)*det;
  o[4]=(a12*b08-a10*b11-a13*b07)*det;
  o[5]=(a00*b11-a02*b08+a03*b07)*det;
  o[6]=(a32*b02-a30*b05-a33*b01)*det;
  o[7]=(a20*b05-a22*b02+a23*b01)*det;
  o[8]=(a10*b10-a11*b08+a13*b06)*det;
  o[9]=(a01*b08-a00*b10-a03*b06)*det;
  o[10]=(a30*b04-a31*b02+a33*b00)*det;
  o[11]=(a21*b02-a20*b04-a23*b00)*det;
  o[12]=(a11*b07-a10*b09-a12*b06)*det;
  o[13]=(a00*b09-a01*b07+a02*b06)*det;
  o[14]=(a31*b01-a30*b03-a32*b00)*det;
  o[15]=(a20*b03-a21*b01+a22*b00)*det;
  return o;
}

/* ============================================================
   SHADER UTIL
   ============================================================ */
function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s), src);
    throw new Error('shader compile failed');
  }
  return s;
}
function link(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(p));
    throw new Error('link failed');
  }
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const name = info.name.replace('[0]','');
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

/* ============================================================
   SHARED GLSL
   ============================================================ */
const GLSL_NOISE = `
  float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),
               mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);
  }
  float fbm2(vec2 p){ return 0.55*vnoise(p)+0.30*vnoise(p*2.07+vec2(5.2,1.3))+0.15*vnoise(p*4.13+vec2(1.7,9.1)); }
  float fbm3(vec2 p){ return 0.5*vnoise(p)+0.25*vnoise(p*2.11+vec2(3.1,7.7))+0.15*vnoise(p*4.23+vec2(8.3,1.9))+0.10*vnoise(p*8.37+vec2(2.7,4.4)); }
`;

const GLSL_SKY = `
  vec3 skyColor(vec3 d, vec3 sunDir, vec3 sunColor) {
    float y=d.y;
    vec3 zenith=vec3(0.11,0.29,0.63), horizon=vec3(0.74,0.83,0.92), below=vec3(0.02,0.05,0.10);
    vec3 s = y>=0.0 ? mix(horizon,zenith,pow(y,0.55)) : mix(horizon,below,pow(-y,0.6));
    float sd = max(dot(d,sunDir),0.0);
    s += sunColor*pow(sd,2000.0)*12.0;
    s += sunColor*pow(sd,24.0)*0.28;
    s += sunColor*pow(sd,6.0)*0.10;
    return s;
  }`;

/* ============================================================
   SKY
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
  uniform float uTime, uUnderwater;
  ${GLSL_NOISE}
  void main(){
    vec4 nh = uInvVP * vec4(vNdc, -1.0, 1.0);
    vec4 fh = uInvVP * vec4(vNdc,  1.0, 1.0);
    vec3 dir = normalize(fh.xyz/fh.w - nh.xyz/nh.w);
    vec3 zenith=vec3(0.11,0.29,0.63), horizon=vec3(0.74,0.83,0.92), below=vec3(0.02,0.05,0.10);
    float y = dir.y;
    vec3 col = y>=0.0 ? mix(horizon,zenith,pow(y,0.55)) : mix(horizon,below,pow(-y,0.6));
    float sd = max(dot(dir,uSunDir),0.0);
    col += uSunColor*pow(sd,2000.0)*12.0;
    col += uSunColor*pow(sd,24.0)*0.28;
    col += uSunColor*pow(sd,6.0)*0.10;
    if (y>0.02 && uUnderwater<0.5) {
      vec2 uv = dir.xz/(y+0.18)*0.85 + uTime*0.006;
      float c1 = fbm2(uv*1.4);
      float c2 = fbm2(uv*3.1+vec2(4.7,2.1));
      float cloud = smoothstep(0.52,0.82,c1*0.65+c2*0.35);
      float lit = smoothstep(0.0,0.7,dot(dir,uSunDir));
      vec3 cCol = mix(vec3(0.52,0.58,0.66), vec3(1.0,0.97,0.90), lit);
      col = mix(col, cCol, cloud*0.85*smoothstep(0.02,0.18,y));
    }
    if (uUnderwater>0.5) col = mix(col*0.28, vec3(0.02,0.12,0.24), 0.45);
    outColor = vec4(col, 1.0);
  }`;

/* ============================================================
   OCEAN
   ============================================================ */
const oceanVS = `#version 300 es
  layout(location=0) in vec3 aPos;
  uniform mat4 uVP;
  uniform vec2 uGridOffset;
  uniform float uTime;
  uniform vec3 uCamPos;
  out vec3 vWorldPos, vNormal, vViewDir;
  out float vHeight, vSteep;
  vec3 gerstner(vec2 p, vec2 dir, float steep, float wl, float speed, float t,
                out vec3 tang, out vec3 binorm){
    float k=6.283185307/wl; float c=sqrt(9.81/k);
    vec2 d=normalize(dir);
    float f=k*(dot(d,p)-c*speed*t);
    float a=steep/k; float s=sin(f), co=cos(f);
    tang   = vec3(1.0-d.x*d.x*steep*s, d.x*steep*co, -d.x*d.y*steep*s);
    binorm = vec3(-d.x*d.y*steep*s,    d.y*steep*co,  1.0-d.y*d.y*steep*s);
    return vec3(d.x*a*co, a*s, d.y*a*co);
  }
  void main(){
    vec2 wp = aPos.xz + uGridOffset;
    vec3 t1,b1,t2,b2,t3,b3,t4,b4,t5,b5,t6,b6;
    vec3 d1=gerstner(wp,vec2( 1.00, 0.22),0.30,61.30,1.00,uTime,t1,b1);
    vec3 d2=gerstner(wp,vec2(-0.63, 0.78),0.24,37.70,1.09,uTime,t2,b2);
    vec3 d3=gerstner(wp,vec2( 0.35,-0.94),0.20,21.90,1.21,uTime,t3,b3);
    vec3 d4=gerstner(wp,vec2(-0.86,-0.36),0.16,12.70,1.35,uTime,t4,b4);
    vec3 d5=gerstner(wp,vec2( 0.55, 0.83),0.10, 7.30,1.55,uTime,t5,b5);
    vec3 d6=gerstner(wp,vec2(-0.27, 0.96),0.07, 4.30,1.75,uTime,t6,b6);
    vec3 disp = d1+d2+d3+d4+d5+d6;
    vec3 P = vec3(wp.x, 0.0, wp.y) + disp;
    vec3 tsum = t1+t2+t3+t4+t5+t6;
    vec3 bsum = b1+b2+b3+b4+b5+b6;
    vec3 N = normalize(cross(tsum,bsum));
    vWorldPos = P; vNormal = N; vViewDir = normalize(uCamPos - P);
    vHeight = disp.y;
    vSteep = clamp(length(vec2(disp.x,disp.z))*0.30,0.0,1.0);
    gl_Position = uVP * vec4(P,1.0);
  }`;

const oceanFS = `#version 300 es
  precision highp float;
  in vec3 vWorldPos, vNormal, vViewDir;
  in float vHeight, vSteep;
  out vec4 outColor;
  uniform float uTime, uUnderwater;
  uniform vec3 uSunDir, uSunColor, uCamPos;
  uniform vec3 uDeep, uShallow, uFoamColor;
  ${GLSL_NOISE}
  ${GLSL_SKY}
  #define PI 3.14159265
  float D_GGX(float NoH, float a){ float a2=a*a; float d=NoH*NoH*(a2-1.0)+1.0; return a2/(PI*d*d); }
  float G_Smith(float NoV,float NoL,float a){ float r=a+1.0; float k=(r*r)/8.0;
    return (NoV/(NoV*(1.0-k)+k))*(NoL/(NoL*(1.0-k)+k)); }
  vec3 F_Schlick(float c, vec3 F0){ return F0 + (1.0-F0)*pow(1.0-c,5.0); }
  void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    vec3 L = normalize(uSunDir);
    vec2 wp = vWorldPos.xz;
    float t = uTime, e = 0.35;
    float hL = fbm3((wp+vec2(-e,0.0))*0.9+vec2(t*0.35,0.0));
    float hR = fbm3((wp+vec2( e,0.0))*0.9+vec2(t*0.35,0.0));
    float hD = fbm3((wp+vec2(0.0,-e))*0.9+vec2(0.0,t*0.30));
    float hU = fbm3((wp+vec2(0.0, e))*0.9+vec2(0.0,t*0.30));
    vec3 detailN = normalize(vec3(-(hR-hL), 1.0, -(hU-hD)));
    N = normalize(N + vec3(detailN.x,0.0,detailN.z)*0.85);
    if (uUnderwater>0.5) N = -N;
    float NoV = max(dot(N,V),1e-3);
    float NoL = max(dot(N,L),0.0);
    vec3 H = normalize(L+V);
    float NoH = max(dot(N,H),0.0);
    float VoH = max(dot(V,H),0.0);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y)*0.985 + 0.015;
    vec3 reflection = skyColor(R, uSunDir, uSunColor);
    vec3 F0 = vec3(0.020);
    vec3 F = F_Schlick(VoH, F0);
    float fres = 0.02 + 0.98*pow(1.0-NoV,5.0);
    float D = D_GGX(NoH, 0.045);
    float G = G_Smith(NoV, NoL, 0.045);
    vec3 spec = (D*G*F)/max(4.0*NoV*NoL,1e-3)*uSunColor*4.5;
    float depth = clamp(0.35+vHeight*0.16, 0.0, 1.0);
    vec3 body = mix(uShallow, uDeep, depth);
    float sss = pow(max(dot(-V,L),0.0),4.0)*smoothstep(0.10,0.90,vHeight);
    vec3 sssCol = vec3(0.06,0.55,0.48)*sss*1.25;
    vec3 color = mix(body, reflection, fres) + spec + sssCol;
    float nA = fbm2(wp*1.10 + vec2(t*0.25,-t*0.20));
    float nB = fbm2(wp*3.20 - vec2(t*0.40, t*0.30));
    float foamMask = nA*0.62 + nB*0.38;
    float crest = smoothstep(0.30, 0.85, vSteep);
    float foam = crest*smoothstep(0.52,0.90,foamMask+crest*0.35);
    foam = clamp(foam*1.7, 0.0, 1.0);
    color = mix(color, uFoamColor, foam);
    float dist = length(vWorldPos - uCamPos);
    vec3 haze = mix(vec3(0.74,0.83,0.92), vec3(0.55,0.70,0.85), 0.5);
    color = mix(color, haze, smoothstep(250.0,1000.0,dist)*0.85);
    if (uUnderwater>0.5) {
      float snell = pow(1.0-NoV,3.0);
      vec3 through = skyColor(vec3(V.x,0.15,V.z), uSunDir, uSunColor);
      vec3 uw = mix(vec3(0.02,0.10,0.20), through, snell);
      color = mix(color, uw, 0.55);
      color = mix(color, vec3(0.02,0.11,0.22), (1.0-exp(-dist*0.028))*0.75);
    }
    float alpha = mix(0.90,1.0,fres); alpha = max(alpha, foam);
    outColor = vec4(color, alpha);
  }`;

/* ============================================================
   SEABED
   ============================================================ */
const bedVS = `#version 300 es
  layout(location=0) in vec3 aPos;
  uniform mat4 uVP;
  uniform vec2 uGridOffset;
  out vec3 vWorldPos, vNormal;
  float h(vec2 p){
    return sin(p.x*0.0095+0.7)*cos(p.y*0.0113-0.4)*5.5
         + sin(p.x*0.0210-1.2)*2.0
         + cos(p.y*0.0310+0.3)*1.6
         + sin(p.x*0.0610)*cos(p.y*0.0510)*0.55 - 22.0;
  }
  void main(){
    vec2 wp = aPos.xz + uGridOffset;
    float y = h(wp);
    float e = 0.6;
    float yx = h(wp+vec2(e,0.0));
    float yz = h(wp+vec2(0.0,e));
    vec3 n = normalize(vec3(-(yx-y)/e, 1.0, -(yz-y)/e));
    vec3 p = vec3(wp.x, y, wp.y);
    vWorldPos = p; vNormal = n;
    gl_Position = uVP * vec4(p,1.0);
  }`;

const bedFS = `#version 300 es
  precision highp float;
  in vec3 vWorldPos, vNormal;
  out vec4 outColor;
  uniform float uTime, uUnderwater;
  uniform vec3 uSunDir, uSunColor, uCamPos;
  ${GLSL_NOISE}
  void main(){
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uSunDir);
    float sn = fbm3(vWorldPos.xz*0.55);
    float fn = vnoise(vWorldPos.xz*6.5);
    vec3 light = vec3(0.78,0.68,0.50), dark = vec3(0.45,0.36,0.24);
    vec3 sand = mix(light, dark, sn*0.65+fn*0.25);
    float NdL = max(dot(N,L),0.0);
    vec3 color = sand*(0.25+0.95*NdL)*uSunColor + sand*0.18;
    vec2 cp = vWorldPos.xz*0.32; float t = uTime*0.32;
    float c1=vnoise(cp+vec2(t,-t*0.7));
    float c2=vnoise(cp*1.7+vec2(-t*0.9,t*0.6));
    float c3=vnoise(cp*3.3+vec2(t*1.2,t*0.95));
    float caus = pow(c1*0.5+c2*0.3+c3*0.2, 2.4)*2.6;
    caus *= smoothstep(0.35,0.90,caus);
    color += vec3(0.55,1.0,0.95)*caus*0.9;
    if (uUnderwater>0.5) {
      float d = length(vWorldPos-uCamPos);
      color = mix(color, vec3(0.02,0.10,0.20), (1.0-exp(-d*0.028))*0.92);
    }
    outColor = vec4(color, 1.0);
  }`;

/* ============================================================
   FISH — procedural body + fins + eyes + 5 variants
   ============================================================ */
function buildFishGeometry() {
  const P=[], N=[], U=[], M=[];

  function pushTri(a, b, c, matId) {
    const ux=b.p[0]-a.p[0], uy=b.p[1]-a.p[1], uz=b.p[2]-a.p[2];
    const vx=c.p[0]-a.p[0], vy=c.p[1]-a.p[1], vz=c.p[2]-a.p[2];
    let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    const l = Math.hypot(nx,ny,nz)||1; nx/=l; ny/=l; nz/=l;
    P.push(a.p[0],a.p[1],a.p[2],  b.p[0],b.p[1],b.p[2],  c.p[0],c.p[1],c.p[2]);
    N.push(nx,ny,nz, nx,ny,nz, nx,ny,nz);
    U.push(a.uv[0],a.uv[1], b.uv[0],b.uv[1], c.uv[0],c.uv[1]);
    M.push(matId, matId, matId);
  }

  const BODY_LEN = 1.4;
  const BODY_R = 0.25;
  function radiusAt(t) {
    const tb = Math.pow(t, 0.72);
    return BODY_R * Math.pow(Math.sin(Math.PI * tb), 0.62) * (1.0 - 0.30*t) + 0.006;
  }
  function spineY(t) {
    return -0.030 * t + 0.032 * Math.sin(Math.PI * t);
  }
  function bodyPoint(t, v) {
    const x = (t - 0.5) * BODY_LEN;
    const r = radiusAt(t);
    const yOff = spineY(t);
    const theta = v * Math.PI * 2;
    const y = Math.sin(theta) * r + yOff;
    const z = Math.cos(theta) * r * 0.48;
    return [x, y, z];
  }

  const NU = 40, NV = 26;
  const grid = [];
  for (let i = 0; i <= NU; i++) {
    const t = i / NU;
    const row = [];
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      row.push({ p: bodyPoint(t, v), uv: [t, v] });
    }
    grid.push(row);
  }
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NV; j++) {
      const a=grid[i][j], b=grid[i][j+1], c=grid[i+1][j], d=grid[i+1][j+1];
      pushTri(a, c, b, 0);
      pushTri(b, c, d, 0);
    }
  }

  function buildFin(t0, t1, vSurf, lengthFn, heightFn, matId) {
    const NSTEPS = 18;
    let prevBase = null, prevTip = null, prevS = 0;
    for (let i = 0; i <= NSTEPS; i++) {
      const s = i / NSTEPS;
      const t = t0 + (t1 - t0) * s;
      const base = bodyPoint(t, vSurf);
      const ringN = vSurf === 0.25 ? [0,1,0] : vSurf === 0.75 ? [0,-1,0] : [0,0,0];
      const height = heightFn(s);
      const tip = [
        base[0] + lengthFn(s),
        base[1] + ringN[1] * height,
        base[2] + ringN[2] * height,
      ];
      if (i > 0) {
        const pB={p:prevBase, uv:[prevS,0]}, pT={p:prevTip, uv:[prevS,1]};
        const cB={p:base,     uv:[s,0]},     cT={p:tip,     uv:[s,1]};
        pushTri(pB, pT, cT, matId);
        pushTri(pB, cT, cB, matId);
      }
      prevBase = base; prevTip = tip; prevS = s;
    }
  }

  buildFin(0.14, 0.60, 0.25,
    s => 0.02 + 0.03 * Math.sin(Math.PI * s),
    s => 0.24 * Math.sin(Math.PI * s) * Math.pow(Math.sin(Math.PI*s), 0.15),
    1);

  buildFin(0.30, 0.62, 0.75,
    s => 0.02 + 0.02 * Math.sin(Math.PI * s),
    s => 0.16 * Math.sin(Math.PI * s),
    1);

  buildFin(0.18, 0.34, 0.75,
    s => 0.05 + 0.06 * Math.sin(Math.PI * s),
    s => 0.12 * Math.sin(Math.PI * s),
    1);

  (function(){
    const baseT = 0.985;
    const basePoint = bodyPoint(baseT, 0.25);
    const NSTEPS = 14;
    for (let i = 0; i < NSTEPS; i++) {
      const s1 = i / NSTEPS, s2 = (i+1) / NSTEPS;
      const a1 = (s1 * 2 - 1);
      const a2 = (s2 * 2 - 1);
      const spanY = 0.42, spanX = 0.50;
      const tip1 = [basePoint[0] + spanX*Math.cos(a1*1.1), spanY*a1, 0];
      const tip2 = [basePoint[0] + spanX*Math.cos(a2*1.1), spanY*a2, 0];
      const bTop = { p: basePoint,  uv: [0.5 + s1*0.5, 0] };
      const bTop2= { p: basePoint,  uv: [0.5 + s2*0.5, 0] };
      const t1p = { p: tip1, uv: [0.5 + s1*0.5, 1] };
      const t2p = { p: tip2, uv: [0.5 + s2*0.5, 1] };
      pushTri(bTop, t1p, t2p, 1);
      pushTri(bTop, t2p, bTop2, 1);
    }
  })();

  function smallSideFin(sign) {
    const t0 = 0.24;
    const base = bodyPoint(t0, sign > 0 ? 0.05 : 0.55);
    const NSTEP = 8;
    const hinge = [base[0], base[1], base[2]];
    for (let i = 0; i < NSTEP; i++) {
      const s1 = i / NSTEP, s2 = (i+1)/NSTEP;
      const ang1 = -0.6 + s1 * 1.2;
      const ang2 = -0.6 + s2 * 1.2;
      const r = 0.18;
      const e1 = [
        hinge[0] + 0.14 + Math.cos(ang1)*0.05,
        hinge[1] + Math.sin(ang1)*r,
        hinge[2] + sign * (0.08 + 0.02*Math.cos(ang1))
      ];
      const e2 = [
        hinge[0] + 0.14 + Math.cos(ang2)*0.05,
        hinge[1] + Math.sin(ang2)*r,
        hinge[2] + sign * (0.08 + 0.02*Math.cos(ang2))
      ];
      const B  = { p: hinge, uv: [0.5, 0] };
      const E1 = { p: e1,    uv: [s1, 1] };
      const E2 = { p: e2,    uv: [s2, 1] };
      pushTri(B, E1, E2, 1);
    }
  }
  smallSideFin( 1);
  smallSideFin(-1);

  function pushSphere(cx, cy, cz, radius, matId, sign) {
    const NN = 10, MM = 10;
    for (let i = 0; i < NN; i++) {
      for (let j = 0; j < MM; j++) {
        const u1=i/NN, u2=(i+1)/NN, v1=j/MM, v2=(j+1)/MM;
        const th1 = u1*Math.PI, th2 = u2*Math.PI;
        const ph1 = v1*Math.PI*2, ph2 = v2*Math.PI*2;
        const pt = (th, ph) => [
          cx + radius * Math.sin(th) * Math.sin(ph),
          cy + radius * Math.cos(th),
          cz + sign * radius * Math.sin(th) * Math.cos(ph)
        ];
        const a = { p: pt(th1,ph1), uv: [0.5 + (u1-0.5)*0.5, 0.5 + (v1-0.5)*0.5] };
        const b = { p: pt(th2,ph1), uv: [0.5 + (u2-0.5)*0.5, 0.5 + (v1-0.5)*0.5] };
        const c = { p: pt(th1,ph2), uv: [0.5 + (u1-0.5)*0.5, 0.5 + (v2-0.5)*0.5] };
        const d = { p: pt(th2,ph2), uv: [0.5 + (u2-0.5)*0.5, 0.5 + (v2-0.5)*0.5] };
        pushTri(a, b, d, matId);
        pushTri(a, d, c, matId);
      }
    }
  }
  const eyeT = 0.135;
  const eyeX = (eyeT - 0.5) * BODY_LEN;
  const eyeY = spineY(eyeT) + radiusAt(eyeT) * 0.28;
  const eyeZ = radiusAt(eyeT) * 0.48;
  const eyeR = 0.052;
  pushSphere(eyeX, eyeY, +eyeZ*1.02, eyeR, 2, +1);
  pushSphere(eyeX, eyeY, -eyeZ*1.02, eyeR, 2, -1);

  return {
    pos: new Float32Array(P),
    nrm: new Float32Array(N),
    uv:  new Float32Array(U),
    mat: new Float32Array(M),
    vertCount: P.length / 3
  };
}

const fishGeo = buildFishGeometry();

/* ============================================================
   FISH SHADERS
   ============================================================ */
const fishVS = `#version 300 es
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNrm;
  layout(location=2) in vec2 aUV;
  layout(location=3) in float aMat;
  layout(location=4) in mat4 aInst;

  uniform mat4 uVP;
  uniform float uTime;

  out vec3 vWorldPos;
  out vec3 vNormal;
  out vec3 vLocalPos;
  out vec2 vUV;
  flat out float vMatId;
  flat out int vVariant;
  flat out float vInstanceID;

  void main(){
    vec3 p = aPos;
    vec3 n = aNrm;

    float tNorm = clamp((p.x + 0.7) / 2.0, 0.0, 1.0);
    float tailBend = tNorm * tNorm;
    float phase = float(gl_InstanceID) * 1.37;
    float amp = 0.10 * tailBend;
    float bend = sin(uTime * 4.0 + phase + p.x * 3.0) * amp;
    p.z += bend;
    float bendD = cos(uTime * 4.0 + phase + p.x * 3.0) * amp * 3.0;
    n = normalize(n + vec3(0.0, 0.0, -bendD));

    vLocalPos = p;
    vUV = aUV;
    vMatId = aMat;
    vVariant = gl_InstanceID - (gl_InstanceID / 5) * 5;
    vInstanceID = float(gl_InstanceID);

    vec4 wp = aInst * vec4(p, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(mat3(aInst) * n);
    gl_Position = uVP * wp;
  }`;

const fishFS = `#version 300 es
  precision highp float;
  in vec3 vWorldPos, vNormal;
  in vec3 vLocalPos;
  in vec2 vUV;
  flat in float vMatId;
  flat in int vVariant;
  flat in float vInstanceID;
  out vec4 outColor;

  uniform vec3 uSunDir, uSunColor, uCamPos;
  uniform float uUnderwater, uTime;

  ${GLSL_NOISE}

  vec3 bodyColor(int variant, vec2 uv){
    float topness = sin(uv.y * 6.28318);
    float headMask = smoothstep(0.22, 0.02, uv.x);
    vec3 col;

    if (variant == 0) {
      vec3 dark  = vec3(0.08, 0.20, 0.32);
      vec3 mid   = vec3(0.58, 0.60, 0.55);
      vec3 bel   = vec3(1.00, 0.62, 0.22);
      col = mix(bel, mix(mid, dark, smoothstep(0.0, 0.6, topness)),
                smoothstep(-0.75, 0.10, topness));
      float stripe = sin(uv.x * 70.0);
      col *= 1.0 - 0.12 * smoothstep(0.5,1.0,stripe) * smoothstep(-0.1, 0.4, topness);
      float gill = smoothstep(0.22, 0.08, uv.x) * smoothstep(0.8, 0.35, topness);
      col = mix(col, vec3(0.05), gill * 0.75);
      col = mix(col, vec3(1.0, 0.55, 0.15), headMask * smoothstep(-0.1, -0.8, topness) * 0.55);
    } else if (variant == 1) {
      vec3 base = mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 0.28, 0.08), uv.x);
      col = base;
      vec2 p = uv * vec2(30.0, 10.0);
      vec2 c = floor(p), f = fract(p) - 0.5;
      float h = hash21(c);
      if (h > 0.55) {
        float d = length(f);
        float spot = smoothstep(0.32, 0.14, d);
        col = mix(col, vec3(0.30, 0.90, 0.98), spot * 0.9);
      }
      col = mix(col, vec3(0.30, 0.75, 0.95), headMask * 0.35);
    } else if (variant == 2) {
      vec3 top = vec3(0.22, 0.12, 0.55);
      vec3 mid = vec3(0.55, 0.28, 0.78);
      vec3 bel = vec3(0.88, 0.55, 0.82);
      col = mix(bel, mix(mid, top, smoothstep(-0.3, 0.6, topness)),
                smoothstep(-0.8, 0.25, topness));
      col += vec3(0.08, 0.12, 0.20) * (0.5 + 0.5*sin(uv.x * 90.0 + topness * 5.0 + uTime * 2.0));
    } else if (variant == 3) {
      vec3 yel = vec3(1.0, 0.80, 0.15);
      vec3 blue = vec3(0.15, 0.35, 0.88);
      float stripe = step(0.5, fract(uv.x * 4.0 + 0.2));
      col = mix(yel, blue, stripe * smoothstep(-0.6, 0.3, topness) * 0.9);
      col = mix(col, vec3(0.20, 0.45, 0.95), headMask * 0.75);
      float band = smoothstep(0.20,0.16,uv.x) * smoothstep(0.02,0.08,uv.x);
      col = mix(col, vec3(0.05,0.05,0.15), band * 0.55);
    } else {
      vec3 red = vec3(0.95, 0.22, 0.12);
      vec3 orange = vec3(1.0, 0.62, 0.22);
      col = mix(orange, red, topness * 0.5 + 0.5);
      float stripe = sin((uv.x * 55.0 + uv.y * 24.0));
      col = mix(col, vec3(0.35, 0.75, 0.98), smoothstep(0.6, 1.0, stripe) * 0.7);
      col = mix(col, vec3(0.85,0.85,0.82), headMask * 0.6);
    }
    return col;
  }

  vec3 finColor(int variant, vec2 uv){
    float ray = sin(uv.x * 90.0);
    ray = 0.75 + 0.25 * smoothstep(0.0, 1.0, ray*ray);
    vec3 baseCol;
    if (variant == 0) baseCol = vec3(0.35, 0.40, 0.55);
    else if (variant == 1) baseCol = vec3(1.0, 0.45, 0.15);
    else if (variant == 2) baseCol = vec3(0.65, 0.35, 0.85);
    else if (variant == 3) baseCol = vec3(1.0, 0.90, 0.25);
    else baseCol = vec3(1.0, 0.30, 0.15);
    vec3 cb = baseCol * 0.35;
    vec3 ct = baseCol * 1.35 + vec3(0.10);
    return mix(cb, ct, uv.y) * ray;
  }

  vec3 eyeColor(vec2 uv){
    vec2 c = uv - vec2(0.5);
    float r = length(c);
    vec3 iris = mix(vec3(0.90, 0.70, 0.20), vec3(0.75, 0.35, 0.10), r*1.5);
    float pupil = smoothstep(0.22, 0.15, r);
    vec3 col = mix(iris, vec3(0.02), pupil);
    col *= mix(1.0, 0.25, smoothstep(0.42, 0.50, r));
    float hl = smoothstep(0.20, 0.08, length(c - vec2(-0.08, -0.08)));
    col += hl * vec3(1.0);
    return col;
  }

  void main(){
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCamPos - vWorldPos);
    vec3 L = normalize(uSunDir);

    if (dot(N, V) < 0.0) N = -N;

    vec3 albedo;
    if (vMatId < 0.5) {
      albedo = bodyColor(vVariant, vUV);
      float fres = pow(1.0 - max(dot(N,V),0.0), 3.0);
      albedo = mix(albedo, albedo*1.4 + vec3(0.10,0.15,0.22), fres*0.5);
    } else if (vMatId < 1.5) {
      albedo = finColor(vVariant, vUV);
      float fres = pow(1.0 - max(dot(N,V),0.0), 2.0);
      albedo = mix(albedo, albedo + vec3(0.10,0.15,0.25), fres*0.35);
    } else {
      albedo = eyeColor(vUV);
    }

    float NdL = max(dot(N,L), 0.0);
    float amb = 0.35 + 0.10 * max(dot(N, vec3(0.0,1.0,0.0)), 0.0);
    vec3 color = albedo * (amb + 0.95*NdL) * uSunColor;

    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N,H),0.0), 60.0);
    float specStr = (vMatId < 0.5) ? 0.55 : (vMatId < 1.5 ? 0.25 : 0.9);
    color += spec * specStr * uSunColor;

    if (uUnderwater > 0.5) {
      float d = length(vWorldPos - uCamPos);
      color = mix(color, vec3(0.02,0.10,0.20), (1.0-exp(-d*0.032))*0.85);
    }
    outColor = vec4(color, 1.0);
  }`;

/* ============================================================
   PROGRAMS
   ============================================================ */
const progSky   = link(skyVS,   skyFS);
const progOcean = link(oceanVS, oceanFS);
const progBed   = link(bedVS,   bedFS);
const progFish  = link(fishVS,  fishFS);

/* ============================================================
   GRIDS
   ============================================================ */
function makeGridMesh(size, segs) {
  const half = size/2, step = size/segs;
  const verts = new Float32Array((segs+1)*(segs+1)*3);
  let k = 0;
  for (let j=0;j<=segs;j++) for (let i=0;i<=segs;i++) {
    verts[k++] = -half + i*step;
    verts[k++] = 0;
    verts[k++] = -half + j*step;
  }
  const idx = new Uint32Array(segs*segs*6);
  let m = 0;
  for (let j=0;j<segs;j++) for (let i=0;i<segs;i++) {
    const a = j*(segs+1)+i, b = a+1, c = a+segs+1, d = c+1;
    idx[m++]=a; idx[m++]=c; idx[m++]=b;
    idx[m++]=b; idx[m++]=c; idx[m++]=d;
  }
  return { verts, idx };
}

const OCEAN_SIZE = 1600, OCEAN_SEGS = 300;
const oceanMesh = makeGridMesh(OCEAN_SIZE, OCEAN_SEGS);
const oceanVAO = gl.createVertexArray();
gl.bindVertexArray(oceanVAO); {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, oceanMesh.verts, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, oceanMesh.idx, gl.STATIC_DRAW);
}

const BED_SIZE = 1600, BED_SEGS = 160;
const bedMesh = makeGridMesh(BED_SIZE, BED_SEGS);
const bedVAO = gl.createVertexArray();
gl.bindVertexArray(bedVAO); {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, bedMesh.verts, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bedMesh.idx, gl.STATIC_DRAW);
}

const skyVAO = gl.createVertexArray();
gl.bindVertexArray(skyVAO); {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

/* ============================================================
   FISH VAO
   ============================================================ */
const FISH_COUNT = OPTS.fishCount;
const fishVAO = gl.createVertexArray();
const fishInstBuffer = gl.createBuffer();
gl.bindVertexArray(fishVAO); {
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, fishGeo.pos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  const nb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nb);
  gl.bufferData(gl.ARRAY_BUFFER, fishGeo.nrm, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

  const ub = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ub);
  gl.bufferData(gl.ARRAY_BUFFER, fishGeo.uv, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

  const mb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mb);
  gl.bufferData(gl.ARRAY_BUFFER, fishGeo.mat, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, fishInstBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, FISH_COUNT*16*4, gl.DYNAMIC_DRAW);
  for (let i=0;i<4;i++) {
    gl.enableVertexAttribArray(4+i);
    gl.vertexAttribPointer(4+i, 4, gl.FLOAT, false, 64, i*16);
    gl.vertexAttribDivisor(4+i, 1);
  }
}

/* ---- Fish simulation state ---- */
const fishData = [];
for (let i = 0; i < FISH_COUNT; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 6 + Math.random() * 45;
  const f = {
    pos: [Math.cos(a)*r, -12 + (Math.random()-0.5)*8, Math.sin(a)*r],
    vel: [(Math.random()-0.5), (Math.random()-0.5)*0.25, (Math.random()-0.5)],
    size: 0.6 + Math.random() * 0.7,
  };
  const sp = Math.hypot(f.vel[0],f.vel[1],f.vel[2])||1;
  f.vel[0] = f.vel[0]/sp * (1.4 + Math.random()*0.8);
  f.vel[1] = f.vel[1]/sp * (1.4 + Math.random()*0.8);
  f.vel[2] = f.vel[2]/sp * (1.4 + Math.random()*0.8);
  fishData.push(f);
}

function writeFishMatrices() {
  const data = new Float32Array(FISH_COUNT*16);
  let k = 0;
  for (let i = 0; i < FISH_COUNT; i++) {
    const f = fishData[i];
    let fx=f.vel[0], fy=f.vel[1], fz=f.vel[2];
    const fl = Math.hypot(fx,fy,fz)||1; fx/=fl; fy/=fl; fz/=fl;
    let rx = fz, ry = 0, rz = -fx;
    const rl = Math.hypot(rx,ry,rz)||1; rx/=rl; ry/=rl; rz/=rl;
    const ux = fy*rz-fz*ry, uy = fz*rx-fx*rz, uz = fx*ry-fy*rx;
    const s = f.size;
    data[k++]=rx*s; data[k++]=ry*s; data[k++]=rz*s; data[k++]=0;
    data[k++]=ux*s; data[k++]=uy*s; data[k++]=uz*s; data[k++]=0;
    data[k++]=fx*s; data[k++]=fy*s; data[k++]=fz*s; data[k++]=0;
    data[k++]=f.pos[0]; data[k++]=f.pos[1]; data[k++]=f.pos[2]; data[k++]=1;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, fishInstBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  gl.bindVertexArray(fishVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, fishInstBuffer);
  for (let i=0;i<4;i++) {
    gl.vertexAttribPointer(4+i, 4, gl.FLOAT, false, 64, i*16);
  }
  gl.bindVertexArray(null);
}

function updateFish(dt) {
  const cx=0, cy=-14, cz=0;
  const coh=0.0009, sep=3.2, maxS=4.5, minS=1.0, bounds=70;
  for (let i=0;i<FISH_COUNT;i++) {
    const f = fishData[i];
    f.vel[0] += (cx - f.pos[0]) * coh;
    f.vel[1] += (cy - f.pos[1]) * coh;
    f.vel[2] += (cz - f.pos[2]) * coh;
    for (let j=i+1;j<FISH_COUNT;j++) {
      const o = fishData[j];
      const dx=f.pos[0]-o.pos[0], dy=f.pos[1]-o.pos[1], dz=f.pos[2]-o.pos[2];
      const d2 = dx*dx+dy*dy+dz*dz;
      if (d2 < sep*sep && d2 > 0.05) {
        const inv = 0.025/d2;
        f.vel[0]+=dx*inv; f.vel[1]+=dy*inv; f.vel[2]+=dz*inv;
        o.vel[0]-=dx*inv; o.vel[1]-=dy*inv; o.vel[2]-=dz*inv;
      }
    }
    f.vel[0] += (Math.random()-0.5) * 0.05;
    f.vel[1] += (Math.random()-0.5) * 0.02;
    f.vel[2] += (Math.random()-0.5) * 0.05;

    const sp = Math.hypot(f.vel[0],f.vel[1],f.vel[2])||1;
    if (sp > maxS) { const k=maxS/sp; f.vel[0]*=k; f.vel[1]*=k; f.vel[2]*=k; }
    if (sp < minS) { const k=minS/sp; f.vel[0]*=k; f.vel[1]*=k; f.vel[2]*=k; }

    f.pos[0] += f.vel[0]*dt;
    f.pos[1] += f.vel[1]*dt;
    f.pos[2] += f.vel[2]*dt;

    if (f.pos[0] >  bounds) f.pos[0] -= bounds*2;
    if (f.pos[0] < -bounds) f.pos[0] += bounds*2;
    if (f.pos[2] >  bounds) f.pos[2] -= bounds*2;
    if (f.pos[2] < -bounds) f.pos[2] += bounds*2;
    if (f.pos[1] < -27) { f.pos[1] = -27; f.vel[1] *= -1; }
    if (f.pos[1] > -1.5) { f.pos[1] = -1.5; f.vel[1] *= -1; }
  }
}

/* ============================================================
   CAMERA / INPUT
   ============================================================ */
const cam = { pos:[0,6,35], yaw:0, pitch:-0.15 };
let mouseDown = false, lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', e => {
  mouseDown = true; lastX = e.clientX; lastY = e.clientY;
  if (canvas.requestPointerLock) canvas.requestPointerLock();
});
canvas.addEventListener('mouseup', () => mouseDown = false);
canvas.addEventListener('mousemove', e => {
  if (!mouseDown) return;
  const dx = e.movementX != null ? e.movementX : (e.clientX - lastX);
  const dy = e.movementY != null ? e.movementY : (e.clientY - lastY);
  lastX = e.clientX; lastY = e.clientY;
  cam.yaw -= dx*0.003;
  cam.pitch -= dy*0.003;
  cam.pitch = Math.max(-1.55, Math.min(1.55, cam.pitch));
});
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup',   e => keys[e.code] = false);

const view = M4();
function updateCamera(dt) {
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const cy = Math.cos(cam.yaw),   sy = Math.sin(cam.yaw);
  const fwd = [sy*cp, sp, -cy*cp];
  const rx = fwd[2], ry = 0, rz = -fwd[0];
  const rl = Math.hypot(rx,ry,rz)||1;
  const r = [rx/rl, ry/rl, rz/rl];
  let vx=0, vy=0, vz=0;
  if (keys['KeyW']) { vx+=fwd[0]; vy+=fwd[1]; vz+=fwd[2]; }
  if (keys['KeyS']) { vx-=fwd[0]; vy-=fwd[1]; vz-=fwd[2]; }
  if (keys['KeyA']) { vx-=r[0];   vy-=r[1];   vz-=r[2]; }
  if (keys['KeyD']) { vx+=r[0];   vy+=r[1];   vz+=r[2]; }
  if (keys['Space']) vy += 1;
  if (keys['ShiftLeft']) vy -= 1;
  const l = Math.hypot(vx,vy,vz)||1;
  const SPEED = 14;
  cam.pos[0] += vx/l * SPEED * dt;
  cam.pos[1] += vy/l * SPEED * dt;
  cam.pos[2] += vz/l * SPEED * dt;
  cam.pos[1] = Math.max(-30, Math.min(500, cam.pos[1]));
  m4lookAt(view, cam.pos[0],cam.pos[1],cam.pos[2],
           cam.pos[0]+fwd[0], cam.pos[1]+fwd[1], cam.pos[2]+fwd[2], 0,1,0);
}

/* ============================================================
   LOOP
   ============================================================ */
const proj = M4(), vp = M4(), invVP = M4();
const sunDir = (function(){ const v=[0.55,0.35,0.35]; const l=Math.hypot(v[0],v[1],v[2]);
  return [v[0]/l, v[1]/l, v[2]/l]; })();
const sunColor = [1.0, 0.94, 0.85];

function resize() {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const w = Math.floor(canvas.clientWidth  * dpr) || Math.floor(innerWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr) || Math.floor(innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; }
  gl.viewport(0,0,w,h);
}
window.addEventListener('resize', resize);
resize();

/* Status overlay — only create if missing */
const stateEl = (function () {
  let el = document.getElementById('state');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'state';
  el.style.cssText =
    'position:fixed;top:14px;left:14px;color:#fff;font:13px system-ui;' +
    'background:rgba(0,0,0,0.45);padding:8px 14px;border-radius:6px;' +
    'pointer-events:none;z-index:10';
  el.textContent = 'Surface';
  document.body.appendChild(el);
  return el;
})();

let lastT = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastT)/1000, 0.05);
  lastT = now;
  const time = now/1000;

  updateCamera(dt);
  updateFish(dt);

  m4perspective(proj, 60*Math.PI/180, canvas.width/canvas.height, 0.1, 6000);
  m4mul(vp, proj, view);
  m4invert(invVP, vp);

  const camX=cam.pos[0], camY=cam.pos[1], camZ=cam.pos[2];
  const uw = camY < 0 ? 1.0 : 0.0;
  stateEl.textContent = uw > 0.5
    ? 'Underwater · ' + (-camY).toFixed(1) + ' m'
    : 'Surface';

  const gridX = camX, gridZ = camZ;

  /* SKY */
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND);
  gl.clearColor(0.02,0.05,0.10,1.0);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(progSky.p);
  gl.uniformMatrix4fv(progSky.u.uInvVP, false, invVP);
  gl.uniform3f(progSky.u.uCamPos, camX, camY, camZ);
  gl.uniform3fv(progSky.u.uSunDir, sunDir);
  gl.uniform3fv(progSky.u.uSunColor, sunColor);
  gl.uniform1f(progSky.u.uTime, time);
  gl.uniform1f(progSky.u.uUnderwater, uw);
  gl.bindVertexArray(skyVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  /* OPAQUE */
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
  gl.disable(gl.CULL_FACE);

  /* SEABED */
  gl.useProgram(progBed.p);
  gl.uniformMatrix4fv(progBed.u.uVP, false, vp);
  gl.uniform2f(progBed.u.uGridOffset, gridX, gridZ);
  gl.uniform3fv(progBed.u.uSunDir, sunDir);
  gl.uniform3fv(progBed.u.uSunColor, sunColor);
  gl.uniform3f(progBed.u.uCamPos, camX, camY, camZ);
  gl.uniform1f(progBed.u.uTime, time);
  gl.uniform1f(progBed.u.uUnderwater, uw);
  gl.bindVertexArray(bedVAO);
  gl.drawElements(gl.TRIANGLES, bedMesh.idx.length, gl.UNSIGNED_INT, 0);

  /* FISH */
  writeFishMatrices();
  gl.useProgram(progFish.p);
  gl.uniformMatrix4fv(progFish.u.uVP, false, vp);
  gl.uniform3fv(progFish.u.uSunDir, sunDir);
  gl.uniform3fv(progFish.u.uSunColor, sunColor);
  gl.uniform3f(progFish.u.uCamPos, camX, camY, camZ);
  gl.uniform1f(progFish.u.uUnderwater, uw);
  gl.uniform1f(progFish.u.uTime, time);
  gl.bindVertexArray(fishVAO);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, fishGeo.vertCount, FISH_COUNT);

  /* OCEAN */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.useProgram(progOcean.p);
  gl.uniformMatrix4fv(progOcean.u.uVP, false, vp);
  gl.uniform2f(progOcean.u.uGridOffset, gridX, gridZ);
  gl.uniform1f(progOcean.u.uTime, time);
  gl.uniform3f(progOcean.u.uCamPos, camX, camY, camZ);
  gl.uniform3fv(progOcean.u.uSunDir, sunDir);
  gl.uniform3fv(progOcean.u.uSunColor, sunColor);
  gl.uniform3f(progOcean.u.uDeep,    0.012, 0.105, 0.200);
  gl.uniform3f(progOcean.u.uShallow, 0.114, 0.490, 0.549);
  gl.uniform3f(progOcean.u.uFoamColor, 0.95, 0.97, 0.98);
  gl.uniform1f(progOcean.u.uUnderwater, uw);
  gl.bindVertexArray(oceanVAO);
  gl.drawElements(gl.TRIANGLES, oceanMesh.idx.length, gl.UNSIGNED_INT, 0);

  gl.depthMask(true);
  gl.bindVertexArray(null);
}
requestAnimationFrame(frame);

})();