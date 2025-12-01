import mongoose from "mongoose";

const addonSchema = new mongoose.Schema(
  {
    _id: false,
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const CartItemSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // use package id
    slug: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String },
    type: { type: String },
    basePrice: { type: Number, required: true },
    period: { type: String },
    discountLabel: { type: String },
    features: [{ type: String }],
    isSeasonalOffer: { type: Boolean, default: false },
    tags: [{ type: String }],
    finalPrice: { type: Number, required: true },
    selectedAddons: {
      type: [addonSchema],
      default: [],
    },
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [CartItemSchema],
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", CartSchema);
export default Cart;
