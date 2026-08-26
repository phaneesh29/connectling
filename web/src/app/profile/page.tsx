'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth-client';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login');
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace('/login');
        },
      },
    });
  };

  if (isPending || !session) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { user } = session;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Account Profile
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage and review your authenticated user account
        </p>
      </div>

      <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || 'User avatar'}
              className="w-20 h-20 rounded-full border-2 border-zinc-200 dark:border-zinc-700 object-cover shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-2xl font-bold text-zinc-600 dark:text-zinc-300">
              {user.name?.charAt(0) || 'U'}
            </div>
          )}

          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{user.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Google Verified
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Account Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">User ID</span>
              <p className="font-mono text-xs text-zinc-900 dark:text-zinc-200 truncate">{user.id}</p>
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Auth Provider</span>
              <p className="font-medium text-xs text-zinc-900 dark:text-zinc-200">Google OAuth</p>
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Email Status</span>
              <p className="font-medium text-xs text-emerald-600 dark:text-emerald-400">
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </p>
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Created At</span>
              <p className="text-xs text-zinc-900 dark:text-zinc-200">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
