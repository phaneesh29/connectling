'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEYS = {
  AUDIO_INPUT: 'connectling_audio_input_id',
  AUDIO_OUTPUT: 'connectling_audio_output_id',
  VIDEO_INPUT: 'connectling_video_input_id',
};

export interface UseMediaDevicesReturn {
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  selectedVideoInputId: string;
  setSelectedAudioInputId: (deviceId: string) => void;
  setSelectedAudioOutputId: (deviceId: string) => void;
  setSelectedVideoInputId: (deviceId: string) => void;
  refreshDevices: () => Promise<void>;
  requestPermissions: (audio?: boolean, video?: boolean) => Promise<boolean>;
  testSpeaker: () => void;
  testingSpeaker: boolean;
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);

  const [selectedAudioInputId, setSelectedAudioInputIdState] = useState<string>('default');
  const [selectedAudioOutputId, setSelectedAudioOutputIdState] = useState<string>('default');
  const [selectedVideoInputId, setSelectedVideoInputIdState] = useState<string>('default');
  const [testingSpeaker, setTestingSpeaker] = useState(false);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedMic = localStorage.getItem(STORAGE_KEYS.AUDIO_INPUT);
      if (savedMic) setSelectedAudioInputIdState(savedMic);

      const savedSpeaker = localStorage.getItem(STORAGE_KEYS.AUDIO_OUTPUT);
      if (savedSpeaker) setSelectedAudioOutputIdState(savedSpeaker);

      const savedCam = localStorage.getItem(STORAGE_KEYS.VIDEO_INPUT);
      if (savedCam) setSelectedVideoInputIdState(savedCam);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setSelectedAudioInputId = useCallback((id: string) => {
    setSelectedAudioInputIdState(id);
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIO_INPUT, id);
    } catch {
      // Ignored
    }
  }, []);

  const setSelectedAudioOutputId = useCallback((id: string) => {
    setSelectedAudioOutputIdState(id);
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIO_OUTPUT, id);
    } catch {
      // Ignored
    }
  }, []);

  const setSelectedVideoInputId = useCallback((id: string) => {
    setSelectedVideoInputIdState(id);
    try {
      localStorage.setItem(STORAGE_KEYS.VIDEO_INPUT, id);
    } catch {
      // Ignored
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const aInputs: MediaDeviceInfo[] = [];
      const aOutputs: MediaDeviceInfo[] = [];
      const vInputs: MediaDeviceInfo[] = [];

      devices.forEach((d) => {
        if (d.kind === 'audioinput') aInputs.push(d);
        else if (d.kind === 'audiooutput') aOutputs.push(d);
        else if (d.kind === 'videoinput') vInputs.push(d);
      });

      setAudioInputs(aInputs);
      setAudioOutputs(aOutputs);
      setVideoInputs(vInputs);

      // Verify selected IDs still exist
      if (aInputs.length > 0 && !aInputs.some((d) => d.deviceId === selectedAudioInputId)) {
        setSelectedAudioInputIdState(aInputs[0].deviceId || 'default');
      }
      if (aOutputs.length > 0 && !aOutputs.some((d) => d.deviceId === selectedAudioOutputId)) {
        setSelectedAudioOutputIdState(aOutputs[0].deviceId || 'default');
      }
      if (vInputs.length > 0 && !vInputs.some((d) => d.deviceId === selectedVideoInputId)) {
        setSelectedVideoInputIdState(vInputs[0].deviceId || 'default');
      }
    } catch (err) {
      console.warn('Unable to enumerate media devices:', err);
    }
  }, [selectedAudioInputId, selectedAudioOutputId, selectedVideoInputId]);

  const requestPermissions = useCallback(
    async (audio = true, video = true): Promise<boolean> => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
        // Stop the temporary stream tracks immediately after getting permission
        stream.getTracks().forEach((track) => track.stop());
        await refreshDevices();
        return true;
      } catch (err) {
        console.warn('User dismissed or blocked media permissions:', err);
        return false;
      }
    },
    [refreshDevices]
  );

  useEffect(() => {
    void refreshDevices();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      const handleDeviceChange = () => {
        void refreshDevices();
      };
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [refreshDevices]);

  // Test speaker using Web Audio API chime
  const testSpeaker = useCallback(() => {
    if (testingSpeaker || typeof window === 'undefined') return;
    setTestingSpeaker(true);

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      // If setSinkId is supported on AudioContext
      if (selectedAudioOutputId && selectedAudioOutputId !== 'default' && 'setSinkId' in ctx) {
        void (ctx as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(selectedAudioOutputId);
      }

      const now = ctx.currentTime;

      // First pleasant chime tone (523.25 Hz - C5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Second pleasant chime tone (659.25 Hz - E5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.15);
      gain2.gain.setValueAtTime(0.18, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);

      // Third pleasant chime tone (783.99 Hz - G5)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(783.99, now + 0.3);
      gain3.gain.setValueAtTime(0.2, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 0.8);

      setTimeout(() => {
        void ctx.close();
        setTestingSpeaker(false);
      }, 1000);
    } catch {
      setTestingSpeaker(false);
    }
  }, [selectedAudioOutputId, testingSpeaker]);

  return {
    audioInputs,
    audioOutputs,
    videoInputs,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    refreshDevices,
    requestPermissions,
    testSpeaker,
    testingSpeaker,
  };
}
