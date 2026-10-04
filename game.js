/* ARCHITECTURE: World = seeded deterministic state, mutated only by apply(action). Net.send() stamps + broadcasts actions
   (local loopback now; swap for a WebSocket relay + shared seed for multiplayer). */
const $=id=>document.getElementById(id),V3=THREE.Vector3;
const N=100,S=20,C=S/N,FLOOR=-5.6,ME='local',KIND={tank:'a buried septic tank',iron:'an old cast-iron pipe',gas:'a gas line — careful!',well:'an old well ring'};
const FIND={can:['trash',5,'a tin can'],bottle:['trash',5,'a glass bottle'],boot:['trash',10,'an old boot'],coin:['artifact',50,'a coin'],arrow:['artifact',75,'an arrowhead'],pot:['artifact',100,'a clay pot'],idol:['artifact',150,'a golden idol']};
const FSZ={can:.08,bottle:.09,boot:.06,coin:.02,arrow:.04,pot:.07,idol:.09};/* half-height, origin at the mesh centre */
const BIN=[-9,3],CRATE=[9,4];
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const PROT=[[-8,-6,1.1],[8.3,-4,.9],[-7.6,6.5,1],[BIN[0],BIN[1],.6],[CRATE[0],CRATE[1],.9]];/* x, z, protect radius for trees, bin, crate */
class World{
 constructor(seed){this.seed=seed;const r=rng(seed),n=(N+1)**2,p=[r()*6,r()*6,r()*6];
  this.H=new Float32Array(n);this.B=new Float32Array(n);this.D=new Uint8Array(n);this.PW=new Float32Array(n).fill(1);this.digs=0;
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const x=i*C-S/2,z=j*C-S/2,k=j*(N+1)+i,e=Math.min(i,j,N-i,N-j)*C,f=Math.min(1,e/2.5);
   /* base relief fades to exactly 0 at the border so it meets the flat outer ground with no gap */
   this.H[k]=this.B[k]=(.12*Math.sin(x*.35+p[0])*Math.cos(z*.3+p[1])+.05*Math.sin(x*.9+z*.7+p[2]))*f*f*(3-2*f);
   /* roots hold the soil under trees, the bin and the crate: dig weight ramps 0 -> 1 from .7r to 1.2r around each */
   for(const[ox,oz,or]of PROT){const t=Math.min(1,Math.max(0,(Math.hypot(x-ox,z-oz)/or-.7)/.5));this.PW[k]=Math.min(this.PW[k],t*t*(3-2*t))}}
  this.sig=[];const top={burst:.16,tank:.55,iron:.17,gas:.13,well:.5};
  const place=(kind,y)=>{let x,z,t=0;do{x=(r()-.5)*15;z=(r()-.5)*15}while(t++<80&&this.sig.some(s=>Math.hypot(s.x-x,s.z-z)<5));this.sig.push({kind,x,y,z,top:top[kind],f:0,a:r()*3.14})};
  place('burst',-3.5-r()*.4);place('tank',-1.8-r()*.5);place('iron',-1.5-r()*.5);place('gas',-1.3-r()*.5);place('well',-2.2-r()*.4);
  const b=this.sig[0],a=b.a;this.burst=new V3(b.x,b.y,b.z);
  this.curve=new THREE.CatmullRomCurve3([-6,-2.5,0,2.5,6].map(s=>new V3(b.x+Math.cos(a)*s,b.y+s*.02,b.z+Math.sin(a)*s)));this.bt=.5;
  /* trash sits shallow, artifacts deep; depth is below the local surface so nothing pokes through the lawn */
  this.score=0;this.finds=[];
  const spot=()=>{let x,z,t=0;do{x=(r()-.5)*16.4;z=(r()-.5)*16.4}while(++t<80&&(PROT.some(([ox,oz,or])=>Math.hypot(x-ox,z-oz)<or+1.15)||this.finds.some(q=>Math.hypot(q.x-x,q.z-z)<1.35)||this.sig.some(s=>Math.hypot(s.x-x,s.z-z)<1.5)||Math.hypot(x-2.4,z+7.4)<1.7));return[x,z]};
  const bury=(kind,d0,d1)=>{const[type,pts]=FIND[kind],[x,z]=spot();this.finds.push({kind,type,pts,sz:FSZ[kind],x,y:this.hAt(x,z)-(d0+r()*(d1-d0)),z,a:r()*6.283,held:0,done:0,out:0})};
  for(let i=0;i<4;i++)for(const k of['can','bottle','boot'])bury(k,.2,1.8);
  for(const k of['coin','arrow','pot','idol','coin'])bury(k,1.5,4)}
 hAt(x,z){const u=(x+S/2)/C,v=(z+S/2)/C;let i=Math.max(0,Math.min(N-1,Math.floor(u))),j=Math.max(0,Math.min(N-1,Math.floor(v)));
  const fu=Math.min(1,Math.max(0,u-i)),fv=Math.min(1,Math.max(0,v-j)),H=this.H,k=j*(N+1)+i;
  return(H[k]*(1-fu)+H[k+1]*fu)*(1-fv)+(H[k+N+1]*(1-fu)+H[k+N+2]*fu)*fv}
 apply(a){if(a.type!=='dig')return;const{x,z}=a,R=1,M=1.6,P=7,W=this,L=C*1.1;
  const ix=v=>Math.floor((v+S/2)/C);
  for(let j=Math.max(0,ix(z-M));j<=Math.min(N,ix(z+M)+1);j++)for(let i=Math.max(0,ix(x-M));i<=Math.min(N,ix(x+M)+1);i++){const d=Math.hypot(i*C-S/2-x,j*C-S/2-z),k=j*(N+1)+i;
   if(d<R){const t=1-d/R;W.H[k]=Math.max(FLOOR,W.H[k]-.18*t*t*(3-2*t)*W.PW[k]);W.D[k]=1}else if(d<M){W.H[k]+=.03*Math.sin(Math.PI*(d-R)/(M-R));W.D[k]=1}}
  /* angle of repose: steep soil slumps downhill, so deep holes must be wide */
  const i0=Math.max(1,ix(x-P)),i1=Math.min(N-1,ix(x+P)+1),j0=Math.max(1,ix(z-P)),j1=Math.min(N-1,ix(z+P)+1);
  for(let it=0;it<10;it++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=j*(N+1)+i;for(const q of[k+1,k-1,k+N+1,k-N-1]){const d=W.H[k]-W.H[q];if(d>L){const m=(d-L)*.3*W.PW[k];if(m>0){W.H[k]-=m;W.H[q]+=m;W.D[k]=W.D[q]=1}}}}
  for(let t=0;t<=N;t++)for(const e of[t,N*(N+1)+t,t*(N+1),t*(N+1)+N]){W.H[e]=W.B[e];W.D[e]=0}/* border stays flush with the outer ground */
  W.digs++}
 exposed(){let c=0;for(let t=-.02;t<=.021;t+=.02){const p=this.curve.getPoint(this.bt+t);if(this.hAt(p.x,p.z)<p.y+.1)c++}return c>=2}
}
const Net={seq:0,hs:[],on(h){this.hs.push(h)},send(a){a.seq=++this.seq;this.hs.forEach(h=>h(a))}};

/* ---------- renderer: gamma-correct, filmic, PBR ---------- */
const cv=$('c'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true});
R.setPixelRatio(1);R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
const scene=new THREE.Scene();scene.fog=new THREE.Fog(lin(0xcfe0e8),35,150);
const cam=new THREE.PerspectiveCamera(70,1,.05,300);cam.rotation.order='YXZ';scene.add(cam);
function resize(){const pr=Math.min(devicePixelRatio,1.5),w=Math.round(innerWidth*pr),h=Math.round(innerHeight*pr);R.setSize(w,h,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();if(window.fxResize)fxResize(w,h)}addEventListener('resize',resize);resize();
scene.add(new THREE.HemisphereLight(lin(0xbcd6ff),lin(0x5a4630),.7));
const sun=new THREE.DirectionalLight(lin(0xfff1d6),1.8);sun.position.set(-16,9,-6);sun.castShadow=true;sun.shadow.mapSize.set(3072,3072);
const sc=sun.shadow.camera;sc.left=sc.bottom=-16;sc.right=sc.top=16;sc.far=50;sun.shadow.bias=-.0004;sun.shadow.normalBias=.05;scene.add(sun);
function cvTex(w,h,fn,rx=1,ry=1){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
{/* sky dome with soft clouds */
 const t=cvTex(1024,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#2f6bc0');g.addColorStop(.45,'#86b6e6');g.addColorStop(.5,'#d3e4ee');g.addColorStop(1,'#d9e6e0');x.fillStyle=g;x.fillRect(0,0,w,h);x.filter='blur(7px)';
  for(let i=0;i<45;i++){const px=Math.random()*w,py=110+Math.random()*120;for(let k=0;k<7;k++){x.fillStyle='rgba(255,255,255,.2)';x.beginPath();x.ellipse(px+k*26-78,py+Math.random()*12,40+Math.random()*34,10+Math.random()*9,0,0,6.3);x.fill()}}});
 scene.add(new THREE.Mesh(new THREE.SphereGeometry(200,32,16),new THREE.MeshBasicMaterial({map:t,side:THREE.BackSide,fog:false,toneMapped:false,depthWrite:false})))}

/* ---------- materials & scenery ---------- */
const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:lin(c),roughness:.9,metalness:0},o)),obst=[];
const speckle=(x,w,h,a)=>{const im=x.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*a;d[i]+=n;d[i+1]+=n;d[i+2]+=n}x.putImageData(im,0,0)},
 siding=cvTex(256,256,(x,w,h)=>{x.fillStyle='#e8dec9';x.fillRect(0,0,w,h);for(let y=0;y<h;y+=16){const g=x.createLinearGradient(0,y,0,y+16);g.addColorStop(0,'#f7f0e0');g.addColorStop(.7,'#e6dcc6');g.addColorStop(1,'#cfc3a8');x.fillStyle=g;x.fillRect(0,y,w,16);x.fillStyle='#8f836b';x.fillRect(0,y+14,w,2);x.fillStyle='#fffaf0';x.fillRect(0,y,w,1);
   for(let i=0;i<5;i++){x.fillStyle=`rgba(120,100,70,${Math.random()*.12})`;x.fillRect(Math.random()*w,y+2,20+Math.random()*90,1)}}speckle(x,w,h,16)},4,2),
 wood=cvTex(128,128,(x,w,h)=>{x.fillStyle='#b48a58';x.fillRect(0,0,w,h);for(let i=0;i<110;i++){x.fillStyle=`rgba(${Math.random()<.5?'70,40,15':'220,180,120'},${Math.random()*.25})`;x.fillRect(Math.random()*w,0,1+Math.random()*2,h)}
   for(let i=0;i<3;i++){const kx=Math.random()*w,ky=Math.random()*h;x.strokeStyle='rgba(60,32,12,.5)';for(let r=1;r<5;r++){x.beginPath();x.ellipse(kx,ky,r*1.2,r*3,0,0,6.3);x.stroke()}}speckle(x,w,h,14)}),
 soilTex=cvTex(512,512,(x,w,h)=>{x.fillStyle='#c8c8c8';x.fillRect(0,0,w,h);
  const wrap=(f)=>{for(const dx of[-w,0,w])for(const dy of[-h,0,h])f(dx,dy)};
  /* soft mottling (big blotches), then clumps, then pebbles with highlight + shadow, then per-pixel grain */
  for(let i=0;i<140;i++){const px=Math.random()*w,py=Math.random()*h,r=20+Math.random()*50,v=Math.random()<.5?60:235;wrap((dx,dy)=>{const g=x.createRadialGradient(px+dx,py+dy,0,px+dx,py+dy,r);g.addColorStop(0,`rgba(${v},${v},${v},.16)`);g.addColorStop(1,`rgba(${v},${v},${v},0)`);x.fillStyle=g;x.fillRect(px+dx-r,py+dy-r,r*2,r*2)})}
  for(let i=0;i<3500;i++){const px=Math.random()*w,py=Math.random()*h,r=1+Math.random()*(i%5?3:10),v=90+Math.random()*165|0;x.fillStyle=`rgba(${v},${v},${v},${.2+Math.random()*.4})`;wrap((dx,dy)=>{x.beginPath();x.arc(px+dx,py+dy,r,0,6.3);x.fill()})}
  for(let i=0;i<260;i++){const px=Math.random()*w,py=Math.random()*h,r=1.5+Math.random()*3.5;wrap((dx,dy)=>{x.fillStyle='rgba(40,40,40,.45)';x.beginPath();x.ellipse(px+dx+1.2,py+dy+1.4,r,r*.8,0,0,6.3);x.fill();x.fillStyle=`rgb(${190+Math.random()*60|0},${190+Math.random()*60|0},${190+Math.random()*60|0})`;x.beginPath();x.ellipse(px+dx,py+dy,r,r*.8,0,0,6.3);x.fill()})}
  const im=x.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*34;d[i]+=n;d[i+1]+=n;d[i+2]+=n}x.putImageData(im,0,0)},26,26);
const brickTex=cvTex(128,128,(x,w,h)=>{x.fillStyle='#4a3a32';x.fillRect(0,0,w,h);for(let r=0;r<8;r++)for(let c=-1;c<4;c++){const bx=c*32+(r%2?16:0),v=Math.random()*40|0;x.fillStyle=`rgb(${150+v},${72+v/2},${56+v/3})`;x.fillRect(bx+1,r*16+1,30,14)}speckle(x,w,h,26)},2,3),
 shingleTex=cvTex(64,64,(x,w,h)=>{x.fillStyle='#d8d8d8';x.fillRect(0,0,w,h);for(let row=0;row<2;row++)for(let c=0;c<2;c++){const v=190+Math.random()*60|0;x.fillStyle=`rgb(${v},${v},${v})`;x.fillRect(row*32+1,c*32+(row?16:0)+1,30,30)}
  x.fillStyle='rgba(0,0,0,.55)';for(let row=0;row<2;row++)x.fillRect(row*32,0,2,h);x.fillStyle='rgba(0,0,0,.3)';for(let row=0;row<2;row++)for(let c=0;c<3;c++)x.fillRect(row*32,(c*32+(row?16:0))%h,32,1);speckle(x,w,h,18)},21,19);
function box(w,h,d,c,x,y,z,o){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,o));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m}
function cyl(a,b,h,c,x,y,z,o){const m=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,14),mat(c,o));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m}
function blob(r,c,x,y,z,sx=1,sy=1,sz=1){const g=new THREE.SphereGeometry(r,16,12),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const k=1+Math.sin(p.getX(i)*5.1+p.getY(i)*3.7)*Math.cos(p.getZ(i)*4.3)*.17;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k,p.getZ(i)*k)}g.computeVertexNormals();
 const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;scene.add(m);return m}
/* ---------- hedges & gardens: neighbour lots + a tall perimeter hedge that closes in the neighbourhood ---------- */
const HD={n:0,r:rng(21)},HY=new V3(0,1,0),
 HFP=[[0,-12.5,0,14,5],[-27,-9,1.5708,9,7],[-27,14,1.5708,8,6],[28,-8,-1.5708,10,7],[28,15,-1.5708,8,6.5],[-32,47,3.1416,10,7],[0,49,3.1416,11,7],[34,47,3.1416,9,7]];/* house footprints x,z,rot,w,d */
HD.m=(()=>{const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=.9+.14*Math.sin(x*7.3+y*5.1)*Math.cos(z*6.1+y*3.3);p.setXYZ(i,x*k,y*k,z*k)}
 g.computeVertexNormals();const m=new THREE.InstancedMesh(g,mat(0xffffff,{roughness:1}),2600);m.castShadow=m.receiveShadow=true;m.frustumCulled=false;scene.add(m);return m})();/* keep count at capacity until the first setColorAt (r128 sizes instanceColor from mesh.count) */
function hedgeLine(x0,z0,x1,z1,h,w,gap){const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.ceil(L/(w*.55))),o=new THREE.Object3D(),c=new THREE.Color(),r=HD.r;
 for(let i=0;i<=n;i++){const t=i/n,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;if(gap&&Math.hypot(x-gap[0],z-gap[1])<gap[2])continue;if(HD.n>=2600)break;
  const s=.85+r()*.3;o.position.set(x+(r()-.5)*.25,oh(x,z)+h*.42,z+(r()-.5)*.25);o.rotation.set(0,r()*6,0);o.scale.set(w*.6*s,h*.58*(.92+r()*.16),w*.6*s);o.updateMatrix();
  HD.m.setMatrixAt(HD.n,o.matrix);HD.m.setColorAt(HD.n,c.setHSL(.25+r()*.07,.58,.2+r()*.14).convertSRGBToLinear());HD.n++}
 HD.m.count=HD.n;HD.m.instanceMatrix.needsUpdate=true;if(HD.m.instanceColor)HD.m.instanceColor.needsUpdate=true}
/* lot around a house at (cx,cz) rotated ry, house size w x d; front (door side) is local +z */
function lot(cx,cz,ry,w,d){const W=(lx,lz)=>{const v=new V3(lx,0,lz).applyAxisAngle(HY,ry);return[cx+v.x,cz+v.z]},hw=w/2+3,bk=-d/2-3,fr=d/2+5.5,gp=W(0,fr),
  L=(a,b,c,e,h,wd,g)=>{const p=W(a,b),q=W(c,e);hedgeLine(p[0],p[1],q[0],q[1],h,wd,g)};
 L(-hw,bk,hw,bk,1.7,1.1);L(hw,bk,hw,fr,1.7,1.1);L(-hw,fr,-hw,bk,1.7,1.1);L(-hw,fr,hw,fr,.75,.8,[gp[0],gp[1],1.4]);
 for(let z=d/2+.9;z<fr-.3;z+=.95){const p=W(0,z);box(1.3,.07,.6,0x9c9a92,p[0],oh(p[0],p[1])+.03,p[1]).rotation.y=ry}
}
function perimeter(){const a=-52,b=52,c=-34,e=62;hedgeLine(a,c,b,c,3.8,1.9);hedgeLine(b,c,b,e,3.8,1.9);hedgeLine(b,e,a,e,3.8,1.9);hedgeLine(a,e,a,c,3.8,1.9)}
{buildOuter();
 const im=new THREE.InstancedMesh(new THREE.BoxGeometry(.2,1.3,.05),mat(0xffffff,{map:wood}),320),o=new THREE.Object3D();let n=0;
 const add=(x,z,r)=>{o.position.set(x,.6,z);o.rotation.y=r;o.updateMatrix();im.setMatrixAt(n++,o.matrix)};
 for(let k=-10;k<=10;k+=.26){add(k,10.1,0);add(-10.1,k,1.5708);add(10.1,k,1.5708)}
 /* back stretches: close the gap between the side fences and the house (house front face is z=-10, x=-7..7) */
 for(let k=7;k<=10.1;k+=.26){add(k,-10,0);add(-k,-10,0)}
 im.count=n;im.castShadow=im.receiveShadow=true;scene.add(im);
 for(const y of[.3,1.05]){box(20.4,.08,.1,0x8f6b40,0,y,10.17);box(.1,.08,20.4,0x8f6b40,-10.17,y,0);box(.1,.08,20.4,0x8f6b40,10.17,y,0);box(3.3,.08,.1,0x8f6b40,8.55,y,-10.07);box(3.3,.08,.1,0x8f6b40,-8.55,y,-10.07)}
 /* house */
 box(14,5,5,0xffffff,0,2.5,-12.5,{map:siding});
 const rg=new THREE.CylinderGeometry(1,1,15.4,3).rotateZ(Math.PI/2).rotateX(-Math.PI/2),rf=new THREE.Mesh(rg,mat(0x7a4636,{map:shingleTex,roughness:.85}));rf.scale.set(1,2.3,6.2);rf.position.set(0,6.1,-12.6);rf.castShadow=true;scene.add(rf);
 box(1,2.2,1,0xffffff,4.5,6.8,-12.5,{map:brickTex,roughness:.95});box(1.25,.16,1.25,0x8a8580,4.5,7.95,-12.5);box(14.2,.18,.3,0xe6e0d4,0,5,-9.9);box(14.2,.1,.14,0x8a8f94,0,4.82,-9.82,{roughness:.4,metalness:.5});
 /* foundation (split around the door), corner boards */
 for(const fx of[-4,4])box(6.2,.4,5.2,0x77716a,fx,.2,-12.5,{roughness:1});
 for(const cx of[-7,7])box(.22,5,.22,0xf5f0e4,cx,2.5,-9.98);
 for(const x of[-4.2,4.2]){box(1.9,1.9,.12,0xf2efe8,x,2.8,-9.96);box(1.6,1.6,.14,0x2d4a63,x,2.8,-9.94,{roughness:.15,metalness:.4});box(.06,1.6,.16,0xf2efe8,x,2.8,-9.93);box(1.6,.06,.16,0xf2efe8,x,2.8,-9.93);
  box(2.2,.1,.28,0xe6e0d4,x,1.82,-9.86);box(2.2,.16,.2,0xf2efe8,x,3.82,-9.9);
  for(const sx of[-1.2,1.2]){box(.5,1.9,.07,0x3f5a48,x+sx,2.8,-9.93);for(let s=0;s<6;s++)box(.4,.03,.02,0x2f4636,x+sx,2.1+s*.28,-9.885)}}
 /* door: frame, panelled leaf, handle, small hood, step, lamp */
 box(1.5,2.7,.14,0xf2efe8,0,1.35,-9.96);box(1.2,2.5,.16,0x5a3a22,0,1.25,-9.93,{map:wood});
 for(const py of[.8,1.75])for(const px of[-.28,.28])box(.4,.8,.03,0x4a2e1a,px,py,-9.84,{map:wood});
 cyl(.04,.04,.06,0xd8b24a,.42,1.2,-9.82,{metalness:.8,roughness:.3}).rotation.x=Math.PI/2;
 box(2.2,.1,1,0x6e3a2e,0,3.05,-9.5);for(const bx of[-1,1])box(.08,.55,.08,0xf2efe8,bx,2.75,-9.55);
 box(1.9,.15,.7,0xa7a39a,0,.075,-9.65);
 box(.14,.25,.14,0x222222,1.4,2.2,-9.9);box(.1,.14,.1,0xfff2c0,1.4,2.2,-9.84,{emissive:0xffe9a0,emissiveIntensity:1.5});
 /* trees + bin: soil around them is held by roots (see PROT in World), so they never float or sink */
 [[-8,-6,1.4],[8.3,-4,1.1],[-7.6,6.5,1.2]].forEach(([x,z,s])=>{cyl(.16*s,.3*s,2.4*s,0x4d3520,x,1.2*s,z);
  [[0,3.3,0,1.5],[.8,4,-.3,1.1],[-.8,3.9,.4,1.15],[.2,4.6,.1,.95],[0,3,.9,1],[-.3,3.2,-.9,1]].forEach(([a,b,c,r],i)=>blob(r*s,i%2?0x3a7a30:0x2d6a2c,x+a*s,b*s,z+c*s));obst.push({x,z,r:.5*s})});
 const rb=rng(7);for(let k=0;k<14;k++){const t=-9+k*1.4;[[9.3,t],[-9.3,t],[t,9.3]].forEach(([x,z])=>{if(rb()<.5){const s=.5+rb()*.5,c=rb()<.5;if(Math.hypot(x-CRATE[0],z-CRATE[1])>1.35)blob(s,c?0x2d6a2b:0x3d8036,x,s*.7,z,1.2,.85,1.2)}})}
 cyl(.35,.3,.9,0x6b7378,BIN[0],.45,BIN[1],{roughness:.5,metalness:.3});cyl(.38,.38,.08,0x4c5358,BIN[0],.92,BIN[1]);
 /* open crate for artifacts, facing the yard */
 const[cx,cz]=CRATE;
 box(1.02,.08,.78,0xffffff,cx,.08,cz,{map:wood,roughness:.85});
 box(.07,.5,.78,0xffffff,cx-.47,.36,cz,{map:wood,roughness:.85});box(.07,.5,.78,0xffffff,cx+.47,.36,cz,{map:wood,roughness:.85});
 box(1.02,.5,.07,0xffffff,cx,.36,cz-.35,{map:wood,roughness:.85});box(1.02,.5,.07,0xffffff,cx,.36,cz+.35,{map:wood,roughness:.85});
 box(.84,.18,.6,0x241c16,cx,.24,cz,{roughness:1});
 for(const yy of[.24,.46])box(.02,.04,.66,0x6b5340,cx-.52,yy,cz,{roughness:.9});
 obst.push({x:cx,z:cz,r:.7});
}

/* ---------- surrounding world: hills, street, neighbours, forest ---------- */
function oh(x,z){const r=Math.hypot(x,z),m=Math.min(1,Math.max(0,(r-55)/80)),n=Math.sin(x*.021+1.3)*Math.cos(z*.017+.4)+.5*Math.sin(x*.05+z*.043)+.25*Math.sin(x*.11-z*.09);return m*m*(3-2*m)*(9+24*(.5+.2*n))}
function house(x,z,ry,w,d,h,wc,rc,y=0){const G=new THREE.Group();G.position.set(x,y,z);G.rotation.y=ry;scene.add(G);
 const A=(m,a,b,c)=>{m.position.set(a,b,c);m.castShadow=m.receiveShadow=true;G.add(m);return m},B=(w2,h2,d2,c,o)=>new THREE.Mesh(new THREE.BoxGeometry(w2,h2,d2),mat(c,o));
 A(B(w,h,d,wc,{map:siding}),0,h/2,0);const rise=h*.4,rf=A(new THREE.Mesh(new THREE.CylinderGeometry(1,1,w+.8,3).rotateZ(Math.PI/2).rotateX(-Math.PI/2),mat(rc,{roughness:.8})),0,h+.5*rise,0);rf.scale.set(1,rise,(d/2+.45)/.87);
 for(const i of[-1,1]){A(B(w*.2,h*.3,.12,0xf2efe8),i*w*.27,h*.6,d/2+.02);A(B(w*.17,h*.26,.14,0x2d4a63,{roughness:.15,metalness:.4}),i*w*.27,h*.6,d/2+.03)}
 A(B(1,2.1,.14,0x5a3a22),0,1.05,d/2+.03);A(B(.8,rise*1.5,.8,0x8a5a48),w*.3,h+rise*.9,0)}
function buildOuter(){
 const r=rng(11),gt=soilTex.clone();gt.repeat.set(390,390);gt.needsUpdate=true;/* same texel density as the play area (26 tiles per 20 m) */
 const g=new THREE.PlaneGeometry(300,300,150,150).rotateX(-Math.PI/2),P=g.attributes.position,cl=new Float32Array(P.count*3);
 for(let i=0;i<P.count;i++){const x=P.getX(i),z=P.getZ(i),h=oh(x,z),rr=Math.hypot(x,z),q=Math.abs(Math.sin(x*12.9+z*78.2)*437.5)%1;P.setY(i,h);
  const n=Math.sin(x*.09)*Math.sin(z*.11)+.7*Math.sin(x*.031+z*.027);let cr=.2+.06*q,cg=.42+.08*q,cb=.14;
  if(rr>40&&rr<105&&n>.45&&!(Math.abs(x)<54&&z>-36&&z<64)){cr=.6+.05*q;cg=.52+.05*q;cb=.24}
  if(h>16){const k=Math.min(1,(h-16)/8);cr+=(.5-cr)*k;cg+=(.47-cg)*k;cb+=(.42-cb)*k}
  cl[i*3]=cr*cr*1.6;cl[i*3+1]=cg*cg*1.6;cl[i*3+2]=cb*cb*1.6}
 g.setAttribute('color',new THREE.BufferAttribute(cl,3));
 const ix=g.index.array,keep=[];for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(Math.abs(P.getX(a)+P.getX(b)+P.getX(c))<30&&Math.abs(P.getZ(a)+P.getZ(b)+P.getZ(c))<30)continue;keep.push(a,b,c)}
 g.setIndex(keep);g.computeVertexNormals();scene.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,map:gt,bumpMap:gt,bumpScale:3,roughness:1})));
 const HS=[[-27,-9,1.5708,9,7,4.2,0x9fb3c4,0x5a3a32],[-27,14,1.5708,8,6,4,0xd8c39a,0x3d3d44],[28,-8,-1.5708,10,7,4.4,0xc9877a,0x4a4a50],[28,15,-1.5708,8,6.5,4,0x9db08c,0x6a3b2e],[-32,47,3.1416,10,7,4.2,0xe0d6bf,0x55402f],[0,49,3.1416,11,7,4.6,0x8fa3b8,0x3f3f46],[34,47,3.1416,9,7,4.2,0xb98a6c,0x4a3a35]];
 HS.forEach(a=>house(...a));HS.forEach(a=>lot(a[0],a[1],a[2],a[3],a[4]));perimeter();
 house(-80,-58,.6,12,9,6,0x8c2f2a,0x44464a,oh(-80,-58));const sy=oh(-66,-52);cyl(2.2,2.2,10,0xb7bdc2,-66,sy+5,-52,{metalness:.3,roughness:.5});const cap=new THREE.Mesh(new THREE.ConeGeometry(2.4,2,14),mat(0x6d737a));cap.position.set(-66,sy+11,-52);scene.add(cap);
 const tree=(x,z,s)=>{cyl(.16*s,.3*s,2.4*s,0x4d3520,x,1.2*s,z);[[0,3.3,0,1.5],[.8,4,-.3,1.1],[-.8,3.9,.4,1.15],[.2,4.6,.1,.95]].forEach(([a,b,c,q],i)=>blob(q*s,i%2?0x3a7a30:0x2d6a2c,x+a*s,b*s,z+c*s))};
 [[-22,2,1.2],[22,2,1.1],[-23,-20,1.3],[24,-19,1.2],[-22,25,1],[23,26,1.1]].forEach(a=>tree(...a));
 box(104,.05,8,0x3a3a3f,0,.025,30,{roughness:.95});for(let k=0;k<14;k++)box(2.5,.06,.2,0xe8e0a0,-46+k*7.1,.04,30);box(104,.12,2,0xb8b5ac,0,.06,25.5);box(104,.12,2,0xb8b5ac,0,.06,34.5);
 for(let k=-2;k<=2;k++){const x=k*18;cyl(.1,.14,8,0x5a4a3a,x+9,4,36.8);box(2.2,.12,.12,0x5a4a3a,x+9,7.6,36.8);cyl(.06,.08,5,0x333840,x,2.5,24.6);box(.7,.12,.3,0x333840,x+.3,5,24.6);
  const lm=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:new THREE.Color(5,4,2.4)}));lm.position.set(x+.4,4.9,24.6);scene.add(lm)}
 box(4.2,.7,1.8,0xa83232,-14,.65,28.3,{roughness:.35,metalness:.5});box(2.2,.6,1.6,0x23303a,-14.3,1.28,28.3,{roughness:.1,metalness:.6});
 for(const dx of[-1.4,1.4])for(const dz of[-.9,.9])cyl(.36,.36,.25,0x111111,-14+dx,.36,28.3+dz).rotation.x=Math.PI/2;
 const TN=460,RC=150,o=new THREE.Object3D(),cc=new THREE.Color(),bad=(x,z)=>HS.some(a=>Math.hypot(x-a[0],z-a[1])<13)||(Math.abs(z-30)<8&&Math.abs(x)<58)||Math.hypot(x+78,z+58)<16||Math.hypot(x,z)<46||Math.abs(Math.max(Math.abs(x)-52,Math.abs(z-14)-48))<5;
 const TK=new THREE.InstancedMesh(new THREE.CylinderGeometry(.2,.3,2.4,6).translate(0,1.2,0),mat(0x4d3520),TN+RC),C1=new THREE.InstancedMesh(new THREE.ConeGeometry(1.7,4.4,8).translate(0,3.8,0),mat(0xffffff),TN),C2=new THREE.InstancedMesh(new THREE.ConeGeometry(1.2,3.4,8).translate(0,6,0),mat(0xffffff),TN),CR=new THREE.InstancedMesh(new THREE.SphereGeometry(2,10,8).translate(0,4.6,0),mat(0xffffff),RC);
 for(let i=0;i<TN+RC;i++){let x,z,t=0;do{const a=r()*6.283,d=46+Math.pow(r(),.8)*90;x=Math.cos(a)*d;z=Math.sin(a)*d}while(bad(x,z)&&t++<30);const sc=1+r()*1.2;
  o.position.set(x,oh(x,z)-.15,z);o.rotation.set(0,r()*6,0);o.scale.setScalar(sc);o.updateMatrix();TK.setMatrixAt(i,o.matrix);
  if(i<TN){C1.setMatrixAt(i,o.matrix);C2.setMatrixAt(i,o.matrix);const h=.3+r()*.05,l=.12+r()*.1;C1.setColorAt(i,cc.setHSL(h,.5,l).convertSRGBToLinear());C2.setColorAt(i,cc.setHSL(h,.5,l+.04).convertSRGBToLinear())}
  else{CR.setMatrixAt(i-TN,o.matrix);CR.setColorAt(i-TN,cc.setHSL(r()<.3?.1+r()*.05:.25+r()*.07,.55,.2+r()*.1).convertSRGBToLinear())}}
 [TK,C1,C2,CR].forEach(m=>{m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.frustumCulled=false;scene.add(m)})}

/* ---------- terrain ---------- */
const tg=new THREE.PlaneGeometry(S,S,N,N).rotateX(-Math.PI/2),pos=tg.attributes.position,col=new THREE.BufferAttribute(new Float32Array(pos.count*3),3);tg.setAttribute('color',col);
const terrain=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({vertexColors:true,map:soilTex,bumpMap:soilTex,bumpScale:3,roughness:1}));terrain.receiveShadow=terrain.castShadow=true;scene.add(terrain);
const NZ=new Float32Array(pos.count);for(let j=0;j<=N;j++)for(let i=0;i<=N;i++)NZ[j*(N+1)+i]=Math.abs(Math.sin(i*12.9898+j*78.233)*43758.5453)%1;
let world;const L2=v=>v*v*1.6,SC=[0,0,0];
/* soil colour by depth below the original surface (shared by terrain + dig particles); writes into SC */
function soilRGB(d,n){let r,g,b;
  if(d<.5){r=.3+.05*n;g=.2+.03*n;b=.12}
  else if(d<1.1){r=.55+.05*n;g=.36+.04*n;b=.2}
  else if(d<2.3){const s=Math.sin(d*14)*.04;r=.66+s;g=.55+s;b=.36+s}
  else if(d<3.5){const s=Math.sin(d*11)*.03+n*.04;r=.5+s;g=.46+s;b=.4+s}
  else{r=.3+n*.04;g=.32+n*.04;b=.35+n*.04}
  SC[0]=r;SC[1]=g;SC[2]=b}
function sync(){const W=world;
 for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const k=j*(N+1)+i,h=W.H[k],d=W.B[k]-h,n=NZ[k];let r,g,b;
  if(!W.D[k]&&d<.05){const lf=Math.sin(i*.17)*Math.cos(j*.13);r=.2+.07*n+.03*lf;g=.4+.12*n+.06*lf;b=.12+.04*n}
  else{soilRGB(d,n);r=SC[0];g=SC[1];b=SC[2]}
  const ao=1-Math.min(Math.max(d,0),4)*.13;pos.setY(k,h);col.setXYZ(k,L2(r*ao),L2(g*ao),L2(b*ao))}
 pos.needsUpdate=col.needsUpdate=true;tg.computeVertexNormals();tg.computeBoundingSphere()}

/* ---------- grass, buried rocks, buried objects ---------- */
const GN=26000,gg=new THREE.ConeGeometry(.024,.4,3,3,true).translate(0,.2,0);
{const a=gg.attributes.position,cc=new Float32Array(a.count*3);for(let i=0;i<a.count;i++){const y=a.getY(i)/.4;a.setX(i,a.getX(i)+y*y*.12);cc.fill(.15+.85*Math.min(1,y),i*3,i*3+3)}gg.computeVertexNormals();gg.setAttribute('color',new THREE.BufferAttribute(cc,3))}
const grass=new THREE.InstancedMesh(gg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),GN),gp=[],go=new THREE.Object3D(),gc=new THREE.Color();grass.receiveShadow=true;grass.frustumCulled=false;scene.add(grass);
const GU={uT:{value:0}};grass.material.onBeforeCompile=sd=>{sd.uniforms.uT=GU.uT;sd.vertexShader='uniform float uT;\n'+sd.vertexShader.replace('#include <begin_vertex>','vec3 transformed=vec3(position);float wv=position.y/.4;vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);transformed.x+=sin(uT*1.8+ip.x*.7+ip.z*.5)*.06*wv;transformed.z+=cos(uT*1.4+ip.x*.4+ip.z*.8)*.05*wv;')};
const MG=40,MC=.5,mown=new Uint8Array(MG*MG),gbuck=[];/* 0.5 m mown grid over the 20 m yard, blades bucketed per cell */
const mcell=(x,z)=>Math.max(0,Math.min(MG-1,Math.floor((x+S/2)/MC)))+MG*Math.max(0,Math.min(MG-1,Math.floor((z+S/2)/MC)));
function buildGrass(){const r=rng(world.seed+1);gp.length=0;mown.fill(0);for(let i=0;i<MG*MG;i++)gbuck[i]=[];
 for(let n=0;n<GN;n++){let x,z;do{x=(r()-.5)*19.6;z=-9.8+r()*19.6}while(!free(x,z)||(Math.abs(x)<1.2&&z<-9));const s=.7+r()*.9,y=world.hAt(x,z)-.02;gp.push({x,z,y,s});gbuck[mcell(x,z)].push(n);
 go.position.set(x,y,z);go.rotation.set((r()-.5)*.5,r()*6,(r()-.5)*.5);go.scale.set(1,s,1);go.updateMatrix();grass.setMatrixAt(n,go.matrix);grass.setColorAt(n,gc.setHSL(.22+r()*.06,.55,.28+r()*.18).convertSRGBToLinear())}
 grass.instanceMatrix.needsUpdate=grass.instanceColor.needsUpdate=true}
/* cut whole cells whose centre is under the deck, so the swath is a solid strip instead of scattered blades */
function mowAt(x,z,rad){let ch=0;const i0=Math.max(0,Math.floor((x-rad+S/2)/MC)),i1=Math.min(MG-1,Math.floor((x+rad+S/2)/MC)),j0=Math.max(0,Math.floor((z-rad+S/2)/MC)),j1=Math.min(MG-1,Math.floor((z+rad+S/2)/MC));
 for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const ci=i+MG*j;if(mown[ci])continue;if(Math.hypot((i+.5)*MC-S/2-x,(j+.5)*MC-S/2-z)>rad)continue;mown[ci]=1;ch=1;
  for(const n of gbuck[ci]){const q=gp[n];if(q.gone||q.cut)continue;q.cut=1;
   go.position.set(q.x,q.y,q.z);go.rotation.set(0,0,0);go.scale.set(1,q.s*.12,1);go.updateMatrix();grass.setMatrixAt(n,go.matrix)}}
 if(ch)grass.instanceMatrix.needsUpdate=true}
/* a dig needs the aim spot and its neighbours within ~1 m mown (no grass cells count as mown) */
function isMown(x,z){for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const cx=x+i*MC,cz=z+j*MC;if(Math.hypot(i,j)>2.2||Math.abs(cx)>9.9||Math.abs(cz)>9.9)continue;const ci=mcell(cx,cz);if(mown[ci]||!gbuck[ci].length)continue;/* a dug cell has lost its grass, so it no longer blocks the shovel */
  if(gbuck[ci].some(n=>!gp[n].gone&&!gp[n].cut))return false}return true}
/* static grass beyond the fence so the surroundings match the lawn; thins out with distance */
{const ON=40000,og=new THREE.InstancedMesh(gg,grass.material,ON),r=rng(5);og.receiveShadow=true;og.frustumCulled=false;
 for(let n=0;n<ON;){const x=(r()-.5)*47,z=(r()-.5)*47,d=Math.max(Math.abs(x),Math.abs(z));
  if(d<10.4||(Math.abs(x)<7.8&&z<-9.8&&z>-15.4)||r()>Math.exp(-(d-10)/8))continue;
  const s=.8+r()*1;go.position.set(x,-.02,z);go.rotation.set((r()-.5)*.5,r()*6,(r()-.5)*.5);go.scale.set(1.9,s,1.9);go.updateMatrix();og.setMatrixAt(n,go.matrix);og.setColorAt(n,gc.setHSL(.22+r()*.06,.55,.28+r()*.18).convertSRGBToLinear());n++}
 og.instanceMatrix.needsUpdate=og.instanceColor.needsUpdate=true;scene.add(og)}
/* far lawn: cheap 3-triangle tufts out to the hedge line, skipping the street, house footprints and front paths */
{const FN=70000,fg=new THREE.ConeGeometry(.05,.42,3,1,true).translate(0,.21,0),fa=fg.attributes.position,fc=new Float32Array(fa.count*3);
 for(let i=0;i<fa.count;i++)fc.fill(.2+.8*Math.min(1,fa.getY(i)/.42),i*3,i*3+3);fg.setAttribute('color',new THREE.BufferAttribute(fc,3));
 const fm=new THREE.InstancedMesh(fg,grass.material,FN),r=rng(6),Y=new V3(0,1,0),v=new V3();fm.receiveShadow=true;fm.frustumCulled=false;
 const blocked=(x,z)=>{if(z>23.8&&z<37.8)return true;for(const[cx,cz,ry,w,d]of HFP){v.set(x-cx,0,z-cz).applyAxisAngle(Y,-ry);if((Math.abs(v.x)<w/2+1.2&&v.z>-d/2-1.2&&v.z<d/2+1.2)||(Math.abs(v.x)<.9&&v.z>0&&v.z<d/2+5.8))return true}return false};
 for(let n=0;n<FN;){const x=-51+r()*102,z=-33+r()*94;if(Math.max(Math.abs(x),Math.abs(z))<22||blocked(x,z))continue;
  const s=.8+r()*.9;go.position.set(x,oh(x,z)-.02,z);go.rotation.set((r()-.5)*.4,r()*6,(r()-.5)*.4);go.scale.set(1.2+r()*.8,s,1.2+r()*.8);go.updateMatrix();fm.setMatrixAt(n,go.matrix);
  fm.setColorAt(n,gc.setHSL(.21+r()*.07,.55,.24+r()*.16).convertSRGBToLinear());n++}
 fm.instanceMatrix.needsUpdate=fm.instanceColor.needsUpdate=true;scene.add(fm)}
function clearGrass(x,z){let ch=0;go.position.set(0,-50,0);go.rotation.set(0,0,0);go.scale.setScalar(0);go.updateMatrix();
 for(let n=0;n<GN;n++){const q=gp[n];if(q.gone||Math.abs(q.x-x)>7||Math.abs(q.z-z)>7)continue;if(Math.hypot(q.x-x,q.z-z)<1.75||Math.abs(world.hAt(q.x,q.z)-q.y)>.05){q.gone=1;grass.setMatrixAt(n,go.matrix);ch=1}}if(ch)grass.instanceMatrix.needsUpdate=true}
const rockG=(()=>{const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=.82+.18*Math.sin(x*4.1+y*2.3)*Math.cos(z*3.7-y*1.9)+.1*Math.sin(x*9.3+z*7.1+y*5.2);p.setXYZ(i,x*k,y*k*.85,z*k)}
 g.computeVertexNormals();return g})();
const RN=700,rocks=new THREE.InstancedMesh(rockG,mat(0xffffff,{roughness:.95}),RN);rocks.castShadow=rocks.receiveShadow=true;scene.add(rocks);
const rk=[];
function setRock(n){const q=rk[n];go.position.set(q.x,q.y,q.z);go.rotation.set(q.a,q.b,q.c);go.scale.set(q.s*q.w,q.s,q.s*q.w);go.updateMatrix();rocks.setMatrixAt(n,go.matrix)}
function buildRocks(){const r=rng(world.seed+2);rk.length=0;for(let n=0;n<RN;n++){const s=.07+Math.pow(r(),3)*.5;rk.push({x:(r()-.5)*19,y:-.15-Math.pow(r(),1.3)*5,z:(r()-.5)*19,a:r()*6,b:r()*6,c:r()*6,s,w:1+r()*.6});setRock(n);rocks.setColorAt(n,gc.setHSL(.08+r()*.05,.12+r()*.1,.25+r()*.3).convertSRGBToLinear())}
 rocks.instanceMatrix.needsUpdate=rocks.instanceColor.needsUpdate=true}
function settleRocks(x,z){let ch=0;for(let n=0;n<RN;n++){const q=rk[n];if(Math.abs(q.x-x)>9||Math.abs(q.z-z)>9)continue;const h=world.hAt(q.x,q.z);if(q.y>h+q.s*.2){q.y=h+q.s*.3;setRock(n);ch=1}}if(ch)rocks.instanceMatrix.needsUpdate=true}
let pipeG;
function buildBuried(){if(pipeG)scene.remove(pipeG);pipeG=new THREE.Group();const add=(m,x,y,z)=>{m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;pipeG.add(m);return m};
 const cu=mat(0xc2733a,{roughness:.4,metalness:.35}),rust=mat(0x6a2f12);
 add(new THREE.Mesh(new THREE.TubeGeometry(world.curve,80,.16,12),cu),0,0,0);
 for(const t of[.1,.3,.5,.7,.9]){const r=add(new THREE.Mesh(new THREE.TorusGeometry(.17,.035,8,16),cu),0,0,0);r.position.copy(world.curve.getPoint(t));r.quaternion.setFromUnitVectors(new V3(0,0,1),world.curve.getTangent(t))}
 const bp=world.burst,cr=add(new THREE.Mesh(new THREE.TorusGeometry(.2,.05,8,16),rust),bp.x,bp.y,bp.z);cr.quaternion.setFromUnitVectors(new V3(0,0,1),world.curve.getTangent(world.bt));
 add(new THREE.Mesh(new THREE.IcosahedronGeometry(.12,1),new THREE.MeshBasicMaterial({color:0x080402})),bp.x,bp.y+.14,bp.z).scale.set(1.2,.35,1);
 for(const s of world.sig.slice(1)){let m;
  if(s.kind==='tank'){m=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.1,2.4),mat(0x8a8a84));add(new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.15,16),mat(0x6d6d68)),s.x,s.y+.6,s.z)}
  else if(s.kind==='iron'){m=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,3.2,12),mat(0x3a302a,{roughness:.6,metalness:.3}));m.rotation.set(0,s.a,Math.PI/2)}
  else if(s.kind==='gas'){m=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,3.2,12),mat(0xd8b42a,{roughness:.5}));m.rotation.set(0,s.a,Math.PI/2)}
  else m=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,1,20,1,true),mat(0x8d8a82,{side:THREE.DoubleSide}));
  add(m,s.x,s.y,s.z)}
 scene.add(pipeG)}

/* buried finds: hidden until the soil above them is gone, then they sit on the hole floor */
function syncFind(f){if(f.done||f.held){f.m.visible=false;return}const h=world.hAt(f.x,f.z);if(f.out||f.y+f.sz>=h-.02){f.out=1;f.y=h+f.sz}f.m.position.set(f.x,f.y,f.z);f.m.rotation.set(0,f.a,0);f.m.visible=!!f.out}
function findOut(f){return !f.done&&!f.held&&!!f.out}
function settleFinds(x,z){for(const f of world.finds){if(f.done||f.held||Math.abs(f.x-x)>7||Math.abs(f.z-z)>7)continue;syncFind(f)}}
let findG;
function buildFinds(){if(findG){findG.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});scene.remove(findG)}
 findG=new THREE.Group();scene.add(findG);
 const mesh=(g,c,o)=>{const m=new THREE.Mesh(g,mat(c,o));m.castShadow=m.receiveShadow=true;return m},gold={metalness:.85,roughness:.28,emissive:0x6a5010,emissiveIntensity:.28};
 for(const f of world.finds){const g=new THREE.Group();
  if(f.kind==='can'){const m=mesh(new THREE.CylinderGeometry(.05,.052,.12,10),0xc5c9c4,{roughness:.35,metalness:.72});m.rotation.z=1;const lid=mesh(new THREE.CylinderGeometry(.054,.054,.014,10),0xd5d8d2,{roughness:.3,metalness:.8});lid.position.y=.06;m.add(lid);g.add(m)}
  else if(f.kind==='bottle'){const b=mesh(new THREE.CylinderGeometry(.028,.034,.11,8),0x2f6a4a,{transparent:true,opacity:.8,roughness:.12,metalness:.05});b.position.y=-.02;const n=mesh(new THREE.CylinderGeometry(.012,.015,.05,8),0x3d7a58,{transparent:true,opacity:.8,roughness:.12});n.position.y=.06;g.add(b,n)}
  else if(f.kind==='boot'){const sole=mesh(new THREE.BoxGeometry(.15,.04,.07),0x4a3224,{roughness:1});sole.position.y=-.02;const u=mesh(new THREE.BoxGeometry(.07,.08,.068),0x3b291c,{roughness:1});u.position.set(-.035,.03,0);g.add(sole,u)}
  else if(f.kind==='coin')g.add(mesh(new THREE.CylinderGeometry(.05,.05,.018,16),0xe2b434,gold))
  else if(f.kind==='arrow'){const m=mesh(new THREE.ConeGeometry(.034,.11,4),0x8a8074,{roughness:.82,emissive:0x3a342c,emissiveIntensity:.3});m.rotation.z=Math.PI/2;g.add(m)}
  else if(f.kind==='pot'){const pts=[];for(let i=0;i<=7;i++){const t=i/7;pts.push(new THREE.Vector2(.024+.058*Math.sin(t*2.2)*(.45+.55*Math.sin(t*Math.PI)),t*.13))}const m=mesh(new THREE.LatheGeometry(pts,9),0xb4683c,{roughness:.92,emissive:0x4a2818,emissiveIntensity:.22});m.position.y=-.065;g.add(m)}
  else{const body=mesh(new THREE.ConeGeometry(.045,.11,6),0xe2b434,gold);body.position.y=-.01;const head=mesh(new THREE.SphereGeometry(.03,8,6),0xf0d060,gold);head.position.y=.075;g.add(body,head)}
  f.m=g;g.visible=false;findG.add(g);syncFind(f)}}

/* ---------- shovel, markers, particles ---------- */
/* first-person shovel. Built along +Y (tip at y=0, D-grip at y=1.2), then tilted so the blade points forward-down-centre
   and the handle runs back to the lower-right. `sh` (origin = grip) is what the dig animation pivots. */
const sh=new THREE.Group();{
 const steel=new THREE.MeshStandardMaterial({color:lin(0xaab4bc),roughness:.4,metalness:.5,emissive:lin(0x14171a),side:THREE.DoubleSide}),
  dark=new THREE.MeshStandardMaterial({color:lin(0x6e777e),roughness:.55,metalness:.5,emissive:lin(0x0c0e10),side:THREE.DoubleSide}),
  wd=mat(0xffffff,{map:wood,roughness:.7}),glove=mat(0x7a5530,{roughness:.9}),shov=new THREE.Group();
 const bg=new THREE.PlaneGeometry(1,1,12,14),bp=bg.attributes.position;
 for(let i=0;i<bp.count;i++){const t=bp.getY(i)+.5,u=bp.getX(i)*2,hw=t<.55?.1*Math.sqrt(Math.max(0,1-Math.pow((.55-t)/.55,1.7))):.1-.014*(t-.55)/.45,x=u*hw;bp.setXYZ(i,x,t*.32-.32,1.9*x*x+.01*(1-u*u)*t)}
 bg.computeVertexNormals();
 const blade=new THREE.Group(),b1=new THREE.Mesh(bg,steel),b2=new THREE.Mesh(bg,dark);b2.position.z=-.007;blade.add(b1,b2);blade.position.y=.32;blade.rotation.x=.32;
 const rim=new THREE.Mesh(new THREE.BoxGeometry(.2,.018,.05),steel);rim.position.set(0,.325,.012);
 const sock=new THREE.Mesh(new THREE.CylinderGeometry(.027,.042,.14,12),dark);sock.position.y=.38;
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.022,.024,.86,12),wd);shaft.position.y=.78;
 const bar=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.2,10),wd);bar.rotation.z=Math.PI/2;bar.position.y=1.2;
 const post=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.09,10),wd);post.position.y=1.16;
 const gl=[.98,.66].map(y=>{const g=new THREE.Mesh(new THREE.SphereGeometry(.058,14,10),glove);g.scale.set(1.05,1.5,1.05);g.position.y=y;return g});
 shov.add(blade,rim,sock,shaft,bar,post,...gl);
 const dh=new V3(.45,-.25,.86).normalize(),nn=new V3(-.25,1,.2);nn.addScaledVector(dh,-nn.dot(dh)).normalize();
 shov.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3().crossVectors(dh,nn).normalize(),dh,nn));
 shov.position.copy(dh).multiplyScalar(-1.2);
 sh.add(shov);cam.add(sh);sh.visible=false}
/* ---------- push mower: deck, wheels, engine, bag, handle. Spawned near the house path each yard ---------- */
const mower=new THREE.Group();{const body=mat(0xc0392b,{roughness:.55,metalness:.15}),steel2=mat(0xc8d0d6,{roughness:.35,metalness:.6}),tyre=mat(0x222222,{roughness:.9});
 const deck=new THREE.Mesh(new THREE.CylinderGeometry(.42,.45,.16,20),body);deck.position.y=.26;mower.add(deck);
 const chute=new THREE.Mesh(new THREE.BoxGeometry(.28,.1,.34),body);chute.position.set(0,.34,-.32);mower.add(chute);
 const eng=new THREE.Mesh(new THREE.BoxGeometry(.3,.22,.3),mat(0x2c2c2c,{roughness:.6,metalness:.4}));eng.position.set(0,.42,.05);mower.add(eng);
 const bag=new THREE.Mesh(new THREE.BoxGeometry(.46,.4,.28),mat(0x6b5a3a,{roughness:.95}));bag.position.set(0,.52,-.55);mower.add(bag);
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.9,8),steel2);handle.position.set(0,.72,-.72);handle.rotation.x=-.85;mower.add(handle);
 const grip=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.34,8),mat(0x111111,{roughness:.8}));grip.position.set(0,1.05,-1.02);grip.rotation.z=Math.PI/2;mower.add(grip);
 mower.wheels=[];for(const[wx,wz]of[[-.34,.28],[.34,.28],[-.34,-.28],[.34,-.28]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(wz<0?.11:.17,wz<0?.11:.17,.06,12),tyre);w.rotation.z=Math.PI/2;w.position.set(wx,.17,wz);mower.add(w);mower.wheels.push(w)}
 [deck,chute,eng,bag].forEach(m=>{m.castShadow=m.receiveShadow=true});scene.add(mower)}
let mowerHeld=false,mowerOn=false,clipM,mowX,mowZ;
function placeMower(){mowerHeld=false;mowerOn=false;mower.position.set(2.4,world.hAt(2.4,-7.4),-7.4);mower.rotation.set(0,0,0);if(clipM){clipM.gain.gain.value=0;clipM.blade.gain.value=0}}
/* ---------- carried rock (drawn in the hands; the instance stays hidden in `rocks`) ---------- */
let carry=-1,carryF=-1,carryFM=null;const carryM=new THREE.Mesh(rockG,mat(0xffffff,{roughness:.95}));carryM.castShadow=true;carryM.visible=false;cam.add(carryM);
const handsBusy=()=>mowerHeld||carry>=0||carryF>=0;
function clearCarryF(){carryF=-1;if(carryFM){cam.remove(carryFM);carryFM=null}}
function holdFind(n){if(carryFM)cam.remove(carryFM);carryF=n;const f=world.finds[n];carryFM=f.m.clone(true);carryFM.visible=true;carryFM.traverse(o=>{if(o.isMesh)o.castShadow=true});carryFM.scale.setScalar(Math.min(2.4,.1/Math.max(.03,f.sz)));cam.add(carryFM)}
const rings=[],rgeo=new THREE.RingGeometry(.985,1,120).rotateX(-Math.PI/2);
function addRing(x,z,r){const m=new THREE.Mesh(rgeo,new THREE.MeshBasicMaterial({color:0x7fe0ff,transparent:true,opacity:.6,depthTest:false,toneMapped:false}));m.position.set(x,.35,z);m.scale.setScalar(.01);m.renderOrder=5;scene.add(m);rings.push({m,r,t:0});if(rings.length>30){scene.remove(rings.shift().m)}}
const pg=new THREE.IcosahedronGeometry(.07,0),waterM=new THREE.MeshBasicMaterial({color:0x9fd4ff,transparent:true,opacity:.8}),parts=[],pmc={};
/* dig-particle material matching the layer at depth d (d<0 = grass tuft); cached by layer colour bucket */
function soilMat(d,n){const gr=d<0;if(!gr)soilRGB(d,n);const sh=.8+.35*Math.random(),r=gr?.2:SC[0],g=gr?.42:SC[1],b=gr?.12:SC[2],key=gr?'g'+(Math.random()*3|0):[r,g,b].map(v=>Math.round(v*sh*12)).join();
 return pmc[key]||(pmc[key]=new THREE.MeshStandardMaterial({color:new THREE.Color(L2(r*sh*.8),L2(g*sh*.8),L2(b*sh*.8)),roughness:1}))}
function digDepth(x,z){const k=Math.max(0,Math.min(N,Math.round((z+S/2)/C)))*(N+1)+Math.max(0,Math.min(N,Math.round((x+S/2)/C)));return{d:world.B[k]-world.H[k],n:NZ[k]}}
function spawn(p,v,life,w,sm){if(parts.length>520)return;const m=new THREE.Mesh(pg,w?waterM:sm);m.scale.setScalar(w?.7:.6+Math.random()*1.1);m.position.copy(p);m.castShadow=!w;scene.add(m);parts.push({m,v,life,w})}
function stepParts(dt){for(let i=parts.length-1;i>=0;i--){const q=parts[i],P=q.m.position;q.life-=dt;q.v.y-=(q.w?7:11)*dt;P.addScaledVector(q.v,dt);
 const g=world.hAt(P.x,P.z);if(P.y<g&&!q.w){P.y=g;q.v.set(0,0,0)}if(q.life<=0||(q.w&&P.y<g)){scene.remove(q.m);parts.splice(i,1)}}}

/* ---------- audio (synthesized) ---------- */
let AC,NB,hissG;
function audio(){if(AC){AC.resume();return}AC=new(window.AudioContext||window.webkitAudioContext)();NB=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 const lp=(type,fq,g)=>{const s=AC.createBufferSource();s.buffer=NB;s.loop=true;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=fq;const o=AC.createGain();o.gain.value=g;s.connect(f);f.connect(o);o.connect(AC.destination);s.start();return o};
 lp('lowpass',350,.06);hissG=lp('bandpass',3200,0);
 /* mower: a droning single-cylinder engine (two slightly detuned saws) plus a quiet blade whir */
 const mo=AC.createOscillator(),mo2=AC.createOscillator(),mb=AC.createOscillator();mo.type=mo2.type='sawtooth';mb.type='triangle';mo.frequency.value=62;mo2.frequency.value=63.5;mb.frequency.value=190;
 const mf=AC.createBiquadFilter();mf.type='lowpass';mf.frequency.value=420;mf.Q.value=.7;const mg=AC.createGain();mg.gain.value=0;const mbg=AC.createGain();mbg.gain.value=0;
 mo.connect(mf);mo2.connect(mf);mf.connect(mg);mb.connect(mbg);mg.connect(AC.destination);mbg.connect(AC.destination);mo.start();mo2.start();mb.start();clipM={gain:mg,blade:mbg}}
function nz(type,fq,dur,vol,dl=0){if(!AC)return;const s=AC.createBufferSource();s.buffer=NB;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=fq;const g=AC.createGain(),t=AC.currentTime+dl;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t,Math.random(),dur)}
function grain(n,span,type,f0,f1,vol,dl=0){for(let i=0;i<n;i++)nz(type,f0+Math.random()*(f1-f0),.04,vol*(.5+Math.random()*.5),dl+Math.random()*span)}
function sweep(type,f0,f1,dur,vol,dl=0){if(!AC)return;const s=AC.createBufferSource();s.buffer=NB;const f=AC.createBiquadFilter();f.type=type;f.Q.value=2;const g=AC.createGain(),t=AC.currentTime+dl;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(vol,t+dur*.2);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t,Math.random(),dur)}
/* shovel bites in (gritty scrape), lifts, then the load thumps and showers off */
function thud(){sweep('bandpass',3600,800,.2,.4);grain(10,.2,'bandpass',900,3400,.25);nz('lowpass',280,.4,1,.26);nz('lowpass',1100,.18,.4,.26);grain(16,.4,'lowpass',250,800,.2,.28);if(Math.random()<.2)grain(2,.1,'highpass',4000,6000,.2,.12)}
function clank(){nz('highpass',2400,.08,.4);nz('bandpass',680,.14,.35);nz('lowpass',160,.1,.3)}
function ping(){if(!AC)return;const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type='sine';o.frequency.setValueAtTime(740,t);o.frequency.exponentialRampToValueAtTime(1480,t+.08);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.16,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+.32)}
function stepSnd(){const k=Math.round((pz+S/2)/C)*(N+1)+Math.round((px+S/2)/C);
 if(pz<-8&&Math.abs(px)<4){nz('bandpass',1600,.05,.25);nz('lowpass',300,.06,.35)}
 else if(world.D[k]){nz('lowpass',650,.13,.4+Math.random()*.1);grain(4,.08,'bandpass',1500,3800,.14)}
 else{nz('bandpass',2400,.12,.09);nz('lowpass',380,.09,.22);grain(2,.06,'bandpass',3000,6000,.05)}}

/* ---------- shaders: MSAA HDR target, SSAO, bloom, god rays, grading, sun glow ---------- */
const hdr=R.capabilities.isWebGL2&&(R.extensions.has('EXT_color_buffer_float')||R.extensions.has('EXT_color_buffer_half_float')),TY=hdr?THREE.HalfFloatType:THREE.UnsignedByteType,LF={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter};
const rtC=new THREE.WebGLMultisampleRenderTarget(2,2,Object.assign({type:TY},LF)),rtD=new THREE.WebGLRenderTarget(2,2,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter}),
 rtB1=new THREE.WebGLRenderTarget(2,2,Object.assign({type:TY,depthBuffer:false},LF)),rtB2=new THREE.WebGLRenderTarget(2,2,Object.assign({type:TY,depthBuffer:false},LF));rtC.samples=4;
const qs=new THREE.Scene(),qc=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));quad.frustumCulled=false;qs.add(quad);
const sm=(fs,u)=>new THREE.ShaderMaterial({uniforms:u,vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 v;'+fs,depthTest:false,depthWrite:false}),pass=(m,t)=>{quad.material=m;R.setRenderTarget(t);R.render(qs,qc)};
const bright=sm('uniform sampler2D t;void main(){vec3 c=texture2D(t,v).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.75,1.7,l),1.);}',{t:{value:null}}),
 blur=sm('uniform sampler2D t;uniform vec2 d;void main(){vec3 s=texture2D(t,v).rgb*.227;s+=(texture2D(t,v+d).rgb+texture2D(t,v-d).rgb)*.1946;s+=(texture2D(t,v+d*2.).rgb+texture2D(t,v-d*2.).rgb)*.1216;s+=(texture2D(t,v+d*3.).rgb+texture2D(t,v-d*3.).rgb)*.054;s+=(texture2D(t,v+d*4.).rgb+texture2D(t,v-d*4.).rgb)*.0162;gl_FragColor=vec4(s,1.);}',{t:{value:null},d:{value:new THREE.Vector2()}}),
 comp=sm(`uniform sampler2D tC,tD,tB;uniform vec2 sun,res,tx;uniform float sI,asp,nr,fr,tm;
const vec4 UF=(255./256.)/vec4(16777216.,65536.,256.,1.);
float ld(vec2 u){float z=dot(texture2D(tD,u),UF)*2.-1.;return 2.*nr*fr/(fr+nr-z*(fr-nr));}
vec3 vp(vec2 u){float z=ld(u);return vec3((u*2.-1.)*vec2(asp,1.)*.7*z,-z);}
float hs(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 float z=ld(v),ao=1.;
 if(z<120.){vec3 P=vp(v),Px=vp(v+vec2(tx.x,0.)),Mx=vp(v-vec2(tx.x,0.)),Py=vp(v+vec2(0.,tx.y)),My=vp(v-vec2(0.,tx.y));
  vec3 dx=abs(Px.z-P.z)<abs(P.z-Mx.z)?Px-P:P-Mx,dy=abs(Py.z-P.z)<abs(P.z-My.z)?Py-P:P-My,N=normalize(cross(dx,dy));if(N.z<0.)N=-N;
  float a=hs(v*res)*6.283,cs=cos(a),sn=sin(a),occ=0.,Rw=.9;
  for(int i=0;i<12;i++){float fi=float(i),r=sqrt((fi+.5)/12.),b=fi*2.39996;vec2 o=vec2(cos(b),sin(b))*r;o=vec2(o.x*cs-o.y*sn,o.x*sn+o.y*cs);
   vec3 w=vp(v+o*vec2(1./asp,1.)*Rw*.714/z)-P;float d=length(w);occ+=max(0.,dot(N,w/d)-.2)*(1.-smoothstep(.25,Rw,d));}
  ao=clamp(1.-occ/12.*2.6,.3,1.);}
 vec3 bl=texture2D(tB,v).rgb;vec2 dir=(sun-v)/20.*.95,u=v;vec3 ry=vec3(0.);float il=1.;
 for(int i=0;i<20;i++){u+=dir;ry+=texture2D(tB,u).rgb*il;il*=.93;}
 vec2 q=v-.5;vec3 col=vec3(texture2D(tC,v+q*.0012).r,texture2D(tC,v).g,texture2D(tC,v-q*.0012).b);
 col*=mix(1.,ao,.9);col+=bl*.5+ry*sI*.07;col*=1.25;
 col=(col*(2.51*col+.03))/(col*(2.43*col+.59)+.14);
 float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,1.2);col*=mix(vec3(.94,1.,1.08),vec3(1.07,1.,.9),smoothstep(.1,.8,l));
 col=pow(max(col,0.),vec3(1./2.2));col=mix(col,col*col*(3.-2.*col),.3);
 col*=1.-.4*smoothstep(.4,1.05,length(q*vec2(asp,1.)*1.15));col+=(hs(v*res+tm)-.5)*.018;
 gl_FragColor=vec4(col,1.);}`,{tC:{value:null},tD:{value:null},tB:{value:null},sun:{value:new THREE.Vector2()},res:{value:new THREE.Vector2(1,1)},tx:{value:new THREE.Vector2()},sI:{value:0},asp:{value:1},nr:{value:cam.near},fr:{value:cam.far},tm:{value:0}});
const depthMat=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),sdir=sun.position.clone().normalize(),sv=new V3();
const gl=cvTex(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(255,240,200,.8)');g.addColorStop(1,'rgba(255,200,120,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});
const sunS=[[70,.9,.7,.4],[9,8,7,5]].map(([z,r,g,b])=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gl,color:new THREE.Color(r,g,b),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));sp.scale.setScalar(z);scene.add(sp);return sp});
window.fxResize=(w,h)=>{rtC.setSize(w,h);rtD.setSize(w>>1,h>>1);rtB1.setSize(w>>2,h>>2);rtB2.setSize(w>>2,h>>2);const u=comp.uniforms;u.res.value.set(w,h);u.tx.value.set(2/w,2/h);u.asp.value=w/h};
function fxRender(){
 sunS.forEach(q=>q.position.copy(cam.position).addScaledVector(sdir,170));
 R.setRenderTarget(rtC);R.setClearColor(0x000000,1);R.clear(true,true,true);R.render(scene,cam);
 const os=[sh,carryM,...(carryFM?[carryFM]:[]),...sunS,...rings.map(q=>q.m)],vs=os.map(o=>o.visible);os.forEach(o=>o.visible=false);
 R.shadowMap.autoUpdate=false;scene.overrideMaterial=depthMat;R.setRenderTarget(rtD);R.setClearColor(0xffffff,1);R.clear(true,true,true);R.render(scene,cam);
 scene.overrideMaterial=null;R.setClearColor(0x000000,1);R.shadowMap.autoUpdate=true;os.forEach((o,i)=>o.visible=vs[i]);
 bright.uniforms.t.value=rtC.texture;pass(bright,rtB1);
 for(const k of[1.5,3]){blur.uniforms.t.value=rtB1.texture;blur.uniforms.d.value.set(k/rtB1.width,0);pass(blur,rtB2);blur.uniforms.t.value=rtB2.texture;blur.uniforms.d.value.set(0,k/rtB1.height);pass(blur,rtB1)}
 const u=comp.uniforms;sv.copy(cam.position).addScaledVector(sdir,100).project(cam);u.sun.value.set(sv.x*.5+.5,sv.y*.5+.5);
 u.sI.value=Math.max(0,new V3(0,0,-1).applyQuaternion(cam.quaternion).dot(sdir)+.2);u.tC.value=rtC.texture;u.tD.value=rtD.texture;u.tB.value=rtB1.texture;u.tm.value=performance.now()/1000%100;
 pass(comp,null)}
resize();

/* ---------- game ---------- */
let state='intro',stepD=0,paused=false,locked=false,fallback=false,dragging=false,moved=0,px=0,pz=6,ey=1.7,yaw=0,pitch=-.35,aim=null,cd=0,pc=0,swing=0,holding=false,heldT=0,autoDug=false,geyser=false,elapsed=0,hudT=0,T=0,toastT=0,last=performance.now();
const keys={},free=(x,z)=>obst.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+.3);
function show(id){document.querySelectorAll('.scr').forEach(e=>e.classList.toggle('show',e.id===id))}
function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;toastT=3.5}
function newGame(){world=new World(Math.random()*1e9|0);buildBuried();buildRocks();dropCarry(true);buildFinds();sync();buildGrass();placeMower();parts.forEach(q=>scene.remove(q.m));parts.length=0;rings.forEach(q=>scene.remove(q.m));rings.length=0;geyser=false;px=0;pz=6;yaw=0;pitch=-.35;ey=world.hAt(0,6)+1.7;pc=0;elapsed=0;$('dg').textContent=0;$('sc').textContent=0;$('tm').textContent='0:00';$('pr').textContent='Probe ready — press F or right-click'}
function lock(){try{cv.requestPointerLock()}catch(e){}setTimeout(()=>{fallback=!document.pointerLockElement},250)}
let seenHelp=false;try{seenHelp=localStorage.getItem('burstHelp')==='1'}catch(e){}
function startPlay(){audio();state='play';newGame();$('hud').style.display='block';sh.visible=true;
 if(seenHelp){paused=false;show(null);lock()}else{paused=true;holding=dragging=false;show('help')}}
$('bGot').onclick=()=>{seenHelp=true;try{localStorage.setItem('burstHelp','1')}catch(e){}paused=false;show(null);lock()};
function toMenu(){state='menu';paused=false;geyser=false;document.exitPointerLock?.();$('hud').style.display='none';sh.visible=false;show('menu')}
function tryDig(){if(state!=='play'||paused||!aim||cd>0||Math.abs(aim.x)>8.6||Math.abs(aim.z)>8.6||handsBusy())return;if(!isMown(aim.x,aim.z)){toast('Mow the grass first');return}cd=.8;swing=1;Net.send({type:'dig',x:aim.x,z:aim.z,by:ME})}
/* E: drop what you're holding, else grab the mower, else the nearest exposed rock, else a find */
function useE(){if(state!=='play'||paused)return;audio();
 if(mowerHeld){mowerHeld=false;return}
 if(carry>=0){if(aim)Net.send({type:'rock_place',n:carry,x:aim.x,z:aim.z,by:ME});else toast('Aim at the ground to put it down');return}
 if(carryF>=0){const f=world.finds[carryF],db=Math.hypot(px-BIN[0],pz-BIN[1]),dc=Math.hypot(px-CRATE[0],pz-CRATE[1]);
  if(db<2.5||dc<2.5){const at=db<=dc?'bin':'crate';if(at===(f.type==='trash'?'bin':'crate'))Net.send({type:'find_deposit',n:carryF,by:ME});else toast(f.type==='trash'?'That belongs in the trashcan':'That belongs in the crate');return}
  if(aim)Net.send({type:'find_place',n:carryF,x:aim.x,z:aim.z,by:ME});else toast('Aim at the ground to put it down');return}
 if(Math.hypot(px-mower.position.x,pz-mower.position.z)<2.2){mowerHeld=true;return}
 const dir=new V3(0,0,-1).applyQuaternion(cam.quaternion);let best=-1,bd=2.4;
 for(let n=0;n<RN;n++){const q=rk[n];if(q.held)continue;const h=world.hAt(q.x,q.z);if(q.y+q.s*.4<h)continue;/* still buried */
  const d=Math.hypot(q.x-px,q.z-pz);if(d>3.5||d>=bd)continue;if(new V3(q.x-px,q.y+q.s*.4-ey,q.z-pz).normalize().dot(dir)<.6)continue;best=n;bd=d}
 if(best>=0){if(rk[best].s>.32){toast('Too heavy');return}Net.send({type:'rock_pick',n:best,by:ME});return}
 best=-1;bd=2.4;
 for(let n=0;n<world.finds.length;n++){const f=world.finds[n];if(!findOut(f))continue;const d=Math.hypot(f.x-px,f.z-pz);if(d>3.5||d>=bd)continue;if(new V3(f.x-px,f.y-ey,f.z-pz).normalize().dot(dir)<.6)continue;best=n;bd=d}
 if(best>=0)Net.send({type:'find_pick',n:best,by:ME})}
function dropCarry(reset){if(carry>=0){if(reset){rk[carry].held=0;setRock(carry);rocks.instanceMatrix.needsUpdate=true}carry=-1}clearCarryF()}
function probe(){if(state!=='play'||paused||pc>0)return;pc=2.5;nz('lowpass',140,.5,1);sweep('bandpass',200,1400,.6,.35,.05);const gy=world.hAt(px,pz);let bs,bd=1e9;
 for(const s of world.sig){const d=Math.hypot(px-s.x,gy-s.y,pz-s.z);if(d<bd){bd=d;bs=s}}
 if(bd>13){$('pr').textContent='Probe: no signal in range';return}
 const dp=(gy-bs.y)*(1+(Math.random()-.5)*.1),dn=bd*(1+(Math.random()-.5)*.14)+(Math.random()-.5)*.3;
 $('pr').textContent=`Probe: object ~${dn.toFixed(1)} m away · ~${dp.toFixed(1)} m deep`;addRing(px,pz,Math.sqrt(Math.max(.04,dn*dn-dp*dp)))}
Net.on(a=>{
 if(a.type==='find_pick'){const f=world.finds[a.n];if(!f||f.done)return;f.held=1;f.m.visible=false;if(a.by===ME){holdFind(a.n);toast(`${FIND[f.kind][2]} — ${f.type==='trash'?'take it to the trashcan':'take it to the crate'}`)}return}
 if(a.type==='find_place'){const f=world.finds[a.n];f.held=0;f.out=1;f.x=a.x;f.z=a.z;f.y=world.hAt(a.x,a.z)+f.sz;syncFind(f);if(a.by===ME&&carryF===a.n)clearCarryF();return}
 if(a.type==='find_deposit'){const f=world.finds[a.n];if(!f||f.done)return;f.done=1;f.held=0;f.m.visible=false;world.score+=f.pts;$('sc').textContent=world.score;if(a.by===ME){if(carryF===a.n)clearCarryF();toast(`+${f.pts}`);f.type==='trash'?clank():ping()}return}
 if(a.type==='rock_pick'){const q=rk[a.n];q.held=1;go.position.set(0,-50,0);go.scale.setScalar(0);go.updateMatrix();rocks.setMatrixAt(a.n,go.matrix);rocks.instanceMatrix.needsUpdate=true;
  if(a.by===ME){carry=a.n;carryM.scale.set(q.s*q.w,q.s,q.s*q.w);carryM.material.color.fromArray(rocks.instanceColor.array,a.n*3)}}
 if(a.type==='rock_place'){const q=rk[a.n];q.held=0;q.x=a.x;q.z=a.z;q.y=world.hAt(a.x,a.z)+q.s*.3;setRock(a.n);rocks.instanceMatrix.needsUpdate=true;if(a.by===ME&&carry===a.n)carry=-1;return}
 if(a.type!=='dig')return;world.apply(a);sync();clearGrass(a.x,a.z);settleRocks(a.x,a.z);settleFinds(a.x,a.z);$('dg').textContent=world.digs;const y=world.hAt(a.x,a.z);
 for(let i=0;i<18;i++){const px2=a.x+(Math.random()-.5)*.6,pz2=a.z+(Math.random()-.5)*.6,q=digDepth(px2,pz2),dd=q.d-Math.random()*.2;
  spawn(new V3(px2,y+.1,pz2),new V3((Math.random()-.5)*3,2.5+Math.random()*3,(Math.random()-.5)*3),1.6,false,soilMat(dd<.05&&Math.random()<.4?-1:Math.max(0,dd),q.n))}
 if(a.by===ME)thud();if(state!=='play')return;
 for(const s of world.sig.slice(1))if(!s.f&&world.hAt(s.x,s.z)<s.y+s.top+.05){s.f=1;toast(`That's ${KIND[s.kind]} — not the leak. Keep probing.`);nz('lowpass',500,.4,.9);grain(6,.15,'bandpass',2500,6000,.25)}
 if(world.exposed())win()});
function win(){state='won';geyser=true;nz('bandpass',1800,2.5,.7);sweep('lowpass',400,80,2.5,.6);
 const m=Math.floor(elapsed/60),s=Math.floor(elapsed%60),ft=world.finds.filter(f=>f.done&&f.type==='trash').length,fa=world.finds.filter(f=>f.done&&f.type==='artifact').length;
 $('wt').textContent=`You exposed the burst main in ${world.digs} digs and ${m}:${String(s).padStart(2,'0')}. Water's off — the neighbours will never know. Finds: ${world.score} pts (${ft} trash, ${fa} artifacts).`;
 setTimeout(()=>{if(state==='won'){document.exitPointerLock?.();$('hud').style.display='none';show('win')}},2400)}

/* ---------- input ---------- */
addEventListener('keydown',e=>{keys[e.code]=true;if(state==='intro'){state='menu';audio();show('menu');return}if(e.code==='KeyF')probe();if(e.code==='KeyE'&&!e.repeat)useE()});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('contextmenu',e=>e.preventDefault());
$('intro').addEventListener('click',()=>{if(state==='intro'){state='menu';audio();show('menu')}});
addEventListener('mousemove',e=>{if(state==='intro'||paused)return;if(locked||(fallback&&dragging)){yaw-=e.movementX*.0022;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*.0022));moved+=Math.abs(e.movementX)+Math.abs(e.movementY)}});
addEventListener('mousedown',e=>{if(e.target.closest('button')||state!=='play'||paused)return;if(e.button===2){probe();return}if(e.button!==0)return;if(mowerHeld){mowerOn=!mowerOn;return}holding=true;heldT=0;autoDug=false;if(locked)tryDig();else if(fallback){dragging=true;moved=0}});
addEventListener('mouseup',e=>{if(e.button!==0)return;if(dragging&&moved<6&&!autoDug)tryDig();dragging=false;holding=false});
addEventListener('blur',()=>{holding=dragging=false});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===cv;if(!locked&&state==='play'&&!fallback){holding=false;paused=true;show('pause')}});
$('bSolo').onclick=startPlay;$('bHow').onclick=()=>{$('how').hidden=!$('how').hidden};
$('bRes').onclick=()=>{paused=false;show(null);lock()};
for(const id of['bNew2','bNew3'])$(id).onclick=()=>{if(state==='play'){paused=false;show(null);newGame();if(!fallback)lock()}else startPlay()};
for(const id of['bMenu','bMenu2','bMenu3'])$(id).onclick=toMenu;

/* ---------- loop ---------- */
function play(dt){
 const K=keys,ox=px,oz=pz,f=(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0),s=(K.KeyD?1:0)-(K.KeyA?1:0);
 if(!paused){if(f||s){const sp=(K.ShiftLeft?6.5:4)*dt,dx=-Math.sin(yaw)*f+Math.cos(yaw)*s,dz=-Math.cos(yaw)*f-Math.sin(yaw)*s,l=Math.hypot(dx,dz),nx=px+dx/l*sp,nz2=pz+dz/l*sp;
   if(free(nx,pz)&&Math.abs(nx)<9.3)px=nx;if(free(px,nz2)&&nz2>-9.2&&nz2<9.3)pz=nz2}
  if(state==='play')elapsed+=dt;stepD+=Math.hypot(px-ox,pz-oz);if(stepD>(K.ShiftLeft?2:1.5)){stepD=0;stepSnd()}}
 ey+=(world.hAt(px,pz)+1.7-ey)*Math.min(1,dt*10);
 cam.position.set(px,ey,pz);cam.rotation.set(pitch,yaw,0);cam.updateMatrixWorld();
 const dir=new V3(0,0,-1).applyQuaternion(cam.quaternion),p=new V3();aim=null;
 for(let t=.3;t<7;t+=.07){p.copy(cam.position).addScaledVector(dir,t);const g=world.hAt(p.x,p.z);if(p.y<g){aim=new V3(p.x,g,p.z);break}}
 cd-=dt;
 /* holding left mouse = keep digging at the tool's max rate (fallback drag mode: only while the cursor stays still) */
 if(holding&&state==='play'&&!paused){heldT+=dt;if(locked)tryDig();else if(dragging&&moved<6&&heldT>.3){const c0=cd;tryDig();if(cd>c0)autoDug=true}}
 pc=Math.max(0,pc-dt);swing=Math.max(0,swing-dt*1.5);const sw=Math.sin((1-swing)*Math.PI)*(swing>0?1:0);
 sh.visible=!handsBusy();sh.position.set(.45,-.62-sw*.08+Math.sin(T*1.7)*.004,-.3-sw*.12);sh.rotation.set(-sw*.7,sw*.1,sw*.05);
 /* mower: pushed 1.2 m ahead while held, otherwise it rests on the ground; the engine cuts grass and throws clippings */
 if(mowerHeld){const fx=-Math.sin(yaw),fz=-Math.cos(yaw),mx=px+fx*2.1,mz=pz+fz*2.1;mower.position.set(mx,world.hAt(mx,mz),mz);mower.rotation.y=yaw+Math.PI}
 else mower.position.y+=(world.hAt(mower.position.x,mower.position.z)-mower.position.y)*Math.min(1,dt*10);
 if(mowerOn){const mx=mower.position.x,mz=mower.position.z;if(mowX===undefined){mowX=mx;mowZ=mz}const steps=Math.max(1,Math.ceil(Math.hypot(mx-mowX,mz-mowZ)/.25));
 for(let s=1;s<=steps;s++)mowAt(mowX+(mx-mowX)*s/steps,mowZ+(mz-mowZ)*s/steps,.7);mowX=mx;mowZ=mz;mower.wheels.forEach(w=>w.rotation.x+=dt*18);
  if(Math.random()<.6)spawn(mower.position.clone().add(new V3((Math.random()-.5)*.6,.3,(Math.random()-.5)*.6)),new V3((Math.random()-.5)*1.2,1+Math.random(),(Math.random()-.5)*1.2),.6,false,soilMat(-1,0))}
 if(AC&&clipM){const on=mowerOn&&state==='play'&&!paused;clipM.gain.gain.setTargetAtTime(on?.05:0,AC.currentTime,.15);clipM.blade.gain.setTargetAtTime(on?.012:0,AC.currentTime,.15)}
 /* carried rock sits in the hands */
 if(carry>=0){carryM.visible=true;carryM.position.set(.35,-.35,-.7);carryM.rotation.set(rk[carry].a,rk[carry].b+T*.4,rk[carry].c)}else carryM.visible=false;
 if(carryFM){carryFM.position.set(.32,-.36,-.78);carryFM.rotation.set(.45,T*.6,.2)}
 $('sf').style.width=((1-pc/2.5)*100)+'%';
 const hd=Math.hypot(px-world.burst.x,world.hAt(px,pz)-world.burst.y,pz-world.burst.z);
 if(AC&&hissG)hissG.gain.setTargetAtTime(state==='play'&&!paused&&hd<3?Math.pow(1-hd/3,2)*.16:0,AC.currentTime,.15);
 hudT-=dt;if(hudT<=0){hudT=.25;$('tm').textContent=Math.floor(elapsed/60)+':'+String(Math.floor(elapsed%60)).padStart(2,'0')}
 if(toastT>0&&(toastT-=dt)<=0)$('toast').style.opacity=0;
}
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
 if(state==='play'||state==='won')play(dt);
 else{const a=Math.sin(T*.12)*.9;cam.position.set(Math.sin(a)*17,6.5,Math.cos(a)*17);cam.lookAt(0,0,0)}
 for(let i=rings.length-1;i>=0;i--){const q=rings[i];q.t=Math.min(1,q.t+dt/.9);q.age=(q.age||0)+dt;q.m.scale.setScalar(Math.max(.01,q.r*(1-Math.pow(1-q.t,3))));q.m.material.opacity=Math.max(0,Math.min(1,(12-q.age)/4))*.6;if(q.age>12){scene.remove(q.m);rings.splice(i,1)}}
 if(geyser)for(let k=0;k<4;k++)spawn(new V3(world.burst.x,world.burst.y+.15,world.burst.z),new V3((Math.random()-.5)*1.4,5+Math.random()*3,(Math.random()-.5)*1.4),1.5,true);
 if(world)stepParts(dt);GU.uT.value=T;fxRender()}
newGame();requestAnimationFrame(loop);
