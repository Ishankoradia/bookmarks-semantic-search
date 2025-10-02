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
  created_at: string;
  updated_at: string | null;
}

export interface BookmarkSearchResult extends Bookmark {
  similarity_score: number;
}

export interface CreateBookmarkRequest {
  url: string;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  threshold?: number;
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
};

export default api;