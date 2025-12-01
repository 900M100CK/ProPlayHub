// src/controllers/subscriptionController.js
import Subscription from '../models/userSubscription.js';
import SubscriptionPackage from '../models/SubscriptionPackage.js';
import User from '../models/User.js';
import { sendSubscriptionReceiptEmail } from '../libs/email.js';
import { Expo } from 'expo-server-sdk';
import {
  getAchievementStatsForUser,
  getAchievementDefinitions,
  getHighestAchievedTier,
} from '../utils/achievementUtils.js';

// Initialize Expo SDK
const expo = new Expo();

const toNumberSafe = (val) => {
  const num = typeof val === 'string' ? Number(val.trim()) : Number(val);
  return Number.isFinite(num) ? num : null;
};

const toCents = (value) => {
  const num = toNumberSafe(value);
  if (num === null) return 0;
  // Keep 4 decimals before converting to cents to avoid binary drift (e.g., 21.47 -> 2147)
  return Math.round(Number(num.toFixed(4)) * 100);
};
const centsToAmount = (cents) => Number((cents / 100).toFixed(2));

const extractDiscountBasisPoints = (pkg) => {
  const percentFromValue = (val) => {
    const num = toNumberSafe(val);
    return num !== null && num > 0 ? num : 0;
  };

  const explicit = percentFromValue(pkg?.discountPercent);
  if (explicit > 0) return Math.round(explicit * 100); // convert percent to basis points

  const label = pkg?.discountLabel;
  if (typeof label === 'string') {
    const match = label.match(/(\d+(?:\.\d+)?)\s*%/);
    if (match) {
      const parsed = percentFromValue(match[1]);
      if (parsed > 0) return Math.round(parsed * 100);
    }
  }

  return 0;
};

export const checkoutSubscription = async (req, res) => {
  try {
    const user = req.user; // populated by auth middleware
    const { packageSlug } = req.body;
    const selectedAddonsRaw = Array.isArray(req.body.selectedAddons) ? req.body.selectedAddons : [];

    // 1. Load package info
    const pkg = await SubscriptionPackage.findOne({ slug: packageSlug });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Capture achievement stats before purchase
    const oldStats = await getAchievementStatsForUser(user._id);

    // 2. Calculate final price (discounts + add-ons) with cent-precise math
    let finalPriceCents = toCents(pkg.basePrice);

    const discountBasisPoints = extractDiscountBasisPoints(pkg); // percent * 100
    if (discountBasisPoints > 0) {
      finalPriceCents = Math.round((finalPriceCents * (10000 - discountBasisPoints)) / 10000);
    }

    const purchasedAddons = [];
    if (selectedAddonsRaw.length) {
      for (const raw of selectedAddonsRaw) {
        const key = typeof raw === 'string' ? raw : raw?.key;
        if (!key) continue;

        const pkgAddon = Array.isArray(pkg.addons) ? pkg.addons.find((a) => a.key === key) : null;
        if (pkgAddon) {
          const addonCents = toCents(pkgAddon.price);
          const addonPrice = centsToAmount(addonCents);
          purchasedAddons.push({ key: pkgAddon.key, name: pkgAddon.name, price: addonPrice });
          finalPriceCents += addonCents;
          continue;
        }

        const payloadName = typeof raw === 'object' && raw?.name ? String(raw.name) : key;
        const payloadPriceRaw =
          typeof raw === 'object' && typeof raw?.price === 'number' && raw.price >= 0 ? Number(raw.price) : 0;
        const addonCents = toCents(payloadPriceRaw);
        const addonPrice = centsToAmount(addonCents);
        purchasedAddons.push({ key, name: payloadName, price: addonPrice });
        finalPriceCents += addonCents;
      }
    }

    const finalPrice = centsToAmount(finalPriceCents);

    // 3. Mock payment approval
    const paymentApproved = true;
    if (!paymentApproved) {
      return res.status(402).json({ message: 'Payment not approved' });
    }

    // 4. Create subscription record
    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    const subscription = await Subscription.create({
      userId: user._id,
      packageId: pkg._id,
      packageSlug: pkg.slug,
      packageName: pkg.name,
      period: pkg.period || 'per month',
      pricePerPeriod: finalPrice,
      purchasedAddons,
      status: 'active',
      startedAt: now,
      nextBillingDate: nextBilling,
    });

    // Process achievements and push notifications asynchronously
    (async () => {
      try {
        const newStats = await getAchievementStatsForUser(user._id);
        const achievementDefinitions = getAchievementDefinitions();
        const userWithToken = await User.findById(user._id).select('+pushToken');

        if (!userWithToken?.pushToken || !Expo.isExpoPushToken(userWithToken.pushToken)) {
          return;
        }

        const notificationsToSend = [];

        achievementDefinitions.forEach((definition) => {
          const oldTier = getHighestAchievedTier(definition, oldStats);
          const newTier = getHighestAchievedTier(definition, newStats);

          if (newTier && (!oldTier || newTier.threshold > oldTier.threshold)) {
            notificationsToSend.push({
              to: userWithToken.pushToken,
              sound: 'default',
              title: 'New Achievement Unlocked!',
              body: `You\'ve reached ${definition.title} (${newTier.level})!`,
              data: { screen: 'achievements' },
            });
          }
        });

        if (notificationsToSend.length > 0) {
          await expo.sendPushNotificationsAsync(notificationsToSend);
        }
      } catch (achievementError) {
        console.error('Error processing achievements and sending notifications:', achievementError);
      }
    })();

    // 5. Send receipt email (do not block response)
    sendSubscriptionReceiptEmail(
      user.email,
      user.fullName || user.username || 'ProPlayHub user',
      subscription
    ).catch((err) => console.error('Subscription receipt email error:', err));

    // 6. Return data for mobile app to display
    return res.status(200).json({
      success: true,
      message: 'Subscription created and payment processed',
      subscription,
    });
  } catch (error) {
    console.error('checkoutSubscription error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
