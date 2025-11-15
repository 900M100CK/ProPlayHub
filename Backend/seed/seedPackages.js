// scripts/seedPackages.js
import dotenv from "dotenv";
import connectDB from "../src/libs/db.js";
import SubscriptionPackage from "../src/models/SubscriptionPackage.js";

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    await SubscriptionPackage.deleteMany({});
    console.log("🧹 Cleared old packages");

    await SubscriptionPackage.insertMany([
      // ====== 1 ======
      {
        name: "Black Friday PC Elite",
        slug: "black-friday-pc-elite",
        category: "PC",
        type: "Platform-Specific Package",
        basePrice: 24.99,
        period: "/month",
        discountLabel: "Black Friday 50% OFF",
        features: ["Multiplayer Access", "Cloud Saves (100GB)", "Game Streaming 4K"],
        isSeasonalOffer: true,
        tags: ["black-friday", "sale"],
      },

      // ====== 2 ======
      {
        name: "PC Gaming Elite",
        slug: "pc-gaming-elite",
        category: "PC",
        type: "Platform-Specific Package",
        basePrice: 29.99,
        period: "/month",
        discountLabel: "15% OFF",
        features: ["Multiplayer Access", "Cloud Saves (50GB)", "Game Streaming"],
        isSeasonalOffer: false,
      },

    {   name: "Streaming Bundle",
        slug: "streaming-bundle",
        category: "Streaming",
        type: "Game Streaming Package",
        basePrice: 19.99,
        period: "/month",
        discountLabel: "35% OFF",
        features: ["Game Rentals (5/month)", "Cloud Saves (20GB)", "Priority Streaming"],
        isSeasonalOffer: true,
         tags: ["black-friday", "sale"],
      },
      // ====== 3 ======

      // ====== 4 ======
      {
        name: "PlayStation Online Plus",
        slug: "ps-online-plus",
        category: "PlayStation",
        type: "Platform-Specific Package",
        basePrice: 24.99,
        period: "/month",
        features: ["Online Multiplayer", "Monthly Free Games", "Exclusive Discounts"],
        isSeasonalOffer: false,
      },

      // ====== 5 ======
      {
        name: "Xbox Game Master",
        slug: "xbox-game-master",
        category: "Xbox",
        type: "Platform-Specific Package",
        basePrice: 19.99,
        period: "/month",
        discountLabel: "10% OFF",
        features: ["Full Xbox Store Access", "Cloud Save Sync", "Early Beta Access"],
        isSeasonalOffer: false,
      },

      // ====== 6 ======
      {
        name: "PC Ultimate Multiplayer",
        slug: "pc-ultimate-multiplayer",
        category: "PC",
        type: "Multiplayer Package",
        basePrice: 34.99,
        period: "/month",
        features: ["Anti-Lag Multiplayer", "100GB Cloud Saves", "Esport Server Access"],
        isSeasonalOffer: false,
      },

      // ====== 7 ======
      {
        name: "Cloud Gaming Ultra",
        slug: "cloud-gaming-ultra",
        category: "Streaming",
        type: "Game Streaming Package",
        basePrice: 14.99,
        period: "/month",
        features: ["Unlimited Cloud Gaming", "Ultra Low Latency"],
        isSeasonalOffer: false,
      },

      // ====== 8 ======
      {
        name: "PlayStation Premium Max",
        slug: "ps-premium-max",
        category: "PlayStation",
        type: "Premium Subscription",
        basePrice: 39.99,
        period: "/month",
        discountLabel: "20% OFF",
        features: ["Full Game Catalog", "PS Cloud Streaming", "Exclusive Game Trials"],
        isSeasonalOffer: true,
      },

      // ====== 9 ======
      {
        name: "Streamer Pro Pack",
        slug: "streamer-pro-pack",
        category: "Streaming",
        type: "Creator Package",
        basePrice: 12.99,
        period: "/month",
        features: ["1080p Game Streaming", "Ad-Free Experience"],
        isSeasonalOffer: false,
      },

      // ====== 10 ======
      {
        name: "PC Esport Challenger",
        slug: "pc-esport-challenger",
        category: "PC",
        type: "Esport Package",
        basePrice: 27.99,
        period: "/month",
        discountLabel: "25% OFF",
        features: ["Esport Tier Servers", "Dedicated Game Profiles"],
        isSeasonalOffer: false,
      },
    ]);

    console.log("✅ Seed packages done");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
};

seed();
