// routes/subscriptionRoutes.js
import express from "express";
import auth from "../middlewares/auth.js";
import Subscription from "../models/userSubscription.js";

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
 */
router.post("/", auth, async (req, res) => {
  try {
    const { packageSlug, packageName, period, pricePerPeriod, nextBillingDate } =
      req.body;

    if (!packageSlug || !packageName || !pricePerPeriod) {
      return res
        .status(400)
        .json({ message: "Missing packageSlug / packageName / pricePerPeriod" });
    }

    // Không cho phép user đăng ký trùng gói nếu subscription vẫn đang active
    const existingActiveSub = await Subscription.findOne({
      userId: req.user._id,
      packageSlug,
      status: "active",
    });

    if (existingActiveSub) {
      return res.status(409).json({
        message: "Bạn đã đăng ký gói này rồi. Vui lòng hủy gói hiện tại trước khi đăng ký lại.",
      });
    }

    const sub = await Subscription.create({
      userId: req.user._id,
      packageSlug,
      packageName,
      period: period || "per month",
      pricePerPeriod,
      startedAt: new Date(),
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined,
    });

    return res.status(201).json(sub);
  } catch (err) {
    console.error("Create subscription error:", err);
    return res.status(500).json({ message: "Server error creating subscription" });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Hủy (xóa) subscription của user
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    await Subscription.deleteOne({ _id: subscription._id });

    return res.json({ message: "Subscription cancelled successfully" });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return res.status(500).json({ message: "Server error cancelling subscription" });
  }
});

/**
 * GET /api/subscriptions/me
 * Lấy tất cả subscription của user hiện tại
 */
router.get("/me", auth, async (req, res) => {
  try {
    const subs = await Subscription.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    return res.json(subs);
  } catch (err) {
    console.error("Get my subscriptions error:", err);
    return res.status(500).json({ message: "Server error fetching subscriptions" });
  }
});

export default router;
