// Types and interfaces for the bookmark API
// Note: Actual API calls are handled by useBookmarkApi from auth-api.ts

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

// Legacy API client removed - use useBookmarkApi from auth-api.ts instead

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

// Default export removed - use useBookmarkApi from auth-api.ts instead