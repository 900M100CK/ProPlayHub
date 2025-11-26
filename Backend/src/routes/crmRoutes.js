import express from "express";
import User from "../models/User.js";
import DiscountCode from "../models/DiscountCode.js";

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

export default router;