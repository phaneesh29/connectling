'use client';

import { signIn, signOut, useSession } from '@/lib/auth-client';

export default function Home() {
  const { data: session, isPending } = useSession();

  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: window.location.origin,
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Connectling</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Minimal Next.js client with Google OAuth authentication
          </p>
        </div>

        {isPending ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin h-6 w-6 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full" />
          </div>
        ) : session?.user ? (
          <div className="space-y-4 text-center">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name || 'User avatar'}
                className="w-16 h-16 rounded-full mx-auto border border-zinc-200 dark:border-zinc-800"
              />
            )}
            <div>
              <p className="font-medium text-lg">{session.user.name}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{session.user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-medium rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 font-medium rounded-lg transition-colors shadow-sm text-sm"
            >
              Continue with Google
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
