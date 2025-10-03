'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@worldbest/ui-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@worldbest/ui-components';
import { 
  BookOpen, 
  Users, 
  Sparkles, 
  Shield, 
  Download, 
  BarChart3,
  Check,
  Star,
  ArrowRight,
  Play,
  Menu,
  X
} from 'lucide-react';
import { AuthModal } from '@/components/auth/auth-modal';

const features = [
  {
    icon: BookOpen,
    title: 'Story Bible Management',
    description: 'Comprehensive project, book, and chapter organization with rich worldbuilding tools.',
  },
  {
    icon: Users,
    title: 'Character Development',
    description: 'Rich character profiles with relationship graphs and detailed arc tracking.',
  },
  {
    icon: Sparkles,
    title: 'AI Orchestration',
    description: 'Three specialized personas (Muse, Editor, Coach) for different writing needs.',
  },
  {
    icon: Shield,
    title: 'Content Safety',
    description: 'Placeholder system for sensitive content with customizable rendering.',
  },
  {
    icon: Download,
    title: 'Export Capabilities',
    description: 'Multiple formats including ePub, PDF, and JSON with selective redaction.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track progress, word count, and AI token usage with detailed insights.',
  },
];

const plans = [
  {
    name: 'Story Starter',
    price: 'Free',
    description: 'Perfect for trying out WorldBest',
    features: [
      '2 projects',
      '10 AI prompts/day',
      'Basic editor',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Solo Author',
    price: '$15',
    period: '/month',
    description: 'Everything you need as an individual writer',
    features: [
      '10 projects',
      'Unlimited AI prompts',
      'Full export capabilities',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Pro Creator',
    price: '$35',
    period: '/month',
    description: 'For professional writers and content creators',
    features: [
      'Unlimited projects',
      'Voice & OCR input',
      'Advanced analytics',
      'Custom AI models',
      'API access',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Fantasy Author',
    content: 'WorldBest transformed my writing process. The AI personas are like having three writing coaches available 24/7.',
    rating: 5,
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Sci-Fi Writer',
    content: 'The worldbuilding tools are incredible. I can track everything from languages to economies in one place.',
    rating: 5,
  },
  {
    name: 'Emily Johnson',
    role: 'Romance Novelist',
    content: 'The character relationship mapping helped me create more compelling romantic tension in my stories.',
    rating: 5,
  },
];

export function LandingPage() {
  const [authModal, setAuthModal] = useState<'signup' | 'login' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <BookOpen className="h-6 w-6" />
              <span className="font-bold">WorldBest</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <div className="hidden md:flex md:space-x-6">
                <Link href="#features" className="text-sm font-medium transition-colors hover:text-primary">
                  Features
                </Link>
                <Link href="#pricing" className="text-sm font-medium transition-colors hover:text-primary">
                  Pricing
                </Link>
                <Link href="#testimonials" className="text-sm font-medium transition-colors hover:text-primary">
                  Testimonials
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={() => setAuthModal('login')}
                className="hidden md:inline-flex"
              >
                Log in
              </Button>
              <Button onClick={() => setAuthModal('signup')}>
                Get Started
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background md:hidden">
            <div className="container flex h-16 items-center justify-between border-b">
              <Link href="/" className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6" />
                <span className="font-bold">WorldBest</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="container py-6">
              <div className="flex flex-col space-y-4">
                <Link
                  href="#features"
                  className="text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="#pricing"
                  className="text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href="#testimonials"
                  className="text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Testimonials
                </Link>
                <div className="pt-4 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setAuthModal('login');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Log in
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={() => {
                      setAuthModal('signup');
                      setMobileMenuOpen(false);
                    }}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="container space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
            The AI-Powered Writing Platform for{' '}
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Storytellers
            </span>
          </h1>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            Create compelling stories with comprehensive worldbuilding tools, AI-assisted writing, 
            and seamless collaboration. From idea to publication.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" onClick={() => setAuthModal('signup')}>
              Start Writing for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
            Everything you need to craft amazing stories
          </h2>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            From worldbuilding to publication, WorldBest provides all the tools you need 
            in one integrated platform.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container space-y-6 py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            Choose the plan that's right for you. Upgrade or downgrade at any time.
          </p>
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => setAuthModal('signup')}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
            Loved by writers worldwide
          </h2>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            See what authors are saying about WorldBest.
          </p>
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription className="text-base italic">
                  "{testimonial.content}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container space-y-6 py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tighter md:text-5xl">
            Ready to start your writing journey?
          </h2>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            Join thousands of authors who are already using WorldBest to create amazing stories.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" onClick={() => setAuthModal('signup')}>
              Get Started for Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <BookOpen className="h-6 w-6" />
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Built by{' '}
              <Link href="#" className="font-medium underline underline-offset-4">
                WorldBest Team
              </Link>
              . The source code is available on{' '}
              <Link href="#" className="font-medium underline underline-offset-4">
                GitHub
              </Link>
              .
            </p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitchMode={(mode) => setAuthModal(mode)}
        />
      )}
    </div>
  );
}