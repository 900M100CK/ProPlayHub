import { create } from 'zustand';
import { useAuthStore } from './authStore';
import apiClient from '../api/axiosConfig';

export type SelectedAddon = {
  key: string;
  name: string;
  price: number;
};

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
  finalPrice: number;
  selectedAddons: SelectedAddon[];
};

export type AddToCartResult = {
  success: boolean;
  reason?: 'AUTH_REQUIRED' | 'ALREADY_EXISTS' | 'STORAGE_ERROR';
  message?: string;
};

type CartState = {
  items: CartItem[];
  addToCart: (item: CartItem) => Promise<AddToCartResult>;
  removeFromCart: (slug: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalPrice: () => number;
  getItemCount: () => number;
  isInCart: (slug: string) => boolean;
  loadCartFromStorage: () => Promise<void>;
  saveCartToStorage: () => Promise<void>;
};

const getUserId = (state = useAuthStore.getState()) =>
  state.user?._id || (state.user as any)?.id || null;

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addToCart: async (item: CartItem) => {
    const authState = useAuthStore.getState();
    const userId = getUserId(authState);
    if (!authState.accessToken || !authState.user || !userId) {
      return { success: false, reason: 'AUTH_REQUIRED', message: 'Authentication is required.' };
    }

    try {
      await apiClient.post('/cart', item);
      await get().loadCartFromStorage();
      return { success: true };
    } catch (error: any) {
      if (error?.response?.status === 409) {
        return {
          success: false,
          reason: 'ALREADY_EXISTS',
          message: error?.response?.data?.message || 'Item already exists in cart.',
        };
      }
      console.error('Failed to add to cart:', error);
      return {
        success: false,
        reason: 'STORAGE_ERROR',
        message: 'Failed to persist cart data.',
      };
    }
  },

  removeFromCart: async (slug: string) => {
    try {
      await apiClient.delete(`/cart/${slug}`);
    } catch (error) {
      console.error('Failed to remove cart item:', error);
    } finally {
      await get().loadCartFromStorage();
    }
  },

  clearCart: async () => {
    try {
      await apiClient.delete('/cart');
    } catch (error) {
      console.error('Failed to clear cart:', error);
    } finally {
      set({ items: [] });
    }
  },

  getTotalPrice: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.finalPrice, 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.length;
  },

  isInCart: (slug: string) => {
    const { items } = get();
    return items.some((item) => item.slug === slug);
  },

  loadCartFromStorage: async () => {
    const authState = useAuthStore.getState();
    const userId = getUserId(authState);
    if (!authState.accessToken || !authState.user || !userId) {
      set({ items: [] });
      return;
    }
    try {
      const res = await apiClient.get('/cart');
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      const normalizedItems: CartItem[] = Array.isArray(data)
        ? data.map((item: CartItem) => ({
            ...item,
            selectedAddons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
          }))
        : [];
      set({ items: normalizedItems });
    } catch (error) {
      console.error('Failed to load cart from backend:', error);
      set({ items: [] });
    }
  },

  saveCartToStorage: async () => {
    // backend persistence; no-op
  },
}));

let cartAuthUnsubscribe: (() => void) | null = null;
if (!cartAuthUnsubscribe) {
  let prevUserId = getUserId();
  useCartStore.getState().loadCartFromStorage();
  cartAuthUnsubscribe = useAuthStore.subscribe((state) => {
    const nextId = getUserId(state);
    if (nextId !== prevUserId) {
      prevUserId = nextId;
      useCartStore.getState().loadCartFromStorage();
    }
  });
}

const CartStoreRoute = () => null;
export default CartStoreRoute;

