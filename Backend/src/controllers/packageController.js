import SubscriptionPackage from "../models/SubscriptionPackage.js";
import asyncHandler from "express-async-handler";

/**
 * @desc    Get all subscription packages
 * @route   GET /api/packages
 * @access  Public
 */
const getAllPackages = asyncHandler(async (req, res) => {
  const packages = await SubscriptionPackage.find({});
  res.json(packages);
});

/**
 * @desc    Get recommended subscription packages based on user preferences or popularity
 * @route   GET /api/packages/recommended
 * @access  Public/User
 */
const getRecommendedPackages = asyncHandler(async (req, res) => {
  const { preferences } = req.query; // e.g., "PC,PlayStation"

  const query = {
    isSeasonalOffer: false, // Recommended packages are not seasonal
  };

  // If user preferences are provided, filter by them
  if (preferences) {
    const preferencesArray = preferences.split(',').filter(p => p); // Split and remove empty strings
    if (preferencesArray.length > 0) {
      // Find packages where the category is one of the user's preferences
      query.category = { $in: preferencesArray };
    }
  }

  // Find packages based on the query
  // Sort by most popular (highest salesCount)
  // Limit the results to a reasonable number, e.g., 10
  const recommendedPackages = await SubscriptionPackage.find(query)
    .sort({ salesCount: -1 })
    .limit(10);

  if (!recommendedPackages) {
    res.status(404);
    throw new Error("No recommended packages found.");
  }

  res.json(recommendedPackages);
});


export { getAllPackages, getRecommendedPackages };