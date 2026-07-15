import { api } from '../../services/api';

export type RequestedRole =
  | 'DECIDEUR'
  | 'ANALYSTE'
  | 'AGENT_TERRAIN';

export type AccountRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export type CreateAccountRequestPayload = {
  fullName: string;
  organization: string;
  position: string;
  requestedRole: RequestedRole;
  email: string;
  phone?: string;
  justification: string;
};

export type CreateAccountRequestResponse = {
  message: string;
  requestId: string;
};

export type AccountRequest = {
  id: string;
  fullName: string;
  organization: string;
  position: string;
  requestedRole: RequestedRole;
  email: string;
  phone?: string;
  justification: string;
  status: AccountRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type ApproveAccountRequestResponse = {
  message: string;
  requestId: string;
  user: {
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
};

export type RejectAccountRequestPayload = {
  reason?: string;
};

export type RejectAccountRequestResponse = {
  message: string;
  requestId: string;
};

export const accountRequestService = {
  async create(payload: CreateAccountRequestPayload) {
    const response = await api.post<CreateAccountRequestResponse>(
      '/account-requests',
      payload,
    );

    return response.data;
  },

  async findAll() {
    const response = await api.get<AccountRequest[]>('/account-requests');
    return response.data;
  },

  async approve(id: string) {
    const response = await api.patch<ApproveAccountRequestResponse>(
      `/account-requests/${id}/approve`,
    );

    return response.data;
  },

  async reject(id: string, payload: RejectAccountRequestPayload) {
    const response = await api.patch<RejectAccountRequestResponse>(
      `/account-requests/${id}/reject`,
      payload,
    );

    return response.data;
  },
};
