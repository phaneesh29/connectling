'use client';

import React from 'react';

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  dotColor?: string;
  position?: 'bottom' | 'top';
  className?: string;
}

export function Tooltip({
  children,
  content,
  dotColor,
  position = 'bottom',
  className = '',
}: TooltipProps) {
  return (
    <div className={`relative group shrink-0 ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`absolute left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 bg-[#141418] border border-white/[0.15] text-[#fcfdff] text-[11px] font-sans rounded-lg shadow-2xl whitespace-nowrap pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150 ${
          position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
        }`}
      >
        {/* Arrow pointing at the trigger button from the middle */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-[#141418] rotate-45 pointer-events-none ${
            position === 'bottom'
              ? '-top-1 border-t border-l border-white/[0.15]'
              : '-bottom-1 border-b border-r border-white/[0.15]'
          }`}
        />

        {dotColor && (
          <span
            className={`relative z-10 h-1.5 w-1.5 rounded-full ${dotColor} animate-pulse shrink-0`}
          />
        )}
        <span className="relative z-10">{content}</span>
      </div>
    </div>
  );
}
