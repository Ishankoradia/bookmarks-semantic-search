'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFollowApi } from '@/lib/auth-api';
import { FollowStatus } from '@/lib/api';
import { Loader2, UserPlus, UserMinus, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface FollowButtonProps {
  userUuid: string;
  isFollowing: boolean;
  followRequestStatus: FollowStatus | null;
  followRequestId: number | null;
  onStatusChange?: () => void;
  size?: 'sm' | 'default';
}

export function FollowButton({
  userUuid,
  isFollowing,
  followRequestStatus,
  followRequestId,
  onStatusChange,
  size = 'default',
}: FollowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing);
  const [localRequestStatus, setLocalRequestStatus] = useState(followRequestStatus);
  const followApi = useFollowApi();

  const handleFollow = async () => {
    setLoading(true);
    try {
      await followApi.sendFollowRequest(userUuid);
      setLocalRequestStatus('pending');
      toast.success('Follow request sent');
      onStatusChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send follow request');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setLoading(true);
    try {
      await followApi.unfollow(userUuid);
      setLocalIsFollowing(false);
      toast.success('Unfollowed successfully');
      onStatusChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to unfollow');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!followRequestId) return;
    setLoading(true);
    try {
      await followApi.cancelRequest(followRequestId);
      setLocalRequestStatus(null);
      toast.success('Follow request cancelled');
      onStatusChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to cancel request');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (localIsFollowing) {
    return (
      <Button variant="outline" size={size} onClick={handleUnfollow}>
        <UserMinus className="h-4 w-4 mr-1" />
        Unfollow
      </Button>
    );
  }

  if (localRequestStatus === 'pending') {
    return (
      <Button variant="secondary" size={size} onClick={handleCancelRequest}>
        <Clock className="h-4 w-4 mr-1" />
        Pending
      </Button>
    );
  }

  return (
    <Button size={size} onClick={handleFollow}>
      <UserPlus className="h-4 w-4 mr-1" />
      Follow
    </Button>
  );
}

export default FollowButton;
