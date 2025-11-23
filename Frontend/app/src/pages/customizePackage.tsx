// app/src/home/customizePackage.tsx
// ============================================
// Customize Package + Add-ons Screen
// ============================================
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ScreenHeader from '../components/ScreenHeader';
import { API_BASE_URL } from '../utils/apiConfig';

// Helper: lấy số % từ discountLabel
const extractDiscountPercent = (label?: string): number | null => {
  if (!label) return null;
  const match = label.match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) : null;
};

// Helper: tính giá sau giảm
const calculateDiscountedPrice = (basePrice: number, discountLabel?: string): number => {
  const percent = extractDiscountPercent(discountLabel);
  if (!percent) return basePrice;
  const discounted = basePrice * (1 - percent / 100);
  return Number(discounted.toFixed(2));
};

// Add-ons tạm thời fix cứng ở frontend
const ADD_ONS = [
  {
    id: 'extra-storage',
    name: 'Extra Cloud Storage (100GB)',
    price: 4.99,
  },
  {
    id: 'exclusive-items',
    name: 'Exclusive In-Game Items',
    price: 9.99,
  },
  {
    id: 'priority-support',
    name: 'Priority Support',
    price: 2.99,
  },
];

const CustomizePackageScreen = () => {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();

  const [pkg, setPkg] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  useEffect(() => {
    if (!slug) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE_URL}/api/packages/${slug}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch package detail');
        }

        setPkg(data);
      } catch (err: any) {
        console.error('Fetch package detail error:', err);
        setError(err.message || 'Error fetching package detail');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [slug]);

  const basePriceAfterDiscount = useMemo(() => {
    if (!pkg) return 0;
    return calculateDiscountedPrice(pkg.basePrice, pkg.discountLabel);
  }, [pkg]);

  const addonsTotal = useMemo(() => {
    return selectedAddOns.reduce((sum, id) => {
      const found = ADD_ONS.find((a) => a.id === id);
      return found ? sum + found.price : sum;
    }, 0);
  }, [selectedAddOns]);

  const totalPrice = useMemo(
    () => basePriceAfterDiscount + addonsTotal,
    [basePriceAfterDiscount, addonsTotal]
  );

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const headerTitle = 'Customize package';
  const headerSubtitle = pkg?.name ? `Step 5 • ${pkg.name}` : 'Step 5';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScreenHeader title={headerTitle} subtitle="Loading package..." />
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScreenHeader title={headerTitle} />
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!pkg) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScreenHeader title={headerTitle} />
        <Text style={styles.errorText}>Package not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader title={headerTitle} subtitle={headerSubtitle} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.mainTitle}>Customize Your Package</Text>
          <Text style={styles.subtitle}>
            {pkg.name} – Base: £{basePriceAfterDiscount.toFixed(2)}
          </Text>
        </View>

        {/* Add-ons */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add-ons</Text>

          {ADD_ONS.map((addOn) => {
            const selected = selectedAddOns.includes(addOn.id);
            return (
              <TouchableOpacity
                key={addOn.id}
                style={styles.addOnRow}
                onPress={() => toggleAddOn(addOn.id)}
                activeOpacity={0.8}
              >
                <View style={styles.addOnInfo}>
                  <Text style={styles.addOnName}>{addOn.name}</Text>
                  <Text style={styles.addOnPrice}>
                    +£{addOn.price.toFixed(2)}/month
                  </Text>
                </View>
                <Ionicons
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={selected ? '#A855F7' : '#9CA3AF'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer: Total + button */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>£{totalPrice.toFixed(2)}/mo</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => {
            // TODO: sau này push sang màn checkout, truyền kèm selectedAddOns
            console.log('Go to checkout with:', {
              packageSlug: pkg.slug,
              addOns: selectedAddOns,
              totalPrice,
            });
          }}
        >
          <Text style={styles.checkoutButtonText}>Continue to Checkout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  titleBlock: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  addOnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  addOnInfo: {
    flex: 1,
  },
  addOnName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  addOnPrice: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#A855F7',
  },
  checkoutButton: {
    backgroundColor: '#A855F7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default CustomizePackageScreen;
