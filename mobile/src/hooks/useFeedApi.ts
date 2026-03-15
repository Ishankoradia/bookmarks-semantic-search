import apiClient from '../lib/api-client';
import type {
  Bookmark,
  FeedArticle,
  FeedArticleListResponse,
  FriendsFeedResponse,
  JobStatus,
} from '../types/api';

export function useFeedApi() {
  return {
    getFeed: async (skip = 0, limit = 50): Promise<FeedArticleListResponse> => {
      const response = await apiClient.get('/feed', {
        params: { skip, limit },
      });
      return response.data;
    },

    refreshFeed: async (): Promise<JobStatus> => {
      const response = await apiClient.post('/feed/refresh');
      return response.data;
    },

    getRefreshStatus: async (): Promise<JobStatus | { status: string; message: string }> => {
      const response = await apiClient.get('/feed/refresh/status');
      return response.data;
    },

    saveArticle: async (articleId: string): Promise<Bookmark> => {
      const response = await apiClient.post(`/feed/${articleId}/save`);
      return response.data;
    },

    markNotInterested: async (articleId: string): Promise<FeedArticle> => {
      const response = await apiClient.post(`/feed/${articleId}/not-interested`);
      return response.data;
    },

    getArticle: async (articleId: string): Promise<FeedArticle> => {
      const response = await apiClient.get(`/feed/${articleId}`);
      return response.data;
    },

    getFriendsFeed: async (skip = 0, limit = 20): Promise<FriendsFeedResponse> => {
      const response = await apiClient.get('/feed/friends', {
        params: { skip, limit },
      });
      return response.data;
    },
  };
}
