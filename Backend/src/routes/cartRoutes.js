import express from "express";
import Cart from "../models/Cart.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

const sanitizeAddons = (rawAddons) => {
  if (!Array.isArray(rawAddons)) return [];
  return rawAddons
    .map((addon) => {
      if (!addon) return null;
      const key = String(addon.key || "").trim();
      const name = String(addon.name || "").trim();
      const price = Number(addon.price);
      if (!key || !name || Number.isNaN(price) || price < 0) return null;
      return {
        key,
        name,
        price: Number(price.toFixed(2)),
      };
    })
    .filter(Boolean);
};

// Get current user's cart
router.get("/", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).lean();
    res.json(cart?.items || []);
  } catch (err) {
    console.error("GET /api/cart error:", err);
    res.status(500).json({ message: "Failed to load cart." });
  }
});

// Add item to cart
router.post("/", auth, async (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.slug) {
      return res.status(400).json({ message: "Invalid cart item." });
    }
    const normalizedItem = {
      ...item,
      basePrice: Number(item.basePrice) || 0,
      finalPrice: Number.isFinite(Number(item.finalPrice))
        ? Number(item.finalPrice)
        : Number(item.basePrice) || 0,
      selectedAddons: sanitizeAddons(item.selectedAddons),
    };
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
    }
    const exists = cart.items.some((i) => i.slug === item.slug);
    if (exists) {
      return res.status(409).json({ message: "Item already in cart." });
    }
    cart.items.push(normalizedItem);
    await cart.save();
    res.json({ items: cart.items });
  } catch (err) {
    console.error("POST /api/cart error:", err);
    res.status(500).json({ message: "Failed to add to cart." });
  }
});

// Remove item by slug
router.delete("/:slug", auth, async (req, res) => {
  try {
    const slug = req.params.slug;
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) return res.json({ items: [] });
    cart.items = cart.items.filter((i) => i.slug !== slug);
    await cart.save();
    res.json({ items: cart.items });
  } catch (err) {
    console.error("DELETE /api/cart/:slug error:", err);
    res.status(500).json({ message: "Failed to remove item." });
  }
});

// Clear cart
router.delete("/", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.json({ items: [] });
  } catch (err) {
    console.error("DELETE /api/cart error:", err);
    res.status(500).json({ message: "Failed to clear cart." });
  }
});

export default router;
