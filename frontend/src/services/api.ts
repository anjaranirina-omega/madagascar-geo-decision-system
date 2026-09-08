import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAppStore } from '../app/store';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Intercepteur de requête : injecte l'access token dans l'en-tête Authorization
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else if (token) {
      item.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercepteur de réponse : gère le rafraîchissement transparent du token en cas de 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Si pas d'erreur HTTP ou si statut différent de 401, on rejette directement
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';

    // Éviter les boucles infinies :
    // Ne pas tenter de rafraîchir si la requête a déjà été retentée
    // ou si l'erreur provient des routes d'authentification directes (login, refresh, etc.)
    if (
      originalRequest._retry ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/forgot-password') ||
      requestUrl.includes('/auth/reset-password')
    ) {
      if (requestUrl.includes('/auth/refresh')) {
        useAppStore.getState().clearAuth();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');

    // Si aucun refresh token n'est disponible, on déconnecte et on redirige vers /login
    if (!refreshToken) {
      useAppStore.getState().clearAuth();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Si une demande de rafraîchissement est déjà en cours par une requête précédente,
    // on met cette requête en file d'attente pour attendre le nouveau token.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api(originalRequest));
          },
          reject: (queueError: unknown) => {
            reject(queueError);
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Appel direct avec une instance axios brute pour ne pas déclencher l'intercepteur récursif
      const response = await axios.post<{
        accessToken: string;
        refreshToken?: string;
      }>(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;

      // Met à jour les tokens dans le store Zustand et localStorage
      useAppStore.getState().setTokens(accessToken, newRefreshToken);

      // Met à jour les en-têtes par défaut et de la requête originale
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Débloque et rejoue toutes les requêtes en attente
      processQueue(null, accessToken);

      // Rejoue la requête initiale avec le nouvel access token
      return api(originalRequest);
    } catch (refreshError) {
      // Échec du rafraîchissement (refresh token révoqué, expiré ou invalide)
      processQueue(refreshError, null);
      useAppStore.getState().clearAuth();

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
