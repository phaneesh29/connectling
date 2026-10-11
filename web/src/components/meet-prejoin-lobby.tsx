'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MicIcon,
  VideoIcon,
  CopyIcon,
  CheckIcon,
  UsersIcon,
  SparklesIcon,
  ChevronUpIcon,
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
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [videoMenuOpen, setVideoMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Live microphone level visualizer in lobby
  const { volume } = useLocalAudioLevel({
    isEnabled: isMicOn,
    deviceId: mediaDevices.selectedAudioInputId,
  });

  // Local camera preview acquisition
  useEffect(() => {
    let previewStream: MediaStream | null = null;
    let isCancelled = false;

    if (!isVideoOn) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      return;
    }

    async function setupPreview() {
      setStreamError(null);
      try {
        const constraints: MediaStreamConstraints = {
          video: mediaDevices.selectedVideoInputId
            ? { deviceId: { exact: mediaDevices.selectedVideoInputId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        previewStream = stream;
        setStreamError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Ignore autoplay interruption
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Preview media capture error:', err);
          setStreamError('Could not access selected camera');
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
  }, [isVideoOn, mediaDevices.selectedVideoInputId]);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeParticipants = room.activeParticipants || [];
  const participantsCount = room.activeParticipantsCount ?? activeParticipants.length;

  return (
    <div className="min-h-screen bg-black text-[#fcfdff] flex flex-col justify-between selection:bg-[#FF9933]/30 ambient-glow-meet relative overflow-hidden">
      {/* Ambient Atmospheric Glow Orbs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20 bg-gradient-brand-br" />
      <div className="absolute bottom-10 left-10 w-[420px] h-[420px] rounded-full blur-[140px] pointer-events-none opacity-10 bg-[#FF8C00]" />

      {/* Top Header */}
      <header className="px-5 sm:px-8 py-3.5 sm:py-4 border-b border-white/[0.06] bg-black/40 backdrop-blur-2xl flex items-center justify-between relative z-20">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative h-6 w-6 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="Connectling"
              width={24}
              height={24}
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,153,51,0.35)] group-hover:scale-110 transition-transform duration-200"
              priority
            />
          </div>
          <span className="font-serif-headline text-base sm:text-lg text-[#fcfdff] tracking-tight font-normal">
            Connectling
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-[#888e90] bg-[#0c0c10] px-3.5 py-1.5 rounded-full border border-white/[0.08]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#11ff99] animate-pulse" />
            <span>{room.code}</span>
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs text-[#888e90] hover:text-[#fcfdff] bg-[#0c0c10] hover:bg-[#141418] px-3.5 py-1.5 rounded-full border border-white/[0.08] hover:border-white/[0.20] transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Copy meeting link"
          >
            {copied ? <CheckIcon size={13} className="text-[#11ff99]" /> : <CopyIcon size={13} />}
            <span className="font-medium">{copied ? 'Copied' : 'Share Space'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area: 70-75% Video Stage on Left, 25-30% Action Card on Right */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
          {/* Left Column: 70% to 75% Cinema Camera Preview Stage */}
          <div className="w-full lg:w-[72%] xl:w-[74%] flex flex-col items-center">
            <div className="w-full h-[460px] sm:h-[540px] lg:h-[72vh] max-h-[660px] rounded-3xl bg-[#07070a] border border-white/[0.12] relative overflow-hidden flex items-center justify-center shadow-[0_24px_70px_-15px_rgba(0,0,0,0.95),0_0_50px_rgba(255,153,51,0.08)] group">
              {/* Radial gradient background atmosphere */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/80 pointer-events-none" />

              {/* Live Camera Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                  isVideoOn ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              />

              {/* Standby State when Camera is Off */}
              {!isVideoOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 ambient-glow-meet z-10">
                  <div className="relative">
                    <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-gradient-to-b from-[#141418] to-[#0a0a0c] border border-white/[0.16] overflow-hidden flex items-center justify-center shadow-2xl relative z-10">
                      {sessionUser?.image && !avatarError ? (
                        <Image
                          src={sessionUser.image}
                          alt={sessionUser.name || 'User'}
                          width={144}
                          height={144}
                          unoptimized
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarError(true)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-serif-headline text-4xl sm:text-5xl font-normal text-[#fcfdff]">
                          {sessionUser?.name ? sessionUser.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      )}
                    </div>
                    <div className="absolute -inset-2 rounded-full border border-[#FF9933]/30 animate-ping pointer-events-none opacity-25" />
                    <div className="absolute -inset-4 rounded-full bg-gradient-brand opacity-20 blur-xl pointer-events-none" />
                  </div>

                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/[0.10] text-xs text-[#888e90]">
                    <VideoOff className="w-3.5 h-3.5 text-[#ff2047]" />
                    <span className="font-serif italic">Camera paused</span>
                  </div>
                </div>
              )}

              {/* Top Left Live Preview Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-xl border border-white/[0.12] text-xs font-medium text-[#fcfdff] shadow-lg">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isVideoOn ? 'bg-[#11ff99] animate-pulse' : 'bg-[#888e90]'
                    }`}
                  />
                  <span>{isVideoOn ? 'Camera Active' : 'Camera Off'}</span>
                </span>
              </div>

              {/* Top Right Audio Waveform & Level Meter */}
              {isMicOn && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-xl border border-white/[0.12] shadow-lg">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#888e90]">Mic</span>
                  <div className="flex items-end gap-[3px] h-3.5">
                    <div
                      className="w-1 bg-[#11ff99] rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, (volume / 100) * 14)}px` }}
                    />
                    <div
                      className="w-1 bg-[#11ff99] rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, ((volume * 0.85) / 100) * 14)}px` }}
                    />
                    <div
                      className="w-1 bg-[#F4C430] rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, ((volume * 0.7) / 100) * 14)}px` }}
                    />
                    <div
                      className="w-1 bg-[#FF9933] rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(3, ((volume * 0.5) / 100) * 14)}px` }}
                    />
                  </div>
                </div>
              )}

              {/* Floating Bottom Media Bar (Split button controls like meeting room) */}
              <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5 p-1.5 rounded-2xl bg-[#0a0a0c]/90 backdrop-blur-xl border border-white/[0.12] shadow-2xl z-20 max-w-[95%]">
                {/* Microphone Split Button */}
                <div
                  className={`inline-flex items-center rounded-xl transition-all ${
                    isMicOn
                      ? audioMenuOpen
                        ? 'bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/50 ring-1 ring-[#FF9933]/40 shadow-[0_0_20px_rgba(255,153,51,0.2)]'
                        : 'bg-[#FF9933]/12 hover:bg-[#FF9933]/18 text-[#FF9933] border border-[#FF9933]/35 hover:border-[#FF9933]/50 shadow-[0_0_12px_rgba(255,153,51,0.15)]'
                      : audioMenuOpen
                      ? 'bg-[#2a0e14] text-[#fca5a5] border border-red-500/40 ring-1 ring-red-500/30 shadow-[0_0_18px_rgba(220,38,38,0.25)]'
                      : 'bg-gradient-to-r from-[#240a0f] to-[#1a070b] hover:from-[#2e0e15] hover:to-[#220a0f] text-[#f87171] border border-red-500/30 hover:border-red-500/45 shadow-[0_0_12px_rgba(220,38,38,0.15)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={onToggleMic}
                    className="h-10 px-3 rounded-l-xl flex items-center gap-1.5 text-xs font-medium hover:bg-white/[0.06] transition-all cursor-pointer"
                    title={isMicOn ? 'Turn off microphone' : 'Turn on microphone'}
                  >
                    {isMicOn ? <MicIcon size={16} /> : <LucideMicOff className="w-4 h-4 text-[#f87171]" />}
                    <span className="hidden xs:inline">{isMicOn ? 'Mic On' : 'Muted'}</span>
                  </button>
                  <div
                    className={`w-px h-4.5 ${
                      isMicOn ? (audioMenuOpen ? 'bg-[#FF9933]/40' : 'bg-[#FF9933]/30') : 'bg-red-500/25'
                    }`}
                  />
                  {/* Up-Arrow Trigger & Popover Anchor */}
                  <div className={`relative ${audioMenuOpen ? 'z-50' : ''}`}>
                    <button
                      type="button"
                      data-media-menu-toggle="audio"
                      onClick={() => {
                        setAudioMenuOpen((prev) => !prev);
                        setVideoMenuOpen(false);
                      }}
                      className={`h-10 px-2 rounded-r-xl flex items-center justify-center hover:bg-white/[0.08] transition-all cursor-pointer ${
                        audioMenuOpen
                          ? 'bg-white/[0.12] text-[#fca5a5]'
                          : isMicOn
                          ? 'text-[#FF9933]/80 hover:text-[#FF9933]'
                          : 'text-[#f87171]/80 hover:text-[#f87171]'
                      }`}
                      title="Microphone & Speaker Settings"
                    >
                      <ChevronUpIcon
                        size={13}
                        className={`transition-transform duration-200 pointer-events-none ${
                          audioMenuOpen ? 'rotate-180 text-[#fca5a5]' : isMicOn ? 'text-[#FF9933]' : 'text-[#f87171]'
                        }`}
                      />
                    </button>

                    <MediaDeviceMenu
                      isOpen={audioMenuOpen}
                      onClose={() => setAudioMenuOpen(false)}
                      type="audio"
                      audioInputs={mediaDevices.audioInputs}
                      audioOutputs={mediaDevices.audioOutputs}
                      selectedAudioInputId={mediaDevices.selectedAudioInputId}
                      selectedAudioOutputId={mediaDevices.selectedAudioOutputId}
                      onSelectAudioInput={mediaDevices.setSelectedAudioInputId}
                      onSelectAudioOutput={mediaDevices.setSelectedAudioOutputId}
                      onRequestPermissions={() => mediaDevices.requestPermissions(true, false)}
                      onTestSpeaker={mediaDevices.testSpeaker}
                      testingSpeaker={mediaDevices.testingSpeaker}
                      onTestMic={mediaDevices.testMic}
                      testingMicStatus={mediaDevices.testingMicStatus}
                      micVolume={mediaDevices.micVolume || volume}
                    />
                  </div>
                </div>

                {/* Camera Split Button */}
                <div
                  className={`inline-flex items-center rounded-xl transition-all ${
                    isVideoOn
                      ? videoMenuOpen
                        ? 'bg-[#181820] text-[#fcfdff] border border-[#ff7a1a]/50 ring-1 ring-[#ff7a1a]/40 shadow-[0_0_20px_rgba(255,122,26,0.2)]'
                        : 'bg-[#121216] hover:bg-[#18181f] text-[#fcfdff] border border-white/[0.10] hover:border-white/[0.16] shadow-sm'
                      : videoMenuOpen
                      ? 'bg-[#2a0e14] text-[#fca5a5] border border-red-500/40 ring-1 ring-red-500/30 shadow-[0_0_18px_rgba(220,38,38,0.25)]'
                      : 'bg-gradient-to-r from-[#240a0f] to-[#1a070b] hover:from-[#2e0e15] hover:to-[#220a0f] text-[#f87171] border border-red-500/30 hover:border-red-500/45 shadow-[0_0_12px_rgba(220,38,38,0.15)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={onToggleVideo}
                    className="h-10 px-3 rounded-l-xl flex items-center gap-1.5 text-xs font-medium hover:bg-white/[0.06] transition-all cursor-pointer"
                    title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {isVideoOn ? <VideoIcon size={16} /> : <VideoOff className="w-4 h-4 text-[#f87171]" />}
                    <span className="hidden xs:inline">{isVideoOn ? 'Cam On' : 'Cam Off'}</span>
                  </button>
                  <div
                    className={`w-px h-4.5 ${
                      isVideoOn ? (videoMenuOpen ? 'bg-[#ff7a1a]/40' : 'bg-white/[0.10]') : 'bg-red-500/25'
                    }`}
                  />
                  {/* Up-Arrow Trigger & Popover Anchor */}
                  <div className={`relative ${videoMenuOpen ? 'z-50' : ''}`}>
                    <button
                      type="button"
                      data-media-menu-toggle="video"
                      onClick={() => {
                        setVideoMenuOpen((prev) => !prev);
                        setAudioMenuOpen(false);
                      }}
                      className={`h-10 px-2 rounded-r-xl flex items-center justify-center hover:bg-white/[0.08] transition-all cursor-pointer ${
                        videoMenuOpen
                          ? 'bg-white/[0.12] text-[#fca5a5]'
                          : isVideoOn
                          ? 'text-[#888e90] hover:text-[#fcfdff]'
                          : 'text-[#f87171]/80 hover:text-[#f87171]'
                      }`}
                      title="Camera Settings"
                    >
                      <ChevronUpIcon
                        size={13}
                        className={`transition-transform duration-200 pointer-events-none ${
                          videoMenuOpen ? 'rotate-180 text-[#fca5a5]' : isVideoOn ? '' : 'text-[#f87171]'
                        }`}
                      />
                    </button>

                    <MediaDeviceMenu
                      isOpen={videoMenuOpen}
                      onClose={() => setVideoMenuOpen(false)}
                      type="video"
                      videoInputs={mediaDevices.videoInputs}
                      selectedVideoInputId={mediaDevices.selectedVideoInputId}
                      onSelectVideoInput={mediaDevices.setSelectedVideoInputId}
                      onRequestPermissions={() => mediaDevices.requestPermissions(false, true)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {streamError && (
              <p className="mt-2 text-xs text-rose-400 text-center font-mono">{streamError}</p>
            )}
          </div>

          {/* Right Column: 26% to 28% Action Panel */}
          <div className="w-full lg:w-[28%] xl:w-[26%] flex justify-center">
            <div className="glow-card w-full rounded-2xl border border-white/[0.12] bg-[#0a0a0c] overflow-hidden p-5 sm:p-7 space-y-4 sm:space-y-5 relative shadow-2xl">
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 -mr-16 -mt-16 bg-gradient-brand-br" />

              {/* Home page style Browser Header Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3 relative z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff2047]/80 shrink-0" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffc53d]/80 shrink-0" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#11ff99]/80 shrink-0" />
                  <span className="font-mono text-[11px] text-[#888e90] ml-1 truncate">
                    connectling.com/meet/{room.code}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] text-[#888e90] px-2 py-0.5 rounded bg-[#101012] border border-white/[0.06]">
                    4 Seats
                  </span>
                </div>
              </div>

              {/* Room Title & Host (Minimal Text) */}
              <div className="space-y-1 relative z-10">
                <h1 className="text-xl sm:text-2xl font-medium text-[#fcfdff]">
                  {room.title}
                </h1>
                {room.host && (
                  <p className="text-xs text-[#888e90]">
                    Host: <span className="text-[#fcfdff]">{room.host.name}</span>
                  </p>
                )}
              </div>

              {/* Who is already in the call */}
              <div className="p-3.5 rounded-xl bg-[#06060a] border border-white/[0.08] space-y-2 relative z-10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888e90] flex items-center gap-1.5">
                    <UsersIcon size={13} />
                    <span>In space</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#fcfdff]">
                    {participantsCount} {participantsCount === 1 ? 'person' : 'people'}
                  </span>
                </div>

                {activeParticipants.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeParticipants.map((p) => (
                      <div
                        key={p.userId}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#101012] border border-white/[0.08] text-xs"
                      >
                        <div className="h-4 w-4 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              width={16}
                              height={16}
                              unoptimized
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] font-medium">
                              {p.name ? p.name.charAt(0).toUpperCase() : 'U'}
                            </span>
                          )}
                        </div>
                        <span className="truncate max-w-[80px] text-[#fcfdff] text-[11px]">
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#888e90]">No one else is here yet</p>
                )}
              </div>

              {/* Passcode Field (if required) */}
              {passcodeRequired && (
                <div className="space-y-1 relative z-10">
                  <input
                    type="password"
                    placeholder="Enter room passcode"
                    value={passcode}
                    onChange={(e) => onPasscodeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl sm:rounded-lg border border-white/[0.10] bg-[#06060a] text-xs font-mono text-[#fcfdff] placeholder-[#464a4d] focus:outline-none focus:border-white/40 transition-all"
                  />
                </div>
              )}

              {error && <p className="text-xs text-rose-400 font-mono relative z-10">{error}</p>}

              {/* Action Buttons: Styled like Home Page! */}
              <div className="pt-2 space-y-2.5 relative z-10">
                <button
                  type="button"
                  onClick={onJoin}
                  disabled={joining || (passcodeRequired && !passcode.trim())}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-xl sm:rounded-lg transition-all active:scale-[0.98] shadow-brand-glow shrink-0 cursor-pointer disabled:opacity-40"
                >
                  {joining ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border border-black/30 border-t-black rounded-full" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon size={13} />
                      <span>Join Space</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <Link
                    href="/"
                    className="text-[#888e90] hover:text-[#fcfdff] text-xs transition-colors"
                  >
                    ← Back
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="px-6 py-4 border-t border-white/[0.04] text-center text-xs font-mono text-[#888e90]/60">
        Connectling
      </footer>
    </div>
  );
}
