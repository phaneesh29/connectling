'use client';

import React from 'react';
import type { RoomReaction } from '@/types/realtime';

interface FloatingReactionsProps {
  reactions: RoomReaction[];
}

const FLOAT_ANIMATION_CLASSES = [
  'animate-reaction-float-1',
  'animate-reaction-float-2',
  'animate-reaction-float-3',
  'animate-reaction-float-4',
];

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 right-4 sm:right-10 pointer-events-none z-50 w-52 sm:w-72 h-[450px] overflow-visible"
      aria-hidden="true"
    >
      <div className="relative w-full h-full">
        {reactions.map((r, index) => {
          // Deterministic horizontal jitter & trajectory variant based on reaction ID
          const seed =
            r.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + index * 23;
          const leftPercent = 10 + (seed % 65); // 10% to 75%
          const animClass = FLOAT_ANIMATION_CLASSES[seed % FLOAT_ANIMATION_CLASSES.length];

          return (
            <div
              key={r.id}
              className={`absolute bottom-0 flex flex-col items-center gap-1.5 ${animClass}`}
              style={{
                left: `${leftPercent}%`,
              }}
            >
              <span className="text-4xl sm:text-5xl filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] select-none">
                {r.emoji}
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#0a0a0c]/90 border border-white/20 text-[#fcfdff] shadow-xl backdrop-blur-md whitespace-nowrap max-w-[110px] truncate">
                {r.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
