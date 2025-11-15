import mongoose from "mongoose";

const SubscriptionPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["PC", "PlayStation", "Xbox", "Streaming"],
      required: true,
    },
    type: {
      type: String,
      required: true, // vd: "Platform-Specific Package", "Game Streaming Package"
    },
    basePrice: {
      type: Number,
      required: true,
    },
    period: {
      type: String,
      default: "/month",
    },

    // 🔹 Label hiển thị, ví dụ "15% OFF", "Black Friday 50% OFF"
    discountLabel: {
      type: String,
    },

    // 🔹 Phần trăm giảm giá dùng để tính toán (ví dụ 15, 50)
    discountPercent: {
      type: Number, // để null nếu không giảm
    },

    features: {
      type: [String],
      default: [],
    },
    isSeasonalOffer: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

SubscriptionPackageSchema.index({ category: 1 });
SubscriptionPackageSchema.index({ slug: 1 });

const SubscriptionPackage = mongoose.model(
  "SubscriptionPackage",
  SubscriptionPackageSchema
);

export default SubscriptionPackage;
