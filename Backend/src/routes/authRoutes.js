import express from "express";
import { register, login, completeProfile, verifyEmail, getCurrentUser, updateProfile, logout} from "../controllers/authControllers.js";
import { auth } from '../middlewares/auth.js';


const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/verify-email", verifyEmail);

// Protected routes - require authentication
router.get("/me", auth, getCurrentUser);
router.put("/profile", auth, updateProfile);
router.put("/complete-profile", auth, completeProfile);
router.post("/logout", auth, logout);


export default router;