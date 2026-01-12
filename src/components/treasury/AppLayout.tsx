import React from 'react';
import { BottomNav, DesktopSidebar } from './Navigation';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  headerActions?: React.ReactNode;
}

export function AppLayout({
  children,
  title,
  subtitle,
  showHeader = true,
  headerActions,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main Content */}
      <main className="md:ml-64">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 content-with-nav">
          {/* Page Header */}
          {showHeader && title && (
            <header className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-display">{title}</h1>
                  {subtitle && <p className="text-caption mt-1">{subtitle}</p>}
                </div>
                {headerActions && (
                  <div className="flex-shrink-0">{headerActions}</div>
                )}
              </div>
            </header>
          )}

          {/* Page Content */}
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
