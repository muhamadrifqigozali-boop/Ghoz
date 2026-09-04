/* ============================================================
   GHOZ WORLD v5 — Fixed Hangout ❤️
   Fixes: bubble chat, enter houses, local character, camera look
   ============================================================ */
const BACKEND_URL = "https://ghoz-production.up.railway.app";
const WORLD_LIMIT = 22;
const MOVE_SPEED = 5.4;
const JUMP_FORCE = 7.8;
const GRAVITY = 22;
const MUSEUM_PASSWORD = "sayang";

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor("#5dade2"); tg.setBackgroundColor("#5dade2"); } catch (e) {}
}
const telegramUser = tg?.initDataUnsafe?.user || {};
const defaultName = telegramUser.username
  ? "@" + telegramUser.username
  : [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ").trim() || "Player";

let myName = defaultName;
let myGender = "boy";
let myColor = "#4fc3f7";
let gameStarted = false;
let currentLocation = "outdoor";
let nearInteract = null;

// Start screen
const startScreen = document.getElementById("startScreen");
const nickInput = document.getElementById("nickInput");
if (nickInput) nickInput.value = defaultName.replace("@", "").slice(0, 16);

document.querySelectorAll(".gender-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".gender-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    myGender = btn.dataset.gender;
  });
});
document.querySelector(".gender-btn.boy")?.classList.add("selected");

document.getElementById("startBtn")?.addEventListener("click", () => {
  const nick = (nickInput?.value || "").trim().slice(0, 16);
  if (nick) myName = nick;
  myColor = myGender === "girl" ? "#ff80ab" : "#4fc3f7";
  startScreen.classList.add("hidden");
  document.getElementById("loading")?.classList.remove("hidden");
  ["hud", "players", "joystick", "joystickLabel", "jumpBtn", "chatToggle"].forEach((id) => {
    document.getElementById(id)?.classList.remove("hidden");
  });
  document.getElementById("playerName").textContent = myName;
  gameStarted = true;
  initGame();
});

// ========== THREE ==========
let scene, camera, renderer, clock;
let outdoorGroup, house1Group, house2Group, museumGroup;
let water, waterFountain;
let myData = null;
let myMesh = null;
let myVelocityY = 0;
let isGrounded = true;
const otherPlayers = {};
let socket = null;
const clouds = [];
const interactables = [];

// Camera look (drag to look around)
let camYaw = 0;
let camPitch = 0;
let isLooking = false;
let lookStartX = 0, lookStartY = 0;
let lookStartYaw = 0, lookStartPitch = 0;

function mat(color, roughness = 0.75, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function initGame() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5dade2);
  scene.fog = new THREE.Fog(0x5dade2, 35, 80);

  camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 140);
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6aab6a, 0.85));
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
  sun.position.set(20, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.bias = -0.001;
  scene.add(sun);
  scene.add(new THREE.DirectionalLight(0xa0c8ff, 0.3));

  outdoorGroup = new THREE.Group(); scene.add(outdoorGroup);
  house1Group = new THREE.Group(); house1Group.visible = false; scene.add(house1Group);
  house2Group = new THREE.Group(); house2Group.visible = false; scene.add(house2Group);
  museumGroup = new THREE.Group(); museumGroup.visible = false; scene.add(museumGroup);

  buildOutdoor();
  buildHouse1();
  buildHouse2();
  buildMuseum();
  setupControls();
  setupNetwork();
  setupLookControls();

  // Spawn local player immediately (don't wait for server)
  myData = { x: 0, z: 6, y: 0, name: myName, gender: myGender, color: myColor };
  myMesh = createPlayerMesh(myData, true);
  scene.add(myMesh);

  clock = new THREE.Clock();
  hideLoading();
  animate();
}

// -------------------- WORLD BUILDERS (same as before, condensed) --------------------
function buildOutdoor() {
  const g = outdoorGroup;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), mat(0x5cb85c, 0.92));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);

  for (let i = 0; i < 24; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.2 + Math.random() * 1.8, 10), mat(0x4cae4c, 0.95));
    p.rotation.x = -Math.PI / 2;
    p.position.set((Math.random() - 0.5) * 40, 0.01, (Math.random() - 0.5) * 40);
    g.add(p);
  }

  const roadMat = mat(0x6b6b6b, 0.85);
  const r1 = new THREE.Mesh(new THREE.PlaneGeometry(7, 42), roadMat);
  r1.rotation.x = -Math.PI / 2; r1.position.y = 0.015; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.PlaneGeometry(42, 5.5), roadMat);
  r2.rotation.x = -Math.PI / 2; r2.position.y = 0.016; g.add(r2);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  for (let z = -19; z <= 19; z += 2.3) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.1), lineMat);
    l.rotation.x = -Math.PI / 2; l.position.set(0, 0.03, z); g.add(l);
  }

  water = new THREE.Mesh(new THREE.CircleGeometry(4.5, 40),
    new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2; water.position.set(-12, 0.04, -11); g.add(water);

  function tree(x, z, s = 1) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.1, 8), mat(0x8b5a2b));
    trunk.position.y = 1.05; trunk.castShadow = true; t.add(trunk);
    [[2.6, 1.35, 2, 0x27ae60], [3.55, 1.05, 1.6, 0x2ecc71], [4.3, 0.7, 1.2, 0x58d68d]].forEach(([y, r, h, c]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mat(c));
      cone.position.y = y; cone.castShadow = true; t.add(cone);
    });
    t.position.set(x, 0, z); t.scale.setScalar(s); g.add(t);
  }
  [[-16,-16,1.1],[-18,-10,1],[-15,12,1.1],[16,-16,1.1],[18,-10,1],[15,12,1],
   [-9,18,0.9],[9,18,0.9],[-10,-18,0.9],[10,-18,0.9],[-18,4,0.85],[18,4,0.9]].forEach(t => tree(...t));

  // Houses with LARGE interact zones
  createHouseExterior(-13, 8, 0xf5cba7, 0xc0392b, "house1", g);
  createHouseExterior(13, 8, 0xf5b7b1, 0x8e44ad, "house2", g);
  createMuseumExterior(0, -16, g);

  // Plaza
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.18, 28), mat(0xd5d8dc));
  plaza.position.set(0, 0.09, 0); plaza.receiveShadow = true; g.add(plaza);
  const fBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.7, 16), mat(0xbdc3c7));
  fBase.position.y = 0.45; g.add(fBase);
  waterFountain = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: 0x3498db, transparent: true, opacity: 0.85 }));
  waterFountain.position.y = 0.85; g.add(waterFountain);

  function bench(x, z, rot = 0) {
    const b = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.5), mat(0x8b5a2b));
    seat.position.y = 0.45; b.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.1), mat(0x8b5a2b));
    back.position.set(0, 0.75, -0.2); b.add(back);
    b.position.set(x, 0, z); b.rotation.y = rot; g.add(b);
  }
  bench(-4.5, 4.5, Math.PI / 4); bench(4.5, 4.5, -Math.PI / 4);
  bench(-4.5, -4.5, 3 * Math.PI / 4); bench(4.5, -4.5, -3 * Math.PI / 4);

  function lamp(x, z) {
    const l = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3, 8), mat(0x2c3e50));
    pole.position.y = 1.5; l.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffeaa7 }));
    bulb.position.y = 3.15; l.add(bulb);
    l.position.set(x, 0, z); g.add(l);
  }
  [[-5,-6],[5,-6],[-5,6],[5,6],[-5,0],[5,0]].forEach(p => lamp(...p));

  // Border
  [[0,-22.5,46,0.7],[0,22.5,46,0.7],[-22.5,0,0.7,46],[22.5,0,0.7,46]].forEach(([x,z,w,d]) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, 0.95, d), mat(0x2d6a4f));
    o.position.set(x, 0.48, z); g.add(o);
  });

  // Clouds
  function cloud(x, y, z, s = 1) {
    const c = new THREE.Group();
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
    [[0,0,0],[1.2,0.15,0.3],[-1.1,0.1,-0.2]].forEach(([cx,cy,cz]) => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), cm);
      p.position.set(cx, cy, cz); c.add(p);
    });
    c.position.set(x, y, z); c.scale.setScalar(s); g.add(c); clouds.push(c);
  }
  cloud(-20, 16, -12, 1.5); cloud(16, 17, 8, 1.6); cloud(4, 15, -18, 1.3);
}

function createHouseExterior(x, z, color, roofColor, id, parent) {
  const house = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 4), mat(color));
  body.position.y = 1.4; body.castShadow = true; house.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.9, 4), mat(roofColor));
  roof.rotation.y = Math.PI / 4; roof.position.y = 3.55; house.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.12), mat(0x4e342e));
  door.position.set(0, 0.8, 2.05); house.add(door);
  [-1.2, 1.2].forEach(wx => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), mat(0xecf0f1));
    frame.position.set(wx, 1.6, 2.05); house.add(frame);
  });
  house.position.set(x, 0, z); parent.add(house);

  // VERY large interact radius so mudah masuk
  interactables.push({
    type: "house", id, label: "Masuk Rumah 🚪",
    pos: new THREE.Vector3(x, 0, z + 2.5),
    radius: 3.8,
    location: "outdoor",
    onEnter: () => enterLocation(id)
  });
}

function createMuseumExterior(x, z, parent) {
  const m = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 6), mat(0xecf0f1));
  body.position.y = 2.1; body.castShadow = true; m.add(body);
  [-3.2, -1.1, 1.1, 3.2].forEach(cx => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4, 10), mat(0xbdc3c7));
    col.position.set(cx, 2, 3.15); m.add(col);
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.4, 6.6), mat(0x2c3e50));
  roof.position.y = 4.4; m.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.15), mat(0x5d4037));
  door.position.set(0, 1.2, 3.1); m.add(door);
  m.position.set(x, 0, z); parent.add(m);

  interactables.push({
    type: "museum", id: "museum", label: "Masuk Museum (Password) 🔐",
    pos: new THREE.Vector3(x, 0, z + 4),
    radius: 4.0,
    location: "outdoor",
    onEnter: () => showPasswordModal()
  });
}

function buildHouse1() {
  const g = house1Group;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(0xd7ccc8));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; g.add(floor);
  const wallMat = mat(0xfff3e0);
  [[0,2,-5,10,4,0.3],[0,2,5,10,4,0.3],[-5,2,0,0.3,4,10],[5,2,0,0.3,4,10]].forEach(([x,y,z,w,h,d]) => {
    const wll = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
    wll.position.set(x,y,z); g.add(wll);
  });
  const pl = new THREE.PointLight(0xffe0b2, 1.2, 14); pl.position.set(0, 3.5, 0); g.add(pl);
  const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.2), mat(0xe57373));
  sofa.position.set(0, 0.4, -2.5); g.add(sofa);
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1), mat(0x8d6e63));
  table.position.set(0, 0.55, 0.5); g.add(table);
  const exit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.15), mat(0x5d4037));
  exit.position.set(0, 1.1, 4.9); g.add(exit);

  interactables.push({
    type: "exit", id: "exit-house1", label: "Keluar Rumah 🚪",
    pos: new THREE.Vector3(0, 0, 4.2), radius: 2.5, location: "house1",
    onEnter: () => enterLocation("outdoor")
  });
}

function buildHouse2() {
  const g = house2Group;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(0xe1bee7));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; g.add(floor);
  const wallMat = mat(0xf3e5f5);
  [[0,2,-5,10,4,0.3],[0,2,5,10,4,0.3],[-5,2,0,0.3,4,10],[5,2,0,0.3,4,10]].forEach(([x,y,z,w,h,d]) => {
    const wll = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
    wll.position.set(x,y,z); g.add(wll);
  });
  const pl = new THREE.PointLight(0xf8bbd0, 1.2, 14); pl.position.set(0, 3.5, 0); g.add(pl);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 3), mat(0xce93d8));
  bed.position.set(-2, 0.35, -1); g.add(bed);
  const exit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.15), mat(0x5d4037));
  exit.position.set(0, 1.1, 4.9); g.add(exit);

  interactables.push({
    type: "exit", id: "exit-house2", label: "Keluar Rumah 🚪",
    pos: new THREE.Vector3(0, 0, 4.2), radius: 2.5, location: "house2",
    onEnter: () => enterLocation("outdoor")
  });
}

function buildMuseum() {
  const g = museumGroup;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), mat(0x263238, 0.6, 0.2));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; g.add(floor);
  const wallMat = mat(0x37474f);
  [[0,2.5,-7,16,5,0.4],[0,2.5,7,16,5,0.4],[-8,2.5,0,0.4,5,14],[8,2.5,0,0.4,5,14]].forEach(([x,y,z,w,h,d]) => {
    const wll = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
    wll.position.set(x,y,z); g.add(wll);
  });
  const pl1 = new THREE.PointLight(0xff80ab, 0.9, 16); pl1.position.set(-4, 4, 0); g.add(pl1);
  const pl2 = new THREE.PointLight(0x80d8ff, 0.7, 14); pl2.position.set(4, 4, 0); g.add(pl2);
  const pl3 = new THREE.PointLight(0xffecb3, 1.0, 12); pl3.position.set(0, 4.2, -3); g.add(pl3);

  // Big photo screen
  const frame = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.6, 0.25), mat(0xf1c40f, 0.4, 0.3));
  frame.position.set(0, 2.5, -6.6); g.add(frame);
  const photoCanvas = document.createElement("canvas");
  photoCanvas.width = 1024; photoCanvas.height = 640;
  const pctx = photoCanvas.getContext("2d");
  const grd = pctx.createLinearGradient(0, 0, 1024, 640);
  grd.addColorStop(0, "#ff9a9e"); grd.addColorStop(0.5, "#fecfef"); grd.addColorStop(1, "#a18cd1");
  pctx.fillStyle = grd; pctx.fillRect(0, 0, 1024, 640);
  pctx.fillStyle = "rgba(255,255,255,0.3)";
  for (let i = 0; i < 15; i++) {
    pctx.font = `${28 + Math.random() * 40}px Arial`;
    pctx.fillText("♥", 60 + Math.random() * 900, 50 + Math.random() * 540);
  }
  pctx.fillStyle = "#fff"; pctx.font = "bold 64px Arial"; pctx.textAlign = "center";
  pctx.fillText("Foto Pacar ❤️", 512, 280);
  pctx.font = "28px Arial"; pctx.fillText("Tempat kenangan kita berdua", 512, 360);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(photoCanvas) }));
  photo.position.set(0, 2.5, -6.45); g.add(photo);

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.9, 16), mat(0xb0bec5));
  ped.position.set(0, 0.45, 0); g.add(ped);
  const heartMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0x660011, emissiveIntensity: 0.3 });
  const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), heartMat);
  h1.position.set(-0.25, 1.3, 0); g.add(h1);
  const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), heartMat);
  h2.position.set(0.25, 1.3, 0); g.add(h2);

  const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.2), mat(0x5d4037));
  exitDoor.position.set(0, 1.2, 6.8); g.add(exitDoor);

  interactables.push({
    type: "exit", id: "exit-museum", label: "Keluar Museum 🚪",
    pos: new THREE.Vector3(0, 0, 6.0), radius: 2.8, location: "museum",
    onEnter: () => enterLocation("outdoor")
  });
}

function enterLocation(loc) {
  outdoorGroup.visible = false;
  house1Group.visible = false;
  house2Group.visible = false;
  museumGroup.visible = false;

  if (loc === "outdoor") {
    outdoorGroup.visible = true;
    scene.background = new THREE.Color(0x5dade2);
    scene.fog = new THREE.Fog(0x5dade2, 35, 80);
    if (myData) { myData.x = 0; myData.z = 8; myData.y = 0; }
    document.getElementById("locationBadge").textContent = "📍 Outdoor";
  } else if (loc === "house1") {
    house1Group.visible = true;
    scene.background = new THREE.Color(0xfff3e0);
    scene.fog = null;
    if (myData) { myData.x = 0; myData.z = 2.5; myData.y = 0; }
    document.getElementById("locationBadge").textContent = "🏠 Rumah Hangout";
  } else if (loc === "house2") {
    house2Group.visible = true;
    scene.background = new THREE.Color(0xf3e5f5);
    scene.fog = null;
    if (myData) { myData.x = 0; myData.z = 2.5; myData.y = 0; }
    document.getElementById("locationBadge").textContent = "🏠 Rumah Pink";
  } else if (loc === "museum") {
    museumGroup.visible = true;
    scene.background = new THREE.Color(0x1a237e);
    scene.fog = null;
    if (myData) { myData.x = 0; myData.z = 3.5; myData.y = 0; }
    document.getElementById("locationBadge").textContent = "🏛️ Museum Cinta";
  }
  currentLocation = loc;
  document.getElementById("locationBadge").style.display = "block";
  if (myMesh && myData) myMesh.position.set(myData.x, myData.y || 0, myData.z);
  nearInteract = null;
  updateInteractUI();
}

function showPasswordModal() {
  document.getElementById("passModal").style.display = "flex";
  document.getElementById("passInput").value = "";
  setTimeout(() => document.getElementById("passInput")?.focus(), 100);
}
document.getElementById("passCancel")?.addEventListener("click", () => {
  document.getElementById("passModal").style.display = "none";
});
document.getElementById("passSubmit")?.addEventListener("click", tryPassword);
document.getElementById("passInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryPassword();
});
function tryPassword() {
  const val = (document.getElementById("passInput")?.value || "").trim().toLowerCase();
  if (val === MUSEUM_PASSWORD.toLowerCase()) {
    document.getElementById("passModal").style.display = "none";
    enterLocation("museum");
  } else {
    const inp = document.getElementById("passInput");
    if (inp) { inp.style.borderColor = "#ff1744"; setTimeout(() => inp.style.borderColor = "", 700); }
  }
}

// -------------------- PLAYER --------------------
function createLabel(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath(); ctx.roundRect(16, 28, 480, 72, 22); ctx.fill();
  ctx.font = "bold 40px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(String(text).slice(0, 16), 256, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  s.scale.set(2.5, 0.62, 1); s.position.y = 3.25;
  return s;
}

function createChatBubble(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 180;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.beginPath(); ctx.roundRect(16, 16, 480, 110, 26); ctx.fill();
  ctx.beginPath(); ctx.moveTo(220, 126); ctx.lineTo(256, 155); ctx.lineTo(292, 126); ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 34px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const words = String(text).slice(0, 55).split(" ");
  let line = "", lines = [], y = 50;
  words.forEach(w => {
    const test = line + w + " ";
    if (ctx.measureText(test).width > 430 && line) { lines.push(line); line = w + " "; }
    else line = test;
  });
  lines.push(line);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l.trim(), 256, y + i * 38));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  s.scale.set(3.0, 1.05, 1); s.position.y = 4.15;
  return s;
}

function createPlayerMesh(player, isMe = false) {
  const g = new THREE.Group();
  const gender = isMe ? myGender : (player.gender || "boy");
  const c = isMe ? myColor : (player.color || (gender === "girl" ? "#ff80ab" : "#4fc3f7"));

  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.5),
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));
  body.position.y = 1.15; body.castShadow = true; body.name = "body"; g.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), mat(0xffdbac));
  head.position.y = 2.05; head.castShadow = true; head.name = "head"; g.add(head);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), eyeMat);
  eyeL.position.set(-0.16, 2.12, 0.36); g.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), eyeMat);
  eyeR.position.set(0.16, 2.12, 0.36); g.add(eyeR);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0xc0392b }));
  mouth.position.set(0, 1.88, 0.36); g.add(mouth);

  if (gender === "girl") {
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.9, 0.78), mat(0xf48fb1));
    hair.position.y = 2.15; hair.castShadow = true; g.add(hair);
    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.25, 0.3), mat(0xf48fb1));
    bangs.position.set(0, 2.4, 0.28); g.add(bangs);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), mat(0xf48fb1));
    left.position.set(-0.5, 1.7, 0.1); g.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), mat(0xf48fb1));
    right.position.set(0.5, 1.7, 0.1); g.add(right);
  } else {
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.28, 0.76), mat(0x2c3e50));
    hair.position.y = 2.42; hair.castShadow = true; g.add(hair);
  }

  const armMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 });
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.95, 0.28), armMat);
  armL.position.set(-0.58, 1.1, 0); armL.castShadow = true; armL.name = "armL"; g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.95, 0.28), armMat);
  armR.position.set(0.58, 1.1, 0); armR.castShadow = true; armR.name = "armR"; g.add(armR);

  const legColor = gender === "girl" ? 0xf8bbd0 : 0x2c3e50;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.35), mat(legColor));
  legL.position.set(-0.24, 0.42, 0); legL.castShadow = true; legL.name = "legL"; g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.35), mat(legColor));
  legR.position.set(0.24, 0.42, 0); legR.castShadow = true; legR.name = "legR"; g.add(legR);

  const labelText = isMe ? "YOU" : (player.name || "Player");
  g.add(createLabel(labelText));

  g.position.set(player.x || 0, player.y || 0, player.z || 0);
  g.userData = { walkPhase: 0, isMoving: false, bubble: null, bubbleTimer: 0, isMe };
  return g;
}

function animatePlayer(mesh, isMoving, dt) {
  if (!mesh) return;
  const ud = mesh.userData;
  if (isMoving) {
    ud.walkPhase += dt * 10;
    const swing = Math.sin(ud.walkPhase) * 0.45;
    ["armL", "armR", "legL", "legR"].forEach((n, i) => {
      const o = mesh.getObjectByName(n);
      if (o) o.rotation.x = (i % 2 === 0 ? 1 : -1) * swing * (n.startsWith("leg") ? 0.9 : 1);
    });
    const body = mesh.getObjectByName("body");
    if (body) body.position.y = 1.15 + Math.abs(Math.sin(ud.walkPhase * 2)) * 0.04;
  } else {
    ["armL", "armR", "legL", "legR"].forEach(n => {
      const o = mesh.getObjectByName(n);
      if (o) o.rotation.x *= 0.85;
    });
    const body = mesh.getObjectByName("body");
    if (body) body.position.y = 1.15;
  }
  if (ud.bubble) {
    ud.bubbleTimer -= dt;
    if (ud.bubbleTimer <= 0) {
      mesh.remove(ud.bubble);
      ud.bubble = null;
    }
  }
}

function showBubble(mesh, text) {
  if (!mesh) {
    console.warn("showBubble: no mesh");
    return;
  }
  const ud = mesh.userData;
  if (ud.bubble) {
    mesh.remove(ud.bubble);
    ud.bubble = null;
  }
  ud.bubble = createChatBubble(text);
  mesh.add(ud.bubble);
  ud.bubbleTimer = 6.0;
}

// -------------------- CAMERA + LOOK --------------------
const target = new THREE.Vector3();
const camPos = new THREE.Vector3();

function updateCamera() {
  if (!myData) return;
  const yOff = myData.y || 0;
  // Base follow position
  const dist = 7.5;
  const height = 5.8 + yOff * 0.25;
  // Apply look yaw/pitch
  const yaw = camYaw;
  const pitch = Math.max(-0.6, Math.min(0.45, camPitch));
  const ox = Math.sin(yaw) * dist * Math.cos(pitch);
  const oz = Math.cos(yaw) * dist * Math.cos(pitch);
  const oy = height + Math.sin(pitch) * 3;

  target.set(myData.x, 1.5 + yOff, myData.z);
  camPos.set(myData.x + ox, oy, myData.z + oz);
  camera.position.lerp(camPos, 0.14);
  camera.lookAt(target);
}

function setupLookControls() {
  const el = renderer.domElement;
  // Touch / mouse drag on RIGHT side of screen to look around
  el.addEventListener("pointerdown", (e) => {
    // Ignore if on joystick / buttons area (left 180px or bottom buttons)
    if (e.clientX < 180) return;
    if (e.clientY > innerHeight - 160) return;
    isLooking = true;
    lookStartX = e.clientX;
    lookStartY = e.clientY;
    lookStartYaw = camYaw;
    lookStartPitch = camPitch;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  });
  el.addEventListener("pointermove", (e) => {
    if (!isLooking) return;
    const dx = e.clientX - lookStartX;
    const dy = e.clientY - lookStartY;
    camYaw = lookStartYaw - dx * 0.005;
    camPitch = lookStartPitch + dy * 0.004;
  });
  el.addEventListener("pointerup", () => { isLooking = false; });
  el.addEventListener("pointercancel", () => { isLooking = false; });
}

// -------------------- NETWORK (local player independent) --------------------
function setupNetwork() {
  const setStatus = (t) => { const el = document.getElementById("status"); if (el) el.textContent = t; };
  const updateCount = () => {
    const el = document.getElementById("playerCount");
    if (el) el.textContent = 1 + Object.keys(otherPlayers).length;
  };

  if (!BACKEND_URL) {
    setStatus("Offline mode");
    return;
  }

  socket = io(BACKEND_URL, {
    transports: ["websocket", "polling"],
    auth: { telegramUser, name: myName, gender: myGender, color: myColor }
  });

  socket.on("connect", () => setStatus("🟢 Online"));
  socket.on("disconnect", () => setStatus("🔴 Terputus"));
  socket.on("connect_error", (e) => {
    console.error(e);
    setStatus("🔴 Offline (masih bisa main)");
  });

  socket.on("currentPlayers", (players) => {
    // Clear old others
    Object.keys(otherPlayers).forEach((id) => {
      if (otherPlayers[id]) scene.remove(otherPlayers[id]);
      delete otherPlayers[id];
    });

    Object.entries(players).forEach(([id, p]) => {
      if (id === socket.id) {
        // Keep our local appearance & only sync position if needed
        if (p.x !== undefined) myData.x = p.x;
        if (p.z !== undefined) myData.z = p.z;
      } else {
        // Other players only
        const mesh = createPlayerMesh(p, false);
        otherPlayers[id] = mesh;
        scene.add(mesh);
      }
    });
    updateCount();
  });

  socket.on("newPlayer", (p) => {
    if (!p || p.id === socket.id) return;
    if (otherPlayers[p.id]) {
      scene.remove(otherPlayers[p.id]);
    }
    const mesh = createPlayerMesh(p, false);
    otherPlayers[p.id] = mesh;
    scene.add(mesh);
    updateCount();
  });

  socket.on("playerMoved", (d) => {
    if (!d || d.id === socket.id) return;
    const m = otherPlayers[d.id];
    if (m) {
      m.position.x = d.x;
      m.position.z = d.z;
      if (d.y !== undefined) m.position.y = d.y;
      if (d.dx !== undefined && d.dz !== undefined) {
        const len = Math.hypot(d.dx || 0, d.dz || 0);
        if (len > 0.05) m.rotation.y = Math.atan2(d.dx, d.dz);
      }
      m.userData.isMoving = true;
    }
  });

  socket.on("playerDisconnected", (id) => {
    if (otherPlayers[id]) {
      scene.remove(otherPlayers[id]);
      delete otherPlayers[id];
      updateCount();
    }
  });

  // Chat from others
  socket.on("chat", (data) => {
    if (!data || data.id === socket.id) return;
    const m = otherPlayers[data.id];
    if (m) showBubble(m, data.text || "");
  });
}

// -------------------- CONTROLS --------------------
function setupControls() {
  const joystick = document.getElementById("joystick");
  const stick = document.getElementById("stick");
  const js = { x: 0, y: 0, active: false };
  let pointerId = null;

  function moveStick(cx, cy) {
    const r = joystick.getBoundingClientRect();
    const mx = r.left + r.width / 2, my = r.top + r.height / 2;
    let dx = cx - mx, dy = cy - my;
    const max = r.width / 2 - 28;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
    js.x = dx / max; js.y = dy / max;
    stick.style.transform = `translate(${dx}px,${dy}px)`;
  }
  function resetStick() {
    js.x = 0; js.y = 0; js.active = false; pointerId = null;
    stick.style.transform = "translate(0,0)";
  }

  joystick?.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    js.active = true; pointerId = e.pointerId;
    try { joystick.setPointerCapture(e.pointerId); } catch (_) {}
    moveStick(e.clientX, e.clientY);
  });
  joystick?.addEventListener("pointermove", (e) => {
    if (js.active && e.pointerId === pointerId) {
      e.preventDefault(); moveStick(e.clientX, e.clientY);
    }
  });
  joystick?.addEventListener("pointerup", (e) => { if (e.pointerId === pointerId) resetStick(); });
  joystick?.addEventListener("pointercancel", resetStick);

  const keys = { up: false, down: false, left: false, right: false, jump: false };
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (e.key === "ArrowUp" || k === "w") keys.up = true;
    if (e.key === "ArrowDown" || k === "s") keys.down = true;
    if (e.key === "ArrowLeft" || k === "a") keys.left = true;
    if (e.key === "ArrowRight" || k === "d") keys.right = true;
    if (e.key === " " || k === "space") { e.preventDefault(); keys.jump = true; }
    if (k === "e") tryInteract();
  });
  addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (e.key === "ArrowUp" || k === "w") keys.up = false;
    if (e.key === "ArrowDown" || k === "s") keys.down = false;
    if (e.key === "ArrowLeft" || k === "a") keys.left = false;
    if (e.key === "ArrowRight" || k === "d") keys.right = false;
    if (e.key === " " || k === "space") keys.jump = false;
  });

  document.getElementById("jumpBtn")?.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation(); keys.jump = true;
  });
  document.getElementById("jumpBtn")?.addEventListener("pointerup", () => keys.jump = false);
  document.getElementById("interactBtn")?.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation(); tryInteract();
  });

  // Chat
  const chatToggle = document.getElementById("chatToggle");
  const chatBar = document.getElementById("chatBar");
  const chatInput = document.getElementById("chatInput");
  chatToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    const show = chatBar.style.display !== "flex";
    chatBar.style.display = show ? "flex" : "none";
    if (show) setTimeout(() => chatInput?.focus(), 50);
  });
  document.getElementById("chatSend")?.addEventListener("click", (e) => {
    e.stopPropagation(); sendChat();
  });
  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); sendChat(); }
  });

  function sendChat() {
    const text = (chatInput?.value || "").trim();
    if (!text) return;
    chatInput.value = "";
    // Always show on self first
    showBubble(myMesh, text);
    if (socket?.connected) {
      socket.emit("chat", { text, name: myName });
    }
    if (chatBar) chatBar.style.display = "none";
  }

  window._keys = keys;
  window._js = js;
  window._lastSend = 0;
}

function tryInteract() {
  if (nearInteract && typeof nearInteract.onEnter === "function") {
    nearInteract.onEnter();
  }
}

function updateInteractUI() {
  const btn = document.getElementById("interactBtn");
  const prompt = document.getElementById("prompt");
  if (nearInteract) {
    if (btn) btn.style.display = "flex";
    if (prompt) {
      prompt.style.display = "block";
      prompt.textContent = nearInteract.label || "Tekan 🚪 untuk masuk";
    }
  } else {
    if (btn) btn.style.display = "none";
    if (prompt) prompt.style.display = "none";
  }
}

function updateMovement(dt) {
  if (!myData || !myMesh) return;
  const keys = window._keys || {};
  const js = window._js || { x: 0, y: 0, active: false };

  let dx = 0, dz = 0;
  if (keys.left) dx--; if (keys.right) dx++;
  if (keys.up) dz--; if (keys.down) dz++;
  if (js.active) { dx = js.x; dz = js.y; }

  // Camera-relative movement when looking
  if (Math.abs(camYaw) > 0.01 && (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05)) {
    const cos = Math.cos(camYaw);
    const sin = Math.sin(camYaw);
    const rdx = dx * cos - dz * sin;
    const rdz = dx * sin + dz * cos;
    dx = rdx; dz = rdz;
  }

  const moving = Math.abs(dx) > 0.08 || Math.abs(dz) > 0.08;
  if (moving) {
    const len = Math.hypot(dx, dz);
    if (len > 1) { dx /= len; dz /= len; }
    myData.x += dx * MOVE_SPEED * dt;
    myData.z += dz * MOVE_SPEED * dt;
    const lim = currentLocation === "outdoor" ? WORLD_LIMIT : (currentLocation === "museum" ? 6.5 : 4.2);
    myData.x = Math.max(-lim, Math.min(lim, myData.x));
    myData.z = Math.max(-lim, Math.min(lim, myData.z));
    myMesh.rotation.y = Math.atan2(dx, dz);
  }

  if (keys.jump && isGrounded) {
    myVelocityY = JUMP_FORCE;
    isGrounded = false;
    keys.jump = false;
  }
  myVelocityY -= GRAVITY * dt;
  myData.y = (myData.y || 0) + myVelocityY * dt;
  if (myData.y <= 0) {
    myData.y = 0;
    myVelocityY = 0;
    isGrounded = true;
  }

  myMesh.position.set(myData.x, myData.y, myData.z);
  animatePlayer(myMesh, moving, dt);

  // Interact detection
  nearInteract = null;
  const myPos = new THREE.Vector3(myData.x, 0, myData.z);
  for (const it of interactables) {
    if (it.location !== currentLocation) continue;
    if (myPos.distanceTo(it.pos) < it.radius) {
      nearInteract = it;
      break;
    }
  }
  updateInteractUI();

  // Send position
  const now = performance.now();
  if (socket?.connected && now - (window._lastSend || 0) > 50) {
    socket.emit("playerMovement", {
      x: myData.x, z: myData.z, y: myData.y,
      dx, dz, name: myName, gender: myGender, color: myColor
    });
    window._lastSend = now;
  }

  Object.values(otherPlayers).forEach((m) => {
    if (m.userData.isMoving) {
      animatePlayer(m, true, dt);
      m.userData.isMoving = false;
    } else {
      animatePlayer(m, false, dt);
    }
  });
}

function hideLoading() {
  const l = document.getElementById("loading");
  if (!l) return;
  l.classList.add("fade-out");
  setTimeout(() => { l.style.display = "none"; }, 400);
}

addEventListener("resize", () => {
  if (!camera || !renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  if (!clock) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  updateMovement(dt);
  updateCamera();
  clouds.forEach((c, i) => {
    c.position.x += Math.sin(performance.now() * 0.00015 + i) * 0.3 * dt;
  });
  if (water) water.rotation.z += dt * 0.03;
  if (waterFountain) waterFountain.rotation.y += dt * 0.4;
  renderer.render(scene, camera);
}
