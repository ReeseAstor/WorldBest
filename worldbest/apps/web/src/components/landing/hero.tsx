'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Sparkles, Users, Zap } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Write Your Best Story with{' '}
            <span className="text-primary-600">AI-Powered</span> Tools
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            WorldBest is the ultimate platform for writers. Create comprehensive story bibles, 
            collaborate with AI personas, and bring your stories to life with professional 
            publishing tools.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/auth/signup">
              <Button size="lg" className="group">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                <BookOpen className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Story Bibles</h3>
              <p className="mt-2 text-sm text-gray-600">
                Comprehensive worldbuilding tools for characters, locations, and timelines
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-100">
                <Sparkles className="h-6 w-6 text-accent-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">AI Assistants</h3>
              <p className="mt-2 text-sm text-gray-600">
                Three specialized AI personas: Muse, Editor, and Coach
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success-100">
                <Users className="h-6 w-6 text-success-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Collaboration</h3>
              <p className="mt-2 text-sm text-gray-600">
                Real-time collaboration with team members and editors
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning-100">
                <Zap className="h-6 w-6 text-warning-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Export & Publish</h3>
              <p className="mt-2 text-sm text-gray-600">
                Export to multiple formats and publish directly to platforms
              </p>
            </div>
          </div>
        </div>

        {/* Hero image placeholder */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="relative rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 p-1">
            <div className="rounded-xl bg-white p-8">
              <div className="aspect-video rounded-lg bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="mx-auto h-16 w-16 text-gray-400" />
                  <p className="mt-4 text-lg font-medium text-gray-600">
                    Interactive Demo Coming Soon
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Experience the full power of WorldBest
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}