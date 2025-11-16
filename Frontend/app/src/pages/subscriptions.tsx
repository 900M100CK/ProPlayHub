// app/src/pages/subscriptions.tsx
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import apiClient from '../api/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Subscription {
  _id: string;
  packageSlug: string;
  packageName: string;
  period: string;
  pricePerPeriod: number;
  status: 'active' | 'inactive' | 'cancelled';
  startedAt: string;
  nextBillingDate?: string;
  cancelledAt?: string;
  createdAt: string;
}

const SubscriptionsScreen = () => {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const { loadCartFromStorage } = useCartStore();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    // Load cart items để hiển thị badge
    const loadCart = async () => {
      await loadCartFromStorage();
      const items = useCartStore.getState().items;
      setCartItemCount(items.length);
    };
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadCartFromStorage is stable

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      
      let token = accessToken;
      if (!token) {
        token = await AsyncStorage.getItem('accessToken');
        if (token) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      }

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await apiClient.get('/api/subscriptions/me');
      setSubscriptions(response.data || []);
    } catch (err: any) {
      console.error('Load subscriptions error:', err);
      if (err?.response?.status === 401) {
        // Unauthorized - clear token and redirect
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('user');
        useAuthStore.setState({ accessToken: null, user: null });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTokenAndSubscriptions = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('accessToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        useAuthStore.setState({
          accessToken: storedToken,
          user: JSON.parse(storedUser),
        });
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        await loadSubscriptions();
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load token:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && user) {
      loadSubscriptions();
    } else {
      // Try to load token from storage
      loadTokenAndSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user]); // loadSubscriptions is defined above


  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
  };

  const handleCancelSubscription = async (subscription: Subscription) => {
    Alert.alert(
      'Hủy đăng ký',
      `Bạn có chắc chắn muốn hủy đăng ký "${subscription.packageName}"?`,
      [
        {
          text: 'Không',
          style: 'cancel',
        },
        {
          text: 'Có, hủy đăng ký',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement cancel subscription API endpoint
              Alert.alert('Thông báo', 'Tính năng hủy đăng ký đang được phát triển.');
            } catch (err) {
              console.error('Cancel subscription error:', err);
              Alert.alert('Lỗi', 'Không thể hủy đăng ký. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatNextBillingDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return formatDate(dateString);
  };

  // Kiểm tra đăng nhập
  if (!accessToken && !user) {
    return (
      <SafeAreaView style={subscriptionStyles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={subscriptionStyles.header}>
          <TouchableOpacity style={subscriptionStyles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={subscriptionStyles.headerTitle}>Đăng ký của tôi</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={subscriptionStyles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#9CA3AF" />
          <Text style={subscriptionStyles.emptyTitle}>Yêu cầu đăng nhập</Text>
          <Text style={subscriptionStyles.emptyText}>
            Bạn cần đăng nhập để xem các gói đăng ký của mình.
          </Text>
          <TouchableOpacity
            style={subscriptionStyles.loginButton}
            onPress={() => router.push('./login')}
          >
            <Text style={subscriptionStyles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={subscriptionStyles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={subscriptionStyles.header}>
          <TouchableOpacity style={subscriptionStyles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={subscriptionStyles.headerTitle}>Đăng ký của tôi</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={subscriptionStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={subscriptionStyles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={subscriptionStyles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={subscriptionStyles.header}>
        <TouchableOpacity style={subscriptionStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={subscriptionStyles.headerTitle}>Đăng ký của tôi</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Ionicons 
            name="refresh-outline" 
            size={24} 
            color={refreshing ? "#9CA3AF" : "#FFFFFF"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={subscriptionStyles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <View style={{ flex: 1 }}>
            {/* Manual refresh indicator */}
          </View>
        }
      >
        {subscriptions.length === 0 ? (
          <View style={subscriptionStyles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text style={subscriptionStyles.emptyTitle}>Chưa có đăng ký</Text>
            <Text style={subscriptionStyles.emptyText}>
              Bạn chưa đăng ký gói nào. Hãy khám phá các gói dịch vụ và đăng ký ngay!
            </Text>
            <TouchableOpacity
              style={subscriptionStyles.browseButton}
              onPress={() => router.push('./home')}
            >
              <Text style={subscriptionStyles.browseButtonText}>Khám phá gói dịch vụ</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={subscriptionStyles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color="#6366F1" />
              <Text style={subscriptionStyles.infoText}>
                Bạn có {subscriptions.length} gói đăng ký
              </Text>
            </View>

            {subscriptions.map((subscription) => (
              <View key={subscription._id} style={subscriptionStyles.subscriptionCard}>
                {/* Status Badge */}
                <View style={subscriptionStyles.cardHeader}>
                  <View
                    style={[
                      subscriptionStyles.statusBadge,
                      subscription.status === 'active' && subscriptionStyles.statusActive,
                      subscription.status === 'cancelled' && subscriptionStyles.statusCancelled,
                      subscription.status === 'inactive' && subscriptionStyles.statusInactive,
                    ]}
                  >
                    <Text style={subscriptionStyles.statusText}>
                      {subscription.status === 'active' && 'Đang hoạt động'}
                      {subscription.status === 'cancelled' && 'Đã hủy'}
                      {subscription.status === 'inactive' && 'Không hoạt động'}
                    </Text>
                  </View>
                </View>

                {/* Package Info */}
                <View style={subscriptionStyles.packageInfo}>
                  <Text style={subscriptionStyles.packageName}>
                    {subscription.packageName}
                  </Text>
                  <Text style={subscriptionStyles.packagePeriod}>
                    {subscription.period}
                  </Text>
                </View>

                {/* Details */}
                <View style={subscriptionStyles.detailsContainer}>
                  <View style={subscriptionStyles.detailRow}>
                    <Ionicons name="cash-outline" size={18} color="#6B7280" />
                    <Text style={subscriptionStyles.detailLabel}>Giá:</Text>
                    <Text style={subscriptionStyles.detailValue}>
                      £{subscription.pricePerPeriod.toFixed(2)}
                    </Text>
                  </View>

                  <View style={subscriptionStyles.detailRow}>
                    <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                    <Text style={subscriptionStyles.detailLabel}>Bắt đầu:</Text>
                    <Text style={subscriptionStyles.detailValue}>
                      {formatDate(subscription.startedAt)}
                    </Text>
                  </View>

                  {subscription.nextBillingDate && (
                    <View style={subscriptionStyles.detailRow}>
                      <Ionicons name="calendar-clear-outline" size={18} color="#6B7280" />
                      <Text style={subscriptionStyles.detailLabel}>Thanh toán tiếp theo:</Text>
                      <Text style={subscriptionStyles.detailValue}>
                        {formatNextBillingDate(subscription.nextBillingDate)}
                      </Text>
                    </View>
                  )}

                  {subscription.cancelledAt && (
                    <View style={subscriptionStyles.detailRow}>
                      <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                      <Text style={subscriptionStyles.detailLabel}>Hủy vào:</Text>
                      <Text style={[subscriptionStyles.detailValue, { color: '#EF4444' }]}>
                        {formatDate(subscription.cancelledAt)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                {subscription.status === 'active' && (
                  <View style={subscriptionStyles.actionsContainer}>
                    <TouchableOpacity
                      style={subscriptionStyles.viewPackageButton}
                      onPress={() => router.push(`./packageDetail?slug=${subscription.packageSlug}`)}
                    >
                      <Ionicons name="eye-outline" size={18} color="#6366F1" />
                      <Text style={subscriptionStyles.viewPackageButtonText}>Xem gói</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={subscriptionStyles.cancelButton}
                      onPress={() => handleCancelSubscription(subscription)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                      <Text style={subscriptionStyles.cancelButtonText}>Hủy đăng ký</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={subscriptionStyles.bottomNav}>
        <TouchableOpacity
          style={subscriptionStyles.navItem}
          onPress={() => router.push("./home")}
        >
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={subscriptionStyles.navItem}
          onPress={() => router.push("./subscriptions")}
        >
          <Ionicons name="receipt" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={subscriptionStyles.navItem}
          onPress={() => router.push('./cart')}
        >
          <View style={subscriptionStyles.cartIconContainer}>
            <Ionicons name="cart-outline" size={24} color="#9CA3AF" />
            {cartItemCount > 0 && (
              <View style={subscriptionStyles.cartBadge}>
                <Text style={subscriptionStyles.cartBadgeText}>
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const subscriptionStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  loginButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  browseButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#4338CA',
    marginLeft: 8,
    fontWeight: '500',
  },
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  packageInfo: {
    marginBottom: 16,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  packagePeriod: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewPackageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    gap: 6,
  },
  viewPackageButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    gap: 6,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    padding: 8,
  },
  cartIconContainer: {
    position: 'relative',
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

export default SubscriptionsScreen;

