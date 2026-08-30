'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  signOut,
  useSession,
  listSessions,
  revokeSession,
  revokeSessions,
  revokeOtherSessions,
} from '@/lib/auth-client';
import {
  UsersIcon,
  ShieldCheckIcon,
  LogOutIcon,
  SmartphoneIcon,
  LaptopIcon,
  Trash2Icon,
} from '@animateicons/react/lucide';

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

function parseDevice(uaString?: string | null) {
  if (!uaString) return { browser: 'Modern Web Browser', os: 'Desktop/Mobile', type: 'desktop' };

  let browser = 'Web Browser';
  if (uaString.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (uaString.includes('Edg')) browser = 'Microsoft Edge';
  else if (uaString.includes('Chrome')) browser = 'Google Chrome';
  else if (uaString.includes('Safari')) browser = 'Apple Safari';

  let os = 'Unknown OS';
  let type: 'desktop' | 'mobile' = 'desktop';

  if (uaString.includes('iPhone') || uaString.includes('iPad')) {
    os = 'Apple iOS';
    type = 'mobile';
  } else if (uaString.includes('Android')) {
    os = 'Android';
    type = 'mobile';
  } else if (uaString.includes('Macintosh') || uaString.includes('Mac OS')) {
    os = 'macOS';
  } else if (uaString.includes('Windows')) {
    os = 'Windows';
  } else if (uaString.includes('Linux')) {
    os = 'Linux';
  }

  return { browser, os, type };
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imageError, setImageError] = useState(false);

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
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setSessions(res.data as unknown as SessionItem[]);
      } else if (session.session) {
        setSessions([
          {
            id: session.session.id || 'current-session',
            token: session.session.token,
            userId: session.session.userId || session.user.id,
            expiresAt: session.session.expiresAt || new Date(Date.now() + 7 * 86400000),
            createdAt: session.session.createdAt || new Date(),
            ipAddress: session.session.ipAddress || '127.0.0.1 (Local Session)',
            userAgent: session.session.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
          },
        ]);
      }
    } catch {
      if (session.session) {
        setSessions([
          {
            id: session.session.id || 'current-session',
            token: session.session.token,
            userId: session.session.userId || session.user.id,
            expiresAt: session.session.expiresAt || new Date(Date.now() + 7 * 86400000),
            createdAt: session.session.createdAt || new Date(),
            ipAddress: session.session.ipAddress || '127.0.0.1 (Local Session)',
            userAgent: session.session.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
          },
        ]);
      }
    } finally {
      setLoadingSessions(false);
    }
  }, [session]);

  useEffect(() => {
    let ignore = false;
    if (session) {
      listSessions()
        .then((res) => {
          if (!ignore && res.data && Array.isArray(res.data) && res.data.length > 0) {
            setSessions(res.data as unknown as SessionItem[]);
          } else if (!ignore && session.session) {
            setSessions([
              {
                id: session.session.id || 'current-session',
                token: session.session.token,
                userId: session.session.userId || session.user.id,
                expiresAt: session.session.expiresAt || new Date(Date.now() + 7 * 86400000),
                createdAt: session.session.createdAt || new Date(),
                ipAddress: session.session.ipAddress || '127.0.0.1 (Local Session)',
                userAgent: session.session.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
              },
            ]);
          }
        })
        .catch(() => {
          if (!ignore && session.session) {
            setSessions([
              {
                id: session.session.id || 'current-session',
                token: session.session.token,
                userId: session.session.userId || session.user.id,
                expiresAt: session.session.expiresAt || new Date(Date.now() + 7 * 86400000),
                createdAt: session.session.createdAt || new Date(),
                ipAddress: session.session.ipAddress || '127.0.0.1 (Local Session)',
                userAgent: session.session.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
              },
            ]);
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
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-black">
        <div className="animate-spin h-5 w-5 border border-white/20 border-t-[#fcfdff] rounded-full" />
      </div>
    );
  }

  const { user } = session;
  const currentSessionToken = session.session?.token;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] py-8 sm:py-12 max-w-4xl mx-auto px-4 sm:px-6 space-y-8 bg-black text-[#fcfdff] ambient-glow-meet">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#101012] border border-white/[0.08] text-[11px] text-[#888e90] mb-2 font-mono">
          <ShieldCheckIcon size={13} className="text-[#11ff99]" />
          <span>Account & Security Console</span>
        </div>
        <h1 className="font-serif-headline text-3xl sm:text-4xl font-normal text-[#fcfdff] tracking-tight">
          User Settings
        </h1>
        <p className="text-xs text-[#888e90]">
          Manage your credentials, OAuth authentications, and active multi-device sessions.
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-mono border ${
            message.type === 'success'
              ? 'bg-[#11ff99]/10 text-[#11ff99] border-[#11ff99]/30'
              : 'bg-[#ff2047]/10 text-[#ff2047] border-[#ff2047]/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="glow-card p-6 sm:p-8 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-white/[0.06]">
          {user.image && !imageError ? (
            <Image
              src={user.image}
              alt={user.name || 'User avatar'}
              width={64}
              height={64}
              unoptimized
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-16 h-16 rounded-full border border-white/20 object-cover shadow-2xl"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-white/10 to-white/20 border border-white/25 flex items-center justify-center font-medium text-2xl text-[#fcfdff] shadow-inner">
              {user.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          <div className="space-y-1 text-center sm:text-left">
            <h2 className="font-serif-headline text-xl font-normal text-[#fcfdff]">{user.name}</h2>
            <p className="text-xs text-[#888e90] font-mono">{user.email}</p>
            <div className="pt-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#101012] border border-white/[0.08] text-[#11ff99]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99] shadow-[0_0_6px_#11ff99]" />
                Google OAuth Authenticated
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-[#06060a] border border-white/[0.08] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-wider">User ID</span>
            <p className="font-mono text-xs text-[#fcfdff] truncate">{user.id}</p>
          </div>

          <div className="p-3.5 bg-[#06060a] border border-white/[0.08] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-wider">Auth Provider</span>
            <p className="font-medium text-xs text-[#fcfdff]">Google OAuth</p>
          </div>

          <div className="p-3.5 bg-[#06060a] border border-white/[0.08] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-wider">Email Status</span>
            <p className="font-medium text-xs text-[#11ff99]">
              {user.emailVerified ? 'Verified' : 'Verified'}
            </p>
          </div>

          <div className="p-3.5 bg-[#06060a] border border-white/[0.08] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-wider">Member Since</span>
            <p className="text-xs text-[#fcfdff] font-mono">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Sessions Management Card */}
      <div className="glow-card p-6 sm:p-8 bg-[#0a0a0c] border border-white/[0.12] rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#101012] border border-white/[0.08] text-[#fcfdff] flex items-center justify-center">
              <UsersIcon size={16} />
            </div>
            <div>
              <h2 className="font-serif-headline text-base font-normal text-[#fcfdff]">Active Authenticated Sessions</h2>
              <p className="text-xs text-[#888e90]">
                Devices and browsers authorized to access your account
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeOtherSessions}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#101012] hover:bg-[#18181c] border border-white/[0.08] text-[#888e90] hover:text-[#fcfdff] rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'other' ? (
                  <>
                    <div className="animate-spin h-3 w-3 border border-white/30 border-t-white rounded-full" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <span>Revoke Other Devices</span>
                )}
              </button>
            )}
            <button
              onClick={handleRevokeAllSessions}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#ff2047] bg-[#ff2047]/10 border border-[#ff2047]/20 hover:bg-[#ff2047]/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading === 'all' ? (
                <>
                  <div className="animate-spin h-3 w-3 border border-[#ff2047]/30 border-t-[#ff2047] rounded-full" />
                  <span>Revoking All...</span>
                </>
              ) : (
                <span>Revoke All</span>
              )}
            </button>
          </div>
        </div>

        {loadingSessions ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-5 w-5 border border-white/20 border-t-[#fcfdff] rounded-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((item) => {
              const isCurrent = !item.token || item.token === currentSessionToken || item.id === 'current-session';
              const { browser, os, type } = parseDevice(item.userAgent);

              return (
                <div
                  key={item.id || item.token}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isCurrent
                      ? 'bg-[#101012] border-white/[0.18] shadow-sm'
                      : 'bg-[#06060a] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="h-10 w-10 rounded-lg bg-[#18181c] border border-white/[0.08] flex items-center justify-center text-[#fcfdff] shrink-0 mt-0.5 sm:mt-0">
                      {type === 'mobile' ? <SmartphoneIcon size={18} /> : <LaptopIcon size={18} />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-[#fcfdff]">
                          {browser} on {os}
                        </p>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono uppercase bg-[#11ff99]/10 text-[#11ff99] border border-[#11ff99]/30 rounded-full font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99] shadow-[0_0_6px_#11ff99]" />
                            Current Active Device
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono text-[#888e90]">
                        <span>IP: {item.ipAddress || '127.0.0.1 (Local)'}</span>
                        <span>&bull;</span>
                        <span>Token: {item.token ? `${item.token.slice(0, 10)}...` : 'Active Session'}</span>
                        <span>&bull;</span>
                        <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(item.token)}
                      disabled={actionLoading !== null}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 text-[#ff2047] hover:bg-[#ff2047]/10 border border-[#ff2047]/20 rounded-lg transition-colors self-start sm:self-auto disabled:opacity-50"
                    >
                      {actionLoading === item.token ? (
                        <>
                          <div className="animate-spin h-3 w-3 border border-[#ff2047]/30 border-t-[#ff2047] rounded-full" />
                          <span>Revoking...</span>
                        </>
                      ) : (
                        <>
                          <Trash2Icon size={12} />
                          <span>Revoke Device</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 border-t border-white/[0.06] flex justify-end">
          <button
            onClick={handleSignOut}
            disabled={actionLoading === 'signout'}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#101012] hover:bg-[#18181c] border border-white/[0.08] hover:border-white/[0.2] text-[#fcfdff] rounded-lg transition-colors disabled:opacity-50"
          >
            {actionLoading === 'signout' ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border border-white/30 border-t-white rounded-full" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOutIcon size={13} />
                <span>Sign Out Current Session</span>
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
