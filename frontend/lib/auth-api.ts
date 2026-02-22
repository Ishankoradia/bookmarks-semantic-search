import { useAuthenticatedApi } from "./api-auth";
import {
  Bookmark,
  BookmarkSearchResult,
  BookmarkPreviewResponse,
  BookmarkSaveRequest,
  SearchQuery,
  TagPreviewResponse,
  JobStatus,
  FeedArticle,
  FeedArticleListResponse,
  FeedRefreshResponse,
  UserPreference,
  TopicsListResponse,
  UserPreferenceUpdate,
  FollowRequest,
  FollowListResponse,
  PendingRequestsResponse,
  UserProfileResponse,
  FriendsFeedResponse,
  FollowStatus,
} from "./api";

// Authenticated API helper functions
export const useBookmarkApi = () => {
  const { makeRequest } = useAuthenticatedApi();

  return {
    // Preview bookmark - scrapes URL, creates pending bookmark, returns preview
    previewBookmark: async (url: string): Promise<BookmarkPreviewResponse> => {
      return makeRequest(async (api) => {
        const response = await api.post('/bookmarks/preview', { url });
        return response.data;
      });
    },

    // Save bookmark - claims a previewed bookmark
    saveBookmark: async (data: BookmarkSaveRequest): Promise<Bookmark> => {
      return makeRequest(async (api) => {
        const response = await api.post('/bookmarks/save', data);
        return response.data;
      });
    },

    // Get bookmarks
    getBookmarks: async (skip = 0, limit = 100, isRead?: boolean, categories?: string[], tags?: string[]): Promise<Bookmark[]> => {
      return makeRequest(async (api) => {
        const params: { skip: number; limit: number; is_read?: boolean; categories?: string[]; tags?: string[] } = { skip, limit };
        if (isRead !== undefined) {
          params.is_read = isRead;
        }
        if (categories && categories.length > 0) {
          params.categories = categories;
        }
        if (tags && tags.length > 0) {
          params.tags = tags;
        }
        const response = await api.get('/bookmarks/', { params, paramsSerializer: { indexes: null } });
        return response.data;
      });
    },

    // Get single bookmark
    getBookmark: async (id: string): Promise<Bookmark> => {
      return makeRequest(async (api) => {
        const response = await api.get(`/bookmarks/${id}`);
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
        const response = await api.post('/bookmarks/search', query);
        return response.data;
      });
    },

    // Update read status
    updateReadStatus: async (id: string, isRead: boolean): Promise<Bookmark> => {
      return makeRequest(async (api) => {
        const response = await api.patch(`/bookmarks/${id}/read-status`, {
          is_read: isRead,
        });
        return response.data;
      });
    },

    // Update bookmark tags
    updateTags: async (id: string, tags: string[]): Promise<Bookmark> => {
      return makeRequest(async (api) => {
        const response = await api.put(`/bookmarks/${id}`, { tags });
        return response.data;
      });
    },

    // Regenerate tags
    regenerateTags: async (bookmarkId: string): Promise<TagPreviewResponse> => {
      return makeRequest(async (api) => {
        const response = await api.post(`/bookmarks/${bookmarkId}/regenerate-tags`);
        return response.data;
      });
    },

    // Get categories with counts
    getCategories: async (isRead?: boolean, categories?: string[], tags?: string[]): Promise<Record<string, number>> => {
      return makeRequest(async (api) => {
        const params: { is_read?: boolean; categories?: string[]; tags?: string[] } = {};
        if (isRead !== undefined) {
          params.is_read = isRead;
        }
        if (categories && categories.length > 0) {
          params.categories = categories;
        }
        if (tags && tags.length > 0) {
          params.tags = tags;
        }
        const response = await api.get('/bookmarks/categories', { params, paramsSerializer: { indexes: null } });
        return response.data as Record<string, number>;
      });
    },

    // Get category list for filtering
    getCategoryList: async (): Promise<string[]> => {
      return makeRequest(async (api) => {
        const response = await api.get('/bookmarks/categories/list');
        return response.data;
      });
    },

    // Refresh category
    refreshCategory: async (category: string): Promise<{ job_id: string; status: string; total_bookmarks?: number }> => {
      return makeRequest(async (api) => {
        const response = await api.post(
          `/categories/${encodeURIComponent(category)}/refresh`
        ) as { data: { job_id: string; status: string; total_bookmarks?: number } };
        return response.data;
      });
    },

    // Get job status
    getJobStatus: async (jobId: string): Promise<JobStatus> => {
      return makeRequest(async (api) => {
        const response = await api.get(`/jobs/${jobId}`);
        return response.data;
      });
    },

    // Get active jobs
    getActiveJobs: async (): Promise<JobStatus[]> => {
      return makeRequest(async (api) => {
        const response = await api.get('/jobs/active');
        return response.data;
      });
    },
  };
};

// User Preferences API
export const usePreferencesApi = () => {
  const { makeRequest } = useAuthenticatedApi();

  return {
    // Get user preferences
    getPreferences: async (): Promise<UserPreference> => {
      return makeRequest(async (api) => {
        const response = await api.get('/preferences');
        return response.data;
      });
    },

    // Update user preferences
    updatePreferences: async (data: UserPreferenceUpdate): Promise<UserPreference> => {
      return makeRequest(async (api) => {
        const response = await api.put('/preferences', data);
        return response.data;
      });
    },

    // Get available topics
    getTopics: async (): Promise<string[]> => {
      return makeRequest(async (api) => {
        const response = await api.get('/preferences/topics');
        return (response.data as TopicsListResponse).topics;
      });
    },
  };
};

// Feed API
export const useFeedApi = () => {
  const { makeRequest } = useAuthenticatedApi();

  return {
    // Get user's feed articles
    getFeed: async (skip = 0, limit = 50): Promise<FeedArticleListResponse> => {
      return makeRequest(async (api) => {
        const response = await api.get('/feed', {
          params: { skip, limit },
        });
        return response.data;
      });
    },

    // Trigger feed refresh (returns job info)
    refreshFeed: async (): Promise<JobStatus> => {
      return makeRequest(async (api) => {
        const response = await api.post('/feed/refresh');
        return response.data;
      });
    },

    // Get refresh job status
    getRefreshStatus: async (): Promise<JobStatus | { status: string; message: string }> => {
      return makeRequest(async (api) => {
        const response = await api.get('/feed/refresh/status');
        return response.data;
      });
    },

    // Save article to bookmarks
    saveArticle: async (articleId: string): Promise<Bookmark> => {
      return makeRequest(async (api) => {
        const response = await api.post(`/feed/${articleId}/save`);
        return response.data;
      });
    },

    // Mark article as not interested
    markNotInterested: async (articleId: string): Promise<FeedArticle> => {
      return makeRequest(async (api) => {
        const response = await api.post(`/feed/${articleId}/not-interested`);
        return response.data;
      });
    },

    // Get single article
    getArticle: async (articleId: string): Promise<FeedArticle> => {
      return makeRequest(async (api) => {
        const response = await api.get(`/feed/${articleId}`);
        return response.data;
      });
    },

    // Get friends feed (bookmarks from followed users)
    getFriendsFeed: async (skip = 0, limit = 20): Promise<FriendsFeedResponse> => {
      return makeRequest(async (api) => {
        const response = await api.get('/feed/friends', {
          params: { skip, limit },
        });
        return response.data;
      });
    },
  };
};

// Follow/Social API
export const useFollowApi = () => {
  const { makeRequest } = useAuthenticatedApi();

  return {
    // Send follow request
    sendFollowRequest: async (userUuid: string): Promise<FollowRequest> => {
      return makeRequest(async (api) => {
        const response = await api.post('/follows/request', { user_uuid: userUuid });
        return response.data;
      });
    },

    // Get pending requests I sent
    getSentPendingRequests: async (): Promise<PendingRequestsResponse> => {
      return makeRequest(async (api) => {
        const response = await api.get('/follows/requests/pending');
        return response.data;
      });
    },

    // Get pending requests I received
    getReceivedPendingRequests: async (): Promise<PendingRequestsResponse> => {
      return makeRequest(async (api) => {
        const response = await api.get('/follows/requests/received');
        return response.data;
      });
    },

    // Get pending requests count
    getPendingRequestsCount: async (): Promise<number> => {
      return makeRequest(async (api) => {
        const response = await api.get('/follows/requests/count');
        return response.data.count;
      });
    },

    // Accept/reject request
    respondToRequest: async (requestId: number, status: 'accepted' | 'rejected'): Promise<FollowRequest> => {
      return makeRequest(async (api) => {
        const response = await api.put(`/follows/requests/${requestId}`, { status });
        return response.data;
      });
    },

    // Cancel my sent request
    cancelRequest: async (requestId: number): Promise<void> => {
      return makeRequest(async (api) => {
        await api.delete(`/follows/requests/${requestId}`);
      });
    },

    // Get my followers
    getFollowers: async (skip = 0, limit = 50): Promise<FollowListResponse> => {
      return makeRequest(async (api) => {
        const response = await api.get('/follows/followers', {
          params: { skip, limit },
        });
        return response.data;
      });
    },

    // Get users I follow
    getFollowing: async (skip = 0, limit = 50): Promise<FollowListResponse> => {
      return makeRequest(async (api) => {
        const response = await api.get('/follows/following', {
          params: { skip, limit },
        });
        return response.data;
      });
    },

    // Unfollow a user
    unfollow: async (userUuid: string): Promise<void> => {
      return makeRequest(async (api) => {
        await api.delete(`/follows/following/${userUuid}`);
      });
    },

    // Remove a follower
    removeFollower: async (userUuid: string): Promise<void> => {
      return makeRequest(async (api) => {
        await api.delete(`/follows/followers/${userUuid}`);
      });
    },

    // Get user profile
    getUserProfile: async (userUuid: string): Promise<UserProfileResponse> => {
      return makeRequest(async (api) => {
        const response = await api.get(`/follows/users/${userUuid}/profile`);
        return response.data;
      });
    },

    // Search users
    searchUsers: async (query: string, skip = 0, limit = 20): Promise<UserProfileResponse[]> => {
      return makeRequest(async (api) => {
        const response = await api.get('/follows/search', {
          params: { q: query, skip, limit },
        });
        return response.data;
      });
    },
  };
};