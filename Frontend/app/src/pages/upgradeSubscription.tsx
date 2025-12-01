// app/src/pages/upgradeSubscription.tsx
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing, radius, shadow } from '../styles/theme';
import { API_BASE_URL } from '../utils/apiConfig';
import apiClient from '../api/axiosConfig';

type Addon = { key: string; name: string; price: number };

type PackageDetail = {
  _id: string;
  slug: string;
  name: string;
  category: string;
  type: string;
  basePrice: number;
  period: string;
  discountLabel?: string;
  discountPercent?: number;
  addons?: Addon[];
  features?: string[];
};

const FALLBACK_ADDON_PRICES: Record<string, number> = {
  'Full Game Catalog': 14.99,
  'PS Cloud Streaming': 9.99,
  'Exclusive Game Trials': 7.99,
  'Multiplayer Access': 4.99,
  'Cloud Saves (100GB)': 3.99,
};
const FALLBACK_ADDON_DEFAULT_PRICE = 4.99;

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
  if (!percent) return Number(basePrice.toFixed(2));
  const discounted = basePrice * (1 - percent / 100);
  return Number(discounted.toFixed(2));
};

const buildFallbackAddons = (pkg: PackageDetail): Addon[] => {
  const features: string[] = Array.isArray(pkg?.features) ? pkg.features : [];
  return features.map((feature, index) => ({
    key: `${pkg?.slug || 'pkg'}-feature-${index}`,
    name: feature,
    price: FALLBACK_ADDON_PRICES[feature] ?? FALLBACK_ADDON_DEFAULT_PRICE,
  }));
};

const UpgradeSubscriptionScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ currentSlug?: string; purchased?: string }>();
  const currentSlug = params.currentSlug;
  const purchasedKeys = useMemo(() => {
    if (!params.purchased) return new Set<string>();
    try {
      const arr = JSON.parse(params.purchased);
      if (Array.isArray(arr)) {
        return new Set(arr.map((k) => String(k)));
      }
      return new Set<string>();
    } catch {
      return new Set<string>();
    }
  }, [params.purchased]);

  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentSlug) {
      setError('Package not found.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchPackage = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/api/packages/${currentSlug}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to load package.');
        }
        if (!cancelled) {
          setPkg(data);
        }
      } catch (err: any) {
        console.error('Load package for upgrade error:', err);
        if (!cancelled) setError(err?.message || 'Unable to load package.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPackage();
    return () => {
      cancelled = true;
    };
  }, [currentSlug]);

  const availableAddons = useMemo(() => {
    if (!pkg) return [];
    const addons = Array.isArray(pkg.addons) && pkg.addons.length ? pkg.addons : buildFallbackAddons(pkg);
    return addons.filter((addon) => !purchasedKeys.has(addon.key));
  }, [pkg, purchasedKeys]);

  const selectedAddons = useMemo(() => {
    const allAddons = pkg
      ? (Array.isArray(pkg.addons) && pkg.addons.length ? pkg.addons : buildFallbackAddons(pkg))
      : [];
    return allAddons.filter((addon) => selected.has(addon.key));
  }, [pkg?.addons, selected]);

  const toggleAddon = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleUpgrade = () => {
    if (!pkg) return;
    const payload = selectedAddons.map(({ key, name, price }) => ({ key, name, price }));
    router.push({
      pathname: './checkout',
      params: {
        slug: pkg.slug,
        selectedAddons: JSON.stringify(payload),
        upgrade: '1',
      },
    });
  };

  const hasNoUpgrades = !loading && availableAddons.length === 0;

  const finalPrice = useMemo(() => {
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    return Number(addonsTotal.toFixed(2));
  }, [selectedAddons]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Upgrade subscription" subtitle="Add missing add-ons" />
      <View style={styles.body}>
        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading upgrade options...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingBlock}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
            <Text style={styles.errorTitle}>Unable to load package</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
              <Text style={styles.secondaryButtonText}>Go back</Text>
            </TouchableOpacity>
          </View>
        ) : !pkg ? (
          <View style={styles.loadingBlock}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
            <Text style={styles.errorTitle}>Package not found</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.banner}>
                  <Ionicons name="trending-up-outline" size={24} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>{pkg.name}</Text>
                    <Text style={styles.bannerText}>
                      Select additional add-ons for your existing subscription. Already purchased items are hidden.
                    </Text>
                  </View>
                </View>

                {hasNoUpgrades ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                    <Text style={styles.emptyTitle}>All add-ons purchased</Text>
                    <Text style={styles.emptyText}>There are no remaining add-ons to upgrade.</Text>
                  </View>
                ) : (
                  availableAddons.map((addon) => {
                    const isSelected = selected.has(addon.key);
                    return (
                      <TouchableOpacity
                        key={addon.key}
                        style={[styles.card, isSelected && styles.cardSelected]}
                        onPress={() => toggleAddon(addon.key)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.cardHeader}>
                          <Text style={styles.packageName}>{addon.name}</Text>
                          <Text style={styles.finalPrice}>+${addon.price.toFixed(2)}</Text>
                        </View>
                        <View style={styles.radioRow}>
                          <View style={[styles.radio, isSelected && styles.radioSelected]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                          <Text style={styles.radioText}>{isSelected ? 'Selected' : 'Tap to add'}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>New monthly total*</Text>
                <Text style={styles.totalValue}>${finalPrice.toFixed(2)}</Text>
              </View>
              <Text style={styles.totalHint}>You will confirm add-ons in checkout.</Text>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (hasNoUpgrades || selectedAddons.length === 0) && styles.primaryButtonDisabled,
                ]}
                disabled={hasNoUpgrades || selectedAddons.length === 0}
                onPress={handleUpgrade}
              >
                <Text style={styles.primaryButtonText}>Go to checkout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default UpgradeSubscriptionScreen;

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
  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadow.card,
    marginBottom: spacing.md,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bannerText: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  finalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  period: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  radioText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: colors.textSecondary,
  },
  totalValue: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 16,
  },
  totalHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border,
  },
  primaryButtonText: {
    color: colors.headerText,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow.card,
  },
  emptyTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
