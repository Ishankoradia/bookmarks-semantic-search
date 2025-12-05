import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string | null;
  domain: string;
  tags: string[];
  meta_data: Record<string, any>;
  is_read?: boolean;
  reference?: string | null;
  category?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BookmarkSearchResult extends Bookmark {
  similarity_score: number;
}

export interface CreateBookmarkRequest {
  url: string;
  reference?: string;
}

export type DateRangeFilter = 'today' | 'last_week' | 'last_month' | 'last_3_months' | 'last_year' | 'all_time';

export interface MetadataFilters {
  reference?: string;
  domain?: string;
  category?: string;
  date_range?: DateRangeFilter;
  date_from?: string;
  date_to?: string;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: MetadataFilters;
}

export interface ParsedSearchQuery {
  search_query: string;
  domain_filter?: string;
  reference_filter?: string;
  date_range?: DateRangeFilter;
}

export interface TagPreviewResponse {
  tags: string[];
  title: string;
  description?: string;
  domain: string;
}

export const bookmarkApi = {
  async createBookmark(data: CreateBookmarkRequest): Promise<Bookmark> {
    const response = await api.post<Bookmark>('/bookmarks/', data);
    return response.data;
  },

  async getBookmarks(skip = 0, limit = 100): Promise<Bookmark[]> {
    const response = await api.get<Bookmark[]>('/bookmarks/', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getBookmark(id: string): Promise<Bookmark> {
    const response = await api.get<Bookmark>(`/bookmarks/${id}`);
    return response.data;
  },

  async deleteBookmark(id: string): Promise<void> {
    await api.delete(`/bookmarks/${id}`);
  },

  async searchBookmarks(query: SearchQuery): Promise<BookmarkSearchResult[]> {
    const response = await api.post<BookmarkSearchResult[]>('/bookmarks/search', query);
    return response.data;
  },

  async updateReadStatus(id: string, isRead: boolean): Promise<Bookmark> {
    const response = await api.patch<Bookmark>(`/bookmarks/${id}/read-status`, {
      is_read: isRead,
    });
    return response.data;
  },

  async previewTags(url: string): Promise<TagPreviewResponse> {
    const response = await api.post<TagPreviewResponse>('/bookmarks/preview-tags', {
      url: url,
    });
    return response.data;
  },

  async regenerateTags(bookmarkId: string): Promise<TagPreviewResponse> {
    const response = await api.post<TagPreviewResponse>(`/bookmarks/${bookmarkId}/regenerate-tags`);
    return response.data;
  },

  async parseQuery(query: string): Promise<ParsedSearchQuery> {
    const response = await api.post<ParsedSearchQuery>('/bookmarks/parse-query', null, {
      params: { query }
    });
    return response.data;
  },

  async getCategories(): Promise<Record<string, number>> {
    const response = await api.get<Record<string, number>>('/bookmarks/categories');
    return response.data;
  },

  async getBookmarksByCategory(category: string, skip = 0, limit = 100): Promise<Bookmark[]> {
    const response = await api.get<Bookmark[]>(`/bookmarks/categories/${encodeURIComponent(category)}`, {
      params: { skip, limit },
    });
    return response.data;
  },

  async refreshCategory(category: string): Promise<{ job_id: string; status: string; total_bookmarks?: number }> {
    const response = await api.post<{ job_id: string; status: string; total_bookmarks?: number }>(
      `/categories/${encodeURIComponent(category)}/refresh`
    );
    return response.data;
  },

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await api.get<JobStatus>(`/jobs/${jobId}`);
    return response.data;
  },

  async getActiveJobs(): Promise<JobStatus[]> {
    const response = await api.get<JobStatus[]>('/jobs/active');
    return response.data;
  },
};

export interface JobStatus {
  id: string;
  job_type: string;
  status: string;
  title: string;
  progress_current: number;
  progress_total: number;
  progress_percentage: number;
  current_item: string | null;
  parameters: Record<string, any>;
  result: Record<string, any> | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number;
}

export default api;