import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is authenticated
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token');
  
  if (!authToken) {
    redirect('/');
  }

  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}