'use client';

import React, { useEffect } from 'react';
import { Radio, Video, ArrowRight, X } from 'lucide-react';

export interface RoomSwitchedModalProps {
  isOpen: boolean;
  fromType: 'meet' | 'audio';
  toType: 'meet' | 'audio';
  newRoomCode: string;
  roomTitle?: string;
  hostName: string;
  onJoin: () => void;
  onDismiss: () => void;
}

export function RoomSwitchedModal({
  isOpen,
  toType,
  newRoomCode,
  roomTitle,
  hostName,
  onJoin,
  onDismiss,
}: RoomSwitchedModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onDismiss();
      if (e.key === 'Enter') onJoin();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss, onJoin]);

  if (!isOpen) return null;

  const isSwitchingToTalk = toType === 'audio';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-md bg-[#0a0a0c] border border-white/[0.14] rounded-2xl overflow-hidden shadow-2xl relative text-[#fcfdff] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-28 blur-3xl pointer-events-none opacity-20 ${
            isSwitchingToTalk ? 'bg-[#FF9933]' : 'bg-[#11ff99]'
          }`}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#06060a]/60 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center border shrink-0 ${
                isSwitchingToTalk
                  ? 'bg-[#FF9933]/15 text-[#FF9933] border-[#FF9933]/30 shadow-[0_0_14px_rgba(255,153,51,0.2)]'
                  : 'bg-[#11ff99]/15 text-[#11ff99] border-[#11ff99]/30 shadow-[0_0_14px_rgba(17,255,153,0.2)]'
              }`}
            >
              {isSwitchingToTalk ? <Radio className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#fcfdff] tracking-tight">
                {isSwitchingToTalk ? 'Switched to Talk Space' : 'Switched to Video Meeting'}
              </h3>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                  isSwitchingToTalk ? 'text-[#FF9933]' : 'text-[#11ff99]'
                }`}
              >
                {isSwitchingToTalk ? 'Audio Lounge' : 'Video Conference'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="h-7 w-7 rounded-lg text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4 relative z-10">
          <p className="text-xs sm:text-sm text-[#888e90] leading-relaxed">
            <span className="text-[#fcfdff] font-medium">{hostName}</span> has switched this session to a new{' '}
            <span className={isSwitchingToTalk ? 'text-[#FF9933] font-medium' : 'text-[#11ff99] font-medium'}>
              {isSwitchingToTalk ? 'Audio Talk Space' : 'Video Meeting'}
            </span>
            . Join below to continue the conversation.
          </p>

          {/* New Room Card Preview */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#fcfdff] truncate">
                {roomTitle || (isSwitchingToTalk ? 'Talk Space' : 'Meeting Room')}
              </p>
              <p className="text-[10px] text-[#888e90] font-mono mt-0.5">
                Room ID: <span className="text-[#fcfdff]">{newRoomCode}</span>
              </p>
            </div>
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold shrink-0 ${
                isSwitchingToTalk
                  ? 'bg-[#FF9933]/10 text-[#FF9933] border-[#FF9933]/30'
                  : 'bg-[#11ff99]/10 text-[#11ff99] border-[#11ff99]/30'
              }`}
            >
              {isSwitchingToTalk ? 'AUDIO' : 'VIDEO'}
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.04] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
            >
              Stay Here
            </button>
            <button
              type="button"
              onClick={onJoin}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98] ${
                isSwitchingToTalk
                  ? 'bg-gradient-to-r from-[#FF9933] to-[#ff7a1a] text-black hover:opacity-95 shadow-[#FF9933]/20 ring-1 ring-[#FF9933]/50'
                  : 'bg-gradient-to-r from-[#11ff99] to-[#00dd80] text-black hover:opacity-95 shadow-[#11ff99]/20 ring-1 ring-[#11ff99]/50'
              }`}
            >
              <span>Join Here</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
