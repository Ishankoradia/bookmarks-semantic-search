import apiClient from '../lib/api-client';

export function useAccountApi() {
  return {
    submitFeedback: async (type: 'feedback' | 'bug' | 'feature', message: string): Promise<{ message: string }> => {
      const response = await apiClient.post('/auth/feedback', { type, message });
      return response.data;
    },

    deleteAccount: async (reason: string): Promise<{ message: string }> => {
      const response = await apiClient.delete('/auth/account', { data: { reason } });
      return response.data;
    },
  };
}
