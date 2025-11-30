import mongoose from "mongoose";

const SubscriptionPackageSchema = new mongoose.Schema(
  {
    // --- ADD-ONS ---
    addons: [
      {
        _id: false, // Không cần _id cho mỗi add-on
        key: { type: String, required: true, trim: true }, // e.g., 'priority-support'
        name: { type: String, required: true, trim: true }, // e.g., 'Priority Support'
        price: { type: Number, required: true, min: 0 }, // e.g., 5.99
      },
    ],

    // --- CORE FIELDS ---
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
    // 🔹 Đếm số lượt bán để xác định độ phổ biến
    salesCount: {
      type: Number,
      default: 0,
      index: true, // Index để tăng tốc độ sắp xếp
    },
  },
  {
    timestamps: true,
  }
);

SubscriptionPackageSchema.index({ category: 1 });
SubscriptionPackageSchema.index({ "addons.key": 1 }); // Index key của add-on
SubscriptionPackageSchema.index({ slug: 1 });

const SubscriptionPackage = mongoose.model(
  "SubscriptionPackage",
  SubscriptionPackageSchema
);

export default SubscriptionPackage;
