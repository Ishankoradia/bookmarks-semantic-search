'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { useFollowApi } from '@/lib/auth-api';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const followApi = useFollowApi();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Load pending requests count for the badge
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const count = await followApi.getPendingRequestsCount();
        setPendingCount(count);
      } catch (error) {
        console.error('Failed to load pending requests count:', error);
      }
    };

    if (status === 'authenticated') {
      loadPendingCount();
      // Poll every 30 seconds
      const interval = setInterval(loadPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [status, followApi]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen pb-20">
      <main>{children}</main>
      <BottomNav pendingRequestsCount={pendingCount} />
    </div>
  );
}
