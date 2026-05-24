'use client';

import { useState, useEffect } from 'react';
import { useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UserCard, FollowRequestCard, UserSearchModal } from '@/components/follows';
import { useFollowApi, useFeedApi, useBookmarkApi } from '@/lib/auth-api';
import { ArticleCard } from '@/components/explore/ArticleCard';
import { formatRelativeDate } from '@/lib/utils';
import {
  UserSummary,
  FollowRequest,
  FriendBookmark,
  FriendsFeedResponse,
} from '@/lib/api';
import { Loader2, UserPlus, Users, Rss } from 'lucide-react';
import { toast } from 'sonner';

type TabValue = 'feed' | 'following' | 'followers' | 'requests';

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('feed');
  const [following, setFollowing] = useState<UserSummary[]>([]);
  const [followers, setFollowers] = useState<UserSummary[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FollowRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FollowRequest[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedData, setFeedData] = useState<FriendsFeedResponse | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const followApi = useFollowApi();
  const feedApi = useFeedApi();

  const loadData = async () => {
    setLoading(true);
    try {
      const [followingRes, followersRes, receivedRes, sentRes] = await Promise.all([
        followApi.getFollowing(),
        followApi.getFollowers(),
        followApi.getReceivedPendingRequests(),
        followApi.getSentPendingRequests(),
      ]);

      setFollowing(followingRes.users);
      setFollowingCount(followingRes.total);
      setFollowers(followersRes.users);
      setFollowersCount(followersRes.total);
      setReceivedRequests(receivedRes.requests);
      setSentRequests(sentRes.requests);
      setRequestsCount(receivedRes.total);
    } catch (error) {
      console.error('Failed to load social data:', error);
      toast.error('Failed to load social data');
    } finally {
      setLoading(false);
    }
  };

  const loadFeed = async () => {
    setFeedLoading(true);
    try {
      const data = await feedApi.getFriendsFeed();
      setFeedData(data);
    } catch {
      // ignore
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadFeed();
  }, []);

  const handleUnfollow = async (userUuid: string) => {
    try {
      await followApi.unfollow(userUuid);
      toast.success('Unfollowed successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to unfollow');
    }
  };

  const handleRemoveFollower = async (userUuid: string) => {
    try {
      await followApi.removeFollower(userUuid);
      toast.success('Follower removed');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove follower');
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Social</h1>
        <UserSearchModal onUserFollowed={loadData} />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="feed" className="text-xs sm:text-sm">Feed</TabsTrigger>
          <TabsTrigger value="following" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Following</span>
            <span className="sm:hidden">Follow</span>
            <span className="ml-1">({followingCount})</span>
          </TabsTrigger>
          <TabsTrigger value="followers" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Followers</span>
            <span className="sm:hidden">Fans</span>
            <span className="ml-1">({followersCount})</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="relative text-xs sm:text-sm">
            <span className="hidden sm:inline">Requests</span>
            <span className="sm:hidden">Req</span>
            {requestsCount > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {requestsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {loading || feedLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
        {/* Feed Tab */}
        <TabsContent value="feed" className="space-y-3">
          {!feedData || feedData.bookmarks.length === 0 ? (
            <div className="text-center py-12">
              <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No feed items yet</h3>
              <p className="text-muted-foreground mb-4">
                Follow people to see their bookmarks here
              </p>
              <UserSearchModal
                trigger={
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Find People
                  </Button>
                }
                onUserFollowed={() => { loadData(); loadFeed(); }}
              />
            </div>
          ) : (
            feedData.bookmarks.map((bookmark) => (
              <ArticleCard
                key={bookmark.id}
                article={{
                  ...bookmark,
                  type: 'friend' as const,
                }}
                formatDate={formatRelativeDate}
              />
            ))
          )}
        </TabsContent>

            <TabsContent value="following" className="space-y-3">
              {following.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Not following anyone yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Find people to follow and see their bookmarks
                  </p>
                  <UserSearchModal
                    trigger={
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Find People
                      </Button>
                    }
                    onUserFollowed={loadData}
                  />
                </div>
              ) : (
                following.map((user) => (
                  <UserCard
                    key={user.uuid}
                    user={user}
                    showFollowButton={false}
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnfollow(user.uuid)}
                      >
                        Unfollow
                      </Button>
                    }
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="followers" className="space-y-3">
              {followers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No followers yet</h3>
                  <p className="text-muted-foreground">
                    When people follow you, they'll appear here
                  </p>
                </div>
              ) : (
                followers.map((user) => (
                  <UserCard
                    key={user.uuid}
                    user={user}
                    showFollowButton={false}
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFollower(user.uuid)}
                      >
                        Remove
                      </Button>
                    }
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-6">
              {receivedRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Received Requests
                  </h3>
                  <div className="space-y-3">
                    {receivedRequests.map((request) => (
                      <FollowRequestCard
                        key={request.id}
                        request={request}
                        type="received"
                        onRespond={loadData}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sentRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Sent Requests
                  </h3>
                  <div className="space-y-3">
                    {sentRequests.map((request) => (
                      <FollowRequestCard
                        key={request.id}
                        request={request}
                        type="sent"
                        onRespond={loadData}
                      />
                    ))}
                  </div>
                </div>
              )}

              {receivedRequests.length === 0 && sentRequests.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    Follow requests will appear here
                  </p>
                </div>
              )}
            </TabsContent>
          </>
        )}
        </Tabs>
    </div>
  );
}
