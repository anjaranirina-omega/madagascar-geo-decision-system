import { api } from '../../services/api';

export type Role = {
  id: string;
  name: 'ADMIN' | 'DECIDEUR' | 'ANALYSTE' | 'AGENT_TERRAIN';
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string | null;
  isActive: boolean;
  role?: Role;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  avatarUrl?: string | null;
  roleId?: string;
  isActive?: boolean;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

export const usersService = {
  async findAll() {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  async findRoles() {
    const response = await api.get<Role[]>('/roles');
    return response.data;
  },

  async create(payload: CreateUserPayload) {
    const response = await api.post<User>('/users', payload);
    return response.data;
  },

  async update(id: string, payload: UpdateUserPayload) {
    const response = await api.patch<User>(`/users/${id}`, payload);
    return response.data;
  },

  async remove(id: string) {
    const response = await api.delete<{ deleted: boolean }>(`/users/${id}`);
    return response.data;
  },

  async uploadAvatar(id: string, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post<User>(`/users/${id}/avatar`, formData);

    return response.data;
  },

  async removeAvatar(id: string) {
    const response = await api.delete<User>(`/users/${id}/avatar`);
    return response.data;
  },

};
