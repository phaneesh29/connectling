'use client';

import React from 'react';

interface ReactionBadgeProps {
  emoji?: string;
  className?: string;
}

export function ReactionBadge({ emoji, className = '' }: ReactionBadgeProps) {
  if (!emoji) return null;

  return (
    <div
      className={`animate-reaction-pop bg-[#0a0a0c]/90 border border-white/20 rounded-full px-2 py-0.5 shadow-2xl backdrop-blur-md flex items-center justify-center pointer-events-none z-30 select-none ${className}`}
      aria-label={`Reaction: ${emoji}`}
    >
      <span className="text-xl sm:text-2xl drop-shadow-md leading-none">{emoji}</span>
    </div>
  );
}
