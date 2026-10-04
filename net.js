/* ---------- multiplayer: PeerJS star topology (loaded before game.js) ----------
   Solo: Net.send applies the action locally. Host: validates, stamps a seq, broadcasts and applies. Client: sends an intent to
   the host and only applies what the host echoes back. Game code just uses Net.send / Net.on and the `ME` id.
   Everything below touches game.js globals (world, rk, mown, ...) only at call time. */
var ME='local';
const Net=(()=>{
 const el=id=>document.getElementById(id),AB='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',COL=[0xe9a23b,0x4fa3e0,0xd9534f,0x6cc070],MAXP=4,rem={},
  b64=u=>{let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)},
  unb=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u},
  packV=u=>{const o=new Uint8Array((u.length+7)>>3);for(let i=0;i<u.length;i++)if(u[i])o[i>>3]|=1<<(i&7);return o},
  unpackV=(b,len)=>{const u=new Uint8Array(len);for(let i=0;i<len;i++)if(b[i>>3]&(1<<(i&7)))u[i]=1;return u},
  r3=v=>Math.round(v*1000)/1000,msg=t=>{el('mpMsg').textContent=t},nm=s=>s===0?'Host':'Player '+(s+1),
  cleanName=s=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim().slice(0,12),
  myName=()=>{const n=cleanName(el('pname').value);try{localStorage.setItem('burstName',n)}catch(e){}return n},
  who=id=>N.names[id]||nm(N.roster[id]);
 let peer=null,hostConn=null,clients={},acc=0,mowAcc=0,clk=0,connT=0;
 const N={mode:'solo',seq:0,hs:[],code:'',roster:{},names:{},pend:'',
  on(h){this.hs.push(h)},emit(a){this.hs.forEach(h=>h(a))},
  send(a){a.by=ME;if(N.mode==='client'){if(hostConn&&hostConn.open)hostConn.send({t:'i',a});return}N.commit(a)},
  commit(a){if(!ok(a))return;a.seq=++N.seq;if(N.mode==='host')bcast({t:'a',a});N.emit(a)},
  flushMow(){if(mowQ.length)N.send({type:'mow',cells:mowQ.splice(0)})},
  swing(id){const r=rem[id];if(r)r.swing=1},
  reset(){for(const id in rem)hold(rem[id],-1,-1,false)},
  tags(){return Object.values(rem).flatMap(r=>[r.tag,r.beam])},/* transparent extras hidden in the depth pass */
  ui(){const n=Object.keys(N.roster).length,b=document.body.classList,s=N.mode==='solo'?'':`Room ${N.code} · ${n} player${n>1?'s':''}`;
   b.toggle('mp',N.mode!=='solo');b.toggle('cl',N.mode==='client');el('rm').textContent=s&&' · '+s;el('room').textContent=s},
  tick(dt){if(N.mode==='solo')return;updateRemotes(dt);acc+=dt;mowAcc+=dt;
   if(N.mode==='host'&&(clk+=dt)>10){clk=0;bcast({t:'clock',d:dayT})}/* host owns the clock; clients just resync now and then */
   if(mowAcc>.1){mowAcc=0;if(mowerOwner===ME)N.flushMow()}
   if(acc>=1/15){acc=0;const s={x:r3(px),y:r3(py),z:r3(pz),yaw:r3(yaw),pitch:r3(pitch),cr:carry,cf:carryF,fl:flashOn&&Prog.up.lantern?1:0,m:mowerHeld?[r3(mower.position.x),r3(mower.position.z),r3(mower.rotation.y),mowerOn?1:0]:null};
    if(N.mode==='host')bcast({t:'p',id:'host',s});else if(hostConn&&hostConn.open)hostConn.send({t:'p',s})}},
  leave(){clearTimeout(connT);if(peer){const p=peer;peer=null;try{p.destroy()}catch(e){}}hostConn=null;clients={};N.mode='solo';N.code='';N.roster={};N.names={};N.seq=0;ME='local';
   clearRemotes();mowerOwner=null;mowerTarget=null;N.ui()},
  host(){if(!window.Peer)return msg('Multiplayer library failed to load.');const name=myName()||'Host';N.leave();msg('Creating room…');
   connT=setTimeout(()=>fail('Could not reach the connection server.'),12000);
   const go=n=>{const code=Array.from({length:5},()=>AB[Math.random()*AB.length|0]).join(''),p=peer=new Peer('burst-'+code,{debug:0});
    p.on('open',()=>{if(peer!==p)return;clearTimeout(connT);ME='host';N.mode='host';N.code=code;N.roster={host:0};N.names={host:name};startPlay();N.ui();msg('');toast('Room code: '+code+' — Esc for the invite link')});
    p.on('connection',onConn);
    p.on('disconnected',()=>{if(peer===p&&!p.destroyed)p.reconnect()});
    p.on('error',e=>{if(peer!==p)return;if(e.type==='unavailable-id'&&n<4){p.destroy();go(n+1);return}if(N.mode!=='host')fail('Could not create a room ('+e.type+').')})};
   go(0)},
  join(code){code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length<4)return msg('Enter the 5-character room code.');
   if(!window.Peer)return msg('Multiplayer library failed to load.');const name=myName();N.leave();msg('Connecting…');
   const p=peer=new Peer({debug:0});connT=setTimeout(()=>fail('Could not connect. Check the code and try again.'),15000);
   p.on('error',e=>{if(peer!==p)return;if(N.mode==='client')lost('Connection lost.');else fail(e.type==='peer-unavailable'?'No room with that code.':'Connection problem ('+e.type+').')});
   p.on('open',id=>{if(peer!==p)return;ME=id;const c=hostConn=p.connect('burst-'+code,{reliable:true,metadata:{name}});
    c.on('data',m=>{if(peer===p)onHost(m)});c.on('close',()=>{if(peer===p&&N.mode==='client')lost('The host left the game.')})})}};

 function fail(t){N.leave();msg(t)}
 function lost(t){toMenu();show('mp');msg(t)}
 function bcast(m,skip){for(const id in clients)if(id!==skip&&clients[id].conn.open)clients[id].conn.send(m)}

 /* ---- host-side validation: the host's world is the truth ---- */
 function ok(a){if(!a||typeof a.type!=='string'||!world)return false;const b=a.by;
  switch(a.type){
   case'dig':return isFinite(a.x)&&isFinite(a.z)&&(a.y==null||isFinite(a.y))&&(a.dx==null||(isFinite(a.dx)&&isFinite(a.dy)&&isFinite(a.dz)));
   case'find_pick':{const f=world.finds[a.n];return!!f&&!f.done&&!f.held}
   case'find_place':case'find_deposit':{const f=world.finds[a.n];return!!f&&!f.done&&f.held===b}
   case'rock_pick':{const q=rk[a.n];return!!q&&!q.held}
   case'rock_place':{const q=rk[a.n];return!!q&&q.held===b}
   case'rock_sell':{const q=rk[a.n];return!!q&&q.held===b&&!!q.gem}
   case'lamp_place':return Number.isInteger(a.i)&&a.i>=0&&a.i<Math.min(GLN,Prog.up.lamps)&&!GS[a.i]&&isFinite(a.x)&&isFinite(a.z)&&Math.abs(a.x)<=S/2&&Math.abs(a.z)<=S/2&&Math.hypot(a.x-SOCK[0],a.z-SOCK[1])<=CABLE_MAX+.5;
   case'lamp_pick':return Number.isInteger(a.i)&&a.i>=0&&a.i<GLN&&!!GS[a.i];
   case'lamp_power':return Prog.up.lamps>0;
   case'cable_cut':return Number.isInteger(a.i)&&!!GS[a.i]&&GS[a.i].cut==null&&isFinite(a.t);
   case'cable_fix':return Number.isInteger(a.i)&&!!GS[a.i]&&GS[a.i].cut!=null;
   case'bank_add':return DEV&&Number.isInteger(a.n)&&a.n>0&&a.n<=10000;
   case'mower_grab':return!mowerOwner;
   case'mower_drop':return mowerOwner===b;
   case'mow':return mowerOwner===b&&Array.isArray(a.cells);
   case'buy':return Object.prototype.hasOwnProperty.call(UPG,a.id)&&Prog.up[a.id]<UPG[a.id].max&&Prog.bank>=upCost(a.id);
   case'new_yard':return b===ME&&(a.size==null||SIZES.includes(a.size));
   case'win':return b===ME}
  return false}

 /* ---- host: connections ---- */
 function onConn(conn){
  conn.on('open',()=>{
   if(Object.keys(clients).length>=MAXP-1){conn.send({t:'full'});setTimeout(()=>conn.close(),300);return}
   const used=Object.values(N.roster);let slot=1;while(used.includes(slot))slot++;
   N.roster[conn.peer]=slot;N.names[conn.peer]=cleanName(conn.metadata&&conn.metadata.name)||nm(slot);
   conn.send({t:'welcome',you:conn.peer,code:N.code,roster:N.roster,names:N.names,snap:snap()});
   clients[conn.peer]={conn,pose:null};bcast({t:'roster',r:N.roster,n:N.names});addRemote(conn.peer);toast(who(conn.peer)+' joined');N.ui()});
  conn.on('data',m=>{const c=clients[conn.peer];if(!c||!m)return;
   if(m.t==='i'&&m.a&&typeof m.a==='object'){const a=m.a;a.by=conn.peer;delete a.seq;N.commit(a)}
   else if(m.t==='p'&&m.s){c.pose=m.s;onPose(conn.peer,m.s);bcast({t:'p',id:conn.peer,s:m.s},conn.peer)}});
  conn.on('close',()=>drop(conn.peer));conn.on('error',()=>drop(conn.peer))}
 function drop(id){const c=clients[id];if(!c)return;delete clients[id];const p=c.pose,n=who(id);delete N.names[id];
  /* put down whatever they were carrying, where they stood */
  world.finds.forEach((f,i)=>{if(f.held===id)N.commit({type:'find_place',n:i,x:p?p.x:f.x,z:p?p.z:f.z,by:id})});
  rk.forEach((q,i)=>{if(q.held===id)N.commit({type:'rock_place',n:i,x:p?p.x:q.x,z:p?p.z:q.z,by:id})});
  if(mowerOwner===id)N.commit({type:'mower_drop',x:p&&p.m?p.m[0]:mower.position.x,z:p&&p.m?p.m[1]:mower.position.z,ry:p&&p.m?p.m[2]:mower.rotation.y,on:0,by:id});
  delete N.roster[id];removeRemote(id);bcast({t:'roster',r:N.roster,n:N.names});toast(n+' left');N.ui()}

 /* ---- client: messages from the host ---- */
 function onHost(m){if(!m)return;
  switch(m.t){
   case'welcome':clearTimeout(connT);N.mode='client';N.code=m.code;N.roster=m.roster;N.names=m.names||{};startPlay(m.snap.seed,m.snap.size);applySnap(m.snap);
    for(const id in N.roster)if(id!==ME)addRemote(id);N.ui();msg('');break;
   case'a':N.seq=m.a.seq;N.emit(m.a);break;
   case'p':onPose(m.id,m.s);break;
   case'clock':dayT=m.d;break;
   case'roster':{const old=N.roster,oldN=N.names;N.roster=m.r;if(m.n)N.names=m.n;
    for(const id in m.r)if(!(id in old)&&id!==ME){addRemote(id);toast(who(id)+' joined')}
    for(const id in old)if(!(id in m.r)){removeRemote(id);toast((oldN[id]||nm(old[id]))+' left')}
    N.ui();break}
   case'full':fail('That room is full.')}}

 /* ---- late join: full state snapshot so joiners don't depend on replaying every action ---- */
 function snap(){const w=world;return{day:dayT,prog:Prog,seed:w.seed,size:S,V:b64(packV(w.vox)),D:b64(w.D),digs:w.digs,score:w.score,log:w.log,
  f:w.finds.map(f=>[f.x,f.y,f.z,f.held||0,f.done?1:0,f.out?1:0]),r:rk.map(q=>[q.x,q.y,q.z,q.held||0,q.gem||0]),m:b64(mown),sf:w.sig.map(s=>s.f?1:0),
  gl:GS.map(q=>q?[q.x,q.z,q.cut==null?-1:q.cut]:0),glon:glOn?1:0,
  mo:{o:mowerOwner||null,x:mower.position.x,z:mower.position.z,ry:mower.rotation.y,on:mowerOn?1:0}}}
 function applySnap(s){const w=world;
  if(s.V)w.vox.set(unpackV(unb(s.V),w.vox.length));w.D.set(unb(s.D));w.digs=s.digs;w.score=s.score;w.log=s.log;
  s.f.forEach((a,i)=>{const f=w.finds[i];if(!f)return;f.x=a[0];f.y=a[1];f.z=a[2];f.held=a[3];f.done=a[4];f.out=a[5]});
  s.r.forEach((a,i)=>{const q=rk[i];if(!q)return;q.x=a[0];q.y=a[1];q.z=a[2];q.held=a[3];
   if(a.length>4&&(a[4]|0)!==q.gem){q.gem=a[4]|0;if(q.gem){q.s=Math.max(q.s,.1);rocks.setColorAt(i,gc.setRGB(...GEM[q.gem][2]))}else rocks.setColorAt(i,gc.setHSL(.1,.15,.4).convertSRGBToLinear())}});
  w.sig.forEach((x,i)=>x.f=s.sf[i]);mown.set(unb(s.m));
  sync(true);for(let i=0;i<w.log.length;i+=2)clearGrass(w.log[i],w.log[i+1]);
  for(let ci=0;ci<MG*MG;ci++)if(mown[ci])cutCell(ci);grass.instanceMatrix.needsUpdate=true;
  rk.forEach((q,i)=>{if(q.held){go.position.set(0,-50,0);go.scale.setScalar(0);go.updateMatrix();rocks.setMatrixAt(i,go.matrix)}else setRock(i)});rocks.instanceMatrix.needsUpdate=rocks.instanceColor.needsUpdate=true;
  w.finds.forEach(syncFind);
  const o=s.mo;mowerOwner=o.o;mowerOn=!!o.on;mower.position.set(o.x,w.hAt(o.x,o.z),o.z);mower.rotation.y=o.ry;mowerTarget={x:o.x,z:o.z,ry:o.ry};
  dayT=s.day;Prog={bank:s.prog.bank,up:Object.assign({},s.prog.up)};hudPts();
  s.gl.forEach((a,i)=>{if(a)glPlace(i,a[0],a[1],a[2]>=0?a[2]:null);else if(GS[i])glPick(i)});glOn=!!s.glon;glK=glOn?1:0}

 /* ---- remote players: simple avatar (body, head, the real shovel) with an interpolated pose ---- */
 function tagTex(t,c){const cv=document.createElement('canvas');cv.width=256;cv.height=64;const x=cv.getContext('2d');let sz=34;x.font='bold '+sz+'px Georgia,serif';while(sz>16&&x.measureText(t).width>230)x.font='bold '+(sz-=2)+'px Georgia,serif';x.textAlign='center';x.textBaseline='middle';
  x.lineWidth=6;x.strokeStyle='rgba(0,0,0,.7)';x.strokeText(t,128,32);x.fillStyle='#'+c.toString(16).padStart(6,'0');x.fillText(t,128,32);return new THREE.CanvasTexture(cv)}
 /* shared geometry + materials for every avatar; only the shirt and cap colours are per player */
 const UP=new THREE.Vector3(0,1,0),dk=c=>(((c>>16&255)*.55|0)<<16)|(((c>>8&255)*.55|0)<<8)|((c&255)*.55|0);let AV=null;
 function avKit(){return AV||(AV={
  limb:new THREE.CylinderGeometry(.048,.042,1,8).translate(0,.5,0),leg:new THREE.CylinderGeometry(.088,.066,.68,9).translate(0,-.34,0),boot:new THREE.BoxGeometry(.13,.1,.25).translate(0,-.74,-.045),
  torso:new THREE.CylinderGeometry(.2,.235,.62,14),belt:new THREE.CylinderGeometry(.238,.238,.07,14),ball:new THREE.SphereGeometry(1,14,10),
  cap:new THREE.SphereGeometry(.19,14,8,0,Math.PI*2,0,Math.PI/2),visor:new THREE.BoxGeometry(.21,.022,.16),
  lampG:new THREE.BoxGeometry(.07,.05,.05),beamG:new THREE.ConeGeometry(.9,5,16,1,true).translate(0,-2.5,0).rotateX(Math.PI/2),
  lamp:new THREE.MeshBasicMaterial({color:new THREE.Color(4,3.4,2.2)}),beam:new THREE.MeshBasicMaterial({color:new THREE.Color(1,.92,.7),transparent:true,opacity:.09,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}),
  skin:mat(0xd9a77c,{roughness:.7}),jeans:mat(0x3b4f73),boots:mat(0x4a3224,{roughness:1}),strap:mat(0x1d1a18,{roughness:.6}),glove:mat(0x7a5530),white:mat(0xf4f0e8,{roughness:.4}),dark:mat(0x0d0d10,{roughness:.3})})}
 function addRemote(id){if(id===ME||rem[id])return rem[id];const slot=N.roster[id]??1,col=COL[slot%4],K=avKit(),g=new THREE.Group(),neck=new THREE.Group(),pivot=new THREE.Group(),
   shirt=mat(col,{roughness:.8}),capm=mat(dk(col),{roughness:.7}),
   M=(ge,m,x=0,y=0,z=0,s)=>{const o=new THREE.Mesh(ge,m);o.position.set(x,y,z);if(s)o.scale.set(...s);o.castShadow=o.receiveShadow=true;return o};
  /* body: shirt torso, belt, shoulders, jeans legs hinged at the hip, boots */
  const torso=M(K.torso,shirt,0,1.12,0,[1,1,.72]),belt=M(K.belt,K.strap,0,.82,0,[1,1,.72]),legs=[-1,1].map(s=>{const l=new THREE.Group();l.position.set(s*.105,.8,0);l.add(M(K.leg,K.jeans),M(K.boot,K.boots));return l});
  g.add(torso,belt,...legs,...[-1,1].map(s=>M(K.ball,shirt,s*.25,1.37,0,[.09,.09,.09])));
  /* head follows pitch: face, cap with visor */
  neck.position.y=1.7;neck.add(M(K.ball,K.skin,0,0,0,[.16,.18,.17]),M(K.ball,K.skin,0,-.03,-.168,[.024,.03,.04]),M(K.cap,capm,0,.025,0),M(K.visor,capm,0,.035,-.195),
   ...[-1,1].flatMap(s=>[M(K.ball,K.white,s*.062,.02,-.15,[.03,.03,.02]),M(K.ball,K.dark,s*.062,.02,-.168,[.016,.016,.012]),M(K.ball,K.skin,s*.165,0,0,[.02,.04,.03])]));
  /* headlamp, shown while that player's flashlight is on */
  const lamp=M(K.lampG,K.lamp,0,.09,-.2),beam=new THREE.Mesh(K.beamG,K.beam);beam.position.set(0,.06,-.22);lamp.visible=beam.visible=false;neck.add(lamp,beam);
  /* arms: two segments each, re-aimed every frame from the shoulder to wherever the hand should be */
  const arms=[-1,1].map(s=>({s,up:M(K.limb,shirt),lo:M(K.limb,K.skin),jt:M(K.ball,shirt,0,0,0,[.052,.052,.052]),hd:M(K.ball,K.glove,0,0,0,[.058,.058,.058])}));
  arms.forEach(a=>g.add(a.up,a.lo,a.jt,a.hd));
  pivot.position.set(.45,-.62,-.3);const shovel=sh.children[0].clone();pivot.add(shovel);neck.add(pivot);g.add(neck);
  const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tagTex(who(id),col),transparent:true,fog:false,depthWrite:false}));tag.scale.set(1.3,.325,1);tag.position.y=2.25;g.add(tag);
  scene.add(g);return rem[id]={g,neck,pivot,shovel,tag,lamp,beam,legs,arms,mats:[shirt,capm],first:1,x:0,y:0,z:0,yaw:0,pitch:0,tx:0,ty:0,tz:0,tyaw:0,tpitch:0,swing:0,ph:0,amp:0,mode:'shovel',hk:'',hm:null}}
 function removeRemote(id){const r=rem[id];if(!r)return;hold(r,-1,-1,false);scene.remove(r.g);r.tag.material.map.dispose();r.tag.material.dispose();r.mats.forEach(m=>m.dispose());delete rem[id]}
 const _a=new THREE.Vector3(),_b=new THREE.Vector3(),_c=new THREE.Vector3();
 function seg(m,a,b){_c.subVectors(b,a);const l=_c.length()||1e-3;m.position.copy(a);m.quaternion.setFromUnitVectors(UP,_c.divideScalar(l));m.scale.set(1,l,1)}
 /* hand target in avatar space: shovel grips, or out in front when carrying something / pushing the mower */
 function hand(r,a,out){const s=a.s;
  if(r.mode==='shovel'){const n=r.shovel.children.length,gl=r.shovel.children[s>0?n-2:n-1];gl.getWorldPosition(out)}
  else r.neck.localToWorld(r.mode==='mower'?out.set(s*.2,-.7,-.8):out.set(.32+s*.14,-.4,-.7));
  return r.g.worldToLocal(out)}
 function poseArms(r){r.g.updateMatrixWorld(true);
  for(const a of r.arms){const sh0=_a.set(a.s*.25,1.37,0),h=hand(r,a,_b),m=_c.addVectors(sh0,h).multiplyScalar(.5);
   const len=sh0.distanceTo(h),bend=Math.max(.05,.62-len)*.5,el=new THREE.Vector3(m.x+a.s*(.04+bend*.5),m.y-.04-bend,m.z+.02);
   seg(a.up,sh0,el);seg(a.lo,el,h);a.jt.position.copy(el);a.hd.position.copy(h)}}
 function clearRemotes(){for(const id in rem)removeRemote(id)}
 function hold(r,cr,cf,mw){const key=cr+'|'+cf+'|'+(mw?1:0);if(r.hk===key)return;r.hk=key;
  if(r.hm){r.neck.remove(r.hm);if(r.hm.userData.own)r.hm.material.dispose();r.hm=null}
  r.shovel.visible=!(mw||cr>=0||cf>=0);r.mode=mw?'mower':cr>=0||cf>=0?'carry':'shovel';
  if(cr>=0&&rk[cr]){const q=rk[cr],m=new THREE.Mesh(rockG,new THREE.MeshStandardMaterial({roughness:.95}));m.material.color.fromArray(rocks.instanceColor.array,cr*3);m.scale.set(q.s*q.w,q.s,q.s*q.w);m.position.set(.35,-.35,-.7);m.userData.own=1;m.castShadow=true;r.neck.add(m);r.hm=m}
  else if(cf>=0&&world.finds[cf]){const f=world.finds[cf],m=f.m.clone(true);m.visible=true;m.scale.setScalar(Math.min(2.4,.1/Math.max(.03,f.sz)));m.position.set(.32,-.36,-.78);r.neck.add(m);r.hm=m}}
 function onPose(id,s){if(id===ME||!s)return;let r=rem[id];if(!r){if(!(id in N.roster))return;r=addRemote(id)}
  r.tx=s.x;r.tz=s.z;r.ty=s.y||0;r.tyaw=s.yaw;r.tpitch=s.pitch;if(r.first){r.first=0;r.x=s.x;r.z=s.z;r.y=r.ty;r.yaw=s.yaw;r.pitch=s.pitch}
  r.lamp.visible=r.beam.visible=!!s.fl;
  if(world)hold(r,s.cr,s.cf,!!s.m);
  if(s.m&&mowerOwner===id){mowerTarget={x:s.m[0],z:s.m[1],ry:s.m[2]};mowerOn=!!s.m[3]}}
 function updateRemotes(dt){const k=Math.min(1,dt*12),vis=state==='play'||state==='won';
  for(const id in rem){const r=rem[id];r.g.visible=vis;if(!vis||!world)continue;
   const ox=r.x,oz=r.z;r.x+=(r.tx-r.x)*k;r.z+=(r.tz-r.z)*k;
   /* walk cycle: stride speed and swing follow how fast the avatar is actually moving */
   const spd=dt>0?Math.hypot(r.x-ox,r.z-oz)/dt:0;r.amp+=(Math.min(.75,spd*.2)-r.amp)*Math.min(1,dt*10);r.ph+=spd*dt*3.2;
   r.legs[0].rotation.x=Math.sin(r.ph)*r.amp;r.legs[1].rotation.x=-Math.sin(r.ph)*r.amp;
   let d=r.tyaw-r.yaw;d-=Math.round(d/6.2832)*6.2832;r.yaw+=d*k;r.pitch+=(r.tpitch-r.pitch)*k;
   r.y+=(r.ty-r.y)*k;const g=world.floorAt(r.x,r.z,r.y);r.g.position.set(r.x,r.y>g+.2?r.y:g,r.z);r.g.rotation.y=r.yaw;r.neck.rotation.x=r.pitch;
   r.swing=Math.max(0,r.swing-dt*1.5);const sw=r.swing>0?Math.sin((1-r.swing)*Math.PI):0;r.pivot.position.set(.45,-.62-sw*.08,-.3-sw*.12);r.pivot.rotation.set(-sw*.7,sw*.1,sw*.05);
   if(r.hm&&r.hm.userData.own)r.hm.rotation.y=T*.4;else if(r.hm)r.hm.rotation.y=T*.6;
   poseArms(r)}}

 /* ---- lobby UI ---- */
 el('bMulti').onclick=()=>{msg('');show('mp')};el('bMpBack').onclick=()=>show('menu');
 el('bHost').onclick=()=>N.host();el('bJoin').onclick=()=>N.join(el('code').value);
 el('code').oninput=e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')};el('code').onkeydown=e=>{if(e.key==='Enter')N.join(el('code').value)};
 el('bCopy').onclick=()=>{const u=location.origin+location.pathname+'?room='+N.code;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast('Invite link copied'),()=>prompt('Invite link',u))};
 try{const q=new URLSearchParams(location.search).get('room');if(q){N.pend=q.toUpperCase().replace(/[^A-Z0-9]/g,'');el('code').value=N.pend}}catch(e){}
 try{const v=localStorage.getItem('burstName');if(v)el('pname').value=cleanName(v)}catch(e){}
 addEventListener('beforeunload',()=>{if(peer)try{peer.destroy()}catch(e){}});
 return N})();
