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

export const authService = {
  async login(payload: LoginPayload) {
    const response = await api.post<LoginResponse>('/auth/login', payload);
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
