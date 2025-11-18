// app/src/pages/checkout.tsx
import React, { useEffect, useState } from "react";
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
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import apiClient from '../api/axiosConfig';

// Auto-detect API URL based on platform
// Android emulator: 10.0.2.2
// iOS simulator: localhost
// Physical device: use your computer's local IP (e.g., 192.168.1.100)
const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000'
  : 'http://localhost:3000';

// ====== HELPER DISCOUNT ======
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

// ====== MOCK PAYMENT METHODS (demo) ======
type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  holder: string;
  isDefault?: boolean;
};

const MOCK_METHODS: PaymentMethod[] = [
  {
    id: "pm_visa_4242",
    brand: "Visa",
    last4: "4242",
    holder: "John Smith",
    isDefault: true,
  },
  {
    id: "pm_mc_5522",
    brand: "Mastercard",
    last4: "5522",
    holder: "John Smith",
  },
  {
    id: "pm_ppal",
    brand: "PayPal",
    last4: "—",
    holder: "john@example.com",
  },
];

const CheckoutScreen = () => {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();

  const { accessToken } = useAuthStore() as any;
  const { loadCartFromStorage } = useCartStore();

  const [pkg, setPkg] = useState<any | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<any | null>(null);
  const [discountCodeError, setDiscountCodeError] = useState<string | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Payment Method State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState({
    type: 'card',
    brand: 'Visa',
    last4: '4242',
    name: 'Visa ending in 4242',
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Load accessToken from AsyncStorage on mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('accessToken');
        const storedUser = await AsyncStorage.getItem('user');
        
        console.log('Loading token from storage:', storedToken ? 'Token found' : 'No token');
        
        if (storedToken && storedUser) {
          // Update authStore if token exists in storage but not in state
          const authStore = useAuthStore.getState();
          if (!authStore.accessToken) {
            console.log('Updating authStore with token from storage');
            useAuthStore.setState({
              accessToken: storedToken,
              user: JSON.parse(storedUser),
            });
            // Set token to axios headers
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          } else {
            // Token already in store, just update axios headers
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${authStore.accessToken}`;
          }
        } else if (!storedToken && !storedUser) {
          // No token in storage, redirect to login
          console.log('No token found in storage, redirecting to login...');
          // Don't redirect immediately, let user see the page first
          // router.replace('./login');
        }
      } catch (err) {
        console.error('Failed to load token from storage:', err);
      }
    };

    loadToken();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load cart items trước
        await loadCartFromStorage();
        
        // Đợi một chút để cart items được update trong store
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Lấy cart items mới nhất từ store
        const currentCartItems = useCartStore.getState().items;
        
        // Nếu có slug, fetch package theo slug (checkout từ packageDetail)
        if (slug) {
          const res = await fetch(`${API_BASE_URL}/api/packages/${slug}`);
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || 'Failed to fetch package.');
          }
          setPkg(data);
          // Nếu checkout từ cart, dùng cart items
          if (currentCartItems.length > 0) {
            setCheckoutItems(currentCartItems);
          } else {
            setCheckoutItems([data]);
          }
        } else {
          // Nếu không có slug, dùng cart items
          if (currentCartItems.length > 0) {
            setCheckoutItems(currentCartItems);
          } else {
            // Nếu cart trống, load package đầu tiên để test
            const res = await fetch(`${API_BASE_URL}/api/packages`);
            const data = await res.json();
            if (data && data.length > 0) {
              const firstPkg = data[0];
              setPkg(firstPkg);
              setCheckoutItems([firstPkg]);
            } else {
              throw new Error('No packages available. Please seed packages first.');
            }
          }
        }
      } catch (err: any) {
        console.error('Checkout fetch error:', err);
        const errorMessage = err?.message || 'Failed to load package. Please check if backend is running.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]); // loadCartFromStorage is stable, no need to include

  // Test button click - MUST be before any early returns
  useEffect(() => {
    console.log('📱 [Checkout] Component mounted');
    console.log('📱 [Checkout] Current state - submitting:', submitting);
    console.log('📱 [Checkout] Current state - pkg:', pkg ? pkg.name : 'No package');
    console.log('📱 [Checkout] Current state - accessToken:', accessToken ? 'Has token' : 'No token');
  }, [submitting, pkg, accessToken]);

  if (loading) {
    return (
      <SafeAreaView style={checkoutStyles.container}>
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
        <View style={checkoutStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={checkoutStyles.loadingText}>Loading package...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || (!pkg && checkoutItems.length === 0)) {
    return (
      <SafeAreaView style={checkoutStyles.container}>
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
        <View style={checkoutStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={checkoutStyles.errorText}>
            {error || 'Package not found'}
          </Text>
          <Text style={checkoutStyles.errorSubText}>
            {error 
              ? 'Please make sure backend server is running and packages are seeded.'
              : 'Please select a package to proceed with checkout.'}
          </Text>
          <TouchableOpacity
            style={checkoutStyles.backToHomeButton}
            onPress={() => router.push('./home')}
          >
            <Text style={checkoutStyles.backToHomeButtonText}>
              Back to Home
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate total from all checkout items
  const calculateTotalFromItems = () => {
    let totalBasePrice = 0;
    let totalDiscountAmount = 0;
    
    checkoutItems.forEach((item) => {
      totalBasePrice += item.basePrice || 0;
      const { discountAmount } = calcDiscountedPrice(item.basePrice || 0, item.discountLabel);
      totalDiscountAmount += discountAmount;
    });
    
    return {
      totalBasePrice,
      totalDiscountAmount,
      priceAfterPackageDiscount: totalBasePrice - totalDiscountAmount,
    };
  };

  const { totalDiscountAmount: packageDiscountAmount, priceAfterPackageDiscount } = 
    calculateTotalFromItems();
  
  // For backward compatibility, use pkg if exists
  const basePrice = pkg?.basePrice || 0;

  // Apply discount code if available
  const applyDiscountCodeToPrice = (price: number, discountPercent?: number) => {
    if (!discountPercent) return { final: price, discountAmount: 0 };
    const final = price * (1 - discountPercent / 100);
    return {
      final: Number(final.toFixed(2)),
      discountAmount: Number((price - final).toFixed(2)),
    };
  };

  const { final, discountAmount: codeDiscountAmount } = appliedDiscountCode
    ? applyDiscountCodeToPrice(priceAfterPackageDiscount, appliedDiscountCode.discountPercent)
    : { final: priceAfterPackageDiscount, discountAmount: 0 };

  // Handle apply discount code
  const handleApplyDiscountCode = async () => {
    if (!discountCode.trim()) {
      setDiscountCodeError('Vui lòng nhập mã giảm giá');
      return;
    }

    try {
      setValidatingCode(true);
      setDiscountCodeError(null);

      // Nếu checkout từ cart với nhiều items, không gửi packageSlug và category
      // Discount code sẽ được validate cho tổng giá
      const requestBody: any = {
        code: discountCode.trim().toUpperCase(),
      };

      // Chỉ gửi packageSlug và category nếu checkout từ 1 package duy nhất
      if (checkoutItems.length === 1 && checkoutItems[0].slug) {
        requestBody.packageSlug = checkoutItems[0].slug;
        requestBody.category = checkoutItems[0].category;
      } else if (pkg?.slug && checkoutItems.length === 1) {
        // Fallback nếu có pkg
        requestBody.packageSlug = pkg.slug;
        requestBody.category = pkg.category;
      }
      // Nếu có nhiều items, không gửi packageSlug và category
      // Backend sẽ validate code mà không kiểm tra package/category cụ thể

      const res = await axios.post(
        `${API_BASE_URL}/api/discounts/validate`,
        requestBody
      );

      if (res.data.valid) {
        setAppliedDiscountCode({
          code: res.data.code,
          discountPercent: res.data.discountPercent,
          description: res.data.description,
        });
        setDiscountCode('');
        setDiscountCodeError(null);
      } else {
        setDiscountCodeError('Mã giảm giá không hợp lệ');
        setAppliedDiscountCode(null);
      }
    } catch (err: any) {
      console.error('Validate discount code error:', err);
      const errorMsg = err?.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn';
      setDiscountCodeError(errorMsg);
      setAppliedDiscountCode(null);
    } finally {
      setValidatingCode(false);
    }
  };

  // Handle remove discount code
  const handleRemoveDiscountCode = () => {
    setAppliedDiscountCode(null);
    setDiscountCodeError(null);
    setDiscountCode('');
  };

  // 🔹 COMPLETE ORDER → tạo subscription trên backend rồi chuyển sang Order Confirmation
  const handleCompleteOrder = async () => {
    console.log('🚀 [Complete Order] Button clicked! Function started');
    console.log('🚀 [Complete Order] Current state - submitting:', submitting);
    console.log('🚀 [Complete Order] Current state - pkg:', pkg ? pkg.name : 'No package');
    
    try {
      // Try to get token from store first, then from AsyncStorage
      let token = accessToken;
      console.log('🔍 [Complete Order] Initial token check:', token ? 'Token exists in store' : 'No token in store');
      
      if (!token) {
        try {
          token = await AsyncStorage.getItem('accessToken');
          console.log('🔍 [Complete Order] Token from AsyncStorage:', token ? 'Found' : 'Not found');
          if (token) {
            // Update store with token
            useAuthStore.setState({ accessToken: token });
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('✅ [Complete Order] Token loaded and set to headers');
          }
        } catch (err) {
          console.error('❌ [Complete Order] Failed to load token from storage:', err);
        }
      } else {
        // Ensure token is in axios headers
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('✅ [Complete Order] Token already in store, set to headers');
      }

      if (!token) {
        console.error('❌ [Complete Order] No token available, redirecting to login');
        Alert.alert(
          'Yêu cầu đăng nhập', 
          'Bạn cần đăng nhập để hoàn tất đơn hàng. Vui lòng đăng nhập để tiếp tục.',
          [
            { 
              text: 'Hủy', 
              style: 'cancel'
            },
            { 
              text: 'Đăng nhập', 
              onPress: () => router.replace('./login')
            }
          ]
        );
        return;
      }
      
      console.log('✅ [Complete Order] Token validated, proceeding with order...');

      // phòng trường hợp slug/name bị thiếu
      if (!pkg?.slug || !pkg?.name) {
        Alert.alert('Error', 'Missing package data. Please try again.');
        return;
      }

      // Validate payment method selected
      if (!selectedPaymentMethod?.type) {
        Alert.alert('Error', 'Please select a payment method.');
        setShowPaymentModal(true);
        return;
      }

      setSubmitting(true);

      // Apply discount code (increment usage) if applied
      if (appliedDiscountCode) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/discounts/apply`,
            { code: appliedDiscountCode.code }
          );
        } catch (err) {
          console.error('Failed to apply discount code:', err);
          // Continue with order even if apply fails
        }
      }

      // Calculate next billing date (1 month from now)
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      // 🔸 BODY GỬI ĐÚNG THEO BACKEND: packageSlug / packageName / pricePerPeriod / period
      const body = {
        packageSlug: pkg.slug,
        packageName: pkg.name,
        period: pkg.period || '/month',
        pricePerPeriod: final,          // number, ví dụ 25.49
        nextBillingDate: nextBillingDate.toISOString(),
        // Additional info for future use:
        paymentMethod: selectedPaymentMethod.type,
        paymentBrand: selectedPaymentMethod.brand || '',
        discountCode: appliedDiscountCode?.code || null,
        originalPrice: basePrice,
      };

      console.log('📤 [Complete Order] Sending subscription request...');
      console.log('📤 [Complete Order] Request body:', JSON.stringify(body, null, 2));
      console.log('📤 [Complete Order] Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      
      const res = await axios.post(
        `${API_BASE_URL}/api/subscriptions`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📥 [Complete Order] Response status:', res.status);
      console.log('📥 [Complete Order] Response data:', JSON.stringify(res.data, null, 2));

      // Backend trả về subscription object trực tiếp
      const sub = res.data;

      if (!sub) {
        console.error('❌ [Complete Order] No subscription data in response');
        throw new Error('Invalid subscription response from server - no data');
      }

      if (!sub._id) {
        console.error('❌ [Complete Order] No _id in subscription:', sub);
        throw new Error('Invalid subscription response from server - no _id');
      }

      console.log('✅ [Complete Order] Subscription created successfully:', sub._id);

      // Reset submitting state trước khi redirect
      setSubmitting(false);

      // Hiển thị thông báo thanh toán thành công
      Alert.alert(
        'Thanh toán thành công! 🎉',
        `Đơn hàng của bạn đã được xử lý thành công. Bạn sẽ được chuyển đến trang xác nhận đơn hàng.`,
        [
          {
            text: 'Xem đơn hàng',
            onPress: () => {
              // ➜ Điều hướng sang Order Confirmation
              console.log('🔄 [Complete Order] Redirecting to orderConfirmation...');
              console.log('🔄 [Complete Order] Params:', {
                slug: pkg.slug,
                packageName: pkg.name,
                price: final.toFixed(2),
                subscriptionId: sub._id,
                paymentMethod: selectedPaymentMethod.name || selectedPaymentMethod.type,
              });
              
              // Use replace instead of push to avoid back button issues
              router.replace({
                pathname: './orderConfirmation',
                params: {
                  slug: pkg.slug,
                  packageName: pkg.name,
                  price: final.toFixed(2),
                  subscriptionId: sub._id,
                  paymentMethod: selectedPaymentMethod.name || selectedPaymentMethod.type,
                },
              });
              
              console.log('✅ [Complete Order] Redirect triggered');
            }
          }
        ],
        { cancelable: false }
      );
    } catch (err: any) {
      console.error('❌ [Complete Order] Error occurred');
      console.error('❌ [Complete Order] Error type:', err?.name || typeof err);
      console.error('❌ [Complete Order] Error message:', err?.message);
      console.error('❌ [Complete Order] Response status:', err?.response?.status);
      console.error('❌ [Complete Order] Response data:', err?.response?.data);
      console.error('❌ [Complete Order] Full error:', JSON.stringify(err?.response?.data || err.message, null, 2));
      
      let errorMsg = 'Failed to create subscription. Please try again.';
      
      if (err?.response?.status === 401) {
        const errorData = err?.response?.data;
        if (errorData?.message) {
          errorMsg = errorData.message;
        } else {
          errorMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        }
        
        // Clear invalid token from storage
        try {
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('user');
          useAuthStore.setState({ accessToken: null, user: null });
        } catch (storageErr) {
          console.error('Failed to clear storage:', storageErr);
        }
        
        Alert.alert(
          'Yêu cầu đăng nhập', 
          errorMsg,
          [
            { 
              text: 'Hủy',
              style: 'cancel'
            },
            { 
              text: 'Đăng nhập lại', 
              onPress: () => {
                router.replace('./login');
              }
            }
          ]
        );
        return;
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }

      Alert.alert('Error', errorMsg);
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

      <ScrollView 
        style={checkoutStyles.content} 
        bounces={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Order Summary */}
        <View style={checkoutStyles.card}>
          <Text style={checkoutStyles.cardTitle}>Order Summary</Text>

          {/* Hiển thị tất cả items trong cart */}
          {checkoutItems.map((item, index) => {
            const itemBasePrice = item.basePrice || 0;
            const { final: itemFinalPrice, discountAmount: itemDiscount } = 
              calcDiscountedPrice(itemBasePrice, item.discountLabel);
            
            return (
              <View key={item.slug || index} style={checkoutStyles.itemRow}>
                <View style={checkoutStyles.packageInfoRow}>
                  <Text style={checkoutStyles.itemName}>{item.name}</Text>
                  {item.discountLabel && (
                    <Text style={checkoutStyles.discountBadge}>
                      {item.discountLabel}
                    </Text>
                  )}
                  <Text style={checkoutStyles.itemType}>{item.type}</Text>
                </View>
                <View style={checkoutStyles.itemPriceContainer}>
                  {itemDiscount > 0 && (
                    <Text style={checkoutStyles.originalPrice}>
                      £{itemBasePrice.toFixed(2)}
                    </Text>
                  )}
                  <Text style={checkoutStyles.itemPrice}>
                    £{itemFinalPrice.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Tổng discount từ tất cả packages */}
          {packageDiscountAmount > 0 && (
            <View style={checkoutStyles.rowBetween}>
              <Text style={checkoutStyles.discountLabel}>
                Package Discounts
              </Text>
              <Text style={checkoutStyles.discountValue}>
                -£{packageDiscountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          {appliedDiscountCode && codeDiscountAmount > 0 && (
            <View style={checkoutStyles.rowBetween}>
              <View style={checkoutStyles.discountCodeRow}>
                <Text style={checkoutStyles.discountLabel}>
                  Discount Code: {appliedDiscountCode.code}
                </Text>
                <TouchableOpacity
                  onPress={handleRemoveDiscountCode}
                  style={checkoutStyles.removeCodeButton}
                >
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <Text style={checkoutStyles.discountValue}>
                -£{codeDiscountAmount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={checkoutStyles.rowBetweenTotal}>
            <Text style={checkoutStyles.totalLabel}>Total</Text>
            <Text style={checkoutStyles.totalValue}>£{final.toFixed(2)}</Text>
          </View>
        </View>

        {/* Discount Code */}
        <View style={checkoutStyles.card}>
          <Text style={checkoutStyles.cardTitle}>Discount Code</Text>
          {appliedDiscountCode ? (
            <View style={checkoutStyles.appliedCodeContainer}>
              <View style={checkoutStyles.appliedCodeRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <View style={checkoutStyles.appliedCodeInfo}>
                  <Text style={checkoutStyles.appliedCodeText}>
                    {appliedDiscountCode.code} applied
                  </Text>
                  {appliedDiscountCode.description && (
                    <Text style={checkoutStyles.appliedCodeDesc}>
                      {appliedDiscountCode.description}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={handleRemoveDiscountCode}
                style={checkoutStyles.removeButton}
              >
                <Text style={checkoutStyles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={checkoutStyles.discountRow}>
                <TextInput
                  style={[
                    checkoutStyles.discountInput,
                    discountCodeError && checkoutStyles.discountInputError,
                  ]}
                  placeholder="Enter code"
                  placeholderTextColor="#9CA3AF"
                  value={discountCode}
                  onChangeText={(text) => {
                    setDiscountCode(text);
                    setDiscountCodeError(null);
                  }}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[
                    checkoutStyles.discountButton,
                    validatingCode && { opacity: 0.5 },
                  ]}
                  onPress={handleApplyDiscountCode}
                  disabled={validatingCode || !discountCode.trim()}
                >
                  <Text style={checkoutStyles.discountButtonText}>
                    {validatingCode ? '...' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
              {discountCodeError && (
                <Text style={checkoutStyles.errorMessage}>{discountCodeError}</Text>
              )}
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={checkoutStyles.card}>
          <Text style={checkoutStyles.cardTitle}>Payment Method</Text>

          {/* Ô đang chọn */}
          <View style={checkoutStyles.paymentBox}>
            <View style={checkoutStyles.row}>
              <Ionicons 
                name={selectedPaymentMethod.type === 'card' ? 'card-outline' : selectedPaymentMethod.type === 'paypal' ? 'logo-paypal' : 'wallet-outline'} 
                size={20} 
                color="#4B5563" 
              />
              <View style={{ marginLeft: 12 }}>
                {selectedPaymentMethod.type === 'card' ? (
                  <>
                    <Text style={checkoutStyles.cardNumber}>
                      •••• •••• •••• {selectedPaymentMethod.last4}
                    </Text>
                    <Text style={checkoutStyles.cardSub}>
                      {selectedPaymentMethod.name}
                    </Text>
                  </>
                ) : (
                  <Text style={checkoutStyles.cardNumber}>
                    {selectedPaymentMethod.name}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity onPress={() => setShowPaymentModal(true)}>
              <Text style={checkoutStyles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Danh sách method để Change */}
          {showMethodList && (
            <View style={checkoutStyles.methodList}>
              {paymentMethods.map((method) => {
                const isActive = method.id === selectedMethodId;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      checkoutStyles.methodItem,
                      isActive && checkoutStyles.methodItemActive,
                    ]}
                    onPress={() => {
                      setSelectedMethodId(method.id);
                      setShowMethodList(false);
                    }}
                  >
                    <View style={checkoutStyles.row}>
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color={isActive ? "#8B5CF6" : "#4B5563"}
                      />
                      <View style={{ marginLeft: 10 }}>
                        <Text
                          style={[
                            checkoutStyles.methodTitle,
                            isActive && checkoutStyles.methodTitleActive,
                          ]}
                        >
                          {method.brand}
                        </Text>
                        <Text style={checkoutStyles.methodSub}>
                          {method.brand === "PayPal"
                            ? method.holder
                            : `•••• •••• •••• ${method.last4}`}
                        </Text>
                      </View>
                    </View>
                    {isActive && (
                      <Text style={checkoutStyles.methodTag}>Selected</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Complete Button - Fixed at bottom */}
      <View style={checkoutStyles.footer}>
        <Pressable
          style={({ pressed }) => [
            checkoutStyles.completeButton,
            {
              opacity: submitting ? 0.5 : pressed ? 0.7 : 1,
            },
          ]}
          onPress={() => {
            console.log('========================================');
            console.log('🔘🔘🔘 [Complete Order] BUTTON CLICKED! 🔘🔘🔘');
            console.log('========================================');
            console.log('🔘 [Complete Order] Button onPress triggered!');
            console.log('🔘 [Complete Order] submitting state:', submitting);
            console.log('🔘 [Complete Order] handleCompleteOrder type:', typeof handleCompleteOrder);
            
            Alert.alert('Test', 'Button clicked!', [{ text: 'OK' }]);
            
            if (!submitting) {
              console.log('✅ [Complete Order] Calling handleCompleteOrder...');
              try {
                handleCompleteOrder();
              } catch (err) {
                console.error('❌❌❌ [Complete Order] ERROR calling handleCompleteOrder:', err);
                Alert.alert('Error', `Failed to call handler: ${err}`);
              }
            } else {
              console.log('⚠️ [Complete Order] Button is disabled (submitting=true)');
              Alert.alert('Disabled', 'Button is disabled because submitting=true');
            }
          }}
          disabled={submitting}
        >
          <Text style={checkoutStyles.completeButtonText}>
            Complete Order
          </Text>
        </Pressable>
      </View>

      {/* Payment Method Selection Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={checkoutStyles.modalOverlay}>
          <View style={checkoutStyles.modalContent}>
            <View style={checkoutStyles.modalHeader}>
              <Text style={checkoutStyles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={checkoutStyles.modalBody}>
              {/* Credit/Debit Card Options */}
              <View style={checkoutStyles.paymentOptionSection}>
                <Text style={checkoutStyles.paymentOptionSectionTitle}>Credit/Debit Card</Text>
                
                <Pressable
                  style={[
                    checkoutStyles.paymentOption,
                    selectedPaymentMethod.type === 'card' && selectedPaymentMethod.brand === 'Visa' && checkoutStyles.paymentOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedPaymentMethod({
                      type: 'card',
                      brand: 'Visa',
                      last4: '4242',
                      name: 'Visa ending in 4242',
                    });
                    setShowPaymentModal(false);
                  }}
                >
                  <View style={checkoutStyles.paymentOptionContent}>
                    <Ionicons name="card-outline" size={24} color="#111827" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={checkoutStyles.paymentOptionName}>Visa •••• 4242</Text>
                      <Text style={checkoutStyles.paymentOptionDesc}>Credit/Debit Card</Text>
                    </View>
                    {selectedPaymentMethod.type === 'card' && selectedPaymentMethod.brand === 'Visa' && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    checkoutStyles.paymentOption,
                    selectedPaymentMethod.type === 'card' && selectedPaymentMethod.brand === 'Mastercard' && checkoutStyles.paymentOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedPaymentMethod({
                      type: 'card',
                      brand: 'Mastercard',
                      last4: '8888',
                      name: 'Mastercard ending in 8888',
                    });
                    setShowPaymentModal(false);
                  }}
                >
                  <View style={checkoutStyles.paymentOptionContent}>
                    <Ionicons name="card-outline" size={24} color="#111827" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={checkoutStyles.paymentOptionName}>Mastercard •••• 8888</Text>
                      <Text style={checkoutStyles.paymentOptionDesc}>Credit/Debit Card</Text>
                    </View>
                    {selectedPaymentMethod.type === 'card' && selectedPaymentMethod.brand === 'Mastercard' && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    checkoutStyles.paymentOption,
                    selectedPaymentMethod.type === 'card' && selectedPaymentMethod.brand === 'Amex' && checkoutStyles.paymentOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedPaymentMethod({
                      type: 'card',
                      brand: 'Amex',
                      last4: '0005',
                      name: 'American Express ending in 0005',
                    });
                    setShowPaymentModal(false);
                  }}
                >
                  <View style={checkoutStyles.paymentOptionContent}>
                    <Ionicons name="card-outline" size={24} color="#111827" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={checkoutStyles.paymentOptionName}>Amex •••• 0005</Text>
                      <Text style={checkoutStyles.paymentOptionDesc}>Credit Card</Text>
                    </View>
                    {selectedPaymentMethod.type === 'card' && selectedPaymentMethod.brand === 'Amex' && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </View>
                </Pressable>
              </View>

              {/* PayPal */}
              <View style={checkoutStyles.paymentOptionSection}>
                <Text style={checkoutStyles.paymentOptionSectionTitle}>Digital Wallets</Text>
                
                <Pressable
                  style={[
                    checkoutStyles.paymentOption,
                    selectedPaymentMethod.type === 'paypal' && checkoutStyles.paymentOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedPaymentMethod({
                      type: 'paypal',
                      brand: 'PayPal',
                      last4: '',
                      name: 'PayPal',
                    });
                    setShowPaymentModal(false);
                  }}
                >
                  <View style={checkoutStyles.paymentOptionContent}>
                    <Ionicons name="logo-paypal" size={24} color="#003087" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={checkoutStyles.paymentOptionName}>PayPal</Text>
                      <Text style={checkoutStyles.paymentOptionDesc}>Pay with your PayPal account</Text>
                    </View>
                    {selectedPaymentMethod.type === 'paypal' && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </View>
                </Pressable>
              </View>

              {/* Bank Transfer */}
              <View style={checkoutStyles.paymentOptionSection}>
                <Text style={checkoutStyles.paymentOptionSectionTitle}>Bank Transfer</Text>
                
                <Pressable
                  style={[
                    checkoutStyles.paymentOption,
                    selectedPaymentMethod.type === 'bank' && checkoutStyles.paymentOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedPaymentMethod({
                      type: 'bank',
                      brand: 'Bank Transfer',
                      last4: '',
                      name: 'Bank Transfer',
                    });
                    setShowPaymentModal(false);
                  }}
                >
                  <View style={checkoutStyles.paymentOptionContent}>
                    <Ionicons name="business-outline" size={24} color="#111827" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={checkoutStyles.paymentOptionName}>Bank Transfer</Text>
                      <Text style={checkoutStyles.paymentOptionDesc}>Direct bank transfer</Text>
                    </View>
                    {selectedPaymentMethod.type === 'bank' && (
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    )}
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const checkoutStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    height: 80,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rowBetweenTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  itemName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  packageInfoRow: {
    flex: 1,
    marginRight: 8,
  },
  autoLoadHint: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  itemRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  discountBadge: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  itemType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  discountLabel: {
    fontSize: 13,
    color: "#10B981",
  },
  discountValue: {
    fontSize: 13,
    color: "#10B981",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#A855F7",
  },
  discountRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  discountInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    color: "#111827",
    marginRight: 8,
  },
  discountButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  discountButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  discountInputError: {
    borderColor: '#EF4444',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 12,
    color: '#EF4444',
  },
  appliedCodeContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appliedCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appliedCodeInfo: {
    marginLeft: 8,
    flex: 1,
  },
  appliedCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  appliedCodeDesc: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  removeButtonText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  discountCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeCodeButton: {
    padding: 4,
  },
  paymentBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  cardSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  changeText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
  },
  // Payment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  paymentOptionSection: {
    marginBottom: 24,
  },
  paymentOptionSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentOption: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentOptionDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 30,
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completeButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 40,
    textAlign: 'center',
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorSubText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 24,
  },
  backToHomeButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  backToHomeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default CheckoutScreen;

