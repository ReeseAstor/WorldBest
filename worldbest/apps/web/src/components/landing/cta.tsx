import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Ready to write your best story?
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Join thousands of writers who are already using WorldBest to create, 
            collaborate, and publish their stories. Start your free trial today.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/auth/signup">
              <Button size="lg" className="group">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Talk to Sales
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}