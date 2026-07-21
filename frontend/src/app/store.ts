import { create } from 'zustand';
import type { AuthUser } from '../modules/auth/auth.service';

type ThemeMode = 'light' | 'dark';

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

function getStoredTheme(): ThemeMode {
  const theme = localStorage.getItem('theme');

  if (theme === 'dark' || theme === 'light') {
    return theme;
  }

  return 'light';
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

type AppState = {
  token?: string;
  user?: AuthUser;
  isAuthHydrated: boolean;
  theme: ThemeMode;
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  clearAuth: () => void;
  hydrateAuth: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const initialTheme = getStoredTheme();
applyTheme(initialTheme);

export const useAppStore = create<AppState>((set, get) => ({
  token: localStorage.getItem('accessToken') ?? undefined,
  user: getStoredUser(),
  isAuthHydrated: true,
  theme: initialTheme,

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

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', nextTheme);
    applyTheme(nextTheme);
    set({ theme: nextTheme });
  },
}));
