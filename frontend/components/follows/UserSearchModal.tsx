'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCard } from './UserCard';
import { useFollowApi } from '@/lib/auth-api';
import { UserProfileResponse } from '@/lib/api';
import { Search, Loader2, UserPlus } from 'lucide-react';

interface UserSearchModalProps {
  trigger?: React.ReactNode;
  onUserFollowed?: () => void;
}

export function UserSearchModal({ trigger, onUserFollowed }: UserSearchModalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const followApi = useFollowApi();

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const users = await followApi.searchUsers(searchQuery);
      setResults(users);
      setSearched(true);
    } catch (error) {
      console.error('Failed to search users:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [followApi]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setQuery('');
      setResults([]);
      setSearched(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Find People
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Find People to Follow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={query}
              onChange={handleQueryChange}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden space-y-2">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No users found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}

            {!loading && results.map((user) => (
              <UserCard
                key={user.uuid}
                user={user}
                showFollowButton
                onStatusChange={() => {
                  onUserFollowed?.();
                  // Refresh the search results
                  searchUsers(query);
                }}
              />
            ))}

            {!loading && !searched && query.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Enter at least 2 characters to search</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UserSearchModal;
