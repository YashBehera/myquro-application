import { create } from 'zustand';
import { User } from '../types';
import { secureStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setToken: async (token) => {
    if (token) {
      await secureStorage.setItem('auth_token', token);
    } else {
      await secureStorage.removeItem('auth_token');
    }
    set({ token });
  },

  logout: async () => {
    await secureStorage.removeItem('auth_token');
    try {
      await AsyncStorage.multiRemove([
        '@myquro_active_restaurant_id',
        '@myquro_restaurant_menu_v2',
        '@myquro_restaurant_menu_v1',
        '@placed_orders_history',
      ]);
    } catch {}
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
}));
