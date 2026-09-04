# Telegram 3D Multiplayer

Struktur:
- backend-3d: Node.js + Express + Socket.IO
- frontend-3d: Three.js + Telegram Mini App

## 1. Jalankan backend

Masuk ke folder backend:

npm install
npm start

Server default:
http://localhost:3000

## 2. Deploy backend

Deploy folder `backend-3d` ke Railway, Koyeb, VPS, atau host Node.js lain.

Pastikan server mendapatkan public HTTPS URL.

Contoh:
https://nama-backend.example.com

## 3. Hubungkan frontend

Buka:

frontend-3d/app.js

Cari:

const BACKEND_URL = "GANTI_DENGAN_URL_BACKEND";

Ganti dengan URL backend kamu.

Contoh:

const BACKEND_URL = "https://nama-backend.example.com";

## 4. Deploy frontend

Upload folder `frontend-3d` ke Vercel sebagai static site.

Hasilnya misalnya:

https://dunia-3d-kamu.vercel.app

## 5. Pasang sebagai Telegram Mini App

Di @BotFather:
- pilih bot
- buat/configure Mini App
- masukkan URL HTTPS Vercel
- pasang menu button / Mini App sesuai konfigurasi BotFather

## Catatan penting

Versi ini menggunakan data Telegram yang tersedia di `initDataUnsafe.user` hanya untuk nama tampilan.
Untuk sistem produksi yang membutuhkan identitas Telegram yang benar-benar terverifikasi, backend harus memvalidasi `Telegram.WebApp.initData` menggunakan bot token di server.

Backend menyimpan pemain di RAM. Jika server restart, semua posisi hilang. Ini cocok untuk prototype multiplayer sederhana.
