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

    // Thông tin gói tại thời điểm đăng ký (denormalized cho đơn giản)
    packageSlug: { type: String, required: true },
    packageName: { type: String, required: true },
    period: { type: String, default: "per month" }, // ví dụ: "per month"
    pricePerPeriod: { type: Number, required: true },

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
