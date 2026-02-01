'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Compass, Bookmark, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface BottomNavProps {
  pendingRequestsCount?: number;
}

export function BottomNav({ pendingRequestsCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: '/feed',
      label: 'Feed',
      icon: <Home className="h-5 w-5" />,
    },
    {
      href: '/explore',
      label: 'Explore',
      icon: <Compass className="h-5 w-5" />,
    },
    {
      href: '/bookmarks',
      label: 'Bookmarks',
      icon: <Bookmark className="h-5 w-5" />,
    },
    {
      href: '/social',
      label: 'Social',
      icon: <Users className="h-5 w-5" />,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: <User className="h-5 w-5" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors relative',
              isActive(item.href)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}

export default BottomNav;
