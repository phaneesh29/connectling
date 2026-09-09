'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { RoomParticipant } from '@/types/realtime';
import { AudioWaveform } from '@/components/audio-waveform';
import {
  UsersIcon,
  XIcon,
  MicIcon,
  MicOffIcon,
  VideoIcon,
  CameraIcon,
  CopyIcon,
  CheckIcon,
  StarIcon,
  SearchIcon,
  HandCoinsIcon,
  LogOutIcon,
} from '@animateicons/react/lucide';

interface InRoomParticipantsProps {
  isOpen: boolean;
  onClose: () => void;
  participants: RoomParticipant[];
  currentUserId?: string;
  hostId?: string;
  roomCode?: string;
  onCopyLink: () => void;
  copied: boolean;
  onGrantMic?: (userId: string, name: string) => void;
  onRevokeMic?: (userId: string, name: string) => void;
  onMuteUser?: (userId: string, name: string) => void;
  onKickUser?: (userId: string, name: string) => void;
  onTransferHost?: (userId: string, name: string) => void;
  localVolume?: number;
  localFrequencyBands?: number[];
}

export function InRoomParticipants({
  isOpen,
  onClose,
  participants,
  currentUserId,
  hostId,
  onCopyLink,
  copied,
  onGrantMic,
  onRevokeMic,
  onMuteUser,
  onKickUser,
  onTransferHost,
  localVolume,
  localFrequencyBands,
}: InRoomParticipantsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-88 md:w-96 bg-[#0a0a0e]/95 backdrop-blur-2xl border-l border-white/[0.12] shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Top Header */}
      <div className="h-14 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-[#ff7a1a]">
            <UsersIcon size={14} />
          </div>
          <div>
            <h3 className="text-xs font-medium text-[#fcfdff] flex items-center gap-2">
              <span>People in Space</span>
              <span className="px-1.5 py-0.2 rounded-full bg-orange-500/20 text-[#ff7a1a] text-[10px] font-mono font-semibold">
                {participants.length}
              </span>
            </h3>
            <p className="text-[10px] text-[#888e90] font-mono">Real-time room roster</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] flex items-center justify-center text-[#888e90] hover:text-[#fcfdff] transition-all"
          title="Close roster"
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-white/[0.08] bg-[#06060a]/60">
        <div className="relative">
          <SearchIcon
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888e90]"
          />
          <input
            type="text"
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-[#fcfdff] placeholder-[#888e90] focus:outline-none focus:border-white/30 transition-all font-sans"
          />
        </div>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-60">
            <div className="h-10 w-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#888e90]">
              <UsersIcon size={18} />
            </div>
            <p className="text-xs text-[#fcfdff] font-medium">No participants found</p>
            <p className="text-[11px] text-[#888e90]">
              {searchQuery ? 'Try a different search term' : 'Waiting for collaborators to join'}
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const isMe = p.userId === currentUserId;
            const isHost = p.userId === hostId;
            const initial = p.name ? p.name.trim().charAt(0).toUpperCase() : 'U';

            return (
              <div
                key={p.userId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={32}
                        height={32}
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#101012] border border-white/20 flex items-center justify-center text-xs font-serif text-[#fcfdff]">
                        {initial}
                      </div>
                    )}
                    {isHost && (
                      <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#ffc53d] text-black flex items-center justify-center shadow-md">
                        <StarIcon size={8} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-[#fcfdff] truncate">
                        {p.name}
                        {isMe && <span className="text-[#888e90] font-normal"> (You)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isHost ? (
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#f59e0b] font-semibold">
                          Host
                        </span>
                      ) : p.handRaised ? (
                        <span className="text-[9px] font-mono text-[#ffc53d] flex items-center gap-1 font-medium animate-pulse">
                          <HandCoinsIcon size={10} />
                          <span>Hand Raised</span>
                        </span>
                      ) : p.canSpeak ? (
                        <span className="text-[9px] font-mono text-[#11ff99] font-medium">Speaker</span>
                      ) : (
                        <span className="text-[9px] font-mono text-[#888e90]">Participant</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-[#888e90]">
                  {/* Host direct actions: Mic, Mute, Make Host, Kick */}
                  {currentUserId === hostId && !isHost && (
                    <div className="flex items-center gap-1">
                      {p.handRaised ? (
                        <button
                          type="button"
                          onClick={() => onGrantMic?.(p.userId, p.name)}
                          className="px-2 py-0.5 rounded-md bg-[#ffc53d] hover:bg-[#ffc53d]/90 text-black text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-all animate-pulse active:scale-95 cursor-pointer"
                          title="Unmute and allow to speak"
                        >
                          <MicIcon size={10} />
                          <span>Unmute</span>
                        </button>
                      ) : !p.isMuted ? (
                        <button
                          type="button"
                          onClick={() => onMuteUser?.(p.userId, p.name)}
                          className="px-1.5 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[9px] font-mono flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Mute participant"
                        >
                          <MicOffIcon size={9} />
                          <span>Mute</span>
                        </button>
                      ) : p.canSpeak && onRevokeMic ? (
                        <button
                          type="button"
                          onClick={() => onRevokeMic(p.userId, p.name)}
                          className="px-1.5 py-0.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-mono flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Revoke speaking access"
                        >
                          <MicOffIcon size={9} />
                          <span>Revoke</span>
                        </button>
                      ) : onGrantMic ? (
                        <button
                          type="button"
                          onClick={() => onGrantMic(p.userId, p.name)}
                          className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 px-1.5 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.10] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.08] text-[9px] font-mono flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                          title="Invite to speak"
                        >
                          <MicIcon size={9} />
                          <span>Invite</span>
                        </button>
                      ) : null}

                      {/* Make Host button */}
                      {onTransferHost && (
                        <button
                          type="button"
                          onClick={() => onTransferHost(p.userId, p.name)}
                          className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 h-6 w-6 rounded-md flex items-center justify-center bg-white/[0.04] hover:bg-amber-500/20 hover:text-amber-300 text-[#888e90] border border-white/[0.08] transition-all cursor-pointer"
                          title={`Make ${p.name} the host`}
                        >
                          <StarIcon size={11} />
                        </button>
                      )}

                      {/* Kick button */}
                      {onKickUser && (
                        <button
                          type="button"
                          onClick={() => onKickUser(p.userId, p.name)}
                          className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 h-6 w-6 rounded-md flex items-center justify-center bg-white/[0.04] hover:bg-red-500/20 hover:text-red-400 text-[#888e90] border border-white/[0.08] transition-all cursor-pointer"
                          title={`Remove ${p.name} from space`}
                        >
                          <LogOutIcon size={11} />
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    className={`h-6 rounded-md flex items-center justify-center border transition-all ${
                      p.isMuted
                        ? 'w-6 bg-[#ff2047]/10 border-[#ff2047]/20 text-[#ff2047]'
                        : 'px-1.5 gap-1 bg-[#11ff99]/10 border-[#11ff99]/20 text-[#11ff99]'
                    }`}
                    title={p.isMuted ? 'Muted' : 'Mic Active'}
                  >
                    {p.isMuted ? (
                      <MicOffIcon size={11} />
                    ) : (
                      <>
                        <MicIcon size={11} />
                        <AudioWaveform
                          isActive={true}
                          size="xs"
                          barCount={3}
                          volume={isMe ? localVolume : undefined}
                          frequencyBands={isMe ? localFrequencyBands : undefined}
                        />
                      </>
                    )}
                  </div>

                  <div
                    className={`h-6 w-6 rounded-md flex items-center justify-center border ${
                      p.isVideoOn ?? true
                        ? 'bg-white/[0.04] border-white/[0.08] text-[#fcfdff]'
                        : 'bg-white/[0.02] border-white/[0.04] text-[#888e90]'
                    }`}
                    title={p.isVideoOn ?? true ? 'Video Active' : 'Camera Off'}
                  >
                    {p.isVideoOn ?? true ? <VideoIcon size={11} /> : <CameraIcon size={11} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Invite Link Footer */}
      <div className="p-3 border-t border-white/[0.08] bg-[#06060a] shrink-0">
        <button
          onClick={onCopyLink}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#101012] hover:bg-[#18181c] border border-white/[0.12] text-xs font-medium text-[#fcfdff] transition-all"
        >
          {copied ? <CheckIcon size={13} className="text-[#11ff99]" /> : <CopyIcon size={13} />}
          <span>{copied ? 'Copied Space Invite' : 'Copy Space Invite Link'}</span>
        </button>
      </div>
    </aside>
  );
}
