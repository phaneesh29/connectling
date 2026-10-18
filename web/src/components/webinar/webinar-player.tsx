'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { YouTubeAdapter } from '@videojs/youtube-video';
import {
  Radio,
  RefreshCw,
  AlertCircle,
  Sliders,
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

  const [isRevealed, setIsRevealed] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isScaled, setIsScaled] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isFirstPlayRef = useRef(true);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetScaleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Unmute automatically on first user interaction anywhere on the page
  useEffect(() => {
    const handleFirstGesture = () => {
      if (adapterRef.current) {
        try {
          adapterRef.current.muted = false;
          adapterRef.current.play();
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener('click', handleFirstGesture, { once: true, capture: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true, capture: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true, capture: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture, { capture: true });
      window.removeEventListener('keydown', handleFirstGesture, { capture: true });
      window.removeEventListener('touchstart', handleFirstGesture, { capture: true });
    };
  }, []);

  // Disable keyboard shortcuts for playing/pausing/seeking (Space, k, j, l, arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tag = activeEl ? activeEl.tagName.toLowerCase() : '';
      const isInput =
        tag === 'input' ||
        tag === 'textarea' ||
        activeEl?.getAttribute('contenteditable') === 'true' ||
        (activeEl as HTMLElement)?.isContentEditable;

      // Never block keyboard actions when typing in chat, Q&A, or search
      if (isInput) return;

      const keysToBlock = [' ', 'Space', 'k', 'K', 'j', 'J', 'l', 'L', 'ArrowLeft', 'ArrowRight'];
      if (keysToBlock.includes(e.key) || keysToBlock.includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();

        // Enforce broadcast playback: never let the stream pause
        if (adapterRef.current && adapterRef.current.paused) {
          try {
            adapterRef.current.play();
          } catch {
            // Ignore
          }
        }
      }
    };

    const handleBlur = () => {
      // If focus ever slips into the iframe, immediately blur it back to the window
      if (document.activeElement === iframeRef.current) {
        iframeRef.current?.blur();
        window.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // If the browser backgrounded or paused the tab, resume with masked scale when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && adapterRef.current) {
        if (adapterRef.current.paused) {
          setIsScaled(true);
          try {
            adapterRef.current.play();
          } catch {
            // Ignore
          }
          if (resetScaleTimerRef.current) clearTimeout(resetScaleTimerRef.current);
          resetScaleTimerRef.current = setTimeout(() => {
            setIsScaled(false);
          }, 4000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (resetScaleTimerRef.current) {
      clearTimeout(resetScaleTimerRef.current);
      resetScaleTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    if (!videoId) {
      setIsRevealed(false);
      setIsBuffering(false);
      setIsScaled(true);
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    setIsRevealed(false);
    setIsBuffering(false);
    setIsScaled(true);
    setHasError(false);
    isFirstPlayRef.current = true;

    const adapter = new YouTubeAdapter();
    adapterRef.current = adapter;

    // Viewing-only configuration: no controls, autoplay on, playsinline, CC disabled
    adapter.controls = false;
    adapter.autoplay = true;
    adapter.playsInline = true;
    adapter.defaultMuted = false;
    adapter.source = {
      src: videoId,
      engine: {
        youtube: {
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          disablekb: 1,
          cc_load_policy: 0 as any,
          cc_lang_pref: '',
        },
      },
    };

    const disableCaptions = () => {
      try {
        if (adapter.textTracks) {
          for (const track of adapter.textTracks) {
            track.mode = 'disabled';
          }
        }
      } catch {
        // Ignore
      }

      try {
        const engine = adapter.engine as {
          unloadModule?: (module: string) => void;
          setOption?: (module: string, option: string, value: unknown) => void;
        } | null;

        if (engine) {
          if (typeof engine.unloadModule === 'function') {
            engine.unloadModule('captions');
          }
          if (typeof engine.setOption === 'function') {
            engine.setOption('captions', 'track', {});
          }
        }
      } catch {
        // Ignore
      }
    };

    const handlePlaying = () => {
      setIsBuffering(false);
      disableCaptions();

      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }

      // YouTube embeds always flash their title banner & logo watermark for the first ~1s of playback.
      // We keep the 100% opaque Connectling cover up for 1300ms after playing starts so the YouTube
      // intro branding auto-fades out unseen before we smoothly reveal the live broadcast.
      if (isFirstPlayRef.current) {
        isFirstPlayRef.current = false;
        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        revealTimerRef.current = setTimeout(() => {
          setIsRevealed(true);
        }, 1300);
      } else {
        setIsRevealed(true);
      }

      // Whenever YouTube starts OR resumes from pause, it flashes its intro title/watermark overlay.
      // We immediately zoom to scale-[1.28] so the branding is pushed off-screen,
      // and reset back to 100% widescreen after 4s once YouTube's overlay has auto-faded away.
      setIsScaled(true);
      if (resetScaleTimerRef.current) clearTimeout(resetScaleTimerRef.current);
      resetScaleTimerRef.current = setTimeout(() => {
        setIsScaled(false);
      }, 4000);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handleEnded = () => {
      onEnded?.();
    };

    const handleError = () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      if (resetScaleTimerRef.current) clearTimeout(resetScaleTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      setHasError(true);
      setIsRevealed(true);
    };

    const handleLoadComplete = () => {
      disableCaptions();
      // Ensure audio is unmuted and stream starts playing immediately with sound
      try {
        adapter.muted = false;
        adapter.play();
      } catch {
        // Fallback
      }
    };

    const handlePause = () => {
      // Live webinars cannot be paused by attendees.
      // If paused, immediately pre-scale to mask YouTube's resume overlay, then resume playing.
      if (!adapter.ended && adapterRef.current) {
        setIsScaled(true);
        if (resetScaleTimerRef.current) clearTimeout(resetScaleTimerRef.current);
        resetScaleTimerRef.current = setTimeout(() => {
          setIsScaled(false);
        }, 4000);

        try {
          adapterRef.current.play();
        } catch {
          // Fallback
        }
      }
    };

    adapter.addEventListener('playing', handlePlaying);
    adapter.addEventListener('waiting', handleWaiting);
    adapter.addEventListener('loadedmetadata', disableCaptions);
    adapter.addEventListener('loadcomplete', handleLoadComplete);
    adapter.addEventListener('ended', handleEnded);
    adapter.addEventListener('error', handleError);
    adapter.addEventListener('pause', handlePause);

    // Safety timeout: prevent getting stuck on black screen if network stalls or events are delayed
    safetyTimerRef.current = setTimeout(() => {
      if (adapter.paused) {
        try {
          adapter.play();
        } catch {
          // Fallback
        }
      }
      setIsRevealed(true);
    }, 4500);

    try {
      adapter.textTracks.addEventListener('addtrack', (e: any) => {
        if (e.track) e.track.mode = 'disabled';
        disableCaptions();
      });
      adapter.textTracks.addEventListener('change', disableCaptions);
    } catch {
      // Ignore
    }

    adapter.attach(iframe);

    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      if (resetScaleTimerRef.current) {
        clearTimeout(resetScaleTimerRef.current);
        resetScaleTimerRef.current = null;
      }
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
      adapter.removeEventListener('playing', handlePlaying);
      adapter.removeEventListener('waiting', handleWaiting);
      adapter.removeEventListener('loadedmetadata', disableCaptions);
      adapter.removeEventListener('loadcomplete', handleLoadComplete);
      adapter.removeEventListener('ended', handleEnded);
      adapter.removeEventListener('error', handleError);
      adapter.removeEventListener('pause', handlePause);
      try {
        adapter.destroy();
      } catch {
        // Ignore teardown error on unmount
      }
      adapterRef.current = null;
    };
  }, [videoId, onEnded]);

  const handleShieldClick = useCallback(() => {
    if (adapterRef.current) {
      try {
        adapterRef.current.muted = false;
        adapterRef.current.play();
      } catch {
        // Fallback
      }
    }
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsRevealed(false);
    setIsBuffering(false);
    setIsScaled(true);
    isFirstPlayRef.current = true;
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
        pointer-events-none and transform scale-[1.28] push YouTube title banner and bottom YouTube branding
        completely off-screen, cropped cleanly by overflow-hidden.
      */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <iframe
          ref={iframeRef}
          title={title || 'Webinar Broadcast'}
          tabIndex={-1}
          className={`w-full h-full border-0 pointer-events-none origin-center ${
            isScaled
              ? 'transform scale-[1.28] transition-transform duration-150 ease-in'
              : 'transform scale-100 transition-transform duration-1000 ease-out'
          }`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* Viewing Shield: Prevents any click-to-pause or player interaction, auto-plays on click */}
      <div
        className="absolute inset-0 z-10 bg-transparent cursor-default select-none"
        onClick={handleShieldClick}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleShieldClick();
        }}
      />

      {/* 
        Opaque Cover & Branded Loader:
        Keeps a 100% opaque cover during initialization and the first ~1.3s of playback
        so YouTube's intro branding, title card, and watermark fade out invisibly.
      */}
      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06060a] transition-opacity duration-500 ease-out pointer-events-none ${
          isRevealed ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="relative flex flex-col items-center justify-center p-6 text-center">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 bg-gradient-brand pointer-events-none" />

          {/* Loader Spinner */}
          <div className="relative mb-3 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#FF9933] border-t-transparent animate-spin shadow-[0_0_20px_rgba(255,153,51,0.5)]" />
          </div>
          <span className="text-xs font-mono tracking-wider text-[#888e90] uppercase">
            Connecting Stream...
          </span>
        </div>
      </div>

      {/* Mid-stream Buffering Indicator (only when already revealed) */}
      {isBuffering && isRevealed && !hasError && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300">
          <div className="w-10 h-10 rounded-full border-2 border-[#FF9933] border-t-transparent animate-spin mb-3 shadow-[0_0_20px_rgba(255,153,51,0.5)]" />
          <span className="text-xs font-mono tracking-wider text-[#888e90] uppercase">
            Buffering...
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
