// app/src/home/packageDetail.tsx
// ============================================
// Package Detail Screen
// ============================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const API_BASE_URL = 'http://192.168.1.149:3000';

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

const PackageDetailScreen = () => {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();

  const [pkg, setPkg] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <SafeAreaView style={detailStyles.container}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={detailStyles.container}>
        <Text style={detailStyles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!pkg) {
    return (
      <SafeAreaView style={detailStyles.container}>
        <Text style={detailStyles.errorText}>Package not found</Text>
      </SafeAreaView>
    );
  }

  const discountPercent = extractDiscountPercent(pkg.discountLabel);
  const originalPrice = pkg.basePrice;
  const finalPrice = calculateDiscountedPrice(pkg.basePrice, pkg.discountLabel);

  return (
    <SafeAreaView style={detailStyles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={detailStyles.header}>
        <TouchableOpacity style={detailStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={detailStyles.headerTitle}>Package Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={detailStyles.content} showsVerticalScrollIndicator={false}>
        {/* Package Card */}
        <View style={detailStyles.packageCard}>
          <View style={detailStyles.packageHeader}>
            <View>
              <Text style={detailStyles.packageName}>{pkg.name}</Text>
              <Text style={detailStyles.packageType}>{pkg.type}</Text>
            </View>

            {pkg.discountLabel && (
              <View style={detailStyles.discountBadge}>
                <Text style={detailStyles.discountText}>{pkg.discountLabel}</Text>
              </View>
            )}
          </View>

          {/* Giá */}
          <View style={detailStyles.priceContainer}>
            {discountPercent ? (
              <>
                <Text style={detailStyles.originalPrice}>
                  £{originalPrice.toFixed(2)}
                  <Text style={detailStyles.period}> {pkg.period}</Text>
                </Text>
                <Text style={detailStyles.finalPrice}>
                  £{finalPrice.toFixed(2)}
                  <Text style={detailStyles.period}> {pkg.period}</Text>
                </Text>
                <Text style={detailStyles.discountNote}>
                  You save {discountPercent}% on this package.
                </Text>
              </>
            ) : (
              <Text style={detailStyles.finalPrice}>
                £{originalPrice.toFixed(2)}
                <Text style={detailStyles.period}> {pkg.period}</Text>
              </Text>
            )}
          </View>

          {/* Features */}
          <View style={detailStyles.featuresContainer}>
            {pkg.features?.map((feature: string, index: number) => (
              <View key={index} style={detailStyles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={detailStyles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Footer: nút Subscribe -> sang Customize */}
          <View style={detailStyles.packageFooter}>
            <TouchableOpacity
              style={detailStyles.subscribeButton}
              onPress={() =>
                router.push({
                  pathname: '/src/home/customizePackage',
                  params: { slug: pkg.slug },
                })
              }
            >
              <Text style={detailStyles.subscribeButtonText}>Subscribe</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Extra info */}
        <View style={detailStyles.infoSection}>
          <Text style={detailStyles.infoTitle}>Package Information</Text>
          <View style={detailStyles.infoItem}>
            <Text style={detailStyles.infoLabel}>Category:</Text>
            <Text style={detailStyles.infoValue}>{pkg.category}</Text>
          </View>
          <View style={detailStyles.infoItem}>
            <Text style={detailStyles.infoLabel}>Type:</Text>
            <Text style={detailStyles.infoValue}>{pkg.type}</Text>
          </View>
          <View style={detailStyles.infoItem}>
            <Text style={detailStyles.infoLabel}>Billing:</Text>
            <Text style={detailStyles.infoValue}>Monthly subscription</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const detailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#374151',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  packageName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  packageType: {
    fontSize: 13,
    color: '#6B7280',
  },
  discountBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  priceContainer: {
    marginBottom: 20,
  },
  originalPrice: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#A855F7',
  },
  period: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
  },
  discountNote: {
    marginTop: 4,
    fontSize: 13,
    color: '#059669',
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#4B5563',
  },
  packageFooter: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  subscribeButton: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default PackageDetailScreen;
