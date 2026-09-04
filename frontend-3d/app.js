/* ============================================================
   GHOZ WORLD v4 — Hangout Place for Two ❤️
   ============================================================ */
const BACKEND_URL = "https://ghoz-production.up.railway.app";
const WORLD_LIMIT = 22;
const MOVE_SPEED = 5.4;
const JUMP_FORCE = 7.8;
const GRAVITY = 22;
const MUSEUM_PASSWORD = "sayang"; // <-- password museum (bisa diganti)

// ---------- Telegram ----------
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

// ---------- State ----------
let myName = defaultName;
let myGender = "boy"; // boy | girl
let myColor = "#4fc3f7";
let gameStarted = false;
let currentLocation = "outdoor"; // outdoor | house1 | house2 | museum
let nearInteract = null; // { type, id, label }

// ---------- Start Screen ----------
const startScreen = document.getElementById("startScreen");
const nickInput = document.getElementById("nickInput");
nickInput.value = defaultName.replace("@", "").slice(0, 16);

document.querySelectorAll(".gender-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".gender-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    myGender = btn.dataset.gender;
  });
});
// default select boy
document.querySelector('.gender-btn.boy').classList.add("selected");

document.getElementById("startBtn").addEventListener("click", () => {
  const nick = nickInput.value.trim().slice(0, 16);
  if (nick) myName = nick;
  myColor = myGender === "girl" ? "#ff80ab" : "#4fc3f7";
  startScreen.classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("hud").classList.remove("hidden");
  document.getElementById("players").classList.remove("hidden");
  document.getElementById("joystick").classList.remove("hidden");
  document.getElementById("joystickLabel").classList.remove("hidden");
  document.getElementById("jumpBtn").classList.remove("hidden");
  document.getElementById("chatToggle").classList.remove("hidden");
  document.getElementById("playerName").textContent = myName;
  gameStarted = true;
  initGame();
});

// ============================================================
//  THREE.JS WORLD
// ============================================================
let scene, camera, renderer, sun, clock;
let terrain, water, waterFountain;
let myData = null, myMesh = null, myVelocityY = 0, isGrounded = true;
const otherPlayers = {};
let socket = null;
const clouds = [];
const interactables = []; // { mesh, type, id, label, pos, radius, onEnter, onExit }

// Indoor groups
let outdoorGroup, house1Group, house2Group, museumGroup;
let activeGroup = null;

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

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6aab6a, 0.85));
  sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
  sun.position.set(20, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.bias = -0.001;
  scene.add(sun);
  scene.add(new THREE.DirectionalLight(0xa0c8ff, 0.3).position.set(-14, 12, -10));

  outdoorGroup = new THREE.Group();
  scene.add(outdoorGroup);
  house1Group = new THREE.Group(); house1Group.visible = false; scene.add(house1Group);
  house2Group = new THREE.Group(); house2Group.visible = false; scene.add(house2Group);
  museumGroup = new THREE.Group(); museumGroup.visible = false; scene.add(museumGroup);
  activeGroup = outdoorGroup;

  buildOutdoor();
  buildHouse1();
  buildHouse2();
  buildMuseum();
  setupControls();
  setupNetwork();
  clock = new THREE.Clock();
  animate();
}

// -------------------- OUTDOOR WORLD --------------------
function buildOutdoor() {
  const g = outdoorGroup;

  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), mat(0x5cb85c, 0.92));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);

  // Grass patches
  for (let i = 0; i < 28; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1.1 + Math.random() * 2, 10), mat(0x4cae4c, 0.95));
    p.rotation.x = -Math.PI / 2;
    p.position.set((Math.random() - 0.5) * 42, 0.01, (Math.random() - 0.5) * 42);
    g.add(p);
  }

  // Roads
  const roadMat = mat(0x6b6b6b, 0.85);
  const r1 = new THREE.Mesh(new THREE.PlaneGeometry(7, 42), roadMat);
  r1.rotation.x = -Math.PI / 2; r1.position.y = 0.015; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.PlaneGeometry(42, 5.5), roadMat);
  r2.rotation.x = -Math.PI / 2; r2.position.y = 0.016; g.add(r2);

  // Road lines
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  for (let z = -19; z <= 19; z += 2.3) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.1), lineMat);
    l.rotation.x = -Math.PI / 2; l.position.set(0, 0.03, z); g.add(l);
  }
  for (let x = -19; x <= 19; x += 2.3) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.22), lineMat);
    l.rotation.x = -Math.PI / 2; l.position.set(x, 0.031, 0); g.add(l);
  }

  // Pond
  water = new THREE.Mesh(
    new THREE.CircleGeometry(4.5, 40),
    new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.88 })
  );
  water.rotation.x = -Math.PI / 2; water.position.set(-12, 0.04, -11); g.add(water);
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.55, 4.9, 40), mat(0x85c1e9, 0.6));
  ring.rotation.x = -Math.PI / 2; ring.position.set(-12, 0.05, -11); g.add(ring);

  // Trees
  function tree(x, z, s = 1) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.1, 8), mat(0x8b5a2b, 0.85));
    trunk.position.y = 1.05; trunk.castShadow = true; t.add(trunk);
    [[2.6, 1.35, 2.0, 0x27ae60], [3.55, 1.05, 1.6, 0x2ecc71], [4.3, 0.7, 1.2, 0x58d68d]].forEach(([y, r, h, c]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mat(c, 0.8));
      cone.position.y = y; cone.castShadow = true; t.add(cone);
    });
    t.position.set(x, 0, z); t.scale.setScalar(s); g.add(t);
  }
  [[-16,-16,1.1],[-18,-10,1],[-15,12,1.15],[-18,17,0.95],[16,-16,1.1],[18,-10,1],[15,12,1],[18,17,0.95],
   [-9,18,0.9],[9,18,0.95],[-10,-18,0.9],[10,-18,0.9],[-18,4,0.85],[18,4,0.9],[-5,-19,0.8],[5,-19,0.8],
   [-19,-4,0.85],[19,-4,0.85]].forEach(t => tree(...t));

  // Rocks
  function rock(x, z, s = 1) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), mat(0x7f8c8d, 0.7));
    r.position.set(x, 0.32 * s, z); r.scale.set(s * 1.25, s * 0.75, s * 1.1);
    r.rotation.y = Math.random() * Math.PI; r.castShadow = true; g.add(r);
  }
  [[-8,13,0.8],[-10,10,0.6],[12,12,0.75],[14,15,0.55],[10,-13,0.7],[-9,-13,0.6]].forEach(r => rock(...r));

  // Houses (enterable)
  createHouseExterior(-13, 8, 0xf5cba7, 0xc0392b, "house1", g);
  createHouseExterior(13, 8, 0xf5b7b1, 0x8e44ad, "house2", g);

  // Museum building (special)
  createMuseumExterior(0, -16, g);

  // Plaza + fountain
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.18, 28), mat(0xd5d8dc, 0.6));
  plaza.position.set(0, 0.09, 0); plaza.receiveShadow = true; g.add(plaza);
  const fBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.7, 16), mat(0xbdc3c7));
  fBase.position.y = 0.45; fBase.castShadow = true; g.add(fBase);
  const fTop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 12), mat(0x95a5a6));
  fTop.position.y = 1.0; g.add(fTop);
  waterFountain = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.85 })
  );
  waterFountain.position.y = 0.85; g.add(waterFountain);

  // Benches
  function bench(x, z, rot = 0) {
    const b = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.5), mat(0x8b5a2b));
    seat.position.y = 0.45; seat.castShadow = true; b.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 0.1), mat(0x8b5a2b));
    back.position.set(0, 0.75, -0.2); back.castShadow = true; b.add(back);
    [-0.7, 0.7].forEach(lx => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.4), mat(0x5d4037));
      leg.position.set(lx, 0.22, 0); b.add(leg);
    });
    b.position.set(x, 0, z); b.rotation.y = rot; g.add(b);
  }
  bench(-4.5, 4.5, Math.PI / 4); bench(4.5, 4.5, -Math.PI / 4);
  bench(-4.5, -4.5, 3 * Math.PI / 4); bench(4.5, -4.5, -3 * Math.PI / 4);
  bench(-8, 0, Math.PI / 2); bench(8, 0, -Math.PI / 2);

  // Cars
  function car(x, z, color, rot = 0) {
    const c = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 3.2), mat(color, 0.5, 0.15));
    body.position.y = 0.55; body.castShadow = true; c.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), mat(0xecf0f1, 0.4, 0.2));
    cabin.position.set(0, 1.05, -0.2); cabin.castShadow = true; c.add(cabin);
    [[-0.9, 0.9], [0.9, 0.9], [-0.9, -1.0], [0.9, -1.0]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10), mat(0x222222, 0.9));
      w.rotation.z = Math.PI / 2; w.position.set(wx, 0.28, wz); c.add(w);
    });
    c.position.set(x, 0, z); c.rotation.y = rot; g.add(c);
  }
  car(-8, -8, 0xe74c3c, Math.PI / 7); car(9, 10, 0x3498db, -Math.PI / 6);

  // Playground
  createSlide(6, -12, g);
  createSwing(-15, 15, g);

  // Lamps
  function lamp(x, z) {
    const l = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.0, 8), mat(0x2c3e50));
    pole.position.y = 1.5; pole.castShadow = true; l.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffeaa7 }));
    bulb.position.y = 3.15; l.add(bulb);
    const pl = new THREE.PointLight(0xffeaa7, 0.5, 10); pl.position.y = 3.15; l.add(pl);
    l.position.set(x, 0, z); g.add(l);
  }
  [[-5,-6],[5,-6],[-5,6],[5,6],[-5,0],[5,0],[-12,0],[12,0]].forEach(p => lamp(...p));

  // Flowers
  const fCols = [0xffd34e, 0xff6b6b, 0xff9ff3, 0x54a0ff, 0xfeca57];
  [[-8,15],[-7,16],[8,15],[9,16],[-16,-6],[16,-6],[-7,-16],[7,-16],[-3,19],[3,19],[-19,0],[19,0]].forEach((p, i) => {
    const fl = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 6), mat(0x27ae60));
    stem.position.y = 0.2; fl.add(stem);
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mat(fCols[i % fCols.length], 0.6));
    petal.position.y = 0.42; fl.add(petal);
    fl.position.set(p[0], 0, p[1]); g.add(fl);
  });

  // Border
  function border(x, z, w, d) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, 0.95, d), mat(0x2d6a4f, 0.8));
    o.position.set(x, 0.48, z); o.castShadow = true; g.add(o);
  }
  border(0, -22.5, 46, 0.7); border(0, 22.5, 46, 0.7);
  border(-22.5, 0, 0.7, 46); border(22.5, 0, 0.7, 46);

  // Clouds
  function cloud(x, y, z, s = 1) {
    const c = new THREE.Group();
    const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
    [[0,0,0],[1.2,0.15,0.3],[-1.1,0.1,-0.2],[0.4,0.35,-0.5],[-0.5,0.25,0.6]].forEach(([cx,cy,cz]) => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.4, 8, 8), cm);
      p.position.set(cx, cy, cz); c.add(p);
    });
    c.position.set(x, y, z); c.scale.setScalar(s); g.add(c); clouds.push(c);
  }
  cloud(-22, 16, -14, 1.5); cloud(18, 18, 10, 1.7); cloud(6, 17, -20, 1.4);
  cloud(-12, 19, 16, 1.6); cloud(24, 15, -6, 1.3); cloud(-6, 18, 8, 1.2);

  // Picnic blanket (romantic spot)
  const picnic = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), mat(0xe74c3c, 0.8));
  picnic.rotation.x = -Math.PI / 2; picnic.position.set(12, 0.02, -8); g.add(picnic);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), mat(0xd35400));
  basket.position.set(12.8, 0.3, -7.5); basket.castShadow = true; g.add(basket);
}

function createHouseExterior(x, z, color, roofColor, id, parent) {
  const house = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 4), mat(color, 0.7));
  body.position.y = 1.4; body.castShadow = true; body.receiveShadow = true; house.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.9, 4), mat(roofColor, 0.65));
  roof.rotation.y = Math.PI / 4; roof.position.y = 3.55; roof.castShadow = true; house.add(roof);
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), mat(0x5d4037));
  chim.position.set(1.1, 4.0, -0.8); chim.castShadow = true; house.add(chim);
  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.12), mat(0x4e342e));
  door.position.set(0, 0.8, 2.05); house.add(door);
  // Windows
  [-1.2, 1.2].forEach(wx => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.08), mat(0xecf0f1, 0.4));
    frame.position.set(wx, 1.6, 2.05); house.add(frame);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.06), mat(0x85c1e9, 0.2, 0.3));
    glass.position.set(wx, 1.6, 2.08); house.add(glass);
  });
  // Sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), mat(0xffffff));
  sign.position.set(0, 2.6, 2.08); house.add(sign);
  house.position.set(x, 0, z); parent.add(house);

  // Interact zone
  interactables.push({
    type: "house", id, label: "Masuk Rumah",
    pos: new THREE.Vector3(x, 0, z + 2.8), radius: 2.2,
    onEnter: () => enterLocation(id)
  });
}

function createMuseumExterior(x, z, parent) {
  const m = new THREE.Group();
  // Main body - elegant
  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 6), mat(0xecf0f1, 0.55, 0.1));
  body.position.y = 2.1; body.castShadow = true; body.receiveShadow = true; m.add(body);
  // Columns
  [-3.2, -1.1, 1.1, 3.2].forEach(cx => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.0, 10), mat(0xbdc3c7, 0.5, 0.2));
    col.position.set(cx, 2.0, 3.15); col.castShadow = true; m.add(col);
  });
  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.4, 6.6), mat(0x2c3e50));
  roof.position.y = 4.4; roof.castShadow = true; m.add(roof);
  // Pediment
  const ped = new THREE.Mesh(new THREE.ConeGeometry(4.5, 1.4, 3), mat(0x2c3e50));
  ped.rotation.y = Math.PI; ped.position.set(0, 5.3, 0); m.add(ped);
  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.15), mat(0x5d4037));
  door.position.set(0, 1.2, 3.1); m.add(door);
  // Golden sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xf1c40f }));
  sign.position.set(0, 3.6, 3.12); m.add(sign);
  // Label canvas
  const c = document.createElement("canvas"); c.width = 512; c.height = 96;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f1c40f"; ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = "#1a1a1a"; ctx.font = "bold 36px Arial"; ctx.textAlign = "center";
  ctx.fillText("MUSEUM CINTA ❤️", 256, 58);
  const st = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  st.position.set(0, 3.6, 3.13); m.add(st);

  m.position.set(x, 0, z); parent.add(m);

  interactables.push({
    type: "museum", id: "museum", label: "Masuk Museum (Password)",
    pos: new THREE.Vector3(x, 0, z + 4.2), radius: 2.8,
    onEnter: () => showPasswordModal()
  });
}

function createSlide(x, z, parent) {
  const s = new THREE.Group();
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 1.8), mat(0xf39c12));
  platform.position.y = 1.8; platform.castShadow = true; s.add(platform);
  [[-0.7,-0.7],[0.7,-0.7],[-0.7,0.7],[0.7,0.7]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 6), mat(0x7f8c8d));
    leg.position.set(lx, 0.9, lz); s.add(leg);
  });
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 3.2), mat(0xe67e22));
  ramp.position.set(0, 0.95, 2.2); ramp.rotation.x = -0.55; ramp.castShadow = true; s.add(ramp);
  [-0.55, 0.55].forEach(rx => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 3.0), mat(0xf1c40f));
    rail.position.set(rx, 1.15, 2.1); rail.rotation.x = -0.55; s.add(rail);
  });
  s.position.set(x, 0, z); parent.add(s);
}

function createSwing(x, z, parent) {
  const s = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.12), mat(0x7f8c8d));
  bar.position.y = 2.4; s.add(bar);
  [-1.3, 1.3].forEach(sx => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), mat(0x7f8c8d));
    post.position.set(sx, 1.2, 0); s.add(post);
  });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.35), mat(0xe74c3c));
  seat.position.y = 0.9; s.add(seat);
  [-0.3, 0.3].forEach(rx => {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5), mat(0xecf0f1));
    rope.position.set(rx, 1.65, 0); s.add(rope);
  });
  s.position.set(x, 0, z); parent.add(s);
}

// -------------------- HOUSE INTERIORS --------------------
function buildHouse1() {
  const g = house1Group;
  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(0xd7ccc8, 0.8));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; g.add(floor);
  // Walls
  const wallMat = mat(0xfff3e0, 0.85);
  [[0, 2, -5, 10, 4, 0.3], [0, 2, 5, 10, 4, 0.3], [-5, 2, 0, 0.3, 4, 10], [5, 2, 0, 0.3, 4, 10]].forEach(([x,y,z,w,h,d]) => {
    const wll = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wll.position.set(x, y, z); g.add(wll);
  });
  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(0xfafafa));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 4; g.add(ceil);
  // Soft light
  const pl = new THREE.PointLight(0xffe0b2, 1.1, 14); pl.position.set(0, 3.5, 0); g.add(pl);
  // Furniture - cozy
  // Sofa
  const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.2), mat(0xe57373));
  sofa.position.set(0, 0.4, -2.5); sofa.castShadow = true; g.add(sofa);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.3), mat(0xe57373));
  sofaBack.position.set(0, 0.9, -3.0); g.add(sofaBack);
  // Table
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.0), mat(0x8d6e63));
  table.position.set(0, 0.55, 0.5); g.add(table);
  [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]].forEach(([tx, tz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), mat(0x5d4037));
    leg.position.set(tx, 0.25, 0.5 + tz); g.add(leg);
  });
  // Carpet
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), mat(0xef9a9a, 0.9));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.02, 0); g.add(carpet);
  // Exit door marker
  const exit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.15), mat(0x5d4037));
  exit.position.set(0, 1.1, 4.9); g.add(exit);

  interactables.push({
    type: "exit", id: "exit-house1", label: "Keluar Rumah",
    pos: new THREE.Vector3(0, 0, 4.5), radius: 1.8, location: "house1",
    onEnter: () => enterLocation("outdoor")
  });
}

function buildHouse2() {
  const g = house2Group;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(0xe1bee7, 0.8));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; g.add(floor);
  const wallMat = mat(0xf3e5f5, 0.85);
  [[0, 2, -5, 10, 4, 0.3], [0, 2, 5, 10, 4, 0.3], [-5, 2, 0, 0.3, 4, 10], [5, 2, 0, 0.3, 4, 10]].forEach(([x,y,z,w,h,d]) => {
    const wll = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wll.position.set(x, y, z); g.add(wll);
  });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(0xfafafa));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 4; g.add(ceil);
  const pl = new THREE.PointLight(0xf8bbd0, 1.1, 14); pl.position.set(0, 3.5, 0); g.add(pl);
  // Bed
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 3.0), mat(0xce93d8));
  bed.position.set(-2, 0.35, -1); bed.castShadow = true; g.add(bed);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5), mat(0xffffff));
  pillow.position.set(-2, 0.7, -2.2); g.add(pillow);
  // Desk
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.8), mat(0x8d6e63));
  desk.position.set(2.5, 0.7, -2); g.add(desk);
  // Exit
  const exit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.15), mat(0x5d4037));
  exit.position.set(0, 1.1, 4.9); g.add(exit);

  interactables.push({
    type: "exit", id: "exit-house2", label: "Keluar Rumah",
    pos: new THREE.Vector3(0, 0, 4.5), radius: 1.8, location: "house2",
    onEnter: () => enterLocation("outdoor")
  });
}

// -------------------- MUSEUM INTERIOR (SPECIAL) --------------------
function buildMuseum() {
  const g = museumGroup;
  // Dark elegant floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), mat(0x263238, 0.6, 0.2));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; g.add(floor);
  // Walls
  const wallMat = mat(0x37474f, 0.7);
  [[0, 2.5, -7, 16, 5, 0.4], [0, 2.5, 7, 16, 5, 0.4], [-8, 2.5, 0, 0.4, 5, 14], [8, 2.5, 0, 0.4, 5, 14]].forEach(([x,y,z,w,h,d]) => {
    const wll = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wll.position.set(x, y, z); g.add(wll);
  });
  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), mat(0x1a237e));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 5; g.add(ceil);

  // Soft romantic lights
  const pl1 = new THREE.PointLight(0xff80ab, 0.9, 16); pl1.position.set(-4, 4, 0); g.add(pl1);
  const pl2 = new THREE.PointLight(0x80d8ff, 0.7, 14); pl2.position.set(4, 4, 0); g.add(pl2);
  const pl3 = new THREE.PointLight(0xffecb3, 1.0, 12); pl3.position.set(0, 4.2, -3); g.add(pl3);

  // === BIG PHOTO SCREEN (centerpiece) ===
  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.6, 0.25), mat(0xf1c40f, 0.4, 0.3));
  frame.position.set(0, 2.5, -6.6); g.add(frame);
  // Inner dark
  const inner = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.0, 0.2), mat(0x111111));
  inner.position.set(0, 2.5, -6.55); g.add(inner);

  // Photo plane with canvas texture (romantic placeholder)
  const photoCanvas = document.createElement("canvas");
  photoCanvas.width = 1024; photoCanvas.height = 640;
  const pctx = photoCanvas.getContext("2d");
  // Gradient background
  const grd = pctx.createLinearGradient(0, 0, 1024, 640);
  grd.addColorStop(0, "#ff9a9e");
  grd.addColorStop(0.5, "#fecfef");
  grd.addColorStop(1, "#a18cd1");
  pctx.fillStyle = grd;
  pctx.fillRect(0, 0, 1024, 640);
  // Decorative hearts
  pctx.fillStyle = "rgba(255,255,255,0.25)";
  for (let i = 0; i < 12; i++) {
    const hx = 80 + Math.random() * 860;
    const hy = 60 + Math.random() * 520;
    pctx.font = `${30 + Math.random() * 40}px Arial`;
    pctx.fillText("♥", hx, hy);
  }
  // Center text
  pctx.fillStyle = "#ffffff";
  pctx.font = "bold 64px Arial";
  pctx.textAlign = "center";
  pctx.shadowColor = "rgba(0,0,0,0.3)";
  pctx.shadowBlur = 12;
  pctx.fillText("Foto Pacar ❤️", 512, 280);
  pctx.font = "32px Arial";
  pctx.fillText("Tempat kenangan kita berdua", 512, 360);
  pctx.font = "24px Arial";
  pctx.fillStyle = "rgba(255,255,255,0.85)";
  pctx.fillText("(Ganti gambar ini dengan foto aslinya ya)", 512, 440);

  const photoTex = new THREE.CanvasTexture(photoCanvas);
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 3.9),
    new THREE.MeshBasicMaterial({ map: photoTex })
  );
  photo.position.set(0, 2.5, -6.45); g.add(photo);

  // Spot light on photo
  const spot = new THREE.SpotLight(0xffffff, 1.2, 20, Math.PI / 5, 0.4);
  spot.position.set(0, 4.5, -2);
  spot.target.position.set(0, 2.5, -6.5);
  g.add(spot); g.add(spot.target);

  // Side displays (smaller frames)
  function smallFrame(x, z, rotY, title) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.15), mat(0xf1c40f, 0.4, 0.2));
    f.position.set(x, 2.2, z); f.rotation.y = rotY; g.add(f);
    const c = document.createElement("canvas"); c.width = 512; c.height = 384;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#2c3e50"; ctx.fillRect(0, 0, 512, 384);
    ctx.fillStyle = "#ff80ab"; ctx.font = "bold 36px Arial"; ctx.textAlign = "center";
    ctx.fillText(title, 256, 180);
    ctx.font = "22px Arial"; ctx.fillStyle = "#ecf0f1";
    ctx.fillText("♥ kenangan ♥", 256, 230);
    const tex = new THREE.CanvasTexture(c);
    const pln = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ map: tex }));
    pln.position.set(x, 2.2, z + (rotY === 0 ? 0.1 : -0.1) * Math.cos(rotY));
    pln.rotation.y = rotY; g.add(pln);
  }
  smallFrame(-6.5, 0, Math.PI / 2, "First Date");
  smallFrame(6.5, 0, -Math.PI / 2, "Our Journey");

  // Center pedestal with heart
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.9, 16), mat(0xb0bec5, 0.5, 0.2));
  ped.position.set(0, 0.45, 0); ped.castShadow = true; g.add(ped);
  // Heart shape (approx with spheres)
  const heartMat = new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.3, metalness: 0.2, emissive: 0x660011, emissiveIntensity: 0.3 });
  const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), heartMat);
  h1.position.set(-0.25, 1.3, 0); g.add(h1);
  const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), heartMat);
  h2.position.set(0.25, 1.3, 0); g.add(h2);
  const h3 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 4), heartMat);
  h3.rotation.z = Math.PI; h3.position.set(0, 0.85, 0); g.add(h3);

  // Soft carpet path
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 10), mat(0xc62828, 0.85));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, 1); g.add(path);

  // Exit
  const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.2), mat(0x5d4037));
  exitDoor.position.set(0, 1.2, 6.8); g.add(exitDoor);

  interactables.push({
    type: "exit", id: "exit-museum", label: "Keluar Museum",
    pos: new THREE.Vector3(0, 0, 6.2), radius: 2.0, location: "museum",
    onEnter: () => enterLocation("outdoor")
  });
}

// -------------------- LOCATION SWITCH --------------------
function enterLocation(loc) {
  // Hide all
  outdoorGroup.visible = false;
  house1Group.visible = false;
  house2Group.visible = false;
  museumGroup.visible = false;

  if (loc === "outdoor") {
    outdoorGroup.visible = true;
    activeGroup = outdoorGroup;
    scene.background = new THREE.Color(0x5dade2);
    scene.fog = new THREE.Fog(0x5dade2, 35, 80);
    if (myData) { myData.x = 0; myData.z = 8; } // spawn near plaza after exit
    document.getElementById("locationBadge").textContent = "📍 Outdoor";
    document.getElementById("locationBadge").style.display = "block";
  } else if (loc === "house1") {
    house1Group.visible = true;
    activeGroup = house1Group;
    scene.background = new THREE.Color(0xfff3e0);
    scene.fog = null;
    if (myData) { myData.x = 0; myData.z = 3; myData.y = 0; }
    document.getElementById("locationBadge").textContent = "🏠 Rumah Hangout";
    document.getElementById("locationBadge").style.display = "block";
  } else if (loc === "house2") {
    house2Group.visible = true;
    activeGroup = house2Group;
    scene.background = new THREE.Color(0xf3e5f5);
    scene.fog = null;
    if (myData) { myData.x = 0; myData.z = 3; myData.y = 0; }
    document.getElementById("locationBadge").textContent = "🏠 Rumah Pink";
    document.getElementById("locationBadge").style.display = "block";
  } else if (loc === "museum") {
    museumGroup.visible = true;
    activeGroup = museumGroup;
    scene.background = new THREE.Color(0x1a237e);
    scene.fog = null;
    if (myData) { myData.x = 0; myData.z = 4; myData.y = 0; }
    document.getElementById("locationBadge").textContent = "🏛️ Museum Cinta";
    document.getElementById("locationBadge").style.display = "block";
  }
  currentLocation = loc;
  if (myMesh) myMesh.position.set(myData.x, myData.y || 0, myData.z);
  nearInteract = null;
  updateInteractUI();
}

// Password modal
function showPasswordModal() {
  document.getElementById("passModal").style.display = "flex";
  document.getElementById("passInput").value = "";
  document.getElementById("passInput").focus();
}
document.getElementById("passCancel").addEventListener("click", () => {
  document.getElementById("passModal").style.display = "none";
});
document.getElementById("passSubmit").addEventListener("click", tryPassword);
document.getElementById("passInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryPassword();
});
function tryPassword() {
  const val = document.getElementById("passInput").value.trim().toLowerCase();
  if (val === MUSEUM_PASSWORD.toLowerCase()) {
    document.getElementById("passModal").style.display = "none";
    enterLocation("museum");
  } else {
    document.getElementById("passInput").style.borderColor = "#ff1744";
    setTimeout(() => { document.getElementById("passInput").style.borderColor = "rgba(255,255,255,.25)"; }, 800);
  }
}

// -------------------- PLAYER MESH --------------------
function createLabel(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath(); ctx.roundRect(16, 28, 480, 72, 22); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.font = "bold 40px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(text).slice(0, 16), 256, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  s.scale.set(2.5, 0.62, 1); s.position.y = 3.2;
  return s;
}

function createChatBubble(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 160;
  const ctx = c.getContext("2d");
  // bubble
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath(); ctx.roundRect(20, 20, 472, 100, 24); ctx.fill();
  // tail
  ctx.beginPath(); ctx.moveTo(230, 120); ctx.lineTo(256, 145); ctx.lineTo(282, 120); ctx.fill();
  ctx.fillStyle = "#222";
  ctx.font = "bold 32px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  // wrap text simply
  const words = String(text).slice(0, 50).split(" ");
  let line = "", lines = [], y = 55;
  words.forEach(w => {
    const test = line + w + " ";
    if (ctx.measureText(test).width > 420 && line) { lines.push(line); line = w + " "; }
    else line = test;
  });
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l.trim(), 256, y + i * 36));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  s.scale.set(2.8, 0.9, 1); s.position.y = 4.0;
  return s;
}

function createPlayerMesh(player, isMe = false) {
  const g = new THREE.Group();
  const gender = player.gender || (isMe ? myGender : "boy");
  const c = player.color || (gender === "girl" ? "#ff80ab" : "#4fc3f7");

  // Shadow
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.5), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 }));
  body.position.y = 1.15; body.castShadow = true; body.name = "body"; g.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), mat(0xffdbac, 0.65));
  head.position.y = 2.05; head.castShadow = true; head.name = "head"; g.add(head);

  // Face
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), eyeMat);
  eyeL.position.set(-0.16, 2.12, 0.36); g.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), eyeMat);
  eyeR.position.set(0.16, 2.12, 0.36); g.add(eyeR);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0xc0392b }));
  mouth.position.set(0, 1.88, 0.36); g.add(mouth);

  // Hair - different for gender
  if (gender === "girl") {
    // Long pink-ish hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.9, 0.78), mat(0xf48fb1, 0.65));
    hair.position.y = 2.15; hair.castShadow = true; g.add(hair);
    // Bangs
    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.25, 0.3), mat(0xf48fb1, 0.65));
    bangs.position.set(0, 2.4, 0.28); g.add(bangs);
    // Side strands
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), mat(0xf48fb1, 0.65));
    left.position.set(-0.5, 1.7, 0.1); g.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), mat(0xf48fb1, 0.65));
    right.position.set(0.5, 1.7, 0.1); g.add(right);
  } else {
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.28, 0.76), mat(0x2c3e50, 0.7));
    hair.position.y = 2.42; hair.castShadow = true; g.add(hair);
  }

  // Arms
  const armMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 });
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.95, 0.28), armMat);
  armL.position.set(-0.58, 1.1, 0); armL.castShadow = true; armL.name = "armL"; g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.95, 0.28), armMat);
  armR.position.set(0.58, 1.1, 0); armR.castShadow = true; armR.name = "armR"; g.add(armR);

  // Legs
  const legColor = gender === "girl" ? 0xf8bbd0 : 0x2c3e50;
  const legMat = mat(legColor, 0.7);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.35), legMat);
  legL.position.set(-0.24, 0.42, 0); legL.castShadow = true; legL.name = "legL"; g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.35), legMat);
  legR.position.set(0.24, 0.42, 0); legR.castShadow = true; legR.name = "legR"; g.add(legR);

  // Name tag
  g.add(createLabel(isMe ? "YOU" : (player.name || "Player")));

  g.position.set(player.x || 0, player.y || 0, player.z || 0);
  g.userData = { walkPhase: 0, isMoving: false, bubble: null, bubbleTimer: 0 };
  scene.add(g);
  return g;
}

function animatePlayer(mesh, isMoving, dt) {
  if (!mesh) return;
  const ud = mesh.userData;
  if (isMoving) {
    ud.walkPhase += dt * 10;
    const swing = Math.sin(ud.walkPhase) * 0.45;
    const armL = mesh.getObjectByName("armL");
    const armR = mesh.getObjectByName("armR");
    const legL = mesh.getObjectByName("legL");
    const legR = mesh.getObjectByName("legR");
    if (armL) armL.rotation.x = swing;
    if (armR) armR.rotation.x = -swing;
    if (legL) legL.rotation.x = -swing * 0.9;
    if (legR) legR.rotation.x = swing * 0.9;
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
  // Bubble timeout
  if (ud.bubble) {
    ud.bubbleTimer -= dt;
    if (ud.bubbleTimer <= 0) {
      mesh.remove(ud.bubble);
      ud.bubble = null;
    }
  }
}

function showBubble(mesh, text) {
  if (!mesh) return;
  const ud = mesh.userData;
  if (ud.bubble) mesh.remove(ud.bubble);
  ud.bubble = createChatBubble(text);
  mesh.add(ud.bubble);
  ud.bubbleTimer = 5.5; // seconds
}

// -------------------- CAMERA --------------------
const target = new THREE.Vector3();
const camPos = new THREE.Vector3();
function updateCamera() {
  if (!myData) return;
  const yOff = myData.y || 0;
  target.set(myData.x, 1.5 + yOff, myData.z);
  camPos.set(myData.x, 6.0 + yOff * 0.3, myData.z + 7.2);
  camera.position.lerp(camPos, 0.12);
  camera.lookAt(target);
}

// -------------------- NETWORK --------------------
function setupNetwork() {
  const setStatus = t => document.getElementById("status").textContent = t;
  const updateCount = () => document.getElementById("playerCount").textContent = 1 + Object.keys(otherPlayers).length;

  if (!BACKEND_URL) { setStatus("Offline"); hideLoading(); return; }

  socket = io(BACKEND_URL, { transports: ["websocket", "polling"], auth: { telegramUser, name: myName, gender: myGender, color: myColor } });

  socket.on("connect", () => { setStatus("🟢 Online"); hideLoading(); });
  socket.on("disconnect", () => setStatus("🔴 Terputus"));
  socket.on("connect_error", e => { console.error(e); setStatus("🔴 Gagal terhubung"); hideLoading(); });

  socket.on("currentPlayers", players => {
    Object.entries(players).forEach(([id, p]) => {
      if (id === socket.id) {
        myData = { ...p, y: 0, name: myName, gender: myGender, color: myColor };
        if (myMesh) scene.remove(myMesh);
        myMesh = createPlayerMesh(myData, true);
      } else {
        if (otherPlayers[id]) scene.remove(otherPlayers[id]);
        otherPlayers[id] = createPlayerMesh(p);
      }
    });
    updateCount();
  });

  socket.on("newPlayer", p => {
    if (p.id === socket.id) return;
    if (otherPlayers[p.id]) scene.remove(otherPlayers[p.id]);
    otherPlayers[p.id] = createPlayerMesh(p);
    updateCount();
  });

  socket.on("playerMoved", d => {
    const m = otherPlayers[d.id];
    if (m) {
      m.position.x = d.x; m.position.z = d.z;
      if (d.y !== undefined) m.position.y = d.y;
      if (d.dx !== undefined && d.dz !== undefined) {
        const len = Math.hypot(d.dx, d.dz);
        if (len > 0.05) m.rotation.y = Math.atan2(d.dx, d.dz);
      }
      m.userData.isMoving = true;
    }
  });

  socket.on("playerDisconnected", id => {
    if (otherPlayers[id]) { scene.remove(otherPlayers[id]); delete otherPlayers[id]; updateCount(); }
  });

  // Chat relay (works if backend forwards "chat" events; otherwise local only)
  socket.on("chat", data => {
    if (data.id === socket.id) return;
    const m = otherPlayers[data.id];
    if (m) showBubble(m, data.text);
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
    const max = r.width / 2 - 30;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    js.x = dx / max; js.y = dy / max;
    stick.style.transform = `translate(${dx}px,${dy}px)`;
  }
  function resetStick() {
    js.x = 0; js.y = 0; js.active = false; pointerId = null;
    stick.style.transform = "translate(0,0)";
  }
  joystick.addEventListener("pointerdown", e => {
    e.preventDefault(); js.active = true; pointerId = e.pointerId;
    joystick.setPointerCapture(e.pointerId); moveStick(e.clientX, e.clientY);
  });
  joystick.addEventListener("pointermove", e => {
    if (js.active && e.pointerId === pointerId) { e.preventDefault(); moveStick(e.clientX, e.clientY); }
  });
  joystick.addEventListener("pointerup", e => { if (e.pointerId === pointerId) resetStick(); });
  joystick.addEventListener("pointercancel", resetStick);

  const keys = { up: false, down: false, left: false, right: false, jump: false };
  addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (e.key === "ArrowUp" || k === "w") keys.up = true;
    if (e.key === "ArrowDown" || k === "s") keys.down = true;
    if (e.key === "ArrowLeft" || k === "a") keys.left = true;
    if (e.key === "ArrowRight" || k === "d") keys.right = true;
    if (e.key === " " || k === "space") { e.preventDefault(); keys.jump = true; }
    if (k === "e" || e.key === "Enter") tryInteract();
  });
  addEventListener("keyup", e => {
    const k = e.key.toLowerCase();
    if (e.key === "ArrowUp" || k === "w") keys.up = false;
    if (e.key === "ArrowDown" || k === "s") keys.down = false;
    if (e.key === "ArrowLeft" || k === "a") keys.left = false;
    if (e.key === "ArrowRight" || k === "d") keys.right = false;
    if (e.key === " " || k === "space") keys.jump = false;
  });

  document.getElementById("jumpBtn").addEventListener("pointerdown", e => { e.preventDefault(); keys.jump = true; });
  document.getElementById("jumpBtn").addEventListener("pointerup", () => keys.jump = false);
  document.getElementById("interactBtn").addEventListener("pointerdown", e => { e.preventDefault(); tryInteract(); });

  // Chat UI
  const chatToggle = document.getElementById("chatToggle");
  const chatBar = document.getElementById("chatBar");
  const chatInput = document.getElementById("chatInput");
  chatToggle.addEventListener("click", () => {
    const show = chatBar.style.display !== "flex";
    chatBar.style.display = show ? "flex" : "none";
    if (show) chatInput.focus();
  });
  document.getElementById("chatSend").addEventListener("click", sendChat);
  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); sendChat(); }
  });

  function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    showBubble(myMesh, text);
    if (socket?.connected) socket.emit("chat", { text, name: myName });
    chatBar.style.display = "none";
  }

  // Movement loop data
  window._keys = keys;
  window._js = js;
  window._lastSend = 0;
}

function tryInteract() {
  if (nearInteract && nearInteract.onEnter) nearInteract.onEnter();
}

function updateInteractUI() {
  const btn = document.getElementById("interactBtn");
  const prompt = document.getElementById("prompt");
  if (nearInteract) {
    btn.style.display = "flex";
    prompt.style.display = "block";
    prompt.textContent = nearInteract.label || "Tekan 🚪";
  } else {
    btn.style.display = "none";
    prompt.style.display = "none";
  }
}

function updateMovement(dt) {
  if (!myData || !myMesh) return;
  const keys = window._keys;
  const js = window._js;

  let dx = 0, dz = 0;
  if (keys.left) dx--; if (keys.right) dx++;
  if (keys.up) dz--; if (keys.down) dz++;
  if (js.active) { dx = js.x; dz = js.y; }

  const moving = Math.abs(dx) > 0.08 || Math.abs(dz) > 0.08;
  if (moving) {
    const len = Math.hypot(dx, dz);
    if (len > 1) { dx /= len; dz /= len; }
    myData.x += dx * MOVE_SPEED * dt;
    myData.z += dz * MOVE_SPEED * dt;

    // Limits depend on location
    const lim = currentLocation === "outdoor" ? WORLD_LIMIT : (currentLocation === "museum" ? 6.5 : 4.2);
    myData.x = Math.max(-lim, Math.min(lim, myData.x));
    myData.z = Math.max(-lim, Math.min(lim, myData.z));
    myMesh.rotation.y = Math.atan2(dx, dz);
  }

  // Jump
  if (keys.jump && isGrounded) {
    myVelocityY = JUMP_FORCE; isGrounded = false; keys.jump = false;
  }
  myVelocityY -= GRAVITY * dt;
  myData.y = (myData.y || 0) + myVelocityY * dt;
  if (myData.y <= 0) { myData.y = 0; myVelocityY = 0; isGrounded = true; }

  myMesh.position.set(myData.x, myData.y, myData.z);
  animatePlayer(myMesh, moving, dt);

  // Interact check
  nearInteract = null;
  const myPos = new THREE.Vector3(myData.x, 0, myData.z);
  for (const it of interactables) {
    if (it.location && it.location !== currentLocation) continue;
    if (!it.location && currentLocation !== "outdoor") continue;
    if (myPos.distanceTo(it.pos) < it.radius) {
      nearInteract = it; break;
    }
  }
  updateInteractUI();

  // Network
  const now = performance.now();
  if (socket?.connected && now - window._lastSend > 45) {
    socket.emit("playerMovement", { x: myData.x, z: myData.z, y: myData.y, dx, dz, name: myName, gender: myGender, color: myColor });
    window._lastSend = now;
  }

  Object.values(otherPlayers).forEach(m => {
    if (m.userData.isMoving) { animatePlayer(m, true, dt); m.userData.isMoving = false; }
    else animatePlayer(m, false, dt);
  });
}

function hideLoading() {
  const l = document.getElementById("loading");
  l.classList.add("fade-out");
  setTimeout(() => l.style.display = "none", 500);
}

addEventListener("resize", () => {
  if (!camera) return;
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
  // Cloud drift
  clouds.forEach((c, i) => {
    c.position.x += Math.sin(performance.now() * 0.00015 + i) * 0.35 * dt;
    c.position.z += Math.cos(performance.now() * 0.00012 + i * 1.3) * 0.25 * dt;
  });
  if (water) water.rotation.z += dt * 0.03;
  if (waterFountain) waterFountain.rotation.y += dt * 0.4;
  renderer.render(scene, camera);
}
