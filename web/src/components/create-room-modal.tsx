'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { roomsApi, type CreateRoomPayload } from '@/lib/rooms-api';
import {
  VideoIcon,
  AudioWaveformIcon,
  UsersIcon,
  ClockIcon,
  LockIcon,
  SparklesIcon,
  XIcon,
} from '@animateicons/react/lucide';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'meet' | 'audio';
}

function TogglePill({
  label,
  subtitle,
  checked,
  onChange,
  activeColor = 'bg-[#3b9eff]',
}: {
  label: string;
  subtitle?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  activeColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full p-2.5 rounded-lg hover:bg-[#101012] transition-colors text-left group"
    >
      <div>
        <span className="text-xs font-medium text-[#fcfdff]/90 block group-hover:text-[#fcfdff] transition-colors">
          {label}
        </span>
        {subtitle && <span className="text-[11px] text-[#888e90] block">{subtitle}</span>}
      </div>
      <div
        className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
          checked ? activeColor : 'bg-[#1e1e24]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[1px] ml-[1px] ${
            checked ? 'translate-x-3.5' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}

export function CreateRoomModal({ isOpen, onClose, defaultType = 'meet' }: CreateRoomModalProps) {
  const router = useRouter();
  const isMeet = defaultType === 'meet';
  const themeColor = isMeet ? 'bg-[#3b9eff]' : 'bg-[#a855f7]';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [micForAll, setMicForAll] = useState(true);
  const [videoForAll, setVideoForAll] = useState(defaultType === 'meet');
  const [screenShareForAll, setScreenShareForAll] = useState(defaultType === 'meet');
  const [allowChat, setAllowChat] = useState(true);
  const [allowRaiseHand, setAllowRaiseHand] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a space title.');
      return;
    }

    if (isPrivate && passcode.trim().length < 4) {
      setError('Private room passcode must be at least 4 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: CreateRoomPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      type: defaultType,
      settings: {
        micForAll,
        videoForAll: isMeet ? videoForAll : false,
        screenShareForAll: isMeet ? screenShareForAll : false,
        allowChat,
        allowRaiseHand: isMeet ? allowRaiseHand : allowRaiseHand,
        isPrivate,
        passcode: isPrivate ? passcode.trim() : undefined,
      },
    };

    try {
      const res = await roomsApi.createRoom(payload);
      if (res.data?.room) {
        onClose();
        const path = isMeet ? `/meet/${res.data.room.code}` : `/talk/${res.data.room.code}`;
        router.push(path);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create space';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0a0a0c] border border-white/[0.14] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative">
        {/* Subtle Atmospheric Top Glow in Modal */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 blur-3xl pointer-events-none opacity-25 ${
            isMeet ? 'bg-[#3b9eff]' : 'bg-[#a855f7]'
          }`}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#06060a]/60 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center border border-white/[0.10] ${
                isMeet ? 'bg-[#3b9eff]/10 text-[#3b9eff]' : 'bg-[#a855f7]/10 text-[#a855f7]'
              }`}
            >
              {isMeet ? <VideoIcon size={18} /> : <AudioWaveformIcon size={18} />}
            </div>
            <div>
              <h2 className="font-serif-headline text-base font-normal text-[#fcfdff] tracking-tight">
                {isMeet ? 'Create Video Meeting' : 'Create Voice Stage'}
              </h2>
              <p className="text-[11px] text-[#888e90]">
                {isMeet
                  ? 'High-density video conference with screen sharing'
                  : 'Drop-in voice stage and podcast lounge'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#888e90] hover:text-[#fcfdff] p-1.5 rounded-lg hover:bg-[#101012] transition-colors"
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* Modal Form Body without scrollbar */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto no-scrollbar flex-1 text-sm relative z-10"
        >
          {error && (
            <div className="p-3 bg-[#ff2047]/10 border border-[#ff2047]/30 text-[#ff2047] rounded-lg text-xs flex items-center gap-2 font-mono">
              <LockIcon size={13} className="text-[#ff2047]" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#fcfdff]/80 mb-1">
              Space Title <span className="text-[#ff2047]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={isMeet ? 'e.g. Core Architecture Sync' : 'e.g. Friday Open Mic & Demo'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] focus:outline-none focus:border-white/40 transition-all text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#fcfdff]/80 mb-1">
              Description <span className="text-[#888e90] font-normal text-[11px]">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder={isMeet ? 'Add meeting context or agenda...' : 'What will be discussed on stage?'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] focus:outline-none focus:border-white/40 transition-all text-xs resize-none"
            />
          </div>

          {/* Hardcoded Specs Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#06060a] border border-white/[0.08]">
              <div className="text-[#888e90]">
                <UsersIcon size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[#888e90] text-[10px] uppercase font-mono tracking-wider">
                  Capacity
                </span>
                <span className="font-semibold text-[#fcfdff]">
                  {isMeet ? '4 Participants' : '10 Participants'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#06060a] border border-white/[0.08]">
              <div className="text-[#888e90]">
                <ClockIcon size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[#888e90] text-[10px] uppercase font-mono tracking-wider">
                  Duration
                </span>
                <span className="font-semibold text-[#fcfdff]">24 Hours Max</span>
              </div>
            </div>
          </div>

          {/* Media & Permission Toggles */}
          <div className="p-3 bg-[#06060a] border border-white/[0.08] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-wider px-2 block mb-1">
              Space Permissions
            </span>

            {isMeet ? (
              <>
                <TogglePill
                  label="Microphone for all"
                  subtitle="Allow participants to speak freely"
                  checked={micForAll}
                  onChange={setMicForAll}
                  activeColor={themeColor}
                />
                <TogglePill
                  label="Camera for all"
                  subtitle="Allow video streams from participants"
                  checked={videoForAll}
                  onChange={setVideoForAll}
                  activeColor={themeColor}
                />
                <TogglePill
                  label="Screen sharing"
                  subtitle="Allow attendees to broadcast screens"
                  checked={screenShareForAll}
                  onChange={setScreenShareForAll}
                  activeColor={themeColor}
                />
              </>
            ) : (
              <>
                <TogglePill
                  label="Open Mic Mode"
                  subtitle={micForAll ? 'Everyone can speak on stage' : 'Listeners must request mic access'}
                  checked={micForAll}
                  onChange={setMicForAll}
                  activeColor={themeColor}
                />
                <TogglePill
                  label="Audience Hand-Raising"
                  subtitle="Allow listeners to signal for mic access"
                  checked={allowRaiseHand}
                  onChange={setAllowRaiseHand}
                  activeColor={themeColor}
                />
              </>
            )}

            <TogglePill
              label="In-Room Chat"
              subtitle="Enable real-time text chat"
              checked={allowChat}
              onChange={setAllowChat}
              activeColor={themeColor}
            />
          </div>

          {/* Privacy & Passcode */}
          <div className="p-3 bg-[#06060a] border border-white/[0.08] rounded-xl space-y-2">
            <TogglePill
              label="Private Space"
              subtitle="Require a passcode to enter"
              checked={isPrivate}
              onChange={setIsPrivate}
              activeColor={themeColor}
            />

            {isPrivate && (
              <input
                type="text"
                required={isPrivate}
                placeholder="Enter 4+ digit passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/[0.12] bg-[#0a0a0c] text-[#fcfdff] placeholder-[#464a4d] focus:outline-none focus:border-white/40 text-xs font-mono"
              />
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#888e90] hover:text-[#fcfdff] rounded-lg hover:bg-[#101012] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium bg-[#fcfdff] hover:bg-[#f1f7fe] text-black rounded-lg transition-all active:scale-[0.98] shadow-[0_0_24px_rgba(252,253,255,0.18)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border border-black/30 border-t-black rounded-full" />
                  <span>Launching...</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={13} />
                  <span>Launch {isMeet ? 'Meeting' : 'Audio Stage'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
