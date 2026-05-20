'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePreferencesApi, useAccountApi } from '@/lib/auth-api';
import { UserPreference } from '@/lib/api';
import { TopicSelector } from '@/components/explore/TopicSelector';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, LogOut, User, Settings, Eye, Pencil, Check, X, MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { data: session } = useSession();
  const accountApi = useAccountApi();
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDiscoverability, setSavingDiscoverability] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [editedInterests, setEditedInterests] = useState<string[]>([]);
  const [savingInterests, setSavingInterests] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'bug' | 'feature'>('feedback');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast.error('Please enter your feedback');
      return;
    }
    setSendingFeedback(true);
    try {
      await accountApi.submitFeedback(feedbackType, feedbackMessage.trim());
      toast.success('Thank you for your feedback!');
      setFeedbackMessage('');
    } catch {
      toast.error('Failed to send feedback');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteReason.trim()) {
      toast.error('Please tell us why you want to leave');
      return;
    }
    setIsDeleting(true);
    try {
      await accountApi.deleteAccount(deleteReason.trim());
      toast.success('Account deleted');
      signOut({ callbackUrl: '/auth/signin' });
    } catch {
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
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
    <div className="container max-w-2xl mx-auto px-4 py-6 pb-24">
      {/* User Header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="h-14 w-14">
          <AvatarImage
            src={session?.user?.image || undefined}
            alt={session?.user?.name || 'User'}
          />
          <AvatarFallback className="text-lg">
            {getInitials() || <User className="h-7 w-7" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold truncate">
            {session?.user?.name || 'Unknown'}
          </h1>
          <p className="text-sm text-muted-foreground truncate">{session?.user?.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-1.5" />
          Sign Out
        </Button>
      </div>

      {/* Preferences Section */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Preferences</h2>
        <div className="bg-card border rounded-lg divide-y">
          {/* Discoverability */}
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5 pr-4">
              <p className="text-sm font-medium">Allow others to find me</p>
              <p className="text-xs text-muted-foreground">
                Others can search your name or email
              </p>
            </div>
            <Switch
              id="discoverable"
              checked={preferences?.is_discoverable ?? true}
              onCheckedChange={handleDiscoverabilityChange}
              disabled={savingDiscoverability}
            />
          </div>

          {/* Interests */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Interests</p>
              {!editingInterests && (
                <button
                  onClick={handleStartEditingInterests}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingInterests ? (
              <div className="space-y-3">
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
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveInterests}
                    disabled={savingInterests || editedInterests.length === 0}
                  >
                    {savingInterests && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {preferences?.interests?.length ? (
                  preferences.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full"
                    >
                      {interest}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No interests selected</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Feedback</h2>
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['feedback', 'bug', 'feature'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFeedbackType(type)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  feedbackType === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30'
                }`}
              >
                {type === 'feedback' ? 'General' : type === 'bug' ? 'Bug Report' : 'Feature Request'}
              </button>
            ))}
          </div>
          <Textarea
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder={
              feedbackType === 'bug'
                ? 'What happened and what did you expect?'
                : feedbackType === 'feature'
                ? 'What feature would you like to see?'
                : 'Share your thoughts about the application...'
            }
            rows={3}
            className="text-sm"
          />
          <Button
            onClick={handleSubmitFeedback}
            disabled={sendingFeedback || !feedbackMessage.trim()}
            size="sm"
          >
            {sendingFeedback ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            )}
            Send
          </Button>
        </div>
      </div>

      {/* Account Section */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Account</h2>
        <div className="bg-card border rounded-lg divide-y">
          <button
            onClick={() => setDeleteDialogOpen(true)}
            className="w-full flex items-center gap-3 p-4 text-sm text-destructive hover:bg-destructive/5 transition-colors text-left"
          >
            <Trash2 className="h-4 w-4" />
            Delete account and all data
          </button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, all bookmarks, and all data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Please tell us why you're leaving — this helps us improve"
            rows={3}
            className="text-sm"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deleteReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
