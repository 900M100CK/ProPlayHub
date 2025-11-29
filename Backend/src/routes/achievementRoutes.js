import express from 'express';
import { getMyAchievementStats } from '../controllers/achievementController.js';
import auth  from '../middlewares/auth.js'; // Giả sử bạn có middleware này

const router = express.Router();

// GET /api/achievements/stats
router.get('/stats', auth, getMyAchievementStats);

export default router;