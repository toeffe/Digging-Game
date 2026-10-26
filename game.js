/* ARCHITECTURE: World = seeded deterministic state, mutated only by apply(action). Net (net.js) validates, stamps and broadcasts
   actions: solo applies them locally, co-op routes them through the host. `ME` is this player's id. */
const $=id=>document.getElementById(id),V3=THREE.Vector3;
let N=100,S=20,YH=10,DEL=0,MG=40;/* yard side S (m) and half YH; N = cells per side (cell C = .2 m); MG = mow grid; DEL = how far the house and neighbours sit beyond the 20 m layout. All set by layout() */
const C=.2,SIZES=[20,28,36,44,60],STONE=3.5,KIND={tank:'a buried septic tank',iron:'an old cast-iron pipe',gas:'a gas line — careful!',well:'an old well ring'};/* column depth is 12 m, or 20 m on Super Size. Stone is the grey shelf at STONE metres and deeper */
let BED=-12,VL=60;const stoneL=L=>L>0&&(VL-1-L)*C>=STONE;
/* finds: where it goes, points, name, rarity tier (index into TIER), half-height (origin at the mesh centre) */
const FIND={can:['trash',5,'Tin can',0,.08],bottle:['trash',5,'Glass bottle',0,.09],boot:['trash',10,'Old boot',0,.06],key:['trash',20,'Rusty key',1,.008],toycar:['trash',30,'Toy car',1,.036],
 penny:['artifact',30,'Copper penny',0,.006],arrow:['artifact',50,'Arrowhead',0,.04],coin:['artifact',80,'Silver coin',1,.009],pot:['artifact',100,'Clay pot',1,.07],fossil:['artifact',110,'Ammonite fossil',1,.026],
 doubloon:['artifact',160,'Gold doubloon',2,.012],watch:['artifact',180,'Pocket watch',2,.01],ring:['artifact',220,'Signet ring',2,.01],idol:['artifact',400,'Golden idol',3,.09]},FKEY=Object.keys(FIND),findName=k=>FIND[k][2];
const TIER=[['Common','#d8d2c6',[1.6,1.5,1.3]],['Rare','#5fb4ff',[.5,1.2,3]],['Epic','#c77dff',[1.9,.7,3]],['Legendary','#ffc23a',[3,2.1,.6]]];/* name, CSS colour, over-bright glow colour */
const GEM=[null,['Quartz',25,[1.7,1.55,1.9],0],['Amethyst',60,[1.5,.45,2.4],1],['Emerald',120,[.3,2.1,.95],2],['Diamond',300,[2.4,2.7,3.2],3]],GEM_RATE=.07,ROCK_PTS=1;/* name, crate value, over-bright colour, tier; share of rocks that are gems. A plain rock is worth ROCK_PTS */
const BIN=[-9,3],CRATE=[9,4],BENCH=[-1.75,-9.5],BENCH0=[-1.75,-9.5],PUMP0=[-4.55,-9.55],PUMPP=[-4.55,-9.55],MOWS=[2.4,-7.4],TREES=[],PROT=[];/* BENCH0 / PUMP0 = in the house's own frame; MOWS = mower parking spot */
const TREE0=[[-8,-6,1.4],[8.3,-4,1.1],[-7.6,6.5,1.2],[-4,-7.5,1.2],[5,7.5,1.3],[.5,3,1],[-6,1.5,1.1],[3,-8,1.2],[7,.5,1]];/* x, z, scale at the 20 m size (first 3 always, more as the yard grows) */
let yardSeed=1;
function layout(s,seed){if(seed!=null)yardSeed=seed>>>0;BED=s>=60?-20:-12;VL=s>=60?100:60;S=s;N=s*5;YH=s/2;DEL=YH-10;MG=s*2;const k=YH/10;
 BIN[0]=-(YH-1);BIN[1]=3*k;CRATE[0]=YH-1;CRATE[1]=4*k;BENCH[0]=BENCH0[0];BENCH[1]=BENCH0[1]-DEL;SOCK[1]=SOCK0[1]-DEL;PUMPP[0]=PUMP0[0];PUMPP[1]=PUMP0[1]-DEL;MOWS[1]=-7.4-DEL;
 TREES.length=0;const tr=rng((yardSeed^0x51ed)>>>0),base=TREE0.slice(0,Math.min(TREE0.length,3+Math.round((s-20)/16*6)));
 base.forEach(([x,z,t])=>TREES.push([x*k,z*k,t,tr()*4|0]));
 const cap=Math.min(16,base.length+Math.max(0,Math.round((s-20)/8)));let guard=0;
 while(TREES.length<cap&&guard++<80){const x=(tr()-.5)*(s-8),z=(tr()-.5)*(s-8);if(Math.abs(x)<8&&z<-(s/2-6))continue;if(TREES.some(t=>Math.hypot(t[0]-x,t[1]-z)<5))continue;TREES.push([x,z,.85+tr()*.55,tr()*4|0])}
 HFP=HFP0.map((a,i)=>[a[0]+HOFF[i][0]*DEL,a[1]+HOFF[i][1]*DEL,a[2],a[3],a[4]]);
 PROT.length=0;TREES.forEach(([x,z,t])=>PROT.push([x,z,.78*t]));PROT.push([BIN[0],BIN[1],.6],[CRATE[0],CRATE[1],.9],[BENCH[0],BENCH[1],.9],[PUMPP[0],PUMPP[1],.5])}/* x, z, protect radius for trees, bin, crate, workbench, pump */
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* ---------- progression: a points bank + team upgrades (survive "New yard"; solo saves them to localStorage) ---------- */
const UPG={shovel:{n:'Shovel',max:3,cost:[120,200,300],d:'Deeper, wider digs in dirt. Stops at stone'},probe:{n:'Probe',max:2,cost:[100,180],d:'Longer range, faster recharge, less noise'},lantern:{n:'Flashlight',max:2,cost:[80,160],d:'Lets you dig at night (L). Lv2: brighter'},mower:{n:'Mower',max:2,cost:[60,120],d:'Wider mowing strip: 0.6 → 1.3 → 2 m'},boots:{n:'Boots',max:2,cost:[60,120],d:'Walk and sprint faster'},lamps:{n:'Garden lights',max:4,cost:[70,90,110,130],d:'One more lamp on a cable from the wall socket (G to place)'},pump:{n:'Pump',max:2,cost:[90,160],d:'Slows the rise. E at the pump by the house drains the holes'},pick:{n:'Pickaxe',max:3,cost:[150,240,360],d:'Breaks stone. Each level digs wider'},ladders:{n:'Ladder',max:4,cost:[40,40,50,50],d:'A 5 m ladder. Press T to place or pick one up. W climbs, S climbs down'}},UKEY=Object.keys(UPG),
 PCD=[2.5,2,1.5],PRNG=[13,17,22],MRAD=[.3,.65,1],BSPD=[1,1.15,1.3],PUMP=[0,.3,.55],PUMP_DRAIN=[0,1.8,2.8];/* per-level probe recharge, probe range, mower radius, walk speed, flood slow-down, active drain vs the base rise */
/* flood: the leak fills the ground from the bedrock up. Minutes to reach FLOOD_TOP per yard size (solo is slower — one person doing all the work); the level eases in (progress squared) */
const FLOOD_MIN={20:12,28:15,36:18,44:21,60:24},FLOOD_SOLO=1.75,FLOOD_TOP=-.4;
const freshProg=()=>({bank:80,up:{shovel:0,probe:0,lantern:0,mower:0,boots:0,lamps:0,pump:0,pick:0,ladders:0}}),upCost=id=>{const l=Prog.up[id];return l<UPG[id].max?UPG[id].cost[l]:Infinity};
let Prog=freshProg(),shopOpen=false,taskOpen=false,pcMax=2.5,flashOn=false;
function saveProg(){}/* nothing is kept between yards any more; hook left in place for the callers */
function renderShop(){$('shopList').innerHTML=UKEY.map(id=>{const u=UPG[id],l=Prog.up[id],mx=l>=u.max,c=upCost(id);return`<li data-id="${id}" class="${mx?'mx':c>Prog.bank?'no':''}">${u.n} <i>Lv ${l}/${u.max}</i><span>${mx?'MAX':c}</span><small>${u.d}</small></li>`}).join('');$('shopBank').textContent=Prog.bank}
let relock=false,ptrHeld=false,taskRelock=false;/* Esc drops pointer lock on its own, and a task can finish during a drag, so the re-lock waits for the key or the button to come up */
function armLock(){if(keys.Escape)relock=true;else lock()}
function setShop(v){const was=shopOpen;shopOpen=v;$('shop').style.display=v?'block':'none';$('cross').style.visibility=v?'hidden':'visible';
 if(v){renderShop();if(document.pointerLockElement===cv)document.exitPointerLock()}
 else if(was&&state==='play'&&!paused&&!fallback)armLock()}
$('shopList').addEventListener('click',e=>{const li=e.target.closest('li');if(!li||!shopOpen)return;const id=li.dataset.id,c=upCost(id);if(c===Infinity)toast(`${UPG[id].n} is maxed out`);else if(c>Prog.bank)toast(`Need ${c} points for ${UPG[id].n}`);else Net.send({type:'buy',id,by:ME})});
function toolScale(){if(shBlade)shBlade.scale.setScalar(1+.08*(Prog.up.shovel|0));if(pkHead)pkHead.scale.setScalar(1+.08*Math.max(0,(Prog.up.pick|0)-1))}
function hudPts(){$('sc').textContent=Prog.bank;if(shopOpen)renderShop();hbShow();toolScale()}
class World{
 constructor(seed){this.seed=seed;const r=rng(seed),n=(N+1)**2,p=[r()*6,r()*6,r()*6];
  this.H=new Float32Array(n);this.B=new Float32Array(n);this.D=new Uint8Array(n);this.PW=new Float32Array(n).fill(1);this.digs=0;this.log=[];this.flood=0;/* flood progress 0..1, see FLOOD_MIN */
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const x=i*C-S/2,z=j*C-S/2,k=j*(N+1)+i,e=Math.min(i,j,N-i,N-j)*C,f=Math.min(1,e/2.5);
   /* base relief fades to exactly 0 at the border so it meets the flat outer ground with no gap */
   this.H[k]=this.B[k]=(.12*Math.sin(x*.35+p[0])*Math.cos(z*.3+p[1])+.05*Math.sin(x*.9+z*.7+p[2]))*f*f*(3-2*f);
   /* roots hold the soil under trees, the bin and the crate: dig weight ramps 0 -> 1 from .7r to 1.2r around each */
   for(const[ox,oz,or]of PROT){const t=Math.min(1,Math.max(0,(Math.hypot(x-ox,z-oz)/or-.7)/.5));this.PW[k]=Math.min(this.PW[k],t*t*(3-2*t))}}
  /* solid cubes from the bedrock up to y=0. Digging clears individual blocks, so a hole keeps its walls. */
  this.vox=new Uint8Array(N*N*VL);this.vox.fill(1);this.dirty=null;
  this.sig=[];const top={burst:.16,tank:.55,iron:.17,gas:.13,well:.5};
  const place=(kind,y)=>{let x,z,t=0;do{x=(r()-.5)*(S-5);z=(r()-.5)*(S-5)}while(t++<80&&this.sig.some(s=>Math.hypot(s.x-x,s.z-z)<5));  this.sig.push({kind,x,y:Math.max(BED+1.2,y),z,top:top[kind],f:0,rep:0,on:0,a:r()*3.14})};
  /* Extra Large and Super keep the same column the small yards use, only taller, so the five breaks use that whole depth */
  if(S>=44){const bot=-BED-1.2,yAt=(a,b)=>-(3.8+(bot-3.8)*(a+r()*(b-a)));
   place('burst',yAt(.6,1));place('tank',yAt(.15,.8));place('iron',yAt(.1,.75));place('gas',yAt(.05,.7));place('well',yAt(.35,.95))}
  else{place('burst',-8.8-r()*1.1);place('tank',-6.2-r()*2.2);place('iron',-5-r()*2.4);place('gas',-4.2-r()*2);place('well',-7.2-r()*1.8)}
  const b=this.sig[0],a=b.a;this.burst=new V3(b.x,b.y,b.z);
  this.curve=new THREE.CatmullRomCurve3([-6,-2.5,0,2.5,6].map(s=>new V3(b.x+Math.cos(a)*s,b.y+s*.02,b.z+Math.sin(a)*s)));this.bt=.5;
  /* trash is a few metres down, artifacts and the mains sit much deeper in the 12 m of dirt */
  this.score=0;this.finds=[];
  const spot=()=>{let x,z,t=0;do{x=(r()-.5)*(S-3.6);z=(r()-.5)*(S-3.6)}while(++t<80&&(PROT.some(([ox,oz,or])=>Math.hypot(x-ox,z-oz)<or+1.15)||this.finds.some(q=>Math.hypot(q.x-x,q.z-z)<1.35)||this.sig.some(s=>Math.hypot(s.x-x,s.z-z)<1.5)||Math.hypot(x-MOWS[0],z-MOWS[1])<1.7||Math.hypot(x-BENCH[0],z-BENCH[1])<1.9));return[x,z]};
  /* rarity is rolled from the seed (co-op matches) and the odds improve with depth t (0 top of the band, 1 bottom) */
  const roll=(type,t)=>{const w=type==='trash'?[1,.14+.12*t,0,0]:[1-.55*t,.45+.25*t,.1+.22*t,.012+.05*t];let u=r()*(w[0]+w[1]+w[2]+w[3]),tier=0;for(;tier<3;tier++){u-=w[tier];if(u<=0)break}
   const ks=FKEY.filter(k=>FIND[k][0]===type&&FIND[k][3]===tier);return ks[r()*ks.length|0]};
  const bury=(type,d0,d1)=>{const[x,z]=spot(),t=r(),kind=roll(type,t),[,pts,,tier,sz]=FIND[kind];this.finds.push({kind,type,pts,tier,sz,x,y:this.hAt(x,z)-(d0+t*(d1-d0)),z,a:r()*6.283,held:0,done:0,out:0})};
  /* loot scales with yard area; tune here */
  const TRASH_PER_M2=1/12,ART_PER_M2=1/40,nT=Math.round(S*S*TRASH_PER_M2),nA=Math.round(S*S*ART_PER_M2);
  for(let i=0;i<nT;i++)bury('trash',.8,3.5);
  for(let i=0;i<nA;i++)bury('artifact',3.5,S>=44?Math.max(8.5,-BED-1.2):8.5)}
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
 apply(a){if(a.type!=='dig')return;const{x,z}=a,dev=!!(a.dv&&DEV),pick=dev||!!(a.pk&&Prog.up.pick>0),lv=dev?0:pick?Prog.up.pick-1:Prog.up.shovel,R=dev?2.4:.62+.12*lv,steps=dev?8:2+lv,W=this,vol=N*N;
  let dx=a.dx,dy=a.dy,dz=a.dz,len=Math.hypot(dx,dy,dz);if(!isFinite(dx)||len<.01){dx=0;dy=-1;dz=0;len=1}dx/=len;dy/=len;dz/=len;
  const y0=isFinite(a.y)?a.y:W.hAt(x,z)-.01;if(!W.dirty)W.dirty=new Set();
  let cut=0,stone=0;
  /* a short capsule along the look direction. The shovel skips stone. A bought pick breaks stone, and each level widens the bite one step behind the shovel */
  for(let s=0;s<steps;s++){const px=x+dx*(s+.35)*C,py=y0+dy*(s+.35)*C,pz=z+dz*(s+.35)*C;
   const i0=Math.max(3,((px-R+S/2)/C)|0),i1=Math.min(N-4,((px+R+S/2)/C)|0),j0=Math.max(3,((pz-R+S/2)/C)|0),j1=Math.min(N-4,((pz+R+S/2)/C)|0);
   const L0=Math.max(1,((py-R-BED)/C)|0),L1=Math.min(VL-1,((py+R-BED)/C)|0);/* layer 0 and a 3-block rim stay, so the pit has a floor and walls */
   for(let L=L0;L<=L1;L++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){if(W.PW[j*(N+1)+i]<.25)continue;
    const cx=(i+.5)*C-S/2,cy=BED+(L+.5)*C,cz=(j+.5)*C-S/2;if(Math.hypot(cx-px,cy-py,cz-pz)>R)continue;
    const idx=L*vol+j*N+i;if(!W.vox[idx])continue;
    if(!pick&&stoneL(L)){stone=1;continue}
    W.vox[idx]=0;W.D[j*(N+1)+i]=1;W.mark(i,j);cut++}}
  a.cut=cut;a.stone=stone;if(!cut)return;
  /* once the gas line has been uncovered, a blade that comes within reach of it strikes it (gasAt = where) */
  const gs=W.sig.find(q=>q.kind==='gas');
  if(gs&&gs.f&&!W.gasAt){const ax=Math.cos(gs.a),az=-Math.sin(gs.a);for(let s=0;s<steps;s++){const px=x+dx*(s+.35)*C,py=y0+dy*(s+.35)*C,pz=z+dz*(s+.35)*C,t=Math.max(-1.6,Math.min(1.6,(px-gs.x)*ax+(pz-gs.z)*az)),qx=gs.x+ax*t,qz=gs.z+az*t;
   if(Math.hypot(px-qx,py-gs.y,pz-qz)<.13+R*.55){W.gasAt=[qx,gs.y,qz];break}}}
  W.digs++;W.log.push(x,z)}
 mark(i,j){for(const[di,dj]of[[0,0],[-1,0],[1,0],[0,-1],[0,1]]){const ni=i+di,nj=j+dj;if(ni>=0&&nj>=0&&ni<N&&nj<N)this.dirty.add((ni>>4)+((nj>>4)<<8))}}
 exposed(){let c=0;for(let t=-.02;t<=.021;t+=.02){const p=this.curve.getPoint(this.bt+t);if(!this.solidAt(p.x,p.y,p.z))c++}return c>=2}
 /* a buried thing counts once the soil over it is gone. The main uses the open stretch of pipe; the others use their centre */
 found(s){return s.kind==='burst'?this.exposed():!!s.f}
 sigOpen(s){return s.kind==='burst'?this.exposed():!!s.f}
 foundN(){return this.sig.reduce((n,s)=>n+(this.found(s)?1:0),0)}
 foundAll(){return this.sig.every(s=>this.found(s))}
 /* cave-in rule: a block with air under it holds only if a block with soil under it is within 3 steps sideways (through solid blocks of the same layer).
    Unsupported blocks drop to the floor of their column, repeated until nothing more falls. go=false only counts. Same result on every client. */
 cave(x,z,go){const W=this,v=W.vox,vol=N*N,RC=11,ci=Math.round((x+S/2)/C),cj=Math.round((z+S/2)/C),i0=Math.max(3,ci-RC),i1=Math.min(N-4,ci+RC),j0=Math.max(3,cj-RC),j1=Math.min(N-4,cj+RC),Q=[],seen=new Set();
  const held=(i,j,L)=>{Q.length=0;seen.clear();Q.push(i,j,0);seen.add(j*N+i);
   for(let h=0;h<Q.length;h+=3){const a=Q[h],b=Q[h+1],d=Q[h+2],k=L*vol+b*N+a;if(v[k-vol])return true;if(d>=3)continue;
    for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const na=a+di,nb=b+dj,key=nb*N+na;if(na<0||nb<0||na>=N||nb>=N||seen.has(key)||!v[L*vol+key])continue;seen.add(key);Q.push(na,nb,d+1)}}return false};
  let tot=0;if(!W.dirty)W.dirty=new Set();
  for(let pass=0;pass<8;pass++){const fall=[];
   for(let L=1;L<VL;L++)for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const k=L*vol+j*N+i;if(v[k]&&!v[k-vol]&&!held(i,j,L))fall.push(k)}
   if(!fall.length)break;tot+=fall.length;if(!go)return tot;
   for(const k of fall){if(!v[k])continue;const L=k/vol|0,c=k-L*vol;let m=L-1;while(m>=0&&!v[m*vol+c])m--;v[k]=0;v[(m+1)*vol+c]=1;const i=c%N,j=c/N|0;W.D[j*(N+1)+i]=1;W.mark(i,j)}}
  return tot}
}
/* ---------- renderer: gamma-correct, filmic, PBR ---------- */
const cv=$('c'),R=new THREE.WebGLRenderer({canvas:cv,antialias:true});
R.setPixelRatio(1);R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
const scene=new THREE.Scene();scene.fog=new THREE.Fog(lin(0xcfe0e8),35,150);
const cam=new THREE.PerspectiveCamera(70,1,.02,300);cam.rotation.order='YXZ';scene.add(cam);
const VM=new THREE.Group();cam.add(VM);/* viewmodel: everything held in the hands, swayed and bobbed as one */
/* flashlight: a shadowless spot riding on the camera. Always in the scene (intensity 0 when off) so toggling never recompiles materials */
const flash=new THREE.SpotLight(lin(0xfff0d0),0,16,.45,.7,1.2),flashT=new THREE.Object3D();flash.position.set(.12,-.1,0);flashT.position.set(0,0,-6);cam.add(flash,flashT);flash.target=flashT;
const PRL=[1.5,1.25,1,.85];let prI=0,prCap=1.5,ftAcc=0,ftN=0,prHold=0,prWarm=4;/* dynamic resolution: step prCap down if frames stay over 20 ms */
function resize(){const pr=Math.min(devicePixelRatio,prCap),w=Math.round(innerWidth*pr),h=Math.round(innerHeight*pr);R.setSize(w,h,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();if(window.fxResize)fxResize(w,h)}addEventListener('resize',resize);resize();
function dynRes(dt){if((prWarm-=dt)>0)return;ftAcc+=dt;ftN++;if((prHold+=dt)<2)return;const avg=ftAcc/ftN;ftAcc=ftN=0;prHold=0;let i=prI;if(avg>.02&&i<3)i++;else if(avg<.014&&i>0)i--;if(i!==prI){prI=i;prCap=PRL[i];resize()}}
const hemi=new THREE.HemisphereLight(lin(0xbcd6ff),lin(0x5a4630),.7);scene.add(hemi);
const sun=new THREE.DirectionalLight(lin(0xfff1d6),1.8);sun.position.set(-16,9,-6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
const sc=sun.shadow.camera;let SH_R=12;sc.left=sc.bottom=-SH_R;sc.right=sc.top=SH_R;sc.far=50;sun.shadow.bias=-.0004;sun.shadow.normalBias=.05;scene.add(sun,sun.target);
/* baked neighbourhood shadows: a second sun covering houses, fences and trees. Updated only when the sun moves, not every frame */
const bake=new THREE.DirectionalLight(lin(0xfff1d6),0);bake.castShadow=true;bake.shadow.mapSize.set(2048,2048);
const bc=bake.shadow.camera;bc.left=bc.bottom=-60;bc.right=bc.top=60;bc.near=2;bc.far=140;bake.shadow.bias=-.0006;bake.shadow.normalBias=.1;bake.shadow.autoUpdate=false;scene.add(bake,bake.target);
const bakeDir=new V3();let bakeNeed=true,skyMat,overMat,skyMesh,overMesh;
const shScale=()=>[0,.55,1,1.5][SET.sh];
function applyShadows(){const on=SET.sh>0,k=on?shScale():1;sun.castShadow=bake.castShadow=on;SH_R=12*k;
 sc.left=sc.bottom=-SH_R;sc.right=sc.top=SH_R;sc.updateProjectionMatrix();fitBake()}
function fitBake(){const k=SET.sh?shScale():1,r=(60+DEL)*k;bc.left=bc.bottom=-r;bc.right=bc.top=r;bc.far=Math.max(140,r*2.2);bc.updateProjectionMatrix();bakeNeed=true}
function cvTex(w,h,fn,rx=1,ry=1){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
{/* sky dome with soft clouds */
 const t=cvTex(1024,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#2f6bc0');g.addColorStop(.45,'#86b6e6');g.addColorStop(.5,'#d3e4ee');g.addColorStop(1,'#d9e6e0');x.fillStyle=g;x.fillRect(0,0,w,h);x.filter='blur(7px)';
  /* each puff is drawn at -w, 0 and +w so clouds wrap around the left/right texture edge (no visible seam) */
  for(let i=0;i<45;i++){const px=Math.random()*w,py=110+Math.random()*120;for(let k=0;k<7;k++){const ey=py+Math.random()*12,rx=40+Math.random()*34,ry=10+Math.random()*9;x.fillStyle='rgba(255,255,255,.2)';for(const o of[-w,0,w]){x.beginPath();x.ellipse(px+k*26-78+o,ey,rx,ry,0,0,6.3);x.fill()}}}});
 t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;t.anisotropy=1;/* no mip selection across the u=0/1 wrap, which draws a thin line */
 skyMat=new THREE.MeshBasicMaterial({map:t,side:THREE.BackSide,fog:false,toneMapped:false,depthWrite:false});skyMesh=new THREE.Mesh(new THREE.SphereGeometry(200,32,16),skyMat);scene.add(skyMesh);
 const ot=cvTex(1024,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#2c3540');g.addColorStop(.4,'#5c6772');g.addColorStop(.58,'#8a929a');g.addColorStop(1,'#b7c0c6');x.fillStyle=g;x.fillRect(0,0,w,h);x.filter='blur(6px)';
  for(let i=0;i<70;i++){const px=Math.random()*w,py=30+Math.random()*h*.62,rx=70+Math.random()*140,ry=16+Math.random()*28;x.fillStyle=`rgba(28,34,42,${.18+Math.random()*.28})`;for(const o of[-w,0,w]){x.beginPath();x.ellipse(px+o,py,rx,ry,0,0,6.3);x.fill()}}});
 ot.generateMipmaps=false;ot.minFilter=THREE.LinearFilter;ot.anisotropy=1;
 overMat=new THREE.MeshBasicMaterial({map:ot,side:THREE.BackSide,fog:false,toneMapped:false,transparent:true,opacity:0,depthWrite:false});
 overMesh=new THREE.Mesh(new THREE.SphereGeometry(196,32,16),overMat);overMesh.renderOrder=1;scene.add(overMesh)}

/* ---------- materials & scenery ---------- */
const mat=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:lin(c),roughness:.9,metalness:0},o)),obst=[],GLASS=[],LAMPS=[];/* window glass + street-lamp bulb materials, driven by applyDay */
const pumpLed=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.05,.04)});/* pump status LED; colour is driven in floodTick */
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
 const PINE_MAT=mat(0x234e28,{roughness:.9}),BIRCH_LEAF=mat(0x9dcc78,{roughness:.9}),SNAG_MAT=mat(0x6a5648,{roughness:1});
function yardPine(x,z,s){cyl(.14*s,.26*s,1.5*s,0x4a3424,x,.75*s,z);const m=new THREE.Mesh(pineG,PINE_MAT);m.position.set(x,0,z);m.scale.setScalar(.36*s);m.castShadow=m.receiveShadow=true;PARENT.add(m)}
function birchTree(x,z,s){cyl(.1*s,.16*s,2.4*s,0xe6e1d4,x,1.2*s,z);const m=new THREE.Mesh(leafG,BIRCH_LEAF);m.position.set(x,2.7*s,z);m.scale.setScalar(.85*s);m.castShadow=m.receiveShadow=true;PARENT.add(m)}
function snagTree(x,z,s){cyl(.16*s,.28*s,2.1*s,0x6a5648,x,1.05*s,z);const g=new THREE.CylinderGeometry(.04*s,.08*s,.9*s,6);g.translate(0,.45*s,0);const m=new THREE.Mesh(g,SNAG_MAT),dir=new V3(.75,.4,.15).normalize();m.quaternion.setFromUnitVectors(new V3(0,1,0),dir);m.position.set(x,1.55*s,z);m.castShadow=m.receiveShadow=true;PARENT.add(m)}
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
const supplyLever=[],supplyLed=[];
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
 /* sump pump on the left of the bench: E toggles drain once you've bought the upgrade */
 const[px0,pz0]=PUMP0,yel={roughness:.45,metalness:.3},stl={roughness:.4,metalness:.6};
 box(.34,.3,.3,0xf0b400,px0,.32,pz0,yel);box(.36,.04,.32,0x2a2d31,px0,.48,pz0,stl);
 cyl(.05,.05,.08,0x2a2d31,px0,.56,pz0,stl);cyl(.035,.035,.18,0x8a8f94,px0+.16,.22,pz0+.02,stl).rotation.z=1.15;
 box(.22,.03,.16,0x3a3f44,px0,.03,pz0+.22,stl);
 const pLed=new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),pumpLed);pLed.position.set(px0+.12,.5,pz0+.12);PARENT.add(pLed);
 /* supply panel on the open wall between the door and the right window. Each row is named, with a lever and a lamp: red until repaired, amber when ready, green when on */
 const SUPC=[0x3a7bd5,0x8a5a3a,0x9aa0a6,0xd8b42a,0xb7b2a8],SNAME=['WATER','SEPTIC','IRON','GAS','WELL'],px=2.06;
 const plate=t=>{const tex=cvTex(256,64,(x,w,h)=>{x.fillStyle='#1a222c';x.fillRect(0,0,w,h);x.fillStyle='#f4ead8';x.font='bold 40px Georgia,serif';x.textAlign='center';x.textBaseline='middle';x.fillText(t,w/2,h/2+2)});tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;return tex};
 box(1.02,1.46,.06,0x2a2e33,px,1.5,-9.96,{roughness:.45,metalness:.4});
 box(.92,1.36,.018,0xd7d1c4,px,1.5,-9.915,{roughness:.82});
 for(const sx of[-.44,.44])for(const sy of[-.66,.66]){const sc=cyl(.014,.014,.01,0x8d9398,px+sx,1.5+sy,-9.9,{metalness:.7,roughness:.35});sc.rotation.x=Math.PI/2}
 const head=new THREE.Mesh(new THREE.PlaneGeometry(.52,.1),new THREE.MeshStandardMaterial({map:plate('SUPPLIES'),roughness:.9}));head.position.set(px,2.04,-9.888);PARENT.add(head);
 SNAME.forEach((name,i)=>{const y=1.8-i*.23;
  box(.82,.17,.01,0x232a33,px,y,-9.9,{roughness:.7,metalness:.15});
  const lab=new THREE.Mesh(new THREE.PlaneGeometry(.4,.11),new THREE.MeshStandardMaterial({map:plate(name),roughness:.9}));lab.position.set(px-.16,y,-9.882);PARENT.add(lab);
  const g=new THREE.Group();g.position.set(px+.2,y,-9.86);
  const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.07,8),mat(0x14171a,{metalness:.65,roughness:.4}));hinge.rotation.z=Math.PI/2;g.add(hinge);
  const arm=new THREE.Mesh(new THREE.BoxGeometry(.028,.09,.022),mat(SUPC[i],{metalness:.3,roughness:.4}));arm.position.y=.048;g.add(arm);
  g.rotation.x=.65;PARENT.add(g);supplyLever[i]=g;
  const bezel=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.012,10),mat(0x14171a,{metalness:.55,roughness:.4}));bezel.rotation.x=Math.PI/2;bezel.position.set(px+.36,y,-9.888);PARENT.add(bezel);
  const led=new THREE.Mesh(new THREE.SphereGeometry(.018,10,8),new THREE.MeshStandardMaterial({color:lin(0x6a3030),emissive:lin(0x400808),emissiveIntensity:.25,roughness:.35}));
  led.position.set(px+.36,y,-9.872);PARENT.add(led);supplyLed[i]=led})}
PARENT=scene;const G0=GLASS.length,L0=LAMPS.length;/* house windows and bench bulb; the outer world adds more after these and is rebuilt per size */
function buildYard(){clearGroup(yardG);PARENT=yardG;obst.length=0;obst.push({x:BENCH[0],z:BENCH[1],r:.95},{x:PUMPP[0],z:PUMPP[1],r:.45});buildFence();
 /* trees + bin: soil around them is held by roots (see PROT in World), so they never float or sink */
 TREES.forEach(([x,z,s,k])=>{(k===1?yardPine:k===2?birchTree:k===3?snagTree:foliageTree)(x,z,s);obst.push({x,z,r:.5*s})});
 const rb=rng(7),nb=Math.round(14*YH/10),st=2*(YH-1)/(nb-1),bx=YH-.7;for(let k=0;k<nb;k++){const t=-(YH-1)+k*st;[[bx,t],[-bx,t],[t,bx]].forEach(([x,z])=>{if(rb()<.5){const s=.5+rb()*.5,c=rb()<.5;if(Math.hypot(x-CRATE[0],z-CRATE[1])>1.35)blob(s,c?0x2d6a2b:0x3d8036,x,s*.7,z,1.2,.85,1.2)}})}
 cyl(.32,.38,.82,0xb7c0c6,BIN[0],.46,BIN[1],{roughness:.32,metalness:.62});
 for(const y of[.25,.46,.67])cyl(.385,.385,.028,0x8d979e,BIN[0],y,BIN[1],{roughness:.28,metalness:.7});
 cyl(.3,.34,.05,0x6e777c,BIN[0],.9,BIN[1],{roughness:.35,metalness:.55});cyl(.22,.22,.025,0xaeb6bb,BIN[0],.94,BIN[1],{roughness:.3,metalness:.6});
 cyl(.025,.025,.07,0x3e454a,BIN[0],.99,BIN[1],{roughness:.4,metalness:.5});
 box(.04,.1,.14,0x5c656b,BIN[0]-.37,.55,BIN[1],{roughness:.4,metalness:.5});box(.04,.1,.14,0x5c656b,BIN[0]+.37,.55,BIN[1],{roughness:.4,metalness:.5});
 /* open slatted crate for artifacts, facing the yard */
 const[cx,cz]=CRATE,woodO={map:wood,roughness:.85};
 for(const sx of[-1,1])for(const sz of[-1,1])box(.07,.52,.07,0xffffff,cx+sx*.44,.3,cz+sz*.3,woodO);
 box(.84,.05,.56,0xffffff,cx,.08,cz,woodO);box(.74,.04,.46,0x241c16,cx,.12,cz,{roughness:1});
 for(const yy of[.22,.36,.5]){box(.86,.07,.045,0xffffff,cx,yy,cz-.33,woodO);box(.86,.07,.045,0xffffff,cx,yy,cz+.33,woodO)}
 for(const yy of[.22,.36,.5]){box(.045,.07,.58,0xffffff,cx-.46,yy,cz,woodO);box(.045,.07,.58,0xffffff,cx+.46,yy,cz,woodO)}
 box(.9,.04,.06,0xffffff,cx,.58,cz-.3,woodO);box(.9,.04,.06,0xffffff,cx,.58,cz+.3,woodO);
 obst.push({x:cx,z:cz,r:.7});buildGasMain();PARENT=scene}
let gasTagPos=null,gasTagMap=null;
function buildGasMain(){if(gasTagMap){gasTagMap.dispose();gasTagMap=null}
 const z=YH+.42,x=Math.min(5.5,YH*.45),yel={roughness:.45,metalness:.25};
 const main=cyl(.055,.055,Math.min(12,S*.45),0xd8b42a,0,.32,z,yel);main.rotation.z=Math.PI/2;
 cyl(.05,.05,1.05,0xd8b42a,x,.62,z,yel);
 const wheel=new THREE.Mesh(new THREE.TorusGeometry(.11,.022,6,14),mat(0xc0392b,{roughness:.5}));wheel.rotation.x=Math.PI/2;wheel.position.set(x,1.2,z);wheel.castShadow=true;PARENT.add(wheel);
 const code=gasTagCode(yardSeed),cv=document.createElement('canvas');cv.width=256;cv.height=128;const g=cv.getContext('2d');
 g.fillStyle='#efe6c9';g.fillRect(0,0,256,128);g.strokeStyle='#5a4632';g.lineWidth=10;g.strokeRect(8,8,240,112);
 g.fillStyle='#5a4632';g.font='bold 28px Georgia,serif';g.textAlign='center';g.textBaseline='middle';g.fillText('GAS',128,40);
 g.fillStyle='#1b1410';g.font='bold 58px Georgia,serif';g.fillText(code,128,88);
 gasTagMap=new THREE.CanvasTexture(cv);const tag=new THREE.Mesh(new THREE.PlaneGeometry(.5,.26),new THREE.MeshStandardMaterial({map:gasTagMap,roughness:.9}));
 tag.position.set(x,1.15,z-.12);tag.rotation.y=Math.PI;tag.castShadow=true;PARENT.add(tag);gasTagPos={x,y:1.15,z:z-.12}}

/* ---------- surrounding world: hills, street, neighbours, forest ---------- */
function oh(x,z){const r=Math.hypot(x,z),m=Math.min(1,Math.max(0,(r-55)/80)),n=Math.sin(x*.021+1.3)*Math.cos(z*.017+.4)+.5*Math.sin(x*.05+z*.043)+.25*Math.sin(x*.11-z*.09);
 let h=m*m*(3-2*m)*(9+24*(.5+.2*n));const sz=30+DEL,edge=52+DEL,band=Math.min(1,Math.max(0,(Math.abs(z-sz)-7)/10)),end=Math.min(1,Math.max(0,(Math.abs(x)-(edge+4))/14));return h*Math.max(band,end)}
function house(x,z,ry,w,d,h,wc,rc,y=0){const G=new THREE.Group();G.position.set(x,y,z);G.rotation.y=ry;PARENT.add(G);
 const A=(m,a,b,c)=>{m.position.set(a,b,c);m.castShadow=m.receiveShadow=true;G.add(m);return m},B=(w2,h2,d2,c,o)=>new THREE.Mesh(new THREE.BoxGeometry(w2,h2,d2),mat(c,o));
 A(B(w,h,d,wc,{map:siding}),0,h/2,0);const rise=h*.4;G.add(gable(w,d,h,rise,rc,wc));
 for(const i of[-1,1]){A(B(w*.2,h*.3,.12,0xf2efe8),i*w*.27,h*.6,d/2+.02);lit(A(B(w*.17,h*.26,.14,0x2d4a63,{roughness:.15,metalness:.4}),i*w*.27,h*.6,d/2+.03).material)}
 A(B(1,2.1,.14,0x5a3a22),0,1.05,d/2+.03);A(B(.8,rise*1.5,.8,0x8a5a48),w*.3,h+rise*.9,0);return G}
/* scenery whose nearest point is past VIEWD[SET.view] is not drawn. Close matches the short fog; Normal and Far keep the map */
const distM=[],grassM=[],VIEWD=[80,220,280];
function applyView(){const lim=VIEWD[SET.view];for(const m of distM)m.visible=m.userData.d<lim;for(const m of grassM)m.visible=m.userData.d<lim}
function markDist(m,x,z){m.userData.d=Math.hypot(x,z);distM.push(m);return m}
function buildOuter(){clearGroup(outerG);distM.length=0;PARENT=outerG;HD.n=0;HD.r=rng(21);GLASS.length=G0;LAMPS.length=L0;
 const r=rng(11),gt=soilTex.clone();gt.repeat.set(390,390);gt.needsUpdate=true;/* same texel density as the play area (26 tiles per 20 m) */
 const GS=300,GD=5,GC=GS/GD,SEG=150/GD|0,gMat=new THREE.MeshStandardMaterial({vertexColors:true,map:gt,bumpMap:gt,bumpScale:3,roughness:1}),hole=3*YH;
 for(let j=0;j<GD;j++)for(let i=0;i<GD;i++){const cx=-GS/2+(i+.5)*GC,cz=-GS/2+(j+.5)*GC,g=new THREE.PlaneGeometry(GC,GC,SEG,SEG);g.rotateX(-Math.PI/2);g.translate(cx,0,cz);
  const P=g.attributes.position,uv=g.attributes.uv,cl=new Float32Array(P.count*3);
  for(let v=0;v<P.count;v++){const x=P.getX(v),z=P.getZ(v),h=oh(x,z),rr=Math.hypot(x,z),q=Math.abs(Math.sin(x*12.9+z*78.2)*437.5)%1;P.setY(v,h);uv.setXY(v,(x+GS/2)/GS,(z+GS/2)/GS);
   const n=Math.sin(x*.09)*Math.sin(z*.11)+.7*Math.sin(x*.031+z*.027);let cr=.2+.06*q,cg=.42+.08*q,cb=.14;
   if(rr>40&&rr<105&&n>.45&&!(Math.abs(x)<54+DEL&&z>-36&&z<64+DEL)){cr=.6+.05*q;cg=.52+.05*q;cb=.24}
   if(h>16){const k=Math.min(1,(h-16)/8);cr+=(.5-cr)*k;cg+=(.47-cg)*k;cb+=(.42-cb)*k}
   cl[v*3]=cr*cr*1.6;cl[v*3+1]=cg*cg*1.6;cl[v*3+2]=cb*cb*1.6}
  g.setAttribute('color',new THREE.BufferAttribute(cl,3));
  if(Math.abs(cx)<hole+GC&&Math.abs(cz)<hole+GC){const ix=g.index.array,keep=[];for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(Math.abs(P.getX(a)+P.getX(b)+P.getX(c))<hole&&Math.abs(P.getZ(a)+P.getZ(b)+P.getZ(c))<hole)continue;keep.push(a,b,c)}if(!keep.length){g.dispose();continue}g.setIndex(keep)}
  g.computeVertexNormals();const dx=Math.max(Math.abs(cx)-GC/2,0),dz=Math.max(Math.abs(cz)-GC/2,0),m=new THREE.Mesh(g,gMat);m.receiveShadow=true;m.userData.d=Math.hypot(dx,dz);PARENT.add(m);distM.push(m)}
 const HS=[[-27,-9,1.5708,9,7,4.2,0x9fb3c4,0x5a3a32],[-27,14,1.5708,8,6,4,0xd8c39a,0x3d3d44],[28,-8,-1.5708,10,7,4.4,0xc9877a,0x4a4a50],[28,15,-1.5708,8,6.5,4,0x9db08c,0x6a3b2e],[-32,47,3.1416,10,7,4.2,0xe0d6bf,0x55402f],[0,49,3.1416,11,7,4.6,0x8fa3b8,0x3f3f46],[34,47,3.1416,9,7,4.2,0xb98a6c,0x4a3a35]].map((a,i)=>[a[0]+HOFF[i+1][0]*DEL,a[1]+HOFF[i+1][1]*DEL,...a.slice(2)]);
 HS.forEach(a=>house(...a));HS.forEach(a=>lot(a[0],a[1],a[2],a[3],a[4]));perimeter();
 markDist(house(-80,-58,.6,12,9,6,0x8c2f2a,0x44464a,oh(-80,-58)),-80,-58);const sy=oh(-66,-52);markDist(cyl(2.2,2.2,10,0xb7bdc2,-66,sy+5,-52,{metalness:.3,roughness:.5}),-66,-52);const cap=new THREE.Mesh(new THREE.ConeGeometry(2.4,2,14),mat(0x6d737a));cap.position.set(-66,sy+11,-52);PARENT.add(cap);markDist(cap,-66,-52);
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
 const TN=460,RC=150,o=new THREE.Object3D(),cc=new THREE.Color(),bad=(x,z)=>HS.some(a=>Math.hypot(x-a[0],z-a[1])<13)||(Math.abs(z-sz)<8&&Math.abs(x)<58+DEL)||Math.hypot(x+78,z+58)<16||Math.hypot(x,z)<46||Math.abs(Math.max(Math.abs(x)-52-DEL,Math.abs(z-14-DEL/2)-48-DEL/2))<5,spots=[];
 for(let i=0;i<TN+RC;i++){let x,z,t=0;do{const a=r()*6.283,d=46+Math.pow(r(),.8)*90;x=Math.cos(a)*d;z=Math.sin(a)*d}while(bad(x,z)&&t++<30);const sc=1+r()*1.2,ry=r()*6,pine=i<TN;
  const col=pine?cc.setHSL(.3+r()*.05,.5,.12+r()*.1):cc.setHSL(r()<.3?.1+r()*.05:.25+r()*.07,.55,.2+r()*.1);spots.push({x,y:oh(x,z)-.15,z,ry,sc,pine,col:col.convertSRGBToLinear().clone(),d:Math.hypot(x,z)})}
 const putTrees=(list,far)=>{if(!list.length)return;const pines=list.filter(s=>s.pine),crowns=list.filter(s=>!s.pine),tg=new THREE.CylinderGeometry(.2,.3,2.4,6).translate(0,1.2,0);
  const tk=new THREE.InstancedMesh(tg,mat(0x4d3520),list.length),pn=pines.length?new THREE.InstancedMesh(pineG,mat(0xffffff),pines.length):null;let cr=null;
  if(crowns.length){const crown=leafG.clone();crown.scale(2.2,2.8,2.2);crown.translate(0,4.4,0);cr=new THREE.InstancedMesh(crown,mat(0xffffff),crowns.length)}
  const place=(m,s,i)=>{o.position.set(s.x,s.y,s.z);o.rotation.set(0,s.ry,0);o.scale.setScalar(s.sc);o.updateMatrix();m.setMatrixAt(i,o.matrix)};
  list.forEach((s,i)=>place(tk,s,i));pines.forEach((s,i)=>{place(pn,s,i);pn.setColorAt(i,s.col)});crowns.forEach((s,i)=>{place(cr,s,i);cr.setColorAt(i,s.col)});
  for(const m of[tk,pn,cr])if(m){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.castShadow=m.receiveShadow=true;m.frustumCulled=false;PARENT.add(m);if(far){m.userData.d=80;distM.push(m)}}};
 putTrees(spots.filter(s=>s.d<80),0);putTrees(spots.filter(s=>s.d>=80),1);buildOuterGrass();PARENT=scene}

/* ---------- voxel yard: exposed cube faces, remeshed per 16×16 chunk ---------- */
let NZ;
const voxMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}),voxG=new THREE.Group(),chunks=new Map();voxG.frustumCulled=false;scene.add(voxG);
const VU={uWet:{value:0},uWL:{value:-12}};/* rain wetness + water-line height, driven each frame */
/* triplanar soil: world-space noise on walls and floors, pebble speckle, a small bump, darker cube edges so the blocks read as clumps */
voxMat.onBeforeCompile=sd=>{sd.uniforms.uWet=VU.uWet;sd.uniforms.uWL=VU.uWL;
 sd.vertexShader='varying vec3 vWP;varying vec3 vWN;\n'+sd.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;vWN=normalize((modelMatrix*vec4(objectNormal,0.)).xyz);');
 sd.fragmentShader=`uniform float uWet,uWL;varying vec3 vWP,vWN;
float hs3(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 float a=hs3(i),b=hs3(i+vec3(1,0,0)),c=hs3(i+vec3(0,1,0)),d=hs3(i+vec3(1,1,0));
 float e=hs3(i+vec3(0,0,1)),g=hs3(i+vec3(1,0,1)),h=hs3(i+vec3(0,1,1)),j=hs3(i+vec3(1,1,1));
 return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,j,f.x),f.y),f.z);}
float n3(vec3 p){return vn(p)+.5*vn(p*2.17);}
float soilN(vec3 p){vec3 w=abs(normalize(vWN));w/=(w.x+w.y+w.z+.001);return n3(p.yzx*4.2)*w.x+n3(p.zxy*4.2)*w.y+n3(p.xzy*4.2)*w.z;}
`+sd.fragmentShader
  .replace('#include <color_fragment>',`#include <color_fragment>
   float nse=soilN(vWP);vec3 fc=fract(vWP/.2),eg=min(fc,1.-fc);float clump=smoothstep(0.,.07,min(min(eg.x,eg.y),eg.z)),peb=smoothstep(.74,.96,n3(vWP*18.));
   float wet=max(uWet,smoothstep(uWL+.55,uWL-.12,vWP.y)*.85);
   diffuseColor.rgb*=(.76+.36*nse)*(.7+.3*clump)*(1.-peb*.18)*(1.-wet*.38);`)
  .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.22,wet);')
  .replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
   vec3 wN=normalize(vWN);float nse2=soilN(vWP),e=.05;
   vec3 tN=normalize(wN-vec3(n3((vWP+vec3(e,0,0))*5.)-nse2,n3((vWP+vec3(0,e,0))*5.)-nse2,n3((vWP+vec3(0,0,e))*5.)-nse2)*2.2);
   normal=normalize((viewMatrix*vec4(tN,0.)).xyz)*(gl_FrontFacing?1.:-1.);`)};
function buildTerrain(){for(const m of chunks.values()){m.geometry.dispose();voxG.remove(m)}chunks.clear();
 soilTex.repeat.set(1,1);NZ=new Float32Array(N*N);for(let j=0;j<N;j++)for(let i=0;i<N;i++)NZ[j*N+i]=Math.abs(Math.sin(i*12.9898+j*78.233)*43758.5453)%1}
let world;const L2=v=>v*v*1.6,SC=[0,0,0];
/* soil colour by depth below the original surface (shared by terrain + dig particles); writes into SC */
function soilRGB(d,n){let r,g,b;
  if(d<.5){r=.3+.05*n;g=.2+.03*n;b=.12}
  else if(d<1.1){r=.55+.05*n;g=.36+.04*n;b=.2}
  else if(d<2.3){const s=Math.sin(d*14)*.04;r=.66+s;g=.55+s;b=.36+s}
  else if(d<3.5){const s=Math.sin(d*11)*.03+n*.04;r=.5+s;g=.46+s;b=.4+s}
  else{r=.18+n*.02;g=.19+n*.02;b=.22+n*.025}/* stone shelf: darker and cooler than the clay above it */
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
const YMAX=Math.max(...SIZES),GNMAX=Math.round(26000*YMAX*YMAX/400);let GN=26000;/* blades on the mowable lawn: 65 per m2, buffers sized for the largest yard */
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
/* static grass beyond the fence, split into blocks so off-screen blocks and blocks past the view distance are not drawn */
const outGrass=new THREE.Group();scene.add(outGrass);
function chunkGrass(geo,rec){const C=36,bins=new Map();
 for(let i=0;i<rec.length;i+=12){const k=(Math.floor(rec[i]/C)+32)*64+Math.floor(rec[i+2]/C)+32;let b=bins.get(k);if(!b)bins.set(k,b=[]);b.push(i)}
 bins.forEach(b=>{const i0=b[0],kx=Math.floor(rec[i0]/C),kz=Math.floor(rec[i0+2]/C),cx=(kx+.5)*C,cz=(kz+.5)*C,rad=C*.78,g=geo.clone();
  g.boundingSphere=new THREE.Sphere(new THREE.Vector3(cx,.6,cz),rad);g.computeBoundingSphere=()=>{};
  const m=new THREE.InstancedMesh(g,grass.material,b.length);m.receiveShadow=true;m.frustumCulled=true;m.userData.d=Math.max(0,Math.hypot(cx,cz)-rad);
  for(let n=0;n<b.length;n++){const i=b[n];go.position.set(rec[i],rec[i+1],rec[i+2]);go.rotation.set(rec[i+3],rec[i+4],rec[i+5]);go.scale.set(rec[i+6],rec[i+7],rec[i+8]);go.updateMatrix();m.setMatrixAt(n,go.matrix);m.setColorAt(n,gc.setHSL(rec[i+9],rec[i+10],rec[i+11]).convertSRGBToLinear())}
  m.instanceMatrix.needsUpdate=m.instanceColor.needsUpdate=true;outGrass.add(m);grassM.push(m)})}
function buildOuterGrass(){outGrass.traverse(o=>{if(o.geometry&&o.geometry!==gg)o.geometry.dispose()});outGrass.clear();grassM.length=0;if(!SET.gr){applyView();return}
 {const B=2*(YH+13.5),ON=Math.round(40000*(27*YH+182)/452),r=rng(5),rec=[];
 for(let n=0;n<ON;){const x=(r()-.5)*B,z=(r()-.5)*B,d=Math.max(Math.abs(x),Math.abs(z));
  if(d<YH+.4||(Math.abs(x)<7.8&&z<-(YH-.2)&&z>-(YH+5.4))||paved(x,z)||r()>Math.exp(-(d-YH)/8))continue;
  const s=.8+r()*1;rec.push(x,-.02,z,(r()-.5)*.5,r()*6,(r()-.5)*.5,1.9,s,1.9,.22+r()*.06,.55,.28+r()*.18);n++}
 chunkGrass(gg,rec)}
 if(SET.gr<2){applyView();return}
/* far lawn: cheap 3-triangle tufts out to the hedge line, skipping the street, house footprints and front paths */
{const FN=Math.round(70000*(102+2*DEL)*(94+DEL)/9588),fg=new THREE.ConeGeometry(.05,.42,3,1,true).translate(0,.21,0),fa=fg.attributes.position,fc=new Float32Array(fa.count*3);
 for(let i=0;i<fa.count;i++)fc.fill(.2+.8*Math.min(1,fa.getY(i)/.42),i*3,i*3+3);fg.setAttribute('color',new THREE.BufferAttribute(fc,3));
 const r=rng(6),Y=new V3(0,1,0),v=new V3(),rec=[];
 const blocked=(x,z)=>{if(z>23.8+DEL&&z<37.8+DEL||paved(x,z))return true;for(const[cx,cz,ry,w,d]of HFP){v.set(x-cx,0,z-cz).applyAxisAngle(Y,-ry);if(Math.abs(v.x)<w/2+1.2&&v.z>-d/2-1.2&&v.z<d/2+1.2)return true}return false};
 for(let n=0;n<FN;){const x=-(51+DEL)+r()*(102+2*DEL),z=-33+r()*(94+DEL);if(Math.max(Math.abs(x),Math.abs(z))<YH+12||blocked(x,z))continue;
  const s=.8+r()*.9,rx=(r()-.5)*.4,ry=r()*6,rz=(r()-.5)*.4,sx=1.2+r()*.8,sz=1.2+r()*.8;rec.push(x,oh(x,z)-.02,z,rx,ry,rz,sx,s,sz,.21+r()*.07,.55,.24+r()*.16);n++}
 chunkGrass(fg,rec)}applyView()}
function clearGrass(x,z){let ch=0;go.position.set(0,-50,0);go.rotation.set(0,0,0);go.scale.setScalar(0);go.updateMatrix();
 for(let n=0;n<GN;n++){const q=gp[n];if(q.gone||Math.abs(q.x-x)>4||Math.abs(q.z-z)>4)continue;if(Math.abs(world.hAt(q.x,q.z)-q.y)>.05){q.gone=1;grass.setMatrixAt(n,go.matrix);ch=1}}if(ch)grass.instanceMatrix.needsUpdate=true}
const rockG=(()=>{const g=new THREE.IcosahedronGeometry(1,1),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=.82+.18*Math.sin(x*4.1+y*2.3)*Math.cos(z*3.7-y*1.9)+.1*Math.sin(x*9.3+z*7.1+y*5.2);p.setXYZ(i,x*k,y*k*.85,z*k)}
 g.computeVertexNormals();return g})();
const ROCK_BAND=8.2,rockSpan=()=>S>=44?Math.max(ROCK_BAND,-BED-1.3):ROCK_BAND,RNMAX=Math.round(700*60*60/400*(20-1.3)/ROCK_BAND);let RN=700;/* buried rocks: 1.75 per m2 through the old band; Extra Large and Super keep that density down to the bedrock */
const rocks=new THREE.InstancedMesh(rockG,mat(0xffffff,{roughness:.95}),RNMAX);rocks.castShadow=rocks.receiveShadow=true;scene.add(rocks);rocks.setColorAt(0,new THREE.Color());
const rk=[];
function setRock(n){const q=rk[n];go.position.set(q.x,q.y,q.z);go.rotation.set(q.a,q.b,q.c);go.scale.set(q.s*q.w,q.s,q.s*q.w);go.updateMatrix();rocks.setMatrixAt(n,go.matrix)}
function buildRocks(){const r=rng(world.seed+2),span=rockSpan();rk.length=0;for(let n=0;n<RN;n++){const s=.07+Math.pow(r(),3)*.5;rk.push({x:(r()-.5)*(S-1),y:-.8-Math.pow(r(),1.15)*span,z:(r()-.5)*(S-1),a:r()*6,b:r()*6,c:r()*6,s,w:1+r()*.6});setRock(n);rocks.setColorAt(n,gc.setHSL(.08+r()*.05,.12+r()*.1,.25+r()*.3).convertSRGBToLinear())}
 /* a few small rocks are gems (own RNG stream so the rock layout is unchanged): over-bright colour, so they glow through the bloom */
 const g=rng(world.seed+3);for(let n=0;n<RN;n++){const q=rk[n],a=g(),b=g();q.gem=0;if(a<GEM_RATE&&q.s<=.3){q.s=Math.max(q.s,.1);q.gem=b<.55?1:b<.85?2:b<.97?3:4;setRock(n);rocks.setColorAt(n,gc.setRGB(...GEM[q.gem][2]))}}
 rocks.instanceMatrix.needsUpdate=rocks.instanceColor.needsUpdate=true}
/* support under a resting body: top of the first solid block at or below y (y itself when the block there is solid) */
function supAt(x,z,y){const[i,j]=world.col(x,z),b=j*N+i,vol=N*N,v=world.vox;for(let L=Math.min(VL-1,Math.floor((y-1e-3-BED)/C));L>=0;L--)if(v[L*vol+b])return Math.min(y,BED+(L+1)*C);return BED}
/* a rock rests on the highest support under its footprint (centre + 6 points on its rim), so a boulder bridges a narrow hole. Never above where it is now */
function rockRest(q){const y0=q.y-q.s*.3,rr=q.s*q.w*.75;let s=supAt(q.x,q.z,y0);for(let k=0;k<6;k++){const a=k*1.0472+q.b;s=Math.max(s,supAt(q.x+Math.cos(a)*rr,q.z+Math.sin(a)*rr,y0))}return s+q.s*.3}
const FALL=new Set();/* rock numbers and find objects dropping onto new support */
function settleRocks(x,z){for(let n=0;n<RN;n++){const q=rk[n];if(q.held||Math.abs(q.x-x)>9||Math.abs(q.z-z)>9||world.solidAt(q.x,q.y,q.z))continue;if(rockRest(q)<q.y-.005)FALL.add(n)}}
function stepFall(dt){let ch=0;for(const o of FALL){const r=typeof o==='number',q=r?rk[o]:o;if(r?q.held:q.held||q.done||!q.out){q.vy=0;FALL.delete(o);continue}
 const t=r?rockRest(q):supAt(q.x,q.z,q.y)+q.sz;q.vy=(q.vy||0)-14*dt;q.y+=q.vy*dt;
 if(q.y<=t){q.y=t;const v=-q.vy,dn=Math.hypot(q.x-px,q.z-pz);if(v>2.5&&dn<10){nz('lowpass',r?180+300*(.6-Math.min(.5,q.s)):700,.14,Math.min(.6,(r?q.s*1.6:.25)*v/8)*(1-dn/10));if(r&&q.s>.25)addTrauma(Math.min(.35,q.s*v*.05)*(1-dn/10))}
  if(v>3){q.vy=v*.22}else{q.vy=0;FALL.delete(o)}}
 if(r){setRock(o);ch=1}else q.m.position.y=q.y}if(ch)rocks.instanceMatrix.needsUpdate=true}
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
  else{const stone=mat(0x8a8680,{roughness:.96}),dark=mat(0x141210,{roughness:1}),g=new THREE.Group(),wall=new THREE.Mesh(new THREE.CylinderGeometry(.75,.78,.92,20,1,true),stone),inner=new THREE.Mesh(new THREE.CylinderGeometry(.57,.6,.9,20,1,true),stone);
   wall.material.side=THREE.DoubleSide;inner.material.side=THREE.BackSide;const lip=new THREE.Mesh(new THREE.TorusGeometry(.8,.1,8,20),stone);lip.rotation.x=Math.PI/2;lip.position.y=.48;
   const floor=new THREE.Mesh(new THREE.CircleGeometry(.56,20),dark);floor.rotation.x=-Math.PI/2;floor.position.y=-.44;g.add(wall,inner,lip,floor);
   for(let i=0;i<3;i++){const a=s.a+i*2.2,stn=new THREE.Mesh(new THREE.DodecahedronGeometry(.09,0),stone);stn.position.set(Math.cos(a)*.86,.52,Math.sin(a)*.86);stn.rotation.set(i,a,.4);g.add(stn)}
   g.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});m=g}
  keep(add(m,s.x,s.y,s.z))}
 world.sig.forEach(s=>{const g=new THREE.Group(),mesh=(geo,c,o)=>{const m=new THREE.Mesh(geo,mat(c,o));m.castShadow=m.receiveShadow=true;g.add(m);return m};
  if(s.kind==='burst'){mesh(new THREE.SphereGeometry(.09,8,6),0x3a7bd5,{roughness:.2,emissive:0x1a4a88,emissiveIntensity:.5}).position.y=.28;
   [[0,.46,.03],[.07,.62,0],[-.05,.76,.04]].forEach(([x,y,z],i)=>{const d=mesh(new THREE.SphereGeometry(.07-i*.015,8,6),0x7ec8f0,{roughness:.15,emissive:0x2a6aaa,emissiveIntensity:.6});d.position.set(x,y,z)})}
  else if(s.kind==='tank'){const p=mesh(new THREE.CircleGeometry(.42,16),0x6a4a28,{roughness:1});p.rotation.x=-Math.PI/2;p.position.y=.74;
   const sh=mesh(new THREE.BoxGeometry(.32,.05,.16),0xc8c2b4,{roughness:.9});sh.position.set(.34,.86,.08);sh.rotation.set(.55,.3,.8);
   const drip=mesh(new THREE.BoxGeometry(.1,.4,.05),0x5a3e22,{roughness:1});drip.position.set(.3,.25,1.22)}
  else if(s.kind==='iron'){g.rotation.y=s.a;mesh(new THREE.BoxGeometry(.05,.04,.2),0x1a120e,{roughness:1}).position.y=.16;
   [[.12,.22,.05],[-.1,.2,-.06],[.02,.24,-.08]].forEach(([x,y,z],i)=>{const f=mesh(new THREE.DodecahedronGeometry(.04+i*.012,0),0x6a3418,{roughness:.95});f.position.set(x,y,z);f.rotation.set(i,i*.7,.4)})}
  else if(s.kind==='gas'){g.rotation.y=s.a;[[.1,-.7],[-.08,.55]].forEach(([x,rz])=>{const t=mesh(new THREE.BoxGeometry(.04,.13,.06),0xc9a227,{metalness:.35,roughness:.4});t.position.set(x,.18,0);t.rotation.z=rz});
   const w=mesh(new THREE.SphereGeometry(.035,8,6),0xffb15a,{emissive:0xff6a1a,emissiveIntensity:1});w.scale.set(.8,1.6,.8);w.position.y=.3}
  else{const wd={map:wood,roughness:.9};const a=mesh(new THREE.BoxGeometry(.46,.04,.09),0xffffff,wd);a.position.set(-.16,.66,.02);a.rotation.set(.1,s.a,.5);
   const b=mesh(new THREE.BoxGeometry(.38,.04,.09),0xffffff,wd);b.position.set(.18,.58,-.02);b.rotation.set(-.08,s.a,-.4)}
  g.position.set(s.x,s.y,s.z);pipeG.add(g);s.mark=g});
 scene.add(pipeG);refreshSupply()}

/* buried finds: hidden until the soil above them is gone, then they sit on the hole floor */
function syncFind(f,snap){if(f.done||f.held){f.m.visible=false;return}const c=world.solidAt(f.x,f.y,f.z);
 if(f.out&&c&&!FALL.has(f))f.out=0;/* a cave-in buried it again */
 else if(!f.out&&!c){f.out=1;if(!snap&&!f.seen)revealFind(f);f.seen=1}
 if(f.out){const t=supAt(f.x,f.z,f.y)+f.sz;if(t>f.y||snap)f.y=t;else if(t<f.y-.002)FALL.add(f)}
 f.m.position.set(f.x,f.y,f.z);f.m.rotation.set(0,f.a,0);f.m.visible=!!f.out}
function findOut(f){return !f.done&&!f.held&&!!f.out}
function settleFinds(x,z){for(const f of world.finds){if(f.done||f.held||Math.abs(f.x-x)>7||Math.abs(f.z-z)>7)continue;syncFind(f)}}
let findG;
function buildFinds(){if(findG){findG.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});scene.remove(findG)}
 findG=new THREE.Group();scene.add(findG);
 for(const f of world.finds){const g=findMesh(f.kind);f.m=g;g.visible=false;findG.add(g);syncFind(f)}}
function findMesh(kind){const mesh=(g,c,o)=>{const m=new THREE.Mesh(g,mat(c,o));m.castShadow=m.receiveShadow=true;return m},gold={metalness:.85,roughness:.28,emissive:0x6a5010,emissiveIntensity:.28},flat=g=>g.rotateX(Math.PI/2),g=new THREE.Group(),f={kind};
  if(f.kind==='key'){const rust={roughness:.85,metalness:.45},bow=mesh(flat(new THREE.TorusGeometry(.02,.006,6,14)),0x7a4a2a,rust);bow.position.x=-.045;const sh=mesh(new THREE.BoxGeometry(.07,.008,.008),0x6e4226,rust);sh.position.x=.01;
   g.add(bow,sh);for(const tx of[.03,.042]){const t=mesh(new THREE.BoxGeometry(.006,.008,.016),0x6e4226,rust);t.position.set(tx,0,.01);g.add(t)}}
  else if(f.kind==='toycar'){const paint={roughness:.38,metalness:.25};g.add(mesh(new THREE.BoxGeometry(.13,.035,.065),0xc8322a,paint));const cab=mesh(new THREE.BoxGeometry(.065,.03,.058),0xb02a22,paint);cab.position.set(-.01,.032,0);g.add(cab);
   const gl=mesh(new THREE.BoxGeometry(.067,.022,.05),0x9fc4d8,{roughness:.1,metalness:.3});gl.position.set(-.01,.033,0);g.add(gl);
   for(const wx of[-.042,.042])for(const wz of[-.034,.034]){const w=mesh(flat(new THREE.CylinderGeometry(.016,.016,.012,10)),0x161616,{roughness:.9});w.position.set(wx,-.02,wz);g.add(w)}}
  else if(f.kind==='penny')g.add(mesh(new THREE.CylinderGeometry(.04,.04,.01,16),0xb06a3a,{roughness:.35,metalness:.85,emissive:0x3a1a08,emissiveIntensity:.2}));
  else if(f.kind==='coin'){g.add(mesh(new THREE.CylinderGeometry(.048,.048,.016,18),0xd5dadf,{roughness:.22,metalness:.92,emissive:0x2a2c30,emissiveIntensity:.25}))}
  else if(f.kind==='doubloon'){g.add(mesh(new THREE.CylinderGeometry(.055,.055,.02,20),0xe2b434,gold));const c=mesh(new THREE.CylinderGeometry(.038,.038,.026,16),0xf0cc50,gold);g.add(c)}
  else if(f.kind==='fossil'){const st={roughness:.9},b=mesh(new THREE.SphereGeometry(.05,14,10),0xb9ab8e,st);b.scale.set(1,.5,1);g.add(b);
   for(const[r,t]of[[.036,.009],[.019,.007]]){const s=mesh(flat(new THREE.TorusGeometry(r,t,6,18)),0xa89a7c,st);s.position.y=.016;g.add(s)}}
  else if(f.kind==='watch'){g.add(mesh(new THREE.CylinderGeometry(.04,.04,.016,20),0xe2b434,gold));const face=mesh(new THREE.CylinderGeometry(.033,.033,.004,20),0xf4efe2,{roughness:.3,emissive:0x302c24,emissiveIntensity:.3});face.position.y=.008;g.add(face);
   const cr=mesh(flat(new THREE.CylinderGeometry(.008,.008,.012,8)),0xe2b434,gold);cr.position.z=-.046;const lp=mesh(flat(new THREE.TorusGeometry(.012,.003,6,12)),0xe2b434,gold);lp.position.z=-.06;g.add(cr,lp)}
  else if(f.kind==='ring'){g.add(mesh(flat(new THREE.TorusGeometry(.028,.008,8,20)),0xe2b434,gold));const gem=mesh(new THREE.OctahedronGeometry(.013,0),0xc0102a,{roughness:.1,metalness:.1,emissive:0x600010,emissiveIntensity:.6});gem.position.set(0,.012,.028);g.add(gem)}
  else if(f.kind==='can'){const m=mesh(new THREE.CylinderGeometry(.05,.052,.12,10),0xc5c9c4,{roughness:.35,metalness:.72});m.rotation.z=1;const lid=mesh(new THREE.CylinderGeometry(.054,.054,.014,10),0xd5d8d2,{roughness:.3,metalness:.8});lid.position.y=.06;m.add(lid);g.add(m)}
  else if(f.kind==='bottle'){const b=mesh(new THREE.CylinderGeometry(.028,.034,.11,8),0x2f6a4a,{transparent:true,opacity:.8,roughness:.12,metalness:.05});b.position.y=-.02;const n=mesh(new THREE.CylinderGeometry(.012,.015,.05,8),0x3d7a58,{transparent:true,opacity:.8,roughness:.12});n.position.y=.06;g.add(b,n)}
  else if(f.kind==='boot'){const sole=mesh(new THREE.BoxGeometry(.15,.04,.07),0x4a3224,{roughness:1});sole.position.y=-.02;const u=mesh(new THREE.BoxGeometry(.07,.08,.068),0x3b291c,{roughness:1});u.position.set(-.035,.03,0);g.add(sole,u)}
  else if(f.kind==='arrow'){const m=mesh(new THREE.ConeGeometry(.034,.11,4),0x8a8074,{roughness:.82,emissive:0x3a342c,emissiveIntensity:.3});m.rotation.z=Math.PI/2;g.add(m)}
  else if(f.kind==='pot'){const pts=[];for(let i=0;i<=7;i++){const t=i/7;pts.push(new THREE.Vector2(.024+.058*Math.sin(t*2.2)*(.45+.55*Math.sin(t*Math.PI)),t*.13))}const m=mesh(new THREE.LatheGeometry(pts,9),0xb4683c,{roughness:.92,emissive:0x4a2818,emissiveIntensity:.22});m.position.y=-.065;g.add(m)}
  else{const body=mesh(new THREE.ConeGeometry(.045,.11,6),0xe2b434,gold);body.position.y=-.01;const head=mesh(new THREE.SphereGeometry(.03,8,6),0xf0d060,gold);head.position.y=.075;g.add(body,head)}
  return g}
const gemMesh=n=>{const c=GEM[n][2],k=1/Math.max(...c),m=new THREE.Mesh(rockG,mat(0xffffff,{roughness:.2,metalness:.1}));m.material.color.setRGB(c[0]*k,c[1]*k,c[2]*k);m.material.emissive.setRGB(c[0]*k*.3,c[1]*k*.3,c[2]*k*.3);m.scale.set(.1,.085,.1);return m};

/* ---------- shovel, markers, particles ---------- */
/* first-person shovel. Built along +Y (tip at y=0, D-grip at y=1.2), then tilted so the blade points forward-down.
   The two gloves stay the last children: co-op hands grab those. `sh` (origin = grip) is what the dig animation pivots. */
const sh=new THREE.Group();let shBlade,pkHead;{
 const steel=new THREE.MeshStandardMaterial({color:lin(0xc5ced4),roughness:.35,metalness:.55,emissive:lin(0x14171a),side:THREE.DoubleSide}),
  dark=new THREE.MeshStandardMaterial({color:lin(0x5c656c),roughness:.5,metalness:.5,emissive:lin(0x0c0e10),side:THREE.DoubleSide}),
  wd=mat(0xffffff,{map:wood,roughness:.7}),glove=mat(0x7a5530,{roughness:.9}),shov=new THREE.Group();
 const bg=new THREE.PlaneGeometry(1,1,16,18),bp=bg.attributes.position;
 for(let i=0;i<bp.count;i++){const t=bp.getY(i)+.5,u=bp.getX(i)*2,half=t<.18?.015+t*.55:t<.72?.115:.115-(t-.72)*.08,x=u*half;bp.setXYZ(i,x,t*.34-.34,2.4*x*x+.012*(1-u*u)*Math.sin(t*Math.PI))}
 bg.computeVertexNormals();
 const blade=new THREE.Group(),b1=new THREE.Mesh(bg,steel),b2=new THREE.Mesh(bg,dark);b2.position.z=-.008;blade.add(b1,b2);blade.position.y=.34;blade.rotation.x=.32;blade.name='blade';shBlade=blade;
 const step=new THREE.Mesh(new THREE.BoxGeometry(.2,.016,.04),steel);step.position.set(0,.34,.02);step.rotation.x=.32;
 const sock=new THREE.Mesh(new THREE.CylinderGeometry(.026,.04,.14,12),dark);sock.position.y=.38;
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.02,.024,.82,12),wd);shaft.position.y=.78;
 const bar=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.16,10),wd);bar.rotation.z=Math.PI/2;bar.position.y=1.2;
 const loop=new THREE.Mesh(new THREE.TorusGeometry(.062,.015,6,12,Math.PI),wd);loop.position.y=1.2;
 const gl=[.98,.66].map(y=>{const g=new THREE.Mesh(new THREE.SphereGeometry(.058,14,10),glove);g.scale.set(1.05,1.5,1.05);g.position.y=y;return g});
 shov.add(blade,step,sock,shaft,bar,loop,...gl);
 const dh=new V3(.45,-.25,.86).normalize(),nn=new V3(-.25,1,.2);nn.addScaledVector(dh,-nn.dot(dh)).normalize();
 shov.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3().crossVectors(dh,nn).normalize(),dh,nn));
 shov.position.copy(dh).multiplyScalar(-1.2);
 sh.add(shov);VM.add(sh);sh.visible=false}
/* ---------- hotbar: 1 shovel, 2 ground probe, 3 flashlight, 4 garden light (3 and 4 unlock at the workbench). Left click uses the selected item. ---------- */
const hp=new THREE.Group(),hf=new THREE.Group(),hl=new THREE.Group(),pk=new THREE.Group(),su=new THREE.Group(),hfLens=new THREE.MeshBasicMaterial({color:0x555555}),hlLens=new THREE.MeshBasicMaterial({color:new THREE.Color(1.3,1.05,.55)});
{const st=mat(0xc5ced6,{roughness:.32,metalness:.62}),blk=mat(0x2a2d31,{roughness:.5,metalness:.6}),glv=mat(0x7a5530,{roughness:.9}),yel=mat(0xf0b400,{roughness:.45,metalness:.3}),rub=mat(0x1a1a1a,{roughness:.85}),M=(g,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);return o},fist=()=>{const f=M(new THREE.SphereGeometry(.058,12,9),glv);f.scale.set(1.25,1,1.1);return f};
 /* probe: T-handle with end grips, banded shaft, point down */
 hp.add(M(new THREE.CylinderGeometry(.011,.011,1.05,10),st,0,-.56),M(new THREE.ConeGeometry(.02,.12,10).rotateX(Math.PI),st,0,-1.15),
  M(new THREE.CylinderGeometry(.016,.016,.28,10).rotateZ(Math.PI/2),blk),M(new THREE.SphereGeometry(.02,8,6),rub,-.14),M(new THREE.SphereGeometry(.02,8,6),rub,.14),
  M(new THREE.CylinderGeometry(.014,.014,.03,8),yel,0,-.28),fist());
 /* flashlight: body along the view, collars around it, bezel and lens at the front */
 hf.add(M(new THREE.CylinderGeometry(.034,.034,.2,14).rotateX(Math.PI/2),blk,0,0,-.1),
  M(new THREE.CylinderGeometry(.04,.04,.012,12).rotateX(Math.PI/2),st,0,0,-.05),M(new THREE.CylinderGeometry(.04,.04,.012,12).rotateX(Math.PI/2),st,0,0,-.15),
  M(new THREE.CylinderGeometry(.05,.038,.07,14).rotateX(Math.PI/2),yel,0,0,-.23),M(new THREE.CylinderGeometry(.02,.02,.012,8).rotateZ(Math.PI/2),blk,0,.04,-.08),
  M(new THREE.CylinderGeometry(.036,.036,.016,12).rotateX(Math.PI/2),blk,0,0,.015),
  M(new THREE.CircleGeometry(.042,16).rotateY(Math.PI),hfLens,0,0,-.268),fist());
 /* garden light: the same flood head as the tripod, small enough to carry */
 hl.add(M(new THREE.BoxGeometry(.28,.18,.09),yel,0,.1,-.12),M(new THREE.BoxGeometry(.32,.22,.02),blk,0,.1,-.07),M(new THREE.BoxGeometry(.32,.03,.1),blk,0,.21,-.1),
  M(new THREE.PlaneGeometry(.22,.13).rotateY(Math.PI),hlLens,0,.1,-.168));
 for(let k=-2;k<=2;k++)hl.add(M(new THREE.BoxGeometry(.008,.14,.008),blk,k*.04,.1,-.176));
 hl.add(M(new THREE.CylinderGeometry(.014,.014,.12,8),blk,0,0,-.1),fist());
 /* pickaxe, same grip frame as the shovel: head at the striking end, gloves last so co-op hands can grab them */
 const pkWd=mat(0xffffff,{map:wood,roughness:.7}),pick=new THREE.Group(),head=new THREE.Group();
 head.name='head';pkHead=head;
 head.add(M(new THREE.CylinderGeometry(.032,.032,.46,10).rotateZ(Math.PI/2),st,0,.22),
  M(new THREE.ConeGeometry(.04,.22,8).rotateZ(Math.PI/2),st,.28,.22),
  M(new THREE.BoxGeometry(.08,.05,.06),st,-.22,.2));
 const pkGl=[.98,.66].map(y=>M(new THREE.SphereGeometry(.058,12,9),glv,0,y));pkGl.forEach(g=>g.scale.set(1.05,1.5,1.05));
 pick.add(M(new THREE.CylinderGeometry(.02,.024,.82,12),pkWd,0,.72),head,
  M(new THREE.CylinderGeometry(.016,.016,.16,10).rotateZ(Math.PI/2),pkWd,0,1.16),...pkGl);
 const pdir=new V3(.45,-.25,.86).normalize(),pn=new V3(-.25,1,.2);pn.addScaledVector(pdir,-pn.dot(pdir)).normalize();
 pick.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3().crossVectors(pdir,pn).normalize(),pdir,pn));
 pick.position.copy(pdir).multiplyScalar(-1.2);pk.add(pick);
 /* dev-only bore: a fat drill. Slot 6, only on a local host with dev: true in config.js */
 su.add(M(new THREE.CylinderGeometry(.07,.09,.55,10),yel,0,-.15),M(new THREE.ConeGeometry(.16,.32,8).rotateX(Math.PI),yel,0,-.55),fist());
 for(const g of[hp,hf,hl,pk,su]){g.traverse(o=>{if(o.isMesh)o.castShadow=false});g.visible=false;VM.add(g)}}
const HB=[
 {n:'Shovel',ok:()=>1,show:()=>1},
 {n:'Ground probe',ok:()=>1,show:()=>1},
 {n:'Flashlight',ok:()=>Prog.up.lantern>0,show:()=>Prog.up.lantern>0},
 {n:'Garden light',ok:()=>Prog.up.lamps>0,show:()=>Prog.up.lamps>0},
 {n:'Pickaxe',ok:()=>Prog.up.pick>0,show:()=>Prog.up.pick>0},
 {n:'Super',ok:()=>DEV,show:()=>DEV},
 {n:'Ladder',ok:()=>Prog.up.ladders>0,show:()=>Prog.up.ladders>0},
 {n:'',ok:()=>0,show:()=>0}];
let sel=0,want=0,swapK=0,pa=0;/* sel = item in hand, want = item being raised, swapK = lowering/raising animation, pa = probe-push animation */
function hbShow(){document.querySelectorAll('.hb').forEach((e,i)=>{const h=HB[i],on=!!(h&&h.show());e.classList.toggle('on',on&&i===want);e.classList.toggle('empty',!on);e.classList.remove('lock')});$('hbName').textContent=HB[want]&&HB[want].show()?HB[want].n:''}
function hbSelect(i){if(i===want||i<0||i>=HB.length||!HB[i].ok())return;want=i;holding=false;hbShow()}
/* ---------- push mower: deck, wheels, engine, bag, handle. Spawned near the house path each yard ---------- */
const mower=new THREE.Group();{const body=mat(0xd23b2e,{roughness:.48,metalness:.14}),steel=mat(0xd5dbe0,{roughness:.3,metalness:.62}),dark=mat(0x1a1a1a,{roughness:.75,metalness:.3}),tyre=mat(0x161616,{roughness:.96}),canvas=mat(0xcbb98a,{roughness:.94});
 const add=m=>{m.castShadow=m.receiveShadow=true;mower.add(m);return m};
 const rod=(r,a,b,mt)=>{const d=b.clone().sub(a),len=Math.max(.001,d.length()),m=add(new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,7),mt));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new V3(0,1,0),d.multiplyScalar(1/len));return m};
 add(new THREE.Mesh(new THREE.CylinderGeometry(.33,.36,.09,20),body)).position.set(0,.2,.06);
 const housing=add(new THREE.Mesh(new THREE.BoxGeometry(.64,.09,.36),body));housing.position.set(0,.2,-.14);
 add(new THREE.Mesh(new THREE.BoxGeometry(.68,.035,.7),dark)).position.set(0,.145,-.02);
 const stripe=add(new THREE.Mesh(new THREE.BoxGeometry(.46,.012,.07),mat(0xf6f1e6,{roughness:.45})));stripe.position.set(0,.248,.1);
 add(new THREE.Mesh(new THREE.BoxGeometry(.46,.025,.05),steel)).position.set(0,.175,.4);
 const flap=add(new THREE.Mesh(new THREE.BoxGeometry(.48,.12,.016),dark));flap.position.set(0,.11,-.34);flap.rotation.x=.45;
 add(new THREE.Mesh(new THREE.BoxGeometry(.24,.15,.26),dark)).position.set(0,.32,.02);
 add(new THREE.Mesh(new THREE.CylinderGeometry(.085,.095,.07,14),dark)).position.set(0,.43,.02);
 add(new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.025,10),body)).position.set(.05,.475,-.02);
 const muff=add(new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.16,8),steel));muff.rotation.z=Math.PI/2;muff.position.set(.18,.34,.02);
 add(new THREE.Mesh(new THREE.BoxGeometry(.07,.09,.09),dark)).position.set(-.15,.33,.02);
 const chute=add(new THREE.Mesh(new THREE.BoxGeometry(.16,.07,.2),body));chute.position.set(0,.3,-.32);chute.rotation.x=-.4;
 const bag=add(new THREE.Mesh(new THREE.BoxGeometry(.4,.3,.2),canvas));bag.position.set(0,.44,-.5);bag.rotation.x=.12;
 add(new THREE.Mesh(new THREE.BoxGeometry(.42,.035,.22),dark)).position.set(0,.58,-.46);
 mower.wheels=[];
 const wheel=(x,z,rad)=>{const g=new THREE.Group();g.position.set(x,rad,z);g.rotation.z=Math.PI/2;mower.add(g);
  [new THREE.Mesh(new THREE.CylinderGeometry(rad,rad,.055,16),tyre),new THREE.Mesh(new THREE.CylinderGeometry(rad*.4,rad*.4,.064,12),steel),new THREE.Mesh(new THREE.CylinderGeometry(rad*.16,rad*.16,.078,8),dark)].forEach(p=>{p.castShadow=true;g.add(p);mower.wheels.push(p)})};
 wheel(-.36,.34,.085);wheel(.36,.34,.085);wheel(-.38,-.18,.155);wheel(.38,-.18,.155);
 rod(.012,new V3(-.36,.085,.34),new V3(.36,.085,.34),steel);rod(.015,new V3(-.38,.155,-.18),new V3(.38,.155,-.18),steel);
 const Lg=new V3(-.22,.92,-.88),Rg=new V3(.22,.92,-.88);
 rod(.015,new V3(-.22,.24,-.1),Lg,steel);rod(.015,new V3(.22,.24,-.1),Rg,steel);
 rod(.017,Lg,Rg,mat(0x111111,{roughness:.85}));
 rod(.011,new V3(-.2,.84,-.74),new V3(.2,.84,-.74),dark);
 scene.add(mower)}
const MTURN=.8;/* max mower turn rate while pushed, rad/s */
let mh=0,mowerHeld=false,mowerOn=false,mowerOwner=null,mowerTarget=null,clipM,mowX,mowZ;/* mowerHeld: I own it; mowerOwner: id of whoever does (co-op) */
function placeMower(){mowerHeld=false;mowerOn=false;mowerOwner=null;mowerTarget=null;mowX=undefined;mowQ.length=0;mower.position.set(MOWS[0],world.hAt(MOWS[0],MOWS[1]),MOWS[1]);mower.rotation.set(0,0,0);if(clipM){clipM.gain.gain.value=0;clipM.blade.gain.value=0}}
/* ---------- carried rock (drawn in the hands; the instance stays hidden in `rocks`) ---------- */
let carry=-1,carryF=-1,carryFM=null;const carryM=new THREE.Mesh(rockG,mat(0xffffff,{roughness:.95})),PILE=8,pile=[],pileG=new THREE.Group();
carryM.castShadow=true;carryM.visible=false;VM.add(carryM,pileG);pileG.visible=false;
const plainRock=q=>!!q&&!q.gem&&q.s<=.32,handsBusy=()=>mowerHeld||carry>=0||pile.length>0||carryF>=0;
function showPile(){while(pileG.children.length){const m=pileG.children[0];pileG.remove(m);m.material.dispose()}
 pile.forEach((n,i)=>{const q=rk[n];if(!q)return;const m=new THREE.Mesh(rockG,new THREE.MeshStandardMaterial({roughness:.95}));m.material.color.fromArray(rocks.instanceColor.array,n*3);
  const a=i*1.1;m.position.set(Math.cos(a)*.08,i*.032,Math.sin(a)*.05);m.scale.set(q.s*q.w,q.s,q.s*q.w);m.castShadow=true;pileG.add(m)});pileG.visible=!!pile.length}
function hideRock(n){go.position.set(0,-50,0);go.scale.setScalar(0);go.updateMatrix();rocks.setMatrixAt(n,go.matrix)}
function scoop(n){const out=[],room=PILE-pile.length,q0=rk[n],ok=i=>{const q=rk[i];return q&&!q.held&&plainRock(q)&&!world.solidAt(q.x,q.y,q.z)&&Math.hypot(q.x-px,q.z-pz)<=REACH&&Math.abs(q.y-py)<=REACH};
 if(q0&&!q0.held&&plainRock(q0))out.push(n);for(let i=0;i<RN&&out.length<room;i++)if(i!==n&&ok(i))out.push(i);return out}
function clearCarryF(){carryF=-1;if(carryFM){VM.remove(carryFM);carryFM=null}}
function holdFind(n){if(carryFM)VM.remove(carryFM);carryF=n;const f=world.finds[n];carryFM=f.m.clone(true);carryFM.visible=true;carryFM.traverse(o=>{if(o.isMesh)o.castShadow=true});carryFM.scale.setScalar(Math.min(2.4,.1/Math.max(.03,f.sz)));VM.add(carryFM)}
const rings=[],rgeo=new THREE.RingGeometry(.985,1,120).rotateX(-Math.PI/2);
function addRing(x,z,r){const m=new THREE.Mesh(rgeo,new THREE.MeshBasicMaterial({color:0x7fe0ff,transparent:true,opacity:.6,depthTest:false,toneMapped:false}));m.position.set(x,.35,z);m.scale.setScalar(.01);m.renderOrder=5;scene.add(m);rings.push({m,r,t:0});if(rings.length>30){scene.remove(rings.shift().m)}}
const pg=new THREE.IcosahedronGeometry(.07,0);
/* dig-particle colour matching the layer at depth d (d<0 = grass tuft), with a little per-chunk variation */
function soilCol(d,n){const gr=d<0;if(!gr)soilRGB(d,n);const sh=(.8+.35*Math.random())*.8,r=gr?.2:SC[0],g=gr?.42:SC[1],b=gr?.12:SC[2];return new THREE.Color(L2(r*sh),L2(g*sh),L2(b*sh))}
/* dust-puff colour for the layer: a paler, lit version of the soil */
function dustRGB(d,n){soilRGB(d,n);return{r:L2(SC[0]*1.05)+.02,gc:L2(SC[1]*1.05)+.02,b:L2(SC[2]*1.05)+.02}}
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
/* ---------- debris: instanced chunks, one draw call per pool (soil, water). They bounce, slide to a stop, spin, and shrink out at the end ---------- */
function debrisPool(max,m,shadow,grav,die){const im=new THREE.InstancedMesh(pg,m,max),L=[],o=new THREE.Object3D();im.castShadow=shadow;im.receiveShadow=!die;im.frustumCulled=false;
 if(!m.isMeshBasicMaterial)im.setColorAt(0,new THREE.Color());/* allocate the colour buffer at full capacity before count drops (r128) */im.count=0;scene.add(im);
 return{im,L,clear(){L.length=0;im.count=0},
  add(p,v,life,s,c){if(L.length<max)L.push({x:p.x,y:p.y,z:p.z,vx:v.x,vy:v.y,vz:v.z,t:0,life,s,c,a:Math.random()*6,b:Math.random()*6,sa:(Math.random()-.5)*16,sb:(Math.random()-.5)*16,rest:0})},
  step(dt){for(let i=L.length-1;i>=0;i--){const q=L[i];q.t+=dt;let dead=q.t>=q.life;
    if(!dead&&!q.rest){q.vy-=grav*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;q.a+=q.sa*dt;q.b+=q.sb*dt;const g=world.floorAt(q.x,q.z,q.y)+q.s*.045;
     if(q.y<g){if(die)dead=true;else{q.y=g;if(q.vy<-1.6){q.vy*=-.3;q.vx*=.55;q.vz*=.55;q.sa*=.5;q.sb*=.5}else{q.vy=0;const f=Math.max(0,1-dt*9);q.vx*=f;q.vz*=f;q.sa*=f;q.sb*=f;if(Math.hypot(q.vx,q.vz)<.08)q.rest=1}}}}
    if(dead){L[i]=L[L.length-1];L.pop()}}
   let n=0;for(const q of L){o.position.set(q.x,q.y,q.z);o.rotation.set(q.a,q.b,0);o.scale.setScalar(q.s*Math.min(1,(q.life-q.t)/.3));o.updateMatrix();im.setMatrixAt(n,o.matrix);if(q.c)im.setColorAt(n,q.c);n++}
   im.count=n;if(n){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true}}}}
const SOIL=debrisPool(700,new THREE.MeshStandardMaterial({roughness:1}),true,11,false),WATERP=debrisPool(360,new THREE.MeshBasicMaterial({color:0x9fd4ff,transparent:true,opacity:.8}),false,7,true);
function spawn(p,v,life,w,c,sc){if(w)WATERP.add(p,v,life,sc!=null?sc:.7);else SOIL.add(p,v,life,sc!=null?sc:.6+Math.random()*1.1,c)}
function stepParts(dt){SOIL.step(dt);WATERP.step(dt)}
/* ---------- soft particles: camera-facing soft discs, one draw call per pool. DUST/HAZE blend normally and follow the daylight, GLOW is additive (sparkles) ---------- */
const FXG=new THREE.Group();scene.add(FXG);/* effects hidden from the depth pass */
const SPK={value:500};/* pixels per metre at 1 m: drawing-buffer height / (2 tan(fov/2)) */
function softPool(max,add){const g=new THREE.BufferGeometry(),P=new Float32Array(max*3),Cc=new Float32Array(max*4),Sz=new Float32Array(max),L=[];
 g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('aC',new THREE.BufferAttribute(Cc,4));g.setAttribute('aS',new THREE.BufferAttribute(Sz,1));
 const m=new THREE.ShaderMaterial({uniforms:{uK:SPK,uL:{value:1}},transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,
  vertexShader:'attribute vec4 aC;attribute float aS;uniform float uK;varying vec4 vC;void main(){vC=aC;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(512.,aS*uK/max(.05,-mv.z));}',
  fragmentShader:'uniform float uL;varying vec4 vC;void main(){vec2 q=gl_PointCoord*2.-1.;float r=dot(q,q);if(r>1.)discard;float a=vC.a*(1.-r)*(1.-r);gl_FragColor=vec4(vC.rgb*uL,a);}'});
 const pts=new THREE.Points(g,m);pts.frustumCulled=false;FXG.add(pts);
 /* particle: position, velocity, g = gravity (negative rises), dr = drag, life, s0 -> s1 size in m, a0 alpha, r/gc/b colour, tw = twinkle phase (or undefined) */
 return{m,L,add(o){if(L.length<max){o.t=0;L.push(o)}},clear(){L.length=0;g.setDrawRange(0,0)},
  step(dt){let n=0;for(let i=L.length-1;i>=0;i--){const q=L[i];q.t+=dt;if(q.t>=q.life){L[i]=L[L.length-1];L.pop();continue}
    const k=Math.max(0,1-q.dr*dt);q.vx*=k;q.vy=q.vy*k-q.g*dt;q.vz*=k;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt}
   for(const q of L){const u=q.t/q.life,a=q.a0*Math.min(1,q.t/(q.life*.12+1e-3))*Math.pow(1-u,1.3)*(q.tw!=null?.55+.45*Math.sin(q.t*34+q.tw):1);
    P[n*3]=q.x;P[n*3+1]=q.y;P[n*3+2]=q.z;Cc[n*4]=q.r;Cc[n*4+1]=q.gc;Cc[n*4+2]=q.b;Cc[n*4+3]=a;Sz[n]=q.s0+(q.s1-q.s0)*u;n++}
   g.setDrawRange(0,n);if(n){g.attributes.position.needsUpdate=g.attributes.aC.needsUpdate=g.attributes.aS.needsUpdate=true}}}}
const DUST=softPool(400,false),GLOW=softPool(300,true),POOLS=[DUST,GLOW];
/* rarity beam: a soft vertical shaft over Rare and better finds, until someone picks them up */
const beamTex=cvTex(16,128,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.75,'rgba(255,255,255,.35)');g.addColorStop(1,'rgba(255,255,255,1)');x.fillStyle=g;x.fillRect(0,0,w,h)}),
 beamG=new THREE.CylinderGeometry(.045,.1,4,12,1,true).translate(0,2,0),BEAMS=new Set();beamTex.wrapT=THREE.ClampToEdgeWrapping;
function addBeam(f){if(f.beam)return;const c=TIER[f.tier][2],m=new THREE.Mesh(beamG,new THREE.MeshBasicMaterial({map:beamTex,color:new THREE.Color(c[0]*.35,c[1]*.35,c[2]*.35),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false,toneMapped:false}));
 f.beam=m;FXG.add(m);BEAMS.add(f)}
function stepBeams(){for(const f of BEAMS){if(!findOut(f)){FXG.remove(f.beam);f.beam.material.dispose();f.beam=null;BEAMS.delete(f);continue}f.beam.position.set(f.x,f.y-f.sz,f.z);f.beam.material.opacity=.55+.25*Math.sin(T*3+f.a*5)}}
function clearFx(){for(const f of BEAMS){FXG.remove(f.beam);f.beam.material.dispose();f.beam=null}BEAMS.clear();POOLS.forEach(p=>p.clear())}
/* a find comes out of the soil: sparkle burst in its tier colour, a chime, a beam for Rare and up */
function revealFind(f){const c=TIER[f.tier][2],d=Math.hypot(f.x-px,f.y-ey,f.z-pz);
 for(let i=0;i<10+f.tier*12;i++){const a=Math.random()*6.283,sp=.3+Math.random()*1.1;GLOW.add({x:f.x,y:f.y+.02,z:f.z,vx:Math.cos(a)*sp,vy:.8+Math.random()*2.2,vz:Math.sin(a)*sp,g:2.6,dr:2.4,life:.6+Math.random()*.7,s0:.06+.02*f.tier,s1:.015,a0:1,r:c[0],gc:c[1],b:c[2],tw:Math.random()*6})}
 if(f.tier>0)addBeam(f);if(d<16)chime(f.tier,1-d/16);
 if(d<16||f.tier>1)toast(`${findName(f.kind)} uncovered${d<16?'':' somewhere in the yard'}`,f.tier)}
/* rising arpeggio, one note more per tier */
function chime(tier,v=1){if(!AC)return;[[880],[784,1175],[659,988,1319],[523,784,1047,1568]][tier].forEach((fq,i)=>{const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+i*.09;o.type=i%2?'triangle':'sine';o.frequency.value=fq;
  g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.11*v,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.9);o.connect(g);g.connect(OUT);o.start(t);o.stop(t+.95)});if(tier>2)grain(12,.7,'highpass',5000,9000,.05*v,.1)}

/* ---------- audio (synthesized) ---------- */
let AC,NB,OUT,LPF,hissG,rainSnd,gasSnd;/* OUT: master bus, through LPF (muffles everything underwater) */
const VOL=[0,.45,1];
function applyVol(){if(OUT)OUT.gain.value=VOL[SET.vol]}
function audio(){if(AC){AC.resume();applyVol();return}AC=new(window.AudioContext||window.webkitAudioContext)();NB=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 OUT=AC.createGain();applyVol();LPF=AC.createBiquadFilter();LPF.type='lowpass';LPF.frequency.value=20000;OUT.connect(LPF);LPF.connect(AC.destination);
 const lp=(type,fq,g)=>{const s=AC.createBufferSource();s.buffer=NB;s.loop=true;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=fq;const o=AC.createGain();o.gain.value=g;s.connect(f);f.connect(o);o.connect(OUT);s.start();return o};
 lp('lowpass',350,.06);hissG=lp('bandpass',3200,0);rainSnd=lp('highpass',1500,0);gasSnd=lp('bandpass',2200,0);
 /* mower: a droning single-cylinder engine (two slightly detuned saws) plus a quiet blade whir */
 const mo=AC.createOscillator(),mo2=AC.createOscillator(),mb=AC.createOscillator();mo.type=mo2.type='sawtooth';mb.type='triangle';mo.frequency.value=62;mo2.frequency.value=63.5;mb.frequency.value=190;
 const mf=AC.createBiquadFilter();mf.type='lowpass';mf.frequency.value=420;mf.Q.value=.7;const mg=AC.createGain();mg.gain.value=0;const mbg=AC.createGain();mbg.gain.value=0;
 mo.connect(mf);mo2.connect(mf);mf.connect(mg);mb.connect(mbg);mg.connect(OUT);mbg.connect(OUT);mo.start();mo2.start();mb.start();clipM={gain:mg,blade:mbg};
 const po=AC.createOscillator(),po2=AC.createOscillator();po.type='sawtooth';po2.type='triangle';po.frequency.value=48;po2.frequency.value=97;
 const pf=AC.createBiquadFilter();pf.type='lowpass';pf.frequency.value=260;const pg=AC.createGain();pg.gain.value=0;
 po.connect(pf);po2.connect(pf);pf.connect(pg);pg.connect(OUT);po.start();po2.start();clipP={gain:pg}}
function nz(type,fq,dur,vol,dl=0){if(!AC)return;const s=AC.createBufferSource();s.buffer=NB;const f=AC.createBiquadFilter();f.type=type;f.frequency.value=fq;const g=AC.createGain(),t=AC.currentTime+dl;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(OUT);s.start(t,Math.random(),dur)}
function grain(n,span,type,f0,f1,vol,dl=0){for(let i=0;i<n;i++)nz(type,f0+Math.random()*(f1-f0),.04,vol*(.5+Math.random()*.5),dl+Math.random()*span)}
function sweep(type,f0,f1,dur,vol,dl=0){if(!AC)return;const s=AC.createBufferSource();s.buffer=NB;const f=AC.createBiquadFilter();f.type=type;f.Q.value=2;const g=AC.createGain(),t=AC.currentTime+dl;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(vol,t+dur*.2);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(OUT);s.start(t,Math.random(),dur)}
/* shovel bites in (gritty scrape), lifts, then the load thumps and showers off */
function thud(){sweep('bandpass',3600,800,.2,.4);grain(10,.2,'bandpass',900,3400,.25);nz('lowpass',280,.4,1,.26);nz('lowpass',1100,.18,.4,.26);grain(16,.4,'lowpass',250,800,.2,.28);if(Math.random()<.2)grain(2,.1,'highpass',4000,6000,.2,.12)}
function clank(){nz('highpass',2400,.08,.4);nz('bandpass',680,.14,.35);nz('lowpass',160,.1,.3)}
function ping(){if(!AC)return;const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type='sine';o.frequency.setValueAtTime(740,t);o.frequency.exponentialRampToValueAtTime(1480,t+.08);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.16,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(OUT);o.start(t);o.stop(t+.32)}
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
 comp=sm(`uniform sampler2D tC,tD,tB;uniform vec2 sun,res,tx;uniform float sI,asp,nr,fr,tm,uN,uW,uG,uE,aoD;
const vec4 UF=(255./256.)/vec4(16777216.,65536.,256.,1.);
float ld(vec2 u){float z=dot(texture2D(tD,u),UF)*2.-1.;return 2.*nr*fr/(fr+nr-z*(fr-nr));}
vec3 vp(vec2 u){float z=ld(u);return vec3((u*2.-1.)*vec2(asp,1.)*.7*z,-z);}
float hs(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 float z=ld(v),ao=1.;
 if(z<aoD){vec3 P=vp(v),Px=vp(v+vec2(tx.x,0.)),Mx=vp(v-vec2(tx.x,0.)),Py=vp(v+vec2(0.,tx.y)),My=vp(v-vec2(0.,tx.y));
  vec3 dx=abs(Px.z-P.z)<abs(P.z-Mx.z)?Px-P:P-Mx,dy=abs(Py.z-P.z)<abs(P.z-My.z)?Py-P:P-My,N=normalize(cross(dx,dy));if(N.z<0.)N=-N;
  float a=hs(v*res)*6.283,cs=cos(a),sn=sin(a),occ=0.,Rw=.9;
  for(int i=0;i<12;i++){float fi=float(i),r=sqrt((fi+.5)/12.),b=fi*2.39996;vec2 o=vec2(cos(b),sin(b))*r;o=vec2(o.x*cs-o.y*sn,o.x*sn+o.y*cs);
   vec3 w=vp(v+o*vec2(1./asp,1.)*Rw*.714/z)-P;float d=length(w);occ+=max(0.,dot(N,w/d)-.2)*(1.-smoothstep(.25,Rw,d));}
  ao=clamp(1.-occ/12.*2.6,.3,1.);}
 vec3 bl=texture2D(tB,v).rgb;vec2 dir=(sun-v)/20.*.95,u=v;vec3 ry=vec3(0.);float il=1.;
 for(int i=0;i<20;i++){u+=dir;ry+=texture2D(tB,u).rgb*il;il*=.93;}
 vec2 q=v-.5,wv=v+(uW*.0025+uG*.004)*vec2(sin(v.y*38.+tm*2.1),cos(v.x*31.+tm*1.7));vec3 col=vec3(texture2D(tC,wv+q*(.0012+uG*.006)).r,texture2D(tC,wv).g,texture2D(tC,wv-q*(.0012+uG*.006)).b);
 col*=mix(1.,ao,.9);col+=bl*.38+ry*sI*.07;col*=1.25*(1.+.25*uN)*uE;col=mix(col,vec3(dot(col,vec3(.3,.59,.11)))*vec3(.8,.95,1.3),uN*.5);/* night: cooler, slightly desaturated, a touch brighter so it is dark but readable */
 col=mix(col,col*vec3(.3,.55,.5)+vec3(.004,.012,.011)*min(z,8.),uW);/* underwater: murky green, thicker with distance */
 col=mix(col,col*vec3(1.05,1.1,.55)+vec3(.03,.035,0.),uG);/* gas: sickly yellow-green */
 col=(col*(2.51*col+.03))/(col*(2.43*col+.59)+.14);
 float l=dot(col,vec3(.299,.587,.114));col=mix(vec3(l),col,1.2);col*=mix(vec3(.94,1.,1.08),vec3(1.07,1.,.9),smoothstep(.1,.8,l));
 col=pow(max(col,0.),vec3(1./2.2));col=mix(col,col*col*(3.-2.*col),.3);
 col*=1.-.4*smoothstep(.4,1.05,length(q*vec2(asp,1.)*1.15));col+=(hs(v*res+tm)-.5)*.018;
 gl_FragColor=vec4(col,1.);}`,{tC:{value:null},tD:{value:null},tB:{value:null},sun:{value:new THREE.Vector2()},res:{value:new THREE.Vector2(1,1)},tx:{value:new THREE.Vector2()},sI:{value:0},asp:{value:1},nr:{value:cam.near},fr:{value:cam.far},tm:{value:0},uN:{value:0},uW:{value:0},uG:{value:0},uE:{value:1},aoD:{value:90}});
const depthMat=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),sdir=sun.position.clone().normalize(),sv=new V3();
const gl=cvTex(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.15,'rgba(255,240,200,.8)');g.addColorStop(1,'rgba(255,200,120,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});
const sunS=[[70,.9,.7,.4],[9,8,7,5]].map(([z,r,g,b])=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gl,color:new THREE.Color(r,g,b),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));sp.scale.setScalar(z);sp.userData.z=z;scene.add(sp);return sp});
/* ---------- day / night: one clock drives sun, moon, sky, fog, ambient and the night lights ---------- */
const DAY_LEN=600,DAY0=.27;/* seconds per full day; start time (0 = midnight, .5 = noon). About 3.5 of the 10 minutes are night */
let dayT=DAY0,dayF=1,nightF=0,sunVis=1,clipFar=160;
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
 /* a single directional light: the sun by day, a dim blue moon by night; the swap happens while both are ~0 so nothing pops.
    Shadow volume follows the player, snapped to whole shadow-map texels so the edges don't shimmer */
 const snap=(2*SH_R)/2048,tx=Math.round(px/snap)*snap,tz=Math.round(pz/snap)*snap,ldir=ny>=0?sdir:_v.copy(sdir).negate();
 sun.target.position.set(tx,0,tz);sun.position.copy(ldir).multiplyScalar(19.2).add(sun.target.position);sun.target.updateMatrixWorld();
 /* cloud flattens the sun into gray fill; rain nearly removes it, so shadows go soft then almost vanish */
 const sunK=1-.75*cloudAmt-.19*rainAmt,fillK=1+.2*cloudAmt-.62*rainAmt;
 const I=(ny>=0?1.8*sstep(0,.3,ny):.34*sstep(0,.3,-ny))*Math.max(.06,sunK);
 sun.color.copy(ny>=0?CL.sun:CL.moon);if(ny>=0){sun.color.lerp(CL.warm,warm*(1-cloudAmt));sun.color.lerp(_c.setRGB(.72,.78,.84),cloudAmt)}
 /* half the light lives on the baked neighbourhood map (houses, fences, trees), half on the tight player follow */
 bake.color.copy(sun.color);bake.intensity=I*.5;sun.intensity=I*.5;
 bake.target.position.set(0,0,4+DEL*.35);bake.position.copy(ldir).multiplyScalar(70).add(bake.target.position);bake.target.updateMatrixWorld();
 if(bakeNeed||bakeDir.distanceToSquared(sdir)>.0025){bakeDir.copy(sdir);bakeNeed=true}
 const bolt=rainAmt>.55&&((dayT*DAY_LEN)%47)<.18;
 hemi.color.copy(CL.hsN).lerp(CL.hs,df);hemi.color.lerp(_c.setRGB(.62,.67,.72),cloudAmt*df);hemi.color.lerp(_c.setRGB(.32,.38,.46),rainAmt*Math.max(df,.4));
 hemi.groundColor.copy(CL.hgN).lerp(CL.hg,df);hemi.groundColor.lerp(_c.setRGB(.18,.2,.22),Math.max(cloudAmt,rainAmt)*.65);
 hemi.intensity=(.22+.48*df)*Math.max(.35,fillK)+(bolt?1.6:0);
 if(bolt&&!wasBolt){nz('lowpass',60,.9,.4);nz('lowpass',160,.3,.18);addTrauma(.14)}wasBolt=bolt;
 scene.fog.color.copy(CL.fogN).lerp(CL.fog,df).lerp(CL.fogW,warm*.4*(1-cloudAmt));
 scene.fog.color.lerp(_c.setRGB(.5,.56,.62),cloudAmt*.8*df);scene.fog.color.lerp(_c.setRGB(.035,.042,.055),cloudAmt*(1-df));
 const vf=[.55,1,1.45][SET.view];scene.fog.near=(35-18*rainAmt)*vf;scene.fog.far=(150-85*rainAmt)*vf;clipFar=Math.min(280,scene.fog.far+22);
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
const rainMat=new THREE.LineBasicMaterial({color:0xd7e4ee,transparent:true,opacity:0,depthWrite:false,fog:false}),rainLines=new THREE.LineSegments(rainGeo,rainMat);
rainLines.frustumCulled=false;rainLines.renderOrder=2;scene.add(rainLines);
function rainDrop(i,y){const o=cam.position,a=Math.random()*6.283,r=Math.sqrt(Math.random())*16,x=o.x+Math.cos(a)*r,z=o.z+Math.sin(a)*r,yy=y!=null?y:o.y+2+Math.random()*14,k=i*6;
 rainP[k]=x;rainP[k+1]=yy;rainP[k+2]=z;rainP[k+3]=x+.16;rainP[k+4]=yy-.72;rainP[k+5]=z+.04;rainSp[i]=12+Math.random()*14}
for(let i=0;i<RDN;i++)rainDrop(i);
function stepRain(dt){rainMat.color.setRGB(.78,.86,.94);rainMat.opacity=rainAmt*(.28+.4*dayF);rainLines.visible=rainAmt>.06;if(rainAmt<.06)return;const o=cam.position;
 for(let i=0;i<RDN;i++){const k=i*6,sp=rainSp[i]*dt;rainP[k+1]-=sp;rainP[k+4]-=sp;rainP[k]+=dt*2.6;rainP[k+3]+=dt*2.6;
  if(rainP[k+1]<o.y-7||Math.hypot(rainP[k]-o.x,rainP[k+2]-o.z)>18)rainDrop(i,o.y+4+Math.random()*12)}
 rainGeo.attributes.position.needsUpdate=true}
/* ---------- garden lights: bought at the workbench (Prog.up.lamps = how many you own), set on the ground (G) and wired to the wall socket ---------- */
const SOCK0=[5.9,-9.9],SOCK=[5.9,-9.9],CABLE_MAX=50,GL_R=7,GLN=4;/* socket on the house front wall (below the right shutter); cable reach and lit radius in m; max lamps */
let pumpOn=false,pumpK=0,clipP;
let glOn=false,glK=0,glDirty=false;const GS=Array(GLN).fill(null);/* placed lamps: {x,z} or null */
const glBulbs=[0,1,2,3].map(()=>new THREE.MeshBasicMaterial({color:new THREE.Color(5,4,2.4)})),glLights=[],glObj=[],glCab=[],glCab2=[],glSpark=[],glSparkM=new THREE.MeshBasicMaterial({color:new THREE.Color(6,5,3)}),sockLed=new THREE.MeshBasicMaterial({color:new THREE.Color(.5,.05,.04)});
/* outdoor outlet plate with a rocker switch and a status LED (red = off, green = on) */
PARENT=houseG;box(.17,.28,.04,0xe8e4d8,SOCK0[0],1.0,-9.98,{roughness:.5});box(.075,.12,.03,0x22252a,SOCK0[0],1.06,-9.955);box(.1,.07,.02,0xcfcbc0,SOCK0[0],.93,-9.955);
{const led=new THREE.Mesh(new THREE.SphereGeometry(.014,8,6),sockLed);led.position.set(SOCK0[0]+.055,1.11,-9.955);houseG.add(led)}PARENT=scene;
/* construction-site work light: yellow tripod, mast, tilted flood head with a visor and grille */
const GL_H=2.3,GL_I=.85;/* GL_I = work-light brightness *//* mast height in m */
{const gm=(g,c,o)=>{const m=new THREE.Mesh(g,mat(c,o));m.castShadow=true;return m},paint={roughness:.45,metalness:.3},steel={roughness:.5,metalness:.6},Y=0xf0b400,UP=new V3(0,1,0);
 for(let i=0;i<GLN;i++){const g=new THREE.Group(),mids=[];
  g.add(gm(new THREE.CylinderGeometry(.03,.036,GL_H,8).translate(0,GL_H/2,0),Y,paint),gm(new THREE.CylinderGeometry(.05,.05,.1,8).translate(0,.95,0),0x2a2d31,steel),gm(new THREE.CylinderGeometry(.045,.045,.06,8).translate(0,GL_H,0),0x2a2d31,steel));
  for(let k=0;k<3;k++){const a=k*Math.PI*2/3+.5,r=.62,e=new V3(Math.cos(a)*r,0,Math.sin(a)*r),s0=new V3(0,.95,0),d=e.clone().sub(s0),len=d.length(),leg=gm(new THREE.CylinderGeometry(.017,.017,len,6),Y,paint);
   leg.position.copy(s0).add(e).multiplyScalar(.5);leg.quaternion.setFromUnitVectors(UP,d.normalize());g.add(leg);
   const foot=gm(new THREE.CylinderGeometry(.045,.045,.025,8),0x1d1f22,steel);foot.position.set(e.x,.012,e.z);g.add(foot);mids.push(s0.clone().lerp(e,.5))}
  for(let k=0;k<3;k++){const a=mids[k],b=mids[(k+1)%3],d=b.clone().sub(a),len=d.length(),br=gm(new THREE.CylinderGeometry(.008,.008,len,5),0x2a2d31,steel);br.position.copy(a).add(b).multiplyScalar(.5);br.quaternion.setFromUnitVectors(UP,d.normalize());g.add(br)}
  const head=new THREE.Group();head.position.set(0,GL_H+.2,0);head.rotation.x=.42;
  head.add(gm(new THREE.BoxGeometry(.5,.34,.15),Y,paint),gm(new THREE.BoxGeometry(.54,.38,.03).translate(0,0,-.075),0x2a2d31,steel),
   gm(new THREE.BoxGeometry(.54,.04,.18).translate(0,.2,.02),0x2a2d31,steel));
  const lens=new THREE.Mesh(new THREE.PlaneGeometry(.42,.26).translate(0,0,.08),glBulbs[i]);head.add(lens);
  for(let k=-2;k<=2;k++)head.add(gm(new THREE.BoxGeometry(.01,.26,.01).translate(k*.08,0,.09),0x1d1f22,steel));
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
/* ladders: bought at the workbench, placed with T, climbed with W and S. 5 m tall */
const LN=4,LH=5,LS=Array(LN).fill(null),lObj=[];
{const wood=mat(0xc4a574,{roughness:.85});
 for(let i=0;i<LN;i++){const g=new THREE.Group();
  const rail=x=>{const m=new THREE.Mesh(new THREE.BoxGeometry(.06,LH,.045),wood);m.position.set(x,LH/2,0);m.castShadow=m.receiveShadow=true;g.add(m)};
  rail(-.18);rail(.18);
  for(let k=0;k<12;k++){const m=new THREE.Mesh(new THREE.BoxGeometry(.36,.04,.04),wood);m.position.set(0,.25+k*.4,0);m.castShadow=m.receiveShadow=true;g.add(m)}
  g.visible=false;scene.add(g);lObj[i]=g}}
const ldv=new THREE.Group();
{const w=mat(0xc4a574,{roughness:.85}),M=(g,x,y,z)=>{const m=new THREE.Mesh(g,w);m.position.set(x,y,z);ldv.add(m)};
 M(new THREE.BoxGeometry(.04,.7,.03),-.1,-.2,-.4);M(new THREE.BoxGeometry(.04,.7,.03),.1,-.2,-.4);
 for(let i=0;i<5;i++)M(new THREE.BoxGeometry(.2,.03,.03),0,-.45+i*.14,-.4)}
ldv.visible=false;VM.add(ldv);
function ladPlace(i,x,y,z){LS[i]={x,y,z};lObj[i].visible=true;lObj[i].position.set(x,y,z)}
function ladPick(i){LS[i]=null;lObj[i].visible=false}
function ladReset(){for(let i=0;i<LN;i++)if(LS[i])ladPick(i)}
function climbLad(){let best=null,bd=.55;for(const q of LS){if(!q)continue;const d=Math.hypot(px-q.x,pz-q.z);if(d<bd&&py>q.y-.35&&py<q.y+LH+.15){bd=d;best=q}}return best}
function ladTop(){return LS.some(q=>q&&Math.hypot(px-q.x,pz-q.z)<.45&&py>=q.y+LH-.45&&py<=q.y+LH+.2)}
const glLit=(x,z)=>glOn&&GS.some(q=>q&&q.cut==null&&Math.hypot(q.x-x,q.z-z)<GL_R);
function zap(i){nz('highpass',3200,.18,.4);sweep('bandpass',3000,500,.3,.35)}
function lampTick(dt){if(glDirty){glDirty=false;GS.forEach((q,i)=>q&&glCable(i))}
 glK+=((glOn?1:0)-glK)*Math.min(1,dt*8);sockLed.color.setRGB(.5*(1-glK)+.1,.05+1.6*glK,.04+.2*glK);
 const mm=mowerHeld&&mowerOn&&state==='play'&&!paused;
 for(let i=0;i<GLN;i++){const q=GS[i];if(!q){continue}const y=world.hAt(q.x,q.z),live=glOn&&q.cut==null;
  q.k+=((live?1:0)-q.k)*Math.min(1,dt*8);glObj[i].position.set(q.x,y,q.z);glLights[i].position.set(q.x,y+GL_H+.2,q.z);glLights[i].intensity=GL_I*q.k;glBulbs[i].color.setRGB(2.6,2.1,1.2).multiplyScalar(.1+.9*q.k);
  if(q.cut!=null){const sp=glSpark[i];sp.visible=Math.random()<(glOn?.55:.12);sp.scale.setScalar(.6+Math.random()*1.2)}
  else if(mm&&T>q.pend){const c=cabSeg(mower.position.x,mower.position.z,i);if(c.d<.5){q.pend=T+1.5;Net.send({type:'cable_cut',i,t:c.t,by:ME})}}}}
/* ---------- flood water: one plane over the yard at the water level. The soil tops hide it, so it only shows inside holes ---------- */
const WU={uSky:{value:new THREE.Color()}},waterMat=new THREE.MeshStandardMaterial({color:lin(0x2c4640),roughness:.06,metalness:.2,transparent:true,opacity:.82,side:THREE.DoubleSide}),
 water=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),waterMat);water.receiveShadow=true;water.visible=false;scene.add(water);
waterMat.onBeforeCompile=sd=>{sd.uniforms.uT=GU.uT;sd.uniforms.uSky=WU.uSky;
 sd.vertexShader='varying vec3 vWP;\n'+sd.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
 sd.fragmentShader='uniform float uT;uniform vec3 uSky;varying vec3 vWP;\n'+sd.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
  vec2 wq=vWP.xz;float w1=uT*1.3;vec2 gr=vec2(cos(wq.x*3.1+w1)+.6*cos(wq.x*5.3-wq.y*4.1+w1*1.7),cos(wq.y*2.7+w1*1.1)+.6*cos(wq.y*6.1+wq.x*3.3-w1*1.3))*.07;
  normal=normalize((viewMatrix*vec4(-gr.x,1.,-gr.y,0.)).xyz)*(gl_FrontFacing?1.:-1.);`).replace('#include <dithering_fragment>',`#include <dithering_fragment>
  gl_FragColor.rgb=mix(gl_FragColor.rgb,uSky,pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.)*.55*float(gl_FrontFacing));`)};
const waterY=()=>world?BED+(FLOOD_TOP-BED)*world.flood*world.flood:BED;
let uwK=0,under=false,expK=1;/* uwK: eased 0..1 for the underwater look; expK: fake eye adaptation */
function floodTick(dt){const W=world;if(!W)return;if(W.sig[0])W.shut=W.sig[0].on?1:0;const open=!W.shut&&W.exposed(),solo=Net.mode==='solo',span=(FLOOD_MIN[S]||15)*60*(solo?FLOOD_SOLO:1);
 const drain=(pumpOn&&Prog.up.pump)?PUMP_DRAIN[Prog.up.pump]:0;
 if(state==='play'&&(Net.mode!=='solo'||!paused)){if(W.shut)W.flood=Math.max(0,W.flood-dt/span*(.5+drain));
  else{const rise=(open?(solo?1.35:2):1)*(1-PUMP[Prog.up.pump])*(1+.3*rainAmt);W.flood=Math.max(0,Math.min(1,W.flood+dt/span*(rise-drain)))}}
 const wl=waterY(),p=W.flood*W.flood;water.visible=wl>BED+.03;water.position.y=wl;water.scale.set(S-.02,1,S-.02);WU.uSky.value.copy(scene.fog.color);
 if(state==='play'&&!W.shut){const k=[.5,.75,.9].findIndex((v,i)=>p>=v&&(W.fw|0)<=i);if(k>=0){W.fw=k+1;toast(['The water is halfway up the yard','The water is three-quarters up — find the buried things','The yard is about to flood!'][k]);nz('lowpass',220,.8,.5)}}
 if(Net.mode!=='client'&&state==='play'&&W.flood>=1&&!W.shut&&!W.lost){W.lost=1;Net.send({type:'flooded'})}
 const u=ey<wl;if(u!==under&&state==='play'){under=u;nz('lowpass',u?380:700,.4,.55);grain(8,.3,'bandpass',300,1400,.2)}
 uwK+=((under?1:0)-uwK)*Math.min(1,dt*6);if(AC&&LPF)LPF.frequency.setTargetAtTime(under?520:20000,AC.currentTime,.06);
 VU.uWet.value=rainAmt*.75;VU.uWL.value=wl;
 pumpK+=((pumpOn&&Prog.up.pump?1:0)-pumpK)*Math.min(1,dt*8);pumpLed.color.setRGB(.5+1.6*pumpK,.05+.85*pumpK,.04+.08*pumpK);
 if(AC&&clipP){const att=Math.max(.08,1-Math.hypot(px-PUMPP[0],pz-PUMPP[1])/16);clipP.gain.gain.setTargetAtTime(pumpOn&&Prog.up.pump&&state==='play'&&!paused?.045*att:0,AC.currentTime,.2)}
 $('wgF').style.height=(wl-BED)/-BED*100+'%';$('wgMe').style.bottom=Math.max(0,Math.min(100,(py-BED)/-BED*100))+'%';$('wg').classList.toggle('hi',p>.75&&!W.shut&&!pumpOn);$('wg').classList.toggle('on',pumpOn&&!!Prog.up.pump)}
/* ---------- hazards: a struck gas line (cloud, exposure meter), cave-ins (host warns, then drops the blocks), knockouts ---------- */
const GAS=new V3(),caveQ=[];let gasT=0,gasX=0,koT=0;/* gasT: seconds the cloud has left; gasX: my exposure (3 s = knocked out); caveQ: host's pending collapses */
const GAS_FEE=25,GAS_LEN=25;
function gasStart(p,t){GAS.set(p[0],p[1],p[2]);gasT=t}
function cough(){nz('bandpass',700+Math.random()*300,.1,.35);nz('lowpass',260,.14,.3,.03);nz('bandpass',900,.08,.25,.22)}
function gasTick(dt){const live=gasT>0;if(live&&(gasT-=dt)<=0)toast('The gas company capped the line');
 const d=Math.hypot(EYE.x-GAS.x,EYE.y-GAS.y,EYE.z-GAS.z),inside=live&&d<3.5&&state==='play'&&koT<=0;
 if(live&&Math.random()<dt*16){const a=Math.random()*6.283,r=Math.random()*.3;DUST.add({x:GAS.x+Math.cos(a)*r,y:GAS.y+.15,z:GAS.z+Math.sin(a)*r,vx:Math.cos(a)*.5,vy:.5+Math.random()*.6,vz:Math.sin(a)*.5,g:-.12,dr:.7,life:3+Math.random()*2.5,s0:.35,s1:1.9,a0:.2,r:.62,gc:.68,b:.22})}
 gasX=inside?gasX+dt:Math.max(0,gasX-dt*.7);if(inside&&Math.random()<dt*(.6+gasX))cough();if(gasX>=3)knockout('gas');
 if(AC&&gasSnd)gasSnd.gain.setTargetAtTime(live?Math.max(0,1-d/14)*.14*Math.min(1,gasT/3):0,AC.currentTime,.2);
 comp.uniforms.uG.value=Math.min(1,gasX/3)*.85+(inside?.12:0)}
function caveTick(dt){if(Net.mode==='client'||(Net.mode==='solo'&&paused))return;for(let i=caveQ.length-1;i>=0;i--){const c=caveQ[i];if((c.t-=dt)<=0){caveQ.splice(i,1);Net.send({type:'cavein',x:c.x,y:c.y,z:c.z})}}}
/* dirt trickles from ceilings near (x,z) */
function trickle(x,y,z,n,big){if(!isFinite(y))y=0;for(let k=0;k<n;k++){const cx=x+(Math.random()-.5)*2.4,cz=z+(Math.random()-.5)*2.4,f=world.floorAt(cx,cz,y),c=world.ceilAt(cx,cz,f+.01);if(c==null||c>y+3)continue;const q=digDepth(cx,cz);
  spawn(new V3(cx,c-.03,cz),new V3((Math.random()-.5)*.4,-Math.random()*.5,(Math.random()-.5)*.4),big?2:1.4,false,soilCol(Math.max(0,-c),q.n),big?.6+Math.random():.25+Math.random()*.3);
  if(Math.random()<.5)DUST.add({x:cx,y:c-.1,z:cz,vx:0,vy:-.3,vz:0,g:.2,dr:1.5,life:1.2,s0:.2,s1:big?1.2:.6,a0:big?.5:.3,...dustRGB(Math.max(0,-c),q.n)})}}
let koC='';
function knockout(c){if(koT>0||state!=='play')return;koT=2.6;koC=c;holding=false;addTrauma(.9);nz('lowpass',110,1.3,.8);
 $('ko').textContent=c==='gas'?'You passed out from the gas…':'Buried by a cave-in…';$('ko').classList.add('show');
 if(mowerHeld){Net.flushMow();Net.send({type:'mower_drop',x:mower.position.x,z:mower.position.z,ry:mower.rotation.y,on:0,fy:py,by:ME})}
 if(carry>=0)Net.send({type:'rock_place',n:carry,x:px,z:pz,by:ME});if(pile.length)Net.send({type:'rock_place',ns:pile.slice(),x:px,z:pz,by:ME});if(carryF>=0)Net.send({type:'find_place',n:carryF,x:px,z:pz,by:ME});
 Net.send({type:'ko',c,by:ME})}
/* fade to black, wake up by the workbench, fade back in */
function koTick(dt){if(koT<=0)return;const was=koT;koT-=dt;
 if(was>1.3&&koT<=1.3){px=BENCH[0]+.3;pz=BENCH[1]+2.2;py=world.floorAt(px,pz,1);ey=py+1.7;pvx=pvy=pvz=0;gasX=0;yaw=Math.PI;pitch=-.2}
 if(was>.7&&koT<=.7)$('ko').classList.remove('show')}
window.fxResize=(w,h)=>{rtC.setSize(w,h);rtD.setSize(w>>1,h>>1);rtB1.setSize(w>>2,h>>2);rtB2.setSize(w>>2,h>>2);const u=comp.uniforms;u.res.value.set(w,h);u.tx.value.set(2/w,2/h);u.asp.value=w/h};
function fitClip(){const far=Math.max(48,clipFar);if(Math.abs(cam.far-far)>.5){cam.far=far;cam.updateProjectionMatrix()}comp.uniforms.fr.value=cam.far;comp.uniforms.aoD.value=Math.min(110,scene.fog.far*.85);
 const skyR=far*.96,p=cam.position;skyMesh.position.copy(p);overMesh.position.copy(p);skyMesh.scale.setScalar(skyR/200);overMesh.scale.setScalar(skyR/196);stars.position.copy(p);stars.scale.setScalar(skyR/190)}
function fxRender(){
 const sd=Math.min(170,clipFar*.9),k=sd/170;
 sunS.forEach(q=>{q.position.copy(cam.position).addScaledVector(sdir,sd);q.scale.setScalar(q.userData.z*k)});
 moon.position.copy(cam.position).addScaledVector(sdir,-sd);moon.scale.setScalar(26*k);
 if(bakeNeed){/* hide movers so the wide map only holds houses, fences and trees */
  const hid=[VM,mower,voxG,rocks,findG,FXG,water,SOIL.im,WATERP.im,pipeG,...Net.tags(),...Net.bodies()].filter(Boolean),hvs=hid.map(o=>o.visible);
  hid.forEach(o=>o.visible=false);const sc=sun.castShadow;sun.castShadow=false;bake.shadow.needsUpdate=true;
  R.setRenderTarget(rtD);R.setClearColor(0xffffff,1);R.clear(true,true,true);R.render(scene,cam);
  sun.castShadow=sc;hid.forEach((o,i)=>o.visible=hvs[i]);bakeNeed=false}
 R.setRenderTarget(rtC);R.setClearColor(0x000000,1);R.clear(true,true,true);R.render(scene,cam);
 const os=[...sunS,moon,stars,FXG,water,...rings.map(q=>q.m),...Net.tags()],vs=os.map(o=>o.visible);os.forEach(o=>o.visible=false);
 R.shadowMap.autoUpdate=false;scene.overrideMaterial=depthMat;R.setRenderTarget(rtD);R.setClearColor(0xffffff,1);R.clear(true,true,true);R.render(scene,cam);
 scene.overrideMaterial=null;R.setClearColor(0x000000,1);R.shadowMap.autoUpdate=true;os.forEach((o,i)=>o.visible=vs[i]);
 bright.uniforms.t.value=rtC.texture;pass(bright,rtB1);
 for(const k of[1.5,3]){blur.uniforms.t.value=rtB1.texture;blur.uniforms.d.value.set(k/rtB1.width,0);pass(blur,rtB2);blur.uniforms.t.value=rtB2.texture;blur.uniforms.d.value.set(0,k/rtB1.height);pass(blur,rtB1)}
 const u=comp.uniforms;sv.copy(cam.position).addScaledVector(sdir,100).project(cam);u.sun.value.set(sv.x*.5+.5,sv.y*.5+.5);
 u.sI.value=Math.max(0,new V3(0,0,-1).applyQuaternion(cam.quaternion).dot(sdir)+.2)*sunVis*(1-cloudAmt);u.tC.value=rtC.texture;u.tD.value=rtD.texture;u.tB.value=rtB1.texture;u.tm.value=performance.now()/1000%100;
 pass(comp,null)}
resize();

/* ---------- game ---------- */
let state='intro',paused=false,locked=false,fallback=false,dragging=false,moved=0,px=0,py=0,pz=6,ey=1.7,pvx=0,pvy=0,pvz=0,yaw=0,pitch=-.35,aim=null,digDir=new V3(0,0,-1),cd=0,pc=0,holding=false,heldT=0,autoDug=false,geyser=false,elapsed=0,hudT=0,T=0,toastT=0,last=performance.now();
const keys={},free=(x,z)=>obst.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+.3);
function show(id){document.querySelectorAll('.scr').forEach(e=>e.classList.toggle('show',e.id===id))}
function toast(t,tier){const e=$('toast');if(tier==null)e.textContent=t;else{e.textContent='';const b=document.createElement('b');b.textContent=TIER[tier][0].toUpperCase()+' ';b.style.color=TIER[tier][1];e.append(b,t)}e.style.opacity=1;toastT=3.5}
const rndSeed=()=>Math.random()*1e9|0,menuScr=()=>{const p=Net.pend;Net.pend='';return p?'mp':'menu'};
let yardBuilt=false,wantSize=(()=>{try{const v=+localStorage.getItem('burstSize');if(SIZES.includes(v))return v}catch(e){}return 20})();/* wantSize: what the next yard will be (menu choice, remembered) */
function setYardSize(s,seed){if(!SIZES.includes(s))s=SIZES[0];if(yardBuilt&&s===S&&seed==null)return;
 layout(s,seed);GN=Math.round(26000*s*s/400);RN=Math.min(RNMAX,Math.round(700*s*s/400*rockSpan()/ROCK_BAND));grass.count=GN;rocks.count=RN;mown=new Uint8Array(MG*MG);
 houseG.position.z=-DEL;porchL.position.set(1.4,2,-9.2-DEL);benchL.position.set(BENCH[0]+.7,2.1,BENCH[1]+.5);
 buildTerrain();buildYard();buildOuter();applyShadows();yardBuilt=true}
function newGame(seed,size){const sd=seed==null?rndSeed():seed;Prog=freshProg();flashOn=false;sel=want=0;swapK=0;saveProg();/* every new yard starts from scratch: 80 points, no upgrades */setYardSize(size||(yardBuilt?S:wantSize),sd);world=new World(sd);Net.reset();FALL.clear();clearFx();tgt=null;hiKey='';hiG.clear();insp=cardT=0;$('card').className='';under=false;uwK=0;expK=1;glReset();ladReset();flying=false;dayT=DAY0;buildBuried();buildRocks();dropCarry(true);buildFinds();sync(true);buildGrass();placeMower();SOIL.clear();WATERP.clear();caveQ.length=0;gasT=gasX=koT=0;$('ko').classList.remove('show');swT=-1;pend=null;hitStop=trauma=dip=dipV=0;rings.forEach(q=>scene.remove(q.m));rings.length=0;geyser=false;pumpOn=false;pumpK=0;px=0;pz=YH-4;yaw=0;pitch=-.35;py=world.hAt(0,pz);ey=py+1.7;pvx=pvy=pvz=0;pc=0;elapsed=0;setShop(false);taskOpen=false;$('task').hidden=true;hudPts();$('tm').textContent='0:00'}
function lock(){try{cv.requestPointerLock()}catch(e){}setTimeout(()=>{fallback=!document.pointerLockElement},250)}
function startPlay(seed,size){audio();state='play';newGame(seed,size||wantSize);$('hud').style.display='block';sh.visible=true;
 paused=true;holding=dragging=false;show('help')}
$('bGot').onclick=()=>{paused=false;show(null);lock()};
function toMenu(){Net.leave();setShop(false);state='menu';paused=false;bookOpen=false;setOpen=false;geyser=false;document.exitPointerLock?.();$('hud').style.display='none';sh.visible=hp.visible=hf.visible=hl.visible=pk.visible=su.visible=ldv.visible=false;show('menu');if(wantSize!==S)newGame(undefined,wantSize)}
/* the corner Menu pauses. Leaving the session is the Main menu button, so a misclick does not drop the host and end the room */
function openPause(){if(state!=='play')return;holding=dragging=false;paused=true;bookOpen=false;setOpen=false;setShop(false);document.exitPointerLock?.();show('pause')}
const canSee=()=>dayF>.45||(flashOn&&Prog.up.lantern>0)||(!!aim&&glLit(aim.x,aim.z));
function lampKey(){if(!Prog.up.lamps){toast('Buy garden lights at the workbench');return}
 if(aim){let bi=-1,bd=2.5;GS.forEach((q,i)=>{if(!q)return;const d=Math.hypot(q.x-aim.x,q.z-aim.z);if(d<bd){bd=d;bi=i}});if(bi>=0){Net.send({type:'lamp_pick',i:bi,by:ME});return}}
 const fi=GS.findIndex((q,i)=>!q&&i<Prog.up.lamps);if(fi<0){toast('All your lights are out — aim at one and press G to pick it up');return}
 if(!aim){toast('Aim at the ground to set a light down');return}
 if(Math.hypot(aim.x-SOCK[0],aim.z-SOCK[1])>CABLE_MAX){toast(`Too far — the cable only reaches ${CABLE_MAX} m from the socket`);return}
 Net.send({type:'lamp_place',i:fi,x:aim.x,z:aim.z,by:ME})}
let flying=false;
function toggleFly(){if(!DEV)return;flying=!flying;pvy=pvx=pvz=0;toast(flying?'Fly on — WASD to move, Space up, Ctrl down':'Fly off')}
function ladderKey(){if(state!=='play'||paused||taskOpen)return;if(!Prog.up.ladders){toast('Buy a ladder at the workbench');return}
 let bi=-1,bd=1.4;LS.forEach((q,i)=>{if(!q||!aim)return;const d=Math.hypot(aim.x-q.x,aim.z-q.z);if(d<bd&&Math.abs(aim.y-q.y)<LH){bd=d;bi=i}});
 if(bi>=0){Net.send({type:'ladder_pick',i:bi,by:ME});return}
 const fi=LS.findIndex((q,i)=>!q&&i<Prog.up.ladders);
 if(fi<0){toast('All your ladders are out — aim at one and press T');return}
 if(!aim){toast('Aim where the ladder should stand');return}
 const y=world.floorAt(aim.x,aim.z,(aim.y||0)+.4);
 Net.send({type:'ladder_place',i:fi,x:aim.x,y,z:aim.z,by:ME})}
function aimStone(){if(!aim||!world)return false;const y=aim.y-.02,L=(y-BED)/C|0;return stoneL(L)&&world.solidAt(aim.x,y,aim.z)}
function tryDig(){if(state!=='play'||paused||koT>0||!aim||cd>0||Math.abs(aim.x)>YH-1.4||Math.abs(aim.z)>YH-1.4||handsBusy())return;
 const sup=sel===5&&DEV;
 if(!sup&&sel!==4&&aimStone()){cd=.45;clank();toast(Prog.up.pick?"That's stone. Press 5 for the pickaxe.":"That's stone. You need a pickaxe.");return}
 if(!sup&&aim.y>-.3&&!isMown(aim.x,aim.z)){toast('Mow the grass first');return}/* only the lawn surface needs mowing; a wall or ceiling is already open */
 if(!sup&&!canSee()){toast(Prog.up.lantern?'Too dark to dig — press L for your flashlight':'Too dark to dig — buy a flashlight at the workbench');return}cd=sup?.28:under?1.2:.8;swT=0;hitStop=0;
 const d=digDir,q=v=>Math.round(v*1000)/1000;pend={x:aim.x,y:aim.y,z:aim.z,dx:q(d.x),dy:q(d.y),dz:q(d.z),pk:sel===4?1:0,dv:sup?1:0}}/* sent by strike() when the blade lands */
const FIX={burst:'Water main',tank:'Septic tank',iron:'Cast-iron pipe',gas:'Gas line',well:'Old well'},TASKC=['#5ec8ff','#f0c14a','#e25b4a','#7dcea0'],taskWP=new THREE.Vector3(),
 TASKHINT={burst:'Drag each pipe to the matching colour.',tank:'Click each dial while its needle sits in the green. They keep turning. A miss resets them all.',iron:'Tighten the bolts from the lowest number to the highest. A miss resets them.',gas:'Type the code from the tag on the gas main at the street fence.',well:'Weave the bucket past the bars. Let go, or hit a bar, and it slips back up.'};
function gasTagCode(seed){const r=rng((seed^0x6a5c0de)>>>0);return String(1000+(r()*9000|0))}
let taskN=-1,taskKind='',taskDrag=-1,taskLinks=[-1,-1,-1,-1],taskPerm=[0,1,2,3],taskStep=0,taskBolts=[0,0,0,0],taskCode='',taskEntry='',taskY=70,taskX=320,taskDials=[],taskIron=[],taskGates=[];
const TANKX=[100,246,394,540],IRONP=[[80,110],[230,110],[380,110],[530,110],[80,255],[230,255],[380,255],[530,255]];
function refreshSupply(){if(!world)return;world.sig.forEach((s,i)=>{const m=supplyLever[i];if(m)m.rotation.x=s.on?-.75:.65;const led=supplyLed[i];if(led){const on=!!(s.rep&&s.on);led.material.color.copy(lin(!s.rep?0x6a3030:on?0xb6ffc8:0xd7b15a));led.material.emissive.copy(lin(!s.rep?0x400808:on?0x3dff7a:0x8a5a12));led.material.emissiveIntensity=!s.rep?.25:on?1.6:.35}if(s.mark)s.mark.visible=!s.rep})}
function taskXY(e){const b=$('taskSvg').getBoundingClientRect();return{x:(e.clientX-b.left)/b.width*640,y:(e.clientY-b.top)/b.height*360}}
function angDiff(a,b){let d=a-b;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d}
function taskArc(cx,cy,r,a0,a1){const p=a=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r],A=p(a0),B=p(a1);return `M ${A[0]} ${A[1]} A ${r} ${r} 0 ${a1-a0>Math.PI?1:0} 1 ${B[0]} ${B[1]}`}
function drawTask(mx,my){let h='';
 if(taskKind==='burst'){const ys=i=>46+i*78,L=90,R=550;
  for(let i=0;i<4;i++){const j=taskLinks[i];if(j<0&&taskDrag!==i)continue;h+=`<line x1="${L}" y1="${ys(i)}" x2="${j>=0?R:(mx==null?L:mx)}" y2="${j>=0?ys(j):(my==null?ys(i):my)}" stroke="${TASKC[i]}" stroke-width="8" stroke-linecap="round"/>`}
  for(let i=0;i<4;i++)h+=`<circle cx="${L}" cy="${ys(i)}" r="18" fill="${TASKC[i]}"/><circle cx="${R}" cy="${ys(i)}" r="18" fill="${TASKC[taskPerm[i]]}"/>`}
 else if(taskKind==='tank'){taskDials.forEach((d,i)=>{const x=TANKX[i],y=180;h+=`<circle cx="${x}" cy="${y}" r="58" fill="#1a222c" stroke="#3a4450" stroke-width="16"/>`;
  h+=`<path d="${taskArc(x,y,58,d.tgt-.38,d.tgt+.38)}" fill="none" stroke="#3dba6c" stroke-width="16"/>`;
  h+=`<line x1="${x}" y1="${y}" x2="${x+Math.cos(d.ang)*40}" y2="${y+Math.sin(d.ang)*40}" stroke="${d.lock?'#3dba6c':'#f4ead8'}" stroke-width="6" stroke-linecap="round"/>`;
  h+=`<circle cx="${x}" cy="${y}" r="9" fill="${d.lock?'#3dba6c':'#e9a23b'}"/>`})}
 else if(taskKind==='iron'){IRONP.forEach(([x,y],i)=>{h+=`<circle cx="${x}" cy="${y}" r="36" fill="${taskBolts[i]?'#3dba6c':'#8a9096'}" stroke="#1b1410" stroke-width="6"/><text x="${x}" y="${y+8}" text-anchor="middle" font-size="26" font-family="Georgia,serif" fill="#1b1410">${taskIron[i]}</text>`})}
 else if(taskKind==='gas'){h+=`<rect x="36" y="90" width="280" height="140" rx="8" fill="#2a3340"/><text x="176" y="155" text-anchor="middle" font-size="22" font-family="Georgia,serif" fill="#f4ead8">The code is on the gas main</text><text x="176" y="195" text-anchor="middle" font-size="22" font-family="Georgia,serif" fill="#e7c56a">at the street fence.</text>`;
  h+=`<text x="480" y="56" text-anchor="middle" font-size="28" font-family="Georgia,serif" fill="#f4ead8">${taskEntry||'—'}</text>`;
  '123456789C0⌫'.split('').forEach((ch,i)=>{const x=390+(i%3)*70,y=80+((i/3)|0)*66;h+=`<rect x="${x}" y="${y}" width="60" height="54" rx="8" fill="#2a3340" data-k="${ch}"/><text x="${x+30}" y="${y+36}" text-anchor="middle" font-size="26" font-family="Georgia,serif" fill="#f4ead8">${ch}</text>`})}
 else if(taskKind==='well'){h+=`<rect x="180" y="28" width="280" height="312" rx="8" fill="#1a222c" stroke="#3a4450" stroke-width="4"/><rect x="184" y="300" width="272" height="36" fill="#1d4e66"/>`;
  taskGates.forEach(g=>{const b=wellGate(g);h+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3" fill="#8a9096"/>`});
  h+=`<line x1="320" y1="28" x2="${taskX}" y2="${taskY}" stroke="#c4a574" stroke-width="4"/><rect x="${taskX-20}" y="${taskY}" width="40" height="28" rx="4" fill="#c4a574"/>`}
 $('taskSvg').innerHTML=h}
function ironRank(i){let k=0;for(let j=0;j<taskIron.length;j++)if(taskIron[j]<taskIron[i])k++;return k}
function wellGate(g){return g.side<0?{x:180,y:g.y-8,w:168,h:16}:{x:292,y:g.y-8,w:168,h:16}}
function wellHits(x0,y0,x1,y1){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/8));
 for(let s=1;s<=n;s++){const x=x0+(x1-x0)*s/n,y=y0+(y1-y0)*s/n,b={x:x-20,y,w:40,h:28};
  if(taskGates.some(g=>{const a=wellGate(g);return b.x<a.x+a.w&&b.x+b.w>a.x&&b.y<a.y+a.h&&b.y+b.h>a.y}))return true}return false}
function wellDrag(p){const nx=Math.max(200,Math.min(440,p.x)),ny=Math.max(48,Math.min(308,p.y));
 if(wellHits(taskX,taskY,nx,ny)){taskX=320;taskY=48;taskDrag=-1;drawTask();return}
 taskX=nx;taskY=ny;drawTask();taskFinish()}
function wellDrop(){if(!taskOpen||taskKind!=='well'||taskY>=300)return;taskX=320;taskY=48;drawTask()}
function taskSolved(){if(taskKind==='burst')return taskLinks.every((j,i)=>j>=0&&taskPerm[j]===i);if(taskKind==='tank')return taskDials.length===4&&taskDials.every(d=>d.lock);if(taskKind==='iron')return taskStep>=8;if(taskKind==='gas')return taskEntry===taskCode;return taskKind==='well'&&taskY>=300}
function tankTick(dt){if(!taskOpen||taskKind!=='tank'||paused)return;let moved=false;taskDials.forEach(d=>{if(d.lock)return;d.ang+=d.spd*dt;moved=true});if(moved)drawTask()}
function openTask(n){const s=world.sig[n];if(!s||s.rep||!world.sigOpen(s))return;taskOpen=true;taskN=n;taskKind=s.kind;taskDrag=-1;taskLinks=[-1,-1,-1,-1];taskStep=0;taskBolts=[0,0,0,0];taskEntry='';taskY=70;
 const r=rng((world.seed^((n+1)*0x9e3779b9))>>>0);taskPerm=[0,1,2,3];for(let i=3;i>0;i--){const j=r()*(i+1)|0,t=taskPerm[i];taskPerm[i]=taskPerm[j];taskPerm[j]=t}
 taskCode=gasTagCode(world.seed);
 taskDials=[];for(let i=0;i<4;i++){const tgt=r()*6.2832,spd=(.5+r()*1.15)*(i%2?1:-1);taskDials.push({ang:tgt+2.2+r()*2,spd,tgt,lock:0})}
 if(s.kind==='iron'){taskIron=[];taskBolts=[0,0,0,0,0,0,0,0];while(taskIron.length<8){const v=11+(r()*87|0);if(taskIron.indexOf(v)<0)taskIron.push(v)}}
 if(s.kind==='well'){taskX=320;taskY=48;taskGates=[];let side=r()<.5?-1:1;for(let i=0;i<3;i++){taskGates.push({y:118+i*70,side});side=-side}}
 $('taskTitle').textContent='Fix '+FIX[s.kind];$('taskHint').textContent=TASKHINT[s.kind]+' Esc cancels.';$('task').hidden=false;drawTask();if(document.pointerLockElement===cv)document.exitPointerLock()}
function closeTask(){taskOpen=false;taskN=-1;taskDrag=-1;$('task').hidden=true;if(state!=='play'||paused||fallback)return;if(keys.Escape)relock=true;else if(ptrHeld)taskRelock=true;else lock()}
function finishPtr(){ptrHeld=false;if(!taskRelock)return;taskRelock=false;if(state==='play'&&!paused&&!shopOpen&&!bookOpen&&!setOpen&&!taskOpen&&!fallback)lock()}
function taskFinish(){if(!taskSolved())return;const n=taskN;closeTask();Net.send({type:'repair',n,by:ME})}
function taskDown(p){if(taskKind==='burst'){for(let i=0;i<4;i++)if(Math.hypot(p.x-90,p.y-(46+i*78))<24){taskDrag=i;taskLinks[i]=-1;drawTask(p.x,p.y);return}}
 if(taskKind==='tank'){TANKX.forEach((x,i)=>{const d=taskDials[i];if(!d||d.lock||Math.hypot(p.x-x,p.y-180)>64)return;if(Math.abs(angDiff(d.ang,d.tgt))<.38){d.lock=1;drawTask();taskFinish()}else{taskDials.forEach(q=>{q.lock=0;q.ang=q.tgt+1.7});drawTask()}});return}
 if(taskKind==='iron'){IRONP.forEach(([x,y],i)=>{if(Math.hypot(p.x-x,p.y-y)>36||taskBolts[i])return;if(ironRank(i)===taskStep){taskBolts[i]=1;taskStep++}else{taskStep=0;taskBolts=[0,0,0,0,0,0,0,0]}drawTask();taskFinish()});return}
 if(taskKind==='gas'){'123456789C0⌫'.split('').forEach((ch,i)=>{const x=390+(i%3)*70,y=80+((i/3)|0)*66;if(p.x<x||p.x>x+60||p.y<y||p.y>y+54)return;if(ch==='C'||ch==='⌫')taskEntry='';else if(taskEntry.length<4)taskEntry+=ch;if(taskEntry.length===4&&taskEntry!==taskCode)taskEntry='';drawTask();taskFinish()});return}
 if(taskKind==='well'&&Math.hypot(p.x-taskX,p.y-(taskY+14))<30)taskDrag=1}
$('taskSvg').addEventListener('pointerdown',e=>{if(!taskOpen)return;taskDown(taskXY(e));e.preventDefault()});
addEventListener('pointerdown',()=>{ptrHeld=true});
addEventListener('pointermove',e=>{if(!taskOpen||taskDrag<0)return;const p=taskXY(e);if(taskKind==='burst')drawTask(p.x,p.y);else if(taskKind==='well')wellDrag(p)});
addEventListener('pointerup',e=>{if(taskDrag>=0){if(taskKind==='burst'){const p=taskXY(e);let hit=-1;for(let j=0;j<4;j++)if(Math.hypot(p.x-550,p.y-(46+j*78))<30)hit=j;if(hit>=0&&taskLinks.indexOf(hit)<0)taskLinks[taskDrag]=hit;drawTask();taskFinish()}else if(taskKind==='well')wellDrop();taskDrag=-1}finishPtr()});
addEventListener('pointercancel',()=>{taskDrag=-1;finishPtr()});
/* E: drop what you're holding, else grab the mower, else the nearest exposed rock, else a find */
function useE(){if(state!=='play'||paused||koT>0)return;audio();
 if(taskOpen){closeTask();return}
 if(shopOpen){setShop(false);return}
 if(mowerHeld){Net.flushMow();Net.send({type:'mower_drop',x:mower.position.x,z:mower.position.z,ry:mower.rotation.y,on:mowerOn?1:0,fy:py,by:ME});return}
 if(pile.length){const nc=Math.hypot(px-CRATE[0],pz-CRATE[1])<2.5,nb=Math.hypot(px-BIN[0],pz-BIN[1])<2.5;
  if(nc||nb){Net.send({type:'rock_sell',ns:pile.slice(),by:ME});return}
  if(tgt&&tgt.k==='rock'&&plainRock(rk[tgt.n])&&pile.length<PILE){const ns=scoop(tgt.n);if(ns.length)Net.send({type:'rock_pick',ns,by:ME});return}
  if(aim)Net.send({type:'rock_place',ns:pile.slice(),x:aim.x,z:aim.z,by:ME});else toast('Aim at the ground to put them down');return}
 if(carry>=0){const q=rk[carry],nc=Math.hypot(px-CRATE[0],pz-CRATE[1])<2.5,nb=Math.hypot(px-BIN[0],pz-BIN[1])<2.5;
  if(q.gem&&nc){Net.send({type:'rock_sell',n:carry,by:ME});return}
  if(q.gem&&nb){toast('That belongs in the crate');return}
  if(aim)Net.send({type:'rock_place',n:carry,x:aim.x,z:aim.z,by:ME});else toast('Aim at the ground to put it down');return}
 if(carryF>=0){const f=world.finds[carryF],db=Math.hypot(px-BIN[0],pz-BIN[1]),dc=Math.hypot(px-CRATE[0],pz-CRATE[1]);
  if(db<2.5||dc<2.5){const at=db<=dc?'bin':'crate';if(at===(f.type==='trash'?'bin':'crate'))Net.send({type:'find_deposit',n:carryF,by:ME});else toast(f.type==='trash'?'That belongs in the trashcan':'That belongs in the crate');return}
  if(aim)Net.send({type:'find_place',n:carryF,x:aim.x,z:aim.z,by:ME});else toast('Aim at the ground to put it down');return}
 const t=tgt;if(!t)return;
 if(t.k==='fix')openTask(t.n);
 else if(t.k==='supply'){const s=world.sig[t.n];if(!s.rep)toast(`Repair the ${FIX[s.kind].toLowerCase()} first`);else Net.send({type:'supply',n:t.n,by:ME})}
 else if(t.k==='find')Net.send({type:'find_pick',n:t.n,by:ME});
 else if(t.k==='rock'){const q=rk[t.n];if(plainRock(q)){const ns=scoop(t.n);if(ns.length)Net.send({type:'rock_pick',ns,by:ME})}else Net.send({type:'rock_pick',n:t.n,by:ME})}
 else if(t.k==='heavy')toast('Too heavy to lift — dig around it');
 else if(t.k==='cable')Net.send({type:'cable_fix',i:t.i,by:ME});
 else if(t.k==='mower'){if(mowerOwner)toast('Someone else is using the mower');else Net.send({type:'mower_grab',by:ME})}
 else if(t.k==='bench')setShop(true);
 else if(t.k==='sock'){if(!Prog.up.lamps)toast('No lights yet — buy some at the workbench');else Net.send({type:'lamp_power',on:glOn?0:1,by:ME})}
 else if(t.k==='pump')togglePump()}
function togglePump(){if(state!=='play'||paused||koT>0||shopOpen)return;if(!Prog.up.pump){toast('Buy a Pump at the workbench');return}Net.send({type:'pump_power',on:pumpOn?0:1,by:ME})}
/* ---------- E target: the usable thing nearest the crosshair, within reach and in line of sight. Zones (bench, socket, mower) also answer by proximity, ranked below anything aimed at ---------- */
const REACH=3.2,EYE=new V3();let tgt=null,hiKey='',hiObj=null,mowerHi=null;
function aimScore(x,y,z,r){const dx=x-EYE.x,dy=y-EYE.y,dz=z-EYE.z,d=Math.hypot(dx,dy,dz);if(d>REACH+r)return null;const al=dx*digDir.x+dy*digDir.y+dz*digDir.z;if(al<=.05)return null;
 const ang=Math.atan2(Math.max(0,Math.sqrt(Math.max(0,d*d-al*al))-r),al);if(ang>.2)return null;
 if(d>r+.15&&rayVox(EYE.x,EYE.y,EYE.z,dx/d,dy/d,dz/d,d-r-.08))return null;return ang+d*.015}
function pickTarget(){tgt=null;if(state!=='play'||paused||shopOpen||taskOpen||mowerHeld||carry>=0||carryF>=0||!world)return;
 let best=1e9;const put=(s,o)=>{if(s!=null&&s<best){best=s;tgt=o}},near=(x,z,r)=>{const d=Math.hypot(px-x,pz-z);return d<r?1+d*.1:null};
 if(!pile.length){if(lookingAtLeak()&&world.sig[0]&&!world.sig[0].rep){tgt={k:'fix',n:0,l:'Fix the water main'};return}
  world.sig.forEach((s,n)=>{if(!world.sigOpen(s)||s.rep)return;put(aimScore(s.x,s.y,s.z,.6),{k:'fix',n,l:'Fix the '+FIX[s.kind].toLowerCase()})});
  supplyLever.forEach((m,n)=>{m.getWorldPosition(taskWP);const s=world.sig[n];if(!s)return;put(aimScore(taskWP.x,taskWP.y,taskWP.z,.12),{k:'supply',n,l:s.rep?(s.on?`Turn off the ${FIX[s.kind].toLowerCase()}`:`Turn on the ${FIX[s.kind].toLowerCase()}`):`Repair the ${FIX[s.kind].toLowerCase()} first`})});
  if(gasTagPos)put(aimScore(gasTagPos.x,gasTagPos.y,gasTagPos.z,.35),{k:'gastag',l:'Gas tag  '+gasTagCode(yardSeed),x:1});
  for(let n=0;n<world.finds.length;n++){const f=world.finds[n];if(!findOut(f)||Math.abs(f.x-px)>4||Math.abs(f.z-pz)>4)continue;put(aimScore(f.x,f.y,f.z,Math.max(.08,f.sz*1.4)),{k:'find',n,l:'Pick up '+findName(f.kind)})}
  for(let n=0;n<RN;n++){const q=rk[n];if(q.held||Math.abs(q.x-px)>4||Math.abs(q.z-pz)>4||world.solidAt(q.x,q.y,q.z))continue;
   const s=aimScore(q.x,q.y+q.s*.35,q.z,q.s*q.w*.8);if(s!=null)put(s,q.s>.32?{k:'heavy',n,l:'Too heavy to lift',x:1}:{k:'rock',n,l:'Pick up '+(q.gem?GEM[q.gem][0]:plainRock(q)&&scoop(n).length>1?'rocks':'rock')})}
  for(let i=0;i<GLN;i++){const q=GS[i];if(!q||q.cut==null)continue;const p=cutPos(i);put(aimScore(p[0],world.hAt(p[0],p[1])+.05,p[1],.3),{k:'cable',i,l:'Splice the cable'})}
  const m=mower.position,mo={k:'mower',l:mowerOwner?'Someone else is using the mower':'Push the mower',x:mowerOwner?1:0};put(aimScore(m.x,m.y+.35,m.z,.55),mo);put(near(m.x,m.z,2.2),mo);
  const bo={k:'bench',l:'Open the workbench'};put(aimScore(BENCH[0],1,BENCH[1],.8),bo);put(near(BENCH[0],BENCH[1],3.2),bo);
  const so={k:'sock',l:Prog.up.lamps?`Garden lights ${glOn?'off':'on'}`:'Wall socket (buy garden lights first)'};put(near(SOCK[0],SOCK[1],2.6),so);
  const po={k:'pump',l:Prog.up.pump?(pumpOn?'Stop the pump':'Start the pump'):'Sump pump (buy Pump at the workbench)'};put(aimScore(PUMPP[0],.4,PUMPP[1],.4),po);put(near(PUMPP[0],PUMPP[1],2.2),po)}
 else if(pile.length<PILE)for(let n=0;n<RN;n++){const q=rk[n];if(!plainRock(q)||q.held||Math.abs(q.x-px)>4||Math.abs(q.z-pz)>4||world.solidAt(q.x,q.y,q.z))continue;
  put(aimScore(q.x,q.y+q.s*.35,q.z,q.s*q.w*.8),{k:'rock',n,l:`Pick up more rocks (${pile.length}/${PILE})`})}}
/* what E does with your hands full */
function carryHint(){const nb=Math.hypot(px-BIN[0],pz-BIN[1])<2.5,nc=Math.hypot(px-CRATE[0],pz-CRATE[1])<2.5,down=aim?'E — Put it down':'Aim at the ground to put it down';
 if(pile.length){const n=pile.length;return nc||nb?`E — Toss in ${n} rock${n>1?'s':''} (+${n*ROCK_PTS})`:down}
 if(carry>=0){const q=rk[carry];if(q.gem)return nc?`E — Sell ${GEM[q.gem][0]} (+${GEM[q.gem][1]})`:nb?'That belongs in the crate':down;return nc||nb?`E — Toss it in (+${ROCK_PTS})`:down}
 if(carryF>=0){const f=world.finds[carryF],db=Math.hypot(px-BIN[0],pz-BIN[1]),dc=Math.hypot(px-CRATE[0],pz-CRATE[1]);
  if(db<2.5||dc<2.5){const at=db<=dc?'bin':'crate',ok=at===(f.type==='trash'?'bin':'crate');return ok?`E — Put it in the ${at==='bin'?'trashcan':'crate'} (+${f.pts})`:`That belongs in the ${f.type==='trash'?'trashcan':'crate'}`}return down}
 return ''}
/* pulsing outline on the target: a slightly larger inside-out copy, additive, hidden from the depth pass */
const hiM=new THREE.MeshBasicMaterial({color:new THREE.Color(1.4,1.15,.75),side:THREE.BackSide,transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}),hiG=new THREE.Group(),hiR=new THREE.Mesh(rockG,hiM);FXG.add(hiG);
function hiShow(){const t=tgt,key=t?t.k+(t.n!=null?t.n:t.i!=null?t.i:''):'';
 if(key!==hiKey){hiKey=key;hiG.clear();hiObj=null;
  if(t&&t.k==='find'){hiObj=world.finds[t.n].m.clone(true);hiObj.traverse(o=>{if(o.isMesh){o.material=hiM;o.castShadow=o.receiveShadow=false}});hiObj.visible=true}
  else if(t&&(t.k==='rock'||t.k==='heavy'))hiObj=hiR;
  else if(t&&t.k==='mower'&&!mowerOwner){if(!mowerHi){mowerHi=mower.clone(true);mowerHi.traverse(o=>{if(o.isMesh){o.material=hiM;o.castShadow=o.receiveShadow=false}})}hiObj=mowerHi}
  if(hiObj)hiG.add(hiObj)}
 if(!hiObj)return;hiM.opacity=.3+.16*Math.sin(T*6);
 if(t.k==='find'){const f=world.finds[t.n];hiObj.position.copy(f.m.position);hiObj.rotation.copy(f.m.rotation);hiObj.scale.setScalar(1+Math.min(.6,.025/Math.max(.02,f.sz)))}
 else if(hiObj===hiR){const q=rk[t.n],k=1+Math.min(.25,.03/q.s);hiR.position.set(q.x,q.y,q.z);hiR.rotation.set(q.a,q.b,q.c);hiR.scale.set(q.s*q.w*k,q.s*k,q.s*q.w*k)}
 else{hiObj.position.copy(mower.position);hiObj.rotation.copy(mower.rotation);hiObj.scale.setScalar(1.03)}}
function lookingAtLeak(){if(!world||world.shut||!world.exposed())return false;const b=world.burst,o=EYE,dx=b.x-o.x,dy=b.y-o.y,dz=b.z-o.z,t=dx*digDir.x+dy*digDir.y+dz*digDir.z;
 if(t<.25||t>4.5||Math.hypot(dx-digDir.x*t,dy-digDir.y*t,dz-digDir.z*t)>.6)return false;return Math.hypot(px-b.x,py-b.y,pz-b.z)<4.2}
function dropCarry(reset){if(reset){if(carry>=0&&rk[carry]){rk[carry].held=0;setRock(carry)}pile.forEach(n=>{if(rk[n]){rk[n].held=0;setRock(n)}});rocks.instanceMatrix.needsUpdate=true}carry=-1;pile.length=0;showPile();clearCarryF()}
function probe(){if(state!=='play'||paused||koT>0||pc>0)return;const pl=Prog.up.probe,nf=1-.3*pl;pcMax=pc=PCD[pl];pa=1;nz('lowpass',140,.5,1);sweep('bandpass',200,1400,.6,.35,.05);const gy=world.hAt(px,pz);let bs,bd=1e9;
 for(const s of world.sig){const d=Math.hypot(px-s.x,gy-s.y,pz-s.z);if(d<bd){bd=d;bs=s}}
 if(bd>PRNG[pl]){toast(`No echo within ${PRNG[pl]} m — try somewhere else`);return}/* no pipe in range: cooldown still runs, the ring only draws when something answers */
 const dp=(gy-bs.y)*(1+(Math.random()-.5)*.1*nf),dn=bd*(1+(Math.random()-.5)*.14*nf)+(Math.random()-.5)*.3*nf;
 addRing(px,pz,Math.sqrt(Math.max(.04,dn*dn-dp*dp)))}
Net.on(a=>{
 if(a.type==='find_pick'){const f=world.finds[a.n];if(!f||f.done)return;f.held=a.by;f.m.visible=false;if(a.by===ME){holdFind(a.n);showCard(f.tier,findName(f.kind),f.pts,f.type==='trash'?'trashcan':'crate')}return}
 if(a.type==='find_place'){const f=world.finds[a.n];f.held=0;f.out=1;f.x=a.x;f.z=a.z;f.y=world.floorAt(a.x,a.z,1)+f.sz;syncFind(f);if(a.by===ME&&carryF===a.n)clearCarryF();return}
 if(a.type==='find_deposit'){const f=world.finds[a.n];if(!f||f.done)return;f.done=1;f.held=0;f.m.visible=false;world.score+=f.pts;Prog.bank+=f.pts;hudPts();saveProg();bookAdd(f.kind);if(a.by===ME){if(carryF===a.n)clearCarryF();toast(`+${f.pts}`);f.type==='trash'?clank():ping()}return}
 if(a.type==='rock_pick'){const ns=Array.isArray(a.ns)?a.ns:[a.n];let added=0;
  for(const n of ns){const q=rk[n];if(!q||q.held)continue;q.held=a.by;hideRock(n);added++;if(a.by===ME){if(q.gem||q.s>.32)carry=n;else if(pile.indexOf(n)<0)pile.push(n)}}
  rocks.instanceMatrix.needsUpdate=true;if(a.by===ME){const q=carry>=0?rk[carry]:null;if(q&&q.gem){const G=GEM[q.gem];carryM.scale.set(q.s*q.w,q.s,q.s*q.w);carryM.material.color.fromArray(rocks.instanceColor.array,carry*3);showCard(G[3],G[0],G[1],'crate')}else if(q){carryM.scale.set(q.s*q.w,q.s,q.s*q.w);carryM.material.color.fromArray(rocks.instanceColor.array,carry*3);toast('Too heavy to keep — put it down')}else{showPile();toast(added>1?`${added} rocks — ${pile.length} in hand`:`Plain rock — ${ROCK_PTS} pt at the crate or the trashcan`)}}return}
 if(a.type==='rock_sell'){const ns=Array.isArray(a.ns)?a.ns:[a.n];let pts=0,gem=0,nSold=0;
  for(const n of ns){const q=rk[n];if(!q||q.held!==a.by||q.held==='$')continue;const p=q.gem?GEM[q.gem][1]:ROCK_PTS;q.held='$';hideRock(n);pts+=p;nSold++;if(q.gem){gem=q.gem;bookAdd('gem'+q.gem)}if(a.by===ME){if(carry===n)carry=-1;const i=pile.indexOf(n);if(i>=0)pile.splice(i,1)}}
  if(!nSold)return;rocks.instanceMatrix.needsUpdate=true;world.score+=pts;Prog.bank+=pts;hudPts();saveProg();if(a.by===ME){showPile();toast(gem?`${GEM[gem][0]} sold  +${pts}`:nSold>1?`${nSold} rocks  +${pts}`:`Plain rock  +${pts}`);gem?ping():clank()}return}
 if(a.type==='repair'){const s=world.sig[a.n];if(!s||s.rep||state!=='play')return;if(s.kind==='burst'?!world.exposed():!s.f)return;s.rep=1;refreshSupply();if(a.by===ME){ping();toast(`${FIX[s.kind]} repaired. Turn it on at the house.`)}return}
 if(a.type==='supply'){const s=world.sig[a.n];if(!s||!s.rep||state!=='play')return;s.on=s.on?0:1;if(s.kind==='burst')world.shut=s.on?1:0;refreshSupply();if(a.by===ME)toast(s.on?`${FIX[s.kind]} supply on`:`${FIX[s.kind]} supply off`);if(world.sig.every(q=>q.on))win();return}
 if(a.type==='flooded'){if(state!=='play'||world.shut)return;world.lost=1;lose();return}
 if(a.type==='rock_place'){const ns=Array.isArray(a.ns)?a.ns:[a.n];ns.forEach((n,k)=>{const q=rk[n];if(!q||q.held!==a.by)return;q.held=0;const ang=k*2.2,rad=ns.length>1?.32:0;q.x=a.x+Math.cos(ang)*rad;q.z=a.z+Math.sin(ang)*rad;q.y=world.floorAt(q.x,q.z,1)+q.s*.3;setRock(n);if(a.by===ME){if(carry===n)carry=-1;const i=pile.indexOf(n);if(i>=0)pile.splice(i,1)}});rocks.instanceMatrix.needsUpdate=true;if(a.by===ME)showPile();return}
 if(a.type==='buy'){const u=UPG[a.id],c=upCost(a.id);Prog.bank-=c;Prog.up[a.id]++;hudPts();saveProg();
  if(a.by===ME){ping();toast(a.id==='pick'&&Prog.up.pick===1?'Pickaxe bought — press 5':a.id==='pump'?'Pump installed — E at the yellow pump by the house, or press P':`${u.n} upgraded to level ${Prog.up[a.id]}`)}else toast(a.id==='pick'&&Prog.up.pick===1?'Team bought a pickaxe':`Team bought ${u.n} level ${Prog.up[a.id]}`);return}
 if(a.type==='pump_power'){pumpOn=!!a.on;if(a.by===ME)ping();toast(pumpOn?'Pump on — water is dropping':'Pump off');return}
 if(a.type==='lamp_place'){glPlace(a.i,a.x,a.z);if(a.by===ME){clank();toast(GS.every((q,i)=>q||i>=Prog.up.lamps)?'Light placed — E at the wall socket switches it on':'Light placed')}return}
 if(a.type==='ladder_place'){ladPlace(a.i,a.x,a.y,a.z);if(a.by===ME){clank();toast('Ladder placed — W climbs, S climbs down')};return}
 if(a.type==='ladder_pick'){ladPick(a.i);if(a.by===ME)clank();return}
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
 if(a.type==='ko'){const p=Math.min(Prog.bank,Math.max(5,Math.round(Prog.bank*.1)));Prog.bank-=p;hudPts();setTimeout(()=>toast(a.by===ME?`Knocked out — the doctor's visit cost ${p} pts`:`A teammate was knocked out (−${p} pts)`),a.by===ME?1500:0);return}
 if(a.type==='cave_warn'){const d=Math.hypot(a.x-px,a.z-pz),k=Math.max(.15,1-d/12);trickle(a.x,a.y,a.z,16,false);sweep('lowpass',170,55,1.4,.5*k);grain(16,1.3,'lowpass',200,700,.14*k);
  if(d<9)addTrauma(.22*(1-d/9));if(d<6&&state==='play')toast('The ground is creaking — get out from under it!');return}
 if(a.type==='cavein'){const n=world.cave(a.x,a.z,true);if(!n)return;glDirty=true;sync();clearGrass(a.x,a.z);settleRocks(a.x,a.z);settleFinds(a.x,a.z);
  const d=Math.hypot(a.x-px,a.z-pz),k=Math.max(.1,1-d/14);trickle(a.x,a.y,a.z,10,true);
  for(let i=0;i<26;i++){const cx=a.x+(Math.random()-.5)*3.2,cz=a.z+(Math.random()-.5)*3.2,fy=world.floorAt(cx,cz,isFinite(a.y)?a.y:0),q=digDepth(cx,cz);DUST.add({x:cx,y:fy+.2+Math.random()*.6,z:cz,vx:(Math.random()-.5)*1.4,vy:.3+Math.random()*.8,vz:(Math.random()-.5)*1.4,g:-.03,dr:1.2,life:1.6+Math.random()*1.4,s0:.4,s1:1.6+Math.random(),a0:.5,...dustRGB(Math.max(0,-fy),q.n)})}
  nz('lowpass',90,1.5,1*k);nz('lowpass',300,.5,.5*k);grain(30,.9,'lowpass',150,800,.3*k);if(d<10)addTrauma(.75*(1-d/10));if(d<12&&state==='play')toast('Cave-in!');
  let up=0;while(up<=16&&!world.room(px,py+up*.05,pz))up++;if(up>16)knockout('cave');markPois();return}
 if(a.type!=='dig')return;world.apply(a);if(!a.cut){if(a.by===ME&&a.stone)clank();return}glDirty=true;const gas0=world.gasAt;sync();clearGrass(a.x,a.z);settleRocks(a.x,a.z);settleFinds(a.x,a.z);if(a.by!==ME)Net.swing(a.by);
 if(a.by===ME&&a.pk)clank();
 /* debris sprays back out of the cut, from the point the blade hit */
 let dx=a.dx,dy=a.dy,dz=a.dz;if(!isFinite(dx)||Math.hypot(dx,dy,dz)<.01){dx=0;dy=-1;dz=0}{const l=Math.hypot(dx,dy,dz);dx/=l;dy/=l;dz/=l}
 const iy=isFinite(a.y)?a.y:world.hAt(a.x,a.z),dn=Math.hypot(a.x-px,iy-ey,a.z-pz),wet=iy<waterY();
 for(let i=0;i<(wet?8:18);i++){const ox=a.x-dx*.15+(Math.random()-.5)*.5,oy=iy-dy*.12+(Math.random()-.5)*.25,oz=a.z-dz*.15+(Math.random()-.5)*.5,dd=Math.max(0,-oy)-Math.random()*.2,q=digDepth(ox,oz);
  spawn(new V3(ox,oy,oz),new V3(-dx*1.6+(Math.random()-.5)*2.6,1.8+Math.random()*2.6-dy*1.2,-dz*1.6+(Math.random()-.5)*2.6),2.2+Math.random()*1.6,false,soilCol(dd<.05&&oy>-.25&&Math.random()<.4?-1:Math.max(0,dd),q.n))}
 if(!wet)for(let i=0;i<5;i++){const q=digDepth(a.x,a.z);DUST.add({x:a.x-dx*.2+(Math.random()-.5)*.4,y:iy-dy*.15+.05,z:a.z-dz*.2+(Math.random()-.5)*.4,vx:-dx*.7+(Math.random()-.5)*.6,vy:.3+Math.random()*.5,vz:-dz*.7+(Math.random()-.5)*.6,g:-.04,dr:2.4,life:.8+Math.random()*.6,s0:.18,s1:.75+Math.random()*.45,a0:.42,...dustRGB(Math.max(0,-iy),q.n)})}
 if(a.by===ME){if(!a.pk)thud();addTrauma(.14)}else if(dn<6)addTrauma(.05*(1-dn/6));
 if(!gas0&&world.gasAt){Prog.bank=Math.max(0,Prog.bank-GAS_FEE);hudPts();gasStart(world.gasAt,GAS_LEN);toast(`GAS LEAK! Get clear — ${GAS_FEE}-point call-out fee`);nz('highpass',2600,1.4,.55);sweep('bandpass',4200,1400,1.1,.4);addTrauma(.5*Math.max(.2,1-dn/10))}
 if(state!=='play')return;markPois();
 /* the host checks the new hole for overhangs: warn now, collapse in 1.5 s */
 if(Net.mode!=='client'&&!caveQ.some(c=>Math.hypot(c.x-a.x,c.z-a.z)<1.5)&&world.cave(a.x,a.z,false)){caveQ.push({x:a.x,y:iy,z:a.z,t:1.5});Net.send({type:'cave_warn',x:a.x,y:iy,z:a.z})}});
const POI={burst:'The leaking main',tank:'Septic tank',iron:'Cast-iron pipe',gas:'Gas line',well:'Old well'};
function markPois(){if(!world||state!=='play')return;const fresh=[];
 for(const s of world.sig){if(s.kind==='burst'||s.f||world.solidAt(s.x,s.y,s.z))continue;s.f=1;fresh.push(s)}
 const n=world.foundN(),tot=world.sig.length,done=n===tot;
 fresh.forEach((s,i)=>{const name=POI[s.kind]||s.kind,fin=i===fresh.length-1&&done;
  if(s.kind==='gas'&&Math.hypot(s.x-px,s.z-pz)<6)addTrauma(.2);
  const msg=s.kind==='gas'
   ?(fin?'Gas line — careful. All '+tot+' are uncovered. Repair each one.':'Gas line — careful. '+n+' of '+tot+'. Press E to repair it.')
   :(fin?name+' uncovered — all '+tot+' found. Repair each one, then use the house switches.':name+' uncovered — '+n+' of '+tot+'. Press E to repair it.');
  toast(msg)});
 if(fresh.length){nz('lowpass',500,.4,.9);grain(6,.15,'bandpass',2500,6000,.25)}
 if(world.exposed()&&!world.seenLeak){world.seenLeak=1;if(!fresh.length)toast(done?'The main is open — all '+tot+' uncovered. Press E to repair it.':'The main is open — '+n+' of '+tot+'. Press E to repair it.')}
 const el=$('poi');if(el)el.textContent=n+'/'+tot}
/* ---------- public boards: Firebase anonymous auth + Firestore. Empty config means the game still runs and the board says it is not connected. The collection book stays in localStorage. ---------- */
const FIREBASE_CONFIG={apiKey:'AIzaSyDAH7ouBpg_ZcXTnZsM63Scbi-QQT2h-uE',authDomain:'digging-be85b.firebaseapp.com',projectId:'digging-be85b',storageBucket:'digging-be85b.firebasestorage.app',messagingSenderId:'1039550071452',appId:'1:1039550071452:web:55b01941143358051f775e'};
const SZNAME={20:'Small',28:'Medium',36:'Large',44:'Extra Large',60:'Super'};
function fbReady(){return typeof firebase!=='undefined'&&!!FIREBASE_CONFIG.apiKey&&!!FIREBASE_CONFIG.projectId}
let lbDb=null,lbUid='',lbMode='solo',lbSize=20,boardOpen=false,lbBusy=false;
function lbApp(){if(!fbReady())return null;if(!lbDb){if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);lbDb=firebase.firestore()}return lbDb}
async function lbUser(){if(!lbApp())return null;const auth=firebase.auth();if(!auth.currentUser)await auth.signInAnonymously();lbUid=auth.currentUser.uid;return auth.currentUser}
function boardName(){try{const n=String(localStorage.getItem('burstName')||'').replace(/[\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,12);if(n)return n}catch(e){}return 'Digger'}
function teamNames(){const ids=Object.keys(Net.roster||{}).sort((a,b)=>(Net.roster[a]|0)-(Net.roster[b]|0)),out=[];
 for(const id of ids){let n=String((Net.names&&Net.names[id])||'').replace(/[\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,12);if(!n)n=(Net.roster[id]|0)===0?'Host':'Player '+((Net.roster[id]|0)+1);out.push(n);if(out.length===4)break}return out.length?out:['Host']}
function fmtTime(t){t=Math.max(0,t|0);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
function ord(n){const j=n%10,k=n%100;return n+(j===1&&k!==11?'st':j===2&&k!==12?'nd':j===3&&k!==13?'rd':'th')}
function escHtml(s){return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
async function lbRows(col){const db=lbApp();if(!db)return [];const snap=await db.collection(col).limit(200).get();return snap.docs.map(d=>({id:d.id,...d.data()}))}
async function submitScore(){const line=$('wr');if(line)line.textContent='';if(!fbReady()||!world||Net.mode==='client')return;
 const col=Net.mode==='host'?'team':'solo',size=S,time=Math.max(1,Math.round(elapsed)),pts=world.score|0,digs=world.digs|0;
 try{const user=await lbUser();if(!user)return;const ref=lbApp().collection(col).doc(user.uid+'_'+size),prev=await ref.get(),old=prev.exists?prev.data():null;
  if(!old||!(old.time<=time)){const data=col==='team'?{names:teamNames(),time,pts,digs,size}:{name:boardName(),time,pts,digs,size};await ref.set(data)}
  const rows=(await lbRows(col)).filter(r=>r.size===size).sort((a,b)=>(a.time||1e9)-(b.time||1e9));
  const rank=rows.findIndex(r=>r.id===user.uid+'_'+size)+1;
  if(rank>0&&line)line.textContent=`${ord(rank)} on the ${SZNAME[size]||size+' m'} ${col} board.`}
 catch(e){console.warn(e)}}
function lbShowSizes(){document.querySelectorAll('.lbsz button').forEach(b=>b.classList.toggle('on',+b.dataset.z===lbSize))}
async function renderBoard(){const list=$('lbList'),msg=$('lbMsg');lbShowSizes();document.querySelectorAll('.lbmode button').forEach(b=>b.classList.toggle('on',b.dataset.m===lbMode));
 if(!fbReady()){msg.textContent='Scoreboards are not connected yet. Add the Firebase web config in game.js.';list.textContent='';return}
 msg.textContent='Loading…';list.textContent='';
 try{await lbUser();const rows=(await lbRows(lbMode)).filter(r=>r.size===lbSize).sort((a,b)=>(a.time||1e9)-(b.time||1e9)).slice(0,15);
  msg.textContent=rows.length?'Fastest time. Find points and digs are on the row.':'No times for this yard yet.';
  list.innerHTML=rows.map((r,i)=>{const you=lbUid&&r.id===lbUid+'_'+lbSize,who=lbMode==='team'?escHtml((r.names||[]).join(', ')):escHtml(r.name);
   return `<div class="lb${you?' you':''}"><b>${i+1}</b><span>${who||'Digger'}</span><i>${fmtTime(r.time)}</i><small>${r.pts|0} pts · ${r.digs|0} digs</small></div>`}).join('')}
 catch(e){console.warn(e);msg.textContent='Could not load the board.';}}
function openBoard(){if(lbBusy)return;boardOpen=true;lbSize=SIZES.includes(wantSize)?wantSize:20;show('board');renderBoard()}
function closeBoard(){boardOpen=false;show('menu')}
function win(){state='won';geyser=true;nz('bandpass',1800,2.5,.7);sweep('lowpass',400,80,2.5,.6);addTrauma(.55);
 const m=Math.floor(elapsed/60),s=Math.floor(elapsed%60),ft=world.finds.filter(f=>f.done&&f.type==='trash').length,fa=world.finds.filter(f=>f.done&&f.type==='artifact').length;
 $('wt').textContent=`You repaired all ${world.sig.length} breaks and turned every supply on in ${world.digs} digs and ${m}:${String(s).padStart(2,'0')}. Water's off — the neighbours will never know. Finds: ${world.score} pts (${ft} trash, ${fa} artifacts).`;
 submitScore();
 setTimeout(()=>{if(state==='won'){document.exitPointerLock?.();$('hud').style.display='none';show('win')}},2400)}
function lose(){state='lost';holding=false;sweep('lowpass',900,120,2.4,.5);nz('lowpass',180,2.2,.7);addTrauma(.5);
 const m=Math.floor(elapsed/60),s=Math.floor(elapsed%60);
 $('lt').textContent=`The water reached the top of your holes after ${m}:${String(s).padStart(2,'0')} and ${world.digs} digs. The neighbours called the water company. You still banked ${world.score} pts of finds.`;
 setTimeout(()=>{if(state==='lost'){document.exitPointerLock?.();$('hud').style.display='none';show('lose')}},2200)}

/* ---------- pickup card: tier, name and value while the item turns in your hands ---------- */
let insp=0,cardT=0;
function showCard(tier,name,pts,dest){$('card').className='show t'+tier;$('cdT').textContent=TIER[tier][0];$('cdN').textContent=name;$('cdP').textContent=`${pts} pts at the ${dest}`;cardT=2.6;insp=1.2;if(tier>1)chime(tier,.6)}
/* ---------- collection book: every kind your team has banked, kept across yards and sessions ---------- */
const BOOK=(()=>{try{return JSON.parse(localStorage.getItem('burstBook'))||{}}catch(e){return{}}})(),BKEYS=[...FKEY,'gem1','gem2','gem3','gem4'];
const bkInfo=k=>{if(k.startsWith('gem')){const G=GEM[+k[3]];return{n:G[0],t:G[3]}}return{n:FIND[k][2],t:FIND[k][3]}};
function bookAdd(k){const first=!BOOK[k];BOOK[k]=(BOOK[k]||0)+1;try{localStorage.setItem('burstBook',JSON.stringify(BOOK))}catch(e){}
 if(first&&state==='play'){const i=bkInfo(k);setTimeout(()=>toast(`${i.n} is new in your collection — press B`,i.t),1400)}}
let THUMB=null,bookFrom=null,bookOpen=false;
/* one 3D thumbnail per kind, rendered once into a small target and gamma-encoded by hand (the main image gets that in the comp pass) */
function thumbs(){if(THUMB)return THUMB;THUMB={};const W=112,S0=new THREE.Scene(),c=new THREE.PerspectiveCamera(30,1,.01,10),rt=new THREE.WebGLRenderTarget(W,W),pix=new Uint8Array(W*W*4),cv2=document.createElement('canvas'),b=new THREE.Box3(),v=new V3(),ct=new V3();
 cv2.width=cv2.height=W;const x=cv2.getContext('2d'),im=x.createImageData(W,W),dl=new THREE.DirectionalLight(0xffffff,1.7);dl.position.set(1,2,1.4);S0.add(new THREE.HemisphereLight(0xfff4e0,0x3a3028,1.2),dl);
 for(const k of BKEYS){const o=k.startsWith('gem')?gemMesh(+k[3]):findMesh(k);o.rotation.y=.6;S0.add(o);b.setFromObject(o);const sz=b.getSize(v).length();b.getCenter(ct);c.position.set(0,.75,1).normalize().multiplyScalar(sz*2.1).add(ct);c.lookAt(ct);
  R.setRenderTarget(rt);R.setClearColor(0x000000,0);R.clear(true,true,true);R.render(S0,c);R.readRenderTargetPixels(rt,0,0,W,W,pix);
  for(let yy=0;yy<W;yy++)for(let xx=0;xx<W;xx++){const s=((W-1-yy)*W+xx)*4,d=(yy*W+xx)*4;for(let ch=0;ch<3;ch++)im.data[d+ch]=255*Math.pow(pix[s+ch]/255,1/2.2);im.data[d+3]=pix[s+3]}
  x.putImageData(im,0,0);THUMB[k]=cv2.toDataURL();S0.remove(o);o.traverse(q=>{if(q.isMesh){q.geometry!==rockG&&q.geometry.dispose();q.material.dispose()}})}
 R.setRenderTarget(null);R.setClearColor(0x000000,1);rt.dispose();return THUMB}
function renderBook(){const th=thumbs(),got=BKEYS.filter(k=>BOOK[k]).length;$('bkSum').textContent=`${got} of ${BKEYS.length} found · rarer finds sit deeper`;
 $('bkGrid').innerHTML=BKEYS.map(k=>{const i=bkInfo(k),n=BOOK[k]|0;return`<div class="bk t${i.t}${n?'':' no'}"><img src="${th[k]}" alt=""><b>${n?i.n:'???'}</b><i>${TIER[i.t][0]}</i><span>${n?'× '+n:''}</span></div>`}).join('')}
function openBook(from){bookFrom=from;bookOpen=true;renderBook();show('book');if(from==null){paused=true;holding=false;document.exitPointerLock?.()}}
function closeBook(){bookOpen=false;if(bookFrom==null){paused=false;show(null);if(!fallback)armLock()}else show(bookFrom)}
/* ---------- settings: local only, remembered in burstSet. Co-op does not sync them ---------- */
const SETLAB={sh:['Off','Near','Normal','Far'],gr:['Off','Fence','Full'],view:['Close','Normal','Far'],sens:['Slow','Normal','Fast'],vol:['Off','Low','Full']},SETBTN={sh:'sSh',gr:'sGr',view:'sView',sens:'sLook',vol:'sVol'},LOOK=[.0013,.0022,.0034];
function loadSet(){let raw=null,o={};try{raw=localStorage.getItem('burstSet');if(raw)o=JSON.parse(raw)||{}}catch(e){}
 const pick=(k,d)=>Number.isInteger(o[k])&&o[k]>=0&&o[k]<SETLAB[k].length?o[k]:d;
 let rm;if(typeof o.rm==='boolean')rm=o.rm;else{try{const v=localStorage.getItem('burstRM');rm=v!=null?v==='1':!!(matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){rm=false}}
 return{sh:pick('sh',2),gr:pick('gr',2),view:pick('view',1),sens:pick('sens',1),vol:pick('vol',2),rm}}
const SET=loadSet();
function saveSet(){try{localStorage.setItem('burstSet',JSON.stringify(SET))}catch(e){}}
try{if(!localStorage.getItem('burstSet'))saveSet()}catch(e){}/* first visit copies Reduce motion out of the old burstRM key */
function setShow(){for(const k in SETBTN)$(SETBTN[k]).textContent=SETLAB[k][SET[k]];$('sRm').textContent=SET.rm?'On':'Off'}
function applyOne(k){if(k==='sh')applyShadows();else if(k==='gr'&&yardBuilt)buildOuterGrass();else if(k==='view'){applyView();bakeNeed=true}else if(k==='vol')applyVol()}
function cycleSet(k){SET[k]=(SET[k]+1)%SETLAB[k].length;saveSet();applyOne(k);setShow()}
let setFrom=null,setOpen=false;
function openSet(from){setFrom=from;setOpen=true;setShow();show('set')}
function closeSet(){setOpen=false;show(setFrom)}
for(const k in SETBTN)$(SETBTN[k]).onclick=()=>cycleSet(k);
$('sRm').onclick=()=>{SET.rm=!SET.rm;saveSet();setShow()};
$('bSet').onclick=()=>openSet('menu');$('bSet2').onclick=()=>openSet('pause');$('bSetX').onclick=closeSet;setShow();

/* ---------- input ---------- */
function flashKey(){if(!Prog.up.lantern)toast('Buy a flashlight at the workbench');else{flashOn=!flashOn;toast(flashOn?'Flashlight on':'Flashlight off')}}
/* left click: use whatever the hotbar has in hand */
function useItem(){if(sel!==want)return;if(sel===0||sel===4||sel===5)tryDig();else if(sel===1)probe();else if(sel===6)ladderKey();else if(!handsBusy()){if(sel===2)flashKey();else if(sel===3)lampKey()}}
addEventListener('wheel',e=>{if(state!=='play'||paused||shopOpen)return;const d=e.deltaY>0?1:-1;let i=want;for(let k=0;k<HB.length;k++){i=(i+d+HB.length)%HB.length;if(HB[i].ok())break}hbSelect(i)},{passive:true});
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'&&state==='play')e.preventDefault();if(state==='intro'){state='menu';audio();show(menuScr());return}
 if(setOpen){if(e.code==='Escape'&&!e.repeat)closeSet();return}
 if(bookOpen){if((e.code==='KeyB'||e.code==='Escape')&&!e.repeat)closeBook();return}
 if(taskOpen){if(e.code==='Escape'&&!e.repeat){e.preventDefault();closeTask()}return}
 if(boardOpen){if(e.code==='Escape'&&!e.repeat)closeBoard();return}
 if(e.code==='KeyF')probe();if(e.code==='KeyE'&&!e.repeat)useE();if(e.code==='KeyP'&&!e.repeat)togglePump();
 if(state!=='play'||paused||e.repeat)return;
 if(e.code==='KeyB'&&!shopOpen){openBook(null);return}
 if(e.code==='KeyL')flashKey();
 if(e.code==='Escape'&&shopOpen){e.preventDefault();setShop(false);return}
 if(e.code==='Escape'){e.preventDefault();openPause();return}
 if(!shopOpen&&/^(Digit|Numpad)[1-8]$/.test(e.code))hbSelect(+e.code.slice(-1)-1);
 if(e.code==='KeyG'&&state==='play'&&!paused)lampKey();
 if(e.code==='KeyT'&&state==='play'&&!paused&&!e.repeat)ladderKey();
 if(e.code==='KeyV'&&DEV&&state==='play'&&!paused&&!e.repeat)toggleFly()});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Escape'&&relock)setTimeout(()=>{relock=false;if(state==='play'&&!paused&&!shopOpen&&!bookOpen&&!setOpen&&!taskOpen&&!fallback)lock()},30)});addEventListener('contextmenu',e=>e.preventDefault());
$('intro').addEventListener('click',()=>{if(state==='intro'){state='menu';audio();show(menuScr())}});
addEventListener('mousemove',e=>{if(state==='intro'||paused)return;if(locked||(fallback&&dragging)){const s=LOOK[SET.sens];yaw-=e.movementX*s;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*s));mdx+=e.movementX;mdy+=e.movementY;moved+=Math.abs(e.movementX)+Math.abs(e.movementY)}});
addEventListener('mousedown',e=>{if(e.target.closest('button,#shop')||state!=='play'||paused)return;if(e.button===2){probe();return}if(e.button!==0)return;if(mowerHeld){mowerOn=!mowerOn;return}holding=sel===0||sel===4||sel===5;heldT=0;autoDug=false;if(locked)useItem();else if(fallback){dragging=true;moved=0}});
addEventListener('mouseup',e=>{if(e.button!==0)return;if(dragging&&moved<6&&!autoDug)useItem();dragging=false;holding=false});
addEventListener('blur',()=>{holding=dragging=false});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===cv;if(!locked&&state==='play'&&!fallback&&!shopOpen&&!bookOpen&&!setOpen&&!taskOpen&&!relock){holding=false;paused=true;setShop(false);show('pause')}});
/* yard-size selector (menu, co-op lobby, win): one shared choice, remembered */
window.addPoints=n=>{if(!DEV){console.warn('addPoints only works on a local host with dev: true in config.js');return}Net.send({type:'bank_add',n:n|0,by:ME})};
window.setWeather=name=>{if(!DEV){console.warn('setWeather only works on a local host with dev: true in config.js');return}const n=String(name||'auto').toLowerCase();
 if(n==='auto'||n==='cycle'){weatherHold=null;console.log('weather: auto');return}
 if(n==='clear'||n==='cloud'||n==='cloudy'||n==='rain'){weatherHold=n==='cloudy'?'cloud':n;console.log('weather: '+weatherHold);return}
 console.log('setWeather("clear" | "cloud" | "rain" | "auto")')};
const szBtns=[...document.querySelectorAll('.szsel button')],szShow=()=>szBtns.forEach(b=>b.classList.toggle('on',+b.dataset.s===wantSize));
szBtns.forEach(b=>b.onclick=()=>{wantSize=+b.dataset.s;try{localStorage.setItem('burstSize',wantSize)}catch(e){}szShow();
 if((state==='menu'||state==='intro')&&Net.mode==='solo'&&wantSize!==S)newGame(undefined,wantSize)/* the yard behind the menu follows the choice */});szShow();
$('bSolo').onclick=()=>startPlay();$('bHow').onclick=()=>{$('how').hidden=!$('how').hidden};$('bBoard').onclick=openBoard;$('bBoardX').onclick=closeBoard;
document.querySelectorAll('.lbmode button').forEach(b=>b.onclick=()=>{lbMode=b.dataset.m;renderBoard()});
document.querySelectorAll('.lbsz button').forEach(b=>b.onclick=()=>{lbSize=+b.dataset.z;renderBoard()});
$('bRes').onclick=()=>{paused=false;show(null);lock()};
$('bNew3').onclick=$('bNew4').onclick=()=>{if(Net.mode==='client')return;
 if(Net.mode==='host'){paused=false;show(null);Net.send({type:'new_yard',seed:rndSeed(),size:wantSize});if(!fallback)lock();return}
 if(state==='play'){paused=false;show(null);newGame(undefined,wantSize);if(!fallback)lock()}else startPlay()};
for(const id of['bMenu2','bMenu3','bMenu4'])$(id).onclick=toMenu;
$('bBook').onclick=()=>openBook('pause');$('bBook2').onclick=()=>openBook('menu');$('bBookX').onclick=closeBook;

function moveBody(dt,K){
 if(flying&&DEV){const sp=(K.ShiftLeft?16:8)*(BSPD[Prog.up.boots]||1),f=(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0),st=(K.KeyD?1:0)-(K.KeyA?1:0),up=(K.Space?1:0)-(K.ControlLeft?1:0);
  const cp=Math.cos(pitch),fx=-Math.sin(yaw)*cp*f+Math.cos(yaw)*st,fy=-Math.sin(pitch)*f+up,fz=-Math.cos(yaw)*cp*f;
  const l=Math.hypot(fx,fy,fz)||1;px+=fx/l*sp*dt;py+=fy/l*sp*dt;pz+=fz/l*sp*dt;ey=py+1.7;pvx=pvy=pvz=0;onGround=false;return}
 const wl=waterY(),wet=py<wl-.5,sp=(K.ShiftLeft&&!wet?6.2:4.3)*BSPD[Prog.up.boots]*(wet?.55:1),f=(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0),s=(K.KeyD?1:0)-(K.KeyA?1:0);
 const lad=climbLad();
 if(lad&&(f||K.KeyS||K.ArrowDown)&&!K.Space&&!shopOpen){const dir=(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0);py=Math.max(lad.y,Math.min(lad.y+LH-.05,py+dir*2.6*dt));px+=(lad.x-px)*Math.min(1,dt*6);pz+=(lad.z-pz)*Math.min(1,dt*6);pvy=pvx=pvz=0;ey=py+1.7;onGround=py>=lad.y+LH-.4;return}
 let x=px,y=py,z=pz;
 if(!world.room(x,y,z)){for(let i=1;i<=16;i++)if(world.room(x,y+i*.05,z)){y+=i*.05;pvy=0;break}}
 const ground=pvy<=0&&(!world.room(x,y-.06,z)||ladTop());
 let wx=0,wz=0;if(f||s){const dx=-Math.sin(yaw)*f+Math.cos(yaw)*s,dz=-Math.cos(yaw)*f-Math.sin(yaw)*s,l=Math.hypot(dx,dz)||1;wx=dx/l*sp;wz=dz/l*sp}
 const ak=Math.min(1,dt*(ground||wet?20:(f||s?6:1.5)));pvx+=(wx-pvx)*ak;pvz+=(wz-pvz)*ak;
 /* in water (waist deep): sink slowly, Space swims up until your feet are almost at the surface, so you can climb out onto a low ledge */
 if(wet&&!shopOpen){pvy*=Math.max(0,1-dt*3);pvy=K.Space&&y<wl-.15?Math.min(3.4,pvy+16*dt):Math.max(-1.3,pvy-6*dt)}
 else if(ground&&K.Space&&!shopOpen)pvy=8.6;else pvy=Math.max(-35,pvy-32*dt);
 const slide=(x,y,z,dx,dz)=>{let nx=x,nz=z;if(dx&&world.room(x+dx,y,z)&&free(x+dx,z))nx=x+dx;if(dz&&world.room(nx,y,z+dz)&&free(nx,z+dz))nz=z+dz;return{x:nx,y,z:nz}};
 const stepUp=(x,y,z,dx,dz)=>{const a=slide(x,y,z,dx,dz);if(!ground||(a.x===x+dx&&a.z===z+dz))return a;
  const STEP=.6;if(!world.room(x,y+STEP,z))return a;const b=slide(x,y+STEP,z,dx,dz);
  if(Math.hypot(b.x-x,b.z-z)<=Math.hypot(a.x-x,a.z-z)+1e-4)return a;
  let lo=y,hi=y+STEP;if(!world.room(b.x,y,b.z)){for(let k=0;k<8;k++){const m=(lo+hi)/2;if(world.room(b.x,m,b.z))hi=m;else lo=m}}else hi=y;
  return world.room(b.x,hi,b.z)?{x:b.x,y:hi,z:b.z}:a};
 let mx=pvx*dt,mz=pvz*dt;const n=Math.max(1,Math.ceil(Math.hypot(mx,mz)/.1));
 for(let i=0;i<n;i++){const m=stepUp(x,y,z,mx/n,mz/n);x=m.x;y=m.y;z=m.z}
 const ny=y+pvy*dt;
 if(pvy<0){if(ladTop()){pvy=0}else if(world.room(x,ny,z))y=ny;else{let lo=ny,hi=y;for(let k=0;k<10;k++){const m=(lo+hi)/2;if(world.room(x,m,z))hi=m;else lo=m}y=hi;if(!wet)landV=Math.max(landV,-pvy);pvy=0}}
 else if(pvy>0){if(world.room(x,ny,z))y=ny;else{let lo=y,hi=ny;for(let k=0;k<10;k++){const m=(lo+hi)/2;if(world.room(x,m,z))lo=m;else hi=m}y=lo;pvy=0}}
 const h=world.room(x,y,z)||1.8,want=y+(h>=1.8?1.7:h-.12);
 px=x;py=y;pz=z;ey=want<ey?want:ey+(want-ey)*Math.min(1,dt*8);onGround=ground&&!wet}
/* ---------- camera feel: stride bob (footstep at each low point), sprint FOV, landing dip, strafe roll, trauma shake ---------- */
let bobP=0,bobA=0,dip=0,dipV=0,roll=0,trauma=0,fovK=0,landV=0,onGround=true;/* SET.rm: no bob, roll, dip or shake */
/* shake strength is trauma squared, so small knocks stay small and big ones hit hard */
function addTrauma(a){trauma=Math.min(1,trauma+a)}
function camFeel(dt,dist){const mv=!paused&&koT<=0,sp=dist/Math.max(dt,1e-4),m=SET.rm?0:1,ph0=bobP;
 if(onGround&&mv)bobP+=dist/(keys.ShiftLeft?2:1.5)*Math.PI;/* one step per 1.5 m walking, 2 m sprinting */
 if(Math.floor(bobP/Math.PI)!==Math.floor(ph0/Math.PI))stepSnd();
 bobA+=((onGround&&mv&&sp>.4?Math.min(1,sp/4.3):0)-bobA)*Math.min(1,dt*8);
 if(landV>3){dipV+=Math.min(2.6,landV*.12);stepSnd();if(landV>9)addTrauma(Math.min(.4,(landV-9)*.05))}landV=0;
 dipV+=(-80*dip-14*dipV)*dt;dip+=dipV*dt;/* damped spring back to 0 */
 const s=(keys.KeyD?1:0)-(keys.KeyA?1:0);roll+=((mv?-s*.022*Math.min(1,sp/4):0)-roll)*Math.min(1,dt*6);
 fovK+=((keys.ShiftLeft&&onGround&&sp>5?1:0)-fovK)*Math.min(1,dt*4);const fov=70+6*fovK;if(Math.abs(cam.fov-fov)>.01){cam.fov=fov;cam.updateProjectionMatrix()}
 trauma=Math.max(0,trauma-dt*1.3);const k=trauma*trauma*m,ns=(a,b)=>Math.sin(T*a+b)*.6+Math.sin(T*a*2.3+b*1.7)*.4;
 const by=(Math.abs(Math.sin(bobP))-1)*.045*bobA*m,bx=Math.cos(bobP)*.028*bobA*m,cy=Math.cos(yaw),sy=Math.sin(yaw);
 cam.position.set(px+cy*bx+k*.04*ns(31,2),ey+by-dip*m+k*.03*ns(29,5),pz-sy*bx);
 cam.rotation.set(pitch+k*.035*ns(23,1),yaw+k*.045*ns(19,4),(roll+Math.sin(bobP)*.006*bobA)*m+k*.05*ns(27,7))}
/* ---------- shovel swing: wind-up, strike (the dig is sent here), follow-through, recover. A short hit-stop holds the pose on impact ---------- */
const SWK=[[0,0,0,0],[.12,.07,.09,.38],[.2,-.12,-.22,-.85],[.3,-.1,-.17,-.74],[.62,0,0,0]],/* time, dy, dz, tilt */
 SWE=[u=>u*u*(3-2*u),u=>u*u,u=>u*u*(3-2*u),u=>1-(1-u)**3],swP=[0,0,0];
let swT=-1,pend=null,hitStop=0;
function swingPose(dt){if(swT<0){swP.fill(0);return swP}
 if(hitStop>0)hitStop-=dt;else{const t0=swT;swT+=dt/(under?1.3:1);if(t0<SWK[2][0]&&swT>=SWK[2][0]){strike();if(hitStop>0)swT=SWK[2][0]}}
 if(swT>=SWK[4][0])swT=-1;return swingAt(swT,swP)}
function swingAt(t,o){if(t<0||t>=SWK[4][0]){o.fill(0);return o}let i=0;while(t>=SWK[i+1][0])i++;const a=SWK[i],b=SWK[i+1],e=SWE[i]((t-a[0])/(b[0]-a[0]));for(let k=0;k<3;k++)o[k]=a[k+1]+(b[k+1]-a[k+1])*e;return o}
function strike(){const p=pend;pend=null;if(!p||state!=='play'||koT>0||handsBusy())return;hitStop=.05;
 for(let i=0;i<GLN;i++){const q=GS[i];if(!q||q.cut!=null)continue;const c=cabSeg(p.x,p.z,i);if(c.d<.4){Net.send({type:'cable_cut',i,t:c.t,by:ME});break}}/* the shovel goes through the cable */
 Net.send(Object.assign({type:'dig',by:ME},p));crossHit()}
/* held tools lag behind the mouse and bob in a figure-8 with your stride */
let mdx=0,mdy=0,swX=0,swY=0;
function vmSway(dt){const k=SET.rm?.3:1,r=Math.min(1,dt*10),iv=1/Math.max(dt,1e-3),tx=Math.max(-.05,Math.min(.05,-mdx*iv*3e-5))*k,ty=Math.max(-.04,Math.min(.04,mdy*iv*3e-5))*k;mdx=mdy=0;swX+=(tx-swX)*r;swY+=(ty-swY)*r;
 const bm=bobA*k;VM.position.set(swX+Math.cos(bobP)*.014*bm,swY+Math.sin(2*bobP)*.007*bm-.006*bm-dip*.35*(SET.rm?0:1)+Math.max(-.03,Math.min(.03,-pvy*.004)),0);VM.rotation.set(swY*1.4,-swX*1.6,swX*.8)}
/* crosshair: dim where the shovel can't dig, a ring over something E can use, a pulse on each hit */
let crT=0,crNo=false;
function crossTick(dt){const c=$('cross');if((crT-=dt)<=0){const dig=sel===0||sel===4||sel===5,open=aim&&Math.abs(aim.x)<=YH-1.4&&Math.abs(aim.z)<=YH-1.4&&(sel===5||((aim.y<=-.3||isMown(aim.x,aim.z))&&canSee()&&!(sel===0&&aimStone())));
  crT=.12;crNo=state==='play'&&dig&&!handsBusy()&&!tgt&&!open}
 c.classList.toggle('no',crNo);c.classList.toggle('tg',!!tgt)}
function crossHit(){const c=$('cross');c.classList.remove('hit');void c.offsetWidth;c.classList.add('hit')}
/* ---------- loop ---------- */
function play(dt){
 const K=keys,ox=px,oz=pz;
 if(!paused&&koT<=0){if(!taskOpen)moveBody(dt,K);else tankTick(dt);if(state==='play')elapsed+=dt}
 camFeel(dt,Math.hypot(px-ox,pz-oz));cam.updateMatrixWorld();
 const cp=Math.cos(pitch),dir=digDir.set(-Math.sin(yaw)*cp,Math.sin(pitch),-Math.cos(yaw)*cp);aim=null;/* aim follows the view, never the shake */
 EYE.set(px,ey,pz);const hit=rayVox(EYE.x,EYE.y,EYE.z,dir.x,dir.y,dir.z,4.2);if(hit)aim=new V3(hit.x,hit.y,hit.z);
 cd-=dt;
 /* holding left mouse = keep digging at the tool's max rate (fallback drag mode: only while the cursor stays still) */
 if(holding&&(sel===0||sel===4||sel===5)&&want===sel&&state==='play'&&!paused){heldT+=dt;if(locked)tryDig();else if(dragging&&moved<6&&heldT>.3){const c0=cd;tryDig();if(cd>c0)autoDug=true}}
 if(Net.mode!=='solo'||!paused)dayT=(dayT+dt/DAY_LEN)%1;/* co-op keeps running while one player is paused */
 const fl=Prog.up.lantern;flash.intensity+=((flashOn&&fl?2.6+1.1*(fl-1):0)-flash.intensity)*Math.min(1,dt*12);flash.angle=fl>1?.6:.45;flash.distance=fl>1?22:16;
 const nb=Math.hypot(px-BENCH[0],pz-BENCH[1]);if(shopOpen&&nb>3.8)setShop(false);
 pickTarget();hiShow();let hn=tgt?(tgt.x?tgt.l:'E — '+tgt.l):state==='play'&&!mowerHeld?carryHint():'';
 if(!hn&&sel===0&&aimStone()&&state==='play'&&!paused)hn=Prog.up.pick?'Switch to the pickaxe (5)':'Stone — buy a pickaxe';
 if($('hint').textContent!==hn)$('hint').textContent=hn;
 $('hint').style.display=hn&&!shopOpen&&!taskOpen&&state==='play'&&!paused?'block':'none';lampTick(dt);
 pc=Math.max(0,pc-dt);const sw=swingPose(dt);crossTick(dt);
 if(sel!==want){swapK=Math.min(1,swapK+dt*7);if(swapK>=1)sel=want}else swapK=Math.max(0,swapK-dt*7);
 const empty=!handsBusy(),swo=swapK*.6,bob=Math.sin(T*1.7)*.004;pa=Math.max(0,pa-dt*1.5);vmSway(dt);
 sh.visible=empty&&sel===0;sh.position.set(.45,-.62+sw[0]+bob-swo,-.3+sw[1]);sh.rotation.set(sw[2],-sw[2]*.12,-sw[2]*.06);
 hp.visible=empty&&sel===1;if(hp.visible){const d=Math.sin(pa*Math.PI);hp.position.set(.3,-.18+bob-d*.28-swo,-.55-d*.1);hp.rotation.set(.3,-.12,.1)}
 hf.visible=empty&&sel===2;if(hf.visible){hfLens.color.setRGB(...(flashOn&&Prog.up.lantern?[4,3.6,2.8]:[.25,.25,.25]));hf.position.set(.3,-.3+bob-swo,-.42);hf.rotation.set(.04,-.12,0)}
 hl.visible=empty&&sel===3;if(hl.visible){hl.position.set(.28,-.33+bob-swo,-.5);hl.rotation.set(.12,-.2,.04)}
 pk.visible=empty&&sel===4;if(pk.visible){pk.position.set(.45,-.62+sw[0]+bob-swo,-.3+sw[1]);pk.rotation.set(sw[2],-sw[2]*.12,-sw[2]*.06)}
 su.visible=empty&&sel===5;if(su.visible){su.position.set(.42,-.35+sw[0]+bob-swo,-.5+sw[1]);su.rotation.set(.55+sw[2],0,0)}
 ldv.visible=empty&&sel===6;if(ldv.visible){ldv.position.set(.34,-.15+bob-swo,-.35);ldv.rotation.set(.15,-.3,.1)}
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
 mower.wheels.forEach(w=>w.rotation.y+=dt*14);
  if(Math.random()<.6)spawn(mower.position.clone().add(new V3((Math.random()-.5)*.6,.3,(Math.random()-.5)*.6)),new V3((Math.random()-.5)*1.2,1+Math.random(),(Math.random()-.5)*1.2),.6,false,soilCol(-1,0),.2+Math.random()*.15)}
 if(AC&&clipM){const on=mowerOn&&state==='play'&&!paused,att=mowerHeld?1:Math.max(.12,1-Math.hypot(px-mower.position.x,pz-mower.position.z)/18);clipM.gain.gain.setTargetAtTime(on?.05*att:0,AC.currentTime,.15);clipM.blade.gain.setTargetAtTime(on?.012*att:0,AC.currentTime,.15)}
 /* carried rock sits in the hands */
 /* just picked up: held close to the face and turned (insp), then eased down into the carry pose */
 insp=Math.max(0,insp-dt);const ik=sstep(0,.4,insp),lr=(a,b)=>a+(b-a)*ik;
 if(pile.length){pileG.visible=true;carryM.visible=false;pileG.position.set(lr(.35,0),lr(-.35,-.07),lr(-.7,-.45));pileG.rotation.set(.15,T*(.4+2*ik),.05)}
 else if(carry>=0){pileG.visible=false;carryM.visible=true;carryM.position.set(lr(.35,0),lr(-.35,-.07),lr(-.7,-.45));carryM.rotation.set(rk[carry].a,rk[carry].b+T*(.4+2*ik),rk[carry].c)}else pileG.visible=carryM.visible=false;
 if(carryFM){carryFM.position.set(lr(.32,0),lr(-.36,-.06),lr(-.78,-.42));carryFM.rotation.set(lr(.45,.7),T*(.6+2.2*ik),lr(.2,0))}
 if(cardT>0&&(cardT-=dt)<=0)$('card').className='';
 $('cdf').style.height=(pc>0?pc/pcMax*100:0)+'%';
 const hd=Math.hypot(px-world.burst.x,world.hAt(px,pz)-world.burst.y,pz-world.burst.z);
 if(AC&&hissG)hissG.gain.setTargetAtTime(state==='play'&&!paused&&hd<3?Math.pow(1-hd/3,2)*.16:0,AC.currentTime,.15);
 if(AC&&rainSnd)rainSnd.gain.setTargetAtTime(rainAmt*(ey<-1?.015:.06)*(state==='play'&&!paused?1:.3),AC.currentTime,.4);
 hudT-=dt;if(hudT<=0){hudT=.25;$('tm').textContent=Math.floor(elapsed/60)+':'+String(Math.floor(elapsed%60)).padStart(2,'0');const hh=dayT*24;$('cl').textContent=String(Math.floor(hh)).padStart(2,'0')+':'+String(Math.floor(hh%1*60)).padStart(2,'0')+(dayF<.45?' ☾':' ☀')+(rainAmt>.4?' rain':cloudAmt>.5?' cloudy':'');if(world)$('poi').textContent=world.foundN()+'/'+world.sig.length}
 if(toastT>0&&(toastT-=dt)<=0)$('toast').style.opacity=0;
}
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
 if(state==='play'||state==='won'||state==='lost'){play(dt);Net.tick(dt)}
 else{if(cam.fov!==70){cam.fov=70;cam.updateProjectionMatrix()}const a=Math.sin(T*.12)*.9;cam.position.set(Math.sin(a)*(YH+7),6.5+DEL*.5,Math.cos(a)*(YH+7));cam.lookAt(0,0,0)}
 for(let i=rings.length-1;i>=0;i--){const q=rings[i];q.t=Math.min(1,q.t+dt/.9);q.age=(q.age||0)+dt;q.m.scale.setScalar(Math.max(.01,q.r*(1-Math.pow(1-q.t,3))));q.m.material.opacity=Math.max(0,Math.min(1,(12-q.age)/4))*.6;if(q.age>12){scene.remove(q.m);rings.splice(i,1)}}
 if(geyser)for(let k=0;k<4;k++)spawn(new V3(world.burst.x,world.burst.y+.15,world.burst.z),new V3((Math.random()-.5)*1.4,5+Math.random()*3,(Math.random()-.5)*1.4),1.5,true);
 if(world){stepParts(dt);stepFall(dt);stepBeams();floodTick(dt);gasTick(dt);caveTick(dt);koTick(dt)}SPK.value=cv.height/(2*Math.tan(cam.fov*Math.PI/360));DUST.m.uniforms.uL.value=.18+.82*dayF;POOLS.forEach(p=>p.step(dt));GU.uT.value=T;applyDay();
 if(uwK>.01){scene.fog.color.lerp(_c.setRGB(.012,.035,.03),uwK);scene.fog.near*=1-uwK;scene.fog.far+=(7-scene.fog.far)*uwK}comp.uniforms.uW.value=uwK;fitClip();
 {const depth=Math.max(0,-ey);let t=1+Math.min(.55,depth*.07)+(under?.2:0);t*=1+.12*nightF;expK+=(t-expK)*Math.min(1,dt*1.1);comp.uniforms.uE.value=expK}
 dynRes(dt);stepRain(dt);fxRender()}
newGame();requestAnimationFrame(loop);
