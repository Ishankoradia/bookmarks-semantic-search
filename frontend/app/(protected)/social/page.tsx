'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { UserCard, FollowRequestCard, UserSearchModal } from '@/components/follows';
import { useFollowApi } from '@/lib/auth-api';
import {
  UserSummary,
  FollowRequest,
  FollowListResponse,
  PendingRequestsResponse,
} from '@/lib/api';
import { Loader2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

type TabValue = 'following' | 'followers' | 'requests';

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('following');
  const [following, setFollowing] = useState<UserSummary[]>([]);
  const [followers, setFollowers] = useState<UserSummary[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FollowRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FollowRequest[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [requestsCount, setRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const followApi = useFollowApi();

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

  useEffect(() => {
    loadData();
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
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="following">
            Following ({followingCount})
          </TabsTrigger>
          <TabsTrigger value="followers">
            Followers ({followersCount})
          </TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Requests
            {requestsCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                {requestsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
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
