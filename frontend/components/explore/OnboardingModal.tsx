'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TopicSelector } from './TopicSelector';
import { usePreferencesApi, useFeedApi } from '@/lib/auth-api';
import { Loader2, Sparkles } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  topics: string[];
}

export function OnboardingModal({
  open,
  onComplete,
  topics,
}: OnboardingModalProps) {
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const preferencesApi = usePreferencesApi();
  const feedApi = useFeedApi();

  const minSelection = 2;
  const canSubmit = selectedTopics.length >= minSelection && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Save preferences
      await preferencesApi.updatePreferences({ interests: selectedTopics });

      // Trigger feed refresh in background (don't wait)
      feedApi.refreshFeed().catch(err => {
        console.error('Background feed refresh failed:', err);
      });

      onComplete();
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Welcome! What interests you?</DialogTitle>
          <DialogDescription className="text-base">
            Select topics you're interested in to personalize your Explore feed.
            We'll show you relevant articles from across the web.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <TopicSelector
            topics={topics}
            selectedTopics={selectedTopics}
            onSelectionChange={setSelectedTopics}
            minSelection={minSelection}
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <DialogFooter className="sm:justify-center">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
