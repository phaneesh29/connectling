'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  signOut,
  useSession,
  listSessions,
  revokeSession,
  revokeSessions,
  revokeOtherSessions,
} from '@/lib/auth-client';

interface SessionItem {
  id: string;
  token: string;
  userId: string;
  expiresAt: string | Date;
  createdAt: string | Date;
  updatedAt?: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login');
    }
  }, [session, isPending, router]);

  const fetchSessions = useCallback(async () => {
    if (!session) return;
    setLoadingSessions(true);
    try {
      const res = await listSessions();
      if (res.data) {
        setSessions(res.data as unknown as SessionItem[]);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load sessions' });
    } finally {
      setLoadingSessions(false);
    }
  }, [session]);

  useEffect(() => {
    let ignore = false;
    if (session) {
      listSessions()
        .then((res) => {
          if (!ignore && res.data) {
            setSessions(res.data as unknown as SessionItem[]);
          }
        })
        .catch(() => {
          if (!ignore) {
            setMessage({ type: 'error', text: 'Failed to load sessions' });
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [session]);

  const handleRevokeSession = async (token: string) => {
    setActionLoading(token);
    setMessage(null);
    try {
      const res = await revokeSession({ token });
      if (res.error) {
        setMessage({ type: 'error', text: res.error.message || 'Failed to revoke session' });
      } else {
        setMessage({ type: 'success', text: 'Session revoked successfully' });
        await fetchSessions();
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setActionLoading('other');
    setMessage(null);
    try {
      const res = await revokeOtherSessions();
      if (res.error) {
        setMessage({ type: 'error', text: res.error.message || 'Failed to revoke other sessions' });
      } else {
        setMessage({ type: 'success', text: 'All other sessions revoked successfully' });
        await fetchSessions();
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('This will log you out from ALL devices. Continue?')) return;
    setActionLoading('all');
    setMessage(null);
    try {
      await revokeSessions();
      router.replace('/login');
    } catch {
      setMessage({ type: 'error', text: 'Failed to revoke all sessions' });
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    setActionLoading('signout');
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
  const currentSessionToken = session.session?.token;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Profile & Security
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your account profile, credentials, and active device sessions
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
              : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Card */}
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
                Google OAuth Verified
              </span>
            </div>
          </div>
        </div>

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
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Account Created</span>
            <p className="text-xs text-zinc-900 dark:text-zinc-200">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Sessions Management Card */}
      <div className="p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Active Sessions</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Devices and browsers currently logged into your account
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeOtherSessions}
                disabled={actionLoading !== null}
                className="px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'other' ? 'Revoking...' : 'Revoke Other Devices'}
              </button>
            )}
            <button
              onClick={handleRevokeAllSessions}
              disabled={actionLoading !== null}
              className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading === 'all' ? 'Revoking All...' : 'Revoke All Sessions'}
            </button>
          </div>
        </div>

        {loadingSessions ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-5 w-5 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((item) => {
              const isCurrent = item.token === currentSessionToken;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isCurrent
                      ? 'bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.userAgent ? item.userAgent.split(' ')[0] : 'Web Browser'}
                      </p>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      IP: {item.ipAddress || '127.0.0.1'} &bull; Created:{' '}
                      {new Date(item.createdAt).toLocaleDateString()} at{' '}
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(item.token)}
                      disabled={actionLoading === item.token}
                      className="text-xs font-medium px-3 py-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors self-start sm:self-auto disabled:opacity-50"
                    >
                      {actionLoading === item.token ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={handleSignOut}
            disabled={actionLoading === 'signout'}
            className="px-5 py-2.5 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {actionLoading === 'signout' ? 'Signing Out...' : 'Sign Out Current Session'}
          </button>
        </div>
      </div>
    </main>
  );
}
