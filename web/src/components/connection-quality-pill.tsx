'use client';

import React from 'react';
import type { PeerConnectionStatus } from '@/lib/webrtc-mesh';

export interface ConnectionQualityPillProps {
  status?: PeerConnectionStatus;
  className?: string;
  isCompact?: boolean;
}

export function ConnectionQualityPill({
  status,
  className = '',
  isCompact = false,
}: ConnectionQualityPillProps) {
  if (!status || status === 'connected') return null;

  if (status === 'reconnecting') {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full bg-[#181108]/90 border border-amber-500/40 text-amber-300 font-mono font-medium shadow-[0_0_12px_rgba(245,158,11,0.22)] backdrop-blur-md animate-pulse z-30 select-none ${
          isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px] sm:text-[11px]'
        } ${className}`}
        title="Network connection interrupted. Attempting to reconnect..."
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full bg-[#1a080a]/90 border border-[#ff2047]/40 text-[#ff2047] font-mono font-medium shadow-[0_0_12px_rgba(255,32,71,0.22)] backdrop-blur-md z-30 select-none ${
          isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px] sm:text-[11px]'
        } ${className}`}
        title="Connection failed. Please check your network."
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#ff2047] shrink-0" />
        <span>Disconnected</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div
        className={`inline-flex items-center gap-1 rounded-full bg-[#0a1018]/90 border border-sky-500/35 text-sky-300 font-mono font-medium shadow-[0_0_10px_rgba(56,189,248,0.18)] backdrop-blur-md z-30 select-none ${
          isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px] sm:text-[11px]'
        } ${className}`}
        title="Establishing WebRTC media connection..."
      >
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
        <span>Connecting...</span>
      </div>
    );
  }

  return null;
}

export interface NetworkDisconnectAlertProps {
  isReconnecting: boolean;
  className?: string;
}

export function NetworkDisconnectAlert({
  isReconnecting,
  className = '',
}: NetworkDisconnectAlertProps) {
  if (!isReconnecting) return null;

  return (
    <div
      className={`fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1c1206]/95 border border-amber-500/60 text-amber-200 text-xs shadow-[0_0_24px_rgba(245,158,11,0.3)] backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none select-none ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping shrink-0" />
      <span className="font-mono text-[11px] font-semibold tracking-wide">
        Network unstable · Reconnecting...
      </span>
    </div>
  );
}
