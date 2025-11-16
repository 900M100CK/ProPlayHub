// src/routes/discountRoutes.js
import express from "express";
import { validateDiscountCode, applyDiscountCode } from "../controllers/discountControllers.js";

const router = express.Router();

/**
 * POST /api/discounts/validate
 * Validate discount code before applying
 */
router.post("/validate", validateDiscountCode);

/**
 * POST /api/discounts/apply
 * Apply discount code (increment usage count)
 */
router.post("/apply", applyDiscountCode);

export default router;

