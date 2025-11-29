import express from "express";
import Package from "../models/SubscriptionPackage.js";
import Discount from "../models/DiscountCode.js";
import auth from "../middlewares/auth.js"; // Import middleware xác thực
import User from "../models/User.js"; // Model người dùng
import Subscription from "../models/userSubscription.js"; // 👈 Thêm model Subscription

const router = express.Router();

// Middleware to check for admin privileges (placeholder)
// In a real application, you'd have a proper auth middleware that checks user roles.
const isAdmin = (req, res, next) => {
  // For now, we'll assume the user is an admin if they can reach these routes.
  // Replace this with actual role checking logic from your auth system.
  console.log("Admin check passed (placeholder).");
  next();
};

// --- Package Routes ---

// GET recommended packages (for home screen)
// This route should come BEFORE routes with /:id
router.get("/packages/recommended", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('gamingPlatformPreferences');
    const preferences = user?.gamingPlatformPreferences || [];

    // Base query: không phải là seasonal offer
    const query = { isSeasonalOffer: false };

    // Nếu user có sở thích, lọc theo sở thích đó
    if (preferences.length > 0) {
      query.category = { $in: preferences };
    }

    // Sắp xếp theo lượt bán (salesCount) giảm dần
    const recommendedPackages = await Package.find(query).sort({ salesCount: -1 });

    // Nếu không có kết quả nào (ví dụ: user chỉ thích 'Xbox' nhưng không có gói Xbox nào)
    // thì trả về danh sách chung được sắp xếp theo lượt bán
    if (recommendedPackages.length === 0 && preferences.length > 0) {
        const generalPackages = await Package.find({ isSeasonalOffer: false }).sort({ salesCount: -1 });
        return res.json(generalPackages);
    }

    res.json(recommendedPackages);
  } catch (err) {
    console.error("GET /api/crm/packages/recommended error:", err);
    res.status(500).json({ message: "Failed to load recommended packages." });
  }
});

// GET all packages (with search and filter)
router.get("/packages", async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }
    if (category) {
      query.category = category;
    }
    const packages = await Package.find(query).sort({ name: 1 });
    res.json(packages);
  } catch (err) {
    console.error("GET /api/crm/packages error:", err);
    res.status(500).json({ message: "Failed to load packages." });
  }
});

// POST a new package
router.post("/packages", isAdmin, async (req, res) => {
  try {
    const newPackage = new Package(req.body);
    await newPackage.save();
    res.status(201).json(newPackage);
  } catch (err) {
    console.error("POST /api/crm/packages error:", err);
    res.status(400).json({ message: err.message || "Failed to create package." });
  }
});

// PUT (update) a package by ID
router.put("/packages/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPackage = await Package.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updatedPackage) {
      return res.status(404).json({ message: "Package not found." });
    }
    res.json(updatedPackage);
  } catch (err) {
    console.error(`PUT /api/crm/packages/${req.params.id} error:`, err);
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

    // 2. Tìm và hủy tất cả các đăng ký đang hoạt động ("active") liên quan đến gói này
    const activeSubscriptions = await Subscription.find({
      packageSlug: packageToDelete.slug,
      status: "active",
    });

    if (activeSubscriptions.length > 0) {
      await Subscription.updateMany(
        { packageSlug: packageToDelete.slug, status: "active" },
        { $set: { status: "cancelled", cancelledAt: new Date() } }
      );
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
    const discounts = await Discount.find({}).sort({ expiryDate: -1 });
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
      expiryDate: discountExpiry,
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