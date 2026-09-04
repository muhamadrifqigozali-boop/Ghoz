// ===============================
// KONFIGURASI
// ===============================

// GANTI dengan URL backend hasil deploy.
// Contoh: https://nama-backend.up.railway.app
const BACKEND_URL = "ghoz-production.up.railway.app";

const WORLD_LIMIT = 14;
const MOVE_SPEED = 4.0; // unit per detik

// ===============================
// TELEGRAM MINI APP
// ===============================

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#111118");
  tg.setBackgroundColor("#111118");
}

const telegramUser = tg?.initDataUnsafe?.user || {};

function getDisplayName(user) {
  if (user.username) return "@" + user.username;

  const name = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Player";
}

document.getElementById("playerName").textContent =
  getDisplayName(telegramUser);

// ===============================
// THREE.JS
// ===============================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111118);
scene.fog = new THREE.Fog(0x111118, 18, 45);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lampu
scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.2));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
directionalLight.position.set(8, 15, 8);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Lantai
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({
    color: 0x292934,
    roughness: 0.9
  })
);

floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Grid
const grid = new THREE.GridHelper(30, 30, 0x555566, 0x33333d);
grid.position.y = 0.01;
scene.add(grid);

// Batas dunia
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x3c3c4a });

function addWall(x, z, width, depth) {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1.5, depth),
    wallMaterial
  );
  wall.position.set(x, 0.75, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

addWall(0, -15, 30, 0.5);
addWall(0, 15, 30, 0.5);
addWall(-15, 0, 0.5, 30);
addWall(15, 0, 0.5, 30);

// ===============================
// PLAYER
// ===============================

const otherPlayers = {};
let myData = null;
let myMesh = null;

function createLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "rgba(0,0,0,.65)";
  ctx.fillRect(20, 25, 472, 78);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(text.slice(0, 22), 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.8, 0.7, 1);
  sprite.position.y = 1.45;

  return sprite;
}

function createPlayerMesh(player, isMe = false) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1, 0.9),
    new THREE.MeshStandardMaterial({
      color: player.color,
      roughness: 0.65
    })
  );

  body.position.y = 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const label = createLabel(isMe ? "YOU" : player.name || "Player");
  group.add(label);

  group.position.set(player.x, 0, player.z);
  scene.add(group);

  return group;
}

function updateCamera() {
  if (!myData) return;

  // Kamera third-person dari belakang karakter.
  const targetX = myData.x;
  const targetZ = myData.z;

  camera.position.lerp(
    new THREE.Vector3(targetX, 4.8, targetZ + 6.5),
    0.15
  );

  camera.lookAt(targetX, 0.7, targetZ);
}

// ===============================
// SOCKET.IO
// ===============================

let socket = null;

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

if (
  !BACKEND_URL ||
  BACKEND_URL === "GANTI_DENGAN_URL_BACKEND"
) {
  setStatus("ERROR: URL backend belum diisi");
} else {
  socket = io(BACKEND_URL, {
    transports: ["websocket", "polling"],
    auth: {
      telegramUser: telegramUser
    }
  });

  socket.on("connect", () => {
    setStatus("🟢 Online");
  });

  socket.on("disconnect", () => {
    setStatus("🔴 Terputus");
  });

  socket.on("connect_error", (error) => {
    console.error(error);
    setStatus("🔴 Gagal terhubung");
  });

  socket.on("currentPlayers", (players) => {
    Object.entries(players).forEach(([id, player]) => {
      if (id === socket.id) {
        myData = { ...player };

        if (myMesh) scene.remove(myMesh);
        myMesh = createPlayerMesh(myData, true);

        updateCamera();
      } else {
        if (otherPlayers[id]) {
          scene.remove(otherPlayers[id]);
        }

        otherPlayers[id] = createPlayerMesh(player);
      }
    });
  });

  socket.on("newPlayer", (player) => {
    if (player.id === socket.id) return;

    if (otherPlayers[player.id]) {
      scene.remove(otherPlayers[player.id]);
    }

    otherPlayers[player.id] = createPlayerMesh(player);
  });

  socket.on("playerMoved", (data) => {
    const mesh = otherPlayers[data.id];
    if (!mesh) return;

    mesh.position.x = data.x;
    mesh.position.z = data.z;
  });

  socket.on("playerDisconnected", (id) => {
    if (!otherPlayers[id]) return;

    scene.remove(otherPlayers[id]);
    delete otherPlayers[id];
  });
}

// ===============================
// KONTROL
// ===============================

const keys = {
  up: false,
  down: false,
  left: false,
  right: false
};

function setButtonState(name, value) {
  keys[name] = value;
  document.getElementById(name).classList.toggle("active", value);
}

function bindButton(id, keyName) {
  const button = document.getElementById(id);

  const start = (event) => {
    event.preventDefault();
    setButtonState(keyName, true);
  };

  const end = (event) => {
    event.preventDefault();
    setButtonState(keyName, false);
  };

  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", end);
  button.addEventListener("pointercancel", end);
  button.addEventListener("pointerleave", end);
}

bindButton("up", "up");
bindButton("down", "down");
bindButton("left", "left");
bindButton("right", "right");

// Keyboard untuk testing desktop.
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") keys.up = true;
  if (e.key === "ArrowDown" || e.key === "s") keys.down = true;
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp" || e.key === "w") keys.up = false;
  if (e.key === "ArrowDown" || e.key === "s") keys.down = false;
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
});

function updateMovement(delta) {
  if (!myData || !myMesh) return;

  let dx = 0;
  let dz = 0;

  if (keys.up) dz -= 1;
  if (keys.down) dz += 1;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;

  if (dx === 0 && dz === 0) return;

  const length = Math.hypot(dx, dz);
  dx /= length;
  dz /= length;

  myData.x += dx * MOVE_SPEED * delta;
  myData.z += dz * MOVE_SPEED * delta;

  myData.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, myData.x));
  myData.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, myData.z));

  myMesh.position.set(myData.x, 0, myData.z);

  // Hadap ke arah gerakan.
  myMesh.rotation.y = Math.atan2(dx, dz);

  if (socket?.connected) {
    socket.emit("playerMovement", {
      x: myData.x,
      z: myData.z
    });
  }
}

// ===============================
// RESIZE + GAME LOOP
// ===============================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  updateMovement(delta);
  updateCamera();

  renderer.render(scene, camera);
}

animate();
