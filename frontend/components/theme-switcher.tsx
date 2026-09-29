'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Sun, Moon, Contrast } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'amoled', label: 'AMOLED', icon: Contrast },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // next-themes only knows the active theme on the client, so defer the
  // "selected" highlight until after mount to avoid a hydration mismatch.
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="grid grid-cols-4 gap-2">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-transparent text-muted-foreground hover:border-foreground/30'
            )}
            aria-pressed={active}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
