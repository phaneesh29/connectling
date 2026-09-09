'use client';

import React from 'react';
import type { RoomReaction } from '@/types/realtime';

interface FloatingReactionsProps {
  reactions: RoomReaction[];
}

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-24 pointer-events-none z-50 flex flex-col items-end sm:items-center px-6 overflow-hidden max-h-[400px]"
      aria-hidden="true"
    >
      <div className="relative w-full max-w-lg h-64">
        {reactions.map((r, index) => {
          // Deterministic horizontal jitter based on ID
          const seed = r.id.charCodeAt(0) + (r.id.charCodeAt(r.id.length - 1) || 0) + index * 17;
          const leftPercent = 40 + (seed % 35); // 40% to 75%

          return (
            <div
              key={r.id}
              className="absolute bottom-2 flex flex-col items-center gap-1 animate-reaction-float"
              style={{
                left: `${leftPercent}%`,
              }}
            >
              <span className="text-3xl sm:text-4xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] select-none">
                {r.emoji}
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#0a0a0c]/85 border border-white/15 text-[#fcfdff] shadow-lg backdrop-blur-md whitespace-nowrap max-w-[100px] truncate">
                {r.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
