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
} from '@/lib/auth-client';
import {
  LaptopIcon,
  SmartphoneIcon,
  LogOutIcon,
  CircleCheckIcon,
  GlobeIcon,
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
  if (!uaString) return { browser: 'Web Browser', os: 'Desktop', type: 'desktop' };

  let browser = 'Web Browser';
  if (uaString.includes('Firefox')) browser = 'Firefox';
  else if (uaString.includes('Edg')) browser = 'Microsoft Edge';
  else if (uaString.includes('Chrome')) browser = 'Chrome';
  else if (uaString.includes('Safari')) browser = 'Safari';

  let os = 'Desktop';
  let type: 'desktop' | 'mobile' = 'desktop';

  if (uaString.includes('iPhone') || uaString.includes('iPad')) {
    os = 'iOS';
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
  const [, setLoadingSessions] = useState(false);
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
            ipAddress: session.session.ipAddress || null,
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
            ipAddress: session.session.ipAddress || null,
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
                ipAddress: session.session.ipAddress || null,
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
                ipAddress: session.session.ipAddress || null,
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

  const handleRevokeSingle = async (token: string) => {
    setActionLoading(token);
    setMessage(null);
    try {
      const res = await revokeSession({ token });
      if (res.error) {
        setMessage({ type: 'error', text: res.error.message || 'Failed to revoke session' });
      } else {
        setMessage({ type: 'success', text: 'Device signed out successfully' });
        await fetchSessions();
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('This will sign you out from all devices. Continue?')) return;
    setActionLoading('all');
    setMessage(null);
    try {
      await revokeSessions();
      router.replace('/login');
    } catch {
      setMessage({ type: 'error', text: 'Failed to sign out all sessions' });
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    setActionLoading('signout');
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.replace('/login');
          },
        },
      });
    } catch {
      setActionLoading(null);
    }
  };

  if (isPending || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="animate-spin h-5 w-5 border border-white/20 border-t-[#fcfdff] rounded-full" />
      </div>
    );
  }

  const { user } = session;
  const currentSessionToken = session.session?.token;
  const userInitial = user.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 bg-black text-[#fcfdff] ambient-glow-meet">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-serif-headline text-2xl sm:text-3xl font-normal text-[#fcfdff] tracking-tight">
            Account Settings
          </h1>
          <p className="text-xs text-[#888e90]">
            Manage your personal profile and authenticated devices.
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-mono border ${
              message.type === 'success'
                ? 'bg-[#11ff99]/10 text-[#11ff99] border-[#11ff99]/30'
                : 'bg-[#ff2047]/10 text-[#ff2047] border-[#ff2047]/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Card */}
        <section className="p-6 bg-[#0a0a0c] border border-white/[0.10] rounded-2xl space-y-5">
          <div className="flex items-center gap-4">
            {user.image && !imageError ? (
              <Image
                src={user.image}
                alt={user.name || 'User avatar'}
                width={56}
                height={56}
                unoptimized
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-14 h-14 rounded-full border border-white/20 object-cover shadow-lg shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-white/10 to-white/20 border border-white/20 flex items-center justify-center font-medium text-xl text-[#fcfdff] shrink-0">
                {userInitial}
              </div>
            )}

            <div className="space-y-0.5 overflow-hidden">
              <h2 className="text-base font-medium text-[#fcfdff] truncate">{user.name}</h2>
              <p className="text-xs text-[#888e90] truncate">{user.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-[#888e90]">Authentication</span>
              <div className="flex items-center gap-1.5 text-[#fcfdff] font-medium">
                <GlobeIcon size={13} className="text-[#3b9eff]" />
                <span>Google Account</span>
                <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#11ff99]/10 text-[#11ff99] border border-[#11ff99]/20">
                  <CircleCheckIcon size={10} />
                  <span>Connected</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-[#888e90]">Email Status</span>
              <span className="text-xs text-[#11ff99] font-medium flex items-center gap-1">
                <CircleCheckIcon size={12} />
                <span>Verified</span>
              </span>
            </div>
          </div>
        </section>

        {/* Active Sessions Card */}
        <section className="p-6 bg-[#0a0a0c] border border-white/[0.10] rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-[#fcfdff]">Connected Devices</h3>
              <p className="text-xs text-[#888e90]">
                Devices currently signed in to your account.
              </p>
            </div>

            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllSessions}
                disabled={actionLoading !== null}
                className="text-xs text-[#ff2047] hover:underline disabled:opacity-50"
              >
                Sign out all
              </button>
            )}
          </div>

          <div className="space-y-2.5 pt-2">
            {sessions.map((item) => {
              const isCurrent = item.token === currentSessionToken;
              const { browser, os, type } = parseDevice(item.userAgent);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-white/[0.04] border-white/[0.14]'
                      : 'bg-white/[0.02] border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-[#888e90] shrink-0">
                      {type === 'mobile' ? <SmartphoneIcon size={15} /> : <LaptopIcon size={15} />}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#fcfdff]">
                          {browser} on {os}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#11ff99]/10 text-[#11ff99] border border-[#11ff99]/30">
                            Active now
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#888e90]">
                        {isCurrent ? 'Current active session' : 'Signed in device'}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSingle(item.token)}
                      disabled={actionLoading !== null}
                      className="px-2.5 py-1 text-xs text-[#888e90] hover:text-[#ff2047] hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20 disabled:opacity-50"
                    >
                      {actionLoading === item.token ? 'Signing out...' : 'Revoke'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sign Out Card */}
        <section className="p-5 bg-[#0a0a0c] border border-white/[0.08] rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-medium text-[#fcfdff]">Sign Out</h3>
            <p className="text-[11px] text-[#888e90]">End your current session on this device.</p>
          </div>

          <button
            onClick={handleSignOut}
            disabled={actionLoading === 'signout'}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.10] hover:border-red-500/30 text-xs font-medium text-[#888e90] hover:text-red-400 rounded-xl transition-all disabled:opacity-50"
          >
            {actionLoading === 'signout' ? (
              <div className="animate-spin h-3.5 w-3.5 border border-white/30 border-t-white rounded-full" />
            ) : (
              <LogOutIcon size={13} />
            )}
            <span>Sign Out</span>
          </button>
        </section>
      </main>
    </div>
  );
}
