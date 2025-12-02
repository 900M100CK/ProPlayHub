import express from "express";
import mongoose from "mongoose";
import auth from "../middlewares/auth.js";
import SubscriptionPackage from "../models/SubscriptionPackage.js";
import Subscription from "../models/userSubscription.js";
import DiscountCode from "../models/DiscountCode.js";
import { sendSubscriptionReceiptEmail, sendAddonPurchaseEmail } from "../libs/email.js";

const router = express.Router();

const toNumberSafe = (val) => {
  const num = typeof val === "string" ? Number(val.trim()) : Number(val);
  return Number.isFinite(num) ? num : null;
};

const extractDiscountBasisPoints = (pkg) => {
  const percentFromValue = (val) => {
    const num = toNumberSafe(val);
    return num !== null && num > 0 ? num : 0;
  };

  const explicit = percentFromValue(pkg?.discountPercent);
  if (explicit > 0) return Math.round(explicit * 100); // percent -> basis points

  const label = pkg?.discountLabel;
  if (typeof label === "string") {
    const match = label.match(/(\d+(?:\.\d+)?)\s*%/);
    if (match) {
      const parsed = percentFromValue(match[1]);
      if (parsed > 0) return Math.round(parsed * 100);
    }
  }

  return 0;
};

const toCents = (value) => {
  const num = toNumberSafe(value);
  if (num === null) return 0;
  return Math.round(Number(num.toFixed(4)) * 100);
};
const centsToAmount = (cents) => Number((cents / 100).toFixed(2));

const percentToBasisPoints = (value) => {
  const num = toNumberSafe(value);
  return num !== null && num > 0 ? Math.round(num * 100) : 0;
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const loadValidDiscountCode = async (rawCode, pkg) => {
  if (!rawCode || typeof rawCode !== "string") return null;
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) return null;

  const discountCode = await DiscountCode.findOne({ code: normalized });
  if (!discountCode) {
    throw httpError(404, "Discount code not found.");
  }

  if (!discountCode.isValid()) {
    if (!discountCode.isActive) throw httpError(400, "Discount code is inactive.");
    if (discountCode.expiresAt && new Date() > discountCode.expiresAt) {
      throw httpError(400, "Discount code has expired.");
    }
    if (discountCode.usageLimit !== null && discountCode.usedCount >= discountCode.usageLimit) {
      throw httpError(400, "Discount code usage limit reached.");
    }
    throw httpError(400, "Discount code is not valid.");
  }

  if (Array.isArray(discountCode.applicablePackages) && discountCode.applicablePackages.length) {
    if (!discountCode.applicablePackages.includes(pkg.slug)) {
      throw httpError(400, "Discount code does not apply to this package.");
    }
  }

  if (Array.isArray(discountCode.applicableCategories) && discountCode.applicableCategories.length) {
    if (!discountCode.applicableCategories.includes(pkg.category)) {
      throw httpError(400, "Discount code does not apply to this category.");
    }
  }

  return discountCode;
};

/**
 * POST /api/subscriptions
 * Create a subscription after checkout. Body:
 * {
 *   packageSlug: string,
 *   selectedAddons: [ string | { key, name, price } ]
 * }
 */
router.post("/", auth, async (req, res) => {
  try {
    const { packageSlug, discountCode: discountCodeRaw } = req.body;
    const user = req.user;
    const selectedAddonsRaw = Array.isArray(req.body.selectedAddons) ? req.body.selectedAddons : [];

    if (!packageSlug) return res.status(400).json({ message: "packageSlug is required." });

    const pkg = await SubscriptionPackage.findOne({ slug: packageSlug });
    if (!pkg) return res.status(404).json({ message: "Package not found." });

    const existingActiveSub = await Subscription.findOne({
      userId: user._id,
      packageSlug: pkg.slug,
      status: "active",
    });
    if (existingActiveSub) {
      return res.status(409).json({ message: "You already have an active subscription for this package." });
    }

    // Base price and discount
    let finalPriceCents = toCents(pkg.basePrice);
    const discountBasisPoints = extractDiscountBasisPoints(pkg);
    if (discountBasisPoints > 0) {
      finalPriceCents = Math.round((finalPriceCents * (10000 - discountBasisPoints)) / 10000);
    }

    const purchasedAddons = [];
    if (selectedAddonsRaw.length > 0) {
      for (const raw of selectedAddonsRaw) {
        const key = typeof raw === "string" ? raw : raw?.key;
        if (!key) continue;

        const pkgAddon = Array.isArray(pkg.addons) ? pkg.addons.find((a) => a.key === key) : null;
        if (pkgAddon) {
          const addonCents = toCents(pkgAddon.price);
          const addonPrice = centsToAmount(addonCents);
          finalPriceCents += addonCents;
          purchasedAddons.push({ key: pkgAddon.key, name: pkgAddon.name, price: addonPrice });
          continue;
        }

        const payloadName = typeof raw === "object" && raw?.name ? String(raw.name) : key;
        const payloadPriceRaw =
          typeof raw === "object" && typeof raw?.price === "number" && raw.price >= 0
            ? Number(raw.price)
            : 0;
        const addonCents = toCents(payloadPriceRaw);
        const payloadPrice = centsToAmount(addonCents);
        finalPriceCents += addonCents;
        purchasedAddons.push({ key, name: payloadName, price: payloadPrice });
      }
    }

    let appliedDiscount = null;
    let discountCodeDoc = null;

    if (discountCodeRaw) {
      discountCodeDoc = await loadValidDiscountCode(discountCodeRaw, pkg);
      const promoBasisPoints = percentToBasisPoints(discountCodeDoc?.discountPercent);
      if (promoBasisPoints > 0) {
        const adjusted = Math.round((finalPriceCents * (10000 - promoBasisPoints)) / 10000);
        const savingsCents = Math.max(0, finalPriceCents - adjusted);
        finalPriceCents = Math.max(0, adjusted);
        appliedDiscount = {
          code: discountCodeDoc.code,
          percent: discountCodeDoc.discountPercent,
          amount: centsToAmount(savingsCents),
        };
      }
    }

    const finalPrice = centsToAmount(finalPriceCents);

    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const sub = await Subscription.create({
      userId: user._id,
      packageId: pkg._id,
      packageSlug: pkg.slug,
      packageName: pkg.name,
      period: pkg.period || "/month",
      pricePerPeriod: finalPrice,
      purchasedAddons,
      appliedDiscount,
      startedAt: now,
      nextBillingDate,
      status: "active",
    });

    if (discountCodeDoc) {
      await discountCodeDoc.incrementUsage();
    }

    sendSubscriptionReceiptEmail(user.email, user.name, sub).catch((err) =>
      console.error("Handled: Failed to send subscription receipt email:", err)
    );

    return res.status(201).json(sub);
  } catch (err) {
    console.error("Create subscription error:", err);
    if (err?.status) {
      return res.status(err.status).json({ message: err.message });
    }
    return res.status(500).json({ message: "Server error creating subscription" });
  }
});

/**
 * POST /api/subscriptions/upgrade-addons
 * Add additional add-ons to an active subscription (charges add-ons only)
 * Body: { packageSlug: string, selectedAddons: [{ key, name, price }] }
 */
router.post("/upgrade-addons", auth, async (req, res) => {
  try {
    const { packageSlug } = req.body;
    const selectedAddonsRaw = Array.isArray(req.body.selectedAddons) ? req.body.selectedAddons : [];
    if (!packageSlug) return res.status(400).json({ message: "packageSlug is required." });
    if (!selectedAddonsRaw.length) return res.status(400).json({ message: "No add-ons provided." });

    const userId = req.user._id;
    const pkg = await SubscriptionPackage.findOne({ slug: packageSlug });
    if (!pkg) return res.status(404).json({ message: "Package not found." });

    const sub = await Subscription.findOne({ userId, packageSlug: pkg.slug, status: "active" });
    if (!sub) return res.status(404).json({ message: "Active subscription not found for this package." });

    const existingKeys = new Set((sub.purchasedAddons || []).map((a) => a.key));
    let chargeCents = 0;
    const addonsToAppend = [];

    for (const raw of selectedAddonsRaw) {
      const key = typeof raw === "string" ? raw : raw?.key;
      if (!key || existingKeys.has(key)) continue;

      const pkgAddon = Array.isArray(pkg.addons) ? pkg.addons.find((a) => a.key === key) : null;
      if (pkgAddon) {
        const addonCents = toCents(pkgAddon.price);
        chargeCents += addonCents;
        addonsToAppend.push({ key: pkgAddon.key, name: pkgAddon.name, price: centsToAmount(addonCents) });
        existingKeys.add(key);
        continue;
      }

      const payloadName = typeof raw === "object" && raw?.name ? String(raw.name) : key;
      const rawPrice =
        typeof raw === "object" && typeof raw?.price === "number" && raw.price >= 0 ? Number(raw.price) : 0;
      const addonCents = toCents(rawPrice);
      chargeCents += addonCents;
      addonsToAppend.push({ key, name: payloadName, price: centsToAmount(addonCents) });
      existingKeys.add(key);
    }

    if (!addonsToAppend.length) {
      return res.status(400).json({ message: "No new add-ons to upgrade." });
    }

    const chargeTotal = centsToAmount(chargeCents);
    sub.purchasedAddons = [...(sub.purchasedAddons || []), ...addonsToAppend];
    sub.pricePerPeriod = Number((Number(sub.pricePerPeriod || 0) + chargeTotal).toFixed(2));
    await sub.save();

    sendAddonPurchaseEmail(req.user.email, req.user.name || req.user.username || "ProPlayHub user", {
      packageName: pkg.name,
      packageSlug: pkg.slug,
      addons: addonsToAppend,
      chargeTotal,
    }).catch((err) => console.error("Handled: Failed to send add-on purchase email:", err));

    return res.status(200).json({
      message: "Add-ons upgraded successfully",
      chargeTotal,
      addedAddons: addonsToAppend,
      subscription: sub,
    });
  } catch (err) {
    console.error("Upgrade add-ons error:", err);
    return res.status(500).json({ message: "Server error upgrading add-ons" });
  }
});

/**
 * GET /api/subscriptions/me
 */
router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const subs = await Subscription.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json(subs);
  } catch (err) {
    console.error("Fetch my subscriptions error:", err);
    return res.status(500).json({ message: "Server error fetching subscriptions" });
  }
});

/**
 * DELETE /api/subscriptions/:id
 */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid subscription id." });
    }

    const updated = await Subscription.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: false,
      }
    );

    if (!updated) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    return res.json({ message: "Subscription cancelled", subscription: updated });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    return res.status(500).json({ message: "Server error cancelling subscription" });
  }
});

export default router;
