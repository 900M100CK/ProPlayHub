import express from "express";
import User from "../models/User.js";
import DiscountCode from "../models/DiscountCode.js";
import SubscriptionPackage from "../models/SubscriptionPackage.js";

const router = express.Router();

// Middleware để kiểm tra vai trò staff/admin trong tương lai
const ensureStaff = (req, res, next) => {
  // NOTE: Hiện tại chỉ cần đăng nhập là có thể truy cập.
  // Trong tương lai, bạn có thể thêm logic kiểm tra vai trò ở đây.
  // Ví dụ: if (req.user.role !== 'staff' && req.user.role !== 'admin') {
  //   return res.status(403).json({ message: "Forbidden: Staff access required." });
  // }
  next();
};

const parseListField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * GET /api/crm/customers
 * Lấy danh sách tất cả người dùng (khách hàng)
 */
router.get("/customers", ensureStaff, async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, "i"); // 'i' for case-insensitive
      query.$or = [{ username: searchRegex }, { email: searchRegex }];
    }

    const customers = await User.find(query)
      .select("username email createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json(customers);
  } catch (error) {
    console.error("Error fetching customers for CRM:", error);
    res.status(500).json({ message: "Server error fetching customers." });
  }
});

/**
 * GET /api/crm/discounts
 * Lấy danh sách tất cả mã giảm giá
 */
router.get("/discounts", ensureStaff, async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (search) {
      query.code = new RegExp(search, "i");
    }

    if (status === "active") {
      query.isActive = true; // Lọc theo trường isActive
    } else if (status === "inactive") {
      query.isActive = false; // Lọc theo trường isActive
    }

    const discounts = await DiscountCode.find(query)
      .sort({ createdAt: -1 })
      .lean();
    res.json(discounts);
  } catch (error) {
    console.error("Error fetching discounts for CRM:", error);
    res.status(500).json({ message: "Server error fetching discounts." });
  }
});

/**
 * POST /api/crm/discounts
 * Tạo một mã giảm giá mới
 */
router.post("/discounts", ensureStaff, async (req, res) => {
  try {
    const { discountCode, discountValue, discountExpiry } = req.body;
    if (!discountCode || !discountValue || !discountExpiry) {
      return res.status(400).json({ message: "Code, value, and expiry date are required." });
    }

    const newDiscount = await DiscountCode.create({
      code: discountCode,
      discountPercent: discountValue, // Ánh xạ discountValue từ form sang discountPercent của model
      expiryDate: new Date(discountExpiry),
    });

    res.status(201).json(newDiscount);
  } catch (error) {
    console.error("Error creating discount for CRM:", error);
    if (error.code === 11000) { // Duplicate key error
      return res.status(409).json({ message: `Discount code "${req.body.discountCode}" already exists.` });
    }
    res.status(500).json({ message: "Server error creating discount." });
  }
});

/**
 * PUT /api/crm/discounts/:id
 * Cập nhật một mã giảm giá đã có
 */
router.put("/discounts/:id", ensureStaff, async (req, res) => {
  try {
    const { discountCode, discountPercent, discountExpiry, isActive } = req.body;
    if (!discountCode || !discountPercent || !discountExpiry) {
      return res.status(400).json({ message: "Code, value, and expiry date are required." });
    }

    const updatedDiscount = await DiscountCode.findByIdAndUpdate(
      req.params.id,
      {
        code: discountCode,
        discountPercent: discountPercent,
        expiryDate: new Date(discountExpiry),
        isActive: isActive === 'true' || isActive === true, // Chuyển đổi từ string/boolean sang boolean
      },
      { new: true, runValidators: true } // Trả về document mới và chạy validators
    );

    if (!updatedDiscount) return res.status(404).json({ message: "Discount not found." });

    res.json(updatedDiscount);
  } catch (error) {
    console.error("Error updating discount for CRM:", error);
    res.status(500).json({ message: "Server error updating discount." });
  }
});

/**
 * DELETE /api/crm/discounts/:id
 * Xóa một mã giảm giá
 */
router.delete("/discounts/:id", ensureStaff, async (req, res) => {
  try {
    await DiscountCode.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Discount deleted successfully." });
  } catch (error) {
    console.error("Error deleting discount for CRM:", error);
    res.status(500).json({ message: "Server error deleting discount." });
  }
});

/**
 * GET /api/crm/packages
 * Fetch subscription packages with optional search/filter.
 */
router.get("/packages", ensureStaff, async (req, res) => {
  try {
    const { search, category } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { slug: regex }, { type: regex }];
    }

    if (category && category !== "All") {
      query.category = category;
    }

    const packages = await SubscriptionPackage.find(query).sort({ createdAt: -1 }).lean();
    res.json(packages);
  } catch (error) {
    console.error("Error fetching packages for CRM:", error);
    res.status(500).json({ message: "Server error fetching packages." });
  }
});

/**
 * POST /api/crm/packages
 * Create a new subscription package.
 */
router.post("/packages", ensureStaff, async (req, res) => {
  try {
    const {
      name,
      slug,
      category,
      type,
      basePrice,
      period,
      discountLabel,
      discountPercent,
      features,
      tags,
      isSeasonalOffer,
    } = req.body;

    if (!name || !slug || !category || !type || basePrice === undefined) {
      return res.status(400).json({ message: "Name, slug, category, type, and base price are required." });
    }

    const normalizedSlug = slug.toString().trim().toLowerCase();
    const priceNumber = Number(basePrice);
    if (Number.isNaN(priceNumber)) {
      return res.status(400).json({ message: "Base price must be a valid number." });
    }

    let discountPercentNumber;
    if (discountPercent !== undefined && discountPercent !== "") {
      discountPercentNumber = Number(discountPercent);
      if (Number.isNaN(discountPercentNumber)) {
        return res.status(400).json({ message: "Discount percent must be a valid number." });
      }
    }

    const newPackage = await SubscriptionPackage.create({
      name: name.trim(),
      slug: normalizedSlug,
      category,
      type: type.trim(),
      basePrice: priceNumber,
      period: period?.trim() || "/month",
      discountLabel: discountLabel?.trim() || undefined,
      discountPercent: discountPercentNumber,
      features: parseListField(features),
      tags: parseListField(tags),
      isSeasonalOffer: isSeasonalOffer === true || isSeasonalOffer === "true",
    });

    res.status(201).json(newPackage);
  } catch (error) {
    console.error("Error creating subscription package:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Slug already exists. Please choose another one." });
    }
    res.status(500).json({ message: "Server error creating subscription package." });
  }
});

/**
 * PUT /api/crm/packages/:id
 * Update an existing subscription package.
 */
router.put("/packages/:id", ensureStaff, async (req, res) => {
  try {
    const {
      name,
      slug,
      category,
      type,
      basePrice,
      period,
      discountLabel,
      discountPercent,
      features,
      tags,
      isSeasonalOffer,
    } = req.body;

    if (!name || !slug || !category || !type || basePrice === undefined) {
      return res.status(400).json({ message: "Name, slug, category, type, and base price are required." });
    }

    const normalizedSlug = slug.toString().trim().toLowerCase();
    const priceNumber = Number(basePrice);
    if (Number.isNaN(priceNumber)) {
      return res.status(400).json({ message: "Base price must be a valid number." });
    }

    let discountPercentNumber;
    if (discountPercent !== undefined && discountPercent !== "") {
      discountPercentNumber = Number(discountPercent);
      if (Number.isNaN(discountPercentNumber)) {
        return res.status(400).json({ message: "Discount percent must be a valid number." });
      }
    }

    const updatedPackage = await SubscriptionPackage.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        slug: normalizedSlug,
        category,
        type: type.trim(),
        basePrice: priceNumber,
        period: period?.trim() || "/month",
        discountLabel: discountLabel?.trim() || undefined,
        discountPercent: discountPercentNumber,
        features: parseListField(features),
        tags: parseListField(tags),
        isSeasonalOffer: isSeasonalOffer === true || isSeasonalOffer === "true",
      },
      { new: true, runValidators: true }
    );

    if (!updatedPackage) {
      return res.status(404).json({ message: "Package not found." });
    }

    res.json(updatedPackage);
  } catch (error) {
    console.error("Error updating subscription package:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Slug already exists. Please choose another one." });
    }
    res.status(500).json({ message: "Server error updating subscription package." });
  }
});

/**
 * DELETE /api/crm/packages/:id
 */
router.delete("/packages/:id", ensureStaff, async (req, res) => {
  try {
    const deleted = await SubscriptionPackage.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Package not found." });
    }
    res.json({ message: "Package deleted successfully." });
  } catch (error) {
    console.error("Error deleting subscription package:", error);
    res.status(500).json({ message: "Server error deleting subscription package." });
  }
});

export default router;
