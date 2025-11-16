import express from "express";
import { register, login, completeProfile, verifyEmail} from "../controllers/authControllers.js";
// import { auth } from '../middlewares/auth';


const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/verify-email", verifyEmail);

// router.put('/profile', auth, completeProfile)


export default router;