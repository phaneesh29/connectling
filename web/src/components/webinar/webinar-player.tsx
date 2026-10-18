'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { YouTubeAdapter } from '@videojs/youtube-video';
import {
  Radio,
  RefreshCw,
  AlertCircle,
  Sliders,
  VolumeX,
} from 'lucide-react';

interface WebinarPlayerProps {
  videoId?: string | null;
  title?: string;
  isHost?: boolean;
  onEnded?: () => void;
  onConfigureStream?: () => void;
  className?: string;
}

export const WebinarPlayer = React.memo(function WebinarPlayer({
  videoId,
  title,
  isHost = false,
  onEnded,
  onConfigureStream,
  className = '',
}: WebinarPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const adapterRef = useRef<YouTubeAdapter | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!videoId) {
      setIsLoading(false);
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    setIsLoading(true);
    setHasError(false);

    const adapter = new YouTubeAdapter();
    adapterRef.current = adapter;

    // Viewing-only configuration: no controls, autoplay on, playsinline
    adapter.controls = false;
    adapter.autoplay = true;
    adapter.playsInline = true;
    adapter.defaultMuted = false;
    adapter.src = videoId;

    const handlePlaying = () => {
      setIsLoading(false);
    };

    const handleEnded = () => {
      onEnded?.();
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    const handleVolumeChange = () => {
      setIsMuted(adapter.muted);
    };

    adapter.addEventListener('playing', handlePlaying);
    adapter.addEventListener('ended', handleEnded);
    adapter.addEventListener('error', handleError);
    adapter.addEventListener('volumechange', handleVolumeChange);

    adapter.attach(iframe);

    return () => {
      adapter.removeEventListener('playing', handlePlaying);
      adapter.removeEventListener('ended', handleEnded);
      adapter.removeEventListener('error', handleError);
      adapter.removeEventListener('volumechange', handleVolumeChange);
      try {
        adapter.destroy();
      } catch {
        // Ignore teardown error on unmount
      }
      adapterRef.current = null;
    };
  }, [videoId, onEnded]);

  const handleUnmute = useCallback(() => {
    if (adapterRef.current) {
      try {
        adapterRef.current.muted = false;
        adapterRef.current.volume = 1;
      } catch {
        // Fallback
      }
      setIsMuted(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    if (adapterRef.current) {
      try {
        adapterRef.current.load();
      } catch {
        // Fallback
      }
    }
  }, []);

  if (!videoId) {
    return (
      <div
        className={`relative w-full aspect-video bg-gradient-to-b from-[#0a0a10] via-[#06060a] to-[#040407] border border-white/[0.12] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 sm:p-10 text-center shadow-2xl ${className}`}
      >
        {/* Atmospheric Ambient Glows & Grid */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 bg-gradient-brand pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF9933]/30 to-transparent pointer-events-none" />

        {/* Live Broadcast Status Pill */}
        <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101016]/90 border border-white/[0.10] text-[10px] font-mono tracking-wider text-[#888e90] uppercase mb-4 shadow-sm backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF9933] animate-pulse shadow-[0_0_8px_#FF9933]" />
          <span className="text-[#fcfdff] font-medium">{isHost ? 'Studio Standby' : 'Awaiting Host'}</span>
        </div>

        {/* Concentric Radar Rings & Glowing Icon */}
        <div className="relative z-10 mb-4 flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full border border-[#FF9933]/15 animate-ping opacity-30 pointer-events-none" />
          <div className="absolute w-20 h-20 rounded-full border border-white/[0.08] pointer-events-none" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF9933]/20 via-[#FF9933]/10 to-transparent border border-[#FF9933]/35 flex items-center justify-center text-[#FF9933] shadow-[0_0_28px_rgba(255,153,51,0.25)] backdrop-blur-md">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <h3 className="relative z-10 font-serif-headline text-lg sm:text-xl font-normal text-[#fcfdff] mb-1.5 tracking-tight">
          {isHost ? 'Stream Not Connected' : 'Waiting for Broadcast'}
        </h3>
        <p className="relative z-10 text-xs text-[#888e90] max-w-sm mb-5 leading-relaxed font-sans">
          {isHost
            ? 'Connect your YouTube live stream URL or video ID to start broadcasting.'
            : 'The host has not started streaming video yet. The screen will update automatically.'}
        </p>

        {isHost && onConfigureStream && (
          <button
            type="button"
            onClick={onConfigureStream}
            className="relative z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs shadow-brand-glow transition-all active:scale-[0.98] cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Connect Stream</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none border border-white/[0.08] shadow-2xl ${className}`}
    >
      {/* 
        Video.js YouTube Layer:
        IFrame managed by @videojs/youtube-video adapter.
        pointer-events-none and transform scale-105 clip YouTube watermarks and disable any clicking to pause/interact with YouTube.
      */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <iframe
          ref={iframeRef}
          title={title || 'Webinar Broadcast'}
          className="w-full h-full border-0 pointer-events-none transform scale-105 origin-center"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* Viewing Shield: Prevents any click-to-pause or player interaction */}
      <div
        className="absolute inset-0 z-10 bg-transparent"
        onClick={isMuted ? handleUnmute : undefined}
      />

      {/* Unmute Pill if audio is muted by browser autoplay policy */}
      {isMuted && (
        <button
          type="button"
          onClick={handleUnmute}
          className="absolute top-4 right-4 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-mono backdrop-blur-md border border-white/15 shadow-xl cursor-pointer transition-all active:scale-95 animate-pulse"
          title="Unmute audio"
        >
          <VolumeX className="w-3.5 h-3.5 text-[#FF9933]" />
          <span>Tap to Unmute</span>
        </button>
      )}

      {/* Buffering / Loading Indicator */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-10 h-10 rounded-full border-2 border-[#FF9933] border-t-transparent animate-spin mb-3 shadow-[0_0_20px_rgba(255,153,51,0.5)]" />
          <span className="text-xs font-mono tracking-wider text-[#888e90] uppercase">
            Loading...
          </span>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#06060a]/95 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <h4 className="font-serif-headline text-sm font-normal text-[#fcfdff] mb-1">
            Stream Unavailable
          </h4>
          <p className="text-xs text-[#888e90] max-w-xs mb-3">
            Stream offline or private. Check video ID or link.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] border border-white/[0.08] transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF9933]" />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
});
