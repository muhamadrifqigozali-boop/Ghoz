const BACKEND_URL = "https://ghoz-production.up.railway.app";
const WORLD_LIMIT = 14;
const MOVE_SPEED = 5.2;
const JUMP_FORCE = 7.5;
const GRAVITY = 22;

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor("#5dade2");
    tg.setBackgroundColor("#5dade2");
  } catch (e) {}
}
const telegramUser = tg?.initDataUnsafe?.user || {};
const myName = telegramUser.username
  ? "@" + telegramUser.username
  : [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ").trim() || "Player";
document.getElementById("playerName").textContent = myName;

// ============ SCENE SETUP ============
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5dade2);
scene.fog = new THREE.Fog(0x5dade2, 32, 72);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 120);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Lights - brighter Roblox-like
const hemi = new THREE.HemisphereLight(0xffffff, 0x6aab6a, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff5e0, 1.35);
sun.position.set(18, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -28;
sun.shadow.camera.right = 28;
sun.shadow.camera.top = 28;
sun.shadow.camera.bottom = -28;
sun.shadow.bias = -0.001;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xa0c8ff, 0.35);
fill.position.set(-12, 10, -8);
scene.add(fill);

// Helper materials
const mat = (color, roughness = 0.75, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

// ============ WORLD ============
// Ground
const terrain = new THREE.Mesh(
  new THREE.PlaneGeometry(36, 36),
  mat(0x5cb85c, 0.9)
);
terrain.rotation.x = -Math.PI / 2;
terrain.receiveShadow = true;
scene.add(terrain);

// Subtle grass patches
for (let i = 0; i < 18; i++) {
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(1.2 + Math.random() * 1.8, 10),
    mat(0x4cae4c, 0.95)
  );
  patch.rotation.x = -Math.PI / 2;
  patch.position.set((Math.random() - 0.5) * 28, 0.01, (Math.random() - 0.5) * 28);
  scene.add(patch);
}

// Roads
const roadMat = mat(0x6b6b6b, 0.85);
const road = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 32), roadMat);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.015;
scene.add(road);
const road2 = new THREE.Mesh(new THREE.PlaneGeometry(32, 5.2), roadMat);
road2.rotation.x = -Math.PI / 2;
road2.position.y = 0.016;
scene.add(road2);

// Road lines
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
for (let z = -14; z <= 14; z += 2.2) {
  const l = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.1), lineMat);
  l.rotation.x = -Math.PI / 2;
  l.position.set(0, 0.03, z);
  scene.add(l);
}
for (let x = -14; x <= 14; x += 2.2) {
  const l = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.22), lineMat);
  l.rotation.x = -Math.PI / 2;
  l.position.set(x, 0.031, 0);
  scene.add(l);
}

// Water / pond
const water = new THREE.Mesh(
  new THREE.CircleGeometry(4.2, 40),
  new THREE.MeshStandardMaterial({
    color: 0x3498db,
    roughness: 0.15,
    metalness: 0.25,
    transparent: true,
    opacity: 0.88
  })
);
water.rotation.x = -Math.PI / 2;
water.position.set(-9.5, 0.04, -8.5);
scene.add(water);
const ring = new THREE.Mesh(
  new THREE.RingGeometry(4.25, 4.55, 40),
  mat(0x85c1e9, 0.6)
);
ring.rotation.x = -Math.PI / 2;
ring.position.set(-9.5, 0.05, -8.5);
scene.add(ring);

// Trees - more Roblox style layered
function createTree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.1, 8), mat(0x8b5a2b, 0.85));
  trunk.position.y = 1.05;
  trunk.castShadow = true;
  g.add(trunk);

  const leaves = [
    { y: 2.6, r: 1.35, h: 2.0, c: 0x27ae60 },
    { y: 3.55, r: 1.05, h: 1.6, c: 0x2ecc71 },
    { y: 4.3, r: 0.7, h: 1.2, c: 0x58d68d }
  ];
  leaves.forEach((L) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(L.r, L.h, 8), mat(L.c, 0.8));
    cone.position.y = L.y;
    cone.castShadow = true;
    g.add(cone);
  });
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}
[
  [-12, -12, 1.05], [-13.2, -7.5, 0.95], [-11, 8.5, 1.15], [-13, 12, 0.9],
  [12, -12, 1.1], [13.2, -7.5, 0.95], [11, 8.5, 1], [13, 12, 0.95],
  [-7, 12.5, 0.85], [7.5, 12.5, 0.9], [-8.5, -12.5, 0.9], [8, -12.5, 0.85],
  [-12.5, 3.5, 0.8], [12.5, 3.5, 0.9], [-4, -13, 0.75], [4.5, -13, 0.8]
].forEach((t) => createTree(...t));

// Rocks
function createRock(x, z, s = 1) {
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), mat(0x7f8c8d, 0.7));
  r.position.set(x, 0.32 * s, z);
  r.scale.set(s * 1.25, s * 0.75, s * 1.1);
  r.rotation.y = Math.random() * Math.PI;
  r.castShadow = true;
  scene.add(r);
}
[[-6.5, 9.5, 0.75], [-8.2, 7.2, 0.55], [9.2, 8.5, 0.7], [10.5, 10.5, 0.5], [7.5, -9.5, 0.65], [-7.5, -9.2, 0.55]].forEach((r) => createRock(...r));

// Houses - more detailed
function createHouse(x, z, color, roofColor = 0xc0392b) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 3.2), mat(color, 0.7));
  body.position.y = 1.2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.7, 4), mat(roofColor, 0.65));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.05;
  roof.castShadow = true;
  g.add(roof);

  // Chimney
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 0.45), mat(0x5d4037));
  chim.position.set(0.9, 3.4, -0.6);
  chim.castShadow = true;
  g.add(chim);

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.35, 0.1), mat(0x4e342e));
  door.position.set(0, 0.68, 1.62);
  g.add(door);

  // Windows
  [-1.0, 1.0].forEach((wx) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.08), mat(0xecf0f1, 0.4));
    frame.position.set(wx, 1.35, 1.62);
    g.add(frame);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.06), mat(0x85c1e9, 0.2, 0.3));
    glass.position.set(wx, 1.35, 1.64);
    g.add(glass);
  });

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}
createHouse(-9.5, 6.5, 0xf5cba7, 0xc0392b);
createHouse(9.5, 6.5, 0xf5b7b1, 0x8e44ad);
createHouse(-9.5, -3.5, 0xd7bde2, 0x27ae60);
createHouse(9.5, -3.5, 0xa9dfbf, 0xe67e22);

// Street lamps
function createLamp(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.0, 8), mat(0x2c3e50));
  pole.position.y = 1.5;
  pole.castShadow = true;
  g.add(pole);
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffeaa7 })
  );
  light.position.y = 3.15;
  g.add(light);
  // Soft point light
  const pl = new THREE.PointLight(0xffeaa7, 0.55, 9);
  pl.position.y = 3.15;
  g.add(pl);
  g.position.set(x, 0, z);
  scene.add(g);
}
[[-4.2, -5.5], [4.2, -5.5], [-4.2, 5.5], [4.2, 5.5], [-4.2, 0], [4.2, 0]].forEach((p) => createLamp(...p));

// Flowers
function createFlower(x, z, color = 0xffd34e) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 6), mat(0x27ae60));
  stem.position.y = 0.2;
  g.add(stem);
  const petal = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mat(color, 0.6));
  petal.position.y = 0.42;
  g.add(petal);
  g.position.set(x, 0, z);
  scene.add(g);
}
const flowerColors = [0xffd34e, 0xff6b6b, 0xff9ff3, 0x54a0ff, 0xfeca57];
[
  [-6.2, 11.2], [-5.4, 11.8], [5.2, 11.3], [5.9, 11.7],
  [-11.5, -5.2], [11.5, -5.2], [-5.2, -11.5], [5.3, -11.4],
  [-2, 13], [2.5, 13], [-13, 0], [13, 0]
].forEach((p, i) => createFlower(p[0], p[1], flowerColors[i % flowerColors.length]));

// Border walls
function border(x, z, w, d) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), mat(0x2d6a4f, 0.8));
  o.position.set(x, 0.45, z);
  o.castShadow = true;
  o.receiveShadow = true;
  scene.add(o);
}
border(0, -16.2, 33, 0.6);
border(0, 16.2, 33, 0.6);
border(-16.2, 0, 0.6, 33);
border(16.2, 0, 0.6, 33);

// ============ EXTRA ROBLOX-LIKE PROPS ============
// Central plaza / fountain base
const plaza = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.18, 24), mat(0xd5d8dc, 0.6));
plaza.position.set(0, 0.09, 0);
plaza.receiveShadow = true;
scene.add(plaza);
const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.7, 16), mat(0xbdc3c7));
fountainBase.position.y = 0.45;
fountainBase.castShadow = true;
scene.add(fountainBase);
const fountainTop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 12), mat(0x95a5a6));
fountainTop.position.y = 1.0;
scene.add(fountainTop);
const waterFountain = new THREE.Mesh(
  new THREE.CylinderGeometry(1.25, 1.25, 0.12, 20),
  new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.85 })
);
waterFountain.position.y = 0.85;
scene.add(waterFountain);

// Benches
function createBench(x, z, rot = 0) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), mat(0x8b5a2b));
  seat.position.y = 0.45;
  seat.castShadow = true;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.1), mat(0x8b5a2b));
  back.position.set(0, 0.75, -0.2);
  back.castShadow = true;
  g.add(back);
  [-0.65, 0.65].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.4), mat(0x5d4037));
    leg.position.set(lx, 0.22, 0);
    g.add(leg);
  });
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
}
createBench(-3.5, 3.5, Math.PI / 4);
createBench(3.5, 3.5, -Math.PI / 4);
createBench(-3.5, -3.5, (3 * Math.PI) / 4);
createBench(3.5, -3.5, (-3 * Math.PI) / 4);

// Simple cars (static props)
function createCar(x, z, color, rot = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 3.2), mat(color, 0.5, 0.15));
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), mat(0xecf0f1, 0.4, 0.2));
  cabin.position.set(0, 1.05, -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  // Wheels
  const wheelMat = mat(0x222222, 0.9);
  [[-0.9, 0.9], [0.9, 0.9], [-0.9, -1.0], [0.9, -1.0]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.28, wz);
    g.add(w);
  });
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  scene.add(g);
}
createCar(-6, -6.5, 0xe74c3c, Math.PI / 6);
createCar(6.5, 7, 0x3498db, -Math.PI / 5);

// Playground slide
function createSlide(x, z) {
  const g = new THREE.Group();
  // Platform
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 1.8), mat(0xf39c12));
  platform.position.y = 1.8;
  platform.castShadow = true;
  g.add(platform);
  // Legs
  [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.8, 6), mat(0x7f8c8d));
    leg.position.set(lx, 0.9, lz);
    g.add(leg);
  });
  // Slide ramp
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 3.2), mat(0xe67e22));
  ramp.position.set(0, 0.95, 2.2);
  ramp.rotation.x = -0.55;
  ramp.castShadow = true;
  g.add(ramp);
  // Rails
  [-0.55, 0.55].forEach((rx) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 3.0), mat(0xf1c40f));
    rail.position.set(rx, 1.15, 2.1);
    rail.rotation.x = -0.55;
    g.add(rail);
  });
  g.position.set(x, 0, z);
  scene.add(g);
}
createSlide(0, -9.5);

// Simple swing frame
function createSwing(x, z) {
  const g = new THREE.Group();
  // Frame
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.12), mat(0x7f8c8d));
  bar.position.y = 2.4;
  g.add(bar);
  [-1.3, 1.3].forEach((sx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), mat(0x7f8c8d));
    post.position.set(sx, 1.2, 0);
    g.add(post);
  });
  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.35), mat(0xe74c3c));
  seat.position.y = 0.9;
  g.add(seat);
  // Ropes
  [-0.3, 0.3].forEach((rx) => {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5), mat(0xecf0f1));
    rope.position.set(rx, 1.65, 0);
    g.add(rope);
  });
  g.position.set(x, 0, z);
  scene.add(g);
}
createSwing(-11, 10.5);

// Clouds (simple soft spheres)
function createCloud(x, y, z, s = 1) {
  const g = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
  [[0, 0, 0], [1.2, 0.15, 0.3], [-1.1, 0.1, -0.2], [0.4, 0.35, -0.5], [-0.5, 0.25, 0.6]].forEach(([cx, cy, cz]) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.4, 8, 8), cloudMat);
    p.position.set(cx, cy, cz);
    g.add(p);
  });
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}
const clouds = [
  createCloud(-18, 14, -12, 1.4),
  createCloud(15, 16, 8, 1.6),
  createCloud(5, 15, -18, 1.3),
  createCloud(-10, 17, 14, 1.5),
  createCloud(20, 13, -5, 1.2)
];

// ============ PLAYER ============
const otherPlayers = {};
let myData = null;
let myMesh = null;
let myVelocityY = 0;
let isGrounded = true;

function createLabel(text) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  // Roblox-style rounded badge
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(16, 28, 480, 72, 22);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = "bold 40px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(text).slice(0, 18), 256, 64);
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })
  );
  s.scale.set(2.6, 0.65, 1);
  s.position.y = 3.15;
  return s;
}

function createPlayerMesh(player, isMe = false) {
  const g = new THREE.Group();
  const c = player.color || "#4fc3f7";

  // Shadow
  const sh = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  g.add(sh);

  // Body (torso) - blocky Roblox style
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.05, 0.5),
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 })
  );
  body.position.y = 1.15;
  body.castShadow = true;
  body.name = "body";
  g.add(body);

  // Head - bigger, more toy-like
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.72, 0.72),
    mat(0xffdbac, 0.65)
  );
  head.position.y = 2.05;
  head.castShadow = true;
  head.name = "head";
  g.add(head);

  // Simple face (eyes + smile)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), eyeMat);
  eyeL.position.set(-0.16, 2.12, 0.36);
  g.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), eyeMat);
  eyeR.position.set(0.16, 2.12, 0.36);
  g.add(eyeR);
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.06, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xc0392b })
  );
  mouth.position.set(0, 1.88, 0.36);
  g.add(mouth);

  // Hair / top
  const hair = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.28, 0.76),
    mat(0x2c3e50, 0.7)
  );
  hair.position.y = 2.42;
  hair.castShadow = true;
  g.add(hair);

  // Arms
  const armMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 });
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.95, 0.28), armMat);
  armL.position.set(-0.58, 1.1, 0);
  armL.castShadow = true;
  armL.name = "armL";
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.95, 0.28), armMat);
  armR.position.set(0.58, 1.1, 0);
  armR.castShadow = true;
  armR.name = "armR";
  g.add(armR);

  // Legs
  const legMat = mat(0x2c3e50, 0.7);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.35), legMat);
  legL.position.set(-0.24, 0.42, 0);
  legL.castShadow = true;
  legL.name = "legL";
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.35), legMat);
  legR.position.set(0.24, 0.42, 0);
  legR.castShadow = true;
  legR.name = "legR";
  g.add(legR);

  // Name tag
  g.add(createLabel(isMe ? "YOU" : player.name || "Player"));

  g.position.set(player.x || 0, 0, player.z || 0);
  g.userData = { walkPhase: 0, isMoving: false };
  scene.add(g);
  return g;
}

// Simple walk animation
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
    // slight bob
    const body = mesh.getObjectByName("body");
    if (body) body.position.y = 1.15 + Math.abs(Math.sin(ud.walkPhase * 2)) * 0.04;
  } else {
    // reset to idle
    ["armL", "armR", "legL", "legR"].forEach((n) => {
      const o = mesh.getObjectByName(n);
      if (o) o.rotation.x *= 0.85;
    });
    const body = mesh.getObjectByName("body");
    if (body) body.position.y = 1.15;
  }
}

// Camera
const target = new THREE.Vector3();
const camPos = new THREE.Vector3();
function updateCamera() {
  if (!myData) return;
  const yOffset = myData.y || 0;
  target.set(myData.x, 1.4 + yOffset, myData.z);
  camPos.set(myData.x, 6.2 + yOffset * 0.3, myData.z + 7.5);
  camera.position.lerp(camPos, 0.12);
  camera.lookAt(target);
}

// ============ NETWORK ============
let socket = null;
const setStatus = (t) => (document.getElementById("status").textContent = t);
const updateCount = () =>
  (document.getElementById("playerCount").textContent = 1 + Object.keys(otherPlayers).length);

if (BACKEND_URL) {
  socket = io(BACKEND_URL, {
    transports: ["websocket", "polling"],
    auth: { telegramUser }
  });
  socket.on("connect", () => {
    setStatus("🟢 Online");
    hideLoading();
  });
  socket.on("disconnect", () => setStatus("🔴 Terputus"));
  socket.on("connect_error", (e) => {
    console.error(e);
    setStatus("🔴 Gagal terhubung");
    hideLoading();
  });
  socket.on("currentPlayers", (players) => {
    Object.entries(players).forEach(([id, p]) => {
      if (id === socket.id) {
        myData = { ...p, y: 0 };
        if (myMesh) scene.remove(myMesh);
        myMesh = createPlayerMesh(myData, true);
      } else {
        if (otherPlayers[id]) scene.remove(otherPlayers[id]);
        otherPlayers[id] = createPlayerMesh(p);
      }
    });
    updateCount();
  });
  socket.on("newPlayer", (p) => {
    if (p.id === socket.id) return;
    if (otherPlayers[p.id]) scene.remove(otherPlayers[p.id]);
    otherPlayers[p.id] = createPlayerMesh(p);
    updateCount();
  });
  socket.on("playerMoved", (d) => {
    const m = otherPlayers[d.id];
    if (m) {
      m.position.x = d.x;
      m.position.z = d.z;
      if (d.y !== undefined) m.position.y = d.y;
      // face direction if available
      if (d.dx !== undefined && d.dz !== undefined) {
        const len = Math.hypot(d.dx, d.dz);
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
}

// ============ CONTROLS ============
const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");
const js = { x: 0, y: 0, active: false };
let pointerId = null;

function moveStick(cx, cy) {
  const r = joystick.getBoundingClientRect();
  const mx = r.left + r.width / 2;
  const my = r.top + r.height / 2;
  let dx = cx - mx;
  let dy = cy - my;
  const max = r.width / 2 - 34;
  const d = Math.hypot(dx, dy);
  if (d > max) {
    dx = (dx / d) * max;
    dy = (dy / d) * max;
  }
  js.x = dx / max;
  js.y = dy / max;
  stick.style.transform = `translate(${dx}px,${dy}px)`;
}
function resetStick() {
  js.x = 0;
  js.y = 0;
  js.active = false;
  pointerId = null;
  stick.style.transform = "translate(0,0)";
}
joystick.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  js.active = true;
  pointerId = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  moveStick(e.clientX, e.clientY);
});
joystick.addEventListener("pointermove", (e) => {
  if (js.active && e.pointerId === pointerId) {
    e.preventDefault();
    moveStick(e.clientX, e.clientY);
  }
});
joystick.addEventListener("pointerup", (e) => {
  if (e.pointerId === pointerId) resetStick();
});
joystick.addEventListener("pointercancel", resetStick);

const keys = { up: false, down: false, left: false, right: false, jump: false };
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (e.key === "ArrowUp" || k === "w") keys.up = true;
  if (e.key === "ArrowDown" || k === "s") keys.down = true;
  if (e.key === "ArrowLeft" || k === "a") keys.left = true;
  if (e.key === "ArrowRight" || k === "d") keys.right = true;
  if (e.key === " " || k === "space") {
    e.preventDefault();
    keys.jump = true;
  }
});
addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (e.key === "ArrowUp" || k === "w") keys.up = false;
  if (e.key === "ArrowDown" || k === "s") keys.down = false;
  if (e.key === "ArrowLeft" || k === "a") keys.left = false;
  if (e.key === "ArrowRight" || k === "d") keys.right = false;
  if (e.key === " " || k === "space") keys.jump = false;
});

// Jump button
const jumpBtn = document.getElementById("jumpBtn");
jumpBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  keys.jump = true;
});
jumpBtn.addEventListener("pointerup", () => (keys.jump = false));
jumpBtn.addEventListener("pointercancel", () => (keys.jump = false));

let lastSend = 0;
function updateMovement(dt) {
  if (!myData || !myMesh) return;

  let dx = 0,
    dz = 0;
  if (keys.left) dx--;
  if (keys.right) dx++;
  if (keys.up) dz--;
  if (keys.down) dz++;
  if (js.active) {
    dx = js.x;
    dz = js.y;
  }

  const moving = Math.abs(dx) > 0.08 || Math.abs(dz) > 0.08;
  if (moving) {
    const len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }
    myData.x += dx * MOVE_SPEED * dt;
    myData.z += dz * MOVE_SPEED * dt;
    myData.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, myData.x));
    myData.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, myData.z));
    myMesh.rotation.y = Math.atan2(dx, dz);
  }

  // Jump + gravity
  if (keys.jump && isGrounded) {
    myVelocityY = JUMP_FORCE;
    isGrounded = false;
    keys.jump = false; // one-shot
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

  // Send to server
  const now = performance.now();
  if (socket?.connected && now - lastSend > 45) {
    socket.emit("playerMovement", {
      x: myData.x,
      z: myData.z,
      y: myData.y,
      dx,
      dz
    });
    lastSend = now;
  }

  // Other players walk anim
  Object.values(otherPlayers).forEach((m) => {
    if (m.userData.isMoving) {
      animatePlayer(m, true, dt);
      m.userData.isMoving = false; // will be set true again on next packet
    } else {
      animatePlayer(m, false, dt);
    }
  });
}

function hideLoading() {
  const l = document.getElementById("loading");
  l.classList.add("fade-out");
  setTimeout(() => (l.style.display = "none"), 500);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Clouds slow drift
function updateClouds(dt) {
  clouds.forEach((c, i) => {
    c.position.x += Math.sin(performance.now() * 0.00015 + i) * 0.4 * dt;
    c.position.z += Math.cos(performance.now() * 0.00012 + i * 1.3) * 0.3 * dt;
  });
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  updateMovement(dt);
  updateCamera();
  updateClouds(dt);
  water.rotation.z += dt * 0.03;
  waterFountain.rotation.y += dt * 0.4;
  renderer.render(scene, camera);
}
animate();
