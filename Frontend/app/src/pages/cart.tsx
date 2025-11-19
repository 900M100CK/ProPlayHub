// app/src/pages/cart.tsx
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
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/ToastProvider';
import ConfirmationModal from '../components/ConfirmationModal';
import { colors, spacing, radius, shadow } from '../styles/theme';

const CartScreen = () => {
  const router = useRouter();
  const { items, removeFromCart, clearCart, getTotalPrice, loadCartFromStorage } = useCartStore();
  const { accessToken, user } = useAuthStore();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => Promise<void> | void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    onConfirm: undefined,
  });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const loadCart = async () => {
      await loadCartFromStorage();
      setLoading(false);
    };
    loadCart();
  }, [loadCartFromStorage]);

  const openConfirmModal = (config: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => Promise<void> | void;
  }) => {
    setConfirmConfig({
      visible: true,
      title: config.title,
      message: config.message,
      confirmLabel: config.confirmLabel ?? 'Confirm',
      cancelLabel: config.cancelLabel ?? 'Cancel',
      onConfirm: config.onConfirm,
    });
  };

  const closeConfirmModal = () => {
    if (confirming) return;
    setConfirmConfig((prev) => ({ ...prev, visible: false }));
  };

  const handleConfirmAction = async () => {
    if (!confirmConfig.onConfirm) {
      closeConfirmModal();
      return;
    }
    try {
      setConfirming(true);
      await confirmConfig.onConfirm();
    } finally {
      setConfirming(false);
      closeConfirmModal();
    }
  };

  // Authentication guard
  if (!accessToken || !user) {
    return (
      <SafeAreaView style={cartStyles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={cartStyles.header}>
          <TouchableOpacity style={cartStyles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={cartStyles.headerTitle}>Cart</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={cartStyles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={colors.textSecondary} />
          <Text style={cartStyles.emptyTitle}>Sign-in required</Text>
          <Text style={cartStyles.emptyText}>
            Please sign in to view your cart.
          </Text>
          <TouchableOpacity
            style={cartStyles.loginButton}
            onPress={() => router.push('./login')}
          >
            <Text style={cartStyles.loginButtonText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={cartStyles.container}>
        <View style={cartStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const totalPrice = getTotalPrice();

  const handleRemoveItem = (slug: string, name: string) => {
    openConfirmModal({
      title: 'Remove item',
      message: `Are you sure you want to remove "${name}" from your cart?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        await removeFromCart(slug);
        showToast({
          type: 'info',
          title: 'Removed from cart',
          message: `"${name}" has been removed.`,
        });
      },
    });
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    
    openConfirmModal({
      title: 'Clear cart',
      message: 'Are you sure you want to remove every item from your cart?',
      confirmLabel: 'Clear all',
      onConfirm: async () => {
        await clearCart();
        showToast({
          type: 'info',
          title: 'Cart cleared',
          message: 'All items have been removed from your cart.',
        });
      },
    });
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      showToast({
        type: 'info',
        title: 'Cart is empty',
        message: 'Add at least one item before heading to checkout.',
      });
      return;
    }

    // Navigate to checkout; that screen will load everything from the cart
    router.push('./checkout');
  };

  return (
    <SafeAreaView style={cartStyles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={cartStyles.header}>
        <TouchableOpacity style={cartStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={cartStyles.headerTitle}>Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearCart} style={cartStyles.clearButton}>
            <Ionicons name="trash-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={cartStyles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.textSecondary} />
          <Text style={cartStyles.emptyTitle}>Cart is empty</Text>
          <Text style={cartStyles.emptyText}>
            There are no products in your cart yet.
          </Text>
          <TouchableOpacity
            style={cartStyles.shopButton}
            onPress={() => router.push('./home')}
          >
            <Text style={cartStyles.shopButtonText}>Continue shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={cartStyles.content}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <View key={item.slug} style={cartStyles.itemCard}>
                <View style={cartStyles.itemInfo}>
                  <Text style={cartStyles.itemName}>{item.name}</Text>
                  <Text style={cartStyles.itemType}>{item.type}</Text>
                  <Text style={cartStyles.itemCategory}>{item.category}</Text>
                  
                  <View style={cartStyles.itemPriceRow}>
                    {item.discountLabel && (
                      <View style={cartStyles.discountBadge}>
                        <Text style={cartStyles.discountText}>{item.discountLabel}</Text>
                      </View>
                    )}
                    <View style={cartStyles.priceContainer}>
                      {item.basePrice !== item.finalPrice && (
                        <Text style={cartStyles.originalPrice}>
                          £{item.basePrice.toFixed(2)}
                        </Text>
                      )}
                      <Text style={cartStyles.finalPrice}>
                        £{item.finalPrice.toFixed(2)}
                        <Text style={cartStyles.period}> {item.period}</Text>
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={cartStyles.removeButton}
                  onPress={() => handleRemoveItem(item.slug, item.name)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Footer showing totals and the checkout button */}
          <View style={cartStyles.footer}>
            <View style={cartStyles.totalRow}>
              <Text style={cartStyles.totalLabel}>Total:</Text>
              <Text style={cartStyles.totalPrice}>£{totalPrice.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={cartStyles.checkoutButton} onPress={handleCheckout}>
              <Text style={cartStyles.checkoutButtonText}>Checkout</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.textPrimary} style={{ marginLeft: spacing.xs }} />
            </TouchableOpacity>
          </View>
        </>
      )}
      <ConfirmationModal
        visible={confirmConfig.visible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        cancelLabel={confirmConfig.cancelLabel}
        loading={confirming}
        onCancel={closeConfirmModal}
        onConfirm={handleConfirmAction}
      />
    </SafeAreaView>
  );
};

const cartStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
  },
  header: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clearButton: {
    padding: spacing.xs,
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
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
  shopButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  shopButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...shadow.card,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  discountBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  period: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  removeButton: {
    padding: spacing.xs,
  },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CartScreen;

