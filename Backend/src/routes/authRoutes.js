import express from "express";
import {
  register,
  login,
  completeProfile,
  verifyEmail,
  getCurrentUser,
  updateProfile,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/authControllers.js";
import { startExpiredOtpCleanupJob } from './src/cron/cleanup.js'; // <-- IMPORT CRON JOB
import auth from '../middlewares/auth.js';


const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/verify-email", verifyEmail);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.post("/change-password", auth, changePassword);

// Protected routes - require authentication
router.get("/me", auth, getCurrentUser);
router.put("/profile", auth, updateProfile);
router.put("/complete-profile", auth, completeProfile);
router.post("/logout", auth, logout);

//Cron Job to clean up expired OTPs and verification tokens
startExpiredOtpCleanupJob();
console.log('✅ Expired token cleanup job scheduled to run daily at midnight.');



export default router;
