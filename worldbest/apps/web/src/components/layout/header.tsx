'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Menu, X, User, Settings, LogOut, BookOpen, Sparkles } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-secondary-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">WorldBest</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/features"
              className="text-sm font-medium text-secondary-600 hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-secondary-600 hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-secondary-600 hover:text-foreground transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-secondary-600 hover:text-foreground transition-colors"
            >
              Blog
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <div className="relative group">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                    >
                      Toggle Theme
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                    >
                      <LogOut className="h-4 w-4 inline mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-secondary-200 py-4">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/features"
                className="text-sm font-medium text-secondary-600 hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-secondary-600 hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className="text-sm font-medium text-secondary-600 hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Docs
              </Link>
              <Link
                href="/blog"
                className="text-sm font-medium text-secondary-600 hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </Link>
              
              <div className="pt-4 border-t border-secondary-200">
                {isAuthenticated ? (
                  <div className="flex flex-col space-y-2">
                    <Link href="/dashboard">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <Link href="/auth/login">
                      <Button variant="ghost" size="sm" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button size="sm" className="w-full">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}