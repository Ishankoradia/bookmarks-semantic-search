'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePreferencesApi } from '@/lib/auth-api';
import { UserPreference } from '@/lib/api';
import { TopicSelector } from '@/components/explore/TopicSelector';
import { Loader2, LogOut, User, Settings, Eye, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDiscoverability, setSavingDiscoverability] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [editedInterests, setEditedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const preferencesApi = usePreferencesApi();

  const loadData = async () => {
    try {
      const [prefs, topics] = await Promise.all([
        preferencesApi.getPreferences(),
        preferencesApi.getTopics(),
      ]);
      setPreferences(prefs);
      setAvailableTopics(topics);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDiscoverabilityChange = async (checked: boolean) => {
    if (!preferences) return;

    setSavingDiscoverability(true);
    try {
      const updated = await preferencesApi.updatePreferences({
        is_discoverable: checked,
      });
      setPreferences(updated);
      toast.success(
        checked
          ? 'You are now discoverable by other users'
          : 'You are now hidden from search'
      );
    } catch (error) {
      console.error('Failed to update discoverability:', error);
      toast.error('Failed to update setting');
    } finally {
      setSavingDiscoverability(false);
    }
  };

  const handleStartEditingInterests = () => {
    setEditedInterests(preferences?.interests || []);
    setEditingInterests(true);
  };

  const handleSaveInterests = async () => {
    if (editedInterests.length === 0) {
      toast.error('Please select at least one interest');
      return;
    }

    setSavingInterests(true);
    try {
      const updated = await preferencesApi.updatePreferences({
        interests: editedInterests,
      });
      setPreferences(updated);
      setEditingInterests(false);
      toast.success('Interests updated');
    } catch (error) {
      console.error('Failed to update interests:', error);
      toast.error('Failed to update interests');
    } finally {
      setSavingInterests(false);
    }
  };

  const handleCancelEditingInterests = () => {
    setEditingInterests(false);
    setEditedInterests([]);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  const getInitials = () => {
    if (session?.user?.name) {
      return session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return session?.user?.email?.[0]?.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      {/* User Info */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={session?.user?.image || undefined}
              alt={session?.user?.name || 'User'}
            />
            <AvatarFallback className="text-lg">
              {getInitials() || <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold truncate">
              {session?.user?.name || 'Unknown'}
            </h2>
            <p className="text-muted-foreground truncate">{session?.user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Discoverability */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="discoverable" className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Allow others to find me
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, other users can find you by searching your name or email
              </p>
            </div>
            <Switch
              id="discoverable"
              checked={preferences?.is_discoverable ?? true}
              onCheckedChange={handleDiscoverabilityChange}
              disabled={savingDiscoverability}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Interests</CardTitle>
              <CardDescription>
                Topics you're interested in for the Explore feed
              </CardDescription>
            </div>
            {!editingInterests && (
              <Button variant="ghost" size="sm" onClick={handleStartEditingInterests}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingInterests ? (
            <div className="space-y-4">
              <TopicSelector
                topics={availableTopics}
                selectedTopics={editedInterests}
                onSelectionChange={setEditedInterests}
                minSelection={1}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditingInterests}
                  disabled={savingInterests}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveInterests}
                  disabled={savingInterests || editedInterests.length === 0}
                >
                  {savingInterests ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {preferences?.interests?.length ? (
                preferences.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full"
                  >
                    {interest}
                  </span>
                ))
              ) : (
                <p className="text-muted-foreground">No interests selected</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
