/* ---------- multiplayer: PeerJS star topology (loaded before game.js) ----------
   Solo: Net.send applies the action locally. Host: validates, stamps a seq, broadcasts and applies. Client: sends an intent to
   the host and only applies what the host echoes back. Game code just uses Net.send / Net.on and the `ME` id.
   Everything below touches game.js globals (world, rk, mown, ...) only at call time. */
var ME='local';
const Net=(()=>{
 const el=id=>document.getElementById(id),AB='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',COL=[0xe9a23b,0x4fa3e0,0xd9534f,0x6cc070],MAXP=4,rem={},
  b64=u=>{let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)},
  unb=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u},
  r3=v=>Math.round(v*1000)/1000,msg=t=>{el('mpMsg').textContent=t},nm=s=>s===0?'Host':'Player '+(s+1);
 let peer=null,hostConn=null,clients={},acc=0,mowAcc=0,connT=0;
 const N={mode:'solo',seq:0,hs:[],code:'',roster:{},pend:'',
  on(h){this.hs.push(h)},emit(a){this.hs.forEach(h=>h(a))},
  send(a){a.by=ME;if(N.mode==='client'){if(hostConn&&hostConn.open)hostConn.send({t:'i',a});return}N.commit(a)},
  commit(a){if(!ok(a))return;a.seq=++N.seq;if(N.mode==='host')bcast({t:'a',a});N.emit(a)},
  flushMow(){if(mowQ.length)N.send({type:'mow',cells:mowQ.splice(0)})},
  swing(id){const r=rem[id];if(r)r.swing=1},
  reset(){for(const id in rem)hold(rem[id],-1,-1,false)},
  tags(){return Object.values(rem).map(r=>r.tag)},
  ui(){const n=Object.keys(N.roster).length,b=document.body.classList,s=N.mode==='solo'?'':`Room ${N.code} · ${n} player${n>1?'s':''}`;
   b.toggle('mp',N.mode!=='solo');b.toggle('cl',N.mode==='client');el('rm').textContent=s&&' · '+s;el('room').textContent=s},
  tick(dt){if(N.mode==='solo')return;updateRemotes(dt);acc+=dt;mowAcc+=dt;
   if(mowAcc>.1){mowAcc=0;if(mowerOwner===ME)N.flushMow()}
   if(acc>=1/15){acc=0;const s={x:r3(px),z:r3(pz),yaw:r3(yaw),pitch:r3(pitch),cr:carry,cf:carryF,m:mowerHeld?[r3(mower.position.x),r3(mower.position.z),r3(mower.rotation.y),mowerOn?1:0]:null};
    if(N.mode==='host')bcast({t:'p',id:'host',s});else if(hostConn&&hostConn.open)hostConn.send({t:'p',s})}},
  leave(){clearTimeout(connT);if(peer){const p=peer;peer=null;try{p.destroy()}catch(e){}}hostConn=null;clients={};N.mode='solo';N.code='';N.roster={};N.seq=0;ME='local';
   clearRemotes();mowerOwner=null;mowerTarget=null;N.ui()},
  host(){if(!window.Peer)return msg('Multiplayer library failed to load.');N.leave();msg('Creating room…');
   connT=setTimeout(()=>fail('Could not reach the connection server.'),12000);
   const go=n=>{const code=Array.from({length:5},()=>AB[Math.random()*AB.length|0]).join(''),p=peer=new Peer('burst-'+code,{debug:0});
    p.on('open',()=>{if(peer!==p)return;clearTimeout(connT);ME='host';N.mode='host';N.code=code;N.roster={host:0};startPlay();N.ui();msg('');toast('Room code: '+code+' — Esc for the invite link')});
    p.on('connection',onConn);
    p.on('disconnected',()=>{if(peer===p&&!p.destroyed)p.reconnect()});
    p.on('error',e=>{if(peer!==p)return;if(e.type==='unavailable-id'&&n<4){p.destroy();go(n+1);return}if(N.mode!=='host')fail('Could not create a room ('+e.type+').')})};
   go(0)},
  join(code){code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length<4)return msg('Enter the 5-character room code.');
   if(!window.Peer)return msg('Multiplayer library failed to load.');N.leave();msg('Connecting…');
   const p=peer=new Peer({debug:0});connT=setTimeout(()=>fail('Could not connect. Check the code and try again.'),15000);
   p.on('error',e=>{if(peer!==p)return;if(N.mode==='client')lost('Connection lost.');else fail(e.type==='peer-unavailable'?'No room with that code.':'Connection problem ('+e.type+').')});
   p.on('open',id=>{if(peer!==p)return;ME=id;const c=hostConn=p.connect('burst-'+code,{reliable:true});
    c.on('data',m=>{if(peer===p)onHost(m)});c.on('close',()=>{if(peer===p&&N.mode==='client')lost('The host left the game.')})})}};

 function fail(t){N.leave();msg(t)}
 function lost(t){toMenu();show('mp');msg(t)}
 function bcast(m,skip){for(const id in clients)if(id!==skip&&clients[id].conn.open)clients[id].conn.send(m)}

 /* ---- host-side validation: the host's world is the truth ---- */
 function ok(a){if(!a||typeof a.type!=='string'||!world)return false;const b=a.by;
  switch(a.type){
   case'dig':return isFinite(a.x)&&isFinite(a.z);
   case'find_pick':{const f=world.finds[a.n];return!!f&&!f.done&&!f.held}
   case'find_place':case'find_deposit':{const f=world.finds[a.n];return!!f&&!f.done&&f.held===b}
   case'rock_pick':{const q=rk[a.n];return!!q&&!q.held}
   case'rock_place':{const q=rk[a.n];return!!q&&q.held===b}
   case'mower_grab':return!mowerOwner;
   case'mower_drop':return mowerOwner===b;
   case'mow':return mowerOwner===b&&Array.isArray(a.cells);
   case'new_yard':case'win':return b===ME}
  return false}

 /* ---- host: connections ---- */
 function onConn(conn){
  conn.on('open',()=>{
   if(Object.keys(clients).length>=MAXP-1){conn.send({t:'full'});setTimeout(()=>conn.close(),300);return}
   const used=Object.values(N.roster);let slot=1;while(used.includes(slot))slot++;
   N.roster[conn.peer]=slot;conn.send({t:'welcome',you:conn.peer,code:N.code,roster:N.roster,snap:snap()});
   clients[conn.peer]={conn,pose:null};bcast({t:'roster',r:N.roster});addRemote(conn.peer);toast(nm(slot)+' joined');N.ui()});
  conn.on('data',m=>{const c=clients[conn.peer];if(!c||!m)return;
   if(m.t==='i'&&m.a&&typeof m.a==='object'){const a=m.a;a.by=conn.peer;delete a.seq;N.commit(a)}
   else if(m.t==='p'&&m.s){c.pose=m.s;onPose(conn.peer,m.s);bcast({t:'p',id:conn.peer,s:m.s},conn.peer)}});
  conn.on('close',()=>drop(conn.peer));conn.on('error',()=>drop(conn.peer))}
 function drop(id){const c=clients[id];if(!c)return;delete clients[id];const p=c.pose,n=nm(N.roster[id]);
  /* put down whatever they were carrying, where they stood */
  world.finds.forEach((f,i)=>{if(f.held===id)N.commit({type:'find_place',n:i,x:p?p.x:f.x,z:p?p.z:f.z,by:id})});
  rk.forEach((q,i)=>{if(q.held===id)N.commit({type:'rock_place',n:i,x:p?p.x:q.x,z:p?p.z:q.z,by:id})});
  if(mowerOwner===id)N.commit({type:'mower_drop',x:p&&p.m?p.m[0]:mower.position.x,z:p&&p.m?p.m[1]:mower.position.z,ry:p&&p.m?p.m[2]:mower.rotation.y,on:0,by:id});
  delete N.roster[id];removeRemote(id);bcast({t:'roster',r:N.roster});toast(n+' left');N.ui()}

 /* ---- client: messages from the host ---- */
 function onHost(m){if(!m)return;
  switch(m.t){
   case'welcome':clearTimeout(connT);N.mode='client';N.code=m.code;N.roster=m.roster;startPlay(m.snap.seed);applySnap(m.snap);
    for(const id in N.roster)if(id!==ME)addRemote(id);N.ui();msg('');break;
   case'a':N.seq=m.a.seq;N.emit(m.a);break;
   case'p':onPose(m.id,m.s);break;
   case'roster':{const old=N.roster;N.roster=m.r;
    for(const id in m.r)if(!(id in old)&&id!==ME){addRemote(id);toast(nm(m.r[id])+' joined')}
    for(const id in old)if(!(id in m.r)){removeRemote(id);toast(nm(old[id])+' left')}
    N.ui();break}
   case'full':fail('That room is full.')}}

 /* ---- late join: full state snapshot so joiners don't depend on replaying every action ---- */
 function snap(){const w=world;return{seed:w.seed,H:b64(new Uint8Array(w.H.buffer)),D:b64(w.D),digs:w.digs,score:w.score,log:w.log,
  f:w.finds.map(f=>[f.x,f.y,f.z,f.held||0,f.done?1:0,f.out?1:0]),r:rk.map(q=>[q.x,q.y,q.z,q.held||0]),m:b64(mown),sf:w.sig.map(s=>s.f?1:0),
  mo:{o:mowerOwner||null,x:mower.position.x,z:mower.position.z,ry:mower.rotation.y,on:mowerOn?1:0}}}
 function applySnap(s){const w=world;
  w.H.set(new Float32Array(unb(s.H).buffer));w.D.set(unb(s.D));w.digs=s.digs;w.score=s.score;w.log=s.log;
  s.f.forEach((a,i)=>{const f=w.finds[i];f.x=a[0];f.y=a[1];f.z=a[2];f.held=a[3];f.done=a[4];f.out=a[5]});
  s.r.forEach((a,i)=>{const q=rk[i];q.x=a[0];q.y=a[1];q.z=a[2];q.held=a[3]});
  w.sig.forEach((x,i)=>x.f=s.sf[i]);mown.set(unb(s.m));
  sync();for(let i=0;i<w.log.length;i+=2)clearGrass(w.log[i],w.log[i+1]);
  for(let ci=0;ci<MG*MG;ci++)if(mown[ci])cutCell(ci);grass.instanceMatrix.needsUpdate=true;
  rk.forEach((q,i)=>{if(q.held){go.position.set(0,-50,0);go.scale.setScalar(0);go.updateMatrix();rocks.setMatrixAt(i,go.matrix)}else setRock(i)});rocks.instanceMatrix.needsUpdate=true;
  w.finds.forEach(syncFind);
  const o=s.mo;mowerOwner=o.o;mowerOn=!!o.on;mower.position.set(o.x,w.hAt(o.x,o.z),o.z);mower.rotation.y=o.ry;mowerTarget={x:o.x,z:o.z,ry:o.ry};
  $('dg').textContent=w.digs;$('sc').textContent=w.score}

 /* ---- remote players: simple avatar (body, head, the real shovel) with an interpolated pose ---- */
 function tagTex(t,c){const cv=document.createElement('canvas');cv.width=256;cv.height=64;const x=cv.getContext('2d');x.font='bold 34px Georgia,serif';x.textAlign='center';x.textBaseline='middle';
  x.lineWidth=6;x.strokeStyle='rgba(0,0,0,.7)';x.strokeText(t,128,32);x.fillStyle='#'+c.toString(16).padStart(6,'0');x.fillText(t,128,32);return new THREE.CanvasTexture(cv)}
 function addRemote(id){if(id===ME||rem[id])return rem[id];const slot=N.roster[id]??1,col=COL[slot%4],g=new THREE.Group(),neck=new THREE.Group(),pivot=new THREE.Group(),skin=0xd9a77c;
  const part=(geo,c,x,y,z,o)=>{const m=new THREE.Mesh(geo,mat(c,o));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m};
  g.add(part(new THREE.CylinderGeometry(.2,.25,.8,10),col,0,1.1,0,{roughness:.8}),part(new THREE.CylinderGeometry(.09,.09,.72,8),0x2a2f3a,-.11,.36,0),part(new THREE.CylinderGeometry(.09,.09,.72,8),0x2a2f3a,.11,.36,0));
  neck.position.y=1.7;neck.add(part(new THREE.SphereGeometry(.16,14,10),skin,0,0,0),part(new THREE.BoxGeometry(.06,.06,.08),skin,0,-.02,-.17));
  pivot.position.set(.45,-.62,-.3);const shovel=sh.children[0].clone();pivot.add(shovel);neck.add(pivot);g.add(neck);
  const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tagTex(nm(slot),col),transparent:true,fog:false,depthWrite:false}));tag.scale.set(1.3,.325,1);tag.position.y=2.2;g.add(tag);
  scene.add(g);return rem[id]={g,neck,pivot,shovel,tag,first:1,x:0,z:0,yaw:0,pitch:0,tx:0,tz:0,tyaw:0,tpitch:0,swing:0,hk:'',hm:null}}
 function removeRemote(id){const r=rem[id];if(!r)return;hold(r,-1,-1,false);scene.remove(r.g);r.tag.material.map.dispose();r.tag.material.dispose();delete rem[id]}
 function clearRemotes(){for(const id in rem)removeRemote(id)}
 function hold(r,cr,cf,mw){const key=cr+'|'+cf+'|'+(mw?1:0);if(r.hk===key)return;r.hk=key;
  if(r.hm){r.neck.remove(r.hm);if(r.hm.userData.own)r.hm.material.dispose();r.hm=null}
  r.shovel.visible=!(mw||cr>=0||cf>=0);
  if(cr>=0&&rk[cr]){const q=rk[cr],m=new THREE.Mesh(rockG,new THREE.MeshStandardMaterial({roughness:.95}));m.material.color.fromArray(rocks.instanceColor.array,cr*3);m.scale.set(q.s*q.w,q.s,q.s*q.w);m.position.set(.35,-.35,-.7);m.userData.own=1;m.castShadow=true;r.neck.add(m);r.hm=m}
  else if(cf>=0&&world.finds[cf]){const f=world.finds[cf],m=f.m.clone(true);m.visible=true;m.scale.setScalar(Math.min(2.4,.1/Math.max(.03,f.sz)));m.position.set(.32,-.36,-.78);r.neck.add(m);r.hm=m}}
 function onPose(id,s){if(id===ME||!s)return;let r=rem[id];if(!r){if(!(id in N.roster))return;r=addRemote(id)}
  r.tx=s.x;r.tz=s.z;r.tyaw=s.yaw;r.tpitch=s.pitch;if(r.first){r.first=0;r.x=s.x;r.z=s.z;r.yaw=s.yaw;r.pitch=s.pitch}
  if(world)hold(r,s.cr,s.cf,!!s.m);
  if(s.m&&mowerOwner===id){mowerTarget={x:s.m[0],z:s.m[1],ry:s.m[2]};mowerOn=!!s.m[3]}}
 function updateRemotes(dt){const k=Math.min(1,dt*12),vis=state==='play'||state==='won';
  for(const id in rem){const r=rem[id];r.g.visible=vis;if(!vis||!world)continue;
   r.x+=(r.tx-r.x)*k;r.z+=(r.tz-r.z)*k;let d=r.tyaw-r.yaw;d-=Math.round(d/6.2832)*6.2832;r.yaw+=d*k;r.pitch+=(r.tpitch-r.pitch)*k;
   r.g.position.set(r.x,world.hAt(r.x,r.z),r.z);r.g.rotation.y=r.yaw;r.neck.rotation.x=r.pitch;
   r.swing=Math.max(0,r.swing-dt*1.5);const sw=r.swing>0?Math.sin((1-r.swing)*Math.PI):0;r.pivot.position.set(.45,-.62-sw*.08,-.3-sw*.12);r.pivot.rotation.set(-sw*.7,sw*.1,sw*.05);
   if(r.hm&&r.hm.userData.own)r.hm.rotation.y=T*.4;else if(r.hm)r.hm.rotation.y=T*.6}}

 /* ---- lobby UI ---- */
 el('bMulti').onclick=()=>{msg('');show('mp')};el('bMpBack').onclick=()=>show('menu');
 el('bHost').onclick=()=>N.host();el('bJoin').onclick=()=>N.join(el('code').value);
 el('code').oninput=e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')};el('code').onkeydown=e=>{if(e.key==='Enter')N.join(el('code').value)};
 el('bCopy').onclick=()=>{const u=location.origin+location.pathname+'?room='+N.code;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast('Invite link copied'),()=>prompt('Invite link',u))};
 try{const q=new URLSearchParams(location.search).get('room');if(q){N.pend=q.toUpperCase().replace(/[^A-Z0-9]/g,'');el('code').value=N.pend}}catch(e){}
 addEventListener('beforeunload',()=>{if(peer)try{peer.destroy()}catch(e){}});
 return N})();
