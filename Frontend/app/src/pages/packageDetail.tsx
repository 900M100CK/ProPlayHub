// app/src/pages/packageDetail.tsx
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCartStore, CartItem } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../components/ToastProvider';
import ScreenHeader from '../components/ScreenHeader';

// Auto-detect API URL based on platform
// Android emulator: 10.0.2.2
// iOS simulator: localhost
// Physical device: use your computer's local IP (e.g., 192.168.1.100)
const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000'
  : 'http://localhost:3000';

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
  
  const { addToCart, isInCart, removeFromCart } = useCartStore();
  const { accessToken } = useAuthStore();
  const [itemInCart, setItemInCart] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!slug) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE_URL}/api/packages/${slug}`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: 'Failed to fetch package detail' }));
          throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setPkg(data);
        
        // Kiểm tra xem item đã có trong cart chưa
        if (data) {
          const inCart = isInCart(data.slug);
          setItemInCart(inCart);
        }
      } catch (err: any) {
        console.error('Fetch package detail error:', err);
        const errorMessage = err?.message || 'Error fetching package detail. Please check if backend is running.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!pkg?.slug) {
      setHasActiveSubscription(false);
      return;
    }

    const checkSubscriptionStatus = async () => {
      try {
        setCheckingSubscription(true);
        let token = accessToken;

        if (!token) {
          try {
            token = await AsyncStorage.getItem('accessToken');
          } catch (storageErr) {
            console.error('Failed to read token from storage:', storageErr);
          }
        }

        if (!token) {
          setHasActiveSubscription(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/subscriptions/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.error('Failed to fetch subscriptions:', res.status);
          setHasActiveSubscription(false);
          return;
        }

        const data = await res.json();
        const isSubscribed =
          Array.isArray(data) &&
          data.some(
            (sub: any) => sub.packageSlug === pkg.slug && sub.status === 'active'
          );

        setHasActiveSubscription(isSubscribed);

        if (isSubscribed && isInCart(pkg.slug)) {
          await removeFromCart(pkg.slug);
          setItemInCart(false);
        }
      } catch (err) {
        console.error('Check subscription status error:', err);
        setHasActiveSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscriptionStatus();
  }, [pkg?.slug, accessToken, isInCart, removeFromCart]);

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
        <StatusBar barStyle="light-content" />
        <ScreenHeader title="Package Information" />
        <View style={detailStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={detailStyles.errorText}>{error}</Text>
          <Text style={detailStyles.errorSubText}>
            Please make sure backend server is running at {API_BASE_URL}
          </Text>
          <TouchableOpacity
            style={detailStyles.retryButton}
            onPress={() => {
              setError(null);
              // Trigger refetch
              if (slug) {
                const fetchDetail = async () => {
                  try {
                    setLoading(true);
                    setError(null);
                    const res = await fetch(`${API_BASE_URL}/api/packages/${slug}`);
                    if (!res.ok) {
                      const errorData = await res.json().catch(() => ({ message: 'Failed to fetch package detail' }));
                      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
                    }
                    const data = await res.json();
                    setPkg(data);
                  } catch (err: any) {
                    setError(err?.message || 'Error fetching package detail');
                  } finally {
                    setLoading(false);
                  }
                };
                fetchDetail();
              }
            }}
          >
            <Text style={detailStyles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
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

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!pkg) return;

    if (hasActiveSubscription) {
      showToast({
        type: 'info',
        title: 'Already subscribed',
        message: 'You already own this package.',
      });
      return;
    }

    const cartItem: CartItem = {
      _id: pkg._id,
      slug: pkg.slug,
      name: pkg.name,
      category: pkg.category,
      type: pkg.type,
      basePrice: pkg.basePrice,
      period: pkg.period || '/month',
      discountLabel: pkg.discountLabel,
      features: pkg.features || [],
      isSeasonalOffer: pkg.isSeasonalOffer || false,
      tags: pkg.tags || [],
      finalPrice: finalPrice,
    };

    const result = await addToCart(cartItem);

    if (result.success) {
      setItemInCart(true);
      showToast({
        type: 'success',
        title: 'Added to cart',
        message: `${pkg.name} has been added to your cart.`,
      });
      return;
    }

    if (result.reason === 'AUTH_REQUIRED') {
      showToast({
        type: 'info',
        title: 'Sign in required',
        message: 'Please log in to add packages to your cart.',
        action: {
          label: 'Sign in',
          onPress: () => router.push('./login'),
        },
      });
      return;
    }

    if (result.reason === 'ALREADY_EXISTS') {
      showToast({
        type: 'info',
        title: 'Already in cart',
        message: 'This package is already waiting in your cart.',
      });
      return;
    }

    showToast({
      type: 'error',
      title: 'Something went wrong',
      message: result.message || 'We could not add this package right now. Please try again.',
    });
  };

  // Handle remove from cart
  const handleRemoveFromCart = () => {
    if (!pkg) return;
    removeFromCart(pkg.slug);
    setItemInCart(false);
    showToast({
      type: 'info',
      title: 'Removed from cart',
      message: `${pkg.name} has been removed from your cart.`,
    });
  };

  return (
    <SafeAreaView style={detailStyles.container}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader
        title="Package Information"
        subtitle={pkg.category ? `${pkg.category} • ${pkg.type}` : pkg.type}
      />

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

          {/* Footer: nút Add to Cart và Subscribe */}
          <View style={detailStyles.packageFooter}>
            {hasActiveSubscription && (
              <View style={detailStyles.subscribedInfoBox}>
                <Ionicons name="checkmark-circle" size={20} color="#0F766E" />
                <Text style={detailStyles.subscribedInfoText}>Already subscribed</Text>
              </View>
            )}
            <View style={detailStyles.buttonRow}>
              {!hasActiveSubscription && (itemInCart ? (
                <TouchableOpacity
                  style={[detailStyles.cartButton, detailStyles.removeButton]}
                  onPress={handleRemoveFromCart}
                >
                  <Ionicons name="cart" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={detailStyles.cartButtonText}>Xóa khỏi giỏ</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[detailStyles.cartButton, detailStyles.addButton]}
                  onPress={handleAddToCart}
                >
                  <Ionicons name="cart-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={detailStyles.cartButtonText}>Add to Cart</Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={[
                  detailStyles.subscribeButton,
                  hasActiveSubscription && detailStyles.subscribeButtonDisabled,
                ]}
                disabled={hasActiveSubscription || checkingSubscription}
                onPress={() =>
                  router.push({
                    pathname: './checkout',
                    params: { slug: pkg.slug },
                  })
                }
              >
                <Text
                  style={[
                    detailStyles.subscribeButtonText,
                    hasActiveSubscription && detailStyles.subscribeButtonTextDisabled,
                  ]}
                >
                  {hasActiveSubscription ? 'Subscribed' : 'Subscribe'}
                </Text>
              </TouchableOpacity>
            </View>
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
  subscribedIndicator: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subscribedIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
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
  },
  subscribedInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  subscribedInfoText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  cartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: '#10B981',
  },
  removeButton: {
    backgroundColor: '#EF4444',
  },
  cartButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subscribeButton: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  subscribeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subscribeButtonTextDisabled: {
    color: '#9CA3AF',
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
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorSubText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#A855F7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PackageDetailScreen;
