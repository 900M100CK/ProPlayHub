// app/src/pages/checkout.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = 'http://10.0.2.2:3000';

const extractDiscountPercent = (label?: string): number | null => {
  if (!label) return null;
  const match = label.match(/(\d+)\s*%/);
  return match ? parseInt(match[1], 10) : null;
};

const calcDiscountedPrice = (basePrice: number, label?: string) => {
  const percent = extractDiscountPercent(label);
  if (!percent) return { final: basePrice, discountAmount: 0 };
  const final = basePrice * (1 - percent / 100);
  return {
    final: Number(final.toFixed(2)),
    discountAmount: Number((basePrice - final).toFixed(2)),
  };
};

const CheckoutScreen = () => {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();

  const { accessToken, user } = useAuthStore() as any;

  const [pkg, setPkg] = useState<any | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/packages/${slug}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch.');
        }
        setPkg(data);
      } catch (err) {
        console.error('Checkout fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  if (!pkg) {
    return (
      <SafeAreaView style={checkoutStyles.container}>
        <Text style={checkoutStyles.errorText}>
          {loading ? 'Loading...' : 'Package not found'}
        </Text>
      </SafeAreaView>
    );
  }

  const basePrice = pkg.basePrice;
  const { final, discountAmount } = calcDiscountedPrice(
    basePrice,
    pkg.discountLabel
  );

  // 🔹 COMPLETE ORDER → tạo subscription trên backend rồi chuyển sang Order Confirmation
  const handleCompleteOrder = async () => {
    try {
      if (!accessToken) {
        Alert.alert('Error', 'You need to login again (no access token).');
        return;
      }

      // phòng trường hợp slug/name bị thiếu
      if (!pkg.slug || !pkg.name) {
        Alert.alert('Error', 'Missing package data.');
        return;
      }

      setSubmitting(true);

      // 🔸 BODY GỬI ĐÚNG THEO BACKEND: packageSlug / packageName / pricePerPeriod
      const body = {
        packageSlug: pkg.slug,
        packageName: pkg.name,
        pricePerPeriod: final,          // number, ví dụ 25.49
        // có thể gửi thêm info nếu backend có dùng:
        // discountCode,
        // originalPrice: basePrice,
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/subscriptions`,
        body,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // nếu backend trả về subscription, có thể lấy _id để show
      const sub = res.data?.subscription;

      // ➜ Điều hướng sang Order Confirmation
      router.push({
        pathname: './orderConfirmation',
        params: {
          slug: pkg.slug,
          packageName: pkg.name,
          price: final.toFixed(2),
          subscriptionId: sub?._id ?? '',
        },
      });
    } catch (err: any) {
      console.error('Create subscription error:', err?.response?.data || err.message);
      const msg =
        err?.response?.data?.message ||
        'Failed to create subscription. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={checkoutStyles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={checkoutStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={checkoutStyles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={checkoutStyles.headerTitle}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={checkoutStyles.content} bounces={false}>
        {/* Order Summary */}
        <View style={checkoutStyles.card}>
          <Text style={checkoutStyles.cardTitle}>Order Summary</Text>

          <View style={checkoutStyles.rowBetween}>
            <Text style={checkoutStyles.itemName}>{pkg.name}</Text>
            <Text style={checkoutStyles.itemPrice}>
              £{basePrice.toFixed(2)}
            </Text>
          </View>

          {discountAmount > 0 && (
            <View style={checkoutStyles.rowBetween}>
              <Text style={checkoutStyles.discountLabel}>
                {pkg.discountLabel || 'App Discount'}
              </Text>
              <Text style={checkoutStyles.discountValue}>
                -£{discountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={checkoutStyles.rowBetweenTotal}>
            <Text style={checkoutStyles.totalLabel}>Total</Text>
            <Text style={checkoutStyles.totalValue}>
              £{final.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Discount Code */}
        <View style={checkoutStyles.card}>
          <Text style={checkoutStyles.cardTitle}>Discount Code</Text>
          <View style={checkoutStyles.discountRow}>
            <TextInput
              style={checkoutStyles.discountInput}
              placeholder="Enter code"
              placeholderTextColor="#9CA3AF"
              value={discountCode}
              onChangeText={setDiscountCode}
            />
            <TouchableOpacity style={checkoutStyles.discountButton}>
              <Text style={checkoutStyles.discountButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method (demo) */}
        <View style={checkoutStyles.card}>
          <Text style={checkoutStyles.cardTitle}>Payment Method</Text>

          <View style={checkoutStyles.paymentBox}>
            <View style={checkoutStyles.row}>
              <Ionicons name="card-outline" size={20} color="#4B5563" />
              <View style={{ marginLeft: 12 }}>
                <Text style={checkoutStyles.cardNumber}>
                  •••• •••• •••• 4242
                </Text>
                <Text style={checkoutStyles.cardSub}>
                  Visa ending in 4242
                </Text>
              </View>
            </View>

            <TouchableOpacity>
              <Text style={checkoutStyles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Complete Button */}
      <View style={checkoutStyles.footer}>
        <TouchableOpacity
          style={[
            checkoutStyles.completeButton,
            submitting && { opacity: 0.5 },
          ]}
          onPress={handleCompleteOrder}
          disabled={submitting}
        >
          <Text style={checkoutStyles.completeButtonText}>
            {submitting ? 'Processing…' : 'Complete Order'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const checkoutStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    height: 80,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowBetweenTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  itemName: {
    fontSize: 14,
    color: '#111827',
  },
  itemPrice: {
    fontSize: 14,
    color: '#111827',
  },
  discountLabel: {
    fontSize: 13,
    color: '#10B981',
  },
  discountValue: {
    fontSize: 13,
    color: '#10B981',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#A855F7',
  },
  discountRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  discountInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    marginRight: 8,
  },
  discountButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  paymentBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cardSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  changeText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 30,
  },
  completeButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 40,
    textAlign: 'center',
    color: '#EF4444',
  },
});

export default CheckoutScreen;
