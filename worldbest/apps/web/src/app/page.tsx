import { Hero } from '@/components/landing/hero';
import { Features } from '@/components/landing/features';
import { Pricing } from '@/components/landing/pricing';
import { Testimonials } from '@/components/landing/testimonials';
import { CTA } from '@/components/landing/cta';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}