'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
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

// Global declaration for YouTube IFrame API
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: {
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getPlayerState: () => number;
  getDuration: () => number;
  getCurrentTime: () => number;
  destroy: () => void;
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
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const playerIdRef = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isLiveEdge, setIsLiveEdge] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Auto-hide controls timer
  const scheduleControlsHide = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    setIsControlsVisible(true);
    hideControlsTimerRef.current = setTimeout(() => {
      // Don't hide if paused
      if (isPlaying) {
        setIsControlsVisible(false);
      }
    }, 3200);
  }, [isPlaying]);

  const handleMouseMove = useCallback(() => {
    scheduleControlsHide();
  }, [scheduleControlsHide]);

  // Load YouTube IFrame API script
  useEffect(() => {
    if (!videoId) {
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;

    const loadAPI = () => {
      if (!window.YT) {
        const existingScript = document.getElementById('youtube-iframe-api');
        if (!existingScript) {
          const tag = document.createElement('script');
          tag.id = 'youtube-iframe-api';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }

        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prevReady?.();
          if (isSubscribed) initPlayer();
        };
      } else {
        initPlayer();
      }
    };

    const initPlayer = () => {
      if (!isSubscribed || !videoId) return;

      try {
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }

        playerRef.current = new window.YT.Player(playerIdRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event) => {
              if (!isSubscribed) return;
              setIsLoading(false);
              event.target.setVolume(80);
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (!isSubscribed) return;
              const state = event.data;
              if (state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setIsLoading(false);
              } else if (state === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                setIsControlsVisible(true);
              } else if (state === window.YT.PlayerState.BUFFERING) {
                setIsLoading(true);
              } else if (state === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                onEnded?.();
              }
            },
            onError: () => {
              if (!isSubscribed) return;
              setHasError(true);
              setIsLoading(false);
            },
          },
        });
      } catch (err) {
        console.error('Failed to initialize YouTube Player:', err);
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadAPI();

    return () => {
      isSubscribed = false;
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
  }, [videoId, onEnded]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Controls actions
  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      setVolume(val);
      if (playerRef.current) {
        playerRef.current.setVolume(val);
        if (val === 0) {
          playerRef.current.mute();
          setIsMuted(true);
        } else if (isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        }
      }
    },
    [isMuted]
  );

  const snapToLiveEdge = useCallback(() => {
    if (!playerRef.current) return;
    try {
      const duration = playerRef.current.getDuration();
      if (duration && duration > 0) {
        playerRef.current.seekTo(duration, true);
      }
      playerRef.current.playVideo();
      setIsLiveEdge(true);
    } catch {
      // fallback
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen]);

  // If no video ID configured yet
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
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsControlsVisible(true)}
      onMouseLeave={() => isPlaying && setIsControlsVisible(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`group relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none border border-white/[0.08] shadow-2xl ${className}`}
    >
      {/* 
        LAYER 1: The Cropped & Scaled YouTube Engine
        transform: scale(1.06) + overflow: hidden physically clips out
        top title bar and bottom-right YouTube watermarks!
      */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div
          id={playerIdRef.current}
          className="w-full h-full transform scale-105 origin-center pointer-events-none"
        />
      </div>

      {/* 
        LAYER 2: The Click-Shield
        Catches all clicks directly to prevent any clicks or context menus
        from ever reaching youtube.com!
      */}
      <div
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="absolute inset-0 z-20 cursor-pointer bg-transparent"
        aria-label="Toggle Play"
      />

      {/* Buffering / Loading Indicator */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs">
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
          <h4 className="font-serif-headline text-base font-normal text-[#fcfdff] mb-1">Stream Unavailable</h4>
          <p className="text-xs text-[#888e90] max-w-sm mb-4">
            The YouTube broadcast may be private, ended, or offline. Check that the stream is set to Unlisted or Public.
          </p>
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              if (playerRef.current) {
                playerRef.current.playVideo();
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#101012] hover:bg-[#18181c] text-xs font-medium text-[#fcfdff] border border-white/[0.08] transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#FF9933]" />
            <span>Retry Stream</span>
          </button>
        </div>
      )}

      {/* 
        LAYER 3: Connectling Custom Controls Bar
        Pure Connectling UI, styled with dark glassmorphism and #FF9933
      */}
      <div
        className={`absolute inset-x-0 bottom-0 z-40 p-4 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/40 to-transparent ${
          isControlsVisible || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3 bg-[#0a0a0c]/85 backdrop-blur-xl px-4 py-2.5 rounded-xl border border-white/[0.12] shadow-2xl">
          {/* Left Controls: Play/Pause, Live Edge Button, Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 rounded-lg text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={isPlaying ? 'Pause (Space/k)' : 'Play (Space/k)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Vidstack-style Live Edge Button */}
            <button
              type="button"
              onClick={snapToLiveEdge}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold tracking-wider transition-all cursor-pointer ${
                isLiveEdge
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-white/[0.04] text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.08]'
              }`}
              title="Snap to Live broadcast"
            >
              <span className={`w-2 h-2 rounded-full ${isLiveEdge ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`} />
              <span>LIVE</span>
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.08] transition-colors cursor-pointer"
                title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : volume < 50 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1.5 rounded-lg appearance-none bg-white/[0.1] accent-[#FF9933] cursor-pointer"
                title="Volume"
              />
            </div>

            {title && (
              <span className="hidden md:inline-block text-xs font-medium text-[#888e90] truncate max-w-xs ml-2 border-l border-white/[0.08] pl-3">
                {title}
              </span>
            )}
          </div>

          {/* Right Controls: Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (f)' : 'Fullscreen (f)'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
