'use client';

import React, { useRef, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};
import {
  MicIcon,
  CameraIcon,
  HeadphonesIcon,
  CheckIcon,
  Volume2Icon,
  XIcon,
  PlayIcon,
} from '@animateicons/react/lucide';

export interface MediaDeviceMenuProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'audio' | 'video';
  audioInputs?: MediaDeviceInfo[];
  audioOutputs?: MediaDeviceInfo[];
  videoInputs?: MediaDeviceInfo[];
  selectedAudioInputId?: string;
  selectedAudioOutputId?: string;
  selectedVideoInputId?: string;
  onSelectAudioInput?: (id: string) => void;
  onSelectAudioOutput?: (id: string) => void;
  onSelectVideoInput?: (id: string) => void;
  onRequestPermissions?: () => Promise<boolean>;
  onTestSpeaker?: () => void;
  testingSpeaker?: boolean;
  onTestMic?: () => void;
  testingMicStatus?: 'idle' | 'recording' | 'playing' | 'done';
  micVolume?: number;
}

export function MediaDeviceMenu({
  isOpen,
  onClose,
  type,
  audioInputs = [],
  audioOutputs = [],
  videoInputs = [],
  selectedAudioInputId = 'default',
  selectedAudioOutputId = 'default',
  selectedVideoInputId = 'default',
  onSelectAudioInput,
  onSelectAudioOutput,
  onSelectVideoInput,
  onRequestPermissions,
  onTestSpeaker,
  testingSpeaker = false,
  onTestMic,
  testingMicStatus = 'idle',
  micVolume = 0,
}: MediaDeviceMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [coords, setCoords] = useState<{ left: number; bottom: number; maxHeight: number } | null>(null);

  // Position calculation: use floating popover on desktop if room permits, otherwise centered modal
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (typeof window === 'undefined') return;

      // On mobile / tablet screens (< 768px), always use the centered modal
      if (window.innerWidth < 768) {
        setCoords(null);
        return;
      }

      const toggle = document.querySelector(`[data-media-menu-toggle="${type}"]`);
      if (!toggle) {
        setCoords(null);
        return;
      }

      const rect = toggle.getBoundingClientRect();
      const menuWidth = 390;
      const targetCenterX = rect.left + rect.width / 2;
      const left = Math.max(16, Math.min(window.innerWidth - menuWidth - 16, targetCenterX - menuWidth / 2));
      const bottom = Math.max(16, window.innerHeight - rect.top + 10);

      // Verify there is enough room above the button
      const availableHeightAbove = rect.top - 16;
      if (availableHeightAbove < 260) {
        // Fall back to centered modal if button is too close to top
        setCoords(null);
        return;
      }

      const maxHeight = Math.min(540, availableHeightAbove);
      setCoords({ left, bottom, maxHeight });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, type]);

  // Lock body scroll on mobile while modal is open
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        if (
          typeof target.closest === 'function' &&
          target.closest(`[data-media-menu-toggle="${type}"]`)
        ) {
          return;
        }
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, type]);

  // Live mic monitoring for real-time LED equalizer testing when menu is open
  const [liveVolume, setLiveVolume] = useState<number>(0);

  useEffect(() => {
    // Only monitor audio input when audio menu is actively open and not doing recording/playback test
    if (!isOpen || type !== 'audio' || testingMicStatus === 'recording' || testingMicStatus === 'playing') {
      setLiveVolume(0);
      return;
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    let isCancelled = false;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let animFrame: number | null = null;

    const handleResume = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        void audioCtx.resume();
      }
    };
    window.addEventListener('click', handleResume);
    window.addEventListener('keydown', handleResume);

    const startMonitor = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio:
            selectedAudioInputId && selectedAudioInputId !== 'default'
              ? { deviceId: { exact: selectedAudioInputId } }
              : true,
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // Fallback to default microphone if deviceId exact match fails
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
          return;
        }

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioCtx();

        if (audioCtx.state === 'suspended') {
          void audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.35;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkLiveVolume = () => {
          if (isCancelled) return;
          analyser.getByteFrequencyData(dataArray);

          // Focus on voice speech frequency bins (1 to 24)
          let sum = 0;
          const count = Math.min(24, dataArray.length);
          for (let i = 1; i < count; i++) {
            sum += dataArray[i];
          }
          const avg = sum / (count - 1);
          // Scale so normal speech (avg ~10-60) displays nicely between 15% and 85%
          const normalized = Math.min(100, Math.round((avg / 75) * 100));

          setLiveVolume(normalized);
          animFrame = requestAnimationFrame(checkLiveVolume);
        };

        animFrame = requestAnimationFrame(checkLiveVolume);
      } catch (err) {
        console.warn('Live mic monitor could not start:', err);
        if (!isCancelled) {
          setLiveVolume(0);
        }
      }
    };

    void startMonitor();

    return () => {
      isCancelled = true;
      window.removeEventListener('click', handleResume);
      window.removeEventListener('keydown', handleResume);
      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        void audioCtx.close().catch(() => {});
        audioCtx = null;
      }
      if (stream) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        stream = null;
      }
      setLiveVolume(0);
    };
  }, [isOpen, type, selectedAudioInputId, testingMicStatus]);

  if (!isOpen || !mounted) return null;

  const hasAudioPermissions = audioInputs.some((d) => Boolean(d.label));
  const hasVideoPermissions = videoInputs.some((d) => Boolean(d.label));

  // LED equalizer calculations for microphone activity (22 segments)
  const currentMicVolume =
    testingMicStatus === 'recording' ? micVolume : Math.max(micVolume, liveVolume);
  const totalBars = 22;
  const activeBarsCount = Math.round(
    (Math.max(0, Math.min(100, currentMicVolume)) / 100) * totalBars
  );

  const menuContent = (
    <>
      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-16 blur-2xl pointer-events-none opacity-25 bg-gradient-brand-r" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-[#FF9933]/15 border border-[#FF9933]/30 flex items-center justify-center text-[#FF9933] shrink-0 shadow-[0_0_12px_rgba(255,153,51,0.15)]">
            {type === 'audio' ? <MicIcon size={14} /> : <CameraIcon size={14} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[13px] font-semibold text-[#fcfdff] tracking-tight leading-tight">
              {type === 'audio' ? 'Audio Devices & Test' : 'Camera Settings'}
            </h3>
            <p className="text-[10px] text-[#888e90] truncate leading-normal">
              {type === 'audio'
                ? 'Select inputs, test mic & speaker output'
                : 'Select camera input device'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-[#888e90] hover:text-[#fcfdff] p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
          title="Close"
        >
          <XIcon size={14} />
        </button>
      </div>

      {type === 'audio' && (
        <div className="space-y-4 relative z-10">
          {/* 1. Microphone Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#fcfdff]">
                <MicIcon size={12} className="text-[#FF9933]" />
                <span>Microphone</span>
              </div>
              <span className="text-[10px] font-mono text-[#888e90] bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                {audioInputs.length > 0 ? `${audioInputs.length} detected` : 'System Default'}
              </span>
            </div>

            {/* Permission Prompt Banner */}
            {!hasAudioPermissions && onRequestPermissions && (
              <button
                type="button"
                onClick={() => void onRequestPermissions()}
                className="w-full text-left p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/25 text-orange-400 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping shrink-0" />
                  <span className="text-[11px]">Grant permission to see microphone labels</span>
                </div>
                <span className="text-[10px] font-mono bg-orange-500/20 px-2 py-0.5 rounded text-orange-300 shrink-0">
                  Allow
                </span>
              </button>
            )}

            {/* Device List */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar pr-0.5">
              {audioInputs.length === 0 ? (
                <div className="p-3 text-center bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <p className="text-xs text-[#888e90]">No microphones detected</p>
                </div>
              ) : (
                audioInputs.map((device, idx) => {
                  const isSelected =
                    device.deviceId === selectedAudioInputId ||
                    (selectedAudioInputId === 'default' && idx === 0);
                  const label =
                    device.label || `Microphone ${idx + 1} (${device.deviceId.slice(0, 5)})`;

                  return (
                    <button
                      key={device.deviceId || idx}
                      type="button"
                      onClick={() => onSelectAudioInput?.(device.deviceId)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#FF9933]/15 to-white/[0.03] text-[#fcfdff] border border-[#FF9933]/40 shadow-[0_0_15px_rgba(255,153,51,0.10)]'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.04] hover:border-white/[0.10]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#FF9933]/20 text-[#FF9933]'
                              : 'bg-white/[0.04] text-[#888e90] group-hover:text-[#fcfdff]'
                          }`}
                        >
                          <MicIcon size={12} />
                        </div>
                        <span className={`truncate ${isSelected ? 'font-medium text-[#fcfdff]' : ''}`}>
                          {label}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#11ff99]/15 border border-[#11ff99]/30 text-[#11ff99] text-[10px] font-mono shrink-0 shadow-[0_0_8px_rgba(17,255,153,0.25)]">
                          <CheckIcon size={10} />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-white/[0.18] group-hover:border-[#FF9933]/50 shrink-0 transition-colors" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Interactive Mic Test & Live Equalizer Visualizer */}
            {onTestMic && (
              <div className="p-3 rounded-xl bg-[#08080c] border border-white/[0.08] space-y-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[#888e90]">Mic Test</span>
                    {testingMicStatus === 'recording' ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#f87171]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#f87171] animate-ping" />
                        Recording 3s...
                      </span>
                    ) : testingMicStatus === 'playing' ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#ffc53d]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
                        Playing voice
                      </span>
                    ) : testingMicStatus === 'done' ? (
                      <span className="text-[10px] font-mono text-[#11ff99] flex items-center gap-1">
                        <CheckIcon size={11} /> Verified clear
                      </span>
                    ) : currentMicVolume > 5 ? (
                      <span className="text-[10px] font-mono text-[#11ff99] flex items-center gap-1 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#11ff99] animate-pulse" />
                        Voice Detected
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#62666a]">Speak to test</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onTestMic}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      testingMicStatus === 'recording'
                        ? 'bg-red-500/20 text-[#f87171] border border-red-500/40 animate-pulse shadow-[0_0_12px_rgba(248,113,113,0.25)]'
                        : testingMicStatus === 'playing'
                        ? 'bg-amber-500/20 text-[#ffc53d] border border-amber-500/40 shadow-[0_0_12px_rgba(255,197,61,0.25)]'
                        : testingMicStatus === 'done'
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-[#11ff99] border border-emerald-500/30'
                        : 'bg-white/[0.05] hover:bg-[#FF9933]/20 text-[#888e90] hover:text-[#FF9933] border border-white/[0.08] hover:border-[#FF9933]/30'
                    }`}
                  >
                    <MicIcon size={11} />
                    <span>
                      {testingMicStatus === 'recording'
                        ? 'Stop'
                        : testingMicStatus === 'playing'
                        ? 'Listening...'
                        : testingMicStatus === 'done'
                        ? 'Re-test'
                        : 'Test Mic'}
                    </span>
                  </button>
                </div>

                {/* 22-Segment LED Equalizer Bar */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 h-3.5 px-2 bg-black/40 rounded-lg border border-white/[0.06] justify-between">
                    {Array.from({ length: totalBars }).map((_, i) => {
                      const isActive = i < activeBarsCount;
                      const isPeak = i >= totalBars - 3;
                      const isMid = i >= totalBars - 8 && !isPeak;

                      let barColor = 'bg-white/[0.08]';
                      if (isActive) {
                        if (isPeak) barColor = 'bg-[#f87171] shadow-[0_0_6px_rgba(248,113,113,0.7)]';
                        else if (isMid) barColor = 'bg-[#FF9933] shadow-[0_0_6px_rgba(255,153,51,0.6)]';
                        else barColor = 'bg-[#11ff99] shadow-[0_0_6px_rgba(17,255,153,0.6)]';
                      }

                      return (
                        <div
                          key={i}
                          className={`flex-1 h-2 rounded-[1.5px] transition-all duration-75 ${barColor}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-[#585c60] px-1">
                    <span>Input Level</span>
                    <span>{currentMicVolume}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Speaker Output Section */}
          <div className="pt-3 border-t border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#fcfdff]">
                <HeadphonesIcon size={12} className="text-[#FF9933]" />
                <span>Speakers & Headphones</span>
              </div>
              <span className="text-[10px] font-mono text-[#888e90] bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                {audioOutputs.length > 0 ? `${audioOutputs.length} detected` : 'System Default'}
              </span>
            </div>

            {/* Output Device List */}
            <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar pr-0.5">
              {audioOutputs.length === 0 ? (
                <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-[#888e90] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-white/[0.04] text-[#888e90] flex items-center justify-center">
                      <HeadphonesIcon size={12} />
                    </div>
                    <span>Default System Output</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#11ff99]/15 border border-[#11ff99]/30 text-[#11ff99] text-[10px] font-mono">
                    <CheckIcon size={10} />
                    <span>Active</span>
                  </div>
                </div>
              ) : (
                audioOutputs.map((device, idx) => {
                  const isSelected =
                    device.deviceId === selectedAudioOutputId ||
                    (selectedAudioOutputId === 'default' && idx === 0);
                  const label =
                    device.label || `Speaker ${idx + 1} (${device.deviceId.slice(0, 5)})`;

                  return (
                    <button
                      key={device.deviceId || idx}
                      type="button"
                      onClick={() => onSelectAudioOutput?.(device.deviceId)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#FF9933]/15 to-white/[0.03] text-[#fcfdff] border border-[#FF9933]/40 shadow-[0_0_15px_rgba(255,153,51,0.10)]'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.04] hover:border-white/[0.10]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#FF9933]/20 text-[#FF9933]'
                              : 'bg-white/[0.04] text-[#888e90] group-hover:text-[#fcfdff]'
                          }`}
                        >
                          <HeadphonesIcon size={12} />
                        </div>
                        <span className={`truncate ${isSelected ? 'font-medium text-[#fcfdff]' : ''}`}>
                          {label}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#11ff99]/15 border border-[#11ff99]/30 text-[#11ff99] text-[10px] font-mono shrink-0 shadow-[0_0_8px_rgba(17,255,153,0.25)]">
                          <CheckIcon size={10} />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-white/[0.18] group-hover:border-[#FF9933]/50 shrink-0 transition-colors" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Test Speakers Card */}
            {onTestSpeaker && (
              <div className="p-2.5 rounded-xl bg-[#08080c] border border-white/[0.08] flex items-center justify-between gap-3 mt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      testingSpeaker
                        ? 'bg-emerald-500/20 text-[#11ff99] border border-emerald-500/40 shadow-[0_0_12px_rgba(17,255,153,0.3)]'
                        : 'bg-white/[0.04] text-[#888e90]'
                    }`}
                  >
                    <Volume2Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-[#fcfdff] block leading-tight">
                      Speaker Sound Test
                    </span>
                    <span className="text-[10px] text-[#888e90] truncate block leading-normal">
                      {testingSpeaker ? 'Playing 3-tone chime...' : 'Play pleasant test chime'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onTestSpeaker}
                  disabled={testingSpeaker}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    testingSpeaker
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-[#11ff99] shadow-[0_0_12px_rgba(17,255,153,0.25)]'
                      : 'bg-white/[0.05] hover:bg-[#FF9933]/20 text-[#888e90] hover:text-[#FF9933] border border-white/[0.08] hover:border-[#FF9933]/30'
                  }`}
                >
                  {testingSpeaker ? (
                    <div className="flex items-end gap-0.5 h-3 w-3.5 pb-0.5">
                      <span className="w-1 bg-[#11ff99] rounded-full animate-bounce [animation-delay:-0.3s] h-2.5" />
                      <span className="w-1 bg-[#11ff99] rounded-full animate-bounce [animation-delay:-0.15s] h-1.5" />
                      <span className="w-1 bg-[#11ff99] rounded-full animate-bounce h-3" />
                    </div>
                  ) : (
                    <PlayIcon size={11} />
                  )}
                  <span>{testingSpeaker ? 'Playing' : 'Play Chime'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {type === 'video' && (
        <div className="space-y-3 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#fcfdff]">
                <CameraIcon size={12} className="text-[#FF9933]" />
                <span>Camera Device</span>
              </div>
              <span className="text-[10px] font-mono text-[#888e90] bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                {videoInputs.length} detected
              </span>
            </div>

            {!hasVideoPermissions && onRequestPermissions && (
              <button
                type="button"
                onClick={() => void onRequestPermissions()}
                className="w-full text-left p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/25 text-orange-400 text-xs font-medium transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping shrink-0" />
                  <span className="text-[11px]">Grant permission to see camera labels</span>
                </div>
                <span className="text-[10px] font-mono bg-orange-500/20 px-2 py-0.5 rounded text-orange-300 shrink-0">
                  Allow
                </span>
              </button>
            )}

            <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
              {videoInputs.length === 0 ? (
                <div className="p-3 text-center bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <p className="text-xs text-[#888e90]">No cameras detected</p>
                </div>
              ) : (
                videoInputs.map((device, idx) => {
                  const isSelected =
                    device.deviceId === selectedVideoInputId ||
                    (selectedVideoInputId === 'default' && idx === 0);
                  const label =
                    device.label || `Camera ${idx + 1} (${device.deviceId.slice(0, 5)})`;

                  return (
                    <button
                      key={device.deviceId || idx}
                      type="button"
                      onClick={() => onSelectVideoInput?.(device.deviceId)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#FF9933]/15 to-white/[0.03] text-[#fcfdff] border border-[#FF9933]/40 shadow-[0_0_15px_rgba(255,153,51,0.10)]'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.04] hover:border-white/[0.10]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#FF9933]/20 text-[#FF9933]'
                              : 'bg-white/[0.04] text-[#888e90] group-hover:text-[#fcfdff]'
                          }`}
                        >
                          <CameraIcon size={12} />
                        </div>
                        <span className={`truncate ${isSelected ? 'font-medium text-[#fcfdff]' : ''}`}>
                          {label}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#11ff99]/15 border border-[#11ff99]/30 text-[#11ff99] text-[10px] font-mono shrink-0 shadow-[0_0_8px_rgba(17,255,153,0.25)]">
                          <CheckIcon size={10} />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-white/[0.18] group-hover:border-[#FF9933]/50 shrink-0 transition-colors" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Desktop anchored popover: when space permits on desktop
  if (coords !== null) {
    return createPortal(
      <>
        <div
          className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px] transition-opacity"
          onClick={onClose}
        />
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: `${coords.left}px`,
            bottom: `${coords.bottom}px`,
            width: '390px',
            maxHeight: `${coords.maxHeight}px`,
            zIndex: 9999,
          }}
          className="max-w-[calc(100vw-32px)] overflow-y-auto no-scrollbar bg-[#0b0b10]/98 border border-white/[0.14] rounded-2xl p-4 sm:p-4.5 shadow-[0_28px_80px_-10px_rgba(0,0,0,0.95),0_0_50px_rgba(255,153,51,0.07)] text-[#fcfdff] backdrop-blur-2xl animate-device-menu-in ring-1 ring-white/10 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {menuContent}
        </div>
      </>,
      document.body
    );
  }

  // Mobile / Fallback: Centered Modal Dialog with backdrop
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={menuRef}
        className="w-full max-w-[400px] max-h-[88vh] overflow-y-auto no-scrollbar bg-[#0b0b10] border border-white/[0.14] rounded-2xl p-4 sm:p-5 shadow-[0_25px_80px_rgba(0,0,0,0.98),0_0_40px_rgba(255,153,51,0.08)] text-[#fcfdff] backdrop-blur-2xl relative animate-in zoom-in-95 duration-150 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {menuContent}
      </div>
    </div>,
    document.body
  );
}
