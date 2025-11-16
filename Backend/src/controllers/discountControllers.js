// src/controllers/discountControllers.js
import DiscountCode from "../models/DiscountCode.js";

/**
 * POST /api/discounts/validate
 * Validate discount code
 * Body: { code: string, packageSlug?: string, category?: string }
 */
export const validateDiscountCode = async (req, res) => {
  try {
    const { code, packageSlug, category } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Discount code is required" });
    }

    const discountCode = await DiscountCode.findOne({
      code: code.toUpperCase().trim(),
    });

    if (!discountCode) {
      return res.status(404).json({ message: "Discount code not found" });
    }

    // Check if code is valid
    if (!discountCode.isValid()) {
      if (!discountCode.isActive) {
        return res.status(400).json({ message: "Discount code is inactive" });
      }
      if (new Date() > discountCode.expiryDate) {
        return res.status(400).json({ message: "Discount code has expired" });
      }
      if (discountCode.usageLimit !== null && discountCode.usedCount >= discountCode.usageLimit) {
        return res.status(400).json({ message: "Discount code usage limit reached" });
      }
    }

    // Check if code applies to this package/category
    // Nếu không có packageSlug/category (checkout từ cart với nhiều items), 
    // chỉ validate code nếu code không có ràng buộc về package/category
    if (discountCode.applicablePackages.length > 0) {
      if (!packageSlug) {
        // Nếu code có ràng buộc về packages nhưng không có packageSlug, reject
        return res.status(400).json({
          message: "Discount code requires a specific package. Please apply to individual package checkout.",
        });
      }
      if (!discountCode.applicablePackages.includes(packageSlug)) {
        return res.status(400).json({
          message: "Discount code does not apply to this package",
        });
      }
    }

    if (discountCode.applicableCategories.length > 0) {
      if (!category) {
        // Nếu code có ràng buộc về categories nhưng không có category, reject
        return res.status(400).json({
          message: "Discount code requires a specific category. Please apply to individual package checkout.",
        });
      }
      if (!discountCode.applicableCategories.includes(category)) {
        return res.status(400).json({
          message: "Discount code does not apply to this category",
        });
      }
    }
    
    // Nếu code không có ràng buộc về packages/categories, cho phép validate 
    // (có thể áp dụng cho tất cả items trong cart)

    return res.status(200).json({
      code: discountCode.code,
      discountPercent: discountCode.discountPercent,
      description: discountCode.description,
      valid: true,
    });
  } catch (error) {
    console.error("Validate discount code error:", error);
    return res.status(500).json({ message: "Server error validating discount code" });
  }
};

/**
 * POST /api/discounts/apply
 * Apply discount code (tăng usedCount)
 * Body: { code: string }
 */
export const applyDiscountCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Discount code is required" });
    }

    const discountCode = await DiscountCode.findOne({
      code: code.toUpperCase().trim(),
    });

    if (!discountCode) {
      return res.status(404).json({ message: "Discount code not found" });
    }

    if (!discountCode.isValid()) {
      return res.status(400).json({ message: "Discount code is not valid" });
    }

    // Increment usage
    await discountCode.incrementUsage();

    return res.status(200).json({
      code: discountCode.code,
      discountPercent: discountCode.discountPercent,
      description: discountCode.description,
      applied: true,
    });
  } catch (error) {
    console.error("Apply discount code error:", error);
    return res.status(500).json({ message: "Server error applying discount code" });
  }
};

