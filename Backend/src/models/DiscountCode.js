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
    description: { type: String },
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    expiresAt: { type: Date },
    usageLimit: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },

    // Optional: apply to specific packages or categories
    applicablePackages: {
      type: [String], // array of package slugs
      default: [], // empty = applies to all
    },
    applicableCategories: {
      type: [String], // array of categories: ["PC", "PlayStation", ...]
      default: [], // empty = applies to all
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Method to check if code is valid (active, not expired, under usage limit)
DiscountCodeSchema.methods.isValid = function () {
  const now = new Date();
  const withinUsageLimit = this.usageLimit === null || this.usedCount < this.usageLimit;
  const notExpired = !this.expiresAt || this.expiresAt > now;
  return this.isActive && withinUsageLimit && notExpired;
};

const DiscountCode = mongoose.model("DiscountCode", DiscountCodeSchema);
export default DiscountCode;
