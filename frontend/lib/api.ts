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

export interface BookmarkPreviewRequest {
  url: string;
}

export interface BookmarkPreviewResponse {
  id: string;
  title: string | null;  // null if scraping failed
  description: string | null;
  domain: string;
  suggested_category: string;
  tags: string[];
  scrape_failed: boolean;
}

export interface BookmarkSaveRequest {
  id: string;
  category: string;
  reference?: string;
  title?: string;  // Required if scraping failed
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

// Feed Article types
export interface FeedArticle {
  id: string;
  user_id: number;
  url: string;
  title: string;
  description: string | null;
  domain: string | null;
  image_url: string | null;
  topic: string | null;
  source_type: string | null;
  published_at: string | null;
  fetched_at: string;
  is_saved: boolean;
  is_not_interested: boolean;
}

export interface FeedArticleListResponse {
  articles: FeedArticle[];
  total: number;
  has_more: boolean;
}

export interface FeedRefreshResponse {
  message: string;
  articles_fetched: number;
  articles_new: number;
}

// User Preference types
export interface UserPreference {
  id: number;
  user_id: number;
  interests: string[];
  is_discoverable: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface TopicsListResponse {
  topics: string[];
}

export interface UserPreferenceUpdate {
  interests?: string[];
  is_discoverable?: boolean;
}

// Follow/Social types
export type FollowStatus = 'pending' | 'accepted' | 'rejected';

export interface UserSummary {
  uuid: string;
  name: string | null;
  email: string;
  picture: string | null;
}

export interface FollowRequest {
  id: number;
  follower: UserSummary;
  following: UserSummary;
  status: FollowStatus;
  created_at: string;
  responded_at: string | null;
}

export interface FollowListResponse {
  users: UserSummary[];
  total: number;
}

export interface PendingRequestsResponse {
  requests: FollowRequest[];
  total: number;
}

export interface UserProfileResponse extends UserSummary {
  followers_count: number;
  following_count: number;
  is_following: boolean | null;
  is_followed_by: boolean | null;
  follow_request_status: FollowStatus | null;
  follow_request_id: number | null;
}

export interface FriendBookmark {
  id: string;
  url: string;
  title: string;
  description: string | null;
  domain: string | null;
  tags: string[];
  category: string | null;
  created_at: string;
  owner: UserSummary;
}

export interface FriendsFeedResponse {
  bookmarks: FriendBookmark[];
  total: number;
  has_more: boolean;
}