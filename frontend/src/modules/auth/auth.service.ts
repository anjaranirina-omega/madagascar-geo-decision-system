import { api } from '../../services/api';

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: {
    id: string;
    name: string;
    description?: string;
  };
};

export type LoginResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type ForgotPasswordResponse = {
  message: string;
  emailSent?: boolean;
};

export const authService = {
  async login(payload: LoginPayload) {
    const response = await api.post<LoginResponse>('/auth/login', payload);
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post<ForgotPasswordResponse>(
      '/auth/forgot-password',
      { email },
    );
    return response.data;
  },

  async resetPassword(token: string, newPassword: string) {
    const response = await api.post<{ message: string }>(
      '/auth/reset-password',
      { token, newPassword },
    );
    return response.data;
  },

  async profile() {
    const response = await api.get<AuthUser>('/auth/profile');
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authUser');
    }
  },
};
