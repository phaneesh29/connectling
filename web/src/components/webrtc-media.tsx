'use client';

import React, { useEffect, useRef } from 'react';

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
      const hasLiveVideo = stream.getVideoTracks().some((t) => t.readyState === 'live');
      if (!hasLiveVideo) {
        el.srcObject = null;
        return;
      }
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = true;
      el.play().catch(() => {});
    };

    attachAndPlay();

    stream.addEventListener('addtrack', attachAndPlay);
    stream.addEventListener('removetrack', attachAndPlay);

    return () => {
      stream.removeEventListener('addtrack', attachAndPlay);
      stream.removeEventListener('removetrack', attachAndPlay);
      if (el) el.srcObject = null;
    };
  }, [stream, isActive]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={
        className ||
        `w-full h-full object-cover absolute inset-0 z-0 ${
          isActive && stream ? 'block' : 'hidden'
        } ${isMirrored ? '-scale-x-100' : ''}`
      }
    />
  );
}

export interface RemoteVideoProps {
  stream?: MediaStream | null;
  isVideoActive: boolean;
  audioOutputId?: string;
  className?: string;
}

export function RemoteVideo({ stream, isVideoActive, className }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream || !isVideoActive) {
      el.srcObject = null;
      return;
    }

    const attachAndPlay = () => {
      const hasLiveVideo = stream.getVideoTracks().some((t) => t.readyState !== 'ended');
      if (!hasLiveVideo) {
        return;
      }
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = true; // Video element is muted so audio doesn't conflict with RemoteAudio
      el.play().catch(() => {
        const unlock = () => {
          el.play().catch(() => {});
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
      });
    };

    attachAndPlay();

    const handleUnmute = () => {
      attachAndPlay();
    };

    stream.addEventListener('addtrack', attachAndPlay);
    stream.addEventListener('removetrack', attachAndPlay);
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.addEventListener('unmute', handleUnmute);
    });

    return () => {
      stream.removeEventListener('addtrack', attachAndPlay);
      stream.removeEventListener('removetrack', attachAndPlay);
      videoTracks.forEach((track) => {
        track.removeEventListener('unmute', handleUnmute);
      });
      if (el && !isVideoActive) {
        el.srcObject = null;
      }
    };
  }, [stream, isVideoActive]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={className || `w-full h-full object-cover absolute inset-0 z-0 ${isVideoActive ? 'block' : 'hidden'}`}
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

    const attachAndPlay = () => {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {
        const unlock = () => {
          el.play().catch(() => {});
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
      });
    };

    attachAndPlay();

    stream.addEventListener('addtrack', attachAndPlay);
    stream.addEventListener('removetrack', attachAndPlay);

    return () => {
      stream.removeEventListener('addtrack', attachAndPlay);
      stream.removeEventListener('removetrack', attachAndPlay);
      if (el) el.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioOutputId || audioOutputId === 'default') return;
    if ('setSinkId' in el) {
      void (el as unknown as { setSinkId: (id: string) => Promise<void> })
        .setSinkId(audioOutputId)
        .catch((err) => console.warn('Failed to setSinkId on remote audio:', err));
    }
  }, [audioOutputId]);

  return <audio ref={audioRef} autoPlay playsInline className="absolute opacity-0 pointer-events-none w-0 h-0" />;
}
