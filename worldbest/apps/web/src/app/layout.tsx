import type { Metadata } from 'next';
import { Inter, Georgia } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const georgia = Georgia({ 
  weight: ['400', '700'], 
  subsets: ['latin'], 
  variable: '--font-serif' 
});

export const metadata: Metadata = {
  title: {
    template: '%s | WorldBest',
    default: 'WorldBest - AI-Powered Writing Platform',
  },
  description: 'A production-ready commercial platform for writers featuring comprehensive story bibles, AI-assisted content generation, collaboration tools, and subscription billing.',
  keywords: [
    'writing',
    'storytelling',
    'AI',
    'worldbuilding',
    'characters',
    'story bible',
    'writing tools',
    'creative writing',
    'fiction writing',
    'collaboration',
  ],
  authors: [{ name: 'WorldBest Team' }],
  creator: 'WorldBest',
  publisher: 'WorldBest',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'WorldBest - AI-Powered Writing Platform',
    description: 'A production-ready commercial platform for writers featuring comprehensive story bibles, AI-assisted content generation, collaboration tools, and subscription billing.',
    siteName: 'WorldBest',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WorldBest - AI-Powered Writing Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorldBest - AI-Powered Writing Platform',
    description: 'A production-ready commercial platform for writers featuring comprehensive story bibles, AI-assisted content generation, collaboration tools, and subscription billing.',
    images: ['/og-image.png'],
    creator: '@worldbest',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body 
        className={`${inter.variable} ${georgia.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}