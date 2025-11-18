// scripts/seedDiscountCodes.js
import dotenv from "dotenv";
import connectDB from "../src/libs/db.js";
import DiscountCode from "../src/models/DiscountCode.js";

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    await DiscountCode.deleteMany({});
    console.log("🧹 Cleared old discount codes");

    // Tạo expiry date (30 ngày từ bây giờ)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    await DiscountCode.insertMany([
      // ====== 1 ======
      {
        code: "WELCOME10",
        discountPercent: 10,
        description: "Welcome discount for new customers",
        expiryDate: expiryDate,
        usageLimit: 100, // Limited to 100 uses
        usedCount: 0,
        isActive: true,
        applicablePackages: [], // Apply to all packages
        applicableCategories: [], // Apply to all categories
      },

      // ====== 2 ======
      {
        code: "SAVE20",
        discountPercent: 20,
        description: "Save 20% on your subscription",
        expiryDate: expiryDate,
        usageLimit: null, // Unlimited uses
        usedCount: 0,
        isActive: true,
        applicablePackages: [],
        applicableCategories: [],
      },

      // ====== 3 ======
      {
        code: "PCEXCLUSIVE",
        discountPercent: 15,
        description: "Exclusive 15% discount for PC packages",
        expiryDate: expiryDate,
        usageLimit: 50,
        usedCount: 0,
        isActive: true,
        applicablePackages: [],
        applicableCategories: ["PC"], // Only for PC category
      },

      // ====== 4 ======
      {
        code: "BLACKFRIDAY50",
        discountPercent: 50,
        description: "Black Friday special - 50% off",
        expiryDate: expiryDate,
        usageLimit: 200,
        usedCount: 0,
        isActive: true,
        applicablePackages: [],
        applicableCategories: [],
      },

      // ====== 5 ======
      {
        code: "STREAMING25",
        discountPercent: 25,
        description: "25% off on streaming packages",
        expiryDate: expiryDate,
        usageLimit: 75,
        usedCount: 0,
        isActive: true,
        applicablePackages: [],
        applicableCategories: ["Streaming"], // Only for Streaming category
      },

      // ====== 6 ======
      {
        code: "FIRST5",
        discountPercent: 5,
        description: "5% discount for first-time buyers",
        expiryDate: expiryDate,
        usageLimit: null, // Unlimited
        usedCount: 0,
        isActive: true,
        applicablePackages: [],
        applicableCategories: [],
      },

      // ====== 7 ====== (Expired code for testing)
      {
        code: "EXPIRED",
        discountPercent: 30,
        description: "This code has expired",
        expiryDate: new Date("2024-01-01"), // Expired date
        usageLimit: null,
        usedCount: 0,
        isActive: false, // Inactive
        applicablePackages: [],
        applicableCategories: [],
      },
    ]);

    console.log("✅ Seed discount codes done");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
};

seed();

