// src/routes/packageRoutes.js
import express from "express";
import SubscriptionPackage from "../models/SubscriptionPackage.js";

const router = express.Router();

/**
 * GET /api/packages
 * Có thể filter theo ?category=PC|PlayStation|Xbox|Streaming hoặc All
 */
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;

    const query = {};
    if (category && category !== "All") {
      query.category = category;
    }

    // ❌ nếu có .limit(1), .limit(3) thì bỏ đi
    const packages = await SubscriptionPackage
      .find(query)
      .sort({ createdAt: 1 }); // không limit

    return res.status(200).json(packages);
  } catch (error) {
    console.error("Error fetching packages:", error);
    return res.status(500).json({ message: "Server error fetching packages" });
  }
});


/**
 * GET /api/packages/:slug
 * Lấy chi tiết 1 package theo slug
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const pkg = await SubscriptionPackage.findOne({ slug });

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    return res.status(200).json(pkg);
  } catch (error) {
    console.error("Error fetching package detail:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching package detail" });
  }
});

export default router;
