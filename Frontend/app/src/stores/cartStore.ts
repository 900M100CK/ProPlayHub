import React from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export type AddToCartResult = {
  success: boolean;
  reason?: 'AUTH_REQUIRED' | 'ALREADY_EXISTS' | 'STORAGE_ERROR';
  message?: string;
};

type CartState = {
  items: CartItem[];
  addToCart: (item: CartItem) => Promise<AddToCartResult>;
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
      return {
        success: false,
        reason: 'AUTH_REQUIRED',
        message: 'Authentication is required.',
      };
    }

    const { items } = get();
    
    // Kiểm tra xem item đã có trong cart chưa
    const existingItem = items.find((i) => i.slug === item.slug);
    
    if (existingItem) {
      return {
        success: false,
        reason: 'ALREADY_EXISTS',
        message: 'Item already exists in cart.',
      };
    }

    // Thêm item vào cart
    const newItems = [...items, item];
    set({ items: newItems });
    
    // Lưu vào AsyncStorage
    try {
      await AsyncStorage.setItem('cartItems', JSON.stringify(newItems));
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
      return {
        success: false,
        reason: 'STORAGE_ERROR',
        message: 'Failed to persist cart data.',
      };
    }

    return { success: true };
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

const CartStoreRoute = () => null;
export default CartStoreRoute;
