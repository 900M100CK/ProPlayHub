// src/controllers/subscriptionController.js
import Subscription from '../models/userSubscription.js';
import SubscriptionPackage from '../models/SubscriptionPackage.js';
import User from '../models/user.js';
import { sendSubscriptionReceiptEmail } from '../libs/email.js';
import { Expo } from 'expo-server-sdk';
import {
  getAchievementStatsForUser,
  getAchievementDefinitions,
  getHighestAchievedTier,
} from '../utils/achievementUtils.js';

// Khởi tạo Expo SDK
const expo = new Expo();

export const checkoutSubscription = async (req, res) => {
  try {
    const user = req.user; // lấy từ auth middleware (bearer token)
    const { packageSlug } = req.body;

    // 1. Lấy thông tin gói
    const pkg = await SubscriptionPackage.findOne({ slug: packageSlug });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // === LOGIC THÀNH TÍCH: Lấy stats TRƯỚC khi mua ===
    const oldStats = await getAchievementStatsForUser(user._id);

    // 2. Tính giá cuối cùng (ví dụ: app order -15% + discount gói)
    let finalPrice = pkg.basePrice;

    // giảm giá gói, nếu có
    if (typeof pkg.discountPercent === 'number') {
      finalPrice = finalPrice * (1 - pkg.discountPercent / 100);
    }
    // giảm 15% nếu order qua app
    finalPrice = finalPrice * 0.85;

    finalPrice = Number(finalPrice.toFixed(2));

    // 3. Gọi VISACheck / ngân hàng (giả lập cho coursework)
    // TODO: gọi API thực tế, ở đây giả sử thanh toán ok:
    const paymentApproved = true;
    if (!paymentApproved) {
      return res.status(402).json({ message: 'Payment not approved' });
    }

    // 4. Tạo bản ghi Subscription
    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setMonth(nextBilling.getMonth() + 1); // ví dụ tính kỳ sau 1 tháng

    const subscription = await Subscription.create({
      userId: user._id,
      packageSlug: pkg.slug,
      packageName: pkg.name,
      period: pkg.period || 'per month',
      pricePerPeriod: finalPrice,
      status: 'active',
      startedAt: now,
      nextBillingDate: nextBilling,
    });

    // === LOGIC THÀNH TÍCH: So sánh và gửi thông báo ===
    // Chạy ngầm để không làm chậm response trả về cho người dùng
    (async () => {
      try {
        const newStats = await getAchievementStatsForUser(user._id);
        const achievementDefinitions = getAchievementDefinitions();
        const userWithToken = await User.findById(user._id).select('+pushToken');

        if (!userWithToken?.pushToken || !Expo.isExpoPushToken(userWithToken.pushToken)) {
          return; // Không có token hợp lệ, không làm gì cả
        }

        const notificationsToSend = [];

        achievementDefinitions.forEach((definition) => {
          const oldTier = getHighestAchievedTier(definition, oldStats);
          const newTier = getHighestAchievedTier(definition, newStats);

          // Nếu cấp độ mới cao hơn cấp độ cũ (hoặc từ null -> có cấp độ)
          if (newTier && (!oldTier || newTier.threshold > oldTier.threshold)) {
            notificationsToSend.push({
              to: userWithToken.pushToken,
              sound: 'default',
              title: '🏆 New Achievement Unlocked!',
              body: `You've reached ${definition.title} (${newTier.level})!`,
              data: { screen: 'achievements' }, // Dữ liệu để điều hướng khi người dùng nhấn vào
            });
          }
        });

        if (notificationsToSend.length > 0) {
          await expo.sendPushNotificationsAsync(notificationsToSend);
        }
      } catch (achievementError) {
        console.error('Error processing achievements and sending notifications:', achievementError);
      }
    })();

    // 5. Gửi email hóa đơn (không throw lỗi ra ngoài)
    sendSubscriptionReceiptEmail(
      user.email,
      user.fullName || user.username || 'ProPlayHub user',
      subscription
    ).catch((err) => console.error('Subscription receipt email error:', err));

    // 6. Trả về dữ liệu cho mobile app hiển thị bill
    return res.status(200).json({
      success: true,
      message: 'Subscription created and payment processed',
      subscription,
    });
  } catch (error) {
    console.error('checkoutSubscription error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
