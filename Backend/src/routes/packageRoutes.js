import express from "express";
import {
  getAllPackages,
  getRecommendedPackages,
} from "../controllers/packageController.js";

const router = express.Router();

router.route("/").get(getAllPackages);
router.route("/recommended").get(getRecommendedPackages);

export default router;