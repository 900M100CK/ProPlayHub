import express from "express";
import Package from "../models/SubscriptionPackage.js";
import Discount from "../models/DiscountCode.js";
import auth from "../middlewares/auth.js"; // Import middleware xác thực
import User from "../models/User.js"; // Model người dùng
import Subscription from "../models/userSubscription.js"; // 👈 Thêm model Subscription

const router = express.Router();

// --- Helpers ---
const slugifyValue = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Make sure slug is unique; append -1, -2... when needed.
const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
  let candidateSlug = baseSlug;
  let counter = 1;
  const baseQuery = excludeId ? { _id: { $ne: excludeId } } : {};

  while (await Package.exists({ slug: candidateSlug, ...baseQuery })) {
    candidateSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidateSlug;
};

// Middleware to check for admin privileges (placeholder)
// In a real application, you'd have a proper auth middleware that checks user roles.
const isAdmin = (req, res, next) => {
  // For now, we'll assume the user is an admin if they can reach these routes.
  // Replace this with actual role checking logic from your auth system.
  console.log("Admin check passed (placeholder).");
  next();
};

// --- Package Routes ---

// POST a new package
router.post("/packages", isAdmin, async (req, res) => {
  try {
    const baseSlug = slugifyValue(req.body.slug || req.body.name);
    if (!baseSlug) {
      return res.status(400).json({ message: "Slug or name is required to create a package." });
    }
    const finalSlug = await ensureUniqueSlug(baseSlug);

    const newPackage = new Package({ ...req.body, slug: finalSlug });
    await newPackage.save();
    res.status(201).json(newPackage);
  } catch (err) {
    console.error("POST /api/crm/packages error:", err);

    if (err?.code === 11000 && err?.keyPattern?.slug) {
      return res.status(409).json({ message: "Package slug already exists. Please choose another slug or name." });
    }

    res.status(400).json({ message: err.message || "Failed to create package." });
  }
});

// PUT (update) a package by ID
router.put("/packages/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = { ...req.body };

    if (req.body.slug || req.body.name) {
      const baseSlug = slugifyValue(req.body.slug || req.body.name);
      if (!baseSlug) {
        return res.status(400).json({ message: "Slug or name is required to update package slug." });
      }
      updatePayload.slug = await ensureUniqueSlug(baseSlug, id);
    }

    const updatedPackage = await Package.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true });
    if (!updatedPackage) {
      return res.status(404).json({ message: "Package not found." });
    }
    res.json(updatedPackage);
  } catch (err) {
    console.error(`PUT /api/crm/packages/${req.params.id} error:`, err);

    if (err?.code === 11000 && err?.keyPattern?.slug) {
      return res.status(409).json({ message: "Package slug already exists. Please choose another slug or name." });
    }

    res.status(400).json({ message: err.message || "Failed to update package." });
  }
});

// DELETE a package by ID
router.delete("/packages/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Tìm gói để lấy slug trước khi xóa
    const packageToDelete = await Package.findById(id);
    if (!packageToDelete) {
      return res.status(404).json({ message: "Package not found." });
    }

    // 2. Hủy tất cả các đăng ký đang hoạt động ("active") liên quan đến gói này bằng packageId
    const updateResult = await Subscription.updateMany(
      { packageId: id, status: "active" },
      { $set: { status: "cancelled", cancelledAt: new Date() } }
    );

    if (updateResult.modifiedCount > 0) {
      console.log(`Cancelled ${updateResult.modifiedCount} active subscriptions for deleted package ${id}`);
    }

    // 3. Sau khi đã hủy các đăng ký, tiến hành xóa gói
    await Package.findByIdAndDelete(id);

    res.status(200).json({ message: "Package deleted successfully." });
  } catch (err) {
    console.error(`DELETE /api/crm/packages/${req.params.id} error:`, err);
    res.status(500).json({ message: "Failed to delete package." });
  }
});

// --- Discount Routes ---

// GET all discounts
router.get("/discounts", async (req, res) => {
  try {
    const discounts = await Discount.find({}).sort({ expiresAt: -1 });
    res.json(discounts);
  } catch (err) {
    console.error("GET /api/crm/discounts error:", err);
    res.status(500).json({ message: "Failed to load discounts." });
  }
});

// POST a new discount
router.post("/discounts", isAdmin, async (req, res) => {
  try {
    // Frontend sends discountValue, model expects discountPercent
    const { discountCode, discountValue, discountExpiry } = req.body;
    const newDiscount = new Discount({
      code: discountCode,
      discountPercent: discountValue,
      expiresAt: discountExpiry,
    });
    await newDiscount.save();
    res.status(201).json(newDiscount);
  } catch (err) {
    console.error("POST /api/crm/discounts error:", err);
    res.status(400).json({ message: err.message || "Failed to create discount." });
  }
});

// PUT (update) a discount by ID
router.put("/discounts/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedDiscount = await Discount.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedDiscount) {
      return res.status(404).json({ message: "Discount not found." });
    }
    res.json(updatedDiscount);
  } catch (err) {
    console.error(`PUT /api/crm/discounts/${req.params.id} error:`, err);
    res.status(400).json({ message: err.message || "Failed to update discount." });
  }
});

// DELETE a discount by ID
router.delete("/discounts/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedDiscount = await Discount.findByIdAndDelete(id);
    if (!deletedDiscount) {
      return res.status(404).json({ message: "Discount not found." });
    }
    res.status(200).json({ message: "Discount deleted successfully." });
  } catch (err) {
    console.error(`DELETE /api/crm/discounts/${req.params.id} error:`, err);
    res.status(500).json({ message: "Failed to delete discount." });
  }
});

// --- Customer Routes ---
router.get("/customers", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const customers = await User.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    console.error("GET /api/crm/customers error:", err);
    res.status(500).json({ message: "Failed to load customers." });
  }
});

export default router;
