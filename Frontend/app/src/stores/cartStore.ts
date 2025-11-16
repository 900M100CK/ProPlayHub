import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useAuthStore } from './authStore';

// Định nghĩa kiểu dữ liệu cho Cart Item
export type CartItem = {
  _id: string;
  slug: string;
  name: string;
  category: string;
  type: string;
  basePrice: number;
  period: string;
  discountLabel?: string;
  features: string[];
  isSeasonalOffer: boolean;
  tags?: string[];
  finalPrice: number; // Giá sau khi giảm (nếu có)
};

type CartState = {
  items: CartItem[];
  addToCart: (item: CartItem) => Promise<boolean>;
  removeFromCart: (slug: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
  isInCart: (slug: string) => boolean;
  loadCartFromStorage: () => Promise<void>;
  saveCartToStorage: () => Promise<void>;
};

export const useCartStore = create<CartState>((set, get) => ({
  // Initial state
  items: [],

  // Add item to cart
  addToCart: async (item: CartItem) => {
    // Kiểm tra authentication
    const authState = useAuthStore.getState();
    if (!authState.accessToken || !authState.user) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => {
            // Navigate to login - sẽ được handle ở component
            return true; // Return true để component có thể navigate
          }}
        ]
      );
      return false; // Return false để báo cần login
    }

    const { items } = get();
    
    // Kiểm tra xem item đã có trong cart chưa
    const existingItem = items.find((i) => i.slug === item.slug);
    
    if (existingItem) {
      Alert.alert(
        'Đã có trong giỏ hàng',
        'Gói dịch vụ này đã có trong giỏ hàng của bạn.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Thêm item vào cart
    const newItems = [...items, item];
    set({ items: newItems });
    
    // Lưu vào AsyncStorage
    try {
      await AsyncStorage.setItem('cartItems', JSON.stringify(newItems));
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
    }

    Alert.alert('Thành công', 'Đã thêm vào giỏ hàng!', [{ text: 'OK' }]);
    return true;
  },

  // Remove item from cart
  removeFromCart: async (slug: string) => {
    const { items } = get();
    const newItems = items.filter((item) => item.slug !== slug);
    set({ items: newItems });
    
    // Lưu vào AsyncStorage
    try {
      await AsyncStorage.setItem('cartItems', JSON.stringify(newItems));
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
    }
  },

  // Clear cart
  clearCart: async () => {
    set({ items: [] });
    try {
      await AsyncStorage.removeItem('cartItems');
    } catch (error) {
      console.error('Failed to clear cart from storage:', error);
    }
  },

  // Get total price
  getTotalPrice: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.finalPrice, 0);
  },

  // Get item count
  getItemCount: () => {
    const { items } = get();
    return items.length;
  },

  // Check if item is in cart
  isInCart: (slug: string) => {
    const { items } = get();
    return items.some((item) => item.slug === slug);
  },

  // Load cart from AsyncStorage
  loadCartFromStorage: async () => {
    try {
      const cartData = await AsyncStorage.getItem('cartItems');
      if (cartData) {
        const items = JSON.parse(cartData);
        set({ items });
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
    }
  },

  // Save cart to AsyncStorage
  saveCartToStorage: async () => {
    try {
      const { items } = get();
      await AsyncStorage.setItem('cartItems', JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
    }
  },
}));

