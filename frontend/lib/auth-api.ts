import { useAuthenticatedApi } from "./api-auth";
import { 
  Bookmark, 
  BookmarkSearchResult, 
  CreateBookmarkRequest, 
  SearchQuery, 
  TagPreviewResponse,
  JobStatus 
} from "./api";

// Authenticated API helper functions
export const useBookmarkApi = () => {
  const { makeRequest } = useAuthenticatedApi();

  return {
    // Create bookmark
    createBookmark: async (data: CreateBookmarkRequest): Promise<Bookmark> => {
      return makeRequest(async (api) => {
        const response = await api.post<Bookmark>('/bookmarks/', data);
        return response.data;
      });
    },

    // Get bookmarks
    getBookmarks: async (skip = 0, limit = 100): Promise<Bookmark[]> => {
      return makeRequest(async (api) => {
        const response = await api.get<Bookmark[]>('/bookmarks/', {
          params: { skip, limit },
        });
        return response.data;
      });
    },

    // Get single bookmark
    getBookmark: async (id: string): Promise<Bookmark> => {
      return makeRequest(async (api) => {
        const response = await api.get<Bookmark>(`/bookmarks/${id}`);
        return response.data;
      });
    },

    // Delete bookmark
    deleteBookmark: async (id: string): Promise<void> => {
      return makeRequest(async (api) => {
        await api.delete(`/bookmarks/${id}`);
      });
    },

    // Search bookmarks
    searchBookmarks: async (query: SearchQuery): Promise<BookmarkSearchResult[]> => {
      return makeRequest(async (api) => {
        const response = await api.post<BookmarkSearchResult[]>('/bookmarks/search', query);
        return response.data;
      });
    },

    // Update read status
    updateReadStatus: async (id: string, isRead: boolean): Promise<Bookmark> => {
      return makeRequest(async (api) => {
        const response = await api.patch<Bookmark>(`/bookmarks/${id}/read-status`, {
          is_read: isRead,
        });
        return response.data;
      });
    },

    // Preview tags
    previewTags: async (url: string): Promise<TagPreviewResponse> => {
      return makeRequest(async (api) => {
        const response = await api.post<TagPreviewResponse>('/bookmarks/preview-tags', {
          url: url,
        });
        return response.data;
      });
    },

    // Regenerate tags
    regenerateTags: async (bookmarkId: string): Promise<TagPreviewResponse> => {
      return makeRequest(async (api) => {
        const response = await api.post<TagPreviewResponse>(`/bookmarks/${bookmarkId}/regenerate-tags`);
        return response.data;
      });
    },

    // Get categories
    getCategories: async (): Promise<Record<string, number>> => {
      return makeRequest(async (api) => {
        const response = await api.get<Record<string, number>>('/bookmarks/categories');
        return response.data;
      });
    },

    // Get bookmarks by category
    getBookmarksByCategory: async (category: string, skip = 0, limit = 100): Promise<Bookmark[]> => {
      return makeRequest(async (api) => {
        const response = await api.get<Bookmark[]>(`/bookmarks/categories/${encodeURIComponent(category)}`, {
          params: { skip, limit },
        });
        return response.data;
      });
    },

    // Refresh category
    refreshCategory: async (category: string): Promise<{ job_id: string; status: string; total_bookmarks?: number }> => {
      return makeRequest(async (api) => {
        const response = await api.post<{ job_id: string; status: string; total_bookmarks?: number }>(
          `/categories/${encodeURIComponent(category)}/refresh`
        );
        return response.data;
      });
    },

    // Get job status
    getJobStatus: async (jobId: string): Promise<JobStatus> => {
      return makeRequest(async (api) => {
        const response = await api.get<JobStatus>(`/jobs/${jobId}`);
        return response.data;
      });
    },

    // Get active jobs
    getActiveJobs: async (): Promise<JobStatus[]> => {
      return makeRequest(async (api) => {
        const response = await api.get<JobStatus[]>('/jobs/active');
        return response.data;
      });
    },
  };
};