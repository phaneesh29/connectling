'use client';

import React, { useRef, useEffect } from 'react';
import {
  MicIcon,
  VideoIcon,
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
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 sm:w-80 max-w-[calc(100vw-24px)] bg-[#0a0a0c] border border-white/[0.12] rounded-2xl p-4 shadow-2xl text-[#fcfdff] z-50 backdrop-blur-xl animate-in zoom-in-95 fade-in duration-150 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-16 blur-2xl pointer-events-none opacity-20 bg-[#ff7a1a]" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.06] relative z-10">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#888e90]">
          {type === 'audio' ? 'Audio Settings' : 'Video Settings'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#888e90] hover:text-[#fcfdff] p-1 rounded-md hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <XIcon size={13} />
        </button>
      </div>

      {type === 'audio' && (
        <div className="space-y-4 relative z-10">
          {/* Microphones */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#fcfdff]">
                <MicIcon size={12} className="text-[#ff7a1a]" />
                <span>Microphone</span>
              </div>
              <span className="text-[10px] font-mono text-[#888e90]">
                {audioInputs.length} found
              </span>
            </div>

            {!hasAudioPermissions && onRequestPermissions && (
              <button
                type="button"
                onClick={() => void onRequestPermissions()}
                className="w-full text-left px-2.5 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-medium transition-colors mb-2 cursor-pointer"
              >
                Click to grant microphone permissions
              </button>
            )}

            <div className="space-y-0.5 max-h-36 overflow-y-auto no-scrollbar">
              {audioInputs.length === 0 ? (
                <p className="text-[11px] text-[#888e90] italic px-2 py-1">
                  No microphones found
                </p>
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
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.08] text-[#fcfdff] font-medium'
                          : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="truncate pr-2">{label}</span>
                      {isSelected && (
                        <CheckIcon size={13} className="text-[#11ff99] shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Speakers / Output (if supported) */}
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#fcfdff]">
                <HeadphonesIcon size={12} className="text-[#ff7a1a]" />
                <span>Speakers</span>
              </div>
              <span className="text-[10px] font-mono text-[#888e90]">
                {audioOutputs.length > 0 ? `${audioOutputs.length} found` : 'System default'}
              </span>
            </div>

            <div className="space-y-0.5 max-h-32 overflow-y-auto no-scrollbar">
              {audioOutputs.length === 0 ? (
                <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-xs text-[#888e90] flex items-center justify-between">
                  <span>Default System Output</span>
                  <CheckIcon size={13} className="text-[#11ff99]" />
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
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.08] text-[#fcfdff] font-medium'
                          : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="truncate pr-2">{label}</span>
                      {isSelected && (
                        <CheckIcon size={13} className="text-[#11ff99] shrink-0" />
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
                className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.06] text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {testingSpeaker ? (
                  <>
                    <div className="animate-spin h-3 w-3 border border-[#11ff99]/30 border-t-[#11ff99] rounded-full" />
                    <span className="text-[#11ff99]">Playing test chime...</span>
                  </>
                ) : (
                  <>
                    <Volume2Icon size={12} />
                    <span>Test Speakers</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {type === 'video' && (
        <div className="space-y-3 relative z-10">
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#fcfdff]">
                <VideoIcon size={12} className="text-[#ff7a1a]" />
                <span>Camera</span>
              </div>
              <span className="text-[10px] font-mono text-[#888e90]">
                {videoInputs.length} found
              </span>
            </div>

            {!hasVideoPermissions && onRequestPermissions && (
              <button
                type="button"
                onClick={() => void onRequestPermissions()}
                className="w-full text-left px-2.5 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-medium transition-colors mb-2 cursor-pointer"
              >
                Click to grant camera permissions
              </button>
            )}

            <div className="space-y-0.5 max-h-48 overflow-y-auto no-scrollbar">
              {videoInputs.length === 0 ? (
                <p className="text-[11px] text-[#888e90] italic px-2 py-1">
                  No cameras found
                </p>
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
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-white/[0.08] text-[#fcfdff] font-medium'
                          : 'text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="truncate pr-2">{label}</span>
                      {isSelected && (
                        <CheckIcon size={13} className="text-[#11ff99] shrink-0" />
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
