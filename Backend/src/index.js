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
import packageRoutes from "./routes/packageRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import discountRoutes from "./routes/discountRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Live chat server running" });
});

// =====================================================
//  API: List chat rooms (grouped by roomId = userId)
// =====================================================
app.get("/api/chat/rooms", async (req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: -1 }).lean();

    // Build per-room summary: last message + display name of user
    const roomInfo = new Map();
    for (const m of msgs) {
      const rid = String(m.roomId);
      const existing = roomInfo.get(rid);
      if (!existing) {
        roomInfo.set(rid, {
          roomId: rid,
          lastMessageAt: m.createdAt,
          lastMessageText: m.text,
          lastUserId: m.userId,
          lastUsername: m.username,
          displayName: m.userId !== "staff_001" ? m.username || m.userId : null,
        });
      } else {
        if (!existing.displayName && m.userId !== "staff_001") {
          existing.displayName = m.username || m.userId;
        }
      }
    }

    const rooms = Array.from(roomInfo.values()).map((r) => ({
      ...r,
      isWaiting: r.lastUserId !== "staff_001",
      displayName: r.displayName || r.lastUsername || r.roomId,
    }));

    res.json(rooms);
  } catch (err) {
    console.error("/api/chat/rooms error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =====================================================
//  API: Delete all messages of a room
// =====================================================
app.delete("/api/chat/rooms/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ error: "Missing roomId" });
    }

    const result = await Message.deleteMany({ roomId: String(roomId) });
    console.log("Deleted room", roomId, "count =", result.deletedCount);

    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("DELETE /api/chat/rooms error:", err);
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

// Helper: get paginated messages newest -> older
const PAGE_SIZE = 20;

app.get("/api/chat/messages", async (req, res) => {
  try {
    const { roomId, before, limit } = req.query;
    if (!roomId) {
      return res.status(400).json({ error: "Missing roomId" });
    }
    const lim = Math.min(parseInt(limit, 10) || PAGE_SIZE, 100);
    const query = { roomId: String(roomId) };
    if (before) {
      const b = new Date(String(before));
      if (!Number.isNaN(b.getTime())) {
        query.createdAt = { $lt: b };
      }
    }
    const msgs = await Message.find(query).sort({ createdAt: -1 }).limit(lim).lean();
    res.json({ messages: msgs });
  } catch (err) {
    console.error("/api/chat/messages error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join room (roomId = userId)
  socket.on("join", async ({ roomId, userId, username }) => {
    try {
      const rid = String(roomId || userId || "");
      if (!rid) return;

      socket.join(rid);
      console.log(`${username || userId} joined room: ${rid}`);

      // send full history (newest -> oldest then reverse to oldest -> newest for UI)
      const history = await Message.find({ roomId: rid })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

      socket.emit(
        "chat:history",
        history
          .reverse()
          .map((m) => ({
          id: m._id.toString(),
          roomId: m.roomId,
          text: m.text,
          userId: m.userId,
          username: m.username,
          createdAt: m.createdAt,
          }))
      );
    } catch (err) {
      console.error("join error:", err);
    }
  });

  // Receive message from app / staff
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

      io.to(rid).emit("chat:message", msgData);

      callback && callback({ ok: true });
    } catch (err) {
      console.error("chat:message error:", err);
      callback && callback({ ok: false, error: err.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// =====================================================
// START SERVER + DB
// =====================================================
connectDB()
  .then(() => {
    console.log("MongoDB connected successfully");
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Staff UI: http://localhost:${PORT}/staff.html`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
