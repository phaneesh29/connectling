'use client';

import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { webinarsApi } from '@/lib/webinars-api';
import { generateRandomWebinarTitle } from '@/lib/room-names';
import { Radio, X, Sparkles, AlertCircle, Info, Dices } from 'lucide-react';

const emptySubscribe = () => () => {};

interface CreateWebinarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function TogglePill({
  label,
  subtitle,
  checked,
  onChange,
  activeColor = 'bg-[#FF9933]',
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
      className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-[#121218] transition-colors text-left group cursor-pointer"
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

export function CreateWebinarModal({ isOpen, onClose, onSuccess }: CreateWebinarModalProps) {
  const router = useRouter();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [allowChat, setAllowChat] = useState(true);
  const [allowQa, setAllowQa] = useState(true);
  const [allowWhiteboard, setAllowWhiteboard] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTitle = () => {
    const nextTitle = generateRandomWebinarTitle(title);
    setTitle(nextTitle);
    if (error) setError(null);
  };

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a webinar title.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await webinarsApi.createWebinar({
        title: title.trim(),
        description: description.trim() || undefined,
        youtubeVideoId: youtubeVideoId.trim() || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        allowChat,
        allowQa,
        allowWhiteboard,
        allowReactions,
      });

      if (res.success && res.data) {
        onClose();
        if (onSuccess) onSuccess();
        router.push(`/webinar/host/${res.data.code}`);
      } else {
        setError(res.message || 'Failed to create webinar');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create webinar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-lg bg-[#0a0a0c] border border-white/[0.14] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Atmospheric Top Glow in Modal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 blur-3xl pointer-events-none opacity-30 bg-gradient-to-r from-[#FF9933] to-[#FF8C00]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.06] bg-[#06060a]/60 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center border border-white/[0.10] bg-[#FF9933]/10 text-[#FF9933] shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-serif-headline text-base font-normal text-[#fcfdff] tracking-tight truncate">
                  Host a Live Webinar
                </h2>
                <a
                  href="/webinar/guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-[10px] text-[#FF9933] font-medium transition-all"
                  title="View Broadcaster Guide (opens in new tab)"
                >
                  <Info className="w-3 h-3" />
                  <span>Guide</span>
                </a>
              </div>
              <p className="text-[11px] text-[#888e90] truncate">
                Broadcast via OBS with real-time chat, Q&amp;A, and whiteboard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888e90] hover:text-[#fcfdff] p-1.5 rounded-lg hover:bg-[#101012] transition-colors shrink-0 ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-4 overflow-y-auto no-scrollbar flex-1 text-sm relative z-10"
        >
          {error && (
            <div className="p-3 bg-[#ff2047]/10 border border-[#ff2047]/30 text-[#ff2047] rounded-lg text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-[#ff2047] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[#fcfdff]/80">
                Webinar Title <span className="text-[#ff2047]">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateTitle}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium text-[#FF9933] hover:text-[#ffaa4d] bg-[#FF9933]/10 hover:bg-[#FF9933]/20 border border-[#FF9933]/25 transition-all cursor-pointer select-none active:scale-95"
                title="Generate random webinar title"
              >
                <Dices size={12} className="shrink-0" />
                <span>Random title</span>
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Next.js 15 Deep Dive & Architecture"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] focus:outline-none focus:border-[#FF9933]/60 transition-all text-base sm:text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#fcfdff]/80 mb-1">
              Description / Agenda <span className="text-[#888e90] font-normal text-[11px]">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="What will attendees learn during this broadcast?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] focus:outline-none focus:border-[#FF9933]/60 transition-all text-base sm:text-xs resize-none"
            />
          </div>

          {/* YouTube Video / Stream ID */}
          <div>
            <label className="block text-xs font-medium text-[#fcfdff]/80 mb-1">
              YouTube Live Stream URL or Video ID <span className="text-[#888e90] font-normal text-[11px]">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. https://youtube.com/live/xxxx or video ID"
              value={youtubeVideoId}
              onChange={(e) => setYoutubeVideoId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] focus:outline-none focus:border-[#FF9933]/60 transition-all text-base sm:text-xs font-mono"
            />
          </div>

          {/* Scheduled Date/Time */}
          <div>
            <label className="block text-xs font-medium text-[#fcfdff]/80 mb-1">
              Scheduled Start <span className="text-[#888e90] font-normal text-[11px]">(Optional)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#464a4d] focus:outline-none focus:border-[#FF9933]/60 transition-all text-base sm:text-xs"
            />
            <p className="text-[11px] text-[#888e90] mt-1">
              Leave blank to start immediately in the live studio.
            </p>
          </div>

          {/* Interactive Feature Toggles */}
          <div className="p-3 bg-[#06060a] border border-white/[0.08] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#888e90] uppercase tracking-wider px-2 block mb-1">
              Audience Engagement Features
            </span>

            <TogglePill
              label="Live Chat"
              subtitle="Real-time participant text conversation"
              checked={allowChat}
              onChange={setAllowChat}
            />
            <TogglePill
              label="Audience Q&A"
              subtitle="Attendee questions with upvoting and host answers"
              checked={allowQa}
              onChange={setAllowQa}
            />
            <TogglePill
              label="Interactive Whiteboard"
              subtitle="Live vector sketchpad with real-time broadcasting"
              checked={allowWhiteboard}
              onChange={setAllowWhiteboard}
            />
            <TogglePill
              label="Emoji Reactions"
              subtitle="Floating reactions with burst animations"
              checked={allowReactions}
              onChange={setAllowReactions}
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2 sm:gap-2.5 pt-3 border-t border-white/[0.06] pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-[#888e90] hover:text-[#fcfdff] rounded-lg hover:bg-[#101012] transition-colors disabled:opacity-40 text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold bg-gradient-brand-r hover:brightness-105 text-black rounded-lg transition-all active:scale-[0.98] shadow-brand-glow disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border border-black/30 border-t-black rounded-full" />
                  <span>Launching Studio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create &amp; Enter Studio →</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
