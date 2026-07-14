import { create } from 'zustand';
import type { AuthUser } from '../modules/auth/auth.service';

type AppState = {
  token?: string;
  user?: AuthUser;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  clearAuth: () => void;
  hydrateAuth: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  token: undefined,
  user: undefined,

  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('authUser', JSON.stringify(user));

    set({
      token: accessToken,
      user,
    });
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');

    set({
      token: undefined,
      user: undefined,
    });
  },

  hydrateAuth: () => {
    const token = localStorage.getItem('accessToken');
    const userRaw = localStorage.getItem('authUser');

    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as AuthUser;
        set({ token, user });
      } catch {
        localStorage.removeItem('authUser');
      }
    }
  },
}));
