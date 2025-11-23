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

    if (!packageSlug || !packageName || !pricePerPeriod) {
      return res.status(400).json({
        message: "Missing packageSlug / packageName / pricePerPeriod",
      });
    }

    // Không cho phép user đăng ký trùng gói nếu subscription vẫn đang active
    const existingActiveSub = await Subscription.findOne({
      userId: req.user._id,
      packageSlug,
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
      packageSlug,
      packageName,
      period: period || "per month",
      pricePerPeriod,
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

export default router;
