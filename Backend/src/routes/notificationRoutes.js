import express from "express";
import auth from "../middlewares/auth.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// List notifications for current user
router.get("/", auth, async (req, res) => {
  try {
    const items = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    res.status(500).json({ message: "Failed to load notifications." });
  }
});

// Create a notification
router.post("/", auth, async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }
    const notif = await Notification.create({
      userId: req.user._id,
      title,
      message,
    });
    res.json({ notification: notif });
  } catch (err) {
    console.error("POST /api/notifications error:", err);
    res.status(500).json({ message: "Failed to create notification." });
  }
});

// Mark one as read
router.patch("/:id/read", auth, async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.updateOne({ _id: id, userId: req.user._id }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/notifications/:id/read error:", err);
    res.status(500).json({ message: "Failed to mark read." });
  }
});

// Mark all read
router.post("/read-all", auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/notifications/read-all error:", err);
    res.status(500).json({ message: "Failed to mark all read." });
  }
});

// Delete one
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.deleteOne({ _id: id, userId: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/notifications/:id error:", err);
    res.status(500).json({ message: "Failed to delete notification." });
  }
});

// Clear all
router.delete("/", auth, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/notifications error:", err);
    res.status(500).json({ message: "Failed to clear notifications." });
  }
});

export default router;
