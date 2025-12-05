import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiClient from '../api/axiosConfig';
import ScreenHeader from '../components/ScreenHeader';
import { useCartStore } from '../stores/cartStore';
import type { CartItem, SelectedAddon } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/ToastProvider';
import { colors, spacing, radius, shadow } from '../styles/theme';
import { API_BASE_URL } from '../utils/apiConfig';

const PAYMENT_METHOD_STORAGE_KEY = 'selectedPaymentMethod';

const keyForUser = (userId: string | null | undefined) =>
  `${PAYMENT_METHOD_STORAGE_KEY}:${userId ?? 'guest'}`;

const extractDiscountPercent = (
  label?: string,
  explicitPercent?: number | null
): number | null => {
  if (typeof explicitPercent === 'number' && explicitPercent > 0) {
    return explicitPercent;
  }
  if (!label) return null;
  const match = label.match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) : null;
};

const calculateDiscountedPrice = (
  basePrice: number,
  discountLabel?: string,
  explicitPercent?: number | null
) => {
  const percent = extractDiscountPercent(discountLabel, explicitPercent);
  if (!percent) {
    return Number(basePrice.toFixed(2));
  }
  const discounted = basePrice * (1 - percent / 100);
  return Number(discounted.toFixed(2));
};

type PaymentMethod = {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  brand?: string;
  last4?: string;
  name: string;
  detail: string;
};

type ApiPackage = {
  _id: string;
  slug: string;
  name: string;
  category: string;
  type: string;
  basePrice: number;
  period: string;
  discountLabel?: string;
  discountPercent?: number;
  features?: string[];
  isSeasonalOffer?: boolean;
  tags?: string[];
};
type Addon = { key: string; name: string; price: number };
type CheckoutAddonOption = Addon & { isFallback?: boolean };

const packageToCartItem = (pkg: ApiPackage): CartItem => ({
  _id: pkg._id,
  slug: pkg.slug,
  name: pkg.name,
  category: pkg.category,
  type: pkg.type,
  basePrice: pkg.basePrice,
  period: pkg.period || '/month',
  discountLabel: pkg.discountLabel,
  features: pkg.features || [],
  isSeasonalOffer: Boolean(pkg.isSeasonalOffer),
  tags: pkg.tags,
  finalPrice: calculateDiscountedPrice(pkg.basePrice, pkg.discountLabel, pkg.discountPercent),
  selectedAddons: [],
});

const FALLBACK_FEATURE_PRICES: Record<string, number> = {
  'Full Game Catalog': 14.99,
  'PS Cloud Streaming': 9.99,
  'Exclusive Game Trials': 7.99,
  'Multiplayer Access': 4.99,
  'Cloud Saves (100GB)': 3.99,
};
const FALLBACK_FEATURE_DEFAULT_PRICE = 4.99;

const getMethodIcon = (method: PaymentMethod | null) => {
  if (!method) return 'card-outline' as const;
  if (method.type === 'paypal') return 'logo-paypal' as const;
  if (method.type === 'bank') return 'business-outline' as const;
  return 'card-outline' as const;
};

const CheckoutScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user, accessToken } = useAuthStore();
  const items = useCartStore((state) => state.items);
  const loadCartFromStorage = useCartStore((state) => state.loadCartFromStorage);
  const clearCart = useCartStore((state) => state.clearCart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const isInCart = useCartStore((state) => state.isInCart);
  const params = useLocalSearchParams<{ slug?: string | string[]; selectedAddons?: string; upgrade?: string }>();
  const slugParam = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const isUpgradeFlow = params.upgrade === '1';
  const selectedAddonsParam = useMemo(() => {
    if (!params.selectedAddons) {
      return [];
    }
    try {
      return JSON.parse(params.selectedAddons);
    } catch (err) {
      console.warn('Invalid selectedAddons param:', err);
      return [];
    }
  }, [params.selectedAddons]);
  const isCartCheckout = !slugParam;
  const selectedAddonKeys = useMemo(() => {
    if (!Array.isArray(selectedAddonsParam)) return [];
    return selectedAddonsParam
      .map((addon: any) => (typeof addon === 'string' ? addon : addon?.key))
      .filter(Boolean);
  }, [selectedAddonsParam]);

  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [addonSelections, setAddonSelections] = useState<
    Record<string, { available: CheckoutAddonOption[]; selected: string[] }>
  >({});
  const [basePackagePrices, setBasePackagePrices] = useState<Record<string, number>>({});
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number; description?: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const fetchedAddonSlugsRef = useRef<Set<string>>(new Set());

  const buildFallbackAddons = (item: CartItem): CheckoutAddonOption[] => {
    if (!item.features?.length) return [];
    return item.features.map((feature, index) => ({
      key: `${item.slug}-feature-${index}`,
      name: feature,
      price: FALLBACK_FEATURE_PRICES[feature] ?? FALLBACK_FEATURE_DEFAULT_PRICE,
      isFallback: true,
    }));
  };

  useEffect(() => {
    let isMounted = true;
    const loadMethod = async () => {
      try {
        const key = keyForUser(user?._id);
        const stored = await AsyncStorage.getItem(key);
        if (!isMounted) return;
        setPaymentMethod(stored ? JSON.parse(stored) : null);
      } catch (err) {
        console.error('Failed to load payment method:', err);
        if (isMounted) {
          setPaymentMethod(null);
        }
      }
    };
    loadMethod();
    return () => {
      isMounted = false;
    };
  }, [user?._id]);

  useEffect(() => {
    if (!slugParam) return;
    let isMounted = true;
    const fetchPackage = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/api/packages/${slugParam}`);
        const data = (await res.json()) as ApiPackage & { message?: string; addons?: Addon[] };
        if (!res.ok) {
          throw new Error(data?.message || 'Package not found.');
        }
        if (isMounted) {
          const apiAddons: CheckoutAddonOption[] = Array.isArray(data.addons)
            ? data.addons.map((addon) => ({ ...addon }))
            : [];
          const availableAddons: CheckoutAddonOption[] = apiAddons.length
            ? apiAddons
            : buildFallbackAddons(packageToCartItem(data));
          const selectedAddonDetails = availableAddons.filter((addon) =>
            selectedAddonKeys.includes(addon.key)
          );

          const discountedBasePrice = isUpgradeFlow
            ? 0
            : calculateDiscountedPrice(data.basePrice, data.discountLabel, data.discountPercent);
          const addonsPrice = selectedAddonDetails.reduce(
            (sum: number, addon: Addon) => sum + addon.price,
            0
          );
          const finalPrice = Number((discountedBasePrice + addonsPrice).toFixed(2));

          const cartItem = packageToCartItem(data);
          cartItem.finalPrice = finalPrice;
          const selectedAddons: SelectedAddon[] = selectedAddonDetails.map((addon: Addon) => ({
            key: addon.key,
            name: addon.name,
            price: addon.price,
          }));

          cartItem.selectedAddons = selectedAddons;

          setCheckoutItems([cartItem]);
          setBasePackagePrices((prev) => ({
            ...prev,
            [data.slug]: Number(discountedBasePrice.toFixed(2)),
          }));
          setAddonSelections((prev) => ({
            ...prev,
            [data.slug]: {
              available: availableAddons,
              selected: selectedAddons.map((addon) => addon.key),
            },
          }));
        }
      } catch (err) {
        console.error('Checkout load error:', err);
        if (isMounted) {
          setCheckoutItems([]);
          setError(err instanceof Error ? err.message : 'Failed to load package.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchPackage();
    return () => {
      isMounted = false;
    };
  }, [slugParam, selectedAddonsParam]);

  useEffect(() => {
    if (slugParam) return;
    let isMounted = true;
    const hydrateCart = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadCartFromStorage();
        if (isMounted) {
          setCheckoutItems(useCartStore.getState().items);
        }
      } catch (err) {
        console.error('Checkout cart load error:', err);
        if (isMounted) {
          setCheckoutItems([]);
          setError('Unable to load cart right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    hydrateCart();
    return () => {
      isMounted = false;
    };
  }, [slugParam, loadCartFromStorage]);

  useEffect(() => {
    if (slugParam) return;
    if (!items || !items.length) {
      setCheckoutItems([]);
      return;
    }
    setCheckoutItems(items);
    const baseUpdates: Record<string, number> = {};
    items.forEach((item) => {
      const selected = Array.isArray(item.selectedAddons) ? item.selectedAddons : [];
      const addonsSum = selected.reduce((sum, addon) => sum + addon.price, 0);
      baseUpdates[item.slug] = Number((item.finalPrice - addonsSum).toFixed(2));
    });

    setBasePackagePrices((prev) => ({ ...prev, ...baseUpdates }));
    setAddonSelections((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        const selectedKeys = (Array.isArray(item.selectedAddons) ? item.selectedAddons : []).map(
          (addon) => addon.key
        );
        const existing = next[item.slug];
        const available =
          existing?.available?.length ? existing.available : buildFallbackAddons(item);
        next[item.slug] = {
          available,
          selected: selectedKeys,
        };
      });
      return next;
    });
  }, [items, slugParam]);

  useEffect(() => {
    const activeSlugs = new Set(checkoutItems.map((item) => item.slug));
    fetchedAddonSlugsRef.current.forEach((slug) => {
      if (!activeSlugs.has(slug)) {
        fetchedAddonSlugsRef.current.delete(slug);
      }
    });

    const slugsToFetch = checkoutItems
      .map((item) => item.slug)
      .filter((slug, index, arr) => arr.indexOf(slug) === index)
      .filter((slug) => {
        if (fetchedAddonSlugsRef.current.has(slug)) return false;
        const entry = addonSelections[slug];
        if (!entry) return true;
        if (!entry.available?.length) return true;
        const hasOnlyFallback = entry.available.every((addon) => addon.isFallback);
        return hasOnlyFallback;
      });
    if (!slugsToFetch.length) return;

    let cancelled = false;
    const loadAddons = async () => {
      try {
        const results = await Promise.all(
          slugsToFetch.map(async (slug) => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/packages/${slug}`);
              if (!res.ok) throw new Error(`Failed to load ${slug}`);
              const data = await res.json();
              const addons: CheckoutAddonOption[] = Array.isArray(data.addons)
                ? data.addons.map((addon: CheckoutAddonOption) => ({ ...addon }))
                : [];
              return { slug, addons };
            } catch (error) {
              console.error(`Failed to load add-ons for ${slug}:`, error);
              return { slug, addons: [] };
            }
          })
        );
        if (cancelled) return;
        const selectionMap: Record<string, string[]> = {};
        const addonMap: Record<string, CheckoutAddonOption[]> = {};
        results.forEach(({ slug }) => fetchedAddonSlugsRef.current.add(slug));
        setAddonSelections((prev) => {
          const next = { ...prev };
          results.forEach(({ slug, addons }) => {
            const existing = next[slug];
            const existingSelection = existing?.selected || [];
            const existingAvailable = existing?.available || [];
            const hasFetchedAddons = addons.length > 0;
            const availableAddons = hasFetchedAddons ? addons : existingAvailable;
            const filteredSelection = hasFetchedAddons
              ? existingSelection.filter((key) => availableAddons.some((addon) => addon.key === key))
              : existingSelection;
            selectionMap[slug] = filteredSelection;
            addonMap[slug] = availableAddons;
            next[slug] = {
              available: availableAddons,
              selected: filteredSelection,
            };
          });
          return next;
        });
        setCheckoutItems((prev) =>
          prev.map((item) => {
            const addons = addonMap[item.slug];
            if (!addons) return item;
            const selectedKeys = selectionMap[item.slug] || [];
            const selectedAddons = addons
              .filter((addon) => selectedKeys.includes(addon.key))
              .map(({ key, name, price }) => ({ key, name, price }));
            const basePrice = basePackagePrices[item.slug] ?? (() => {
              const previousAddons = Array.isArray(item.selectedAddons)
                ? item.selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
                : 0;
              return Number((item.finalPrice - previousAddons).toFixed(2));
            })();
            const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
            return {
              ...item,
              selectedAddons,
              finalPrice: Number((basePrice + addonsTotal).toFixed(2)),
            };
          })
        );
      } catch (error) {
        console.error('Failed to fetch add-on definitions:', error);
      }
    };

    loadAddons();
    return () => {
      cancelled = true;
    };
  }, [checkoutItems, addonSelections, basePackagePrices]);

  useEffect(() => {
    if (!checkoutItems.length) {
      setAppliedPromo(null);
      setPromoCodeInput('');
      setPromoError(null);
    }
  }, [checkoutItems.length]);
  const baseSubtotal = useMemo(() => {
    if (isUpgradeFlow) return 0;
    return checkoutItems.reduce((sum, item) => {
      const addonSum = Array.isArray(item.selectedAddons)
        ? item.selectedAddons.reduce((s, addon) => s + addon.price, 0)
        : 0;
      const cachedBase = basePackagePrices[item.slug];
      const basePrice =
        typeof cachedBase === 'number' ? cachedBase : Number((item.finalPrice - addonSum).toFixed(2));
      return sum + basePrice;
    }, 0);
  }, [checkoutItems, basePackagePrices, isUpgradeFlow]);

  const addonsTotal = useMemo(() => {
    if (!checkoutItems.length) return 0;
    return checkoutItems.reduce((sum, item) => {
      if (!Array.isArray(item.selectedAddons)) return sum;
      const addonSum = item.selectedAddons.reduce(
        (addonTotal: number, addon: SelectedAddon) => addonTotal + addon.price,
        0
      );
      return sum + addonSum;
    }, 0);
  }, [checkoutItems]);
  const subtotalBeforePromo = useMemo(
    () => Number((baseSubtotal + addonsTotal).toFixed(2)),
    [baseSubtotal, addonsTotal]
  );
  const promoDiscountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    const percent = typeof appliedPromo.percent === 'number' ? appliedPromo.percent : 0;
    if (!percent || percent <= 0) return 0;
    const discounted = (subtotalBeforePromo * percent) / 100;
    return Number(discounted.toFixed(2));
  }, [appliedPromo, subtotalBeforePromo]);
  const total = useMemo(
    () => Number(Math.max(0, subtotalBeforePromo - promoDiscountAmount).toFixed(2)),
    [subtotalBeforePromo, promoDiscountAmount]
  );
  const hasItems = checkoutItems.length > 0;
  const headerSubtitle = slugParam ? 'Confirm your subscription' : 'Review your cart';

  const toggleAddonSelection = (slug: string, addonKey: string) => {
    setAddonSelections((prev) => {
      let entry = prev[slug];
      if (!entry) {
        const item = checkoutItems.find((pkg) => pkg.slug === slug);
        const fallback = item ? buildFallbackAddons(item) : [];
        if (!fallback.length) return prev;
        entry = { available: fallback, selected: [] };
      }
      const isSelected = entry.selected.includes(addonKey);
      const updatedSelected = isSelected
        ? entry.selected.filter((key) => key !== addonKey)
        : [...entry.selected, addonKey];

      setCheckoutItems((prevItems) =>
        prevItems.map((item) => {
          if (item.slug !== slug) return item;
          const selectedAddons = entry.available
            .filter((addon) => updatedSelected.includes(addon.key))
            .map(({ key, name, price }) => ({ key, name, price }));
          const addonsTotalPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
          const previousAddonsTotal = Array.isArray(item.selectedAddons)
            ? item.selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
            : 0;
          const cachedBase = basePackagePrices[slug];
          const basePrice =
            typeof cachedBase === 'number' ? cachedBase : Number((item.finalPrice - previousAddonsTotal).toFixed(2));
          return {
            ...item,
            selectedAddons,
            finalPrice: Number((basePrice + addonsTotalPrice).toFixed(2)),
          };
        })
      );

      return {
        ...prev,
        [slug]: { ...entry, selected: updatedSelected },
      };
    });
  };

  const handleApplyPromo = async () => {
    const code = promoCodeInput.trim();
    if (!code) {
      setPromoError('Enter a promo code to apply.');
      return;
    }
    if (!checkoutItems.length) {
      setPromoError('Add a package before applying a code.');
      return;
    }

    setPromoLoading(true);
    setPromoError(null);
    try {
      const anchor = checkoutItems[0];
      const res = await fetch(`${API_BASE_URL}/api/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          packageSlug: anchor?.slug,
          category: anchor?.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Unable to apply this code.');
      }
      const percent = Number(data?.discountPercent);
      if (!percent || percent <= 0) {
        throw new Error('This code is not offering a discount right now.');
      }
      setAppliedPromo({
        code: (data?.code || code).toUpperCase(),
        percent,
        description: data?.description,
      });
      showToast({
        type: 'success',
        title: 'Code applied',
        message: `${percent}% off has been applied to your order.`,
      });
    } catch (err: any) {
      const message = err?.message || 'Unable to apply this code.';
      setPromoError(message);
      showToast({
        type: 'error',
        title: 'Promo Code failed',
        message,
      });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError(null);
  };

  const handlePlaceOrder = async () => {
    if (!hasItems) {
      showToast({
        type: 'info',
        title: 'Cart is empty',
        message: 'Add at least one package before checking out.',
      });
      return;
    }

    if (!accessToken || !user) {
      showToast({
        type: 'info',
        title: 'Sign-in required',
        message: 'Please log in to continue.',
        action: {
          label: 'Go to login',
          onPress: () => router.replace('./login'),
        },
      });
      return;
    }

    if (!paymentMethod) {
      showToast({
        type: 'info',
        title: 'Choose Payment Methods',
        message: 'Select a payment method before confirming.',
        action: {
          label: 'Select method',
          onPress: () => router.push('./paymentMethods'),
        },
      });
      return;
    }

    // Snapshot current items before any mutations (clear cart, etc.)
    const summaryItem = checkoutItems[0];

    const buildSelectedAddonsPayload = (item: CartItem) =>
      Array.isArray(item.selectedAddons)
        ? item.selectedAddons.map(({ key, name, price }) => ({ key, name, price }))
        : [];

    setProcessing(true);
    try {
      if (isUpgradeFlow) {
        const item = summaryItem || checkoutItems[0];
        const payloadAddons = buildSelectedAddonsPayload(item);
        const res = await apiClient.post('/subscriptions/upgrade-addons', {
          packageSlug: item.slug,
          selectedAddons: payloadAddons,
        });
        const chargeTotal = Number(res?.data?.chargeTotal || 0);
        const purchasedAddons =
          Array.isArray(res?.data?.addedAddons) && res.data.addedAddons.length
            ? res.data.addedAddons
            : payloadAddons;

        showToast({
          type: 'success',
          title: 'Upgrade successful',
          message: 'Your add-ons are now active.',
        });

        router.replace({
          pathname: './orderConfirmation',
          params: {
            packageName: item?.name || 'Your subscription',
            price: chargeTotal.toFixed(2),
            period: item?.period || '/month',
            addons: JSON.stringify(purchasedAddons),
            upgrade: '1',
          },
        });
        return;
      }

      for (const item of checkoutItems) {
        const payload = {
          packageSlug: item.slug,
          selectedAddons: buildSelectedAddonsPayload(item),
          discountCode: appliedPromo?.code,
        };
        await apiClient.post('/subscriptions', payload);
      }

      if (slugParam) {
        if (isInCart(slugParam)) {
          await removeFromCart(slugParam);
        }
      } else {
        await clearCart();
      }

      showToast({
        type: 'success',
        title: 'Subscription activated',
        message: 'You are ready to play!',
      });

      const firstItem = summaryItem || checkoutItems[0];
      const stateAddons = Array.isArray(firstItem?.selectedAddons) ? firstItem.selectedAddons : [];
      const summaryPrice = total;
      const purchasedAddons =
        stateAddons.length > 0
          ? stateAddons.map((addon) => ({
              name: addon.name,
              price: addon.price,
            }))
          : [];

      router.replace({
        pathname: './orderConfirmation',
        params: {
          packageName: firstItem?.name || 'Your subscription',
          price: summaryPrice.toFixed(2),
          period: firstItem?.period || '/month',
          addons: JSON.stringify(purchasedAddons),
        },
      });
    } catch (err: any) {
      console.error('Checkout failed:', err);
      const message = err?.response?.data?.message || err?.message || 'Unable to complete checkout.';
      showToast({
        type: 'error',
        title: 'Checkout failed',
        message,
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!accessToken || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Checkout" subtitle="Sign in to continue" />
        <View style={styles.body}>
          <View style={styles.lockWrapper}>
            <View style={styles.lockCard}>
              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.lockTextGroup}>
                <Text style={styles.lockTitle}>Sign in to continue</Text>
                <Text style={styles.lockSubtitle}>
                  Keep your checkout secure by signing in with your ProPlay account first.
                </Text>
              </View>
              <TouchableOpacity style={styles.lockButton} onPress={() => router.push('./login')}>
                <Text style={styles.lockButtonText}>Sign in now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Checkout" subtitle={headerSubtitle} />
      <View style={styles.body}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Preparing your checkout...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={60} color={colors.danger} />
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (slugParam) {
                  router.back();
                } else {
                  router.push('./subscriptionCategories');
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>Choose another package</Text>
            </TouchableOpacity>
          </View>
        ) : hasItems ? (
          <>
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Your selection</Text>
                  {isCartCheckout && (
                    <TouchableOpacity onPress={() => router.push('./cart')}>
                      <Text style={styles.linkText}>Edit cart</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {checkoutItems.map((item) => {
                  const addonEntry = addonSelections[item.slug];
                  const availableAddons = addonEntry?.available || [];
                  const selectedKeys = addonEntry?.selected || [];
                  const selectedAddons = Array.isArray(item.selectedAddons)
                    ? (item.selectedAddons as SelectedAddon[])
                    : [];
                  const showAddons = availableAddons.length > 0;

                  return (
                    <View key={item.slug} style={styles.itemRow}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.discountLabel && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{item.discountLabel}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.itemType}>{item.type}</Text>
                      {!isUpgradeFlow && (() => {
                        const addonSum = Array.isArray(item.selectedAddons)
                          ? item.selectedAddons.reduce((sum, addon) => sum + addon.price, 0)
                          : 0;
                        const cachedBase = basePackagePrices[item.slug];
                        const basePrice =
                          typeof cachedBase === 'number'
                            ? cachedBase
                            : Number((item.finalPrice - addonSum).toFixed(2));
                        return (
                          <Text style={styles.itemPrice}>
                            ${basePrice.toFixed(2)}
                            <Text style={styles.itemPeriod}> {item.period}</Text>
                          </Text>
                        );
                      })()}

                      {showAddons ? (
                        isUpgradeFlow ? (
                          <View style={styles.addonsList}>
                            <Text style={styles.addonsLabel}>Selected add-ons</Text>
                            {selectedAddons.map((addon) => (
                              <View key={addon.key} style={styles.addonRow}>
                                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                                <Text style={styles.addonName}>{addon.name}</Text>
                                <Text style={styles.addonPrice}>+${addon.price.toFixed(2)}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.addonsSelector}>
                            <Text style={styles.addonsLabel}>Add-on options</Text>
                            {availableAddons.map((addon) => {
                              const selected = selectedKeys.includes(addon.key);
                              return (
                                <TouchableOpacity
                                  key={addon.key}
                                  style={styles.addonToggleRow}
                                  onPress={() => toggleAddonSelection(item.slug, addon.key)}
                                  activeOpacity={0.7}
                                >
                                  <View
                                    style={[
                                      styles.checkbox,
                                      selected && styles.checkboxSelected,
                                    ]}
                                  >
                                    {selected && (
                                      <Ionicons name="checkmark" size={12} color="#fff" />
                                    )}
                                  </View>
                                  <View style={styles.addonToggleTextGroup}>
                                    <Text style={styles.addonName}>{addon.name}</Text>
                                    <Text style={styles.addonTogglePrice}>+${addon.price.toFixed(2)}</Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )
                      ) : null}
                    </View>
                  );
                })}
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Promo Code</Text>
                  {appliedPromo && (
                    <TouchableOpacity onPress={handleRemovePromo}>
                      <Text style={styles.linkText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {appliedPromo ? (
                  <View style={styles.appliedPromoRow}>
                    <View style={styles.appliedCodePill}>
                      <Ionicons name="pricetag" size={16} color={colors.primary} />
                      <Text style={styles.appliedCode}>{appliedPromo.code}</Text>
                    </View>
                    <Text style={styles.appliedPercent}>{appliedPromo.percent}% OFF</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.promoInputRow}>
                      <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
                      <TextInput
                        style={styles.promoInput}
                        placeholder="Enter promo code"
                        placeholderTextColor={colors.muted}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        value={promoCodeInput}
                        onChangeText={(text) => {
                          setPromoCodeInput(text);
                          if (promoError) setPromoError(null);
                        }}
                        editable={!promoLoading}
                      />
                    </View>
                    {promoError ? <Text style={styles.errorText}>{promoError}</Text> : null}
                    <TouchableOpacity
                      style={[
                        styles.applyButton,
                        (promoLoading || !promoCodeInput.trim()) && styles.buttonDisabled,
                      ]}
                      onPress={handleApplyPromo}
                      disabled={promoLoading || !promoCodeInput.trim()}
                      activeOpacity={0.9}
                    >
                      {promoLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.applyButtonText}>Apply code</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Payment Methods</Text>
                  <TouchableOpacity onPress={() => router.push('./paymentMethods')}>
                    <Text style={styles.linkText}>Change</Text>
                  </TouchableOpacity>
                </View>
                {paymentMethod ? (
                  <View style={styles.paymentRow}>
                    <View style={styles.paymentIconBubble}>
                      <Ionicons name={getMethodIcon(paymentMethod)} size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentName}>{paymentMethod.name}</Text>
                      <Text style={styles.paymentDetail}>
                        {paymentMethod.detail}
                        {paymentMethod.last4 ? ` - **** ${paymentMethod.last4}` : ''}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addPaymentButton}
                    onPress={() => router.push('./paymentMethods')}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={styles.addPaymentText}>Choose a payment method</Text>
                  </TouchableOpacity>
                )}
                {!paymentMethod && (
                  <Text style={styles.helperText}>
                    You will be redirected to pick a payment method before confirming.
                  </Text>
                )}
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Account</Text>
                  <TouchableOpacity onPress={() => router.push('./profile')}>
                    <Text style={styles.linkText}>Manage</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.accountName}>{user?.name || user?.username}</Text>
                <Text style={styles.accountEmail}>{user?.email}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Order summary</Text>
                {!isUpgradeFlow && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>${baseSubtotal.toFixed(2)}</Text>
                  </View>
                )}
                {addonsTotal > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Add-ons</Text>
                    <Text style={styles.summaryValue}>+${addonsTotal.toFixed(2)}</Text>
                  </View>
                )}
                {promoDiscountAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Promo Discount</Text>
                    <Text style={[styles.summaryValue, styles.summaryDiscountValue]}>
                      -${promoDiscountAmount.toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Taxes & fees</Text>
                  <Text style={styles.summaryValue}>$0.00</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTotalLabel}>Total due today</Text>
                  <Text style={styles.summaryTotalValue}>${total.toFixed(2)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.supportCard}
                onPress={() => router.push('./livechat')}
              >
                <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
                <Text style={styles.supportText}>Need help? Chat with support</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalHelper}>Charged immediately</Text>
                </View>
                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, (!paymentMethod || processing) && styles.buttonDisabled]}
                onPress={handlePlaceOrder}
                disabled={processing || !paymentMethod}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirm and Subscribe</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No packages selected</Text>
            <Text style={styles.emptyText}>Browse our catalog to add a subscription.</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('./subscriptionCategories')}
            >
              <Text style={styles.primaryButtonText}>Browse packages</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.headerBackground,
  },
  body: {
    flex: 1,
    backgroundColor: colors.bodyBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingBottom: 80,
    marginBottom: -50,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  itemRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  itemPeriod: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  addonsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addonsList: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  addonsSelector: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  addonName: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: 13,
    color: colors.textSecondary,
  },
  addonPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  addonToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addonToggleTextGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
    alignItems: 'center',
  },
  addonTogglePrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  discountBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.card,
  },
  promoInput: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  applyButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  appliedPromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  appliedCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#F3E8FF',
  },
  appliedCode: {
    fontWeight: '700',
    color: colors.primary,
  },
  appliedPercent: {
    fontWeight: '700',
    color: colors.success,
  },
  errorText: {
    color: colors.danger,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paymentIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentName: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentDetail: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addPaymentText: {
    color: colors.primary,
    fontWeight: '600',
  },
  helperText: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSecondary,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  accountEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  summaryLabel: {
    color: colors.textSecondary,
  },
  summaryValue: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryDiscountValue: {
    color: colors.danger,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadow.card,
  },
  supportText: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  totalHelper: {
    fontSize: 12,
    color: colors.muted,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 12,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  lockWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  lockCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 380,
    ...shadow.card,
  },
  lockIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTextGroup: {
    gap: spacing.xs,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  lockButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  lockButtonText: {
    color: colors.headerText,
    fontWeight: '700',
    fontSize: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default CheckoutScreen;
