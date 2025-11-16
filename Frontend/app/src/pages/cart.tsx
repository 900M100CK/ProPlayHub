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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';

const CartScreen = () => {
  const router = useRouter();
  const { items, removeFromCart, clearCart, getTotalPrice, loadCartFromStorage } = useCartStore();
  const { accessToken, user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCart = async () => {
      await loadCartFromStorage();
      setLoading(false);
    };
    loadCart();
  }, [loadCartFromStorage]);

  // Kiểm tra đăng nhập
  if (!accessToken || !user) {
    return (
      <SafeAreaView style={cartStyles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={cartStyles.header}>
          <TouchableOpacity style={cartStyles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={cartStyles.headerTitle}>Giỏ hàng</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={cartStyles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#9CA3AF" />
          <Text style={cartStyles.emptyTitle}>Yêu cầu đăng nhập</Text>
          <Text style={cartStyles.emptyText}>
            Bạn cần đăng nhập để xem giỏ hàng của mình.
          </Text>
          <TouchableOpacity
            style={cartStyles.loginButton}
            onPress={() => router.push('./login')}
          >
            <Text style={cartStyles.loginButtonText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={cartStyles.container}>
        <View style={cartStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#818CF8" />
        </View>
      </SafeAreaView>
    );
  }

  const totalPrice = getTotalPrice();

  const handleRemoveItem = (slug: string, name: string) => {
    Alert.alert(
      'Xóa sản phẩm',
      `Bạn có chắc chắn muốn xóa "${name}" khỏi giỏ hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => removeFromCart(slug),
        },
      ]
    );
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    
    Alert.alert(
      'Xóa toàn bộ giỏ hàng',
      'Bạn có chắc chắn muốn xóa toàn bộ sản phẩm khỏi giỏ hàng?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: () => clearCart(),
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Giỏ hàng trống', 'Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán.');
      return;
    }

    // Navigate to checkout page - checkout sẽ load tất cả items từ cart
    router.push('./checkout');
  };

  return (
    <SafeAreaView style={cartStyles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={cartStyles.header}>
        <TouchableOpacity style={cartStyles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={cartStyles.headerTitle}>Giỏ hàng</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearCart} style={cartStyles.clearButton}>
            <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={cartStyles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#D1D5DB" />
          <Text style={cartStyles.emptyTitle}>Giỏ hàng trống</Text>
          <Text style={cartStyles.emptyText}>
            Chưa có sản phẩm nào trong giỏ hàng của bạn.
          </Text>
          <TouchableOpacity
            style={cartStyles.shopButton}
            onPress={() => router.push('./home')}
          >
            <Text style={cartStyles.shopButtonText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={cartStyles.content} showsVerticalScrollIndicator={false}>
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
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Footer với tổng tiền và nút checkout */}
          <View style={cartStyles.footer}>
            <View style={cartStyles.totalRow}>
              <Text style={cartStyles.totalLabel}>Tổng cộng:</Text>
              <Text style={cartStyles.totalPrice}>£{totalPrice.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={cartStyles.checkoutButton} onPress={handleCheckout}>
              <Text style={cartStyles.checkoutButtonText}>Thanh toán</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const cartStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#818CF8',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#818CF8',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shopButton: {
    backgroundColor: '#818CF8',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#A855F7',
  },
  period: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  removeButton: {
    padding: 4,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#A855F7',
  },
  checkoutButton: {
    backgroundColor: '#818CF8',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CartScreen;

