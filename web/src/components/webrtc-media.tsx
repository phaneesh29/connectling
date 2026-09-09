'use client';

import React, { useEffect, useRef } from 'react';

export interface LocalVideoProps {
  stream: MediaStream | null;
  isActive: boolean;
  className?: string;
}

export function LocalVideo({ stream, isActive, className }: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      el.muted = true;
      el.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={className || `w-full h-full object-cover absolute inset-0 z-0 ${isActive && stream ? 'block' : 'hidden'}`}
    />
  );
}

export interface RemoteVideoProps {
  stream?: MediaStream | null;
  isVideoActive: boolean;
  audioOutputId?: string;
  className?: string;
}

export function RemoteVideo({ stream, isVideoActive, audioOutputId, className }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {
        const unlock = () => {
          el.play().catch(() => {});
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
      });
    }
  }, [stream]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !audioOutputId || audioOutputId === 'default') return;
    if ('setSinkId' in el) {
      void (el as unknown as { setSinkId: (id: string) => Promise<void> })
        .setSinkId(audioOutputId)
        .catch((err) => console.warn('Failed to setSinkId on remote video:', err));
    }
  }, [audioOutputId]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
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
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {
        const unlock = () => {
          el.play().catch(() => {});
          window.removeEventListener('click', unlock);
          window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('click', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
      });
    }
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

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}
