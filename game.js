/* ARCHITECTURE: World = seeded deterministic state, mutated only by apply(action). Net (net.js) validates, stamps and broadcasts
   actions: solo applies them locally, co-op routes them through the host. `ME` is this player's id. */
const $=id=>document.getElementById(id),V3=THREE.Vector3;
let N=100,S=20,YH=10,DEL=0,MG=40;/* yard side S (m) and half YH; N = cells per side (cell C = .2 m); MG = mow grid; DEL = how far the house and neighbours sit beyond the 20 m layout. All set by layout() */
const C=.2,SIZES=[20,28,36],BED=-12,VL=60,FLOOR=BED,KIND={tank:'a buried septic tank',iron:'an old cast-iron pipe',gas:'a gas line — careful!',well:'an old well ring'},SCRAP={tank:4,iron:3,gas:2,well:3};/* BED..0 is the diggable block column (0.2 m cubes, 12 m deep). SCRAP is the junk value of a decoy once it is uncovered */
const FIND={can:['trash',5,'a tin can'],bottle:['trash',5,'a glass bottle'],boot:['trash',10,'an old boot'],coin:['artifact',50,'a coin'],arrow:['artifact',75,'an arrowhead'],pot:['artifact',100,'a clay pot'],idol:['artifact',150,'a golden idol']};
const FSZ={can:.08,bottle:.09,boot:.06,coin:.02,arrow:.04,pot:.07,idol:.09};/* half-height, origin at the mesh centre */
const GEM=[null,['Quartz',25,[1.7,1.55,1.9]],['Amethyst',60,[1.5,.45,2.4]],['Emerald',120,[.3,2.1,.95]]],GEM_RATE=.07,ROCK_PTS=1;/* name, crate value, over-bright colour; share of rocks that are gems. A plain rock is worth ROCK_PTS */
const BIN=[-9,3],CRATE=[9,4],BENCH=[-1.75,-9.5],BENCH0=[-1.75,-9.5],MOWS=[2.4,-7.4],TREES=[],PROT=[];/* BENCH0 = bench in the house's own frame; MOWS = mower parking spot */
const TREE0=[[-8,-6,1.4],[8.3,-4,1.1],[-7.6,6.5,1.2],[-4,-7.5,1.2],[5,7.5,1.3],[.5,3,1],[-6,1.5,1.1],[3,-8,1.2],[7,.5,1]];/* x, z, scale at the 20 m size (first 3 always, more as the yard grows) */
function layout(s){S=s;N=s*5;YH=s/2;DEL=YH-10;MG=s*2;const k=YH/10;
 BIN[0]=-(YH-1);BIN[1]=3*k;CRATE[0]=YH-1;CRATE[1]=4*k;BENCH[0]=BENCH0[0];BENCH[1]=BENCH0[1]-DEL;SOCK[1]=SOCK0[1]-DEL;MOWS[1]=-7.4-DEL;
 TREES.length=0;TREE0.slice(0,3+Math.round((s-20)/16*6)).forEach(([x,z,t])=>TREES.push([x*k,z*k,t]));
 HFP=HFP0.map((a,i)=>[a[0]+HOFF[i][0]*DEL,a[1]+HOFF[i][1]*DEL,a[2],a[3],a[4]]);
 PROT.length=0;TREES.forEach(([x,z,t])=>PROT.push([x,z,.78*t]));PROT.push([BIN[0],BIN[1],.6],[CRATE[0],CRATE[1],.9],[BENCH[0],BENCH[1],.9])}/* x, z, protect radius for trees, bin, crate, workbench */
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* ---------- progression: a points bank + team upgrades (survive "New yard"; solo saves them to localStorage) ---------- */
const UPG={shovel:{n:'Shovel',max:3,cost:[120,200,300],d:'Deeper, wider digs'},probe:{n:'Probe',max:2,cost:[100,180],d:'Longer range, faster recharge, less noise'},lantern:{n:'Flashlight',max:2,cost:[80,160],d:'Lets you dig at night (L). Lv2: brighter'},mower:{n:'Mower',max:2,cost:[60,120],d:'Wider mowing strip: 0.6 → 1.3 → 2 m'},boots:{n:'Boots',max:2,cost:[60,120],d:'Walk and sprint faster'},lamps:{n:'Garden lights',max:4,cost:[70,90,110,130],d:'One more lamp on a cable from the wall socket (G to place)'}},UKEY=Object.keys(UPG),
 PCD=[2.5,2,1.5],PRNG=[13,17,22],MRAD=[.3,.65,1],BSPD=[1,1.15,1.3];/* per-level probe recharge, probe range, mower radius, walk speed */
const freshProg=()=>({bank:80,up:{shovel:0,probe:0,lantern:0,mower:0,boots:0,lamps:0}}),upCost=id=>{const l=Prog.up[id];return l<UPG[id].max?UPG[id].cost[l]:Infinity};
let Prog=freshProg(),shopOpen=false,pcMax=2.5,flashOn=false;
function saveProg(){}/* nothing is kept between yards any more; hook left in place for the callers */
function renderShop(){$('shopList').innerHTML=UKEY.map(id=>{const u=UPG[id],l=Prog.up[id],mx=l>=u.max,c=upCost(id);return`<li data-id="${id}" class="${mx?'mx':c>Prog.bank?'no':''}">${u.n} <i>Lv ${l}/${u.max}</i><span>${mx?'MAX':c}</span><small>${u.d}</small></li>`}).join('');$('shopBank').textContent=Prog.bank}
function setShop(v){const was=shopOpen;shopOpen=v;$('shop').style.display=v?'block':'none';$('cross').style.visibility=v?'hidden':'visible';
 if(v){renderShop();if(document.pointerLockElement===cv)document.exitPointerLock()}
 else if(was&&state==='play'&&!paused&&!fallback)lock()}
$('shopList').addEventListener('click',e=>{const li=e.target.closest('li');if(!li||!shopOpen)return;const id=li.dataset.id,c=upCost(id);if(c===Infinity)toast(`${UPG[id].n} is maxed out`);else if(c>Prog.bank)toast(`Need ${c} points for ${UPG[id].n}`);else Net.send({type:'buy',id,by:ME})});
/* testing helper: in the console, addPoints(n) adds n points. Only on localhost / file:// or with ?dev in the URL */
const DEV=/^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname)||/[?&]dev\b/.test(location.search);
function hudPts(){$('sc').textContent=Prog.bank;if(shopOpen)renderShop();hbShow()}
class World{
 constructor(seed){this.seed=seed;const r=rng(seed),n=(N+1)**2,p=[r()*6,r()*6,r()*6];
  this.H=new Float32Array(n);this.B=new Float32Array(n);this.D=new Uint8Array(n);this.PW=new Float32Array(n).fill(1);this.digs=0;this.log=[];
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const x=i*C-S/2,z=j*C-S/2,k=j*(N+1)+i,e=Math.min(i,j,N-i,N-j)*C,f=Math.min(1,e/2.5);
   /* base relief fades to exactly 0 at the border so it meets the flat outer ground with no gap */
   this.H[k]=this.B[k]=(.12*Math.sin(x*.35+p[0])*Math.cos(z*.3+p[1])+.05*Math.sin(x*.9+z*.7+p[2]))*f*f*(3-2*f);
   /* roots hold the soil under trees, the bin and the crate: dig weight ramps 0 -> 1 from .7r to 1.2r around each */
   for(const[ox,oz,or]of PROT){const t=Math.min(1,Math.max(0,(Math.hypot(x-ox,z-oz)/or-.7)/.5));this.PW[k]=Math.min(this.PW[k],t*t*(3-2*t))}}
  /* solid cubes from the bedrock up to y=0. Digging clears individual blocks, so a hole keeps its walls. */
  this.vox=new Uint8Array(N*N*VL);this.vox.fill(1);this.dirty=null;
  this.sig=[];const top={burst:.16,tank:.55,iron:.17,gas:.13,well:.5};
  const place=(kind,y)=>{let x,z,t=0;do{x=(r()-.5)*(S-5);z=(r()-.5)*(S-5)}while(t++<80&&this.sig.some(s=>Math.hypot(s.x-x,s.z-z)<5));this.sig.push({kind,x,y,z,top:top[kind],f:0,a:r()*3.14})};
  place('burst',-8.8-r()*1.1);place('tank',-6.2-r()*2.2);place('iron',-5-r()*2.4);place('gas',-4.2-r()*2);place('well',-7.2-r()*1.8);
  const b=this.sig[0],a=b.a;this.burst=new V3(b.x,b.y,b.z);
  this.curve=new THREE.CatmullRomCurve3([-6,-2.5,0,2.5,6].map(s=>new V3(b.x+Math.cos(a)*s,b.y+s*.02,b.z+Math.sin(a)*s)));this.bt=.5;
  /* trash is a few metres down, artifacts and the mains sit much deeper in the 12 m of dirt */
  this.score=0;this.finds=[];
  const spot=()=>{let x,z,t=0;do{x=(r()-.5)*(S-3.6);z=(r()-.5)*(S-3.6)}while(++t<80&&(PROT.some(([ox,oz,or])=>Math.hypot(x-ox,z-oz)<or+1.15)||this.finds.some(q=>Math.hypot(q.x-x,q.z-z)<1.35)||this.sig.some(s=>Math.hypot(s.x-x,s.z-z)<1.5)||Math.hypot(x-MOWS[0],z-MOWS[1])<1.7||Math.hypot(x-BENCH[0],z-BENCH[1])<1.9));return[x,z]};
  const bury=(kind,d0,d1)=>{const[type,pts]=FIND[kind],[x,z]=spot();this.finds.push({kind,type,pts,sz:FSZ[kind],x,y:this.hAt(x,z)-(d0+r()*(d1-d0)),z,a:r()*6.283,held:0,done:0,out:0})};
  /* loot scales with yard area; tune here */
  const TRASH_PER_M2=1/12,ART_PER_M2=1/40,nT=Math.round(S*S*TRASH_PER_M2),nA=Math.round(S*S*ART_PER_M2);
  for(let i=0;i<nT;i++)bury(['can','bottle','boot'][i%3],.8,3.5);
  for(let i=0;i<nA;i++)bury(['coin','arrow','pot','idol','coin'][i%5],3.5,8.5)}
 col(x,z){return[Math.max(0,Math.min(N-1,(x+S/2)/C|0)),Math.max(0,Math.min(N-1,(z+S/2)/C|0))]}
 hAt(x,z){const[i,j]=this.col(x,z),base=j*N+i,vol=N*N,v=this.vox;for(let L=VL-1;L>=0;L--)if(v[L*vol+base])return BED+(L+1)*C;return BED}
 solidAt(x,y,z){const[i,j]=this.col(x,z),L=(y-BED)/C|0;return L>=0&&L<VL&&!!this.vox[L*N*N+j*N+i]}
 /* floor under your feet, ignoring a ceiling you have already walked beneath */
 floorAt(x,z,feet){const[i,j]=this.col(x,z),base=j*N+i,vol=N*N,v=this.vox,max=feet+.55;let top=BED;
  for(let L=0;L<VL;L++){if(!v[L*vol+base]||(L+1<VL&&v[(L+1)*vol+base]))continue;const t=BED+(L+1)*C;if(t>max)break;top=t}return top}
 ceilAt(x,z,above){const[i,j]=this.col(x,z),base=j*N+i,vol=N*N,v=this.vox;
  for(let L=0;L<VL;L++){if(!v[L*vol+base])continue;const b=BED+L*C;if(b>above)return b}return null}
 /* player box: 0.6 m wide, h tall, feet at y. Flush faces do not count, so standing on a block is not "inside" it */
 fits(x,feet,z,h){const HW=.3,v=this.vox,vol=N*N;
  const i0=Math.floor((x-HW+S/2)/C),i1=Math.floor((x+HW-1e-4+S/2)/C),j0=Math.floor((z-HW+S/2)/C),j1=Math.floor((z+HW-1e-4+S/2)/C);
  if(i0<0||j0<0||i1>=N||j1>=N)return false;
  const L0=Math.floor((feet+1e-3-BED)/C),L1=Math.floor((feet+h-1e-3-BED)/C);if(L0<0)return false;
  for(let L=L0;L<=Math.min(VL-1,L1);L++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++)if(v[L*vol+j*N+i])return false;return true}
 room(x,feet,z){return this.fits(x,feet,z,1.8)?1.8:this.fits(x,feet,z,1.25)?1.25:0}
 apply(a){if(a.type!=='dig')return;const{x,z}=a,lv=Prog.up.shovel,R=.62+.12*lv,steps=2+lv,W=this,vol=N*N;
  let dx=a.dx,dy=a.dy,dz=a.dz,len=Math.hypot(dx,dy,dz);if(!isFinite(dx)||len<.01){dx=0;dy=-1;dz=0;len=1}dx/=len;dy/=len;dz/=len;
  const y0=isFinite(a.y)?a.y:W.hAt(x,z)-.01;if(!W.dirty)W.dirty=new Set();
  /* a short capsule along the look direction, so the shovel cuts down, sideways or up */
  for(let s=0;s<steps;s++){const px=x+dx*(s+.35)*C,py=y0+dy*(s+.35)*C,pz=z+dz*(s+.35)*C;
   const i0=Math.max(3,((px-R+S/2)/C)|0),i1=Math.min(N-4,((px+R+S/2)/C)|0),j0=Math.max(3,((pz-R+S/2)/C)|0),j1=Math.min(N-4,((pz+R+S/2)/C)|0);
   const L0=Math.max(1,((py-R-BED)/C)|0),L1=Math.min(VL-1,((py+R-BED)/C)|0);/* layer 0 and a 3-block rim stay, so the pit has a floor and walls */
   for(let L=L0;L<=L1;L++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(W.PW[j*(N+1)+i]<.25)continue;
    const cx=(i+.5)*C-S/2,cy=BED+(L+.5)*C,cz=(j+.5)*C-S/2;if(Math.hypot(cx-px,cy-py,cz-pz)>R)continue;
    const idx=L*vol+j*N+i;if(!W.vox[idx])continue;W.vox[idx]=0;W.D[j*(N+1)+i]=1;
    for(const[di,dj]of[[0,0],[-1,0],[1,0],[0,-1],[0,1]]){const ni=i+di,nj=j+dj;if(ni>=0&&nj>=0&&ni<N&&nj<N)W.dirty.add((ni>>4)+((nj>>4)<<8))}}}
  W.digs++;W.log.push(x,z)}
 exposed(){let c=0;for(let t=-.02;t<=.021;t+=.02){const p=this.curve.getPoint(this.bt+t);if(!this.solidAt(p.x,p.y,p.z))c++}return c>=2}
}
/* ---------- renderer: gamma-correct, filmic, PBR ---------- */
const cv=$('c'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true});
R.setPixelRatio(1);R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
const scene=new THREE.Scene();scene.fog=new THREE.Fog(lin(0xcfe0e8),35,150);
const cam=new THREE.PerspectiveCamera(70,1,.02,300);cam.rotation.order='YXZ';scene.add(cam);
/* flashlight: a shadowless spot riding on the camera. Always in the scene (intensity 0 when off) so toggling never recompiles materials */
const flash=new THREE.SpotLight(lin(0xfff0d0),0,16,.45,.7,1.2),flashT=new THREE.Object3D();flash.position.set(.12,-.1,0);flashT.position.set(0,0,-6);cam.add(flash,flashT);flash.target=flashT;
function resize(){const pr=Math.min(devicePixelRatio,1.5),w=Math.round(innerWidth*pr),h=Math.round(innerHeight*pr);R.setSize(w,h,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();if(window.fxResize)fxResize(w,h)}addEventListener('resize',resize);resize();
const hemi=new THREE.HemisphereLight(lin(0xbcd6ff),lin(0x5a4630),.7);scene.add(hemi);
const sun=new THREE.DirectionalLight(lin(0xfff1d6),1.8);sun.position.set(-16,9,-6);sun.castShadow=true;sun.shadow.mapSize.set(3072,3072);
const sc=sun.shadow.camera;sc.left=sc.bottom=-16;sc.right=sc.top=16;sc.far=50;sun.shadow.bias=-.0004;sun.shadow.normalBias=.05;scene.add(sun);let skyMat,overMat;
function cvTex(w,h,fn,rx=1,ry=1){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
{/* sky dome with soft clouds */
 const t=cvTex(1024,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#2f6bc0');g.addColorStop(.45,'#86b6e6');g.addColorStop(.5,'#d3e4ee');g.addColorStop(1,'#d9e6e0');x.fillStyle=g;x.fillRect(0,0,w,h);x.filter='blur(7px)';
  /* each puff is drawn at -w, 0 and +w so clouds wrap around the left/right texture edge (no visible seam) */
  for(let i=0;i<45;i++){const px=Math.random()*w,py=110+Math.random()*120;for(let k=0;k<7;k++){const ey=py+Math.random()*12,rx=40+Math.random()*34,ry=10+Math.random()*9;x.fillStyle='rgba(255,255,255,.2)';for(const o of[-w,0,w]){x.beginPath();x.ellipse(px+k*26-78+o,ey,rx,ry,0,0,6.3);x.fill()}}}});
 t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.anisotropy=1;/* no mip selection across the u=0/1 wrap, which draws a thin line */
 skyMat=new THREE.MeshBasicMaterial({map:t,side:THREE.BackSide,fog:false,toneMapped:false,depthWrite:false});scene.add(new THREE.Mesh(new THREE.SphereGeometry(200,32,16),skyMat));
 const ot=cvTex(1024,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#2c3540');g.addColorStop(.4,'#5c6772');g.addColorStop(.58,'#8a929a');g.addColorStop(1,'#b7c0c6');x.fillStyle=g;x.fillRect(0,0,w,h);x.filter='blur(6px)';
  for(let i=0;i<70;i++){const px=Math.random()*w,py=30+Math.random()*h*.62,rx=70+Math.random()*140,ry=16+Math.random()*28;x.fillStyle=`rgba(28,34,42,${.18+Math.random()*.28})`;for(const o of[-w,0,w]){x.beginPath();x.ellipse(px+o,py,rx,ry,0,0,6.3);x.fill()}}});
 ot.generateMipmaps=false;ot.minFilter=THREE.LinearFilter;ot.anisotropy=1;
 overMat=new THREE.MeshBasicMaterial({map:ot,side:THREE.BackSide,fog:false,toneMapped:false,transparent:true,opacity:0,depthWrite:false});
 const over=new THREE.Mesh(new THREE.SphereGeometry(196,32,16),overMat);over.renderOrder=1;scene.add(over)}

/* ---------- materials & scenery ---------- */
const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:lin(c),roughness:.9,metalness:0},o)),obst=[],GLASS=[],LAMPS=[];/* window glass + street-lamp bulb materials, driven by applyDay */
const lit=m=>{m.emissive.setRGB(1,.72,.38);m.emissiveIntensity=0;m.userData.th=.1+Math.random()*.6;GLASS.push(m);return m};
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
let PARENT=scene;/* where box/cyl/blob/house put things: the yard, outer-world and house groups are rebuilt or moved when the yard size changes */
function clearGroup(g){g.traverse(o=>{if(o.geometry&&!o.geometry.userData.keep)o.geometry.dispose()});g.clear()}
function box(w,h,d,c,x,y,z,o){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,o));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;PARENT.add(m);return m}
function cyl(a,b,h,c,x,y,z,o){const m=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,14),mat(c,o));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;PARENT.add(m);return m}
function blob(r,c,x,y,z,sx=1,sy=1,sz=1){const g=new THREE.SphereGeometry(r,16,12),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const k=1+Math.sin(p.getX(i)*5.1+p.getY(i)*3.7)*Math.cos(p.getZ(i)*4.3)*.17;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k,p.getZ(i)*k)}g.computeVertexNormals();
 const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;PARENT.add(m);return m}
/* shared crowns: keep=1 so a yard-size rebuild does not dispose them out from under the other group */
const keepG=g=>{g.userData.keep=1;return g},WALKS=[],
 leafG=keepG((()=>{const g=new THREE.IcosahedronGeometry(1,2),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+.32*Math.sin(x*3.2+1.7)*Math.cos(z*2.6+y*2.1)+.16*Math.sin(x*5.1-z*4.4+y*1.3);p.setXYZ(i,x*k,y*k*.72,z*k)}
  g.computeVertexNormals();return g})()),
 pineG=keepG((()=>{const g=new THREE.LatheGeometry([[.08,1.45],[1.35,2.05],[1.12,2.75],[.22,3.2],[1.02,3.75],[.78,4.5],[.16,4.95],[.58,5.45],[.36,6.15],[.04,6.85],[0,7.4]].map(([r,y])=>new THREE.Vector2(r,y)),11),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rad=Math.hypot(x,z);if(rad<.001)continue;const n=1+.08*Math.sin(Math.atan2(z,x)*5+y*1.4)+.04*Math.cos(y*2.8+x);p.setX(i,x*n);p.setZ(i,z*n)}
  g.computeVertexNormals();return g})()),
 LEAF=[0x2d6a2c,0x3a7a30].map(c=>mat(c)),TWIG=mat(0x4d3520);
function paved(x,z){for(const q of WALKS)if(Math.abs(x-q.x)<q.hw&&Math.abs(z-q.z)<q.hd)return 1}
/* half-cylinder along X, crown up, flat side on y=0. theta 0..PI bulges +X; rotateZ(PI/2) sends that to +Y */
function archGeo(r,len){const g=new THREE.CylinderGeometry(r,r,len,24,1,true,0,Math.PI);g.rotateZ(Math.PI/2);
 const p=g.attributes.position;let y=0;for(let i=0;i<p.count;i++)y=Math.max(y,p.getY(i));if(y<r*.5)g.rotateX(Math.PI);return g}
/* ridge along local X, slopes along Z. eave continues past the wall top so the gable meets the underside */
function gable(w,d,h,rise,col,wall){const ov=.55,th=.14,hd=d/2,run=hd+ov,pitch=Math.atan2(rise,hd),drop=rise*run/hd,eave=h+rise-drop,sl=Math.hypot(run,drop),
 tx=shingleTex.clone();tx.repeat.set((w+ov*2)/.5,sl/.5);tx.needsUpdate=true;
 const G=new THREE.Group(),sm=mat(col,{map:tx,roughness:.85}),gm=mat(wall,{map:siding,roughness:.9,side:THREE.DoubleSide}),fm=mat(0x3e3834,{roughness:.8}),
  add=(m,x,y,z)=>{m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;G.add(m);return m},cy=Math.cos(pitch),sy=Math.sin(pitch);
 for(const s of[-1,1]){const m=add(new THREE.Mesh(new THREE.BoxGeometry(w+ov*2,th,sl),sm),0,eave+drop/2+cy*th/2,s*(run/2+sy*th/2));m.rotation.x=s*pitch;
  add(new THREE.Mesh(new THREE.BoxGeometry(w+ov*2+.06,.22,.07),fm),0,eave+.02,s*(run+.04))}
 const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.BufferAttribute(new Float32Array([0,h,-hd,0,h,hd,0,h+rise,0]),3));
 gg.setAttribute('uv',new THREE.BufferAttribute(new Float32Array([0,0,1,0,.5,1]),2));gg.computeVertexNormals();
 for(const s of[-1,1])add(new THREE.Mesh(gg,gm),s*(w/2+.02),0,0);
 add(new THREE.Mesh(new THREE.BoxGeometry(w+ov*2+.1,.12,.36),sm),0,h+rise+.09,0);return G}
function foliageTree(x,z,s){cyl(.18*s,.34*s,2.35*s,0x4d3520,x,1.175*s,z);
 /* base of the cylinder sits on the trunk; the tip rotates up and out, not down through the ground */
 const limb=(dx,dy,dz,len)=>{const g=new THREE.CylinderGeometry(.035*s,.07*s,len*s,7);g.translate(0,len*s/2,0);
  const m=new THREE.Mesh(g,TWIG),dir=new V3(dx,.95,dz).normalize();m.quaternion.setFromUnitVectors(new V3(0,1,0),dir);
  m.position.set(x+dir.x*.16*s,dy*s,z+dir.z*.16*s);m.castShadow=m.receiveShadow=true;PARENT.add(m)};
 limb(.62,1.55,.14,1.05);limb(-.58,1.62,-.2,1);limb(.08,1.72,-.55,.9);
 [[0,3.15,.06,1.22,.5],[.58,2.82,-.26,.96,1.4],[-.55,2.9,.3,1.02,2.3]].forEach(([a,b,c,q,ry],i)=>{
  const m=new THREE.Mesh(leafG,LEAF[i&1]);m.position.set(x+a*s,b*s,z+c*s);m.scale.setScalar(q*s);m.rotation.y=ry;m.castShadow=m.receiveShadow=true;PARENT.add(m)})}
/* ---------- hedges & gardens: neighbour lots + a tall perimeter hedge that closes in the neighbourhood ---------- */
const HD={n:0,r:rng(21)},HY=new V3(0,1,0),
 HFP0=[[0,-12.5,0,14,5],[-27,-9,1.5708,9,7],[-27,14,1.5708,8,6],[28,-8,-1.5708,10,7],[28,15,-1.5708,8,6.5],[-32,47,3.1416,10,7],[0,49,3.1416,11,7],[34,47,3.1416,9,7]],/* house footprints x,z,rot,w,d at the 20 m size */
 HOFF=[[0,-1],[-1,0],[-1,0],[1,0],[1,0],[0,1],[0,1],[0,1]];/* which way each moves when the yard grows (times DEL): own house back, side lots out, street-side lots away */
let HFP=HFP0;
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
 L(-hw,bk,hw,bk,1.7,1.1);L(hw,bk,hw,fr,1.7,1.1);L(-hw,fr,-hw,bk,1.7,1.1);L(-hw,fr,hw,fr,.75,.8,[gp[0],gp[1],1.4])}
function perimeter(){const a=-52-DEL,b=52+DEL,c=-34,e=62+DEL,sz=30+DEL,g=9.5;
 hedgeLine(a,c,b,c,3.8,1.9);hedgeLine(b,c,b,sz-g,3.8,1.9);hedgeLine(b,sz+g,b,e,3.8,1.9);hedgeLine(b,e,a,e,3.8,1.9);hedgeLine(a,e,a,sz+g,3.8,1.9);hedgeLine(a,sz-g,a,c,3.8,1.9)}
const yardG=new THREE.Group(),houseG=new THREE.Group(),outerG=new THREE.Group();scene.add(yardG,houseG,outerG);/* yard (rebuilt per size), house (built once, moved back by DEL), outer world (rebuilt per size) */
function buildFence(){/* picket fence on all four sides; the house closes the fourth, so only the stretches either side of it are fenced */
 const cap=Math.ceil((S+.2)/.26)*3+Math.ceil((YH-6.8)/.26)*2+8,im=new THREE.InstancedMesh(new THREE.BoxGeometry(.2,1.3,.05),mat(0xffffff,{map:wood}),cap),o=new THREE.Object3D();let n=0;
 const add=(x,z,r)=>{o.position.set(x,.6,z);o.rotation.y=r;o.updateMatrix();im.setMatrixAt(n++,o.matrix)};
 for(let k=-YH;k<=YH;k+=.26){add(k,YH+.1,0);add(-YH-.1,k,1.5708);add(YH+.1,k,1.5708)}
 /* back stretches: close the gap between the side fences and the house (house front face is z=-YH, x=-7..7) */
 for(let k=7;k<=YH+.1;k+=.26){add(k,-YH,0);add(-k,-YH,0)}
 im.count=n;im.castShadow=im.receiveShadow=true;PARENT.add(im);
 const bl=YH-6.7,bc=(6.9+YH+.2)/2;
 for(const y of[.3,1.05]){box(S+.4,.08,.1,0x8f6b40,0,y,YH+.17);box(.1,.08,S+.4,0x8f6b40,-YH-.17,y,0);box(.1,.08,S+.4,0x8f6b40,YH+.17,y,0);box(bl,.08,.1,0x8f6b40,bc,y,-YH-.07);box(bl,.08,.1,0x8f6b40,-bc,y,-YH-.07)}}
{PARENT=houseG;
 /* house */
 box(14,5,5,0xffffff,0,2.5,-12.5,{map:siding});
 const rf=gable(14,5,5,2.1,0x7a4636,0xffffff);rf.position.set(0,0,-12.5);PARENT.add(rf);
 box(1,2.2,1,0xffffff,4.5,6.8,-12.5,{map:brickTex,roughness:.95});box(1.25,.16,1.25,0x8a8580,4.5,7.95,-12.5);box(15.2,.16,.22,0xe6e0d4,0,4.38,-9.42);box(15.2,.07,.1,0x8a8f94,0,4.26,-9.36,{roughness:.4,metalness:.5});
 /* foundation (split around the door), corner boards */
 for(const fx of[-4,4])box(6.2,.4,5.2,0x77716a,fx,.2,-12.5,{roughness:1});
 for(const cx of[-7,7])box(.22,5,.22,0xf5f0e4,cx,2.5,-9.98);
 for(const x of[-4.2,4.2]){box(1.9,1.9,.12,0xf2efe8,x,2.8,-9.96);lit(box(1.6,1.6,.14,0x2d4a63,x,2.8,-9.94,{roughness:.15,metalness:.4}).material);box(.06,1.6,.16,0xf2efe8,x,2.8,-9.93);box(1.6,.06,.16,0xf2efe8,x,2.8,-9.93);
  box(2.2,.1,.28,0xe6e0d4,x,1.82,-9.86);box(2.2,.16,.2,0xf2efe8,x,3.82,-9.9);
  for(const sx of[-1.2,1.2]){box(.5,1.9,.07,0x3f5a48,x+sx,2.8,-9.93);for(let s=0;s<6;s++)box(.4,.03,.02,0x2f4636,x+sx,2.1+s*.28,-9.885)}}
 /* door: frame, panelled leaf, handle, small hood, step, lamp */
 box(1.5,2.7,.14,0xf2efe8,0,1.35,-9.96);box(1.2,2.5,.16,0x5a3a22,0,1.25,-9.93,{map:wood});
 for(const py of[.8,1.75])for(const px of[-.28,.28])box(.4,.8,.03,0x4a2e1a,px,py,-9.84,{map:wood});
 cyl(.04,.04,.06,0xd8b24a,.42,1.2,-9.82,{metalness:.8,roughness:.3}).rotation.x=Math.PI/2;
 box(2.2,.1,1,0x6e3a2e,0,3.05,-9.5);for(const sx of[-1,1]){const dy=.66,dz=.9,len=Math.hypot(dz,dy),m=box(.08,.08,len,0xf2efe8,sx,2.34+dy/2,-10.02+dz/2);m.rotation.x=-Math.atan2(dy,dz)}
 box(1.9,.15,.7,0xa7a39a,0,.075,-9.65);
 box(.14,.25,.14,0x222222,1.4,2.2,-9.9);box(.1,.14,.1,0xfff2c0,1.4,2.2,-9.84,{emissive:0xffe9a0,emissiveIntensity:1.5});
 /* workbench against the house wall: the shop (E). Lamp glows at night. Built in the house's own frame (BENCH0); BENCH is where it ends up. */
 const[bx,bz]=BENCH0,wd={map:wood,roughness:.85};
 /* 1.5 m wide: fits between the left window shutter (x<-2.75) and the door step (x>-.95) */
 box(1.5,.08,.75,0xffffff,bx,.9,bz,wd);box(1.36,.05,.6,0xffffff,bx,.32,bz,wd);
 for(const sx of[-.67,.67])for(const sz of[-.3,.3])box(.08,.9,.08,0xffffff,bx+sx,.45,bz+sz,wd);
 box(1.5,.95,.05,0xffffff,bx,1.45,bz-.37,wd);
 box(.5,.22,.28,0xb03a2e,bx-.5,1.05,bz-.02,{roughness:.5,metalness:.3});box(.54,.04,.3,0x8a2a20,bx-.5,1.18,bz-.02,{roughness:.5,metalness:.3});
 box(.14,.18,.14,0x4a5258,bx+.55,1.04,bz+.22,{roughness:.4,metalness:.6});box(.3,.1,.18,0x6b7378,bx+.1,.99,bz+.1,{roughness:.4,metalness:.6});
 for(const[hx,hl]of[[-.6,.34],[-.3,.26],[0,.4]]){box(.03,hl,.03,0x8a8f94,bx+hx,1.5,bz-.33,{roughness:.4,metalness:.6});box(.07,.07,.05,0x3a3f44,bx+hx,1.5+hl/2+.02,bz-.33,{roughness:.5,metalness:.5})}
 /* clamp lamp bolted to the top of the backboard: post, arm, shade, bulb */
 cyl(.015,.015,.36,0x333840,bx+.55,2.1,bz-.37);cyl(.015,.015,.3,0x333840,bx+.55,2.28,bz-.22).rotation.x=Math.PI/2;cyl(.03,.09,.07,0x333840,bx+.55,2.24,bz-.07);
 const bulb=new THREE.Mesh(new THREE.SphereGeometry(.05,10,8),new THREE.MeshBasicMaterial({color:new THREE.Color(5,4,2.4)}));bulb.position.set(bx+.55,2.17,bz-.07);PARENT.add(bulb);LAMPS.push(bulb.material);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.46,.34),new THREE.MeshStandardMaterial({roughness:.85,map:cvTex(292,68,(x,w,h)=>{x.fillStyle='#3a2a1c';x.fillRect(0,0,w,h);x.strokeStyle='#e9a23b';x.lineWidth=4;x.strokeRect(6,5,w-12,h-10);x.fillStyle='#e9a23b';x.font='bold 36px Georgia,serif';x.textAlign='center';x.textBaseline='middle';x.fillText('WORKBENCH',w/2,h/2+2)})}));sign.material.map.wrapS=sign.material.map.wrapT=THREE.ClampToEdgeWrapping;
 sign.position.set(bx,2.45,-9.96);sign.castShadow=true;PARENT.add(sign);
}
PARENT=scene;const G0=GLASS.length,L0=LAMPS.length;/* house windows and bench bulb; the outer world adds more after these and is rebuilt per size */
function buildYard(){clearGroup(yardG);PARENT=yardG;obst.length=0;obst.push({x:BENCH[0],z:BENCH[1],r:.95});buildFence();
 /* trees + bin: soil around them is held by roots (see PROT in World), so they never float or sink */
 TREES.forEach(([x,z,s])=>{foliageTree(x,z,s);obst.push({x,z,r:.5*s})});
 const rb=rng(7),nb=Math.round(14*YH/10),st=2*(YH-1)/(nb-1),bx=YH-.7;for(let k=0;k<nb;k++){const t=-(YH-1)+k*st;[[bx,t],[-bx,t],[t,bx]].forEach(([x,z])=>{if(rb()<.5){const s=.5+rb()*.5,c=rb()<.5;if(Math.hypot(x-CRATE[0],z-CRATE[1])>1.35)blob(s,c?0x2d6a2b:0x3d8036,x,s*.7,z,1.2,.85,1.2)}})}
 cyl(.35,.3,.9,0x6b7378,BIN[0],.45,BIN[1],{roughness:.5,metalness:.3});cyl(.38,.38,.08,0x4c5358,BIN[0],.92,BIN[1]);
 /* open crate for artifacts, facing the yard */
 const[cx,cz]=CRATE;
 box(1.02,.08,.78,0xffffff,cx,.08,cz,{map:wood,roughness:.85});
 box(.07,.5,.78,0xffffff,cx-.47,.36,cz,{map:wood,roughness:.85});box(.07,.5,.78,0xffffff,cx+.47,.36,cz,{map:wood,roughness:.85});
 box(1.02,.5,.07,0xffffff,cx,.36,cz-.35,{map:wood,roughness:.85});box(1.02,.5,.07,0xffffff,cx,.36,cz+.35,{map:wood,roughness:.85});
 box(.84,.18,.6,0x241c16,cx,.24,cz,{roughness:1});
 for(const yy of[.24,.46])box(.02,.04,.66,0x6b5340,cx-.52,yy,cz,{roughness:.9});
 obst.push({x:cx,z:cz,r:.7});PARENT=scene}

/* ---------- surrounding world: hills, street, neighbours, forest ---------- */
function oh(x,z){const r=Math.hypot(x,z),m=Math.min(1,Math.max(0,(r-55)/80)),n=Math.sin(x*.021+1.3)*Math.cos(z*.017+.4)+.5*Math.sin(x*.05+z*.043)+.25*Math.sin(x*.11-z*.09);
 let h=m*m*(3-2*m)*(9+24*(.5+.2*n));const sz=30+DEL,edge=52+DEL,band=Math.min(1,Math.max(0,(Math.abs(z-sz)-7)/10)),end=Math.min(1,Math.max(0,(Math.abs(x)-(edge+4))/14));return h*Math.max(band,end)}
function house(x,z,ry,w,d,h,wc,rc,y=0){const G=new THREE.Group();G.position.set(x,y,z);G.rotation.y=ry;PARENT.add(G);
 const A=(m,a,b,c)=>{m.position.set(a,b,c);m.castShadow=m.receiveShadow=true;G.add(m);return m},B=(w2,h2,d2,c,o)=>new THREE.Mesh(new THREE.BoxGeometry(w2,h2,d2),mat(c,o));
 A(B(w,h,d,wc,{map:siding}),0,h/2,0);const rise=h*.4;G.add(gable(w,d,h,rise,rc,wc));
 for(const i of[-1,1]){A(B(w*.2,h*.3,.12,0xf2efe8),i*w*.27,h*.6,d/2+.02);lit(A(B(w*.17,h*.26,.14,0x2d4a63,{roughness:.15,metalness:.4}),i*w*.27,h*.6,d/2+.03).material)}
 A(B(1,2.1,.14,0x5a3a22),0,1.05,d/2+.03);A(B(.8,rise*1.5,.8,0x8a5a48),w*.3,h+rise*.9,0)}
function buildOuter(){clearGroup(outerG);PARENT=outerG;HD.n=0;HD.r=rng(21);GLASS.length=G0;LAMPS.length=L0;
 const r=rng(11),gt=soilTex.clone();gt.repeat.set(390,390);gt.needsUpdate=true;/* same texel density as the play area (26 tiles per 20 m) */
 const g=new THREE.PlaneGeometry(300,300,150,150).rotateX(-Math.PI/2),P=g.attributes.position,cl=new Float32Array(P.count*3);
 for(let i=0;i<P.count;i++){const x=P.getX(i),z=P.getZ(i),h=oh(x,z),rr=Math.hypot(x,z),q=Math.abs(Math.sin(x*12.9+z*78.2)*437.5)%1;P.setY(i,h);
  const n=Math.sin(x*.09)*Math.sin(z*.11)+.7*Math.sin(x*.031+z*.027);let cr=.2+.06*q,cg=.42+.08*q,cb=.14;
  if(rr>40&&rr<105&&n>.45&&!(Math.abs(x)<54+DEL&&z>-36&&z<64+DEL)){cr=.6+.05*q;cg=.52+.05*q;cb=.24}
  if(h>16){const k=Math.min(1,(h-16)/8);cr+=(.5-cr)*k;cg+=(.47-cg)*k;cb+=(.42-cb)*k}
  cl[i*3]=cr*cr*1.6;cl[i*3+1]=cg*cg*1.6;cl[i*3+2]=cb*cb*1.6}
 g.setAttribute('color',new THREE.BufferAttribute(cl,3));
 const ix=g.index.array,keep=[];for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(Math.abs(P.getX(a)+P.getX(b)+P.getX(c))<3*YH&&Math.abs(P.getZ(a)+P.getZ(b)+P.getZ(c))<3*YH)continue;keep.push(a,b,c)}/* cut-out where the yard terrain sits */
 g.setIndex(keep);g.computeVertexNormals();PARENT.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,map:gt,bumpMap:gt,bumpScale:3,roughness:1})));
 const HS=[[-27,-9,1.5708,9,7,4.2,0x9fb3c4,0x5a3a32],[-27,14,1.5708,8,6,4,0xd8c39a,0x3d3d44],[28,-8,-1.5708,10,7,4.4,0xc9877a,0x4a4a50],[28,15,-1.5708,8,6.5,4,0x9db08c,0x6a3b2e],[-32,47,3.1416,10,7,4.2,0xe0d6bf,0x55402f],[0,49,3.1416,11,7,4.6,0x8fa3b8,0x3f3f46],[34,47,3.1416,9,7,4.2,0xb98a6c,0x4a3a35]].map((a,i)=>[a[0]+HOFF[i+1][0]*DEL,a[1]+HOFF[i+1][1]*DEL,...a.slice(2)]);
 HS.forEach(a=>house(...a));HS.forEach(a=>lot(a[0],a[1],a[2],a[3],a[4]));perimeter();
 house(-80,-58,.6,12,9,6,0x8c2f2a,0x44464a,oh(-80,-58));const sy=oh(-66,-52);cyl(2.2,2.2,10,0xb7bdc2,-66,sy+5,-52,{metalness:.3,roughness:.5});const cap=new THREE.Mesh(new THREE.ConeGeometry(2.4,2,14),mat(0x6d737a));cap.position.set(-66,sy+11,-52);PARENT.add(cap);
 [[-22,2,1.2,-1,0],[22,2,1.1,1,0],[-23,-20,1.3,-1,0],[24,-19,1.2,1,0],[-22,18,1,-1,1],[23,19,1.1,1,1]].forEach(a=>foliageTree(a[0]+a[3]*DEL,a[1]+a[4]*DEL,a[2]));
 /* street runs to the hedge; a portal at each end takes it out of the neighbourhood */
 const sz=30+DEL,edge=52+DEL,len=edge*2;
 box(len,.05,8,0x3a3a3f,0,.025,sz,{roughness:.95});
 const step=7.2,nd=Math.floor((len-16)/step),x0=-(nd*step)/2;for(let k=0;k<=nd;k++)box(2.5,.06,.2,0xe8e0a0,x0+k*step,.04,sz);
 box(len,.12,2,0xb8b5ac,0,.06,sz-4.5);box(len,.12,2,0xb8b5ac,0,.06,sz+4.5);
 for(let k=-2;k<=2;k++){const x=k*18;cyl(.1,.14,8,0x5a4a3a,x+9,4,sz+6.8);box(2.2,.12,.12,0x5a4a3a,x+9,7.6,sz+6.8);cyl(.06,.08,5,0x333840,x,2.5,sz-5.4);box(.7,.12,.3,0x333840,x+.3,5,sz-5.4);
  const lm=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:new THREE.Color(5,4,2.4)}));lm.position.set(x+.4,4.9,sz-5.4);PARENT.add(lm);LAMPS.push(lm.material)}
 box(4.2,.7,1.8,0xa83232,-14,.65,sz-1.7,{roughness:.35,metalness:.5});box(2.2,.6,1.6,0x23303a,-14.3,1.28,sz-1.7,{roughness:.1,metalness:.6});
 for(const dx of[-1.4,1.4])for(const dz of[-.9,.9])cyl(.36,.36,.25,0x111111,-14+dx,.36,sz-1.7+dz).rotation.x=Math.PI/2;
 for(const s of[-1,1]){const x=s*edge,R=6.6,cmat=mat(0x8e928c,{roughness:.82,side:THREE.DoubleSide}),dk=new THREE.MeshBasicMaterial({color:0x050607,side:THREE.DoubleSide}),
  put=(g,px,mt)=>{const m=new THREE.Mesh(g,mt);m.position.set(px,0,sz);m.castShadow=m.receiveShadow=mt!==dk;PARENT.add(m);return m};
  put(archGeo(R+.28,5.8),x+s*2.9,cmat);put(archGeo(R+.55,.75),x+s*.2,cmat);
  put(archGeo(R,5.2),x+s*3.05,dk);
  const cap=new THREE.Mesh(new THREE.CircleGeometry(R,24,0,Math.PI),dk);cap.rotation.y=s>0?-Math.PI/2:Math.PI/2;cap.position.set(x+s*5.35,0,sz);PARENT.add(cap);
  box(1.1,2.4,.7,0x8e928c,x+s*.35,1.2,sz-(R+.15));box(1.1,2.4,.7,0x8e928c,x+s*.35,1.2,sz+(R+.15));
  box(4.6,.05,8,0x2a2a2e,x+s*2.5,.025,sz,{roughness:1});box(4.6,.1,2,0x9c998f,x+s*2.5,.05,sz-4.5);box(4.6,.1,2,0x9c998f,x+s*2.5,.05,sz+4.5)}
 /* door walks tuck under the sidewalks (slightly lower) so the join does not z-fight */
 WALKS.length=0;const pave=(w,d,x,z,main)=>{const h=main?.12:.1;box(w,h,d,0xb8b5ac,x,h/2,z);WALKS.push({x,z,hw:w/2+.25,hd:d/2+.25})},
  at=(cx,cz,ry,lx,lz)=>{const v=new V3(lx,0,lz).applyAxisAngle(HY,ry);return[cx+v.x,cz+v.z]},lamps=[-36,-18,0,18,36],
  nudge=(x,dir)=>{let p=x;for(const lx of lamps)if(Math.abs(p-lx)<1.5)p=lx+dir*1.55;return p},west=[],east=[],north=[];
 for(const a of HS){const f=new V3(0,0,1).applyAxisAngle(HY,a[2]);if(f.z<-.5)north.push(a);else if(f.x>.5)west.push(a);else east.push(a)}
 for(const[cx,cz,ry,,d]of north){const[dx,dz]=at(cx,cz,ry,0,d/2),zEnd=sz+5.5-.2;pave(1.2,Math.abs(dz-zEnd),dx,(dz+zEnd)/2)}
 const side=(list,dir)=>{if(!list.length)return;let hx=dir>0?-1e9:1e9,zs=1e9;
  for(const[cx,cz,ry,,d]of list){const[fx]=at(cx,cz,ry,0,d/2+8.1);hx=dir>0?Math.max(hx,fx):Math.min(hx,fx);zs=Math.min(zs,cz)}
  hx=nudge(hx,dir);const zEnd=sz-5.5,z0=zs-.8;pave(2,zEnd-z0,hx,(zEnd+z0)/2,1);
  for(const[cx,cz,ry,,d]of list){const[dx,dz]=at(cx,cz,ry,0,d/2);pave(Math.abs(hx-dx),1.2,(hx+dx)/2,dz)}};
 side(west,1);side(east,-1);
 const TN=460,RC=150,o=new THREE.Object3D(),cc=new THREE.Color(),bad=(x,z)=>HS.some(a=>Math.hypot(x-a[0],z-a[1])<13)||(Math.abs(z-sz)<8&&Math.abs(x)<58+DEL)||Math.hypot(x+78,z+58)<16||Math.hypot(x,z)<46||Math.abs(Math.max(Math.abs(x)-52-DEL,Math.abs(z-14-DEL/2)-48-DEL/2))<5;
 const TK=new THREE.InstancedMesh(new THREE.CylinderGeometry(.2,.3,2.4,6).translate(0,1.2,0),mat(0x4d3520),TN+RC),PN=new THREE.InstancedMesh(pineG,mat(0xffffff),TN),
  crown=leafG.clone();crown.scale(2.2,2.8,2.2);crown.translate(0,4.4,0);const CR=new THREE.InstancedMesh(crown,mat(0xffffff),RC);
 for(let i=0;i<TN+RC;i++){let x,z,t=0;do{const a=r()*6.283,d=46+Math.pow(r(),.8)*90;x=Math.cos(a)*d;z=Math.sin(a)*d}while(bad(x,z)&&t++<30);const sc=1+r()*1.2;
  o.position.set(x,oh(x,z)-.15,z);o.rotation.set(0,r()*6,0);o.scale.setScalar(sc);o.updateMatrix();TK.setMatrixAt(i,o.matrix);
  if(i<TN){PN.setMatrixAt(i,o.matrix);const h=.3+r()*.05,l=.12+r()*.1;PN.setColorAt(i,cc.setHSL(h,.5,l).convertSRGBToLinear())}
  else{CR.setMatrixAt(i-TN,o.matrix);CR.setColorAt(i-TN,cc.setHSL(r()<.3?.1+r()*.05:.25+r()*.07,.55,.2+r()*.1).convertSRGBToLinear())}}
 [TK,PN,CR].forEach(m=>{m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.frustumCulled=false;PARENT.add(m)});buildOuterGrass();PARENT=scene}

/* ---------- voxel yard: exposed cube faces, remeshed per 16×16 chunk ---------- */
let NZ;
const voxMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),voxG=new THREE.Group(),chunks=new Map();voxG.frustumCulled=false;scene.add(voxG);
function buildTerrain(){for(const m of chunks.values()){m.geometry.dispose();voxG.remove(m)}chunks.clear();
 soilTex.repeat.set(1,1);NZ=new Float32Array(N*N);for(let j=0;j<N;j++)for(let i=0;i<N;i++)NZ[j*N+i]=Math.abs(Math.sin(i*12.9898+j*78.233)*43758.5453)%1}
let world;const L2=v=>v*v*1.6,SC=[0,0,0];
/* soil colour by depth below the original surface (shared by terrain + dig particles); writes into SC */
function soilRGB(d,n){let r,g,b;
  if(d<.5){r=.3+.05*n;g=.2+.03*n;b=.12}
  else if(d<1.1){r=.55+.05*n;g=.36+.04*n;b=.2}
  else if(d<2.3){const s=Math.sin(d*14)*.04;r=.66+s;g=.55+s;b=.36+s}
  else if(d<3.5){const s=Math.sin(d*11)*.03+n*.04;r=.5+s;g=.46+s;b=.4+s}
  else{r=.3+n*.04;g=.32+n*.04;b=.35+n*.04}
  SC[0]=r;SC[1]=g;SC[2]=b}
function voxCol(i,j,layer,top,sky){const n=NZ[j*N+i],d=(VL-1-layer)*C;let r,g,b;
 if(layer===0){r=.28+n*.03;g=.29+n*.03;b=.32+n*.03}/* bedrock, so the bottom of a hole is a floor */
 else if(top&&sky&&!world.D[j*(N+1)+i]&&layer===VL-1){const lf=Math.sin(i*.17)*Math.cos(j*.13);r=.22+.07*n+.03*lf;g=.42+.1*n+.05*lf;b=.14+.03*n}
 else{soilRGB(d,n);r=SC[0];g=SC[1];b=SC[2]}
 const ao=1-Math.min(d,8)*.05,shade=sky?(top?1:.62):Math.max(.06,.16-d*.008);/* under a roof the dirt is cave-dark; open pits stay lit */
 return[L2(r*ao*shade),L2(g*ao*shade),L2(b*ao*shade)]}
function buildChunk(id){const i0=(id&255)<<4,j0=(id>>8)<<4,i1=Math.min(N,i0+16),j1=Math.min(N,j0+16),vol=N*N,v=world.vox,P=[],Nm=[],Co=[];
 const solid=(i,j,L)=>i>=0&&j>=0&&i<N&&j<N&&L>=0&&L<VL&&!!v[L*vol+j*N+i];/* outside is empty, so the rim draws a real wall down to the bedrock */
 const tri=(ax,ay,az,bx,by,bz,cx,cy,cz,nx,ny,nz,r,g,b)=>{P.push(ax,ay,az,bx,by,bz,cx,cy,cz);Nm.push(nx,ny,nz,nx,ny,nz,nx,ny,nz);Co.push(r,g,b,r,g,b,r,g,b)};
 const quad=(a,b,c,d,nx,ny,nz,col)=>{(tri(...a,...b,...c,nx,ny,nz,...col),tri(...a,...c,...d,nx,ny,nz,...col))};
 for(let j=j0;j<j1;j++)for(let i=i0;i<i1;i++){const x0=i*C-S/2,z0=j*C-S/2,x1=x0+C,z1=z0+C;
  for(let L=0;L<VL;L++){if(!solid(i,j,L))continue;let sky=true;for(let a=L+1;a<VL;a++)if(solid(i,j,a)){sky=false;break}const y0=BED+L*C,y1=y0+C;
   if(!solid(i,j,L+1)){const c=voxCol(i,j,L,1,sky);quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],0,1,0,c)}
   if(L>0&&!solid(i,j,L-1)){const c=voxCol(i,j,L,0,sky);quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],0,-1,0,c)}
   if(!solid(i+1,j,L)){const c=voxCol(i,j,L,0,sky);quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],1,0,0,c)}
   if(!solid(i-1,j,L)){const c=voxCol(i,j,L,0,sky);quad([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0],-1,0,0,c)}
   if(!solid(i,j+1,L)){const c=voxCol(i,j,L,0,sky);quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],0,0,1,c)}
   if(!solid(i,j-1,L)){const c=voxCol(i,j,L,0,sky);quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],0,0,-1,c)}}}
 let m=chunks.get(id);if(!P.length){if(m){m.geometry.dispose();voxG.remove(m);chunks.delete(id)}return}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(Nm,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Co,3));g.computeBoundingSphere();
 if(!m){m=new THREE.Mesh(g,voxMat);m.castShadow=m.receiveShadow=true;voxG.add(m);chunks.set(id,m)}else{m.geometry.dispose();m.geometry=g}}
function sync(all){const W=world;if(!W||!W.vox)return;
 if(all||!W.dirty){W.dirty=new Set();for(let j=0;j<N;j+=16)for(let i=0;i<N;i+=16)W.dirty.add((i>>4)+((j>>4)<<8))}
 for(const id of W.dirty)buildChunk(id);W.dirty.clear()}

/* ---------- grass, buried rocks, buried objects ---------- */
const GNMAX=Math.round(26000*36*36/400);let GN=26000;/* blades on the mowable lawn: 65 per m2, buffers sized for the largest yard */
const gg=new THREE.ConeGeometry(.024,.4,3,3,true).translate(0,.2,0);
{const a=gg.attributes.position,cc=new Float32Array(a.count*3);for(let i=0;i<a.count;i++){const y=a.getY(i)/.4;a.setX(i,a.getX(i)+y*y*.12);cc.fill(.15+.85*Math.min(1,y),i*3,i*3+3)}gg.computeVertexNormals();gg.setAttribute('color',new THREE.BufferAttribute(cc,3))}
const grass=new THREE.InstancedMesh(gg,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),GNMAX),gp=[],go=new THREE.Object3D(),gc=new THREE.Color();grass.receiveShadow=true;grass.frustumCulled=false;scene.add(grass);grass.setColorAt(0,gc);/* allocate the full colour buffer before count is reduced */
const GU={uT:{value:0}};grass.material.onBeforeCompile=sd=>{sd.uniforms.uT=GU.uT;sd.vertexShader='uniform float uT;\n'+sd.vertexShader.replace('#include <begin_vertex>','vec3 transformed=vec3(position);float wv=position.y/.4;vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);transformed.x+=sin(uT*1.8+ip.x*.7+ip.z*.5)*.06*wv;transformed.z+=cos(uT*1.4+ip.x*.4+ip.z*.8)*.05*wv;')};
const MC=.5;let mown=new Uint8Array(MG*MG);const gbuck=[];/* 0.5 m mown grid over the yard (MG cells a side), blades bucketed per cell */
const mcell=(x,z)=>Math.max(0,Math.min(MG-1,Math.floor((x+S/2)/MC)))+MG*Math.max(0,Math.min(MG-1,Math.floor((z+S/2)/MC)));
function buildGrass(){const r=rng(world.seed+1);gp.length=0;mown.fill(0);for(let i=0;i<MG*MG;i++)gbuck[i]=[];
 for(let n=0;n<GN;n++){let x,z;do{x=(r()-.5)*(S-.4);z=-(YH-.2)+r()*(S-.4)}while(!free(x,z)||(Math.abs(x)<1.2&&z<-(YH-1)));const s=.7+r()*.9,y=world.hAt(x,z)-.02;gp.push({x,z,y,s});gbuck[mcell(x,z)].push(n);
 go.position.set(x,y,z);go.rotation.set((r()-.5)*.5,r()*6,(r()-.5)*.5);go.scale.set(1,s,1);go.updateMatrix();grass.setMatrixAt(n,go.matrix);grass.setColorAt(n,gc.setHSL(.22+r()*.06,.55,.28+r()*.18).convertSRGBToLinear())}
 grass.instanceMatrix.needsUpdate=grass.instanceColor.needsUpdate=true}
/* cut whole cells whose centre is under the deck, so the swath is a solid strip instead of scattered blades */
function mowAt(x,z,rad){let ch=0;const i0=Math.max(0,Math.floor((x-rad+S/2)/MC)),i1=Math.min(MG-1,Math.floor((x+rad+S/2)/MC)),j0=Math.max(0,Math.floor((z-rad+S/2)/MC)),j1=Math.min(MG-1,Math.floor((z+rad+S/2)/MC));
 for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const ci=i+MG*j;if(mown[ci])continue;if(Math.hypot((i+.5)*MC-S/2-x,(j+.5)*MC-S/2-z)>rad)continue;mown[ci]=1;ch=1;cutCell(ci);if(Net.mode!=='solo')mowQ.push(ci)}
 if(ch)grass.instanceMatrix.needsUpdate=true}
const mowQ=[];/* cells mown since the last network flush (co-op only) */
function cutCell(ci){for(const n of gbuck[ci]){const q=gp[n];if(q.gone||q.cut)continue;q.cut=1;
  go.position.set(q.x,q.y,q.z);go.rotation.set(0,0,0);go.scale.set(1,q.s*.12,1);go.updateMatrix();grass.setMatrixAt(n,go.matrix)}}
/* a dig needs the aim spot and its neighbours within ~1 m mown (no grass cells count as mown) */
function isMown(x,z){for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const cx=x+i*MC,cz=z+j*MC;if(Math.hypot(i,j)>2.2||Math.abs(cx)>YH-.1||Math.abs(cz)>YH-.1)continue;const ci=mcell(cx,cz);if(mown[ci]||!gbuck[ci].length)continue;/* a dug cell has lost its grass, so it no longer blocks the shovel */
  if(gbuck[ci].some(n=>!gp[n].gone&&!gp[n].cut))return false}return true}
/* static grass beyond the fence so the surroundings match the lawn; thins out with distance */
function buildOuterGrass(){{const B=2*(YH+13.5),ON=Math.round(40000*(27*YH+182)/452),og=new THREE.InstancedMesh(gg,grass.material,ON),r=rng(5);og.receiveShadow=true;og.frustumCulled=false;
 for(let n=0;n<ON;){const x=(r()-.5)*B,z=(r()-.5)*B,d=Math.max(Math.abs(x),Math.abs(z));
  if(d<YH+.4||(Math.abs(x)<7.8&&z<-(YH-.2)&&z>-(YH+5.4))||paved(x,z)||r()>Math.exp(-(d-YH)/8))continue;
  const s=.8+r()*1;go.position.set(x,-.02,z);go.rotation.set((r()-.5)*.5,r()*6,(r()-.5)*.5);go.scale.set(1.9,s,1.9);go.updateMatrix();og.setMatrixAt(n,go.matrix);og.setColorAt(n,gc.setHSL(.22+r()*.06,.55,.28+r()*.18).convertSRGBToLinear());n++}
 og.instanceMatrix.needsUpdate=og.instanceColor.needsUpdate=true;PARENT.add(og)}
/* far lawn: cheap 3-triangle tufts out to the hedge line, skipping the street, house footprints and front paths */
{const FN=Math.round(70000*(102+2*DEL)*(94+DEL)/9588),fg=new THREE.ConeGeometry(.05,.42,3,1,true).translate(0,.21,0),fa=fg.attributes.position,fc=new Float32Array(fa.count*3);
 for(let i=0;i<fa.count;i++)fc.fill(.2+.8*Math.min(1,fa.getY(i)/.42),i*3,i*3+3);fg.setAttribute('color',new THREE.BufferAttribute(fc,3));
 const fm=new THREE.InstancedMesh(fg,grass.material,FN),r=rng(6),Y=new V3(0,1,0),v=new V3();fm.receiveShadow=true;fm.frustumCulled=false;
 const blocked=(x,z)=>{if(z>23.8+DEL&&z<37.8+DEL||paved(x,z))return true;for(const[cx,cz,ry,w,d]of HFP){v.set(x-cx,0,z-cz).applyAxisAngle(Y,-ry);if(Math.abs(v.x)<w/2+1.2&&v.z>-d/2-1.2&&v.z<d/2+1.2)return true}return false};
 for(let n=0;n<FN;){const x=-(51+DEL)+r()*(102+2*DEL),z=-33+r()*(94+DEL);if(Math.max(Math.abs(x),Math.abs(z))<YH+12||blocked(x,z))continue;
  const s=.8+r()*.9;go.position.set(x,oh(x,z)-.02,z);go.rotation.set((r()-.5)*.4,r()*6,(r()-.5)*.4);go.scale.set(1.2+r()*.8,s,1.2+r()*.8);go.updateMatrix();fm.setMatrixAt(n,go.matrix);
  fm.setColorAt(n,gc.setHSL(.21+r()*.07,.55,.24+r()*.16).convertSRGBToLinear());n++}
 fm.instanceMatrix.needsUpdate=fm.instanceColor.needsUpdate=true;PARENT.add(fm)}}
function clearGrass(x,z){let ch=0;go.position.set(0,-50,0);go.rotation.set(0,0,0);go.scale.setScalar(0);go.updateMatrix();
 for(let n=0;n<GN;n++){const q=gp[n];if(q.gone||Math.abs(q.x-x)>4||Math.abs(q.z-z)>4)continue;if(Math.abs(world.hAt(q.x,q.z)-q.y)>.05){q.gone=1;grass.setMatrixAt(n,go.matrix);ch=1}}if(ch)grass.instanceMatrix.needsUpdate=true}
const rockG=(()=>{const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=.82+.18*Math.sin(x*4.1+y*2.3)*Math.cos(z*3.7-y*1.9)+.1*Math.sin(x*9.3+z*7.1+y*5.2);p.setXYZ(i,x*k,y*k*.85,z*k)}
 g.computeVertexNormals();return g})();
const RNMAX=Math.round(700*36*36/400);let RN=700;/* buried rocks: 1.75 per m2 */
const rocks=new THREE.InstancedMesh(rockG,mat(0xffffff,{roughness:.95}),RNMAX);rocks.castShadow=rocks.receiveShadow=true;scene.add(rocks);rocks.setColorAt(0,new THREE.Color());
const rk=[];
function setRock(n){const q=rk[n];go.position.set(q.x,q.y,q.z);go.rotation.set(q.a,q.b,q.c);go.scale.set(q.s*q.w,q.s,q.s*q.w);go.updateMatrix();rocks.setMatrixAt(n,go.matrix)}
function buildRocks(){const r=rng(world.seed+2);rk.length=0;for(let n=0;n<RN;n++){const s=.07+Math.pow(r(),3)*.5;rk.push({x:(r()-.5)*(S-1),y:-.8-Math.pow(r(),1.15)*8.2,z:(r()-.5)*(S-1),a:r()*6,b:r()*6,c:r()*6,s,w:1+r()*.6});setRock(n);rocks.setColorAt(n,gc.setHSL(.08+r()*.05,.12+r()*.1,.25+r()*.3).convertSRGBToLinear())}
 /* a few small rocks are gems (own RNG stream so the rock layout is unchanged): over-bright colour, so they glow through the bloom */
 const g=rng(world.seed+3);for(let n=0;n<RN;n++){const q=rk[n],a=g(),b=g();q.gem=0;if(a<GEM_RATE&&q.s<=.3){q.s=Math.max(q.s,.1);q.gem=b<.6?1:b<.9?2:3;setRock(n);rocks.setColorAt(n,gc.setRGB(...GEM[q.gem][2]))}}
 rocks.instanceMatrix.needsUpdate=rocks.instanceColor.needsUpdate=true}
function settleRocks(x,z){let ch=0;for(let n=0;n<RN;n++){const q=rk[n];if(q.held||Math.abs(q.x-x)>9||Math.abs(q.z-z)>9||world.solidAt(q.x,q.y,q.z))continue;q.y=world.floorAt(q.x,q.z,q.y+.5)+q.s*.3;setRock(n);ch=1}if(ch)rocks.instanceMatrix.needsUpdate=true}
let pipeG;
function buildBuried(){if(pipeG)scene.remove(pipeG);pipeG=new THREE.Group();const add=(m,x,y,z)=>{m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;pipeG.add(m);return m};
 const cu=mat(0xc2733a,{roughness:.4,metalness:.35}),rust=mat(0x6a2f12);
 add(new THREE.Mesh(new THREE.TubeGeometry(world.curve,80,.16,12),cu),0,0,0);
 for(const t of[.1,.3,.5,.7,.9]){const r=add(new THREE.Mesh(new THREE.TorusGeometry(.17,.035,8,16),cu),0,0,0);r.position.copy(world.curve.getPoint(t));r.quaternion.setFromUnitVectors(new V3(0,0,1),world.curve.getTangent(t))}
 const bp=world.burst,cr=add(new THREE.Mesh(new THREE.TorusGeometry(.2,.05,8,16),rust),bp.x,bp.y,bp.z);cr.quaternion.setFromUnitVectors(new V3(0,0,1),world.curve.getTangent(world.bt));
 add(new THREE.Mesh(new THREE.IcosahedronGeometry(.12,1),new THREE.MeshBasicMaterial({color:0x080402})),bp.x,bp.y+.14,bp.z).scale.set(1.2,.35,1);
 for(const s of world.sig.slice(1)){s.ms=[];const keep=m=>s.ms.push(m);let m;
  if(s.kind==='tank'){m=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.1,2.4),mat(0x8a8a84));keep(add(new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.15,16),mat(0x6d6d68)),s.x,s.y+.6,s.z))}
  else if(s.kind==='iron'){m=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,3.2,12),mat(0x3a302a,{roughness:.6,metalness:.3}));m.rotation.set(0,s.a,Math.PI/2)}
  else if(s.kind==='gas'){m=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,3.2,12),mat(0xd8b42a,{roughness:.5}));m.rotation.set(0,s.a,Math.PI/2)}
  else m=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,1,20,1,true),mat(0x8d8a82,{side:THREE.DoubleSide}));
  keep(add(m,s.x,s.y,s.z))}
 scene.add(pipeG)}

/* buried finds: hidden until the soil above them is gone, then they sit on the hole floor */
function syncFind(f){if(f.done||f.held){f.m.visible=false;return}if(f.out||!world.solidAt(f.x,f.y,f.z)){f.out=1;const floor=world.floorAt(f.x,f.z,f.y+.4);if(f.y<floor+f.sz)f.y=floor+f.sz}f.m.position.set(f.x,f.y,f.z);f.m.rotation.set(0,f.a,0);f.m.visible=!!f.out}
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
/* ---------- hotbar: 1 shovel, 2 ground probe, 3 flashlight, 4 garden light (3 and 4 unlock at the workbench). Left click uses the selected item. ---------- */
const hp=new THREE.Group(),hf=new THREE.Group(),hl=new THREE.Group(),hfLens=new THREE.MeshBasicMaterial({color:0x555555}),hlLens=new THREE.MeshBasicMaterial({color:new THREE.Color(1.3,1.05,.55)});
{const st=mat(0xaab4bc,{roughness:.4,metalness:.5}),blk=mat(0x2a2d31,{roughness:.5,metalness:.6}),glv=mat(0x7a5530,{roughness:.9}),yel=mat(0xf0b400,{roughness:.45,metalness:.3}),M=(g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);return o},fist=()=>{const f=M(new THREE.SphereGeometry(.058,12,9),glv);f.scale.set(1.25,1,1.1);return f};
 /* probe: a long steel rod with a T-handle, tip pointing down */
 hp.add(M(new THREE.CylinderGeometry(.011,.011,1.05,8),st,0,-.56),M(new THREE.ConeGeometry(.022,.12,8).rotateX(Math.PI),st,0,-1.15),M(new THREE.CylinderGeometry(.018,.018,.26,10).rotateZ(Math.PI/2),blk),fist());
 /* flashlight: held pointing forward */
 hf.add(M(new THREE.CylinderGeometry(.034,.034,.2,12).rotateX(Math.PI/2),blk,0,0,-.1),M(new THREE.CylinderGeometry(.05,.037,.07,12).rotateX(Math.PI/2),yel,0,0,-.235),M(new THREE.CylinderGeometry(.024,.024,.03,10).rotateX(Math.PI/2),yel,0,.04,-.08),
  M(new THREE.CircleGeometry(.043,14).rotateY(Math.PI),hfLens,0,0,-.272),fist());
 /* garden light: the yellow work-light head, carried by its handle */
 hl.add(M(new THREE.BoxGeometry(.26,.17,.08),yel,0,.1,-.1),M(new THREE.BoxGeometry(.29,.2,.025),blk,0,.1,-.045),M(new THREE.PlaneGeometry(.22,.13).rotateY(Math.PI),hlLens,0,.1,-.142),
  M(new THREE.CylinderGeometry(.014,.014,.12,8),blk,0,.0,-.1),fist());
 for(const g of[hp,hf,hl]){g.traverse(o=>{if(o.isMesh)o.castShadow=false});g.visible=false;cam.add(g)}}
const HB=[{n:'Shovel',ok:()=>1},{n:'Ground probe',ok:()=>1},{n:'Flashlight',ok:()=>Prog.up.lantern>0,need:'Buy a flashlight at the workbench'},{n:'Garden light',ok:()=>Prog.up.lamps>0,need:'Buy garden lights at the workbench'}];
let sel=0,want=0,swapK=0,pa=0;/* sel = item in hand, want = item being raised, swapK = lowering/raising animation, pa = probe-push animation */
function hbShow(){document.querySelectorAll('.hb').forEach((e,i)=>{e.classList.toggle('on',i===want);e.classList.toggle('lock',!HB[i].ok())});$('hbName').textContent=HB[want].n}
function hbSelect(i){if(i===want||i<0||i>=HB.length)return;if(!HB[i].ok()){toast(HB[i].need);return}want=i;holding=false;hbShow()}
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
const MTURN=.8;/* max mower turn rate while pushed, rad/s */
let mh=0,mowerHeld=false,mowerOn=false,mowerOwner=null,mowerTarget=null,clipM,mowX,mowZ;/* mowerHeld: I own it; mowerOwner: id of whoever does (co-op) */
function placeMower(){mowerHeld=false;mowerOn=false;mowerOwner=null;mowerTarget=null;mowX=undefined;mowQ.length=0;mower.position.set(MOWS[0],world.hAt(MOWS[0],MOWS[1]),MOWS[1]);mower.rotation.set(0,0,0);if(clipM){clipM.gain.gain.value=0;clipM.blade.gain.value=0}}
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
function digDepth(x,z){const[i,j]=world.col(x,z);return{d:Math.max(0,-world.hAt(x,z)),n:NZ[j*N+i]}}
/* grid walk from the eye; the first solid cube is what the shovel hits, from any direction */
function rayVox(ox,oy,oz,dx,dy,dz,maxD){const v=world.vox,vol=N*N,mod=(n,m)=>((n%m)+m)%m;
 let i=Math.floor((ox+S/2)/C),j=Math.floor((oz+S/2)/C),L=Math.floor((oy-BED)/C),t=0;
 const sx=Math.sign(dx)||0,sy=Math.sign(dy)||0,sz=Math.sign(dz)||0;
 const dtx=sx?C/Math.abs(dx):1e9,dty=sy?C/Math.abs(dy):1e9,dtz=sz?C/Math.abs(dz):1e9;
 const span=(f,s)=>!s?1e9:(s>0?(f?C-f:C):f||0);
 let tx=span(mod(ox+S/2,C),sx)/ (sx?Math.abs(dx):1), ty=span(mod(oy-BED,C),sy)/(sy?Math.abs(dy):1), tz=span(mod(oz+S/2,C),sz)/(sz?Math.abs(dz):1);
 if(!sx)tx=1e9;if(!sy)ty=1e9;if(!sz)tz=1e9;
 for(let n=0;n<128&&t<=maxD;n++){if(i>=0&&i<N&&j>=0&&j<N&&L>=0&&L<VL&&v[L*vol+j*N+i])return{x:ox+dx*t,y:oy+dy*t,z:oz+dz*t};
  if(tx<=ty&&tx<=tz){i+=sx;t=tx;tx+=dtx}else if(ty<=tz){L+=sy;t=ty;ty+=dty}else{j+=sz;t=tz;tz+=dtz}}return null}
function spawn(p,v,life,w,sm,sc){if(parts.length>520)return;const m=new THREE.Mesh(pg,w?waterM:sm);m.scale.setScalar(sc!=null?sc:(w?.7:.6+Math.random()*1.1));m.position.copy(p);m.castShadow=!w;scene.add(m);parts.push({m,v,life,w})}
function stepParts(dt){for(let i=parts.length-1;i>=0;i--){const q=parts[i],P=q.m.position;q.life-=dt;q.v.y-=(q.w?7:11)*dt;P.addScaledVector(q.v,dt);
 const g=world.floorAt(P.x,P.z,P.y);if(P.y<g&&!q.w){P.y=g;q.v.set(0,0,0)}if(q.life<=0||(q.w&&P.y<g)){scene.remove(q.m);parts.splice(i,1)}}}

/* ---------- audio (synthesized) ---------- */
let AC,NB,hissG,rainSnd;
function audio(){if(AC){AC.resume();return}AC=new(window.AudioContext||window.webkitAudioContext)();NB=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 const lp=(type,fq,g)=>{const s=AC.createBufferSource();s.buffer=NB;s.loop=true;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=fq;const o=AC.createGain();o.gain.value=g;s.connect(f);f.connect(o);o.connect(AC.destination);s.start();return o};
 lp('lowpass',350,.06);hissG=lp('bandpass',3200,0);rainSnd=lp('highpass',1500,0);
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
const bright=sm('uniform sampler2D t;void main(){vec3 c=texture2D(t,v).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(.95,2.2,l),1.);}',{t:{value:null}}),
 blur=sm('uniform sampler2D t;uniform vec2 d;void main(){vec3 s=texture2D(t,v).rgb*.227;s+=(texture2D(t,v+d).rgb+texture2D(t,v-d).rgb)*.1946;s+=(texture2D(t,v+d*2.).rgb+texture2D(t,v-d*2.).rgb)*.1216;s+=(texture2D(t,v+d*3.).rgb+texture2D(t,v-d*3.).rgb)*.054;s+=(texture2D(t,v+d*4.).rgb+texture2D(t,v-d*4.).rgb)*.0162;gl_FragColor=vec4(s,1.);}',{t:{value:null},d:{value:new THREE.Vector2()}}),
 comp=sm(`uniform sampler2D tC,tD,tB;uniform vec2 sun,res,tx;uniform float sI,asp,nr,fr,tm,uN;
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
 col*=mix(1.,ao,.9);col+=bl*.38+ry*sI*.07;col*=1.25*(1.+.25*uN);col=mix(col,vec3(dot(col,vec3(.3,.59,.11)))*vec3(.8,.95,1.3),uN*.5);/* night: cooler, slightly desaturated, a touch brighter so it is dark but readable */
 col=(col*(2.51*col+.03))/(col*(2.43*col+.59)+.14);
 float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,1.2);col*=mix(vec3(.94,1.,1.08),vec3(1.07,1.,.9),smoothstep(.1,.8,l));
 col=pow(max(col,0.),vec3(1./2.2));col=mix(col,col*col*(3.-2.*col),.3);
 col*=1.-.4*smoothstep(.4,1.05,length(q*vec2(asp,1.)*1.15));col+=(hs(v*res+tm)-.5)*.018;
 gl_FragColor=vec4(col,1.);}`,{tC:{value:null},tD:{value:null},tB:{value:null},sun:{value:new THREE.Vector2()},res:{value:new THREE.Vector2(1,1)},tx:{value:new THREE.Vector2()},sI:{value:0},asp:{value:1},nr:{value:cam.near},fr:{value:cam.far},tm:{value:0},uN:{value:0}});
const depthMat=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),sdir=sun.position.clone().normalize(),sv=new V3();
const gl=cvTex(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(255,240,200,.8)');g.addColorStop(1,'rgba(255,200,120,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});
const sunS=[[70,.9,.7,.4],[9,8,7,5]].map(([z,r,g,b])=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gl,color:new THREE.Color(r,g,b),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));sp.scale.setScalar(z);scene.add(sp);return sp});
/* ---------- day / night: one clock drives sun, moon, sky, fog, ambient and the night lights ---------- */
const DAY_LEN=600,DAY0=.27;/* seconds per full day; start time (0 = midnight, .5 = noon). About 3.5 of the 10 minutes are night */
let dayT=DAY0,dayF=1,nightF=0,sunVis=1;
const sstep=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)},_v=new V3(),_c=new THREE.Color(),
 CL={hs:lin(0xbcd6ff),hsN:new THREE.Color(.05,.08,.2),hg:lin(0x5a4630),hgN:new THREE.Color(.03,.03,.05),sun:lin(0xfff1d6),warm:lin(0xff9450),moon:lin(0x9db8ff),fog:lin(0xcfe0e8),fogN:new THREE.Color(.012,.022,.06),fogW:lin(0xe8a070)};
const moon=(()=>{const t=cvTex(128,128,x=>{const g=x.createRadialGradient(64,64,18,64,64,64);g.addColorStop(0,'rgba(180,200,255,.35)');g.addColorStop(1,'rgba(180,200,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);
  x.fillStyle='#e8eefc';x.beginPath();x.arc(64,64,17,0,6.3);x.fill();x.fillStyle='rgba(150,165,200,.45)';for(const[a,b,r]of[[58,58,5],[70,66,4],[62,72,3]]){x.beginPath();x.arc(a,b,r,0,6.3);x.fill()}});
 const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,color:new THREE.Color(1.5,1.6,1.9),depthWrite:false,transparent:true,fog:false}));m.scale.setScalar(26);m.visible=false;scene.add(m);return m})(),
 stars=(()=>{const n=700,p=new Float32Array(n*3),r=rng(99);for(let i=0;i<n;i++){const a=r()*6.283,y=.04+r()*.96,s=Math.sqrt(1-y*y);p[i*3]=Math.cos(a)*s*190;p[i*3+1]=y*190;p[i*3+2]=Math.sin(a)*s*190}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const m=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:1.8,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));m.frustumCulled=false;m.visible=false;scene.add(m);return m})();
/* lights exist from the start and only change intensity: adding/removing a light recompiles every material in three r128 */
const porchL=new THREE.PointLight(lin(0xffc880),0,12,1.5),benchL=new THREE.PointLight(lin(0xffc880),0,11,1.5);
porchL.position.set(1.4,2,-9.2);benchL.position.set(BENCH[0]+.7,2.1,BENCH[1]+.5);scene.add(porchL,benchL);
let cloudAmt=0,rainAmt=0,wasBolt=false,weatherHold=null;/* weather follows the shared day clock, unless setWeather holds it */
function applyDay(){
 const a=(dayT-.25)*6.2832,cs=Math.cos(a),sn=Math.sin(a);sdir.set(cs*.93,sn*.9+.35,cs*.37-sn*.2).normalize();/* bias .35 keeps the sun up for ~63% of the day */
 const ny=sdir.y,df=sstep(-.1,.3,ny),warm=sstep(.5,.05,ny)*df;dayF=df;nightF=1-df;sunVis=sstep(-.08,.05,ny);
 {const u=((dayT*DAY_LEN)%180)/180;cloudAmt=sstep(.36,.5,u)*sstep(1,.8,u);rainAmt=sstep(.52,.64,u)*sstep(.96,.78,u)
  if(weatherHold==='clear'){cloudAmt=0;rainAmt=0}else if(weatherHold==='cloud'){cloudAmt=1;rainAmt=0}else if(weatherHold==='rain'){cloudAmt=1;rainAmt=1}}/* about 3 minutes: clear, cloud, rain, clear */
 /* a single directional light: the sun by day, a dim blue moon by night; the swap happens while both are ~0 so nothing pops */
 sun.position.copy(ny>=0?sdir:_v.copy(sdir).negate()).multiplyScalar(19.2);
 /* cloud flattens the sun into gray fill; rain nearly removes it, so shadows go soft then almost vanish */
 const sunK=1-.75*cloudAmt-.19*rainAmt,fillK=1+.2*cloudAmt-.62*rainAmt;
 sun.intensity=(ny>=0?1.8*sstep(0,.3,ny):.34*sstep(0,.3,-ny))*Math.max(.06,sunK);
 sun.color.copy(ny>=0?CL.sun:CL.moon);if(ny>=0){sun.color.lerp(CL.warm,warm*(1-cloudAmt));sun.color.lerp(_c.setRGB(.72,.78,.84),cloudAmt)}
 const bolt=rainAmt>.55&&((dayT*DAY_LEN)%47)<.18;
 hemi.color.copy(CL.hsN).lerp(CL.hs,df);hemi.color.lerp(_c.setRGB(.62,.67,.72),cloudAmt*df);hemi.color.lerp(_c.setRGB(.32,.38,.46),rainAmt*Math.max(df,.4));
 hemi.groundColor.copy(CL.hgN).lerp(CL.hg,df);hemi.groundColor.lerp(_c.setRGB(.18,.2,.22),Math.max(cloudAmt,rainAmt)*.65);
 hemi.intensity=(.22+.48*df)*Math.max(.35,fillK)+(bolt?1.6:0);
 if(bolt&&!wasBolt){nz('lowpass',60,.9,.4);nz('lowpass',160,.3,.18)}wasBolt=bolt;
 scene.fog.color.copy(CL.fogN).lerp(CL.fog,df).lerp(CL.fogW,warm*.4*(1-cloudAmt));scene.fog.color.lerp(_c.setRGB(.5,.56,.62),cloudAmt*.8);
 scene.fog.near=35-18*rainAmt;scene.fog.far=150-85*rainAmt;
 skyMat.color.setRGB(.025,.04,.1).lerp(_c.setRGB(1,1,1),df).lerp(_c.setRGB(1,.72,.56),warm*.55*(1-cloudAmt));
 overMat.opacity=cloudAmt;overMat.color.setRGB(.02,.025,.04).lerp(_c.setRGB(.62,.68,.74),df*(1-.3*rainAmt));
 stars.material.opacity=nightF*nightF*(1-cloudAmt);stars.visible=nightF>.02;stars.rotation.y=dayT*6.2832;
 const mv=sstep(.02,-.2,ny);moon.material.opacity=mv*(1-cloudAmt*.85);moon.visible=mv>.01;sunS.forEach(q=>q.material.opacity=sunVis*(1-cloudAmt));
 comp.uniforms.uN.value=nightF;
 /* night lights: porch + workbench lamp, windows that switch on one by one, street bulbs */
 porchL.intensity=1.3*nightF;benchL.intensity=1.6*nightF;
 for(const m of GLASS)m.emissiveIntensity=sstep(m.userData.th,m.userData.th+.25,nightF)*1.1;
 for(const m of LAMPS)m.color.setRGB(3.2,2.6,1.5).multiplyScalar(.12+.88*nightF)}
const RDN=640,rainP=new Float32Array(RDN*6),rainSp=new Float32Array(RDN),rainGeo=new THREE.BufferGeometry();
rainGeo.setAttribute('position',new THREE.BufferAttribute(rainP,3));
const rainMat=new THREE.LineBasicMaterial({color:0xc5d4e0,transparent:true,opacity:0,depthWrite:false,fog:true}),rainLines=new THREE.LineSegments(rainGeo,rainMat);
rainLines.frustumCulled=false;scene.add(rainLines);
function rainDrop(i,y){const o=cam.position,a=Math.random()*6.283,r=Math.sqrt(Math.random())*16,x=o.x+Math.cos(a)*r,z=o.z+Math.sin(a)*r,yy=y!=null?y:o.y+2+Math.random()*14,k=i*6;
 rainP[k]=x;rainP[k+1]=yy;rainP[k+2]=z;rainP[k+3]=x+.16;rainP[k+4]=yy-.72;rainP[k+5]=z+.04;rainSp[i]=12+Math.random()*14}
for(let i=0;i<RDN;i++)rainDrop(i);
function stepRain(dt){rainMat.opacity=rainAmt*.55;rainLines.visible=rainAmt>.06;if(rainAmt<.06)return;const o=cam.position;
 for(let i=0;i<RDN;i++){const k=i*6,sp=rainSp[i]*dt;rainP[k+1]-=sp;rainP[k+4]-=sp;rainP[k]+=dt*2.6;rainP[k+3]+=dt*2.6;
  if(rainP[k+1]<o.y-7||Math.hypot(rainP[k]-o.x,rainP[k+2]-o.z)>18)rainDrop(i,o.y+4+Math.random()*12)}
 rainGeo.attributes.position.needsUpdate=true}
/* ---------- garden lights: bought at the workbench (Prog.up.lamps = how many you own), set on the ground (G) and wired to the wall socket ---------- */
const SOCK0=[5.9,-9.9],SOCK=[5.9,-9.9],CABLE_MAX=50,GL_R=7,GLN=4;/* socket on the house front wall (below the right shutter); cable reach and lit radius in m; max lamps */
let glOn=false,glK=0,glDirty=false;const GS=Array(GLN).fill(null);/* placed lamps: {x,z} or null */
const glBulbs=[0,1,2,3].map(()=>new THREE.MeshBasicMaterial({color:new THREE.Color(5,4,2.4)})),glLights=[],glObj=[],glCab=[],glCab2=[],glSpark=[],glSparkM=new THREE.MeshBasicMaterial({color:new THREE.Color(6,5,3)}),sockLed=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.05,.04)});
/* outdoor outlet plate with a rocker switch and a status LED (red = off, green = on) */
PARENT=houseG;box(.17,.28,.04,0xe8e4d8,SOCK0[0],1.0,-9.98,{roughness:.5});box(.075,.12,.03,0x22252a,SOCK0[0],1.06,-9.955);box(.1,.07,.02,0xcfcbc0,SOCK0[0],.93,-9.955);
{const led=new THREE.Mesh(new THREE.SphereGeometry(.014,8,6),sockLed);led.position.set(SOCK0[0]+.055,1.11,-9.955);houseG.add(led)}PARENT=scene;
/* construction-site work light: yellow tripod stand, tall mast, tilted flood-light head with a grille */
const GL_H=2.3,GL_I=.85;/* GL_I = work-light brightness *//* mast height in m */
{const gm=(g,c,o)=>{const m=new THREE.Mesh(g,mat(c,o));m.castShadow=true;return m},paint={roughness:.45,metalness:.3},steel={roughness:.5,metalness:.6},Y=0xf0b400,UP=new V3(0,1,0);
 for(let i=0;i<GLN;i++){const g=new THREE.Group();
  g.add(gm(new THREE.CylinderGeometry(.03,.036,GL_H,8).translate(0,GL_H/2,0),Y,paint),gm(new THREE.CylinderGeometry(.05,.05,.1,8).translate(0,.95,0),0x2a2d31,steel),gm(new THREE.CylinderGeometry(.045,.045,.06,8).translate(0,GL_H,0),0x2a2d31,steel));
  for(let k=0;k<3;k++){const a=k*Math.PI*2/3+.5,r=.62,e=new V3(Math.cos(a)*r,0,Math.sin(a)*r),s0=new V3(0,.95,0),d=e.clone().sub(s0),len=d.length(),leg=gm(new THREE.CylinderGeometry(.017,.017,len,6),Y,paint);
   leg.position.copy(s0).add(e).multiplyScalar(.5);leg.quaternion.setFromUnitVectors(UP,d.normalize());g.add(leg);
   const foot=gm(new THREE.CylinderGeometry(.045,.045,.025,8),0x1d1f22,steel);foot.position.set(e.x,.012,e.z);g.add(foot)}
  const head=new THREE.Group();head.position.set(0,GL_H+.2,0);head.rotation.x=.42;
  head.add(gm(new THREE.BoxGeometry(.5,.34,.15),Y,paint),gm(new THREE.BoxGeometry(.54,.38,.03).translate(0,0,-.075),0x2a2d31,steel),
   gm(new THREE.BoxGeometry(.54,.04,.2).translate(0,.19,.05),0x2a2d31,steel));
  const lens=new THREE.Mesh(new THREE.PlaneGeometry(.42,.26).translate(0,0,.077),glBulbs[i]);head.add(lens);
  for(let k=-2;k<=2;k++)head.add(gm(new THREE.BoxGeometry(.012,.28,.012).translate(k*.09,0,.088),0x1d1f22,steel));
  const yk=gm(new THREE.CylinderGeometry(.02,.02,.1,6).translate(0,-.08,0),0x2a2d31,steel);g.add(yk);yk.position.set(0,GL_H+.1,0);
  g.add(head);g.visible=false;scene.add(g);glObj.push(g);
  const L=new THREE.PointLight(lin(0xffd49a),0,11,1.5);L.position.set(0,-50,0);scene.add(L);glLights.push(L);
  const cm=mat(0x141414,{roughness:.6}),c=new THREE.Mesh(new THREE.BufferGeometry(),cm),c2=new THREE.Mesh(new THREE.BufferGeometry(),cm),sp=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),glSparkM);
  [c,c2,sp].forEach(m=>{m.visible=false;m.frustumCulled=false;scene.add(m)});glCab.push(c);glCab2.push(c2);glSpark.push(sp)}}
/* cable helpers: the cable lies on the ground in a straight line from just below the socket to the lamp */
const cabN=q=>Math.max(5,Math.ceil(Math.hypot(q.x-SOCK[0],q.z-SOCK[1]-.7)/.6)),cabCI=(q)=>Math.max(1,Math.min(cabN(q)-3,Math.round(q.cut*cabN(q))));
function cabSeg(x,z,i){const q=GS[i],x0=SOCK[0],z0=SOCK[1]+.7,dx=q.x-x0,dz=q.z-z0;let t=((x-x0)*dx+(z-z0)*dz)/(dx*dx+dz*dz||1e-6);t=Math.max(0,Math.min(1,t));return{t,d:Math.hypot(x0+dx*t-x,z0+dz*t-z)}}
function cutPos(i){const q=GS[i],n=cabN(q),t=(cabCI(q)+.5)/n,x0=SOCK[0],z0=SOCK[1]+.7;return[x0+(q.x-x0)*t,z0+(q.z-z0)*t]}
/* a cut cable (q.cut = fraction along the run) is drawn as two pieces with a gap and a sparking end; the lamp behind it goes dark */
function glCable(i){const m=glCab[i],m2=glCab2[i],q=GS[i];m.geometry.dispose();m2.geometry.dispose();m.visible=m2.visible=glSpark[i].visible=false;if(!q)return;
 const pts=[new V3(SOCK[0],.93,SOCK[1]+.05),new V3(SOCK[0],.3,SOCK[1]+.3)],x0=SOCK[0],z0=SOCK[1]+.7,n=cabN(q),tube=a=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(a),a.length*3,.014,5);
 for(let k=0;k<=n;k++){const t=k/n,x=x0+(q.x-x0)*t,z=z0+(q.z-z0)*t;pts.push(new V3(x,world.hAt(x,z)+.03,z))}
 if(q.cut==null){m.geometry=tube(pts);m.visible=true;return}
 const ci=cabCI(q);m.geometry=tube(pts.slice(0,ci+3));m.visible=true;m2.geometry=tube(pts.slice(ci+3));m2.visible=true;
 const a=pts[ci+2],b=pts[ci+3];glSpark[i].position.set((a.x+b.x)/2,(a.y+b.y)/2+.04,(a.z+b.z)/2);glSpark[i].visible=true}
function glPlace(i,x,z,cut){GS[i]={x,z,cut:cut==null?null:cut,k:0,pend:0};glObj[i].visible=true;glObj[i].rotation.y=Math.atan2(-x,-z);glCable(i)}
function glPick(i){GS[i]=null;glObj[i].visible=false;glLights[i].position.set(0,-50,0);glLights[i].intensity=0;glCable(i)}
function glReset(){for(let i=0;i<GLN;i++)if(GS[i])glPick(i);glOn=false}
const glLit=(x,z)=>glOn&&GS.some(q=>q&&q.cut==null&&Math.hypot(q.x-x,q.z-z)<GL_R);
function zap(i){nz('highpass',3200,.18,.4);sweep('bandpass',3000,500,.3,.35)}
function lampTick(dt){if(glDirty){glDirty=false;GS.forEach((q,i)=>q&&glCable(i))}
 glK+=((glOn?1:0)-glK)*Math.min(1,dt*8);sockLed.color.setRGB(.5*(1-glK)+.1,.05+1.6*glK,.04+.2*glK);
 const mm=mowerHeld&&mowerOn&&state==='play'&&!paused;
 for(let i=0;i<GLN;i++){const q=GS[i];if(!q){continue}const y=world.hAt(q.x,q.z),live=glOn&&q.cut==null;
  q.k+=((live?1:0)-q.k)*Math.min(1,dt*8);glObj[i].position.set(q.x,y,q.z);glLights[i].position.set(q.x,y+GL_H+.2,q.z);glLights[i].intensity=GL_I*q.k;glBulbs[i].color.setRGB(2.6,2.1,1.2).multiplyScalar(.1+.9*q.k);
  if(q.cut!=null){const sp=glSpark[i];sp.visible=Math.random()<(glOn?.55:.12);sp.scale.setScalar(.6+Math.random()*1.2)}
  else if(mm&&T>q.pend){const c=cabSeg(mower.position.x,mower.position.z,i);if(c.d<.5){q.pend=T+1.5;Net.send({type:'cable_cut',i,t:c.t,by:ME})}}}}
window.fxResize=(w,h)=>{rtC.setSize(w,h);rtD.setSize(w>>1,h>>1);rtB1.setSize(w>>2,h>>2);rtB2.setSize(w>>2,h>>2);const u=comp.uniforms;u.res.value.set(w,h);u.tx.value.set(2/w,2/h);u.asp.value=w/h};
function fxRender(){
 sunS.forEach(q=>q.position.copy(cam.position).addScaledVector(sdir,170));moon.position.copy(cam.position).addScaledVector(sdir,-170);
 R.setRenderTarget(rtC);R.setClearColor(0x000000,1);R.clear(true,true,true);R.render(scene,cam);
 const os=[...sunS,moon,stars,...rings.map(q=>q.m),...Net.tags()],vs=os.map(o=>o.visible);os.forEach(o=>o.visible=false);
 R.shadowMap.autoUpdate=false;scene.overrideMaterial=depthMat;R.setRenderTarget(rtD);R.setClearColor(0xffffff,1);R.clear(true,true,true);R.render(scene,cam);
 scene.overrideMaterial=null;R.setClearColor(0x000000,1);R.shadowMap.autoUpdate=true;os.forEach((o,i)=>o.visible=vs[i]);
 bright.uniforms.t.value=rtC.texture;pass(bright,rtB1);
 for(const k of[1.5,3]){blur.uniforms.t.value=rtB1.texture;blur.uniforms.d.value.set(k/rtB1.width,0);pass(blur,rtB2);blur.uniforms.t.value=rtB2.texture;blur.uniforms.d.value.set(0,k/rtB1.height);pass(blur,rtB1)}
 const u=comp.uniforms;sv.copy(cam.position).addScaledVector(sdir,100).project(cam);u.sun.value.set(sv.x*.5+.5,sv.y*.5+.5);
 u.sI.value=Math.max(0,new V3(0,0,-1).applyQuaternion(cam.quaternion).dot(sdir)+.2)*sunVis*(1-cloudAmt);u.tC.value=rtC.texture;u.tD.value=rtD.texture;u.tB.value=rtB1.texture;u.tm.value=performance.now()/1000%100;
 pass(comp,null)}
resize();

/* ---------- game ---------- */
let state='intro',stepD=0,paused=false,locked=false,fallback=false,dragging=false,moved=0,px=0,py=0,pz=6,ey=1.7,pvx=0,pvy=0,pvz=0,yaw=0,pitch=-.35,aim=null,digDir=new V3(0,0,-1),cd=0,pc=0,swing=0,holding=false,heldT=0,autoDug=false,geyser=false,elapsed=0,hudT=0,T=0,toastT=0,last=performance.now();
const keys={},free=(x,z)=>obst.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+.3);
function show(id){document.querySelectorAll('.scr').forEach(e=>e.classList.toggle('show',e.id===id))}
function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;toastT=3.5}
const rndSeed=()=>Math.random()*1e9|0,menuScr=()=>{const p=Net.pend;Net.pend='';return p?'mp':'menu'};
let yardBuilt=false,wantSize=(()=>{try{const v=+localStorage.getItem('burstSize');if(SIZES.includes(v))return v}catch(e){}return 20})();/* wantSize: what the next yard will be (menu choice, remembered) */
function setYardSize(s){if(!SIZES.includes(s))s=SIZES[0];if(yardBuilt&&s===S)return;
 layout(s);GN=Math.round(26000*s*s/400);RN=Math.round(700*s*s/400);grass.count=GN;rocks.count=RN;mown=new Uint8Array(MG*MG);
 houseG.position.z=-DEL;porchL.position.set(1.4,2,-9.2-DEL);benchL.position.set(BENCH[0]+.7,2.1,BENCH[1]+.5);
 buildTerrain();buildYard();buildOuter();yardBuilt=true}
function newGame(seed,size){Prog=freshProg();flashOn=false;sel=want=0;swapK=0;saveProg();/* every new yard starts from scratch: 80 points, no upgrades */setYardSize(size||(yardBuilt?S:wantSize));world=new World(seed==null?rndSeed():seed);Net.reset();glReset();dayT=DAY0;buildBuried();buildRocks();dropCarry(true);buildFinds();sync(true);buildGrass();placeMower();parts.forEach(q=>scene.remove(q.m));parts.length=0;rings.forEach(q=>scene.remove(q.m));rings.length=0;geyser=false;px=0;pz=YH-4;yaw=0;pitch=-.35;py=world.hAt(0,pz);ey=py+1.7;pvx=pvy=pvz=0;pc=0;elapsed=0;setShop(false);hudPts();$('tm').textContent='0:00'}
function lock(){try{cv.requestPointerLock()}catch(e){}setTimeout(()=>{fallback=!document.pointerLockElement},250)}
function startPlay(seed,size){audio();state='play';newGame(seed,size||wantSize);$('hud').style.display='block';sh.visible=true;
 paused=true;holding=dragging=false;show('help')}
$('bGot').onclick=()=>{paused=false;show(null);lock()};
function toMenu(){Net.leave();setShop(false);state='menu';paused=false;geyser=false;document.exitPointerLock?.();$('hud').style.display='none';sh.visible=hp.visible=hf.visible=hl.visible=false;show('menu');if(wantSize!==S)newGame(undefined,wantSize)}
const canSee=()=>dayF>.45||(flashOn&&Prog.up.lantern>0)||(!!aim&&glLit(aim.x,aim.z));
function lampKey(){if(!Prog.up.lamps){toast('Buy garden lights at the workbench');return}
 if(aim){let bi=-1,bd=2.5;GS.forEach((q,i)=>{if(!q)return;const d=Math.hypot(q.x-aim.x,q.z-aim.z);if(d<bd){bd=d;bi=i}});if(bi>=0){Net.send({type:'lamp_pick',i:bi,by:ME});return}}
 const fi=GS.findIndex((q,i)=>!q&&i<Prog.up.lamps);if(fi<0){toast('All your lights are out — aim at one and press G to pick it up');return}
 if(!aim){toast('Aim at the ground to set a light down');return}
 if(Math.hypot(aim.x-SOCK[0],aim.z-SOCK[1])>CABLE_MAX){toast(`Too far — the cable only reaches ${CABLE_MAX} m from the socket`);return}
 Net.send({type:'lamp_place',i:fi,x:aim.x,z:aim.z,by:ME})}
function tryDig(){if(state!=='play'||paused||!aim||cd>0||Math.abs(aim.x)>YH-1.4||Math.abs(aim.z)>YH-1.4||handsBusy())return;
 if(aim.y>-.3&&!isMown(aim.x,aim.z)){toast('Mow the grass first');return}/* only the lawn surface needs mowing; a wall or ceiling is already open */
 if(!canSee()){toast(Prog.up.lantern?'Too dark to dig — press L for your flashlight':'Too dark to dig — buy a flashlight at the workbench');return}cd=.8;swing=1;
 for(let i=0;i<GLN;i++){const q=GS[i];if(!q||q.cut!=null)continue;const c=cabSeg(aim.x,aim.z,i);if(c.d<.4){Net.send({type:'cable_cut',i,t:c.t,by:ME});break}}/* the shovel goes through the cable */
 const d=digDir,q=v=>Math.round(v*1000)/1000;Net.send({type:'dig',x:aim.x,y:aim.y,z:aim.z,dx:q(d.x),dy:q(d.y),dz:q(d.z),by:ME})}
/* E: drop what you're holding, else grab the mower, else the nearest exposed rock, else a find */
function useE(){if(state!=='play'||paused)return;audio();
 if(shopOpen){setShop(false);return}
 if(mowerHeld){Net.flushMow();Net.send({type:'mower_drop',x:mower.position.x,z:mower.position.z,ry:mower.rotation.y,on:mowerOn?1:0,fy:py,by:ME});return}
 if(carry>=0){const q=rk[carry],nc=Math.hypot(px-CRATE[0],pz-CRATE[1])<2.5,nb=Math.hypot(px-BIN[0],pz-BIN[1])<2.5;
  if(q.gem&&nc||!q.gem&&(nc||nb)){Net.send({type:'rock_sell',n:carry,by:ME});return}
  if(q.gem&&nb){toast('That belongs in the crate');return}
  if(aim)Net.send({type:'rock_place',n:carry,x:aim.x,z:aim.z,by:ME});else toast('Aim at the ground to put it down');return}
 if(carryF>=0){const f=world.finds[carryF],db=Math.hypot(px-BIN[0],pz-BIN[1]),dc=Math.hypot(px-CRATE[0],pz-CRATE[1]);
  if(db<2.5||dc<2.5){const at=db<=dc?'bin':'crate';if(at===(f.type==='trash'?'bin':'crate'))Net.send({type:'find_deposit',n:carryF,by:ME});else toast(f.type==='trash'?'That belongs in the trashcan':'That belongs in the crate');return}
  if(aim)Net.send({type:'find_place',n:carryF,x:aim.x,z:aim.z,by:ME});else toast('Aim at the ground to put it down');return}
 if(aim){let bi=-1,bd=1.6;GS.forEach((q,i)=>{if(!q||q.cut==null)return;const p=cutPos(i),d=Math.hypot(p[0]-aim.x,p[1]-aim.z);if(d<bd&&Math.hypot(p[0]-px,p[1]-pz)<3.5){bd=d;bi=i}});if(bi>=0){Net.send({type:'cable_fix',i:bi,by:ME});return}}
 if(lookingAtLeak()){Net.send({type:'shutoff',by:ME});return}
 if(Math.hypot(px-SOCK[0],pz-SOCK[1])<2.6){if(!Prog.up.lamps)toast('No lights yet — buy some at the workbench');else Net.send({type:'lamp_power',on:glOn?0:1,by:ME});return}
 if(Math.hypot(px-BENCH[0],pz-BENCH[1])<3.2){setShop(true);return}
 if(Math.hypot(px-mower.position.x,pz-mower.position.z)<2.2){if(mowerOwner)toast('Someone else is using the mower');else Net.send({type:'mower_grab',by:ME});return}
 for(let i=1;i<world.sig.length;i++){const s=world.sig[i];if(!s.f||s.sold||Math.hypot(px-s.x,py-s.y,pz-s.z)>2.8)continue;Net.send({type:'scrap',n:i,by:ME});return}
 const dir=new V3(0,0,-1).applyQuaternion(cam.quaternion);let best=-1,bd=2.4;
 for(let n=0;n<RN;n++){const q=rk[n];if(q.held||world.solidAt(q.x,q.y,q.z))continue;/* still buried */
  const d=Math.hypot(q.x-px,q.z-pz);if(d>3.5||d>=bd)continue;if(new V3(q.x-px,q.y+q.s*.4-ey,q.z-pz).normalize().dot(dir)<.6)continue;best=n;bd=d}
 if(best>=0){if(rk[best].s>.32){toast('Too heavy');return}Net.send({type:'rock_pick',n:best,by:ME});return}
 best=-1;bd=2.4;
 for(let n=0;n<world.finds.length;n++){const f=world.finds[n];if(!findOut(f))continue;const d=Math.hypot(f.x-px,f.z-pz);if(d>3.5||d>=bd)continue;if(new V3(f.x-px,f.y-ey,f.z-pz).normalize().dot(dir)<.6)continue;best=n;bd=d}
 if(best>=0)Net.send({type:'find_pick',n:best,by:ME})}
function lookingAtLeak(){if(!world||world.shut||!world.exposed())return false;const b=world.burst,o=cam.position,dx=b.x-o.x,dy=b.y-o.y,dz=b.z-o.z,t=dx*digDir.x+dy*digDir.y+dz*digDir.z;
 if(t<.25||t>4.5||Math.hypot(dx-digDir.x*t,dy-digDir.y*t,dz-digDir.z*t)>.6)return false;return Math.hypot(px-b.x,py-b.y,pz-b.z)<4.2}
function dropCarry(reset){if(carry>=0){if(reset){rk[carry].held=0;setRock(carry);rocks.instanceMatrix.needsUpdate=true}carry=-1}clearCarryF()}
function probe(){if(state!=='play'||paused||pc>0)return;const pl=Prog.up.probe,nf=1-.3*pl;pcMax=pc=PCD[pl];pa=1;nz('lowpass',140,.5,1);sweep('bandpass',200,1400,.6,.35,.05);const gy=world.hAt(px,pz);let bs,bd=1e9;
 for(const s of world.sig){const d=Math.hypot(px-s.x,gy-s.y,pz-s.z);if(d<bd){bd=d;bs=s}}
 if(bd>PRNG[pl])return;/* no pipe in range: cooldown still runs, the ring only draws when something answers */
 const dp=(gy-bs.y)*(1+(Math.random()-.5)*.1*nf),dn=bd*(1+(Math.random()-.5)*.14*nf)+(Math.random()-.5)*.3*nf;
 addRing(px,pz,Math.sqrt(Math.max(.04,dn*dn-dp*dp)))}
Net.on(a=>{
 if(a.type==='find_pick'){const f=world.finds[a.n];if(!f||f.done)return;f.held=a.by;f.m.visible=false;if(a.by===ME){holdFind(a.n);toast(`${FIND[f.kind][2]} — ${f.pts} pts at the ${f.type==='trash'?'trashcan':'crate'}`)}return}
 if(a.type==='find_place'){const f=world.finds[a.n];f.held=0;f.out=1;f.x=a.x;f.z=a.z;f.y=world.floorAt(a.x,a.z,1)+f.sz;syncFind(f);if(a.by===ME&&carryF===a.n)clearCarryF();return}
 if(a.type==='find_deposit'){const f=world.finds[a.n];if(!f||f.done)return;f.done=1;f.held=0;f.m.visible=false;world.score+=f.pts;Prog.bank+=f.pts;hudPts();saveProg();if(a.by===ME){if(carryF===a.n)clearCarryF();toast(`+${f.pts}`);f.type==='trash'?clank():ping()}return}
 if(a.type==='rock_pick'){const q=rk[a.n];q.held=a.by;go.position.set(0,-50,0);go.scale.setScalar(0);go.updateMatrix();rocks.setMatrixAt(a.n,go.matrix);rocks.instanceMatrix.needsUpdate=true;
  if(a.by===ME){carry=a.n;carryM.scale.set(q.s*q.w,q.s,q.s*q.w);carryM.material.color.fromArray(rocks.instanceColor.array,a.n*3);toast(q.gem?`${GEM[q.gem][0]}! ${GEM[q.gem][1]} pts at the crate`:`Plain rock — ${ROCK_PTS} pt at the crate or the trashcan`)}}
 if(a.type==='rock_sell'){const q=rk[a.n];if(!q||q.held==='$')return;const pts=q.gem?GEM[q.gem][1]:ROCK_PTS;q.held='$';go.position.set(0,-50,0);go.scale.setScalar(0);go.updateMatrix();rocks.setMatrixAt(a.n,go.matrix);rocks.instanceMatrix.needsUpdate=true;world.score+=pts;Prog.bank+=pts;hudPts();saveProg();if(a.by===ME){if(carry===a.n)carry=-1;toast(q.gem?`${GEM[q.gem][0]} sold  +${pts}`:`Plain rock  +${pts}`);q.gem?ping():clank()}return}
 if(a.type==='scrap'){const s=world.sig[a.n];if(!s||s.kind==='burst'||!s.f||s.sold)return;s.sold=1;if(s.ms)s.ms.forEach(m=>m.visible=false);const pts=SCRAP[s.kind]||2;world.score+=pts;Prog.bank+=pts;hudPts();saveProg();if(a.by===ME){toast(`Scrapped  +${pts}`);clank()}return}
 if(a.type==='shutoff'){if(!world.exposed()||world.shut)return;world.shut=1;win();return}
 if(a.type==='rock_place'){const q=rk[a.n];q.held=0;q.x=a.x;q.z=a.z;q.y=world.floorAt(a.x,a.z,1)+q.s*.3;setRock(a.n);rocks.instanceMatrix.needsUpdate=true;if(a.by===ME&&carry===a.n)carry=-1;return}
 if(a.type==='buy'){const u=UPG[a.id],c=upCost(a.id);Prog.bank-=c;Prog.up[a.id]++;hudPts();saveProg();
  if(a.by===ME){ping();toast(`${u.n} upgraded to level ${Prog.up[a.id]}`)}else toast(`Team bought ${u.n} level ${Prog.up[a.id]}`);return}
 if(a.type==='lamp_place'){glPlace(a.i,a.x,a.z);if(a.by===ME){clank();toast(GS.every((q,i)=>q||i>=Prog.up.lamps)?'Light placed — E at the wall socket switches it on':'Light placed')}return}
 if(a.type==='lamp_pick'){glPick(a.i);if(a.by===ME)toast('Light picked up');return}
 if(a.type==='cable_cut'){const q=GS[a.i];if(!q||q.cut!=null)return;q.cut=Math.max(0,Math.min(1,a.t));glCable(a.i);zap(a.i);toast(a.by===ME?'Zzzt! Cable cut — aim at the break and press E to splice it':'A garden light cable was cut!');return}
 if(a.type==='cable_fix'){const q=GS[a.i];if(!q||q.cut==null)return;q.cut=null;glCable(a.i);if(a.by===ME)clank();toast(a.by===ME?'Cable spliced':'Cable repaired');return}
 if(a.type==='bank_add'){Prog.bank+=a.n;hudPts();saveProg();if(a.by===ME){ping();toast(`DEV: +${a.n} points`)}return}
 if(a.type==='lamp_power'){glOn=!!a.on;if(a.by===ME)ping();toast(glOn?'Garden lights on':'Garden lights off');return}
 if(a.type==='mower_grab'){mowerOwner=a.by;if(a.by===ME){mowerHeld=true;mowX=undefined;mh=yaw}return}
 if(a.type==='mower_drop'){mowerOwner=null;mowerTarget=null;mower.position.set(a.x,world.floorAt(a.x,a.z,a.fy!=null?a.fy:1),a.z);mower.rotation.y=a.ry;mowerOn=!!a.on;if(a.by===ME)mowerHeld=false;return}
 if(a.type==='mow'){if(a.by!==ME){let ch=0;for(const ci of a.cells)if(ci>=0&&ci<MG*MG&&!mown[ci]){mown[ci]=1;cutCell(ci);ch=1}if(ch)grass.instanceMatrix.needsUpdate=true}return}
 if(a.type==='win'){win();return}
 if(a.type==='new_yard'){const was=state!=='play';newGame(a.seed,a.size);state='play';$('hud').style.display='block';sh.visible=true;
  if(a.by!==ME&&was){if(fallback){paused=false;show(null)}else{paused=true;show('pause')}}return}
 if(a.type!=='dig')return;glDirty=true;world.apply(a);sync();clearGrass(a.x,a.z);settleRocks(a.x,a.z);settleFinds(a.x,a.z);if(a.by!==ME)Net.swing(a.by);sync();clearGrass(a.x,a.z);settleRocks(a.x,a.z);settleFinds(a.x,a.z);const y=world.hAt(a.x,a.z);
 for(let i=0;i<18;i++){const px2=a.x+(Math.random()-.5)*.6,pz2=a.z+(Math.random()-.5)*.6,q=digDepth(px2,pz2),dd=q.d-Math.random()*.2;
  spawn(new V3(px2,y+.1,pz2),new V3((Math.random()-.5)*3,2.5+Math.random()*3,(Math.random()-.5)*3),1.6,false,soilMat(dd<.05&&Math.random()<.4?-1:Math.max(0,dd),q.n))}
 if(a.by===ME)thud();if(state!=='play')return;
 for(const s of world.sig.slice(1))if(!s.f&&!world.solidAt(s.x,s.y,s.z)){s.f=1;toast(`That's ${KIND[s.kind]} — not the leak. Press E to scrap it for ${SCRAP[s.kind]} pts.`);nz('lowpass',500,.4,.9);grain(6,.15,'bandpass',2500,6000,.25)}
 if(world.exposed()&&!world.seenLeak){world.seenLeak=1;toast('The main is open. Aim at the leak and press E to shut the water off.')}});/* the round keeps going until someone shuts it off */
function win(){state='won';geyser=true;nz('bandpass',1800,2.5,.7);sweep('lowpass',400,80,2.5,.6);
 const m=Math.floor(elapsed/60),s=Math.floor(elapsed%60),ft=world.finds.filter(f=>f.done&&f.type==='trash').length,fa=world.finds.filter(f=>f.done&&f.type==='artifact').length;
 $('wt').textContent=`You shut off the burst main in ${world.digs} digs and ${m}:${String(s).padStart(2,'0')}. Water's off — the neighbours will never know. Finds: ${world.score} pts (${ft} trash, ${fa} artifacts).`;
 setTimeout(()=>{if(state==='won'){document.exitPointerLock?.();$('hud').style.display='none';show('win')}},2400)}

/* ---------- input ---------- */
function flashKey(){if(!Prog.up.lantern)toast('Buy a flashlight at the workbench');else{flashOn=!flashOn;toast(flashOn?'Flashlight on':'Flashlight off')}}
/* left click: use whatever the hotbar has in hand */
function useItem(){if(sel!==want)return;if(sel===0)tryDig();else if(sel===1)probe();else if(!handsBusy()){if(sel===2)flashKey();else if(sel===3)lampKey()}}
addEventListener('wheel',e=>{if(state!=='play'||paused||shopOpen)return;const d=e.deltaY>0?1:-1;let i=want;for(let k=0;k<HB.length;k++){i=(i+d+HB.length)%HB.length;if(HB[i].ok())break}hbSelect(i)},{passive:true});
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'&&state==='play')e.preventDefault();if(state==='intro'){state='menu';audio();show(menuScr());return}if(e.code==='KeyF')probe();if(e.code==='KeyE'&&!e.repeat)useE();
 if(state!=='play'||paused||e.repeat)return;
 if(e.code==='KeyL')flashKey();
 if(e.code==='Escape'&&shopOpen){setShop(false);return}
 if(!shopOpen&&/^(Digit|Numpad)[1-4]$/.test(e.code))hbSelect(+e.code.slice(-1)-1);
 if(e.code==='KeyG'&&state==='play'&&!paused)lampKey()});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('contextmenu',e=>e.preventDefault());
$('intro').addEventListener('click',()=>{if(state==='intro'){state='menu';audio();show(menuScr())}});
addEventListener('mousemove',e=>{if(state==='intro'||paused)return;if(locked||(fallback&&dragging)){yaw-=e.movementX*.0022;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*.0022));moved+=Math.abs(e.movementX)+Math.abs(e.movementY)}});
addEventListener('mousedown',e=>{if(e.target.closest('button,#shop')||state!=='play'||paused)return;if(e.button===2){probe();return}if(e.button!==0)return;if(mowerHeld){mowerOn=!mowerOn;return}holding=sel===0;heldT=0;autoDug=false;if(locked)useItem();else if(fallback){dragging=true;moved=0}});
addEventListener('mouseup',e=>{if(e.button!==0)return;if(dragging&&moved<6&&!autoDug)useItem();dragging=false;holding=false});
addEventListener('blur',()=>{holding=dragging=false});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===cv;if(!locked&&state==='play'&&!fallback&&!shopOpen){holding=false;paused=true;setShop(false);show('pause')}});
/* yard-size selector (menu, co-op lobby, win): one shared choice, remembered */
window.addPoints=n=>Net.send({type:'bank_add',n:n|0,by:ME});/* console only; the host accepts it on localhost or with ?dev */
window.setWeather=name=>{if(!DEV){console.warn('setWeather only works on localhost or with ?dev');return}const n=String(name||'auto').toLowerCase();
 if(n==='auto'||n==='cycle'){weatherHold=null;console.log('weather: auto');return}
 if(n==='clear'||n==='cloud'||n==='cloudy'||n==='rain'){weatherHold=n==='cloudy'?'cloud':n;console.log('weather: '+weatherHold);return}
 console.log('setWeather("clear" | "cloud" | "rain" | "auto")')};
const szBtns=[...document.querySelectorAll('.szsel button')],szShow=()=>szBtns.forEach(b=>b.classList.toggle('on',+b.dataset.s===wantSize));
szBtns.forEach(b=>b.onclick=()=>{wantSize=+b.dataset.s;try{localStorage.setItem('burstSize',wantSize)}catch(e){}szShow();
 if((state==='menu'||state==='intro')&&Net.mode==='solo'&&wantSize!==S)newGame(undefined,wantSize)/* the yard behind the menu follows the choice */});szShow();
$('bSolo').onclick=()=>startPlay();$('bHow').onclick=()=>{$('how').hidden=!$('how').hidden};
$('bRes').onclick=()=>{paused=false;show(null);lock()};
$('bNew3').onclick=()=>{if(Net.mode==='client')return;
 if(Net.mode==='host'){paused=false;show(null);Net.send({type:'new_yard',seed:rndSeed(),size:wantSize});if(!fallback)lock();return}
 if(state==='play'){paused=false;show(null);newGame(undefined,wantSize);if(!fallback)lock()}else startPlay()};
for(const id of['bMenu','bMenu2','bMenu3'])$(id).onclick=toMenu;

function moveBody(dt,K){
 const sp=(K.ShiftLeft?6.2:4.3)*BSPD[Prog.up.boots],f=(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0),s=(K.KeyD?1:0)-(K.KeyA?1:0);
 let x=px,y=py,z=pz;
 if(!world.room(x,y,z)){for(let i=1;i<=16;i++)if(world.room(x,y+i*.05,z)){y+=i*.05;pvy=0;break}}
 const ground=pvy<=0&&!world.room(x,y-.06,z);
 let wx=0,wz=0;if(f||s){const dx=-Math.sin(yaw)*f+Math.cos(yaw)*s,dz=-Math.cos(yaw)*f-Math.sin(yaw)*s,l=Math.hypot(dx,dz)||1;wx=dx/l*sp;wz=dz/l*sp}
 const ak=Math.min(1,dt*(ground?20:(f||s?6:1.5)));pvx+=(wx-pvx)*ak;pvz+=(wz-pvz)*ak;
 if(ground&&K.Space&&!shopOpen)pvy=8.6;else pvy=Math.max(-35,pvy-32*dt);
 const slide=(x,y,z,dx,dz)=>{let nx=x,nz=z;if(dx&&world.room(x+dx,y,z)&&free(x+dx,z))nx=x+dx;if(dz&&world.room(nx,y,z+dz)&&free(nx,z+dz))nz=z+dz;return{x:nx,y,z:nz}};
 const stepUp=(x,y,z,dx,dz)=>{const a=slide(x,y,z,dx,dz);if(!ground||(a.x===x+dx&&a.z===z+dz))return a;
  const STEP=.6;if(!world.room(x,y+STEP,z))return a;const b=slide(x,y+STEP,z,dx,dz);
  if(Math.hypot(b.x-x,b.z-z)<=Math.hypot(a.x-x,a.z-z)+1e-4)return a;
  let lo=y,hi=y+STEP;if(!world.room(b.x,y,b.z)){for(let k=0;k<8;k++){const m=(lo+hi)/2;if(world.room(b.x,m,b.z))hi=m;else lo=m}}else hi=y;
  return world.room(b.x,hi,b.z)?{x:b.x,y:hi,z:b.z}:a};
 let mx=pvx*dt,mz=pvz*dt;const n=Math.max(1,Math.ceil(Math.hypot(mx,mz)/.1));
 for(let i=0;i<n;i++){const m=stepUp(x,y,z,mx/n,mz/n);x=m.x;y=m.y;z=m.z}
 const ny=y+pvy*dt;
 if(pvy<0){if(world.room(x,ny,z))y=ny;else{let lo=ny,hi=y;for(let k=0;k<10;k++){const m=(lo+hi)/2;if(world.room(x,m,z))hi=m;else lo=m}y=hi;pvy=0}}
 else if(pvy>0){if(world.room(x,ny,z))y=ny;else{let lo=y,hi=ny;for(let k=0;k<10;k++){const m=(lo+hi)/2;if(world.room(x,m,z))lo=m;else hi=m}y=lo;pvy=0}}
 const h=world.room(x,y,z)||1.8,want=y+(h>=1.8?1.7:h-.12);
 px=x;py=y;pz=z;ey=want<ey?want:ey+(want-ey)*Math.min(1,dt*8)}
/* ---------- loop ---------- */
function play(dt){
 const K=keys,ox=px,oz=pz;
 if(!paused){moveBody(dt,K);
  if(state==='play')elapsed+=dt;stepD+=Math.hypot(px-ox,pz-oz);if(stepD>(K.ShiftLeft?2:1.5)){stepD=0;stepSnd()}}
 cam.position.set(px,ey,pz);cam.rotation.set(pitch,yaw,0);cam.updateMatrixWorld();
 const dir=new V3(0,0,-1).applyQuaternion(cam.quaternion);digDir.copy(dir);aim=null;
 const hit=rayVox(cam.position.x,cam.position.y,cam.position.z,dir.x,dir.y,dir.z,4.2);if(hit)aim=new V3(hit.x,hit.y,hit.z);
 cd-=dt;
 /* holding left mouse = keep digging at the tool's max rate (fallback drag mode: only while the cursor stays still) */
 if(holding&&sel===0&&want===0&&state==='play'&&!paused){heldT+=dt;if(locked)tryDig();else if(dragging&&moved<6&&heldT>.3){const c0=cd;tryDig();if(cd>c0)autoDug=true}}
 if(Net.mode!=='solo'||!paused)dayT=(dayT+dt/DAY_LEN)%1;/* co-op keeps running while one player is paused */
 const fl=Prog.up.lantern;flash.intensity+=((flashOn&&fl?2.6+1.1*(fl-1):0)-flash.intensity)*Math.min(1,dt*12);flash.angle=fl>1?.6:.45;flash.distance=fl>1?22:16;
 const nb=Math.hypot(px-BENCH[0],pz-BENCH[1]);if(shopOpen&&nb>3.8)setShop(false);
 const ns=Math.hypot(px-SOCK[0],pz-SOCK[1]);let hn='';
 if(lookingAtLeak()&&!handsBusy())hn='Press E — shut off the leak';
 else if(ns<2.6)hn=`Press E — lights ${glOn?'off':'on'}`;
 else if(nb<3.2)hn='Press E — workbench';
 if($('hint').textContent!==hn)$('hint').textContent=hn;
 $('hint').style.display=hn&&!shopOpen&&state==='play'&&!paused?'block':'none';lampTick(dt);
 pc=Math.max(0,pc-dt);swing=Math.max(0,swing-dt*1.5);const sw=Math.sin((1-swing)*Math.PI)*(swing>0?1:0);
 if(sel!==want){swapK=Math.min(1,swapK+dt*7);if(swapK>=1)sel=want}else swapK=Math.max(0,swapK-dt*7);
 const empty=!handsBusy(),swo=swapK*.6,bob=Math.sin(T*1.7)*.004;pa=Math.max(0,pa-dt*1.5);
 sh.visible=empty&&sel===0;sh.position.set(.45,-.62-sw*.08+bob-swo,-.3-sw*.12);sh.rotation.set(-sw*.7,sw*.1,sw*.05);
 hp.visible=empty&&sel===1;if(hp.visible){const d=Math.sin(pa*Math.PI);hp.position.set(.3,-.18+bob-d*.28-swo,-.55-d*.1);hp.rotation.set(.3,-.12,.1)}
 hf.visible=empty&&sel===2;if(hf.visible){hfLens.color.setRGB(...(flashOn&&Prog.up.lantern?[4,3.6,2.8]:[.25,.25,.25]));hf.position.set(.3,-.3+bob-swo,-.42);hf.rotation.set(.04,-.12,0)}
 hl.visible=empty&&sel===3;if(hl.visible){hl.position.set(.28,-.33+bob-swo,-.5);hl.rotation.set(.12,-.2,.04)}
 /* mower: pushed 1.2 m ahead while held, otherwise it rests on the ground; the engine cuts grass and throws clippings */
 if(mowerHeld){/* the deck is heavy: it follows your view at a limited turn rate, so whipping the mouse around doesn't sweep it across the lawn */
  let d=yaw-mh;d-=Math.round(d/6.2832)*6.2832;mh+=Math.max(-MTURN*dt,Math.min(MTURN*dt,d));
  const fx=-Math.sin(mh),fz=-Math.cos(mh),mx=px+fx*1.6,mz=pz+fz*1.6;mower.position.set(mx,world.floorAt(mx,mz,py),mz);mower.rotation.y=mh+Math.PI}
 else{if(mowerOwner&&mowerTarget){/* someone else is pushing it: glide to their last reported spot */
   const k=Math.min(1,dt*12),m=mower.position;m.x+=(mowerTarget.x-m.x)*k;m.z+=(mowerTarget.z-m.z)*k;let d=mowerTarget.ry-mower.rotation.y;d-=Math.round(d/6.2832)*6.2832;mower.rotation.y+=d*k}
  mower.position.y+=(world.floorAt(mower.position.x,mower.position.z,mower.position.y+.2)-mower.position.y)*Math.min(1,dt*10)}
 if(mowerOn){const mx=mower.position.x,mz=mower.position.z;
 if(mowerHeld){/* only the owner cuts; everyone else gets the cut cells from the host */
  if(mowX===undefined){mowX=mx;mowZ=mz}const steps=Math.max(1,Math.ceil(Math.hypot(mx-mowX,mz-mowZ)/.25));
  for(let s=1;s<=steps;s++)mowAt(mowX+(mx-mowX)*s/steps,mowZ+(mz-mowZ)*s/steps,MRAD[Prog.up.mower]);mowX=mx;mowZ=mz}
 mower.wheels.forEach(w=>w.rotation.x+=dt*18);
  if(Math.random()<.6)spawn(mower.position.clone().add(new V3((Math.random()-.5)*.6,.3,(Math.random()-.5)*.6)),new V3((Math.random()-.5)*1.2,1+Math.random(),(Math.random()-.5)*1.2),.6,false,soilMat(-1,0),.2+Math.random()*.15)}
 if(AC&&clipM){const on=mowerOn&&state==='play'&&!paused,att=mowerHeld?1:Math.max(.12,1-Math.hypot(px-mower.position.x,pz-mower.position.z)/18);clipM.gain.gain.setTargetAtTime(on?.05*att:0,AC.currentTime,.15);clipM.blade.gain.setTargetAtTime(on?.012*att:0,AC.currentTime,.15)}
 /* carried rock sits in the hands */
 if(carry>=0){carryM.visible=true;carryM.position.set(.35,-.35,-.7);carryM.rotation.set(rk[carry].a,rk[carry].b+T*.4,rk[carry].c)}else carryM.visible=false;
 if(carryFM){carryFM.position.set(.32,-.36,-.78);carryFM.rotation.set(.45,T*.6,.2)}
 $('cdf').style.height=(pc>0?pc/pcMax*100:0)+'%';
 const hd=Math.hypot(px-world.burst.x,world.hAt(px,pz)-world.burst.y,pz-world.burst.z);
 if(AC&&hissG)hissG.gain.setTargetAtTime(state==='play'&&!paused&&hd<3?Math.pow(1-hd/3,2)*.16:0,AC.currentTime,.15);
 if(AC&&rainSnd)rainSnd.gain.setTargetAtTime(rainAmt*(ey<-1?.015:.06)*(state==='play'&&!paused?1:.3),AC.currentTime,.4);
 hudT-=dt;if(hudT<=0){hudT=.25;$('tm').textContent=Math.floor(elapsed/60)+':'+String(Math.floor(elapsed%60)).padStart(2,'0');const hh=dayT*24;$('cl').textContent=String(Math.floor(hh)).padStart(2,'0')+':'+String(Math.floor(hh%1*60)).padStart(2,'0')+(dayF<.45?' ☾':' ☀')+(rainAmt>.4?' rain':cloudAmt>.5?' cloudy':'')}
 if(toastT>0&&(toastT-=dt)<=0)$('toast').style.opacity=0;
}
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
 if(state==='play'||state==='won'){play(dt);Net.tick(dt)}
 else{const a=Math.sin(T*.12)*.9;cam.position.set(Math.sin(a)*(YH+7),6.5+DEL*.5,Math.cos(a)*(YH+7));cam.lookAt(0,0,0)}
 for(let i=rings.length-1;i>=0;i--){const q=rings[i];q.t=Math.min(1,q.t+dt/.9);q.age=(q.age||0)+dt;q.m.scale.setScalar(Math.max(.01,q.r*(1-Math.pow(1-q.t,3))));q.m.material.opacity=Math.max(0,Math.min(1,(12-q.age)/4))*.6;if(q.age>12){scene.remove(q.m);rings.splice(i,1)}}
 if(geyser)for(let k=0;k<4;k++)spawn(new V3(world.burst.x,world.burst.y+.15,world.burst.z),new V3((Math.random()-.5)*1.4,5+Math.random()*3,(Math.random()-.5)*1.4),1.5,true);
 if(world)stepParts(dt);GU.uT.value=T;applyDay();stepRain(dt);fxRender()}
newGame();requestAnimationFrame(loop);
