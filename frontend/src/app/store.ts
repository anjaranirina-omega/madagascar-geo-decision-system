import { create } from 'zustand';
import type { AuthUser } from '../modules/auth/auth.service';

function getStoredUser(): AuthUser | undefined {
  const userRaw = localStorage.getItem('authUser');

  if (!userRaw) {
    return undefined;
  }

  try {
    return JSON.parse(userRaw) as AuthUser;
  } catch {
    localStorage.removeItem('authUser');
    return undefined;
  }
}

type AppState = {
  token?: string;
  user?: AuthUser;
  isAuthHydrated: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  clearAuth: () => void;
  hydrateAuth: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  token: localStorage.getItem('accessToken') ?? undefined,
  user: getStoredUser(),
  isAuthHydrated: true,

  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('authUser', JSON.stringify(user));

    set({
      token: accessToken,
      user,
      isAuthHydrated: true,
    });
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');

    set({
      token: undefined,
      user: undefined,
      isAuthHydrated: true,
    });
  },

  hydrateAuth: () => {
    const token = localStorage.getItem('accessToken') ?? undefined;
    const user = getStoredUser();

    set({
      token,
      user,
      isAuthHydrated: true,
    });
  },
}));
