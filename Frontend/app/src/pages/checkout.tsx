import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
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
import type { CartItem } from '../stores/cartStore';
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
});

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
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slugParam = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const isCartCheckout = !slugParam;

  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

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
        const data = (await res.json()) as ApiPackage & { message?: string };
        if (!res.ok) {
          throw new Error(data?.message || 'Package not found.');
        }
        if (isMounted) {
          setCheckoutItems([packageToCartItem(data)]);
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
  }, [slugParam]);

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
    setCheckoutItems(items);
  }, [items, slugParam]);

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.finalPrice, 0),
    [checkoutItems]
  );
  const total = subtotal;
  const hasItems = checkoutItems.length > 0;
  const headerSubtitle = slugParam ? 'Confirm your subscription' : 'Review your cart';

  const buildSubscriptionPayload = (item: CartItem) => {
    const slug = item.slug?.trim();
    const name = item.name?.trim();
    const price = Number(
      Number.isFinite(item.finalPrice) ? item.finalPrice : item.basePrice
    );
    if (!slug || !name || !Number.isFinite(price)) {
      throw new Error('Invalid subscription data. Please reload and try again.');
    }
    return {
      packageSlug: slug.toLowerCase(),
      packageName: name,
      period: item.period || '/month',
      pricePerPeriod: Number(price.toFixed(2)),
    };
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
        title: 'Choose payment method',
        message: 'Select a payment method before confirming.',
        action: {
          label: 'Select method',
          onPress: () => router.push('./paymentMethods'),
        },
      });
      return;
    }

    setProcessing(true);
    try {
      for (const item of checkoutItems) {
        const payload = buildSubscriptionPayload(item);
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

      router.replace({
        pathname: './orderConfirmation',
        params: {
          packageName: checkoutItems[0]?.name || 'Your subscription',
          price: checkoutItems[0]?.finalPrice.toFixed(2) || total.toFixed(2),
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
                {checkoutItems.map((item) => (
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
                    <Text style={styles.itemPrice}>
                      ${item.finalPrice.toFixed(2)}
                      <Text style={styles.itemPeriod}> {item.period}</Text>
                    </Text>
                    <View style={styles.featuresList}>
                      {item.features.slice(0, 3).map((feature) => (
                        <View key={feature} style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                      {item.features.length > 3 && (
                        <Text style={styles.moreFeaturesText}>
                          +{item.features.length - 3} more benefits
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Payment method</Text>
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
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                </View>
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
                  <Text style={styles.primaryButtonText}>Confirm and subscribe</Text>
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
  featuresList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  moreFeaturesText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.headerText,
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

