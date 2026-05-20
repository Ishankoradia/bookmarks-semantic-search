'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookOpen, FolderOpen, Search, Plus, Compass, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBookmarkApi } from '@/lib/auth-api';
import { formatRelativeDate } from '@/lib/utils';
import { ArticleCard } from '@/components/explore/ArticleCard';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const RechartsLineChart = dynamic(
  () => import('recharts').then((mod) => {
    const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } = mod;

    function WeeklyChart({ data }: { data: { week: string; added: number; read: number }[] }) {
      return (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend iconType="line" wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="added"
              name="Added"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="read"
              name="Read"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return WeeklyChart;
  }),
  { ssr: false, loading: () => <div style={{ height: 180 }} /> }
);

interface Stats {
  total: number;
  read: number;
  unread: number;
  categories: number;
  weekly_activity: { week: string; added: number; read: number }[];
  recent_bookmarks: {
    id: string;
    title: string;
    description: string | null;
    domain: string;
    url: string;
    tags: string[];
    category: string | null;
    is_read: boolean;
    reference: string | null;
    created_at: string | null;
  }[];
}

export default function HomePage() {
  const router = useRouter();
  const authApi = useBookmarkApi();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await authApi.getStats();
        setStats(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  const reloadStats = async () => {
    try {
      const data = await authApi.getStats();
      setStats(data);
    } catch {}
  };

  const handleToggleRead = async (id: string, currentRead: boolean) => {
    await authApi.updateReadStatus(id, !currentRead);
    reloadStats();
    toast.success(currentRead ? 'Marked as unread' : 'Marked as read');
  };

  const handleDelete = async (id: string) => {
    await authApi.deleteBookmark(id);
    reloadStats();
    toast.success('Bookmark deleted');
  };

  const handleUpdateTags = async (id: string, tags: string[]) => {
    await authApi.updateTags(id, tags);
    reloadStats();
    toast.success('Tags updated');
  };

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success('URL copied');
  };

  if (!stats) return null;

  return (
    <div className="p-6 pb-40 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Home</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Bookmarks</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{stats.unread}</p>
          <p className="text-xs text-muted-foreground">Unread</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{stats.read}</p>
          <p className="text-xs text-muted-foreground">Read</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{stats.categories}</p>
          <p className="text-xs text-muted-foreground">Categories</p>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-card border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">Weekly Activity</p>
        <RechartsLineChart data={stats.weekly_activity} />
      </div>

      {/* Quick Links */}
      <div>
        <p className="text-sm font-medium mb-2">Quick Links</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a href="/bookmarks?focus=search" className="flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80">
            <Search className="h-3.5 w-3.5" />
            Search Bookmarks
          </a>
          <a href="/explore" className="flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80">
            <Compass className="h-3.5 w-3.5" />
            Explore Articles
          </a>
          <a href="/bookmarks?action=add" className="flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80">
            <Plus className="h-3.5 w-3.5" />
            Add Bookmark
          </a>
          <a href="/social" className="flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80">
            <Users className="h-3.5 w-3.5" />
            Social Feed
          </a>
        </div>
      </div>

      {/* Recently Added */}
      {stats.recent_bookmarks.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Recently Added</p>
          <div className="space-y-2">
            {stats.recent_bookmarks.map((bookmark) => (
              <ArticleCard
                key={bookmark.id}
                article={{
                  ...bookmark,
                  type: 'bookmark' as const,
                }}
                onToggleRead={() => handleToggleRead(bookmark.id, !!bookmark.is_read)}
                onDelete={() => handleDelete(bookmark.id)}
                onUpdateTags={(tags) => handleUpdateTags(bookmark.id, tags)}
                onCopyUrl={() => handleCopyUrl(bookmark.url)}
                formatDate={formatRelativeDate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
