'use client';

import React, { useRef, useEffect } from 'react';
import {
  MicIcon,
  VideoIcon,
  CameraIcon,
  HeadphonesIcon,
  CheckIcon,
  Volume2Icon,
  XIcon,
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
}: MediaDeviceMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        // Ignore clicks/taps on the toggle button for this menu type
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

  if (!isOpen) return null;

  const hasAudioPermissions = audioInputs.some((d) => Boolean(d.label));
  const hasVideoPermissions = videoInputs.some((d) => Boolean(d.label));

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-80 sm:w-84 max-w-[calc(100vw-24px)] max-h-[min(520px,calc(100vh-110px))] overflow-y-auto no-scrollbar bg-[#0c0c10]/95 border border-white/[0.14] rounded-2xl p-4 shadow-[0_25px_70px_-10px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.06)] text-[#fcfdff] z-50 backdrop-blur-2xl animate-in zoom-in-95 fade-in slide-in-from-bottom-2 duration-150 ring-1 ring-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-16 blur-2xl pointer-events-none opacity-25 bg-gradient-to-r from-[#ff7a1a] via-[#f59e0b] to-[#ea580c]" />

      {/* Bottom Notch Anchor directly over Up-Arrow */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0c0c10] border-r border-b border-white/[0.14] rotate-45 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#ff7a1a]">
            {type === 'audio' ? <MicIcon size={13} /> : <CameraIcon size={13} />}
          </div>
          <div>
            <span className="text-xs font-semibold tracking-tight text-[#fcfdff] block leading-none">
              {type === 'audio' ? 'Audio Devices' : 'Video Devices'}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#888e90]">
              Hardware Setup
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#888e90] hover:text-[#fcfdff] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Close"
        >
          <XIcon size={13} />
        </button>
      </div>

      {type === 'audio' && (
        <div className="space-y-4 relative z-10">
          {/* Microphones Section */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#fcfdff]">
                <MicIcon size={13} className="text-[#ff7a1a]" />
                <span>Microphone</span>
              </div>
              <span className="text-[10px] font-mono text-[#888e90] bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 rounded-full">
                {audioInputs.length} detected
              </span>
            </div>

            {!hasAudioPermissions && onRequestPermissions && (
              <button
                type="button"
                onClick={() => void onRequestPermissions()}
                className="w-full text-left px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/25 text-orange-400 text-xs font-medium transition-colors mb-2 cursor-pointer flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping" />
                <span>Grant microphone permission to see labels</span>
              </button>
            )}

            <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
              {audioInputs.length === 0 ? (
                <div className="p-3 text-center bg-white/[0.02] border border-white/[0.04] rounded-xl">
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
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-white/[0.08] text-[#fcfdff] border border-white/[0.12] shadow-sm'
                          : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-orange-500/15 text-[#ff7a1a]'
                              : 'bg-white/[0.04] text-[#888e90] group-hover:text-[#fcfdff]'
                          }`}
                        >
                          <MicIcon size={12} />
                        </div>
                        <span className="truncate font-medium">{label}</span>
                      </div>
                      {isSelected ? (
                        <div className="h-4 w-4 rounded-full bg-[#11ff99]/15 border border-[#11ff99]/30 flex items-center justify-center text-[#11ff99] shrink-0 shadow-[0_0_8px_rgba(17,255,153,0.25)]">
                          <CheckIcon size={11} />
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-[#55595d] group-hover:text-[#888e90] shrink-0">
                          Select
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Speakers Section */}
          <div className="pt-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#fcfdff]">
                <HeadphonesIcon size={13} className="text-[#ff7a1a]" />
                <span>Speakers & Headphones</span>
              </div>
              <span className="text-[10px] font-mono text-[#888e90] bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 rounded-full">
                {audioOutputs.length > 0 ? `${audioOutputs.length} detected` : 'System Default'}
              </span>
            </div>

            <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
              {audioOutputs.length === 0 ? (
                <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-[#888e90] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-white/[0.04] text-[#888e90] flex items-center justify-center">
                      <HeadphonesIcon size={12} />
                    </div>
                    <span>Default System Output</span>
                  </div>
                  <div className="h-4 w-4 rounded-full bg-[#11ff99]/15 border border-[#11ff99]/30 flex items-center justify-center text-[#11ff99] shrink-0">
                    <CheckIcon size={11} />
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
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-white/[0.08] text-[#fcfdff] border border-white/[0.12] shadow-sm'
                          : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-orange-500/15 text-[#ff7a1a]'
                              : 'bg-white/[0.04] text-[#888e90] group-hover:text-[#fcfdff]'
                          }`}
                        >
                          <HeadphonesIcon size={12} />
                        </div>
                        <span className="truncate font-medium">{label}</span>
                      </div>
                      {isSelected ? (
                        <div className="h-4 w-4 rounded-full bg-[#11ff99]/15 border border-[#11ff99]/30 flex items-center justify-center text-[#11ff99] shrink-0 shadow-[0_0_8px_rgba(17,255,153,0.25)]">
                          <CheckIcon size={11} />
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-[#55595d] group-hover:text-[#888e90] shrink-0">
                          Select
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Test speaker button */}
            {onTestSpeaker && (
              <button
                type="button"
                onClick={onTestSpeaker}
                disabled={testingSpeaker}
                className={`mt-2.5 w-full py-2 px-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                  testingSpeaker
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-[#11ff99] shadow-[0_0_15px_rgba(17,255,153,0.15)]'
                    : 'bg-white/[0.03] hover:bg-orange-500/10 text-[#888e90] hover:text-[#ff7a1a] border-white/[0.08] hover:border-orange-500/30 group'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testingSpeaker ? (
                    <div className="flex items-end gap-0.5 h-3.5 w-4 pb-0.5">
                      <span className="w-1 bg-[#11ff99] rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                      <span className="w-1 bg-[#11ff99] rounded-full animate-bounce [animation-delay:-0.15s] h-2" />
                      <span className="w-1 bg-[#11ff99] rounded-full animate-bounce h-3.5" />
                    </div>
                  ) : (
                    <Volume2Icon
                      size={13}
                      className="text-[#888e90] group-hover:text-[#ff7a1a] transition-colors"
                    />
                  )}
                  <span
                    className={
                      testingSpeaker ? 'text-[#11ff99] font-medium' : 'text-[#fcfdff]'
                    }
                  >
                    {testingSpeaker ? 'Playing 3-tone chime...' : 'Test Speakers'}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                    testingSpeaker
                      ? 'bg-[#11ff99]/20 border-[#11ff99]/40 text-[#11ff99]'
                      : 'bg-white/[0.06] border-white/[0.08] text-[#888e90] group-hover:text-[#ff7a1a] group-hover:border-orange-500/30'
                  }`}
                >
                  {testingSpeaker ? 'Active' : 'Play Chime'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {type === 'video' && (
        <div className="space-y-3 relative z-10">
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#fcfdff]">
                <CameraIcon size={13} className="text-[#ff7a1a]" />
                <span>Camera</span>
              </div>
              <span className="text-[10px] font-mono text-[#888e90] bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 rounded-full">
                {videoInputs.length} detected
              </span>
            </div>

            {!hasVideoPermissions && onRequestPermissions && (
              <button
                type="button"
                onClick={() => void onRequestPermissions()}
                className="w-full text-left px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/25 text-orange-400 text-xs font-medium transition-colors mb-2 cursor-pointer flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping" />
                <span>Grant camera permission to see labels</span>
              </button>
            )}

            <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
              {videoInputs.length === 0 ? (
                <div className="p-3 text-center bg-white/[0.02] border border-white/[0.04] rounded-xl">
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
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-white/[0.08] text-[#fcfdff] border border-white/[0.12] shadow-sm'
                          : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-orange-500/15 text-[#ff7a1a]'
                              : 'bg-white/[0.04] text-[#888e90] group-hover:text-[#fcfdff]'
                          }`}
                        >
                          <CameraIcon size={12} />
                        </div>
                        <span className="truncate font-medium">{label}</span>
                      </div>
                      {isSelected ? (
                        <div className="h-4 w-4 rounded-full bg-[#11ff99]/15 border border-[#11ff99]/30 flex items-center justify-center text-[#11ff99] shrink-0 shadow-[0_0_8px_rgba(17,255,153,0.25)]">
                          <CheckIcon size={11} />
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-[#55595d] group-hover:text-[#888e90] shrink-0">
                          Select
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
