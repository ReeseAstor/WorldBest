import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WorldBest - AI-Powered Writing Platform',
  description: 'A comprehensive platform for writers combining Story Bibles, AI-assisted content generation, collaboration tools, and publishing capabilities.',
  keywords: 'writing, AI, story bible, worldbuilding, collaboration, publishing',
  authors: [{ name: 'WorldBest Team' }],
  creator: 'WorldBest',
  publisher: 'WorldBest',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://worldbest.ai',
    siteName: 'WorldBest',
    title: 'WorldBest - AI-Powered Writing Platform',
    description: 'Empower your writing with AI assistants, comprehensive worldbuilding tools, and collaborative features.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'WorldBest Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorldBest - AI-Powered Writing Platform',
    description: 'Empower your writing with AI assistants, comprehensive worldbuilding tools, and collaborative features.',
    images: ['/twitter-image.png'],
    creator: '@worldbest',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              duration: 4000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}