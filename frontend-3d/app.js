const BACKEND_URL="https://ghoz-production.up.railway.app";
const WORLD_LIMIT=14,MOVE_SPEED=4.2;
const tg=window.Telegram?.WebApp;
if(tg){tg.ready();tg.expand();try{tg.setHeaderColor("#79b7e8");tg.setBackgroundColor("#79b7e8")}catch(e){}}
const telegramUser=tg?.initDataUnsafe?.user||{};
const myName=telegramUser.username?"@"+telegramUser.username:[telegramUser.first_name,telegramUser.last_name].filter(Boolean).join(" ").trim()||"Player";
document.getElementById("playerName").textContent=myName;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x79b7e8);
scene.fog=new THREE.Fog(0x79b7e8,28,65);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,100);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);

const mat=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
scene.add(new THREE.HemisphereLight(0xffffff,0x557755,1.5));
const sun=new THREE.DirectionalLight(0xffffff,1.8);sun.position.set(15,25,10);sun.castShadow=true;sun.shadow.mapSize.width=1024;sun.shadow.mapSize.height=1024;sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;scene.add(sun);

const terrain=new THREE.Mesh(new THREE.PlaneGeometry(32,32),mat(0x68a85d));terrain.rotation.x=-Math.PI/2;terrain.receiveShadow=true;scene.add(terrain);
const roadMat=mat(0x777777);
const road=new THREE.Mesh(new THREE.PlaneGeometry(7,30),roadMat);road.rotation.x=-Math.PI/2;road.position.y=.012;scene.add(road);
const road2=new THREE.Mesh(new THREE.PlaneGeometry(30,5),roadMat);road2.rotation.x=-Math.PI/2;road2.position.y=.013;scene.add(road2);
const lineMat=new THREE.MeshBasicMaterial({color:0xf4d35e});
for(let z=-13;z<=13;z+=2){const l=new THREE.Mesh(new THREE.PlaneGeometry(.18,1),lineMat);l.rotation.x=-Math.PI/2;l.position.set(0,.025,z);scene.add(l)}
for(let x=-13;x<=13;x+=2){const l=new THREE.Mesh(new THREE.PlaneGeometry(1,.18),lineMat);l.rotation.x=-Math.PI/2;l.position.set(x,.026,0);scene.add(l)}

const water=new THREE.Mesh(new THREE.CircleGeometry(4,32),new THREE.MeshStandardMaterial({color:0x3d9ed8,roughness:.2,metalness:.1,transparent:true,opacity:.85}));water.rotation.x=-Math.PI/2;water.position.set(-9,.05,-8);scene.add(water);
const ring=new THREE.Mesh(new THREE.RingGeometry(4.05,4.25,32),mat(0x8bd5ef));ring.rotation.x=-Math.PI/2;ring.position.set(-9,.06,-8);scene.add(ring);

function createTree(x,z,s=1){const g=new THREE.Group(),tr=new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,1.8,8),mat(0x70452a)),a=new THREE.Mesh(new THREE.ConeGeometry(1.15,2.5,8),mat(0x277a45)),b=new THREE.Mesh(new THREE.ConeGeometry(.9,1.7,8),mat(0x339653));tr.position.y=.9;a.position.y=2.5;b.position.y=3.4;[tr,a,b].forEach(o=>{o.castShadow=true;g.add(o)});g.position.set(x,0,z);g.scale.setScalar(s);scene.add(g)}
[[-12,-12,1],[-13,-8,.9],[-11,8,1.1],[-13,12,.9],[12,-12,1.1],[13,-8,.9],[11,8,1],[13,12,.9],[-7,12,.8],[7,12,.9],[-8,-12,.9],[8,-12,.8],[-12,4,.8],[12,4,.9]].forEach(t=>createTree(...t));

function createRock(x,z,s=1){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.55,0),mat(0x777777));r.position.set(x,.35,z);r.scale.set(s*1.2,s*.7,s);r.rotation.y=Math.random()*Math.PI;r.castShadow=true;scene.add(r)}
[[-6,9,.7],[-8,7,.5],[9,8,.7],[10,10,.5],[7,-9,.6],[-7,-9,.5]].forEach(r=>createRock(...r));

function createHouse(x,z,color){const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(3.2,2.2,3),mat(color)),roof=new THREE.Mesh(new THREE.ConeGeometry(2.5,1.6,4),mat(0x9b4b3e)),door=new THREE.Mesh(new THREE.BoxGeometry(.65,1.2,.08),mat(0x5b3525));body.position.y=1.1;roof.rotation.y=Math.PI/4;roof.position.y=2.9;door.position.set(0,.6,1.53);[body,roof].forEach(o=>{o.castShadow=true});g.add(body,roof,door);[-.9,.9].forEach(wx=>{const w=new THREE.Mesh(new THREE.BoxGeometry(.65,.65,.08),mat(0x9dddf4,.3));w.position.set(wx,1.25,1.53);g.add(w)});g.position.set(x,0,z);scene.add(g)}
createHouse(-9,6,0xd9b56d);createHouse(9,6,0xc98f7a);createHouse(-9,-3,0xd6a6c1);createHouse(9,-3,0x88b6a3);

function createLamp(x,z){const g=new THREE.Group(),p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,2.7,8),mat(0x333333)),l=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),new THREE.MeshBasicMaterial({color:0xffe6a3}));p.position.y=1.35;l.position.y=2.75;g.add(p,l);g.position.set(x,0,z);scene.add(g)}
[[-4.5,-5],[4.5,-5],[-4.5,5],[4.5,5]].forEach(p=>createLamp(...p));

function createFlower(x,z){const g=new THREE.Group(),s=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.35,6),mat(0x3f8d45)),f=new THREE.Mesh(new THREE.SphereGeometry(.13,8,8),mat(0xffd34e));s.position.y=.17;f.position.y=.4;g.add(s,f);g.position.set(x,0,z);scene.add(g)}
[[-6,11],[-5.5,11.5],[5,11],[5.5,11.5],[-11,-5],[11,-5],[-5,-11],[5,-11]].forEach(p=>createFlower(...p));

function border(x,z,w,d){const o=new THREE.Mesh(new THREE.BoxGeometry(w,.8,d),mat(0x4b8050));o.position.set(x,.4,z);o.castShadow=true;scene.add(o)}
border(0,-15,30,.5);border(0,15,30,.5);border(-15,0,.5,30);border(15,0,.5,30);

const otherPlayers={};let myData=null,myMesh=null;
function createLabel(text){const c=document.createElement("canvas");c.width=512;c.height=128;const x=c.getContext("2d");x.fillStyle="rgba(0,0,0,.6)";x.beginPath();x.roundRect(20,25,472,78,18);x.fill();x.font="bold 42px Arial";x.textAlign="center";x.textBaseline="middle";x.fillStyle="#fff";x.fillText(String(text).slice(0,20),256,64);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));s.scale.set(2.8,.7,1);s.position.y=2.8;return s}

function createPlayerMesh(player,isMe=false){
 const g=new THREE.Group(),c=player.color||"#fff";
 const sh=new THREE.Mesh(new THREE.CircleGeometry(.6,20),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.18}));sh.rotation.x=-Math.PI/2;sh.position.y=.025;g.add(sh);
 const body=new THREE.Mesh(new THREE.BoxGeometry(.72,1,.48),new THREE.MeshStandardMaterial({color:c,roughness:.65}));body.position.y=1.05;body.castShadow=true;g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.38,12,10),mat(0xffc49a));head.position.y=1.85;head.castShadow=true;g.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.39,12,8),mat(0x202020));hair.scale.set(1,.65,1);hair.position.y=2.05;hair.castShadow=true;g.add(hair);
 for(const sx of [-.5,.5]){const arm=new THREE.Mesh(new THREE.BoxGeometry(.18,.8,.18),new THREE.MeshStandardMaterial({color:c}));arm.position.set(sx,1.05,0);arm.castShadow=true;g.add(arm)}
 for(const sx of [-.19,.19]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.7,.25),mat(0x26384d));leg.position.set(sx,.35,0);leg.castShadow=true;g.add(leg)}
 g.add(createLabel(isMe?"YOU":player.name||"Player"));g.position.set(player.x||0,0,player.z||0);scene.add(g);return g
}

const target=new THREE.Vector3(),camPos=new THREE.Vector3();
function updateCamera(){if(!myData)return;target.set(myData.x,1,myData.z);camPos.set(myData.x,5.3,myData.z+6.8);camera.position.lerp(camPos,.1);camera.lookAt(target)}

let socket=null;
const setStatus=t=>document.getElementById("status").textContent=t;
const updateCount=()=>document.getElementById("playerCount").textContent=1+Object.keys(otherPlayers).length;

if(BACKEND_URL){
 socket=io(BACKEND_URL,{transports:["websocket","polling"],auth:{telegramUser}});
 socket.on("connect",()=>{setStatus("🟢 Online");hideLoading()});
 socket.on("disconnect",()=>setStatus("🔴 Terputus"));
 socket.on("connect_error",e=>{console.error(e);setStatus("🔴 Gagal terhubung");hideLoading()});
 socket.on("currentPlayers",players=>{Object.entries(players).forEach(([id,p])=>{if(id===socket.id){myData={...p};if(myMesh)scene.remove(myMesh);myMesh=createPlayerMesh(myData,true)}else{if(otherPlayers[id])scene.remove(otherPlayers[id]);otherPlayers[id]=createPlayerMesh(p)}});updateCount()});
 socket.on("newPlayer",p=>{if(p.id===socket.id)return;if(otherPlayers[p.id])scene.remove(otherPlayers[p.id]);otherPlayers[p.id]=createPlayerMesh(p);updateCount()});
 socket.on("playerMoved",d=>{const m=otherPlayers[d.id];if(m){m.position.x=d.x;m.position.z=d.z}});
 socket.on("playerDisconnected",id=>{if(otherPlayers[id]){scene.remove(otherPlayers[id]);delete otherPlayers[id];updateCount()}});
}

const joystick=document.getElementById("joystick"),stick=document.getElementById("stick");
const js={x:0,y:0,active:false};let pointerId=null;
function moveStick(cx,cy){const r=joystick.getBoundingClientRect(),mx=r.left+r.width/2,my=r.top+r.height/2;let dx=cx-mx,dy=cy-my,max=r.width/2-38,d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max}js.x=dx/max;js.y=dy/max;stick.style.transform=`translate(${dx}px,${dy}px)`}
function resetStick(){js.x=0;js.y=0;js.active=false;pointerId=null;stick.style.transform="translate(0,0)"}
joystick.addEventListener("pointerdown",e=>{e.preventDefault();js.active=true;pointerId=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e.clientX,e.clientY)});
joystick.addEventListener("pointermove",e=>{if(js.active&&e.pointerId===pointerId){e.preventDefault();moveStick(e.clientX,e.clientY)}});
joystick.addEventListener("pointerup",e=>{if(e.pointerId===pointerId)resetStick()});joystick.addEventListener("pointercancel",resetStick);

const keys={up:false,down:false,left:false,right:false};
addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(e.key==="ArrowUp"||k==="w")keys.up=true;if(e.key==="ArrowDown"||k==="s")keys.down=true;if(e.key==="ArrowLeft"||k==="a")keys.left=true;if(e.key==="ArrowRight"||k==="d")keys.right=true});
addEventListener("keyup",e=>{const k=e.key.toLowerCase();if(e.key==="ArrowUp"||k==="w")keys.up=false;if(e.key==="ArrowDown"||k==="s")keys.down=false;if(e.key==="ArrowLeft"||k==="a")keys.left=false;if(e.key==="ArrowRight"||k==="d")keys.right=false});

let lastSend=0;
function updateMovement(dt){
 if(!myData||!myMesh)return;
 let dx=0,dz=0;
 if(keys.left)dx--;if(keys.right)dx++;if(keys.up)dz--;if(keys.down)dz++;
 if(js.active){dx=js.x;dz=js.y}
 if(Math.abs(dx)<.08&&Math.abs(dz)<.08)return;
 const len=Math.hypot(dx,dz);if(len>1){dx/=len;dz/=len}
 myData.x+=dx*MOVE_SPEED*dt;myData.z+=dz*MOVE_SPEED*dt;
 myData.x=Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,myData.x));myData.z=Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,myData.z));
 myMesh.position.set(myData.x,0,myData.z);myMesh.rotation.y=Math.atan2(dx,dz);
 const now=performance.now();if(socket?.connected&&now-lastSend>50){socket.emit("playerMovement",{x:myData.x,z:myData.z});lastSend=now}
}

function hideLoading(){const l=document.getElementById("loading");l.style.opacity="0";setTimeout(()=>l.style.display="none",450)}
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);updateMovement(dt);updateCamera();water.rotation.z+=dt*.04;renderer.render(scene,camera)}
animate();