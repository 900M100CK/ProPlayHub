// models/Subscription.js
import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ID của gói gốc để tham chiếu ổn định
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPackage",
      required: true,
    },

    // Thông tin gói tại thời điểm đăng ký (denormalized cho đơn giản)
    packageSlug: { type: String, required: true },
    packageName: { type: String, required: true },
    period: { type: String, default: "per month" }, // ví dụ: "per month"
    pricePerPeriod: { type: Number, required: true },

    // Lưu lại các add-on đã mua tại thời điểm đăng ký
    purchasedAddons: [
      {
        _id: false,
        key: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true }, // Giá tại thời điểm mua
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive", "cancelled"],
      default: "active",
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    nextBillingDate: {
      type: Date,
    },

    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Subscription = mongoose.model("Subscription", SubscriptionSchema);
export default Subscription;
