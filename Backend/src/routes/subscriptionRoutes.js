// routes/subscriptionRoutes.js
import express from "express";
import auth from "../middlewares/auth.js";
import Subscription from "../models/userSubscription.js";
import { sendSubscriptionReceiptEmail } from "../libs/email.js"; // 👈 THÊM DÒNG NÀY

const router = express.Router();

/**
 * POST /api/subscriptions
 * Tạo subscription mới khi user complete order ở Checkout
 * Body mong đợi:
 * {
 *   packageSlug,
 *   packageName,
 *   period,
 *   pricePerPeriod,
 *   nextBillingDate   (optional, string ISO)
 * }
 * Lưu ý: Route này nên chỉ được gọi SAU KHI thanh toán thành công (VISACheck OK).
 */
router.post("/", auth, async (req, res) => {
  try {
    const {
      packageSlug,
      packageName,
      period,
      pricePerPeriod,
      nextBillingDate,
    } = req.body;

    const normalizedSlug = typeof packageSlug === "string" ? packageSlug.trim().toLowerCase() : "";
    const normalizedName = typeof packageName === "string" ? packageName.trim() : "";
    const normalizedPrice =
      typeof pricePerPeriod === "number"
        ? pricePerPeriod
        : Number.parseFloat(pricePerPeriod ?? "NaN");

    if (!normalizedSlug || !normalizedName || Number.isNaN(normalizedPrice)) {
      return res.status(400).json({
        message: "Missing packageSlug / packageName / pricePerPeriod",
      });
    }

    // Không cho phép user đăng ký trùng gói nếu subscription vẫn đang active
    const existingActiveSub = await Subscription.findOne({
      userId: req.user._id,
      packageSlug: normalizedSlug,
      status: "active",
    });

    if (existingActiveSub) {
      return res.status(409).json({
        message:
          "Bạn đã đăng ký gói này rồi. Vui lòng hủy gói hiện tại trước khi đăng ký lại.",
      });
    }

    // 1. Tạo subscription mới
    const sub = await Subscription.create({
      userId: req.user._id,
      packageSlug: normalizedSlug,
      packageName: normalizedName,
      period: period || "per month",
      pricePerPeriod: Number(normalizedPrice.toFixed(2)),
      startedAt: new Date(),
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined,
    });

    // 2. Gửi email hóa đơn subscription (không làm fail flow nếu email bị lỗi)
    try {
      await sendSubscriptionReceiptEmail(
        req.user.email,
        req.user.fullName || req.user.username || "ProPlayHub user",
        sub
      );
    } catch (emailError) {
      console.error("Error sending subscription receipt email (handled):", emailError);
      // Không throw tiếp, vì không muốn làm hỏng 201 Created chỉ vì lỗi email
    }

    // 3. Trả về subscription cho app hiển thị bill
    return res.status(201).json(sub);
  } catch (err) {
    console.error("Create subscription error:", err);
    return res
      .status(500)
      .json({ message: "Server error creating subscription" });
  }
});

/**
 * GET /api/subscriptions/me
 * Return all subscriptions that belong to the authenticated user.
 */
router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const subs = await Subscription.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(subs);
  } catch (err) {
    console.error("Fetch my subscriptions error:", err);
    return res.status(500).json({ message: "Server error fetching subscriptions" });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Soft-cancel a subscription that belongs to the authenticated user.
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const sub = await Subscription.findOne({ _id: id, userId });
    if (!sub) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    sub.status = "cancelled";
    sub.cancelledAt = new Date();
    await sub.save();

    return res.json({ message: "Subscription cancelled", subscription: sub });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return res.status(500).json({ message: "Server error cancelling subscription" });
  }
});

export default router;
