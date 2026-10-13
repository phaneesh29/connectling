'use client';

import React from 'react';
import { useReactionsStore } from '@/stores/reactions-store';

interface ReactionBadgeProps {
  emoji?: string;
  userId?: string;
  className?: string;
}

export const ReactionBadge = React.memo(function ReactionBadge({
  emoji,
  userId,
  className = '',
}: ReactionBadgeProps) {
  const storeEmoji = useReactionsStore((s) =>
    userId ? s.tileReactions[userId]?.emoji : undefined
  );
  const displayEmoji = emoji ?? storeEmoji;

  if (!displayEmoji) return null;

  return (
    <div
      className={`animate-reaction-pop bg-[#0c0c12]/95 border border-[#FF9933]/35 rounded-full px-2 py-0.5 shadow-[0_0_18px_rgba(255,153,51,0.25)] backdrop-blur-md flex items-center justify-center pointer-events-none z-30 select-none ${className}`}
      aria-label={`Reaction: ${displayEmoji}`}
    >
      <span className="text-xl sm:text-2xl drop-shadow-md leading-none">{displayEmoji}</span>
    </div>
  );
});
