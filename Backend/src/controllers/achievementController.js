import { getAchievementStatsForUser } from '../utils/achievementUtils.js';

/**
 * @desc    Get achievement stats for the logged-in user
 * @route   GET /api/achievements/stats
 * @access  Private
 */
export const getMyAchievementStats = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy từ auth middleware

    const stats = await getAchievementStatsForUser(userId);

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    res.status(500).json({ message: 'Server error while fetching achievement stats.' });
  }
};