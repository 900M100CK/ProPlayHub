import mongoose from "mongoose";

const DiscountCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    description: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Optional: áp dụng cho package cụ thể hoặc category
    applicablePackages: {
      type: [String], // array of package slugs
      default: [], // empty = áp dụng cho tất cả
    },
    applicableCategories: {
      type: [String], // array of categories: ["PC", "PlayStation", ...]
      default: [], // empty = áp dụng cho tất cả
    },
  },
  {
    timestamps: true,
  }
);

// Index để tìm kiếm nhanh
DiscountCodeSchema.index({ code: 1 });
DiscountCodeSchema.index({ expiryDate: 1 });
DiscountCodeSchema.index({ isActive: 1 });

// Method để check code có hợp lệ không
DiscountCodeSchema.methods.isValid = function () {
  if (!this.isActive) return false;
  if (new Date() > this.expiryDate) return false;
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) return false;
  return true;
};

// Method để tăng usedCount
DiscountCodeSchema.methods.incrementUsage = async function () {
  this.usedCount += 1;
  await this.save();
};

const DiscountCode = mongoose.model("DiscountCode", DiscountCodeSchema);

export default DiscountCode;

