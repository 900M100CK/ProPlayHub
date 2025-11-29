import mongoose from 'mongoose';
import Subscription from '../models/userSubscription.js';
import User from '../models/User.js';

/**
 * Tính toán các chỉ số thành tích cho một user cụ thể.
 * @param {string} userId - ID của người dùng.
 * @returns {Promise<object>} - Một object chứa các chỉ số.
 */
export const getAchievementStatsForUser = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { totalPackages: 0, totalSpent: 0, daysOnApp: 0, purchasedSlugs: [] };
    }

    const daysSinceRegistration = Math.floor(
      (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
    );

    const stats = await Subscription.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalPackages: { $sum: 1 },
          totalSpent: { $sum: '$pricePerPeriod' },
          purchasedSlugs: { $addToSet: '$packageSlug' },
        },
      },
    ]);

    return {
      totalPackages: stats[0]?.totalPackages || 0,
      totalSpent: stats[0]?.totalSpent || 0,
      daysOnApp: daysSinceRegistration,
      purchasedSlugs: stats[0]?.purchasedSlugs || [],
    };
  } catch (error) {
    console.error('Error calculating achievement stats for user:', error);
    return { totalPackages: 0, totalSpent: 0, daysOnApp: 0, purchasedSlugs: [] };
  }
};

/**
 * Định nghĩa các thành tích và cấp độ của chúng (giống frontend).
 */
export const getAchievementDefinitions = () => [
  {
    id: '1',
    title: 'Loyal Customer',
    getValue: (s) => s.totalPackages,
    tiers: [
      { level: 'bronze', threshold: 1, description: 'Make your first purchase' },
      { level: 'silver', threshold: 5, description: 'Purchase 5 packages' },
      { level: 'gold', threshold: 10, description: 'Purchase 10 packages' },
    ],
  },
  {
    id: '2',
    title: 'Big Spender',
    getValue: (s) => s.totalSpent,
    tiers: [
      { level: 'bronze', threshold: 50, description: 'Spend over £50' },
      { level: 'silver', threshold: 200, description: 'Spend over £200' },
      { level: 'gold', threshold: 500, description: 'Spend over £500' },
    ],
  },
  // Bạn có thể thêm các định nghĩa khác ở đây
];

/**
 * Tìm cấp độ cao nhất mà người dùng đạt được cho một thành tích.
 * @param {object} definition - Định nghĩa thành tích.
 * @param {object} currentStats - Chỉ số hiện tại của người dùng.
 * @returns {object|null} - Cấp độ cao nhất đạt được hoặc null.
 */
export const getHighestAchievedTier = (definition, currentStats) => {
  if (!currentStats) return null;
  const currentValue = definition.getValue(currentStats);
  const sortedTiers = [...definition.tiers].sort((a, b) => b.threshold - a.threshold);
  return sortedTiers.find((tier) => currentValue >= tier.threshold) || null;
};