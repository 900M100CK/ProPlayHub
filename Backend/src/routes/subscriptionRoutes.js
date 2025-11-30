// routes/subscriptionRoutes.js
import express from "express";
import auth from "../middlewares/auth.js";
import SubscriptionPackage from "../models/SubscriptionPackage.js";
import Subscription from "../models/userSubscription.js";
import { sendSubscriptionReceiptEmail } from "../libs/email.js";

const router = express.Router();

/**
 * POST /api/subscriptions
 * Tạo subscription mới khi user thanh toán ở Checkout.
 * Backend sẽ tự tính toán giá cuối cùng để đảm bảo an toàn.
 * Body mong đợi:
 * {
 *   "packageSlug": "premium-pc",
 *   "selectedAddons": ["priority-support", "extra-storage"] // (optional) Mảng các 'key' của add-on
 * }
 * Lưu ý: Route này nên chỉ được gọi SAU KHI thanh toán thành công (VISACheck OK).
 */
router.post("/", auth, async (req, res) => {
  try {
    const { packageSlug } = req.body;
    const user = req.user;
    // Lấy mảng các key của add-on từ body, đảm bảo nó là một mảng
    const selectedAddonKeys = Array.isArray(req.body.selectedAddons) ? req.body.selectedAddons : [];

    if (!packageSlug) return res.status(400).json({ message: "packageSlug is required." });

    // 1. Lấy thông tin gói từ DB
    const pkg = await SubscriptionPackage.findOne({ slug: packageSlug });
    if (!pkg) {
      return res.status(404).json({ message: "Package not found." });
    }

    // 2. Kiểm tra xem user đã có gói active này chưa
    const existingActiveSub = await Subscription.findOne({
      userId: user._id,
      packageSlug: pkg.slug,
      status: "active",
    });

    if (existingActiveSub) {
      return res.status(409).json({
        message: "You already have an active subscription for this package.",
      });
    }

    // 3. Tính giá cuối cùng trên server
    // Bắt đầu với giá gốc của gói
    let finalPrice = pkg.basePrice;

    // Áp dụng giảm giá của gói (nếu có)
    if (typeof pkg.discountPercent === "number" && pkg.discountPercent > 0) {
      finalPrice *= 1 - pkg.discountPercent / 100;
    }

    // Xác thực và tính tổng giá các add-on được chọn
    const purchasedAddons = [];
    if (selectedAddonKeys.length > 0) {
      for (const key of selectedAddonKeys) {
        const addon = pkg.addons.find((a) => a.key === key);
        if (!addon) {
          return res.status(400).json({ message: `Invalid add-on key: ${key}` });
        }
        finalPrice += addon.price; // Cộng giá add-on vào tổng
        purchasedAddons.push({ key: addon.key, name: addon.name, price: addon.price });
      }
    }

    // Giả sử có giảm giá 15% khi mua qua app
    finalPrice *= 0.85;

    finalPrice = Number(finalPrice.toFixed(2));

    // 4. Tạo bản ghi Subscription
    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // Ví dụ: kỳ thanh toán sau 1 tháng

    const sub = await Subscription.create({
      userId: user._id,
      packageId: pkg._id,
      packageSlug: pkg.slug,
      packageName: pkg.name,
      period: pkg.period || "/month", // Sửa lỗi: Lấy period từ package
      pricePerPeriod: finalPrice,
      purchasedAddons: purchasedAddons, // Lưu các add-on đã mua
      startedAt: now,
      nextBillingDate: nextBillingDate,
    });

    // 5. Gửi email hóa đơn (chạy ngầm)
    sendSubscriptionReceiptEmail(user.email, user.name, sub).catch((err) =>
      console.error("Handled: Failed to send subscription receipt email:", err)
    );

    // 6. Trả về subscription cho app hiển thị bill
    return res.status(201).json(sub);
  } catch (err) {
    console.error("Create subscription error:", err);
    return res.status(500).json({ message: "Server error creating subscription" });
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
