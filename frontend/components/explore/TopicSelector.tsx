'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TopicSelectorProps {
  topics: string[];
  selectedTopics: string[];
  onSelectionChange: (topics: string[]) => void;
  minSelection?: number;
  disabled?: boolean;
}

export function TopicSelector({
  topics,
  selectedTopics,
  onSelectionChange,
  minSelection = 2,
  disabled = false,
}: TopicSelectorProps) {
  const toggleTopic = (topic: string) => {
    if (disabled) return;

    if (selectedTopics.includes(topic)) {
      onSelectionChange(selectedTopics.filter((t) => t !== topic));
    } else {
      onSelectionChange([...selectedTopics, topic]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {topics.map((topic) => {
          const isSelected = selectedTopics.includes(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggleTopic(topic)}
              disabled={disabled}
              className={cn(
                'relative px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                isSelected
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSelected && (
                <Check className="inline-block w-4 h-4 mr-1.5 -ml-1" />
              )}
              {topic}
            </button>
          );
        })}
      </div>

      {selectedTopics.length < minSelection && (
        <p className="text-sm text-gray-500">
          Select at least {minSelection} topics to continue
        </p>
      )}

      {selectedTopics.length >= minSelection && (
        <p className="text-sm text-green-600">
          {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
