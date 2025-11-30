import express from "express";
import {
  getAllPackages,
  getPackageBySlug,
  getRecommendedPackages,
} from "../controllers/packageController.js";

const router = express.Router();

router.route("/").get(getAllPackages);
router.route("/recommended").get(getRecommendedPackages);
router.route("/:slug").get(getPackageBySlug); // Lấy chi tiết một package

export default router;