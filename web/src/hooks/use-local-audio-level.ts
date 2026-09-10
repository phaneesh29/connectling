'use client';

import { useState, useEffect, useRef } from 'react';

export interface UseLocalAudioLevelOptions {
  isEnabled: boolean; // e.g. hasEntered && isMicOn
  deviceId?: string;
  stream?: MediaStream | null;
}

export interface LocalAudioLevelState {
  volume: number; // 0 - 100
  isSpeaking: boolean;
  frequencyBands: number[]; // 5 frequency bands (0 - 100 each)
}

export function useLocalAudioLevel({
  isEnabled,
  deviceId,
  stream: externalStream,
}: UseLocalAudioLevelOptions): LocalAudioLevelState {
  const [volume, setVolume] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [frequencyBands, setFrequencyBands] = useState<number[]>([0, 0, 0, 0, 0]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastSpeakingTimeRef = useRef<number>(0);

  const isAudioActive =
    isEnabled &&
    (externalStream === undefined ||
      Boolean(externalStream && externalStream.getAudioTracks().length > 0));

  useEffect(() => {
    if (!isAudioActive) {
      return;
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    let isCancelled = false;

    const handleResume = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
    };
    window.addEventListener('click', handleResume);
    window.addEventListener('keydown', handleResume);

    let ownStreamCreated = false;

    const startAudioAnalysis = async () => {
      try {
        let stream: MediaStream;

        if (externalStream !== undefined) {
          if (!externalStream || externalStream.getAudioTracks().length === 0) {
            return;
          }
          stream = externalStream;
          ownStreamCreated = false;
        } else {
          const constraints: MediaStreamConstraints = {
            audio:
              deviceId && deviceId !== 'default'
                ? { deviceId: { exact: deviceId } }
                : true,
          };

          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } catch {
            // Fallback to default microphone if specified device constraints fail
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          ownStreamCreated = true;
        }

        if (isCancelled) {
          if (ownStreamCreated) {
            stream.getTracks().forEach((t) => {
              try {
                t.stop();
              } catch {}
            });
          }
          return;
        }

        streamRef.current = stream;

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;

        if (audioCtx.state === 'suspended') {
          void audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // 32 frequency bins, lightweight and fast
        analyser.smoothingTimeConstant = 0.35;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const processAudio = () => {
          if (isCancelled) return;

          analyser.getByteFrequencyData(dataArray);

          // Calculate average volume focusing on the speech frequency range (bins 1 to 16)
          let speechSum = 0;
          for (let i = 1; i <= 16; i++) {
            speechSum += dataArray[i];
          }
          const speechAvg = speechSum / 16;
          // Normalize to 0-100 (speech threshold ~4-5)
          const normalizedVol = Math.min(100, Math.round((speechAvg / 90) * 100));

          // Compute 5 frequency bands: bass, low-mid, mid, upper-mid, treble
          const b0 = Math.min(100, Math.round(((dataArray[1] + dataArray[2]) / 2 / 120) * 100));
          const b1 = Math.min(100, Math.round(((dataArray[3] + dataArray[4]) / 2 / 110) * 100));
          const b2 = Math.min(100, Math.round(((dataArray[5] + dataArray[6] + dataArray[7]) / 3 / 100) * 100));
          const b3 = Math.min(100, Math.round(((dataArray[8] + dataArray[9] + dataArray[10]) / 3 / 90) * 100));
          const b4 = Math.min(100, Math.round(((dataArray[11] + dataArray[12] + dataArray[13]) / 3 / 80) * 100));

          const speakingNow = normalizedVol > 4;
          const now = Date.now();

          if (speakingNow) {
            lastSpeakingTimeRef.current = now;
            setIsSpeaking(true);
          } else if (now - lastSpeakingTimeRef.current > 350) {
            setIsSpeaking(false);
          }

          setVolume(normalizedVol);
          setFrequencyBands([b0, b1, b2, b3, b4]);

          animFrameRef.current = requestAnimationFrame(processAudio);
        };

        animFrameRef.current = requestAnimationFrame(processAudio);
      } catch (err) {
        console.warn('Live audio analysis could not be started:', err);
        setVolume(0);
        setIsSpeaking(false);
        setFrequencyBands([0, 0, 0, 0, 0]);
      }
    };

    void startAudioAnalysis();

    return () => {
      isCancelled = true;
      window.removeEventListener('click', handleResume);
      window.removeEventListener('keydown', handleResume);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      if (streamRef.current && ownStreamCreated) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        streamRef.current = null;
      }
      setVolume(0);
      setIsSpeaking(false);
      setFrequencyBands([0, 0, 0, 0, 0]);
    };
  }, [isAudioActive, deviceId, externalStream]);

  return {
    volume: isAudioActive ? volume : 0,
    isSpeaking: isAudioActive ? isSpeaking : false,
    frequencyBands: isAudioActive ? frequencyBands : [0, 0, 0, 0, 0],
  };
}
