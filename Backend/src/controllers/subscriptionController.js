// src/controllers/subscriptionController.js
import Subscription from '../models/Subscription.js';
import SubscriptionPackage from '../models/SubscriptionPackage.js';
import { sendSubscriptionReceiptEmail } from '../libs/email.js';

export const checkoutSubscription = async (req, res) => {
  try {
    const user = req.user; // lấy từ auth middleware (bearer token)
    const { packageSlug } = req.body;

    // 1. Lấy thông tin gói
    const pkg = await SubscriptionPackage.findOne({ slug: packageSlug });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

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
