'use client';

import React, { useEffect, useRef } from 'react';

// Keep one autoplay unlock handler per element and remove it on stream replacement.
function mediaPlayback(element: HTMLMediaElement, stream: MediaStream, muted: boolean) {
  let disposed = false;
  let waiting = false;
  const clearGesture = () => {
    waiting = false;
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
  };
  const unlock = () => { clearGesture(); play(); };
  const play = () => {
    if (disposed) return;
    if (element.srcObject !== stream) element.srcObject = stream;
    element.muted = muted;
    void element.play().catch(() => {
      if (disposed || waiting) return;
      waiting = true;
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    });
  };
  return { play, dispose: () => { disposed = true; clearGesture(); element.srcObject = null; } };
}

export interface LocalVideoProps {
  stream: MediaStream | null;
  isActive: boolean;
  isMirrored?: boolean;
  className?: string;
}

export function LocalVideo({ stream, isActive, isMirrored = false, className }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream || !isActive) {
      el.srcObject = null;
      return;
    }

    const attachAndPlay = () => {
      const currentEl = videoRef.current;
      if (!currentEl) return;
      const hasLiveVideo = stream.getVideoTracks().some((t) => t.readyState === 'live');
      if (!hasLiveVideo) {
        currentEl.srcObject = null;
        return;
      }
      if (currentEl.srcObject !== stream) {
        currentEl.srcObject = stream;
      }
      currentEl.muted = true;
      currentEl.play().catch(() => {});
    };

    attachAndPlay();

    const boundTracks = new Set<MediaStreamTrack>();
    const bindTrack = (track: MediaStreamTrack) => {
      if (boundTracks.has(track)) return;
      boundTracks.add(track);
      track.addEventListener('unmute', attachAndPlay);
    };

    stream.getVideoTracks().forEach(bindTrack);

    const onAddTrack = (e: Event) => {
      const trackEvent = e as MediaStreamTrackEvent;
      if (trackEvent.track) {
        bindTrack(trackEvent.track);
      }
      attachAndPlay();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const currentEl = videoRef.current;
        if (currentEl && currentEl.srcObject === stream) {
          void currentEl.play().catch(() => {});
        }
      }
    };

    stream.addEventListener('addtrack', onAddTrack);
    stream.addEventListener('removetrack', attachAndPlay);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stream.removeEventListener('addtrack', onAddTrack);
      stream.removeEventListener('removetrack', attachAndPlay);
      document.removeEventListener('visibilitychange', handleVisibility);
      boundTracks.forEach((track) => {
        track.removeEventListener('unmute', attachAndPlay);
      });
      boundTracks.clear();
      if (el && (!stream || !isActive)) el.srcObject = null;
    };
  }, [stream, isActive]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`${
        className || 'w-full h-full object-cover absolute inset-0 z-0'
      } ${isActive && stream ? 'block' : 'hidden'} ${isMirrored ? '-scale-x-100' : ''}`}
    />
  );
}

export interface RemoteVideoProps {
  stream?: MediaStream | null;
  isVideoActive: boolean;
  audioOutputId?: string;
  isMirrored?: boolean;
  className?: string;
}

export function RemoteVideo({
  stream,
  isVideoActive,
  isMirrored = false,
  className,
}: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream || !isVideoActive) {
      el.srcObject = null;
      return;
    }

    const playback = mediaPlayback(el, stream, true);
    const playVideo = playback.play;

    playVideo();

    const boundTracks = new Set<MediaStreamTrack>();
    const bindTrack = (track: MediaStreamTrack) => {
      if (boundTracks.has(track)) return;
      boundTracks.add(track);
      track.addEventListener('unmute', playVideo);
    };

    stream.getVideoTracks().forEach(bindTrack);

    const onAddTrack = (e: Event) => {
      const trackEvent = e as MediaStreamTrackEvent;
      if (trackEvent.track) {
        bindTrack(trackEvent.track);
      }
      playVideo();
    };

    const handleLoadedMetadata = () => {
      playVideo();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const currentEl = videoRef.current;
        if (currentEl && currentEl.srcObject === stream) {
          void currentEl.play().catch(() => {});
        } else {
          playVideo();
        }
      }
    };

    stream.addEventListener('addtrack', onAddTrack);
    stream.addEventListener('removetrack', playVideo);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('canplay', handleLoadedMetadata);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stream.removeEventListener('addtrack', onAddTrack);
      stream.removeEventListener('removetrack', playVideo);
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
      el.removeEventListener('canplay', handleLoadedMetadata);
      document.removeEventListener('visibilitychange', handleVisibility);
      boundTracks.forEach((track) => {
        track.removeEventListener('unmute', playVideo);
      });
      boundTracks.clear();
      if (el && (!stream || !isVideoActive)) playback.dispose();
    };
  }, [stream, isVideoActive]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`${
        className || 'w-full h-full object-cover absolute inset-0 z-0'
      } ${isVideoActive ? 'block' : 'hidden'} ${isMirrored ? '-scale-x-100' : ''}`}
    />
  );
}

export interface RemoteAudioProps {
  stream?: MediaStream | null;
  audioOutputId?: string;
}

export function RemoteAudio({ stream, audioOutputId }: RemoteAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!stream) {
      el.srcObject = null;
      return;
    }

    const playback = mediaPlayback(el, stream, false);
    const attachAndPlay = playback.play;

    attachAndPlay();

    const boundTracks = new Set<MediaStreamTrack>();
    const bindTrack = (track: MediaStreamTrack) => {
      if (boundTracks.has(track)) return;
      boundTracks.add(track);
      track.addEventListener('unmute', attachAndPlay);
    };

    stream.getAudioTracks().forEach(bindTrack);

    const onAddTrack = (e: Event) => {
      const trackEvent = e as MediaStreamTrackEvent;
      if (trackEvent.track) {
        bindTrack(trackEvent.track);
      }
      attachAndPlay();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        attachAndPlay();
      }
    };

    stream.addEventListener('addtrack', onAddTrack);
    stream.addEventListener('removetrack', attachAndPlay);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stream.removeEventListener('addtrack', onAddTrack);
      stream.removeEventListener('removetrack', attachAndPlay);
      document.removeEventListener('visibilitychange', handleVisibility);
      boundTracks.forEach((track) => {
        track.removeEventListener('unmute', attachAndPlay);
      });
      boundTracks.clear();
      playback.dispose();
    };
  }, [stream]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if ('setSinkId' in el) {
      void (el as unknown as { setSinkId: (id: string) => Promise<void> })
        .setSinkId(audioOutputId && audioOutputId !== 'default' ? audioOutputId : '')
        .catch((err) => console.warn('Failed to setSinkId on remote audio:', err));
    }
  }, [audioOutputId]);

  return <audio ref={audioRef} autoPlay playsInline className="absolute opacity-0 pointer-events-none w-0 h-0" />;
}
