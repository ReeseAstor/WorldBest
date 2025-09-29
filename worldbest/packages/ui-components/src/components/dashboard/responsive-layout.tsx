'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { 
  Menu, 
  X, 
  Search, 
  Bell, 
  User, 
  Settings,
  ChevronDown,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
  className,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="p-2"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            {header || (
              <div>
                <h1 className="text-lg font-semibold text-gray-900">WorldBest</h1>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Theme Toggle */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => {
                  const themes = ['light', 'dark', 'system'] as const;
                  const currentIndex = themes.indexOf(theme);
                  const nextIndex = (currentIndex + 1) % themes.length;
                  setTheme(themes[nextIndex]);
                }}
              >
                {theme === 'light' && <Sun className="h-4 w-4" />}
                {theme === 'dark' && <Moon className="h-4 w-4" />}
                {theme === 'system' && <Monitor className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-5 w-5" />
            </Button>
            
            {/* User Menu */}
            <div className="relative">
              <Button variant="ghost" size="sm" className="p-2">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {sidebar && (
          <>
            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-black bg-opacity-50"
                onClick={closeSidebar}
              />
            )}
            
            {/* Sidebar */}
            <aside
              className={cn(
                'fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-80 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out',
                isMobile
                  ? (isSidebarOpen ? 'translate-x-0' : '-translate-x-full')
                  : 'translate-x-0'
              )}
            >
              <div className="h-full overflow-y-auto">
                {sidebar}
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 transition-all duration-300 ease-in-out',
            sidebar && !isMobile && 'ml-80'
          )}
        >
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};