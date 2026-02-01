'use client';

import { UserProfileResponse, UserSummary } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { FollowButton } from './FollowButton';
import { User } from 'lucide-react';

interface UserCardProps {
  user: UserProfileResponse | UserSummary;
  showFollowButton?: boolean;
  showStats?: boolean;
  onStatusChange?: () => void;
  action?: React.ReactNode; // Custom action button
}

function isUserProfile(user: UserProfileResponse | UserSummary): user is UserProfileResponse {
  return 'followers_count' in user;
}

export function UserCard({
  user,
  showFollowButton = true,
  showStats = false,
  onStatusChange,
  action,
}: UserCardProps) {
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

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
            {showStats && isUserProfile(user) && (
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                <span>{user.followers_count} followers</span>
                <span>{user.following_count} following</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
          {action ? (
            action
          ) : showFollowButton && isUserProfile(user) && (
            <FollowButton
              userUuid={user.uuid}
              isFollowing={user.is_following || false}
              followRequestStatus={user.follow_request_status}
              followRequestId={user.follow_request_id}
              onStatusChange={onStatusChange}
              size="sm"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default UserCard;
