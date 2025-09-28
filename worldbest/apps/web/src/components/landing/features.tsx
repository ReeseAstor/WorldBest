import { 
  BookOpen, 
  Brain, 
  Users, 
  FileText, 
  Shield, 
  Zap,
  Globe,
  BarChart3,
  Lock,
  Download
} from 'lucide-react';

const features = [
  {
    name: 'Comprehensive Story Bibles',
    description: 'Build rich, interconnected worlds with detailed character profiles, location maps, cultural systems, and timeline management.',
    icon: BookOpen,
    highlights: ['Character Development', 'World Building', 'Timeline Management', 'Cultural Systems']
  },
  {
    name: 'AI-Powered Writing Assistants',
    description: 'Three specialized AI personas work with you: Muse for creative inspiration, Editor for refinement, and Coach for guidance.',
    icon: Brain,
    highlights: ['Creative Muse', 'Smart Editor', 'Writing Coach', 'Style Adaptation']
  },
  {
    name: 'Real-Time Collaboration',
    description: 'Work seamlessly with co-authors, editors, and beta readers. Track changes, leave comments, and maintain version control.',
    icon: Users,
    highlights: ['Live Editing', 'Comment System', 'Version Control', 'Team Management']
  },
  {
    name: 'Rich Text Editor',
    description: 'Professional writing environment with distraction-free mode, typewriter scrolling, and advanced formatting options.',
    icon: FileText,
    highlights: ['Distraction-Free', 'Typewriter Mode', 'Advanced Formatting', 'Auto-Save']
  },
  {
    name: 'Content Safety & Moderation',
    description: 'Advanced content filtering with customizable placeholders for sensitive material and age-appropriate rendering.',
    icon: Shield,
    highlights: ['Content Filtering', 'Placeholder System', 'Age Ratings', 'Custom Rules']
  },
  {
    name: 'Export & Publishing',
    description: 'Export your work in multiple formats including ePub, PDF, DOCX, and more. Direct publishing to major platforms.',
    icon: Download,
    highlights: ['Multiple Formats', 'Direct Publishing', 'Custom Styling', 'Batch Export']
  },
  {
    name: 'Analytics & Insights',
    description: 'Track your writing progress, analyze productivity patterns, and get insights into your writing habits.',
    icon: BarChart3,
    highlights: ['Writing Analytics', 'Progress Tracking', 'Productivity Insights', 'Goal Setting']
  },
  {
    name: 'Global Accessibility',
    description: 'Multi-language support, accessibility features, and cloud synchronization across all your devices.',
    icon: Globe,
    highlights: ['Multi-Language', 'Accessibility', 'Cloud Sync', 'Offline Mode']
  }
];

export function Features() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything You Need to Write Better Stories
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            WorldBest combines powerful writing tools, AI assistance, and collaboration features 
            to help you create your best work.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <feature.icon className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {feature.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="inline-flex items-center rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-700/10"
                      >
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}