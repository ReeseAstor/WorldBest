import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { LandingPage } from '@/components/landing/landing-page';

export default function HomePage() {
  // Check if user is authenticated
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token');
  
  // If authenticated, redirect to dashboard
  if (authToken) {
    redirect('/dashboard');
  }
  
  // Otherwise show landing page
  return <LandingPage />;
}