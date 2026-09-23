'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquareIcon,
  XIcon,
  CheckIcon,
  MailIcon,
  TriangleAlertIcon,
} from '@animateicons/react/lucide';
import { Bug, Video, Lightbulb, MessageSquare } from 'lucide-react';
import {
  reportsApi,
  createReportSchema,
  type ReportCategory,
  reportCategoryValues,
} from '@/lib/reports-api';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
  defaultCategory?: ReportCategory;
}

const CATEGORY_CONFIG: Record<
  ReportCategory,
  { label: string; icon: React.ReactNode; description: string }
> = {
  bug: {
    label: 'Bug / Glitch',
    icon: <Bug className="w-4 h-4 text-rose-400 shrink-0 pointer-events-none" />,
    description: 'Something broke or isn’t behaving as expected',
  },
  audio_video: {
    label: 'Audio / Video',
    icon: <Video className="w-4 h-4 text-amber-400 shrink-0 pointer-events-none" />,
    description: 'Mic, camera, speaker, or screen share issue',
  },
  feature: {
    label: 'Feature / Feedback',
    icon: <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 pointer-events-none" />,
    description: 'Feature suggestion or general feedback',
  },
  other: {
    label: 'Other / Inquiries',
    icon: <MessageSquare className="w-4 h-4 text-blue-400 shrink-0 pointer-events-none" />,
    description: 'General question, acquisition, or ownership inquiry',
  },
};

export function ReportModal({
  isOpen,
  onClose,
  roomCode,
  defaultCategory = 'bug',
}: ReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<ReportCategory>(defaultCategory);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setError(null);
      setContent('');
      setCategory(defaultCategory);
    }
  }, [isOpen, defaultCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = content.trim();
    if (!trimmed) {
      setError('Please enter details before submitting.');
      return;
    }
    if (trimmed.length < 5) {
      setError('Report or feedback must be at least 5 characters long.');
      return;
    }

    // Client-side Zod check
    const validation = createReportSchema.safeParse({
      category,
      content: trimmed,
      roomCode: roomCode || undefined,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your input.');
      return;
    }

    setLoading(true);
    try {
      await reportsApi.submitReport({
        category,
        content: trimmed,
        roomCode: roomCode || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto"
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-lg bg-[#0a0a0c] border border-white/[0.14] rounded-2xl shadow-2xl overflow-hidden relative text-[#fcfdff] max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 blur-3xl pointer-events-none opacity-25 bg-[#ff7a1a]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] bg-[#06060a]/60 relative z-10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#ff7a1a] flex items-center justify-center shrink-0">
              <MessageSquareIcon size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif-headline text-base font-normal text-[#fcfdff] tracking-tight truncate">
                Report Issue or Feedback
              </h3>
              <p className="text-[11px] text-[#888e90] truncate">
                {roomCode ? `Regarding Space #${roomCode}` : 'Help us improve Connectling'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-[#888e90] hover:text-[#fcfdff] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50 shrink-0 ml-2 pointer-events-auto"
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* Modal Body */}
        {submitted ? (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#11ff99] flex items-center justify-center shadow-[0_0_20px_rgba(17,255,153,0.2)]">
              <CheckIcon size={24} />
            </div>

            <div className="space-y-1.5">
              <h4 className="font-serif-headline text-lg text-[#fcfdff]">Report Received</h4>
              <p className="text-xs text-[#888e90] max-w-sm leading-relaxed">
                Thank you for your feedback! It has been securely saved to our database and our team will review it.
              </p>
            </div>

            {/* Direct Contact reminder */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-[#a0a6a8] max-w-sm">
              <p className="text-[11px]">
                For urgent matters, acquisitions, or direct questions:{' '}
                <a
                  href="mailto:sreephaneesha2005@gmail.com"
                  className="text-[#ff7a1a] hover:underline font-mono"
                >
                  sreephaneesha2005@gmail.com
                </a>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-[#fcfdff] hover:bg-[#f1f7fe] text-black font-semibold text-xs transition-all shadow-sm cursor-pointer pointer-events-auto"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs relative z-10 flex-1 no-scrollbar"
          >
            {error && (
              <div className="p-3 bg-[#ff2047]/10 border border-[#ff2047]/30 text-[#ff2047] rounded-xl text-xs flex items-center gap-2 font-mono">
                <TriangleAlertIcon size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-medium text-[#fcfdff]/80 mb-1.5">
                Category <span className="text-[#ff2047]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {reportCategoryValues.map((catKey) => {
                  const cfg = CATEGORY_CONFIG[catKey];
                  const isSelected = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategory(catKey)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 pointer-events-auto select-none ${
                        isSelected
                          ? 'bg-orange-500/15 border-orange-500/40 text-[#fcfdff] shadow-sm ring-1 ring-orange-500/30'
                          : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] text-[#888e90]'
                      }`}
                    >
                      <span className="shrink-0 flex items-center justify-center pointer-events-none">{cfg.icon}</span>
                      <span className="text-xs font-medium truncate pointer-events-none">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Single Unified Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#fcfdff]/80">
                  What happened or what would you like to see? <span className="text-[#ff2047]">*</span>
                </label>
                <span className="text-[10px] font-mono text-[#888e90]">
                  {content.length} / 3000
                </span>
              </div>
              <textarea
                required
                rows={4}
                value={content}
                autoFocus
                onChange={(e) => {
                  setContent(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Share bug details, glitch description, or feature suggestions... Any detail helps!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.10] bg-[#06060a] text-[#fcfdff] placeholder-[#555a5e] focus:outline-none focus:border-orange-500/50 transition-all text-sm resize-none pointer-events-auto"
              />
            </div>

            {/* Direct Contact Banner */}
            <div className="p-3 rounded-xl bg-orange-500/[0.06] border border-orange-500/20 text-xs flex items-start gap-2.5">
              <MailIcon size={15} className="text-[#ff7a1a] shrink-0 mt-0.5 pointer-events-none" />
              <div className="space-y-0.5 min-w-0">
                <p className="text-[#fcfdff] font-medium text-xs">Direct Inquiries & Acquisition</p>
                <p className="text-[11px] text-[#888e90] leading-relaxed">
                  Any issue, acquisition, ownership, or feature inquiry? Contact{' '}
                  <a
                    href="mailto:sreephaneesha2005@gmail.com"
                    className="text-[#ff7a1a] hover:underline font-mono font-medium pointer-events-auto"
                  >
                    sreephaneesha2005@gmail.com
                  </a>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-white/[0.06] flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2 sm:gap-2.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-[#888e90] hover:text-[#fcfdff] rounded-xl hover:bg-white/[0.06] transition-colors disabled:opacity-40 text-center cursor-pointer pointer-events-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold bg-gradient-brand-r hover:brightness-105 text-black rounded-xl transition-all active:scale-[0.98] shadow-brand-glow disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer pointer-events-auto"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border border-black/30 border-t-black rounded-full" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Send Report</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
