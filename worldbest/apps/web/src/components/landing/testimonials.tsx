import { Star } from 'lucide-react';

const testimonials = [
  {
    body: 'WorldBest has completely transformed my writing process. The AI assistants help me overcome writer\'s block, and the story bible tools keep everything organized. I\'ve never been more productive.',
    author: {
      name: 'Sarah Chen',
      handle: 'sarahchen_writes',
      role: 'Fantasy Author',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80',
    },
  },
  {
    body: 'The collaboration features are incredible. My editor and I can work on the same document in real-time, and the version control system saves us so much time. It\'s like having a professional writing studio.',
    author: {
      name: 'Marcus Rodriguez',
      handle: 'marcuswrites',
      role: 'Mystery Novelist',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80',
    },
  },
  {
    body: 'As a writing coach, I love how WorldBest helps my clients stay organized and motivated. The analytics show their progress, and the AI coach provides consistent guidance between our sessions.',
    author: {
      name: 'Dr. Emily Watson',
      handle: 'emilycoaches',
      role: 'Writing Coach',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    },
  },
  {
    body: 'The export features are a game-changer. I can generate professional manuscripts in multiple formats, and the direct publishing integration saves me hours of formatting work.',
    author: {
      name: 'James Thompson',
      handle: 'jameswrites',
      role: 'Self-Published Author',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    },
  },
  {
    body: 'WorldBest\'s worldbuilding tools are incredibly detailed. I can create complex fantasy worlds with interconnected cultures, languages, and economies. It\'s like having a personal worldbuilding assistant.',
    author: {
      name: 'Alex Kim',
      handle: 'alexfantasy',
      role: 'Fantasy Worldbuilder',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80',
    },
  },
  {
    body: 'The content safety features give me peace of mind when writing for different audiences. I can easily manage sensitive content and ensure appropriate rendering for all readers.',
    author: {
      name: 'Lisa Park',
      handle: 'lisawrites',
      role: 'Young Adult Author',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80',
    },
  },
];

export function Testimonials() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Loved by writers worldwide
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Join thousands of authors, editors, and writing coaches who trust WorldBest 
            to bring their stories to life.
          </p>
        </div>

        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="-mt-8 sm:-mx-4 sm:columns-2 sm:text-[0] lg:columns-3">
            {testimonials.map((testimonial, testimonialIdx) => (
              <div
                key={testimonialIdx}
                className="pt-8 sm:inline-block sm:w-full sm:px-4"
              >
                <figure className="rounded-2xl bg-gray-50 p-8 text-sm leading-6">
                  <div className="flex gap-x-1 text-primary-600">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 flex-none" fill="currentColor" />
                    ))}
                  </div>
                  <blockquote className="mt-6 text-gray-900">
                    <p>"{testimonial.body}"</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <img
                      className="h-10 w-10 rounded-full bg-gray-50"
                      src={testimonial.author.image}
                      alt={testimonial.author.name}
                    />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {testimonial.author.name}
                      </div>
                      <div className="text-gray-600">@{testimonial.author.handle}</div>
                      <div className="text-gray-500">{testimonial.author.role}</div>
                    </div>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}