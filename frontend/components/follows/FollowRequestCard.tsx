'use client';

import { useState } from 'react';
import { FollowRequest } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFollowApi } from '@/lib/auth-api';
import { Check, X, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

interface FollowRequestCardProps {
  request: FollowRequest;
  type: 'received' | 'sent';
  onRespond?: () => void;
}

export function FollowRequestCard({ request, type, onRespond }: FollowRequestCardProps) {
  const [loading, setLoading] = useState<'accept' | 'reject' | 'cancel' | null>(null);
  const [handled, setHandled] = useState(false);
  const followApi = useFollowApi();

  const user = type === 'received' ? request.follower : request.following;

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  const handleAccept = async () => {
    setLoading('accept');
    try {
      await followApi.respondToRequest(request.id, 'accepted');
      toast.success(`Accepted follow request from ${user.name || user.email}`);
      setHandled(true);
      onRespond?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to accept request');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    try {
      await followApi.respondToRequest(request.id, 'rejected');
      toast.success('Request declined');
      setHandled(true);
      onRespond?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to decline request');
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setLoading('cancel');
    try {
      await followApi.cancelRequest(request.id);
      toast.success('Request cancelled');
      setHandled(true);
      onRespond?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to cancel request');
    } finally {
      setLoading(null);
    }
  };

  if (handled) {
    return null;
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.picture || undefined} alt={user.name || user.email} />
            <AvatarFallback>
              {initials || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{user.name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            {type === 'received' && (
              <p className="text-xs text-muted-foreground mt-1">wants to follow you</p>
            )}
            {type === 'sent' && (
              <p className="text-xs text-muted-foreground mt-1">pending...</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-2 flex gap-2">
          {type === 'received' ? (
            <>
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={loading !== null}
              >
                {loading === 'accept' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                disabled={loading !== null}
              >
                {loading === 'reject' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={loading !== null}
            >
              {loading === 'cancel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cancel'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default FollowRequestCard;
