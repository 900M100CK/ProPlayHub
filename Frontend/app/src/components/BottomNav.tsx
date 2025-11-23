import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useCartStore } from '../stores/cartStore';
import { colors, spacing } from '../styles/theme';

const NAV_ITEMS = [
  { label: 'home', icon: 'home-outline', href: '/src/pages/home' },
  { label: 'categories', icon: 'cube-outline', href: '/src/pages/subscriptionCategories' },
  { label: 'subs', icon: 'receipt-outline', href: '/src/pages/subscriptions' },
  { label: 'cart', icon: 'cart-outline', href: '/src/pages/cart' },
] as const;

const BottomNav = () => {
  const router = useRouter();
  const pathname = (usePathname() || '').toLowerCase();
  const { items, loadCartFromStorage } = useCartStore();
  const cartCount = items.length;

  useEffect(() => {
    loadCartFromStorage();
  }, [loadCartFromStorage]);

  const activeColor = '#A855F7';
  const inactiveColor = colors.textSecondary;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={styles.navBar}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href.toLowerCase());
          return (
            <TouchableOpacity
              key={item.href}
              style={styles.navItem}
              onPress={() => router.push(item.href)}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color={isActive ? activeColor : inactiveColor}
                />
                {item.label === 'cart' && cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>
                      {cartCount > 99 ? '99+' : cartCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  navBar: {
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
  iconWrapper: {
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

export default BottomNav;
