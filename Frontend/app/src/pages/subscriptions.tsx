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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import apiClient from '../api/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../components/ToastProvider';
import ConfirmationModal from '../components/ConfirmationModal';
import { colors, spacing, radius, shadow } from '../styles/theme';
import ScreenHeader from '../components/ScreenHeader';

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
  const { showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<Subscription | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    // Load cart items so the badge count stays accurate
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

      // Ensure token is set in headers
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await apiClient.get('/subscriptions/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSubscriptions(response.data || []);
    } catch (err: any) {
      console.error('Load subscriptions error:', err);
      console.error('Request URL:', err?.config?.url || 'Unknown');
      console.error('Full URL:', err?.config?.baseURL + err?.config?.url || 'Unknown');
      console.error('Response status:', err?.response?.status);
      console.error('Response data:', err?.response?.data);
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

  const handleCancelSubscription = (subscription: Subscription) => {
    setSubscriptionToCancel(subscription);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    if (cancelling) return;
    setShowCancelModal(false);
    setSubscriptionToCancel(null);
  };

  const confirmCancelSubscription = async () => {
    if (!subscriptionToCancel) return;
    try {
      setCancelling(true);

      let token = accessToken;
      if (!token) {
        token = await AsyncStorage.getItem('accessToken');
      }

      if (!token) {
        showToast({
          type: 'info',
          title: 'Sign-in required',
          message: 'Please log in to cancel a subscription.',
          action: {
            label: 'Go to login',
            onPress: () => router.replace('./login'),
          },
        });
        closeCancelModal();
        return;
      }

      await apiClient.delete(`/subscriptions/${subscriptionToCancel._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSubscriptions((prev) =>
        prev.filter((item) => item._id !== subscriptionToCancel._id)
      );

      showToast({
        type: 'success',
        title: 'Subscription cancelled',
        message: `"${subscriptionToCancel.packageName}" has been removed.`,
      });
    } catch (err: any) {
      console.error('Cancel subscription error:', err);
      const message =
        err?.response?.data?.message ||
        'Unable to cancel the subscription. Please try again.';
      showToast({
        type: 'error',
        title: 'Unable to cancel',
        message,
      });
    } finally {
      setCancelling(false);
      closeCancelModal();
    }
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

  // Authentication guard
  if (!accessToken && !user) {
    return (
      <SafeAreaView style={subscriptionStyles.container}>
        <StatusBar barStyle="light-content" />
        <ScreenHeader title="My subscriptions" />
        <View style={subscriptionStyles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={colors.textSecondary} />
          <Text style={subscriptionStyles.emptyTitle}>Sign-in required</Text>
          <Text style={subscriptionStyles.emptyText}>
            Please sign in to view your subscription packages.
          </Text>
          <TouchableOpacity
            style={subscriptionStyles.loginButton}
            onPress={() => router.push('./login')}
          >
            <Text style={subscriptionStyles.loginButtonText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={subscriptionStyles.container}>
        <StatusBar barStyle="light-content" />
        <ScreenHeader
          title="My subscriptions"
          rightSlot={
            <TouchableOpacity onPress={handleRefresh} style={subscriptionStyles.headerIconButton}>
              <Ionicons name="refresh-outline" size={22} color={colors.headerText} />
            </TouchableOpacity>
          }
        />
        <View style={subscriptionStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={subscriptionStyles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={subscriptionStyles.container}>
      <StatusBar barStyle="light-content" />
      <ScreenHeader
        title="My subscriptions"
        rightSlot={
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            style={[
              subscriptionStyles.headerIconButton,
              refreshing && { opacity: 0.5 },
            ]}
          >
            <Ionicons
              name="refresh-outline"
              size={22}
              color={colors.headerText}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={subscriptionStyles.content}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={
          <View style={{ flex: 1 }}>
            {/* Manual refresh indicator */}
          </View>
        }
      >
        {subscriptions.length === 0 ? (
          <View style={subscriptionStyles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
            <Text style={subscriptionStyles.emptyTitle}>No subscriptions yet</Text>
            <Text style={subscriptionStyles.emptyText}>
              You have not subscribed to any packages yet. Explore our services and sign up today!
            </Text>
            <TouchableOpacity
              style={subscriptionStyles.browseButton}
              onPress={() => router.push('./home')}
            >
              <Text style={subscriptionStyles.browseButtonText}>Browse packages</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={subscriptionStyles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={subscriptionStyles.infoText}>
                You have {subscriptions.length} active subscription{subscriptions.length === 1 ? '' : 's'}
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
                      {subscription.status === 'active' && 'Active'}
                      {subscription.status === 'cancelled' && 'Cancelled'}
                      {subscription.status === 'inactive' && 'Inactive'}
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
                    <Ionicons name="cash-outline" size={18} color={colors.textSecondary} />
                    <Text style={subscriptionStyles.detailLabel}>Price:</Text>
                    <Text style={subscriptionStyles.detailValue}>
                      £{subscription.pricePerPeriod.toFixed(2)}
                    </Text>
                  </View>

                  <View style={subscriptionStyles.detailRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                    <Text style={subscriptionStyles.detailLabel}>Started:</Text>
                    <Text style={subscriptionStyles.detailValue}>
                      {formatDate(subscription.startedAt)}
                    </Text>
                  </View>

                  {subscription.nextBillingDate && (
                    <View style={subscriptionStyles.detailRow}>
                      <Ionicons name="calendar-clear-outline" size={18} color={colors.textSecondary} />
                      <Text style={subscriptionStyles.detailLabel}>Next billing:</Text>
                      <Text style={subscriptionStyles.detailValue}>
                        {formatNextBillingDate(subscription.nextBillingDate)}
                      </Text>
                    </View>
                  )}

                  {subscription.cancelledAt && (
                    <View style={subscriptionStyles.detailRow}>
                      <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                      <Text style={subscriptionStyles.detailLabel}>Cancelled on:</Text>
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
                      <Ionicons name="eye-outline" size={18} color={colors.primary} />
                      <Text style={subscriptionStyles.viewPackageButtonText}>View package</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={subscriptionStyles.cancelButton}
                      onPress={() => handleCancelSubscription(subscription)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={colors.textPrimary} />
                      <Text style={subscriptionStyles.cancelButtonText}>Cancel subscription</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={showCancelModal && !!subscriptionToCancel}
        title="Cancel subscription"
        message={
          subscriptionToCancel
            ? `Are you sure you want to cancel "${subscriptionToCancel.packageName}"?`
            : ''
        }
        confirmLabel="Cancel subscription"
        cancelLabel="Keep subscription"
        loading={cancelling}
        onCancel={closeCancelModal}
        onConfirm={confirmCancelSubscription}
      />

      {/* Bottom Navigation */}
      <View style={subscriptionStyles.bottomNav}>
        <TouchableOpacity
          style={subscriptionStyles.navItem}
          onPress={() => router.push("./home")}
        >
          <Ionicons name="home-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={subscriptionStyles.navItem}
          onPress={() => router.push("./subscriptions")}
        >
          <Ionicons name="receipt" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={subscriptionStyles.navItem}
          onPress={() => router.push('./cart')}
        >
          <View style={subscriptionStyles.cartIconContainer}>
            <Ionicons name="cart-outline" size={24} color={colors.textSecondary} />
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
    backgroundColor: colors.background,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  loginButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  browseButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  infoText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  statusActive: {
    backgroundColor: '#064E3B',
  },
  statusCancelled: {
    backgroundColor: '#7F1D1D',
  },
  statusInactive: {
    backgroundColor: colors.border,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  packageInfo: {
    marginBottom: spacing.md,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  packagePeriod: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  detailValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewPackageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  viewPackageButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FEE2E2',
    gap: spacing.xs,
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navItem: {
    padding: spacing.xs,
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  cartBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default SubscriptionsScreen;

