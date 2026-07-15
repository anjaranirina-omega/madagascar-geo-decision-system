import { api } from '../../services/api';

export type RequestedRole =
  | 'DECIDEUR'
  | 'ANALYSTE'
  | 'AGENT_TERRAIN';

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

export const accountRequestService = {
  async create(payload: CreateAccountRequestPayload) {
    const response = await api.post<CreateAccountRequestResponse>(
      '/account-requests',
      payload,
    );

    return response.data;
  },
};
