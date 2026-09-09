'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SmileIcon } from 'lucide-react';

export interface ReactionOption {
  emoji: string;
  label: string;
}

export const AVAILABLE_REACTIONS: ReactionOption[] = [
  { emoji: '😂', label: 'Laugh' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🎉', label: 'Party' },
];

interface ReactionPickerProps {
  onSelectReaction: (emoji: string) => void;
  accentColor?: 'orange' | 'amber';
  className?: string;
}

export function ReactionPicker({
  onSelectReaction,
  accentColor = 'orange',
  className = '',
}: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeColorClasses =
    accentColor === 'amber'
      ? 'bg-amber-500/20 text-[#f59e0b] border-amber-500/40 shadow-amber-500/20'
      : 'bg-orange-500/20 text-[#ff7a1a] border-orange-500/40 shadow-orange-500/20';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Floating Reaction Bar Popover (Directly above the button) */}
      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 z-50 flex items-center gap-1.5 p-1.5 bg-[#0e0e12]/95 border border-white/[0.14] rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Send a reaction"
        >
          {AVAILABLE_REACTIONS.map(({ emoji, label }) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelectReaction(emoji);
              }}
              className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/[0.12] active:scale-90 hover:scale-125 transition-all text-2xl select-none cursor-pointer"
              title={label}
              aria-label={label}
            >
              <span className="pointer-events-none drop-shadow-md">{emoji}</span>
            </button>
          ))}

          {/* Bottom Caret indicator */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0e0e12] border-r border-b border-white/[0.14] rotate-45 pointer-events-none" />
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
          isOpen
            ? `${activeColorClasses} border shadow-sm scale-105`
            : 'bg-[#101012] hover:bg-[#18181c] text-[#fcfdff] border border-white/[0.08] hover:border-white/[0.16]'
        }`}
        title="Send Reaction"
        aria-label="Send Reaction"
        aria-expanded={isOpen}
      >
        <SmileIcon size={17} className="transition-transform duration-200" />
      </button>
    </div>
  );
}
