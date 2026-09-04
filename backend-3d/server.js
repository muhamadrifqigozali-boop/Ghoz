const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors({ origin: true }));
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Telegram 3D Multiplayer Backend" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

const players = new Map();

const WORLD_LIMIT = 14;
const MAX_STEP = 1.25;

function randomColor() {
  const colors = [
    0xff5c7a, 0x5c8dff, 0x5ce1a6, 0xffc857,
    0xb36bff, 0x35c2d8, 0xff8a3d, 0xf2f2f2,
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeText(value, fallback = "Player") {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().replace(/\s+/g, " ");
  return clean.slice(0, 24) || fallback;
}

function publicPlayer(player) {
  return {
    id: player.id,
    x: player.x,
    z: player.z,
    color: player.color,
    name: player.name,
  };
}

io.on("connection", (socket) => {
  const tgUser = socket.handshake.auth?.telegramUser || {};

  const firstName = sanitizeText(tgUser.first_name, "Player");
  const lastName = sanitizeText(tgUser.last_name, "");
  const username = sanitizeText(
    tgUser.username ? `@${tgUser.username}` : "",
    ""
  );

  const displayName =
    username ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "Player";

  const player = {
    id: socket.id,
    x: 0,
    z: 0,
    color: randomColor(),
    name: displayName,
  };

  players.set(socket.id, player);

  console.log(`Player masuk: ${player.name} (${socket.id})`);

  socket.emit(
    "currentPlayers",
    Object.fromEntries(
      [...players.entries()].map(([id, p]) => [id, publicPlayer(p)])
    )
  );

  socket.broadcast.emit("newPlayer", publicPlayer(player));

  socket.on("playerMovement", (movementData) => {
    const current = players.get(socket.id);
    if (!current || !movementData) return;

    const nextX = Number(movementData.x);
    const nextZ = Number(movementData.z);

    if (!Number.isFinite(nextX) || !Number.isFinite(nextZ)) return;

    const dx = nextX - current.x;
    const dz = nextZ - current.z;
    const distance = Math.hypot(dx, dz);

    // Tolak lompatan posisi yang tidak masuk akal.
    if (distance > MAX_STEP) return;

    current.x = clamp(nextX, -WORLD_LIMIT, WORLD_LIMIT);
    current.z = clamp(nextZ, -WORLD_LIMIT, WORLD_LIMIT);

    socket.broadcast.emit("playerMoved", {
      id: socket.id,
      x: current.x,
      z: current.z,
    });
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
    console.log(`Player keluar: ${player.name} (${socket.id})`);
    io.emit("playerDisconnected", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server multiplayer aktif di port ${PORT}`);
});
