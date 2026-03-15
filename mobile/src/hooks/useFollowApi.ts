import apiClient from '../lib/api-client';
import type {
  FollowRequest,
  FollowListResponse,
  PendingRequestsResponse,
  UserProfileResponse,
} from '../types/api';

export function useFollowApi() {
  return {
    sendFollowRequest: async (userUuid: string): Promise<FollowRequest> => {
      const response = await apiClient.post('/follows/request', { user_uuid: userUuid });
      return response.data;
    },

    getSentPendingRequests: async (): Promise<PendingRequestsResponse> => {
      const response = await apiClient.get('/follows/requests/pending');
      return response.data;
    },

    getReceivedPendingRequests: async (): Promise<PendingRequestsResponse> => {
      const response = await apiClient.get('/follows/requests/received');
      return response.data;
    },

    getPendingRequestsCount: async (): Promise<number> => {
      const response = await apiClient.get('/follows/requests/count');
      return response.data.count;
    },

    respondToRequest: async (
      requestId: number,
      status: 'accepted' | 'rejected'
    ): Promise<FollowRequest> => {
      const response = await apiClient.put(`/follows/requests/${requestId}`, { status });
      return response.data;
    },

    cancelRequest: async (requestId: number): Promise<void> => {
      await apiClient.delete(`/follows/requests/${requestId}`);
    },

    getFollowers: async (skip = 0, limit = 50): Promise<FollowListResponse> => {
      const response = await apiClient.get('/follows/followers', {
        params: { skip, limit },
      });
      return response.data;
    },

    getFollowing: async (skip = 0, limit = 50): Promise<FollowListResponse> => {
      const response = await apiClient.get('/follows/following', {
        params: { skip, limit },
      });
      return response.data;
    },

    unfollow: async (userUuid: string): Promise<void> => {
      await apiClient.delete(`/follows/following/${userUuid}`);
    },

    removeFollower: async (userUuid: string): Promise<void> => {
      await apiClient.delete(`/follows/followers/${userUuid}`);
    },

    getUserProfile: async (userUuid: string): Promise<UserProfileResponse> => {
      const response = await apiClient.get(`/follows/users/${userUuid}/profile`);
      return response.data;
    },

    searchUsers: async (
      query: string,
      skip = 0,
      limit = 20
    ): Promise<UserProfileResponse[]> => {
      const response = await apiClient.get('/follows/search', {
        params: { q: query, skip, limit },
      });
      return response.data;
    },
  };
}
