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
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between p-3 gap-2 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={user.picture || undefined} alt={user.name || user.email} />
            <AvatarFallback>
              {initials || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 overflow-hidden">
            <p className="font-medium truncate text-sm">{user.name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            {showStats && isUserProfile(user) && (
              <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{user.followers_count} followers</span>
                <span>{user.following_count} following</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
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
