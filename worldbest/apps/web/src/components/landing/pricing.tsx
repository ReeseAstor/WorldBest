import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tiers = [
  {
    name: 'Story Starter',
    id: 'story-starter',
    price: { monthly: '$0', annually: '$0' },
    description: 'Perfect for getting started with your writing journey.',
    features: [
      '2 active projects',
      '10 AI prompts per day',
      'Basic story bible tools',
      'Standard export formats',
      'Community support',
      '5GB storage'
    ],
    mostPopular: false,
  },
  {
    name: 'Solo Author',
    id: 'solo-author',
    price: { monthly: '$15', annually: '$150' },
    description: 'Everything you need to write and publish your stories.',
    features: [
      '10 active projects',
      'Unlimited AI prompts',
      'Full story bible suite',
      'All export formats',
      'Priority support',
      '50GB storage',
      'Advanced analytics',
      'Custom style profiles'
    ],
    mostPopular: true,
  },
  {
    name: 'Pro Creator',
    id: 'pro-creator',
    price: { monthly: '$35', annually: '$350' },
    description: 'Advanced tools for professional writers and content creators.',
    features: [
      'Unlimited projects',
      'Unlimited AI prompts',
      'Voice input & OCR',
      'Advanced collaboration',
      'API access',
      '200GB storage',
      'Detailed analytics',
      'Custom AI training',
      'White-label options'
    ],
    mostPopular: false,
  },
  {
    name: 'Studio Team',
    id: 'studio-team',
    price: { monthly: '$149', annually: '$1490' },
    description: 'Perfect for writing teams and publishing houses.',
    features: [
      'Everything in Pro Creator',
      '5 team member seats',
      'Role-based permissions',
      'Team analytics dashboard',
      'Dedicated support',
      '1TB storage',
      'Custom integrations',
      'SLA guarantee',
      'Onboarding assistance'
    ],
    mostPopular: false,
  },
];

export function Pricing() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Choose the plan that fits your writing needs. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-y-6 sm:mt-20 sm:max-w-none sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10 ${
                tier.mostPopular ? 'ring-2 ring-primary-600' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3
                    id={tier.id}
                    className={`text-lg font-semibold leading-8 ${
                      tier.mostPopular ? 'text-primary-600' : 'text-gray-900'
                    }`}
                  >
                    {tier.name}
                  </h3>
                  {tier.mostPopular && (
                    <p className="rounded-full bg-primary-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-primary-600">
                      Most popular
                    </p>
                  )}
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600">{tier.description}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    {tier.price.monthly}
                  </span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {tier.price.annually} billed annually
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-primary-600" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                className={`mt-8 ${
                  tier.mostPopular
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'ring-1 ring-inset ring-gray-300 hover:ring-gray-400'
                }`}
                variant={tier.mostPopular ? 'default' : 'outline'}
              >
                {tier.name === 'Story Starter' ? 'Get started' : 'Start free trial'}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-600">
            Need a custom plan?{' '}
            <a href="/contact" className="font-semibold text-primary-600 hover:text-primary-500">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}