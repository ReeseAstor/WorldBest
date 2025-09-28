import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WorldBest - AI-Powered Writing Platform',
  description: 'A production-ready commercial platform for writers featuring comprehensive story bibles, AI-assisted content generation, collaboration tools, and subscription billing.',
  keywords: ['writing', 'AI', 'story bible', 'collaboration', 'publishing', 'authors'],
  authors: [{ name: 'WorldBest Team' }],
  creator: 'WorldBest',
  publisher: 'WorldBest',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'WorldBest - AI-Powered Writing Platform',
    description: 'A production-ready commercial platform for writers featuring comprehensive story bibles, AI-assisted content generation, collaboration tools, and subscription billing.',
    siteName: 'WorldBest',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorldBest - AI-Powered Writing Platform',
    description: 'A production-ready commercial platform for writers featuring comprehensive story bibles, AI-assisted content generation, collaboration tools, and subscription billing.',
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
  verification: {
    google: 'your-google-verification-code',
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
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}