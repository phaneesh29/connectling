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
        className={`relative w-full aspect-video bg-[#0a0a0c] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-[#FF9933]/10 border border-[#FF9933]/25 flex items-center justify-center mb-4 text-[#FF9933] shadow-[0_0_20px_rgba(255,153,51,0.15)]">
          <Radio className="w-7 h-7 animate-pulse" />
        </div>
        <h3 className="font-serif-headline text-lg font-normal text-[#fcfdff] mb-2">
          {isHost ? 'Stream Configuration Needed' : 'Broadcast Standing By'}
        </h3>
        <p className="text-xs text-[#888e90] max-w-md mb-5 leading-relaxed">
          {isHost
            ? 'Connect your YouTube broadcast ID or live stream link to preview your stream and broadcast live to attendees.'
            : 'The host has not connected the live stream source yet. Stand by, the event will begin shortly.'}
        </p>
        {isHost && onConfigureStream && (
          <button
            type="button"
            onClick={onConfigureStream}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs shadow-brand-glow transition-all active:scale-[0.98] cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Connect YouTube Live Stream</span>
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
            Buffering Stream...
          </span>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#06060a]/95 p-6 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
          <h4 className="font-serif-headline text-base font-normal text-[#fcfdff] mb-1">
            Stream Unavailable
          </h4>
          <p className="text-xs text-[#888e90] max-w-sm mb-4">
            The YouTube broadcast may be private, ended, or offline. Check that the stream is set to Unlisted or Public.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] border border-white/[0.08] transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF9933]" />
            <span>Retry Stream</span>
          </button>
        </div>
      )}
    </div>
  );
});
