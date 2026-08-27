'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login');
    }
  }, [session, isPending, router]);

  const checkApiHealth = async () => {
    setCheckingHealth(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/api/v1/health`);
      const data = await res.json();
      setHealthStatus(data.success ? 'Operational (200 OK)' : 'Error');
    } catch {
      setHealthStatus('Cannot reach server');
    } finally {
      setCheckingHealth(false);
    }
  };

  if (isPending || !session) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome, {session.user.name} 👋
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Logged in via Google OAuth with active session
          </p>
        </div>
        <Link
          href="/profile"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors shadow-sm"
        >
          View Profile &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Authentication</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            Authenticated
          </p>
          <p className="text-xs text-zinc-400">Google OAuth Provider</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Database</span>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Neon PostgreSQL</p>
          <p className="text-xs text-zinc-400">Drizzle HTTP Adapter</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Backend API</span>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Express 5</p>
          <p className="text-xs text-zinc-400">Prefix: /api/v1</p>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Backend Health Check</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Test live connection to Express /api/v1/health</p>
          </div>
          <button
            onClick={checkApiHealth}
            disabled={checkingHealth}
            className="px-3.5 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {checkingHealth ? 'Checking...' : 'Ping API'}
          </button>
        </div>
        {healthStatus && (
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300">
            Status: {healthStatus}
          </div>
        )}
      </div>
    </main>
  );
}
