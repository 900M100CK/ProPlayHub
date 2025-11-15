// src/index.js
import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

import connectDB from "./libs/db.js";
import authRoutes from "./routes/authRoutes.js";
import Message from "./models/Message.js";

//home page package routes
import packageRoutes from "./routes/packageRoutes.js"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== PATH CHUẨN ĐỂ SERVE /public =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// Serve static cho staff.html (đặt staff.html trong src/public)
app.use(express.static(path.join(__dirname, "public")));

// Routes auth
app.use("/api/auth", authRoutes);

// Routes package
app.use("/api/packages", packageRoutes);


// Test route
app.get("/", (req, res) => {
  res.json({ status: "Live chat server running 🚀" });
});


// =====================================================
//  API: LẤY DANH SÁCH ROOM (GROUP THEO roomId = userId)
// =====================================================
app.get("/api/chat/rooms", async (req, res) => {
  try {
    // lấy tất cả message, mới -> cũ
    const msgs = await Message.find().sort({ createdAt: -1 }).lean();

    // map roomId -> message mới nhất
    const map = new Map();
    for (const m of msgs) {
      if (!map.has(m.roomId)) {
        map.set(m.roomId, m);
      }
    }

    const rooms = Array.from(map.values()).map((m) => ({
      roomId: m.roomId,
      lastMessageAt: m.createdAt,
      lastMessageText: m.text,
      lastUserId: m.userId,
      lastUsername: m.username,
    }));

    res.json(rooms);
  } catch (err) {
    console.error("❌ /api/chat/rooms error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================================================
//  API: XOÁ CẢ ROOM (XOÁ TẤT CẢ MSG CÓ roomId ĐÓ)
// =====================================================
app.delete("/api/chat/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ error: "Missing roomId" });
    }

    const result = await Message.deleteMany({ roomId: String(roomId) });
    console.log("🗑 Deleted room", roomId, "count =", result.deletedCount);

    // (Optional) bắn event cho các client đang trong room đó nếu muốn
    // io.to(roomId).emit("chat:roomDeleted", { roomId });

    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("❌ DELETE /api/chat/rooms error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// =====================================================
// SOCKET.IO
// =====================================================
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  // JOIN ROOM – mỗi user là 1 room (roomId = userId)
  socket.on("join", async ({ roomId, userId, username }) => {
    try {
      const rid = String(roomId || userId || "");
      if (!rid) return;

      socket.join(rid);
      console.log(`👤 ${username || userId} joined room: ${rid}`);

      // Lấy lịch sử tin nhắn của room đó
      const history = await Message.find({ roomId: rid })
        .sort({ createdAt: 1 })
        .limit(200)
        .lean();

      socket.emit(
        "chat:history",
        history.map((m) => ({
          id: m._id.toString(),
          roomId: m.roomId,
          text: m.text,
          userId: m.userId,
          username: m.username,
          createdAt: m.createdAt,
        }))
      );
    } catch (err) {
      console.error("❌ join error:", err);
    }
  });

  // NHẬN TIN NHẮN TỪ APP / STAFF
  socket.on("chat:message", async (payload, callback) => {
    try {
      const { roomId, text, userId, username } = payload || {};
      const rid = String(roomId || userId || "");

      if (!rid || !text || !userId) {
        callback && callback({ ok: false, error: "Missing fields" });
        return;
      }

      const msg = await Message.create({
        roomId: rid,
        text,
        userId: String(userId),
        username,
      });

      const msgData = {
        id: msg._id.toString(),
        roomId: msg.roomId,
        text: msg.text,
        userId: msg.userId,
        username: msg.username,
        createdAt: msg.createdAt,
      };

      // gửi cho tất cả client trong room (app + staff)
      io.to(rid).emit("chat:message", msgData);

      callback && callback({ ok: true });
    } catch (err) {
      console.error("❌ chat:message error:", err);
      callback && callback({ ok: false, error: err.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

// =====================================================
// START SERVER + DB
// =====================================================
connectDB()
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`🧑‍💼 Staff UI: http://localhost:${PORT}/staff.html`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });


// app.use("/api/auth", authRoutes);
app.use("/api/packages", packageRoutes);
