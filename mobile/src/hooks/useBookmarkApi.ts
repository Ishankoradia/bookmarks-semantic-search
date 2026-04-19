import apiClient from '../lib/api-client';
import type {
  Bookmark,
  BookmarkSearchResult,
  BookmarkPreviewResponse,
  BookmarkSaveRequest,
  SearchQuery,
  TagPreviewResponse,
  JobStatus,
} from '../types/api';

export function useBookmarkApi() {
  return {
    previewBookmark: async (url: string): Promise<BookmarkPreviewResponse> => {
      const response = await apiClient.post('/bookmarks/preview', { url });
      return response.data;
    },

    saveBookmark: async (data: BookmarkSaveRequest): Promise<Bookmark> => {
      const response = await apiClient.post('/bookmarks/save', data);
      return response.data;
    },

    getBookmarks: async (
      skip = 0,
      limit = 100,
      isRead?: boolean,
      categories?: string[],
      tags?: string[]
    ): Promise<Bookmark[]> => {
      const params: Record<string, any> = { skip, limit };
      if (isRead !== undefined) params.is_read = isRead;
      if (categories && categories.length > 0) params.categories = categories;
      if (tags && tags.length > 0) params.tags = tags;
      const response = await apiClient.get('/bookmarks/', {
        params,
        paramsSerializer: { indexes: null },
      });
      return response.data;
    },

    getBookmark: async (id: string): Promise<Bookmark> => {
      const response = await apiClient.get(`/bookmarks/${id}`);
      return response.data;
    },

    deleteBookmark: async (id: string): Promise<void> => {
      await apiClient.delete(`/bookmarks/${id}`);
    },

    searchBookmarks: async (query: SearchQuery): Promise<BookmarkSearchResult[]> => {
      const response = await apiClient.post('/bookmarks/search', query);
      return response.data;
    },

    updateReadStatus: async (id: string, isRead: boolean): Promise<Bookmark> => {
      const response = await apiClient.patch(`/bookmarks/${id}/read-status`, {
        is_read: isRead,
      });
      return response.data;
    },

    updateTags: async (id: string, tags: string[]): Promise<Bookmark> => {
      const response = await apiClient.put(`/bookmarks/${id}`, { tags });
      return response.data;
    },

    regenerateTags: async (bookmarkId: string): Promise<TagPreviewResponse> => {
      const response = await apiClient.post(`/bookmarks/${bookmarkId}/regenerate-tags`);
      return response.data;
    },

    getCategories: async (
      isRead?: boolean,
      categories?: string[],
      tags?: string[]
    ): Promise<Record<string, number>> => {
      const params: Record<string, any> = {};
      if (isRead !== undefined) params.is_read = isRead;
      if (categories && categories.length > 0) params.categories = categories;
      if (tags && tags.length > 0) params.tags = tags;
      const response = await apiClient.get('/bookmarks/categories', {
        params,
        paramsSerializer: { indexes: null },
      });
      return response.data;
    },

    getCategoryList: async (): Promise<string[]> => {
      const response = await apiClient.get('/bookmarks/categories/list');
      return response.data;
    },

    refreshCategory: async (
      category: string
    ): Promise<{ job_id: string; status: string; total_bookmarks?: number }> => {
      const response = await apiClient.post(
        `/categories/${encodeURIComponent(category)}/refresh`
      );
      return response.data;
    },

    getJobStatus: async (jobId: string): Promise<JobStatus> => {
      const response = await apiClient.get(`/jobs/${jobId}`);
      return response.data;
    },

    getActiveJobs: async (): Promise<JobStatus[]> => {
      const response = await apiClient.get('/jobs/active');
      return response.data;
    },
  };
}
