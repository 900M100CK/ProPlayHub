import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPackage",
      required: true,
    },
    packageSlug: { type: String, required: true },
    packageName: { type: String, required: true },
    period: { type: String, default: "per month" },
    pricePerPeriod: { type: Number, required: true },
    purchasedAddons: [
      {
        _id: false,
        key: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    appliedDiscount: {
      _id: false,
      code: { type: String },
      percent: { type: Number },
      amount: { type: Number },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "cancelled"],
      default: "active",
    },
    startedAt: { type: Date, default: Date.now },
    nextBillingDate: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", SubscriptionSchema);
export default Subscription;
