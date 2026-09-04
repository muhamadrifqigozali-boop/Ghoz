const BACKEND_URL="https://ghoz-production.up.railway.app";
const WORLD_LIMIT=14, MOVE_SPEED=4.4;

const tg=window.Telegram?.WebApp;
if(tg){tg.ready();tg.expand();try{tg.setHeaderColor("#78b5e6");tg.setBackgroundColor("#78b5e6")}catch(e){}}
const telegramUser=tg?.initDataUnsafe?.user||{};
const myName=telegramUser.username?"@"+telegramUser.username:[telegramUser.first_name,telegramUser.last_name].filter(Boolean).join(" ").trim()||"Player";
document.getElementById("playerName").textContent=myName;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x78b5e6);
scene.fog=new THREE.Fog(0x78b5e6,30,70);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const mat=(c,r=.8)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
scene.add(new THREE.HemisphereLight(0xeaf7ff,0x496044,1.5));
const sun=new THREE.DirectionalLight(0xfff5df,2.0);sun.position.set(-12,25,14);sun.castShadow=true;sun.shadow.mapSize.width=1024;sun.shadow.mapSize.height=1024;sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;scene.add(sun);

// WORLD
const ground=new THREE.Mesh(new THREE.PlaneGeometry(32,32),mat(0x5f9858));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const roadMat=mat(0x686868,.95);
const road=new THREE.Mesh(new THREE.PlaneGeometry(7,30),roadMat);road.rotation.x=-Math.PI/2;road.position.y=.01;scene.add(road);
const road2=new THREE.Mesh(new THREE.PlaneGeometry(30,5),roadMat);road2.rotation.x=-Math.PI/2;road2.position.y=.012;scene.add(road2);
const roadEdge=mat(0xc6c6c6,.8);
for(const z of[-3.5,3.5]){const e=new THREE.Mesh(new THREE.PlaneGeometry(.08,30),roadEdge);e.rotation.x=-Math.PI/2;e.position.set(z,0.025,0);scene.add(e)}
for(const x of[-2.5,2.5]){const e=new THREE.Mesh(new THREE.PlaneGeometry(30,.08),roadEdge);e.rotation.x=-Math.PI/2;e.position.set(0,0.025,x);scene.add(e)}

const water=new THREE.Mesh(new THREE.CircleGeometry(4,48),new THREE.MeshStandardMaterial({color:0x2e91c7,roughness:.15,metalness:.05,transparent:true,opacity:.9}));water.rotation.x=-Math.PI/2;water.position.set(-9,.04,-8);scene.add(water);
const waterRim=new THREE.Mesh(new THREE.RingGeometry(4.02,4.18,48),mat(0xa4d9df,.45));waterRim.rotation.x=-Math.PI/2;waterRim.position.set(-9,.05,-8);scene.add(waterRim);

function box(x,y,z,sx,sy,sz,c,group=scene,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat(c));m.position.set(x,y,z);if(shadow)m.castShadow=m.receiveShadow=true;group.add(m);return m}
function tree(x,z,s=1){const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.28,1.7,8),mat(0x65422c));trunk.position.y=.85;trunk.castShadow=true;g.add(trunk);for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.SphereGeometry(1.05-i*.14,12,9),mat(i===0?0x2d7441:0x347f45));crown.position.y=1.9+i*.58;crown.castShadow=true;g.add(crown)}g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g)}
[[-12,-12,1],[-13,-8,.9],[-12,9,1],[-13,12,.9],[12,-12,1.1],[13,-8,.9],[12,9,1],[13,12,.9],[-7,12,.8],[7,12,.9],[-8,-12,.8],[8,-12,.8]].forEach(t=>tree(...t));

const colliders=[];
function collider(x,z,w,d){colliders.push({x,z,w,d})}
function blocked(x,z,r=.38){for(const c of colliders){if(x>c.x-c.w/2-r&&x<c.x+c.w/2+r&&z>c.z-c.d/2-r&&z<c.z+c.d/2+r)return true}return false}

// Enterable houses: front wall has a real doorway, and the roof hides while you are inside.
const houses=[];
function makeHouse(x,z,wallColor,roofColor){
 const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
 const floor=box(0,.035,0,5.6,0.08,5.2,0x9b8061,g,false);
 // back wall + side walls; front split leaves a 1.35m door opening
 box(0,1.5,-2.6,5.6,3,.25,wallColor,g); collider(x,z-2.6,5.6,.25);
 box(-2.8,1.5,0,.25,3,5.2,wallColor,g); collider(x-2.8,z,.25,5.2);
 box(2.8,1.5,0,.25,3,5.2,wallColor,g); collider(x+2.8,z,.25,5.2);
 box(-2.1,1.5,2.6,1.4,3,.25,wallColor,g); collider(x-2.1,z+2.6,1.4,.25);
 box(2.1,1.5,2.6,1.4,3,.25,wallColor,g); collider(x+2.1,z+2.6,1.4,.25);
 const roof=new THREE.Mesh(new THREE.ConeGeometry(4.0,1.6,4),mat(roofColor));roof.rotation.y=Math.PI/4;roof.position.y=3.8;roof.castShadow=true;g.add(roof);
 const doorFrame=box(-.82,1.55,2.52,.12,3.1,.32,0x684331,g);box(.82,1.55,2.52,.12,3.1,.32,0x684331,g);box(0,3.02,2.52,1.76,.16,.32,0x684331,g);
 const door=box(0,1.25,2.48,1.48,2.5,.08,0x8a5b3d,g);door.userData.door=true;
 // windows
 for(const wx of[-1.55,1.55]){const w=box(wx,1.65,2.49,.9,.8,.06,0x9ddbf0,g,false);w.material.metalness=.1;w.material.roughness=.25}
 // interior furniture
 box(-1.35,.5,-1.1,1.5,.75,.8,0x76513a,g); // table
 box(-1.35,1.0,-1.1,1.2,.08,.65,0x9b6b45,g);
 box(1.15,.45,-1.15,1.5,.7,.75,0x3e5564,g); // sofa
 box(1.15,.85,-1.45,1.5,.65,.18,0x526b7b,g);
 const bed=box(-.9,.45,1.25,2.0,.55,1.1,0xd7dce1,g);box(-.9,.76,1.25,2.0,.08,1.1,0xb9c5cf,g);
 houses.push({g,x,z,roof,inside:false,bounds:{x1:x-2.55,x2:x+2.55,z1:z-2.35,z2:z+2.35}});
}
makeHouse(-9,6,0xd2a66f,0x8f4038);makeHouse(9,6,0xc58d75,0x416a91);makeHouse(-9,-3,0xc997b4,0x6d4b7d);makeHouse(9,-3,0x83ad99,0x3d6d55);

// Props that actually block movement
function prop(x,z,w,d,h,c){box(x,h/2,z,w,h,d,c);collider(x,z,w,d)}
prop(-5.5,8,.9,.9,1.2,0x8a6846);prop(5.8,8,1.2,.8,1.1,0x8a6846);prop(-5.8,-8,1,.8,1,0x7b5a3e);prop(6,-8,1,.8,1.1,0x806045);

// Boundary
collider(0,-15,30,.5);collider(0,15,30,.5);collider(-15,0,.5,30);collider(15,0,.5,30);

// PLAYER
const otherPlayers={};let myData=null,myMesh=null;
function hash(str){let h=0;for(let i=0;i<str.length;i++)h=((h<<5)-h+str.charCodeAt(i))|0;return Math.abs(h)}
const SKINS=[0xffc49a,0xe3a477,0x8d5524,0xf1c27d,0xc68642];const SHIRTS=[0x2f6fed,0xe04b4b,0x29a65a,0x9b51d8,0xef8b32,0x159f91,0xe1b938];const PANTS=[0x26384d,0x1e293b,0x374151,0x334155];const HAIRS=[0x202020,0x3b2418,0x5b371c,0x8b5a2b];
function label(text){const c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');q.fillStyle='rgba(0,0,0,.62)';q.beginPath();q.roundRect(20,25,472,78,18);q.fill();q.font='bold 42px Arial';q.textAlign='center';q.textBaseline='middle';q.fillStyle='#fff';q.fillText(String(text).slice(0,20),256,64);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));s.scale.set(2.8,.7,1);s.position.y=3.05;return s}
function makePlayer(p,isMe){const seed=hash(String(p.id||p.name||Math.random())),g=new THREE.Group();g.userData.t=seed%100;g.userData.lastX=p.x||0;g.userData.lastZ=p.z||0;g.userData.parts={};
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.68,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.18}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;g.add(shadow);
 const shirt=p.color||('#'+SHIRTS[seed%SHIRTS.length].toString(16).padStart(6,'0')),skin=SKINS[seed%SKINS.length],hair=HAIRS[(seed>>2)%HAIRS.length],pants=PANTS[(seed>>3)%PANTS.length];
 const torso=box(0,1.45,0,.82,1.05,.48,shirt,g),head=box(0,2.35,0,.7,.7,.7,skin,g);head.rotation.y=.02;box(0,2.68,0,.76,.22,.76,hair,g);
 box(0,2.34,.39,.12,.12,.08,0xf0a47c,g,false);for(const ex of[-.14,.14])box(ex,2.43,.37,.08,.08,.04,0x111111,g,false);
 const arms=[],legs=[];for(const sx of[-.56,.56]){const a=box(sx,1.48,0,.22,.82,.22,shirt,g);arms.push(a)}for(const sx of[-.21,.21]){const l=box(sx,.52,0,.25,.85,.28,pants,g);legs.push(l)}g.userData.parts={arms,legs};
 if(seed%3===0)box(0,1.45,-.32,.5,.65,.18,0x111827,g);if(seed%3===1){box(0,2.95,0,.07,.38,.07,0x333333,g);box(0,3.16,0,.18,.18,.18,0xff5555,g)}
 g.add(label(isMe?'YOU':p.name||'Player'));g.position.set(p.x||0,0,p.z||0);scene.add(g);return g}
function animateAvatar(g,dt,walking){if(!g?.userData.parts)return;const {arms,legs}=g.userData.parts;if(walking){g.userData.t+=dt*11;const a=Math.sin(g.userData.t)*.6;arms[0].rotation.x=a;arms[1].rotation.x=-a;legs[0].rotation.x=-a;legs[1].rotation.x=a;g.position.y=Math.abs(Math.sin(g.userData.t))*0.025}else{for(const o of [...arms,...legs])o.rotation.x*=.78;g.position.y*=.7}}

// CAMERA LOOK: drag the screen with the right thumb to orbit around your character.
let camYaw=0,camPitch=.58,lookPointer=null,lastLookX=0,lastLookY=0;
function beginLook(e){if(e.target.closest('#joystick'))return;lookPointer=e.pointerId;lastLookX=e.clientX;lastLookY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)}
function moveLook(e){if(lookPointer!==e.pointerId)return;const dx=e.clientX-lastLookX,dy=e.clientY-lastLookY;lastLookX=e.clientX;lastLookY=e.clientY;camYaw-=dx*.008;camPitch=Math.max(.25,Math.min(1.15,camPitch+dy*.006))}
function endLook(e){if(lookPointer===e.pointerId)lookPointer=null}
renderer.domElement.addEventListener('pointerdown',beginLook);renderer.domElement.addEventListener('pointermove',moveLook);renderer.domElement.addEventListener('pointerup',endLook);renderer.domElement.addEventListener('pointercancel',endLook);
const target=new THREE.Vector3(),camPos=new THREE.Vector3();
function updateCamera(){if(!myData)return;target.set(myData.x,1.25,myData.z);const dist=7.4;const h=Math.cos(camPitch)*dist,v=Math.sin(camPitch)*dist;camPos.set(myData.x+Math.sin(camYaw)*h,myData.y+v,myData.z+Math.cos(camYaw)*h);camera.position.lerp(camPos,.13);camera.lookAt(target)}

// JOYSTICK / keyboard
const joystick=document.getElementById('joystick'),stick=document.getElementById('stick'),js={x:0,y:0,active:false};let pid=null;
function moveStick(cx,cy){const r=joystick.getBoundingClientRect(),mx=r.left+r.width/2,my=r.top+r.height/2;let dx=cx-mx,dy=cy-my,max=r.width/2-38,d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max}js.x=dx/max;js.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`}
function resetStick(){js.x=js.y=0;js.active=false;pid=null;stick.style.transform='translate(0,0)'}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();js.active=true;pid=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e.clientX,e.clientY)});joystick.addEventListener('pointermove',e=>{if(js.active&&e.pointerId===pid){e.preventDefault();moveStick(e.clientX,e.clientY)}});joystick.addEventListener('pointerup',e=>{if(e.pointerId===pid)resetStick()});joystick.addEventListener('pointercancel',resetStick);
const keys={up:false,down:false,left:false,right:false};addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(e.key==='ArrowUp'||k==='w')keys.up=true;if(e.key==='ArrowDown'||k==='s')keys.down=true;if(e.key==='ArrowLeft'||k==='a')keys.left=true;if(e.key==='ArrowRight'||k==='d')keys.right=true});addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(e.key==='ArrowUp'||k==='w')keys.up=false;if(e.key==='ArrowDown'||k==='s')keys.down=false;if(e.key==='ArrowLeft'||k==='a')keys.left=false;if(e.key==='ArrowRight'||k==='d')keys.right=false});

let lastSend=0;
function tryMove(nx,nz){const ox=myData.x,oz=myData.z;if(!blocked(nx,oz,.36))myData.x=nx;if(!blocked(myData.x,nz,.36))myData.z=nz;if(blocked(myData.x,myData.z,.36)){myData.x=ox;myData.z=oz}}
function updateMovement(dt){if(!myData||!myMesh)return;let ix=0,iz=0;if(keys.left)ix--;if(keys.right)ix++;if(keys.up)iz--;if(keys.down)iz++;if(js.active){ix=js.x;iz=js.y}if(Math.hypot(ix,iz)<.08){animateAvatar(myMesh,dt,false);return}
 // joystick is camera-relative
 const len=Math.hypot(ix,iz);if(len>1){ix/=len;iz/=len}const angle=camYaw;const dx=(ix*Math.cos(angle)-iz*Math.sin(angle));const dz=(ix*Math.sin(angle)+iz*Math.cos(angle));
 const nx=Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,myData.x+dx*MOVE_SPEED*dt));const nz=Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,myData.z+dz*MOVE_SPEED*dt));tryMove(nx,nz);myMesh.position.set(myData.x,0,myData.z);myMesh.rotation.y=Math.atan2(dx,dz);animateAvatar(myMesh,dt,true);
 const now=performance.now();if(socket?.connected&&now-lastSend>50){socket.emit('playerMovement',{x:myData.x,z:myData.z});lastSend=now}}

function updateHouseVisibility(){if(!myData)return;for(const h of houses){const inside=myData.x>h.bounds.x1&&myData.x<h.bounds.x2&&myData.z>h.bounds.z1&&myData.z<h.bounds.z2;if(inside!==h.inside){h.inside=inside;h.roof.visible=!inside}}}

let socket=null;const setStatus=t=>document.getElementById('status').textContent=t;const updateCount=()=>document.getElementById('playerCount').textContent=1+Object.keys(otherPlayers).length;
if(BACKEND_URL){socket=io(BACKEND_URL,{transports:['websocket','polling'],auth:{telegramUser}});socket.on('connect',()=>{setStatus('🟢 Online');hideLoading()});socket.on('disconnect',()=>setStatus('🔴 Terputus'));socket.on('connect_error',e=>{console.error(e);setStatus('🔴 Gagal terhubung');hideLoading()});
socket.on('currentPlayers',players=>{Object.entries(players).forEach(([id,p])=>{if(id===socket.id){myData={...p};if(myMesh)scene.remove(myMesh);myMesh=makePlayer(myData,true)}else{if(otherPlayers[id])scene.remove(otherPlayers[id]);p.id=id;otherPlayers[id]=makePlayer(p)}});updateCount()});
socket.on('newPlayer',p=>{if(p.id===socket.id)return;if(otherPlayers[p.id])scene.remove(otherPlayers[p.id]);otherPlayers[p.id]=makePlayer(p);updateCount()});
socket.on('playerMoved',d=>{const m=otherPlayers[d.id];if(m){const dx=d.x-m.position.x,dz=d.z-m.position.z;m.position.x=d.x;m.position.z=d.z;if(Math.hypot(dx,dz)>.01)m.rotation.y=Math.atan2(dx,dz)}});
socket.on('playerDisconnected',id=>{if(otherPlayers[id]){scene.remove(otherPlayers[id]);delete otherPlayers[id];updateCount()}})}

function hideLoading(){const l=document.getElementById('loading');l.style.opacity='0';setTimeout(()=>l.style.display='none',450)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);updateMovement(dt);updateHouseVisibility();Object.values(otherPlayers).forEach(g=>{const dx=g.position.x-g.userData.lastX,dz=g.position.z-g.userData.lastZ;animateAvatar(g,dt,Math.hypot(dx,dz)>.002);g.userData.lastX=g.position.x;g.userData.lastZ=g.position.z});updateCamera();water.rotation.z+=dt*.04;renderer.render(scene,camera)}animate();
