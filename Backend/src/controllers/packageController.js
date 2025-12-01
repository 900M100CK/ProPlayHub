import Package from "../models/SubscriptionPackage.js";
import User from "../models/User.js";

/**
 * GET /api/packages
 * Lấy tất cả các package, có thể tìm kiếm và lọc.
 */
export const getAllPackages = async (req, res) => {
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
    console.error("GET /api/packages error:", err);
    res.status(500).json({ message: "Failed to load packages." });
  }
};

/**
 * GET /api/packages/recommended
 * Lấy các package được đề xuất dựa trên sở thích của người dùng.
 */
export const getRecommendedPackages = async (req, res) => {
  // Logic này được chuyển từ crmRoutes.js
  try {
    // Giả sử route này cần xác thực người dùng
    const user = await User.findById(req.user?._id).select('gamingPlatformPreferences');
    const preferences = user?.gamingPlatformPreferences || [];

    const query = { isSeasonalOffer: false };
    if (preferences.length > 0) {
      query.category = { $in: preferences };
    }

    let recommendedPackages = await Package.find(query).sort({ salesCount: -1 });

    if (recommendedPackages.length === 0 && preferences.length > 0) {
        recommendedPackages = await Package.find({ isSeasonalOffer: false }).sort({ salesCount: -1 });
    }

    res.json(recommendedPackages);
  } catch (err) {
    console.error("GET /api/packages/recommended error:", err);
    res.status(500).json({ message: "Failed to load recommended packages." });
  }
};

/**
 * GET /api/packages/:slug
 * Lấy chi tiết một package bằng slug.
 */
export const getPackageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const pkg = await Package.findOne({ slug: slug.toLowerCase() });
    if (!pkg) {
      return res.status(404).json({ message: "Package not found." });
    }
    res.json(pkg);
  } catch (err) {
    console.error(`GET /api/packages/${req.params.slug} error:`, err);
    res.status(500).json({ message: "Failed to load package detail." });
  }
};
