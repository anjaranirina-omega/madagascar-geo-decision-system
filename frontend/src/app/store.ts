import { create } from 'zustand';

type AppState = { token?: string; setToken: (token?: string) => void };
export const useAppStore = create<AppState>((set) => ({ setToken: (token) => set({ token }) }));
