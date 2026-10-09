'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  CopyIcon,
  CheckIcon,
  UsersIcon,
  LockIcon,
  SettingsIcon,
  SparklesIcon,
} from '@animateicons/react/lucide';
import { VideoOff, MicOff as LucideMicOff } from 'lucide-react';
import { MediaDeviceMenu } from './media-device-menu';
import { useLocalAudioLevel } from '@/hooks/use-local-audio-level';
import type { useMediaDevices } from '@/hooks/use-media-devices';
import type { RoomData } from '@/lib/rooms-api';

export interface MeetPrejoinLobbyProps {
  room: RoomData;
  sessionUser?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  isMicOn: boolean;
  isVideoOn: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  mediaDevices: ReturnType<typeof useMediaDevices>;
  passcodeRequired: boolean;
  passcode: string;
  onPasscodeChange: (val: string) => void;
  onJoin: () => void;
  joining: boolean;
  error?: string | null;
}

export function MeetPrejoinLobby({
  room,
  sessionUser,
  isMicOn,
  isVideoOn,
  onToggleMic,
  onToggleVideo,
  mediaDevices,
  passcodeRequired,
  passcode,
  onPasscodeChange,
  onJoin,
  joining,
  error,
}: MeetPrejoinLobbyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Live microphone level visualizer in lobby
  const { volume, isSpeaking } = useLocalAudioLevel({
    isEnabled: isMicOn,
    deviceId: mediaDevices.selectedAudioInputId,
  });

  // Local camera preview acquisition
  useEffect(() => {
    let previewStream: MediaStream | null = null;
    let isCancelled = false;

    async function setupPreview() {
      if (!isVideoOn && !isMicOn) {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setStreamError(null);
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: isVideoOn
            ? mediaDevices.selectedVideoInputId
              ? { deviceId: { exact: mediaDevices.selectedVideoInputId }, width: { ideal: 1280 }, height: { ideal: 720 } }
              : { width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
          audio: isMicOn
            ? mediaDevices.selectedAudioInputId
              ? { deviceId: { exact: mediaDevices.selectedAudioInputId } }
              : true
            : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        previewStream = stream;
        setStreamError(null);

        if (videoRef.current && isVideoOn) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Preview media capture error:', err);
          setStreamError('Could not access selected camera or microphone');
        }
      }
    }

    void setupPreview();

    const currentVideoEl = videoRef.current;

    return () => {
      isCancelled = true;
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
      }
      if (currentVideoEl) {
        currentVideoEl.srcObject = null;
      }
    };
  }, [isVideoOn, isMicOn, mediaDevices.selectedVideoInputId, mediaDevices.selectedAudioInputId]);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeParticipants = room.activeParticipants || [];
  const participantsCount = room.activeParticipantsCount ?? activeParticipants.length;

  return (
    <div className="min-h-screen bg-black text-[#fcfdff] flex flex-col justify-between selection:bg-[#ff801f]/30">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-gradient-brand-br flex items-center justify-center font-bold text-black text-sm shadow-brand-glow">
            C
          </div>
          <span className="font-medium text-sm tracking-tight text-[#fcfdff] group-hover:text-white transition-colors">
            Connectling
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-xs font-mono text-[#888e90] bg-[#101012] px-3 py-1.5 rounded-lg border border-white/[0.08]">
            {room.code}
          </span>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs text-[#888e90] hover:text-[#fcfdff] bg-[#101012] hover:bg-[#18181c] px-3 py-1.5 rounded-lg border border-white/[0.08] transition-colors cursor-pointer"
            title="Copy meeting link"
          >
            {copied ? <CheckIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Column: Camera / Mic Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full aspect-video max-h-[460px] rounded-2xl bg-[#08080a] border border-white/[0.12] relative overflow-hidden flex items-center justify-center shadow-2xl">
              {/* Radial gradient background atmosphere */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.03] to-transparent pointer-events-none" />

              {/* Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                  isVideoOn ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              />

              {/* Avatar when Camera is Off */}
              {!isVideoOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-[#121216] border border-white/[0.16] overflow-hidden flex items-center justify-center shadow-2xl">
                      {sessionUser?.image ? (
                        <Image
                          src={sessionUser.image}
                          alt={sessionUser.name || 'User'}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-semibold text-[#fcfdff]">
                          {sessionUser?.name ? sessionUser.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      )}
                    </div>
                    {/* Pulsing subtle glow */}
                    <div className="absolute inset-0 rounded-full border border-[#ff801f]/30 animate-ping pointer-events-none opacity-20" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-[#888e90]">
                    <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Camera is off</span>
                  </div>
                </div>
              )}

              {/* Top Left Live Preview Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.10] text-[11px] font-medium text-[#fcfdff]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isVideoOn ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                    }`}
                  />
                  {isVideoOn ? 'Camera preview' : 'Video paused'}
                </span>
              </div>

              {/* Audio speaking indicator meter */}
              {isMicOn && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.10]">
                  <div
                    className={`h-2 w-2 rounded-full transition-colors ${
                      isSpeaking ? 'bg-emerald-400' : 'bg-[#888e90]'
                    }`}
                  />
                  <div className="flex items-center gap-0.5 h-3">
                    <div
                      className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, (volume / 100) * 12)}px` }}
                    />
                    <div
                      className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, ((volume * 0.8) / 100) * 12)}px` }}
                    />
                    <div
                      className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, ((volume * 0.6) / 100) * 12)}px` }}
                    />
                  </div>
                </div>
              )}

              {/* Floating Bottom Media Bar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/75 backdrop-blur-md border border-white/[0.14] shadow-2xl z-20">
                {/* Microphone Toggle */}
                <button
                  type="button"
                  onClick={onToggleMic}
                  className={`h-11 w-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isMicOn
                      ? 'bg-[#18181c] text-[#fcfdff] hover:bg-[#222228] border border-white/[0.14]'
                      : 'bg-[#ff2047] text-white hover:bg-[#e0193e] shadow-lg shadow-[#ff2047]/30'
                  }`}
                  title={isMicOn ? 'Turn off microphone' : 'Turn on microphone'}
                >
                  {isMicOn ? <MicIcon size={20} /> : <LucideMicOff className="w-5 h-5" />}
                </button>

                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={onToggleVideo}
                  className={`h-11 w-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isVideoOn
                      ? 'bg-[#18181c] text-[#fcfdff] hover:bg-[#222228] border border-white/[0.14]'
                      : 'bg-[#ff2047] text-white hover:bg-[#e0193e] shadow-lg shadow-[#ff2047]/30'
                  }`}
                  title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoOn ? <VideoIcon size={20} /> : <VideoOff className="w-5 h-5" />}
                </button>

                {/* Device Settings Menu Button */}
                <button
                  type="button"
                  data-media-menu-toggle="audio"
                  onClick={() => setDeviceMenuOpen(!deviceMenuOpen)}
                  className={`h-11 w-11 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                    deviceMenuOpen
                      ? 'bg-white text-black border-white'
                      : 'bg-[#18181c] text-[#888e90] hover:text-[#fcfdff] hover:bg-[#222228] border-white/[0.14]'
                  }`}
                  title="Audio & Video Device Settings"
                >
                  <SettingsIcon size={20} />
                </button>
              </div>
            </div>

            {streamError && (
              <p className="mt-2 text-xs text-rose-400 text-center">{streamError}</p>
            )}

            {/* Device Menu Modal / Popover */}
            <MediaDeviceMenu
              isOpen={deviceMenuOpen}
              onClose={() => setDeviceMenuOpen(false)}
              type="audio"
              audioInputs={mediaDevices.audioInputs}
              audioOutputs={mediaDevices.audioOutputs}
              videoInputs={mediaDevices.videoInputs}
              selectedAudioInputId={mediaDevices.selectedAudioInputId}
              selectedAudioOutputId={mediaDevices.selectedAudioOutputId}
              selectedVideoInputId={mediaDevices.selectedVideoInputId}
              onSelectAudioInput={mediaDevices.setSelectedAudioInputId}
              onSelectAudioOutput={mediaDevices.setSelectedAudioOutputId}
              onSelectVideoInput={mediaDevices.setSelectedVideoInputId}
              onTestSpeaker={mediaDevices.testSpeaker}
              testingSpeaker={mediaDevices.testingSpeaker}
              onTestMic={mediaDevices.testMic}
              testingMicStatus={mediaDevices.testingMicStatus}
              micVolume={mediaDevices.micVolume || volume}
            />
          </div>

          {/* Right Column: Room Details & Join Action Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-[#0a0a0c] border border-white/[0.12] rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              {/* Subtle Atmospheric Top Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-brand-br opacity-15 blur-3xl pointer-events-none" />

              <div className="space-y-6 relative z-10">
                {/* Title & Status */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF9933]/10 border border-[#FF9933]/20 text-[11px] font-medium text-[#FF9933] mb-3">
                    <SparklesIcon size={12} />
                    <span>Ready to connect?</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#fcfdff]">
                    {room.title}
                  </h1>
                  {room.description && (
                    <p className="text-xs text-[#888e90] mt-1 line-clamp-2">{room.description}</p>
                  )}
                  {room.host && (
                    <p className="text-xs text-[#888e90] mt-1.5">
                      Created by <span className="text-[#fcfdff] font-medium">{room.host.name}</span>
                    </p>
                  )}
                </div>

                {/* Who is already in the call */}
                <div className="p-4 rounded-xl bg-[#06060a]/80 border border-white/[0.08] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#888e90] flex items-center gap-1.5">
                      <UsersIcon size={14} />
                      <span>In this space</span>
                    </span>
                    <span className="font-mono text-[#fcfdff]">
                      {participantsCount} {participantsCount === 1 ? 'person' : 'people'}
                    </span>
                  </div>

                  {activeParticipants.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto pr-1">
                      {activeParticipants.map((p) => (
                        <div
                          key={p.userId}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#101012] border border-white/[0.08] text-xs"
                        >
                          <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {p.image ? (
                              <Image
                                src={p.image}
                                alt={p.name}
                                width={20}
                                height={20}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-medium">
                                {p.name ? p.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                            )}
                          </div>
                          <span className="truncate max-w-[90px] text-[#fcfdff] text-[11px]">
                            {p.name}
                          </span>
                          {/* Show if their camera is disabled on central server */}
                          {p.isVideoOn === false && (
                            <span title="Camera disabled">
                              <VideoOff className="w-3 h-3 text-rose-400 shrink-0" />
                            </span>
                          )}
                          {p.isMuted && (
                            <span title="Microphone muted">
                              <MicOffIcon size={12} className="text-[#888e90] shrink-0" />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#888e90]">No one else is here yet</p>
                  )}
                </div>

                {/* Passcode Field (if required) */}
                {passcodeRequired && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#fcfdff] flex items-center gap-1.5">
                      <LockIcon size={12} className="text-[#FF9933]" />
                      <span>Room Passcode</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Enter room passcode"
                      value={passcode}
                      onChange={(e) => onPasscodeChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.12] bg-[#06060a] text-sm text-[#fcfdff] placeholder-[#888e90] focus:outline-none focus:border-white/40"
                    />
                  </div>
                )}

                {error && <p className="text-xs text-rose-400">{error}</p>}

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={onJoin}
                    disabled={joining || (passcodeRequired && !passcode.trim())}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold bg-gradient-brand-r hover:brightness-105 active:scale-[0.98] text-black shadow-brand-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {joining ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-black/30 border-t-black rounded-full" />
                        <span>Joining Meeting...</span>
                      </>
                    ) : (
                      <span>Join Now</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs text-[#888e90] pt-1">
                    <Link
                      href="/"
                      className="hover:text-[#fcfdff] transition-colors py-1"
                    >
                      ← Back to dashboard
                    </Link>
                    <span className="text-[11px] font-mono text-[#888e90]">
                      End-to-end encrypted
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="px-6 py-3 border-t border-white/[0.04] text-center text-xs text-[#888e90]/60">
        Connectling Media Engine · High-Performance WebRTC Mesh
      </footer>
    </div>
  );
}
