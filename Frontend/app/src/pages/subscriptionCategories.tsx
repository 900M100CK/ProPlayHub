// app/src/pages/subscriptionCategories.tsx
// Dedicated catalog page with platform filters (All / PC / PlayStation / Xbox)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing, radius, shadow } from '../styles/theme';
import { API_BASE_URL } from '../utils/apiConfig';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../api/axiosConfig';

type SubscriptionPackage = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  type: string;
  basePrice: number;
  period: string;
  discountLabel?: string;
  discountPercent?: number;
  features: string[];
  isSeasonalOffer: boolean;
  tags?: string[];
};

const CATEGORY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pc', label: 'PC' },
  { key: 'playstation', label: 'PlayStation' },
  { key: 'xbox', label: 'Xbox' },
] as const;

const STREAMING_TAB = { key: 'streaming', label: 'Streaming' } as const;

type CategoryKey = typeof CATEGORY_TABS[number]['key'] | typeof STREAMING_TAB.key;

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
): number => {
  const percent = extractDiscountPercent(discountLabel, explicitPercent);
  if (!percent) return basePrice;
  const discounted = basePrice * (1 - percent / 100);
  return Number(discounted.toFixed(2));
};

const CATEGORY_ORDER: Record<CategoryKey, number> = {
  all: 1,
  pc: 2,
  playstation: 3,
  xbox: 4,
  streaming: 5,
};

const SubscriptionCategoriesScreen = () => {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const { loadCartFromStorage, getItemCount } = useCartStore();

  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [purchasedSlugs, setPurchasedSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [cartCount, setCartCount] = useState(0);
  const categoryAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const prevCategoryRef = useRef<CategoryKey>('all');
  const [axis, setAxis] = useState<'x' | 'y'>('x');

  useEffect(() => {
    loadCartFromStorage().then(() => {
      setCartCount(getItemCount());
    });
  }, [getItemCount, loadCartFromStorage]);

  useEffect(() => {
    let cancelled = false;
    const fetchSubscriptions = async () => {
      if (!accessToken) {
        setPurchasedSlugs(new Set());
        return;
      }
      try {
        const res = await apiClient.get('/subscriptions/me');
        const data = Array.isArray(res.data) ? res.data : [];
        const active = data
          .filter((sub: any) => sub?.status === 'active' && sub?.packageSlug)
          .map((sub: any) => String(sub.packageSlug));
        if (!cancelled) {
          setPurchasedSlugs(new Set(active));
        }
      } catch (err) {
        console.error('Failed to load user subscriptions for catalog:', err);
        if (!cancelled) {
          setPurchasedSlugs(new Set());
        }
      }
    };
    fetchSubscriptions();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE_URL}/api/packages`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({ message: 'Failed to fetch packages' }));
          throw new Error(data.message || 'Failed to fetch packages');
        }

        const data = await res.json();
        setPackages(data || []);
      } catch (err: any) {
        console.error('Fetch packages error:', err);
        setError(err?.message || 'Unable to load packages.');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  const filteredPackages = useMemo(() => {
    const scoped =
      activeCategory === 'all'
        ? packages
        : packages.filter((pkg) => pkg.category?.toLowerCase() === activeCategory);
    // Move owned packages to bottom
    return scoped.slice().sort((a, b) => {
      const aOwned = purchasedSlugs.has(a.slug) ? 1 : 0;
      const bOwned = purchasedSlugs.has(b.slug) ? 1 : 0;
      if (aOwned !== bOwned) return aOwned - bOwned;
      return a.name.localeCompare(b.name);
    });
  }, [activeCategory, packages, purchasedSlugs]);

  const handleSubscribe = (pkg: SubscriptionPackage) => {
    router.push({
      pathname: './checkout',
      params: { slug: pkg.slug },
    });
  };

  const renderPrice = (pkg: SubscriptionPackage) => {
    const percent = extractDiscountPercent(pkg.discountLabel, pkg.discountPercent);
    const finalPrice = calculateDiscountedPrice(
      pkg.basePrice,
      pkg.discountLabel,
      pkg.discountPercent
    );

    if (!percent) {
      return (
        <View style={styles.priceCorner}>
          <Text style={styles.price}>
            ${pkg.basePrice.toFixed(2)}
            <Text style={styles.period}> {pkg.period}</Text>
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.priceCorner}>
        <View style={styles.priceRow}>
          <Text style={styles.originalPrice}>
            ${pkg.basePrice.toFixed(2)}
            <Text style={styles.period}> {pkg.period}</Text>
          </Text>
          <Text style={styles.finalPrice}>
            ${finalPrice.toFixed(2)}
            <Text style={styles.period}> {pkg.period}</Text>
          </Text>
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (loading) return;
    const prev = prevCategoryRef.current;
    if (prev === activeCategory) return;
    const prevIndex = CATEGORY_ORDER[prev] ?? 0;
    const nextIndex = CATEGORY_ORDER[activeCategory] ?? 0;
    const isVertical = prev === 'streaming' || activeCategory === 'streaming';
    const direction = nextIndex >= prevIndex ? 1 : -1;
    setAxis(isVertical ? 'y' : 'x');

    const distance = isVertical ? 28 : 28;
    slideAnim.setValue(direction * distance);
    categoryAnim.setValue(0.85);

    Animated.parallel([
      Animated.timing(categoryAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    prevCategoryRef.current = activeCategory;
  }, [activeCategory, categoryAnim, loading, slideAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle='light-content' />
      <ScreenHeader
        title='Browse Packages'
        subtitle='Subscription Catalog'
        rightSlot={
          <TouchableOpacity style={styles.cartButton} onPress={() => router.push('./cart')}>
            <Ionicons name='cart-outline' size={20} color={colors.headerText} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <View style={styles.body}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.tabs}>
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveCategory(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeCategory === STREAMING_TAB.key && styles.tabActive,
            ]}
            onPress={() => setActiveCategory(STREAMING_TAB.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeCategory === STREAMING_TAB.key && styles.tabTextActive,
              ]}
            >
              {STREAMING_TAB.label}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size='large' color={colors.primary} />
          </View>
        )}

        {error && !loading && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && filteredPackages.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name='search' size={42} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No packages in this category</Text>
            <Text style={styles.emptyText}>Try selecting another category.</Text>
          </View>
        )}

        {!loading &&
          !error &&
            filteredPackages.map((pkg) => {
            const percent = extractDiscountPercent(pkg.discountLabel, pkg.discountPercent);
            const topFeatures = pkg.features?.slice(0, 3) || [];
            const isOwned = purchasedSlugs.has(pkg.slug);

            return (
              <View key={pkg.slug} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packageName} numberOfLines={2} ellipsizeMode='tail'>
                      {pkg.name}
                    </Text>
                  </View>

                    <View style={styles.badgeRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText} numberOfLines={1} ellipsizeMode='tail'>
                          {pkg.category}
                        </Text>
                      </View>
                      {pkg.discountLabel ? (
                        <View style={[styles.discountBadge, percent ? styles.discountBadgeStrong : null]}>
                          <Text style={styles.discountText} numberOfLines={1} ellipsizeMode='tail'>
                            {pkg.discountLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                </View>

                {renderPrice(pkg)}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => router.push(`./packageDetail?slug=${pkg.slug}`)}
                  >
                    <Ionicons name='eye-outline' size={18} color={colors.primary} />
                    <Text style={styles.viewButtonText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      style={[
                        styles.subscribeButton,
                        isOwned && styles.subscribeButtonDisabled,
                      ]}
                      onPress={isOwned ? undefined : () => handleSubscribe(pkg)}
                      disabled={isOwned}
                  >
                    <Text style={styles.subscribeButtonText}>
                      {isOwned ? 'Purchased' : 'Subscribe'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SubscriptionCategoriesScreen;

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
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 6,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.headerText,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexShrink: 1,
  },
  categoryBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  categoryBadgeText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  discountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    maxWidth: 200,
  },
  discountBadgeStrong: {
    backgroundColor: '#FDE68A',
  },
  discountText: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 12,
  },
  packageName: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  priceCorner: {
    marginTop: 50,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
  period: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  viewButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  subscribeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDark,
  },
  subscribeButtonDisabled: {
    backgroundColor: colors.border,
  },
  subscribeButtonText: {
    color: colors.headerText,
    fontWeight: '700',
    fontSize: 14,
  },
  cartButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
