import apiClient from '../lib/api-client';
import type { UserPreference, UserPreferenceUpdate, TopicsListResponse } from '../types/api';

export function usePreferencesApi() {
  return {
    getPreferences: async (): Promise<UserPreference> => {
      const response = await apiClient.get('/preferences');
      return response.data;
    },

    updatePreferences: async (data: UserPreferenceUpdate): Promise<UserPreference> => {
      const response = await apiClient.put('/preferences', data);
      return response.data;
    },

    getTopics: async (): Promise<string[]> => {
      const response = await apiClient.get('/preferences/topics');
      return (response.data as TopicsListResponse).topics;
    },
  };
}
