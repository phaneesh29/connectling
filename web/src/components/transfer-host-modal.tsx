'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { RoomParticipant } from '@/types/realtime';
import {
  StarIcon,
  SearchIcon,
  XIcon,
  UsersIcon,
  PhoneCallIcon,
} from '@animateicons/react/lucide';

export interface TransferHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: RoomParticipant[];
  currentUserId?: string;
  onConfirmTransferAndLeave: (newHostUserId: string, newHostName: string) => Promise<void>;
  onEndRoom: () => void;
  spaceType?: 'meet' | 'audio';
}

export function TransferHostModal({
  isOpen,
  onClose,
  participants,
  currentUserId,
  onConfirmTransferAndLeave,
  onEndRoom,
  spaceType = 'audio',
}: TransferHostModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  const isAudio = spaceType === 'audio';
  const label = isAudio ? 'stage' : 'space';

  // Filter out current user and match search query
  const eligibleParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return participants.filter((p) => {
      if (p.userId === currentUserId) return false;
      if (!q) return true;
      return p.name?.toLowerCase().includes(q);
    });
  }, [participants, currentUserId, searchQuery]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedUserId || transferring) return;
    const target = participants.find((p) => p.userId === selectedUserId);
    const targetName = target?.name || 'Participant';
    setTransferring(true);
    try {
      await onConfirmTransferAndLeave(selectedUserId, targetName);
    } catch (err) {
      console.error('Failed to transfer host and leave:', err);
      setTransferring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => !transferring && onClose()}
    >
      <div
        className="w-full max-w-md bg-[#0a0a0c] border border-white/[0.12] rounded-2xl p-6 space-y-4 shadow-2xl text-[#fcfdff]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <StarIcon size={16} />
            </div>
            <div>
              <h3 className="font-serif-headline text-base font-medium tracking-tight text-[#fcfdff]">
                Transfer Host &amp; Leave
              </h3>
              <p className="text-[11px] text-[#888e90]">
                Select a participant to take over as {label} host
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={transferring}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888e90]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search participants by name..."
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-[#fcfdff] placeholder-[#888e90] focus:outline-none focus:border-amber-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888e90] hover:text-[#fcfdff]"
            >
              <XIcon size={12} />
            </button>
          )}
        </div>

        {/* List of other participants */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
          {eligibleParticipants.map((p) => {
            const isSelected = selectedUserId === p.userId;
            const initial = p.name ? p.name.trim().charAt(0).toUpperCase() : 'U';
            return (
              <div
                key={p.userId}
                onClick={() => setSelectedUserId(p.userId)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={32}
                      height={32}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-[#fcfdff] shrink-0">
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#fcfdff] truncate">{p.name}</p>
                    <span className="text-[10px] font-mono text-[#888e90]">
                      {isAudio
                        ? p.canSpeak
                          ? 'Speaker'
                          : 'Listener'
                        : p.isMuted
                        ? 'Mic Off'
                        : 'Mic Active'}
                    </span>
                  </div>
                </div>

                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 border-amber-400 text-black'
                      : 'border-white/30 bg-black/40'
                  }`}
                >
                  {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-black" />}
                </div>
              </div>
            );
          })}

          {eligibleParticipants.length === 0 && (
            <div className="text-center py-6 space-y-2 text-[#888e90]">
              <div className="h-9 w-9 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-[#888e90]">
                <UsersIcon size={16} />
              </div>
              <p className="text-xs font-medium text-[#fcfdff]">No matching participants</p>
              <p className="text-[11px]">
                {searchQuery ? 'Try a different search query' : 'No other participants in this space'}
              </p>
            </div>
          )}
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEndRoom();
            }}
            disabled={transferring}
            className="text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
          >
            <PhoneCallIcon size={11} />
            <span>End {isAudio ? 'Stage' : 'Space'} Instead</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={transferring}
              className="px-3 py-1.5 rounded-lg text-xs text-[#888e90] hover:text-[#fcfdff] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedUserId || transferring}
              className="px-4 py-1.5 rounded-lg bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-semibold text-xs transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {transferring ? (
                <>
                  <div className="animate-spin h-3 w-3 border border-black/30 border-t-black rounded-full" />
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <StarIcon size={12} />
                  <span>Make Host &amp; Leave</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
