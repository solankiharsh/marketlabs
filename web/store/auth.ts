'use client';

import { create } from 'zustand';
import type { UserInfo } from '@/lib/api';
import {
  tokenManager,
  getUserInfo,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
} from '@/lib/api';

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  checked: boolean;
  login: (username: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (email: string, code: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: UserInfo | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  checked: false,

  login: async (username: string, password: string, turnstileToken?: string) => {
    const result = await apiLogin(username, password, turnstileToken);
    // Only set authenticated when we actually received a token (so AuthGuard doesn't clear us)
    const hasToken = !!(result?.token && typeof result.token === 'string');
    set({
      user: result?.userinfo ?? null,
      isAuthenticated: hasToken,
      checked: true,
    });
  },

  register: async (email: string, code: string, username: string, password: string) => {
    const result = await apiRegister(email, code, username, password);
    const hasToken = !!(result?.token && typeof result.token === 'string');
    set({
      user: result?.userinfo ?? null,
      isAuthenticated: hasToken,
      checked: true,
    });
  },

  logout: async () => {
    await apiLogout();
    set({ user: null, isAuthenticated: false, checked: true });
  },

  checkAuth: async () => {
    const token = tokenManager.getToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, checked: true });
      return;
    }
    try {
      const user = await getUserInfo();
      set({ user, isAuthenticated: true, checked: true });
    } catch {
      set({ user: null, isAuthenticated: false, checked: true });
    }
  },

  setUser: (user: UserInfo | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));
