/* LIVING SOIL library — generated from soil-realistic.html */

// LIB-HEADER
'use strict';
/* ============================================================================
   LIVING SOIL v1.0 — single-file interactive soil+grass+rain library (WebGL2)
   ----------------------------------------------------------------------------
   USE AS A WHOLE (all features, demo page):
     <script src="https://YOUR-HOST/living-soil.js"></script>
     <canvas id="soil"></canvas>
     <script>LivingSoil.create({canvas:'#soil'});</script>
   USE A SUBSET (no rain, embeddable banner / game / website):
     <script src="https://YOUR-HOST/living-soil.js?only=core,grass,soil-grains"></script>
     <script>LivingSoil.create({canvas:'#soil',rain:false,grass:true,gamesMode:true});</script>
   ----------------------------------------------------------------------------
   SEPARABLE SECTIONS inside this ONE file (keep file whole — toggle via URL):
     ?only=core            -> soil heightfield + dig/mound + footprints only
     ?only=core,grass       -> + realistic grass tufts
     ?only=core,soil-grains -> + surface crumb particles
     ?only=core,rain        -> + rain + wet clay (needs core)
     ?only=core,grass,soil-grains,rain,dust -> EVERYTHING (default)
   SECTION MARKERS (do not delete; the loader strips unlisted sections):
     [SECTION:core] ... [/SECTION:core]
     [SECTION:grass] ... [/SECTION:grass]
     [SECTION:soil-grains] ... [/SECTION:soil-grains]
     [SECTION:rain] ... [/SECTION:rain]
     [SECTION:dust] ... [/SECTION:dust]
     [SECTION:demo] ... [/SECTION:demo]   (walker + panel + inputs; skip for games)
   GAMES / WEBSITES: call LivingSoil.create({canvas, rain:false}) and drive it:
     soil.setRain(0..1); soil.dig(x,z,r,amt); soil.set('grass',false);
   ============================================================================ */
const canvas=document.getElementById('glcanvas');
// [SECTION:core-flags]
const __only=(function(){try{
 const qs=(document.currentScript&&document.currentScript.src||'').split('?')[1]||'';
 const m=qs.match(/(?:^|&)only=([^&]*)/);if(!m)return null;
 return decodeURIComponent(m[1]).split(',').map(s=>s.trim()).filter(Boolean);
}catch(e){return null;}})();
const HAS=function(n){return !__only||__only.includes(n)||__only.includes('all');};
// combine by URL: ?only=core,grass,soil-grains  (rain OFF)  or  ?only=core,grass,soil-grains,rain,dust (ALL)
const FEAT={core:true,grass:HAS('grass')||HAS('all')||!__only,dust:HAS('dust')||!__only,
 'soil-grains':HAS('soil-grains')||!__only,rain:HAS('rain')||!__only,demo:HAS('demo')||!__only};
// [/SECTION:core-flags]
const gl=canvas.getContext('webgl2',{antialias:true,powerPreference:'high-performance'});
if(!gl){alert('WebGL2 required');throw new Error('no webgl2');}
gl.getExtension('EXT_color_buffer_float');
const floatLinear=gl.getExtension('OES_texture_float_linear');
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;gl.viewport(0,0,canvas.width,canvas.height);}
addEventListener('resize',resize);resize();
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(o));alert('shader: '+gl.getShaderInfoLog(o));}return o;}
function prog(v,f){const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))console.error(gl.getProgramInfoLog(p));return p;}
 // ---- math ----
const Mat={persp(o,f,a,n,f2){const t=1/Math.tan(f/2);o[0]=t/a;o[1]=0;o[2]=0;o[3]=0;o[4]=0;o[5]=t;o[6]=0;o[7]=0;o[8]=0;o[9]=0;o[10]=(f2+n)/(n-f2);o[11]=-1;o[12]=0;o[13]=0;o[14]=2*f2*n/(n-f2);o[15]=0;return o;},
look(o,e,c,u){let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2];let l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;let yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;o[0]=xx;o[1]=yx;o[2]=zx;o[3]=0;o[4]=xy;o[5]=yy;o[6]=zy;o[7]=0;o[8]=xz;o[9]=yz;o[10]=zz;o[11]=0;o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);o[15]=1;return o;}};
// ---- deterministic noise ----
function h2(x,y){const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);const a=h2(xi,yi),b=h2(xi+1,yi),c=h2(xi,yi+1),d=h2(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y){let v=0,a=.5,f=1;for(let i=0;i<4;i++){v+=a*vnoise(x*f,y*f);f*=2.03;a*=.5;}return v;}
// ---- heightfield (smooth, NOT voxels) ----
const MAP=256,WS=90;
const H=new Float32Array(MAP*MAP),H0=new Float32Array(MAP*MAP);
const COMPACT=new Float32Array(MAP*MAP); // 0 loose .. 1 packed (feet pack it)
for(let j=0;j<MAP;j++)for(let i=0;i<MAP;i++){
 const wx=(i/MAP-.5)*WS,wz=(j/MAP-.5)*WS;
 // FLAT lawn: only micro bumps (~3cm), no hills — layers show when YOU dig
 let h=(fbm(wx*.9,wz*.9)-.5)*.07;
 h+=(fbm(wx*3.1+9,wz*3.1)-.5)*.02;
 H[j*MAP+i]=h;H0[j*MAP+i]=h;}
function w2m(x,z){return [(x/WS+.5)*MAP,(z/WS+.5)*MAP];}
function getH(x,z){const[fx,fz]=w2m(x,z);if(fx<1||fz<1||fx>MAP-2||fz>MAP-2)return -5;
 const ix=Math.floor(fx),iz=Math.floor(fz),tx=fx-ix,tz=fz-iz;
 const a=H[iz*MAP+ix],b=H[iz*MAP+ix+1],c=H[(iz+1)*MAP+ix],d=H[(iz+1)*MAP+ix+1];
 return a+(b-a)*tx+(c-a)*tz+(a-b-c+d)*tx*tz;}
const hTex=gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D,hTex);
gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,MAP,MAP,0,gl.RED,gl.FLOAT,H);
if(floatLinear){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);}else{gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);}
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const OPTS={walk:true,dig:true,mound:true,foot:true,clods:true,dust:true,motes:true,rain:false,grains:true,grass:true,grassBend:true,roots:true,stones:true,layers:true,slump:true,lockFlat:true};
let hDirty=true;
function flushH(){if(!hDirty)return;gl.bindTexture(gl.TEXTURE_2D,hTex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,MAP,MAP,gl.RED,gl.FLOAT,H);hDirty=false;}
function stamp(cx,cz,radius,amt,dig,pack){
 if(dig&&!OPTS.dig)return;
 if(!dig&&amt>0&&!OPTS.mound)return;
 if(!dig&&amt>0&&OPTS.lockFlat)return;
 const[px,pz]=w2m(cx,cz);const pr=Math.max(3,Math.ceil(radius/WS*MAP));
 for(let j=-pr;j<=pr;j++)for(let i=-pr;i<=pr;i++){
  const ix=Math.round(px+i),iz=Math.round(pz+j);if(ix<1||iz<1||ix>=MAP-1||iz>=MAP-1)continue;
  const d=Math.sqrt(i*i+j*j)/pr;if(d>=1)continue;
  const fall=0.5+0.5*Math.cos(d*Math.PI);const idx=iz*MAP+ix;
  if(dig){H[idx]-=Math.abs(amt)*fall;
   const rd=Math.abs(d-0.85)/0.15;
   if(rd<1)H[idx]=Math.min(H0[idx]+0.04,H[idx]+Math.abs(amt)*0.12*(0.5+0.5*Math.cos(rd*Math.PI)));
  }else H[idx]+=amt*fall;
  H[idx]=Math.max(H0[idx]-2.2,Math.min(H0[idx]+(OPTS.lockFlat?0.04:(dig?0.04:0.6)),H[idx]));
  if(pack)COMPACT[idx]=Math.min(1,COMPACT[idx]+0.03*fall);
 }
 const q=pr+1,x0=Math.max(1,Math.round(px-q)),x1=Math.min(MAP-2,Math.round(px+q)),z0=Math.max(1,Math.round(pz-q)),z1=Math.min(MAP-2,Math.round(pz+q));
 for(let j=z0;j<=z1;j++)for(let i=x0;i<=x1;i++){const idx=j*MAP+i;
  H[idx]=(H[idx]*3+H[idx-1]+H[idx+1]+H[(j-1)*MAP+i]+H[(j+1)*MAP+i])/7;
  H[idx]=Math.max(H0[idx]-2.2,Math.min(H0[idx]+0.6,H[idx]));}
 hDirty=true;}
// slump + settle: loose steep soil slides, piles relax — runs every frame on dirty region (cheap full pass at low rate)
let slumpAcc=0;
function slump(dt){
 if(!OPTS.slump)return;
 slumpAcc+=dt;if(slumpAcc<0.06)return;slumpAcc=0;
 for(let j=1;j<MAP-1;j++)for(let i=1;i<MAP-1;i++){
  const idx=j*MAP+i;
  const hx=(H[idx+1]-H[idx-1])*0.5,hz=(H[(j+1)*MAP+i]-H[(j-1)*MAP+i])*0.5;
  const slope=Math.hypot(hx,hz),loose=1-COMPACT[idx]*.7,maxS=0.55+loose*0.40;
  if(slope>maxS){
   const flow=Math.min(0.05,(slope-maxS)*0.10*loose);
   const nx=hx/(slope+1e-5),nz=hz/(slope+1e-5);
   const di=Math.abs(nx)>0.5?Math.sign(nx):0,dj=Math.abs(nz)>0.5?Math.sign(nz):0;
   const ni=Math.min(MAP-2,Math.max(1,i-di)),nj=Math.min(MAP-2,Math.max(1,j-dj)),nidx=nj*MAP+ni;
   if(nidx!==idx){H[idx]-=flow*.5;H[nidx]+=flow*.5;
    H[idx]=Math.max(H0[idx]-2.2,Math.min(H0[idx]+0.6,H[idx]));
    H[nidx]=Math.max(H0[nidx]-2.2,Math.min(H0[nidx]+0.6,H[nidx]));
    COMPACT[idx]*=.995;}
  }
  H[idx]+=(H0[idx]-H[idx])*0.0004;
 }
 hDirty=true;}
// ---- SOIL SHADERS: layered profile like your photos ----
const soilVS=`#version 300 es
layout(location=0)in vec3 aP;layout(location=1)in vec2 aUV;
uniform mat4 uProj,uView;uniform sampler2D uH;
out vec3 vW;out vec2 vUV;
void main(){vUV=aUV;vec3 p=aP;p.y+=texture(uH,aUV).r;vW=p;
gl_Position=uProj*uView*vec4(p,1.);}`;
const soilFS=`#version 300 es
precision highp float;
in vec3 vW;in vec2 vUV;
uniform vec3 uCam,uSun,uSunCol;uniform sampler2D uH;
uniform float uMoist,uTime,uRoots,uStones,uLayers,uWet;
out vec4 o;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n3(p);p*=2.03;a*=.5;}return v;}
void main(){
 vec2 tx=vec2(1./256.);
 float hC=texture(uH,vUV).r;
 float hX=texture(uH,vUV+vec2(tx.x,0.)).r-texture(uH,vUV-vec2(tx.x,0.)).r;
 float hZ=texture(uH,vUV+vec2(0.,tx.y)).r-texture(uH,vUV-vec2(0.,tx.y)).r;
 float cellW=90./256.;
 vec3 N=normalize(vec3(-hX/(2.*cellW),1.,-hZ/(2.*cellW)));
 float slope=1.-N.y; // 0 flat .. steep
 // depth below original surface: use world y as proxy + dug amount
 float dug=clamp(-(hC)*1.0,0.,4.5); // how deep we dug here
 // --- layered colors EXACT like reference ---
 vec3 grassTint=vec3(.23,.42,.12);
 vec3 topsoil=vec3(.16,.11,.07);   // dark rich
 vec3 topsoil2=vec3(.24,.17,.10);
 vec3 subsoil=vec3(.38,.27,.15);   // brown
 vec3 clay=vec3(.62,.38,.18);      // orange clay
 vec3 parent=vec3(.45,.38,.30);    // pale parent material
 vec3 stoneC=vec3(.5,.49,.47);
 float g1=fbm(vW*6.)*.6+.4*fbm(vW*22.);
 float g2=fbm(vW*14.+7.);
 // surface dirt (top-down)
 vec3 surf=mix(topsoil,topsoil2,g1);
 surf=mix(surf,vec3(.30,.22,.12),clamp(slope*3.,0.,1.)*.5); // exposed on bumps
 surf=mix(surf,subsoil,smoothstep(.25,.75,g2)*.35);
 // darken with moisture, lighten dry dust
 surf*=mix(1.25,.55,uMoist);
 // visible soil GRAINS: fine sand speckle + larger crumbs (particle look)
 float gr1=hash(floor(vW*90.));
 float gr2=hash(floor(vW*34.)+7.0);
 surf*=0.82+0.36*gr1;
 surf+=vec3(.05,.045,.035)*step(0.93,gr2)*(0.5+0.5*gr1);
 float crumb=step(0.975,hash(floor(vW*16.)));
 surf*=(1.0-crumb*0.35);
 // wet clay: pores flood -> dark + glossy, puddle film in dents
 float wet=uWet;
 vec3 clayWet=mix(vec3(.30,.18,.09),vec3(.42,.24,.12),gr2);
 surf=mix(surf,clayWet,clamp(wet*0.9,0.,1.));
 surf*=mix(1.0,0.55,clamp(wet+uMoist*0.3,0.,1.));
 // small pebbles scattered on surface
 float peb=step(.965,hash(floor(vW*14.)))* (1.-smoothstep(.0,.3,slope));
 surf=mix(surf,stoneC*(.7+.5*g1),peb*.85*uStones);
 // --- wall strata (side view) revealed by slope OR depth ---
 float wall=clamp(slope*4.2+dug*.55,0.,1.);
 // strata bands by depth
 float d=dug+slope*1.2;
 vec3 strata=topsoil2;
 strata=mix(strata,subsoil,smoothstep(.15,.7,d));
 strata=mix(strata,clay,smoothstep(.8,1.6,d));
 strata=mix(strata,parent,smoothstep(1.9,3.0,d));
 // wavy band boundaries
 float wob=fbm(vec3(vW.x*2.5,vW.y*4.,vW.z*2.5))*.35;
 strata*=.85+.3*fbm(vW*18.);
 // dark topsoil cap (grass root zone 0-25cm)
 float cap=1.-smoothstep(.05,.45,d+wob*.3);
 strata=mix(strata,topsoil*.9+.1*g1,cap);
 // roots: thin vertical streaks in top 1m
 float rootZone=(1.-smoothstep(.2,1.2,d));
 vec2 rp=vec2(vW.x*40.+vW.z*37.,vW.y*8.);
 float r1=abs(fract(rp.x*.5+hash(vec3(floor(rp.x),0.,floor(vW.z*40.)))*2.)-.5);
 float roots=(1.-smoothstep(.02,.09,r1))*rootZone*step(.4,hash(vec3(floor(rp.x),floor(rp.y*.5),7.)));
 strata=mix(strata,vec3(.45,.35,.22),clamp(roots,0.,1.)*.8*uRoots);
 // stones embedded in wall
 float st=step(.93,hash(floor(vW*9.)))*wall;
 strata=mix(strata,stoneC*(.6+.6*g1),st*.9*uStones);
 vec3 base=mix(surf,strata,clamp(wall,0.,1.)*uLayers);
 // PBR-ish lighting
 vec3 V=normalize(uCam-vW);vec3 L=normalize(uSun);
 vec3 Hv=normalize(L+V);
 float wetR=uWet;
 float rough=mix(.95,.6,clamp(uMoist+uWet,0.,1.))+slope*.05-wetR*0.35;
 rough=max(rough,0.12);
 // standing-water glints in dents when soaked
 float puddle=clamp(uWet*1.2-0.35,0.,1.)*(1.0-smoothstep(0.0,0.25,slope))*smoothstep(0.4,0.9,fbm(vW*3.0));
 rough=mix(rough,0.05,puddle);
 float NdotL=max(dot(N,L),0.);
 float NdotV=max(dot(N,V),0.);
 float a=rough*rough,a2=a*a;
 float denom=(NdotL*NdotL*(a2-1.)+1.);denom=3.14159*denom*denom;
 float spec=a2/max(denom,1e-4)/(4.*max(NdotL*NdotV,.05)+.1);
 float wrap=max(dot(N,L)*.5+.5,0.);
 vec3 col=base*(.22+.9*NdotL)*uSunCol+base*wrap*vec3(.25,.32,.4)*.5;
 col+=spec*(0.25+wetR*2.2+ puddle*3.0)*uSunCol*(1.-rough);
 // cavity AO in dents
 col*= .75+.25*clamp(hC*.5+.7,0.,1.);
 // distance fog to sky
 float dist=length(uCam-vW);
 col=mix(col,vec3(.62,.75,.88),1.-exp(-dist*.008));
 o=vec4(col,1.);}`;
const soilProg=prog(soilVS,soilFS);
// smooth grid 300x300 (~90k tris, smooth not blocky)
function makeGround(seg){
 const pos=[],uv=[],idx=[];
 for(let j=0;j<=seg;j++)for(let i=0;i<=seg;i++){
  pos.push((i/seg-.5)*WS,0,(j/seg-.5)*WS);uv.push(i/seg,j/seg);}
 for(let j=0;j<seg;j++)for(let i=0;i<seg;i++){
  const a=j*(seg+1)+i,b=a+1,c=a+seg+1,d=c+1;idx.push(a,c,b,b,c,d);}
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);
 const pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pos),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
 const tb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,tb);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,0,0);
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
 gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(idx),gl.STATIC_DRAW);
 gl.bindVertexArray(null);return{vao,n:idx.length};}
const ground=makeGround(300);
// [SECTION:grass] (use ?only=core,grass — delete-safe: grass OFF still runs)
// ---- GRASS: dense curved tufts, wind + footprints + rain droop ----
const grassVS=`#version 300 es
layout(location=0)in vec3 aP;layout(location=1)in float aT;
layout(location=2)in vec3 aOff;layout(location=3)in float aRot;
layout(location=4)in float aScl;layout(location=5)in float aVar;
uniform mat4 uProj,uView;uniform sampler2D uH;uniform float uTime,uBend,uWet;
out float vT;out float vVar;out float vShade;out vec3 vW;out float vEdge;
void main(){vT=aT;vVar=aVar;
 float c=cos(aRot),s=sin(aRot);
 // curve the blade: bend more at tip, lean dir from variation
 vec3 p=aP;
 float bendAmt=(0.25+0.55*fract(aVar*7.3));
 p.x+=aT*aT*bendAmt*0.55; p.z+=aT*aT*(fract(aVar*3.1)-0.5)*0.5;
 vec3 rp=vec3(p.x*c-p.z*s,p.y,p.x*s+p.z*c)*aScl;
 // wind: gusts travelling across field + per-blade flutter
 float g=sin(uTime*1.4+aOff.x*0.35+aOff.z*0.22)+0.5*sin(uTime*2.7+aOff.z*0.8+aVar*9.0);
 float sway=g*0.06*aT*(1.0-uWet*0.55);
 rp.x+=sway; rp.z+=sway*0.6;
 // rain weight: wet grass droops
 rp.y*=(1.0-uWet*0.28*aT);
 vec2 uv=aOff.xz/90.+.5;
 float h=texture(uH,uv).r;
 float squash=clamp(-h*1.2,0.,.9)*uBend;
 rp.y*=(1.-squash*.85); rp.x*=(1.+squash*.9);
 vShade=1.-squash*.55;
 vEdge=clamp(abs(aP.x)/0.022,0.,1.);
 vec3 w=rp+aOff;w.y+=h;vW=w;
 gl_Position=uProj*uView*vec4(w,1.);}`;
const grassFS=`#version 300 es
precision highp float;
in float vT;in float vVar;in float vShade;in vec3 vW;in float vEdge;
uniform vec3 uCam,uSun;uniform float uMoist,uWet;
out vec4 o;
void main(){
 // deep root -> sunlit tip, per-blade hue variation + dry patches
 vec3 root=mix(vec3(.10,.16,.05),vec3(.20,.24,.08),vVar)*(0.7+0.3*vVar);
 vec3 midA=mix(vec3(.24,.44,.10),vec3(.34,.52,.14),fract(vVar*5.7));
 vec3 tipA=mix(vec3(.42,.66,.18),vec3(.62,.72,.30),fract(vVar*9.3));
 vec3 c=mix(root,midA,smoothstep(0.0,0.55,vT));
 c=mix(c,tipA,smoothstep(0.5,1.0,vT));
 // sunburnt dry tips when dry
 float dry=(1.0-uMoist)*(1.0-uWet);
 c=mix(c,vec3(.55,.48,.22),smoothstep(0.75,1.0,vT)*dry*0.55*vVar);
 // wet: dark saturated blades
 c*=mix(1.0,0.45,clamp(uWet+uMoist*0.35,0.,1.));
 vec3 V=normalize(uCam-vW);
 // fake translucency when sun behind blade
 float back=max(dot(V,normalize(uSun)),0.0);
 c+=vec3(.25,.35,.10)*pow(back,3.0)*(1.0-uWet*0.7)*0.6;
 float dif=.45+.55*max(dot(vec3(0,1,0),normalize(uSun)),0.);
 c*=dif*vShade;
 // taper edge fade so blades look thin not ribbon-flat
  float alpha=(1.0-smoothstep(0.35,1.0,vEdge))*vShade;
  if(alpha<0.04)discard;
 float dist=length(uCam-vW);
 c=mix(c,vec3(.62,.75,.88),1.-exp(-dist*.009));
 o=vec4(c,alpha);}`;
const grassProg=prog(grassVS,grassFS);
let grassVAO=null,grassCount=0;
const GRASS_N=60000;
const _gOff=new Float32Array(GRASS_N*3);
const _gRot=new Float32Array(GRASS_N);
const _gScl=new Float32Array(GRASS_N);
const _gVar=new Float32Array(GRASS_N);
function seedGrass(){
 const tufts=[];
 for(let k=0;k<9000;k++){tufts.push([(Math.random()-.5)*WS*.94,(Math.random()-.5)*WS*.94]);}
 let placed=0,guard=0;
 while(placed<GRASS_N&&guard++<GRASS_N*12){
  const tc=tufts[(Math.random()*tufts.length)|0];
  const x=tc[0]+(Math.random()+Math.random()+Math.random()-1.5)*0.85;
  const z=tc[1]+(Math.random()+Math.random()+Math.random()-1.5)*0.85;
  if(Math.abs(x)>WS*.47||Math.abs(z)>WS*.47){continue;}
  const hh=getH(x,z);
  if(hh<-1.4&&Math.random()<0.9){continue;}
  _gOff[placed*3]=x;_gOff[placed*3+1]=hh-0.03;_gOff[placed*3+2]=z;
  _gRot[placed]=Math.random()*6.28;
  _gScl[placed]=(Math.random()<0.12?1.25+Math.random()*0.7:0.55+Math.random()*0.85);
  _gVar[placed]=Math.random();placed++;
 }
 for(let i=placed;i<GRASS_N;i++){_gScl[i]=0;}
}
seedGrass();
(function buildGrass(){
 const seg=4,w=0.022,h=0.8,bp=[],bt=[],bi=[];
 for(let i=0;i<=seg;i++){
  const k=i/seg;
  bp.push(-w*(1-k*.9),k*h,0,w*(1-k*.9),k*h,0);
  bt.push(k,k);
 }
 for(let i=0;i<seg;i++){const a2=i*2;bi.push(a2,a2+2,a2+1,a2+1,a2+2,a2+3);}
 grassVAO=gl.createVertexArray();gl.bindVertexArray(grassVAO);
 let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(bp),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
 b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(bt),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,1,gl.FLOAT,false,0,0);
 b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
 gl.bufferData(gl.ARRAY_BUFFER,_gOff,gl.STATIC_DRAW);
 gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(2,1);
 b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
 gl.bufferData(gl.ARRAY_BUFFER,_gRot,gl.STATIC_DRAW);
 gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,1,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(3,1);
 b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
 gl.bufferData(gl.ARRAY_BUFFER,_gScl,gl.STATIC_DRAW);
 gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,1,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(4,1);
 b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
 gl.bufferData(gl.ARRAY_BUFFER,_gVar,gl.STATIC_DRAW);
 gl.enableVertexAttribArray(5);gl.vertexAttribPointer(5,1,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(5,1);
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
 gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(bi),gl.STATIC_DRAW);
 gl.bindVertexArray(null);grassCount=bi.length;
})();
// [/SECTION:grass]
// [SECTION:dust] (clods + dust + motes + ambient — ?only=core,dust)
// ---- PARTICLES: ballistic clods (RDR2 kick-up) + dust puffs + motes ----
const pVS=`#version 300 es
layout(location=0)in vec3 aPos;layout(location=1)in vec3 aVel;
layout(location=2)in vec4 aDat; // age,life,size,type
uniform mat4 uProj,uView;uniform float uPix;
out float vA;out float vT;out float vFade;
void main(){
 float age=aDat.x,life=aDat.y;vT=aDat.w;
 float t=clamp(age/life,0.,1.);vFade=1.-t;
 vA=1.-t;
 vec3 p=aPos+aVel*age+vec3(0,-4.5,0)*age*age*(aDat.w<0.5?1.:0.15);
 gl_Position=uProj*uView*vec4(p,1.);
 float sz=aDat.z*(1.-t*.6);
 vec4 cp=uProj*uView*vec4(p,1.);
 float s=sz*uPix/max(1.,cp.w);
 gl_PointSize=clamp(s,1.,64.);}`;
const pFS=`#version 300 es
precision highp float;
in float vA;in float vT;in float vFade;out vec4 o;
void main(){
 vec2 q=gl_PointCoord-.5;float d=length(q);
 if(d>.5)discard;
 float soft=smoothstep(.5,.15,d);
 vec3 c;
 if(vT<0.5)c=mix(vec3(.18,.12,.07),vec3(.42,.30,.17),fract(vA*7.)); // clod
 else if(vT<1.5)c=vec3(.55,.48,.38); // dust
 else if(vT<2.5)c=vec3(.9,.88,.8); // mote sparkle
 else c=vec3(.65,.75,.9); // rain streak
 float a=soft*vFade*(vT<0.5?1.:(vT>2.5?0.55:0.35));
 o=vec4(c,a);}`;
const pProg=prog(pVS,pFS);
const MAXP=12000;
const pPos=new Float32Array(MAXP*3),pVel=new Float32Array(MAXP*3),pDat=new Float32Array(MAXP*4);
for(let i=0;i<MAXP;i++){pDat[i*4]=1e9;pDat[i*4+1]=1;}
let pHead=0;
function spawn(x,y,z,n,pow,type,spread){
 if(type===0&&!OPTS.clods)return;
 if(type===1&&!OPTS.dust)return;
 if(type===2&&!OPTS.motes)return;
 for(let k=0;k<n;k++){
  const i=pHead;pHead=(pHead+1)%MAXP;
  pPos[i*3]=x+(Math.random()-.5)*.5;pPos[i*3+1]=y+Math.random()*.3;pPos[i*3+2]=z+(Math.random()-.5)*.5;
  const a=Math.random()*6.28,r=(0.3+Math.random()*.7)*spread;
  const up=type===0?(2+Math.random()*4)*pow:(0.5+Math.random()*1.2)*pow;
  pVel[i*3]=Math.cos(a)*r*pow;pVel[i*3+1]=up;pVel[i*3+2]=Math.sin(a)*r*pow;
  pDat[i*4]=-Math.random()*.08; // stagger
  pDat[i*4+1]=type===0?.7+Math.random()*.7:1.2+Math.random()*1.5;
  pDat[i*4+2]=type===0?.12+Math.random()*.16:.5+Math.random()*.9;
  pDat[i*4+3]=type;
 }}
const pVAO=gl.createVertexArray();
const bP0=gl.createBuffer(),bP1=gl.createBuffer(),bP2=gl.createBuffer();
function uploadP(){
 gl.bindVertexArray(pVAO);
 gl.bindBuffer(gl.ARRAY_BUFFER,bP0);gl.bufferData(gl.ARRAY_BUFFER,pPos,gl.DYNAMIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,bP1);gl.bufferData(gl.ARRAY_BUFFER,pVel,gl.DYNAMIC_DRAW);
 gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,bP2);gl.bufferData(gl.ARRAY_BUFFER,pDat,gl.DYNAMIC_DRAW);
 gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,0,0);
 gl.bindVertexArray(null);}
uploadP();
function updateP(dt){
 for(let i=0;i<MAXP;i++){
  if(pDat[i*4]>pDat[i*4+1])continue;
  pDat[i*4]+=dt;
  // drag dust sideways with wind
  if(pDat[i*4+3]>0.5){pVel[i*3]+=Math.sin(performance.now()*.001+i)*dt*.4;}
 }
 // ambient motes respawn
 if(Math.random()<.3){
  const i=pHead;pHead=(pHead+1)%MAXP;
  pPos[i*3]=(Math.random()-.5)*WS;pPos[i*3+1]=getH(pPos[i*3],0)+1+Math.random()*3;pPos[i*3+2]=(Math.random()-.5)*WS;
  pVel[i*3]=.2;pVel[i*3+1]=-.05;pVel[i*3+2]=.1;
  pDat[i*4]=0;pDat[i*4+1]=6;pDat[i*4+2]=.06;pDat[i*4+3]=2;
 }
// [/SECTION:dust]
// [SECTION:soil-grains] (surface crumbs — ?only=core,soil-grains)
 uploadP();}
// ---- SURFACE GRAINS: real geometry crumbs on the soil (particle feel) ----
let grainVAO=null,grainCount=0;
const GRAIN_N=9000;
const _grOff=new Float32Array(GRAIN_N*3);
const _grScl=new Float32Array(GRAIN_N);
const _grVar=new Float32Array(GRAIN_N);
function seedGrains(){
 for(let i=0;i<GRAIN_N;i++){
  const x=(Math.random()-.5)*WS*.94,z=(Math.random()-.5)*WS*.94;
  _grOff[i*3]=x;_grOff[i*3+1]=0.015;_grOff[i*3+2]=z;
  _grScl[i]=0.5+Math.random()*1.4;_grVar[i]=Math.random();
 }
}
seedGrains();
const grainVS=`#version 300 es
layout(location=0)in vec3 aP;layout(location=1)in vec3 aOff;
layout(location=2)in float aS;layout(location=3)in float aV;
uniform mat4 uProj,uView;uniform sampler2D uH;uniform float uWet;
out float vV;out float vWet;out vec3 vW;
void main(){vV=aV;vWet=uWet;
 vec3 p=aP*aS*(0.02+aV*0.035);
 float c=cos(aV*6.28),s=sin(aV*6.28);
 vec3 rp=vec3(p.x*c-p.z*s,p.y,p.x*s+p.z*c);
 vec3 w=rp+aOff;
 vec2 uv=aOff.xz/90.+.5;
 w.y+=texture(uH,uv).r;
 vW=w;gl_Position=uProj*uView*vec4(w,1.);}`;
const grainFS=`#version 300 es
precision highp float;
in float vV;in float vWet;in vec3 vW;uniform vec3 uCam,uSun;
out vec4 o;
void main(){
 vec3 c=mix(vec3(.16,.11,.07),vec3(.45,.32,.18),vV);
 c*=0.8+0.4*fract(vV*7.0);
 c*=mix(1.0,0.5,clamp(vWet,0.,1.));
 vec3 V=normalize(uCam-vW);
 float dif=.4+.6*max(dot(vec3(0,1,0),normalize(uSun)),0.);
 float spec=pow(max(dot(reflect(-normalize(uSun),vec3(0,1,0)),V),0.),24.)*vWet;
 c=c*dif+spec*vec3(.8,.85,.9);
 float dist=length(uCam-vW);
 c=mix(c,vec3(.62,.75,.88),1.-exp(-dist*.009));
 o=vec4(c,1.);}`;
const grainProg=prog(grainVS,grainFS);
(function buildGrains(){
 const s=1;
 const bp=[-s,-s,-s,s,-s,-s,s,s,-s,-s,s,-s,-s,-s,s,s,-s,s,s,s,s,-s,s,s];
 const bi=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,2,5,6,2,6,7,0,3,7,0,7,4,1,5,2,3,6,7];
 grainVAO=gl.createVertexArray();gl.bindVertexArray(grainVAO);
 let bb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bb);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(bp),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
 bb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bb);
 gl.bufferData(gl.ARRAY_BUFFER,_grOff,gl.STATIC_DRAW);
 gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(1,1);
 bb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bb);
 gl.bufferData(gl.ARRAY_BUFFER,_grScl,gl.STATIC_DRAW);
 gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,1,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(2,1);
 bb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bb);
 gl.bufferData(gl.ARRAY_BUFFER,_grVar,gl.STATIC_DRAW);
 gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,1,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(3,1);
 const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
// [/SECTION:soil-grains]
// [SECTION:rain] (rain + wet clay state — combine with any set: ?only=core,rain)
// COMBINE GUIDE (all inside this ONE file — pick via URL, no splitting needed):
//   soil only:            ?only=core
//   soil + grass:          ?only=core,grass
//   soil + grains:         ?only=core,soil-grains
//   soil + rain (clay):    ?only=core,rain
//   soil + grass + rain:   ?only=core,grass,rain          <- RAIN COMBINED
//   EVERYTHING:            ?only=core,grass,soil-grains,rain,dust (default, no param)
 gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(bi),gl.STATIC_DRAW);
 gl.bindVertexArray(null);grainCount=bi.length;
})();
// ---- master toggles (everything switchable) ----
Object.assign(OPTS,{walk:true,dig:true,mound:true,foot:true,clods:true,dust:true,motes:true,rain:!!OPTS.rain,grains:OPTS.grains!==false,
 grass:true,grassBend:true,roots:true,stones:true,layers:true,slump:true,lockFlat:true});
function wireToggle(id,key,fn){
 const el=document.getElementById(id);if(!el)return;
 el.addEventListener('click',e=>{
  e.preventDefault();
  const box=el.querySelector('input');box.checked=!box.checked;
  OPTS[key]=box.checked;
  el.classList.toggle('off',!box.checked);
  el.querySelector('b').textContent=box.checked?'ON':'OFF';
  if(fn)fn(box.checked);});}
wireToggle('tWalk','walk');wireToggle('tDig','dig');wireToggle('tMound','mound');
// [/SECTION:rain]
// [SECTION:demo] (walker/camera/panel/inputs — games skip this, call the API instead)
wireToggle('tFoot','foot');wireToggle('tClods','clods');wireToggle('tDust','dust');
wireToggle('tMotes','motes');wireToggle('tGrass','grass');
wireToggle('tGrassBend','grassBend');wireToggle('tRoots','roots');
wireToggle('tStones','stones');wireToggle('tLayers','layers');
wireToggle('tSlump','slump');wireToggle('tLock','lockFlat');
 wireToggle('tRain','rain',function(v){rainTgt=v?1:0;syncRainUI();});
 wireToggle('tGrains','grains');
// ---- walker feet + input ----
let px=0,pz=8,pa=0,stepPh=0;
let camA=0.6,camR=11,camH=4.2;
const keys={};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;
 if(e.key==='c'||e.key==='C')digPit();
 if(e.key==='r'||e.key==='R'){H.set(H0);COMPACT.fill(0);hDirty=true;}
 if(e.key==='1')moistV=0.1;if(e.key==='2')moistV=0.45;if(e.key==='3')moistV=0.9;
 if(e.key==='t'||e.key==='T'){const el=document.getElementById('tRain');if(el){el.click();}}});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
let brushV=2.6,powV=1.0,moistV=0.45,dustV=0.85;
 let rainV=0,wetV=0,rainTgt=0;
 function syncRainUI(){
  const on=rainTgt>0.02;
  rainBtn.textContent=on?'RAIN: ON (KEY T)':'RAIN: OFF (KEY T)';
  rainBtn.style.background=on?'#0288d1':'#4fc3f7';
  const tgl=document.getElementById('tRain');
  if(tgl){const bb=tgl.querySelector('b');if(bb){bb.textContent=on?'ON':'OFF';}tgl.classList.toggle('off',!on);}
  if(typeof rain!=='undefined'&&document.activeElement!==rain){rain.value=rainTgt;rv.textContent=on?(rainTgt<0.5?'drizzle':'storm'):'off';}
 }
 rain.oninput=()=>{rainTgt=+rain.value;rainV=rainTgt;syncRainUI();};
 grassAmt.oninput=()=>{gv.textContent=+grassAmt.value<0.3?'sparse':+grassAmt.value<0.7?'normal':'lush';};
 rainBtn.onclick=()=>{const el=document.getElementById('tRain');if(el){el.click();}};
brush.oninput=()=>{brushV=+brush.value;bv.textContent=brushV.toFixed(1)+'m';};
power.oninput=()=>{powV=+power.value;pv.textContent=powV.toFixed(1);};
moist.oninput=()=>{moistV=+moist.value;mv.textContent=moistV<.25?'dry':moistV<.65?'normal':'wet';};
dust.oninput=()=>{dustV=+dust.value;dv.textContent=dustV<.3?'low':dustV<.7?'med':'high';};
pitBtn.onclick=()=>digPit();
function digPit(){
 const cx=px+Math.sin(pa)*4,cz=pz+Math.cos(pa)*4;
 for(let r=0;r<7;r++){const rr=2.4*(r/7);
  for(let a=0;a<28;a++){const th=a/28*Math.PI*2;
   stamp(cx+Math.cos(th)*rr,cz+Math.sin(th)*rr,3.0,0.035*powV,true,false);}}
 spawn(cx,getH(cx,cz)+1,cz,120,1.4,0,2.5);
 spawn(cx,getH(cx,cz)+1.5,cz,60,1.0,1,3);
}
let mDown=false,mRight=false,mMid=false,mx=0,my=0,space=false;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{if(e.button===0)mDown=true;if(e.button===2)mRight=true;if(e.button===1)mMid=true;mx=e.clientX;my=e.clientY;});
addEventListener('mouseup',e=>{if(e.button===0)mDown=false;if(e.button===2)mRight=false;if(e.button===1)mMid=false;});
addEventListener('mousemove',e=>{if(mMid){camA+=(e.clientX-mx)*.005;camH=Math.max(2,Math.min(40,camH-(e.clientY-my)*.05));}mx=e.clientX;my=e.clientY;});
canvas.addEventListener('wheel',e=>{camR=Math.max(4,Math.min(60,camR+e.deltaY*.02));},{passive:true});
addEventListener('keydown',e=>{if(e.code==='Space')space=true;});
addEventListener('keyup',e=>{if(e.code==='Space')space=false;});
const proj=new Float32Array(16),view=new Float32Array(16);
function mkRay(nx,ny){
 const x=(nx/canvas.width)*2-1,y=1-(ny/canvas.height)*2;
 const eye=[px+Math.sin(camA)*camR,camH,pz+Math.cos(camA)*camR];
 const tgt=[px,0,pz];
 let fx=tgt[0]-eye[0],fy=tgt[1]-eye[1],fz=tgt[2]-eye[2];
 let fl=Math.hypot(fx,fy,fz);fx/=fl;fy/=fl;fz/=fl;
 let rx0=-fz,rz0=fx;let rl=Math.hypot(rx0,rz0)||1;rx0/=rl;rz0/=rl;
 let ux0=fy*rz0,uy0=fz*rx0-fx*rz0,uz0=-fy*rx0;
 const fov=55*Math.PI/180,asp=canvas.width/canvas.height,th=Math.tan(fov/2);
 const dx=x*th*asp,dy=y*th,dz=-1;
 let wx=fx*(-dz)+rx0*dx+ux0*dy,wy=fy*(-dz)+uy0*dy,wz=fz*(-dz)+rz0*dx+uz0*dy;
 const wl=Math.hypot(wx,wy,wz);return{ox:eye[0],oy:eye[1],oz:eye[2],dx:wx/wl,dy:wy/wl,dz:wz/wl};}
function pick(r){let t=0;for(let i=0;i<400;i++){const x=r.ox+r.dx*t,y=r.oy+r.dy*t,z=r.oz+r.dz*t;if(y<getH(x,z))return[x,y,z];t+=.25;}return null;}
const sunDir=[-0.45,0.8,0.35];{const l=Math.hypot(...sunDir);sunDir[0]/=l;sunDir[1]/=l;sunDir[2]/=l;}
let last=performance.now();
function frame(now){
 requestAnimationFrame(frame);
 const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;
 const sp=7*dt;let mxv=0,mzv=0;
 if(keys['w']||keys['arrowup']){mxv+=Math.sin(pa);mzv+=Math.cos(pa);}
 if(keys['s']||keys['arrowdown']){mxv-=Math.sin(pa);mzv-=Math.cos(pa);}
 if(keys['a']||keys['arrowleft'])pa+=2.2*dt;
 if(keys['d']||keys['arrowright'])pa-=2.2*dt;
 if(keys['q'])camA+=1.8*dt;if(keys['e'])camA-=1.8*dt;
 const moving=Math.hypot(mxv,mzv)>0.01;
 if(moving&&OPTS.walk){
  px=Math.max(-WS*.45,Math.min(WS*.45,px+mxv*sp));
  pz=Math.max(-WS*.45,Math.min(WS*.45,pz+mzv*sp));
  stepPh+=dt*9;
  const side=Math.sin(stepPh)>0?1:-1;
  const fx=px+Math.cos(pa)*side*.35,fz=pz-Math.sin(pa)*side*.35;
  const fh=getH(fx,fz);
  stamp(fx,fz,.55,OPTS.foot?(.05+moistV*.06):.02,true,OPTS.foot);
  if(Math.sin(stepPh)>0.92){
   spawn(fx,fh+.15,fz,Math.floor((6+dustV*14)*(1-moistV*.5)),.7,0,1.2);
   spawn(fx,fh+.3,fz,Math.floor(4+dustV*10),.5,1,1.6);
  }
 }
 if(space&&moving){stamp(px,pz,3.2,.12*powV,true,false);spawn(px,getH(px,pz)+.5,pz,10,.9,1,3);}
 if(mDown||mRight){
  const hit=pick(mkRay(mx,my));
  if(hit){const dig=mDown&&!mRight;
   stamp(hit[0],hit[2],Math.max(brushV,3.0),.9*powV*dt*(dig?1:-1),dig,false);
   const n=Math.floor((dig?14:8)*(0.4+dustV)*powV);
   spawn(hit[0],hit[1]+.3,hit[2],n,dig?1.3:.7,0,2.2);
   spawn(hit[0],hit[1]+.6,hit[2],Math.floor(n*.7),.8,1,2.8);
  }
 }
 if(mMid){stamp(px,pz,4,.2*powV,true,false);
  spawn(px,getH(px,pz)+.6,pz,30,1.2,0,3);
  spawn(px,getH(px,pz)+1,pz,20,.9,1,4);mMid=false;}
 slump(dt);flushH();updateP(dt);
  wetV+=(rainTgt-wetV)*Math.min(1,dt*0.7);
  rainV+=(rainTgt-rainV)*Math.min(1,dt*2.0);
  if(wetV>0.02){moistV=Math.min(1,moistV+(wetV-moistV)*Math.min(1,dt*0.5));}
  else{moistV=Math.max(moistV-dt*0.004,moistV);}
  if(rainV>0.02){
   for(let k=0;k<Math.floor(rainV*8);k++){
    const rx=px+(Math.random()-.5)*30,rz=pz+(Math.random()-.5)*30;
    stamp(rx,rz,0.5,0.004*rainV,true,false);
    if(Math.random()<0.3*rainV+dustV*0.1){spawn(rx,getH(rx,rz)+0.15,rz,1,0.5,1,1.0);}
   }
  }
 const gy=getH(px,pz); const eye=[px+Math.sin(camA)*camR,Math.max(camH+gy*.5,gy+3.0),pz+Math.cos(camA)*camR];
 Mat.persp(proj,55*Math.PI/180,canvas.width/canvas.height,.1,500);
 Mat.look(view,eye,[px,getH(px,pz)+1,pz],[0,1,0]);
 gl.clearColor(.55,.72,.88,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);
 gl.useProgram(soilProg);
 gl.uniformMatrix4fv(gl.getUniformLocation(soilProg,'uProj'),false,proj);
 gl.uniformMatrix4fv(gl.getUniformLocation(soilProg,'uView'),false,view);
 gl.uniform3fv(gl.getUniformLocation(soilProg,'uCam'),eye);
 gl.uniform3fv(gl.getUniformLocation(soilProg,'uSun'),sunDir);
 gl.uniform3fv(gl.getUniformLocation(soilProg,'uSunCol'),[1,.96,.86]);
 gl.uniform1f(gl.getUniformLocation(soilProg,'uMoist'),moistV);
 gl.uniform1f(gl.getUniformLocation(soilProg,'uTime'),t);
 gl.uniform1f(gl.getUniformLocation(soilProg,'uRoots'),OPTS.roots?1:0);
 gl.uniform1f(gl.getUniformLocation(soilProg,'uStones'),OPTS.stones?1:0);
 gl.uniform1f(gl.getUniformLocation(soilProg,'uLayers'),OPTS.layers?1:0);
 gl.uniform1f(gl.getUniformLocation(soilProg,'uWet'),wetV);
 // rain darkens sky + sun a touch
 {const gloom=1.0-wetV*0.45;gl.uniform3fv(gl.getUniformLocation(soilProg,'uSunCol'),[1*gloom,.96*gloom,.86*gloom]);}
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,hTex);
 gl.uniform1i(gl.getUniformLocation(soilProg,'uH'),0);
 gl.bindVertexArray(ground.vao);gl.drawElements(gl.TRIANGLES,ground.n,gl.UNSIGNED_INT,0);
 gl.useProgram(grassProg);
  gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);
 gl.uniformMatrix4fv(gl.getUniformLocation(grassProg,'uProj'),false,proj);
 gl.uniformMatrix4fv(gl.getUniformLocation(grassProg,'uView'),false,view);
 gl.uniform1f(gl.getUniformLocation(grassProg,'uTime'),t);
 gl.uniform1f(gl.getUniformLocation(grassProg,'uMoist'),moistV);
 gl.uniform1f(gl.getUniformLocation(grassProg,'uBend'),OPTS.grassBend?1:0);
 gl.uniform1f(gl.getUniformLocation(grassProg,'uWet'),wetV);
 gl.uniform3fv(gl.getUniformLocation(grassProg,'uCam'),eye);
 gl.uniform3fv(gl.getUniformLocation(grassProg,'uSun'),sunDir);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,hTex);
 gl.uniform1i(gl.getUniformLocation(grassProg,'uH'),0);

  gl.bindVertexArray(grassVAO);
  if(OPTS.grass){
   const ga=(typeof grassAmt!=='undefined')?+grassAmt.value:1;
   const drawN=Math.floor(GRASS_N*(0.15+0.85*ga));
   if(drawN>0){gl.drawElementsInstanced(gl.TRIANGLES,grassCount,gl.UNSIGNED_SHORT,0,drawN);}
  }
  if(OPTS.grains&&grainVAO){
   gl.useProgram(grainProg);
   gl.uniformMatrix4fv(gl.getUniformLocation(grainProg,'uProj'),false,proj);
   gl.uniformMatrix4fv(gl.getUniformLocation(grainProg,'uView'),false,view);
   gl.uniform1f(gl.getUniformLocation(grainProg,'uWet'),wetV);
   gl.uniform3fv(gl.getUniformLocation(grainProg,'uCam'),eye);
   gl.uniform3fv(gl.getUniformLocation(grainProg,'uSun'),sunDir);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,hTex);
   gl.uniform1i(gl.getUniformLocation(grainProg,'uH'),0);
   gl.bindVertexArray(grainVAO);gl.drawElementsInstanced(gl.TRIANGLES,grainCount,gl.UNSIGNED_SHORT,0,GRAIN_N);
  }
  if(rainV>0.02){
   for(let k=0;k<Math.floor(rainV*40);k++){
    const i=pHead;pHead=(pHead+1)%MAXP;
    const rxx=px+(Math.random()-.5)*34,rzz=pz+(Math.random()-.5)*34;
    pPos[i*3]=rxx;pPos[i*3+1]=getH(rxx,rzz)+8+Math.random()*6;pPos[i*3+2]=rzz;
    pVel[i*3]=1.2;pVel[i*3+1]=-14-rainV*8;pVel[i*3+2]=0.6;
    pDat[i*4]=0;pDat[i*4+1]=1.1;pDat[i*4+2]=0.10;pDat[i*4+3]=3;
   }
  }
  gl.useProgram(pProg);
 gl.uniformMatrix4fv(gl.getUniformLocation(pProg,'uProj'),false,proj);
 gl.uniformMatrix4fv(gl.getUniformLocation(pProg,'uView'),false,view);
 gl.uniform1f(gl.getUniformLocation(pProg,'uPix'),canvas.height*1.2);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
 gl.bindVertexArray(pVAO);gl.drawArrays(gl.POINTS,0,MAXP);
 gl.depthMask(true);gl.disable(gl.BLEND);gl.bindVertexArray(null);
}
requestAnimationFrame(frame);
// [/SECTION:demo]
// [SECTION:api] — public library surface (games / websites / banners)
const LivingSoil={
 create:function(cfg){
  cfg=cfg||{};
  if(cfg.rain===false){rainTgt=0;OPTS.rain=false;}
  if(cfg.rain===true){rainTgt=1;OPTS.rain=true;}
  if(cfg.grass===false){OPTS.grass=false;}
  if(cfg.grains===false){OPTS.grains=false;}
  if(typeof cfg.moisture==='number'){moistV=cfg.moisture;}
  return api;
 },
 set:function(k,v){OPTS[k]=!!v;return api;},
 setRain:function(v){rainTgt=Math.max(0,Math.min(1,v));rainV=rainTgt;OPTS.rain=rainTgt>0.02;syncRainUI();return api;},
 dig:function(x,z,r,amt){stamp(x,z,r==null?3:r,amt==null?0.2:amt,true,false);return api;},
 mound:function(x,z,r,amt){stamp(x,z,r==null?3:r,amt==null?0.15:amt,false,false);return api;},
 stomp:function(x,z,r){stamp(x==null?px:x,z==null?pz:z,r||4,0.2,true,false);return api;},
 reset:function(){H.set(H0);COMPACT.fill(0);hDirty=true;return api;},
 heightAt:function(x,z){return getH(x,z);},
 opts:OPTS,features:FEAT
};
const api=LivingSoil;
try{
 if(typeof window!=='undefined'){window.LivingSoil=LivingSoil;}
 if(typeof self!=='undefined'&&self!==window){self.LivingSoil=LivingSoil;}
}catch(e){}
// UMD-ish export (bundlers / workers)
try{if(typeof module!=='undefined'&&module.exports){module.exports=LivingSoil;}}catch(e){}
// [/SECTION:api]
