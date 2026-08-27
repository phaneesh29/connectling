'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { roomsApi, type CreateRoomPayload } from '@/lib/rooms-api';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'meet' | 'audio';
}

export function CreateRoomModal({ isOpen, onClose, defaultType = 'meet' }: CreateRoomModalProps) {
  const router = useRouter();
  const isMeet = defaultType === 'meet';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [micForAll, setMicForAll] = useState(defaultType === 'meet');
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
      setError('Please provide a room title.');
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
        micForAll: isMeet ? micForAll : micForAll,
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
      const msg = err instanceof Error ? err.message : 'Failed to create room';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-inner ${
                isMeet ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'
              }`}
            >
              {isMeet ? '📹' : '🎙️'}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {isMeet ? 'Create Video Meeting' : 'Create Audio Stage'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isMeet
                  ? 'Set up an interactive video conference'
                  : 'Set up a drop-in voice stage and podcast lounge'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              {isMeet ? 'Meeting Title' : 'Audio Room Title'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={isMeet ? 'e.g. Weekly Product Sync' : 'e.g. Late Night Indie Hackers Voice Stage'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description <span className="text-zinc-400 text-xs font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder={isMeet ? 'Add meeting agenda or notes...' : 'What will be discussed on stage?'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-sm resize-none"
            />
          </div>

          {/* Room Specs Badge: Fixed Capacity & 24h Duration */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-medium">Max Capacity</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {isMeet ? '4 Participants' : '10 Participants'}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-medium">Max Duration</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">24 Hours (Auto-expires)</span>
            </div>
          </div>

          {/* Mode-Specific Media & Permission Toggles */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
              {isMeet ? 'Video Conference Settings' : 'Audio Stage Settings'}
            </span>

            {isMeet ? (
              <>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">Allow Microphone for all</span>
                  <input
                    type="checkbox"
                    checked={micForAll}
                    onChange={(e) => setMicForAll(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">Allow Camera for all</span>
                  <input
                    type="checkbox"
                    checked={videoForAll}
                    onChange={(e) => setVideoForAll(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">Allow Screen Sharing</span>
                  <input
                    type="checkbox"
                    checked={screenShareForAll}
                    onChange={(e) => setScreenShareForAll(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 block">Open Mic Mode</span>
                    <span className="text-[11px] text-zinc-400">If off, listeners must request to speak</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={micForAll}
                    onChange={(e) => setMicForAll(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-600"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">Allow Audience Hand-Raising</span>
                  <input
                    type="checkbox"
                    checked={allowRaiseHand}
                    onChange={(e) => setAllowRaiseHand(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-600"
                  />
                </label>
              </>
            )}

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-zinc-700 dark:text-zinc-300">In-Room Text Chat</span>
              <input
                type="checkbox"
                checked={allowChat}
                onChange={(e) => setAllowChat(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
            </label>
          </div>

          {/* Privacy & Passcode */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">Private Room</span>
                <span className="text-[11px] text-zinc-400">Require a passcode to enter</span>
              </div>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
            </label>

            {isPrivate && (
              <input
                type="text"
                required={isPrivate}
                placeholder="Enter 4+ digit passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-xs"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 text-xs font-semibold text-white rounded-xl transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 flex items-center gap-2 ${
                isMeet
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                  <span>Creating Space...</span>
                </>
              ) : (
                <span>Launch {isMeet ? 'Meeting' : 'Audio Stage'} 🚀</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
