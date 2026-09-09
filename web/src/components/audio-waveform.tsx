'use client';

import React from 'react';

export interface AudioWaveformProps {
  isActive?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'emerald' | 'orange' | 'amber' | 'white';
  barCount?: 3 | 4 | 5;
  volume?: number; // 0 - 100
  frequencyBands?: number[]; // 5 frequency bands (0 - 100 each)
  className?: string;
}

const colorMap = {
  emerald: {
    active: 'bg-[#11ff99] shadow-[0_0_8px_rgba(17,255,153,0.5)]',
    inactive: 'bg-white/20',
  },
  orange: {
    active: 'bg-[#ff7a1a] shadow-[0_0_8px_rgba(255,122,26,0.5)]',
    inactive: 'bg-white/20',
  },
  amber: {
    active: 'bg-[#ffc53d] shadow-[0_0_8px_rgba(255,197,61,0.5)]',
    inactive: 'bg-white/20',
  },
  white: {
    active: 'bg-[#fcfdff] shadow-[0_0_8px_rgba(252,253,255,0.5)]',
    inactive: 'bg-white/20',
  },
};

const sizeConfig = {
  xs: {
    containerHeight: 'h-2.5',
    barWidth: 'w-[2px]',
    barRounded: 'rounded-full',
    gap: 'gap-[1.5px]',
    defaultBars: 3 as const,
  },
  sm: {
    containerHeight: 'h-3.5',
    barWidth: 'w-[2.5px]',
    barRounded: 'rounded-full',
    gap: 'gap-[2px]',
    defaultBars: 4 as const,
  },
  md: {
    containerHeight: 'h-5',
    barWidth: 'w-[3px]',
    barRounded: 'rounded-full',
    gap: 'gap-[2.5px]',
    defaultBars: 5 as const,
  },
  lg: {
    containerHeight: 'h-7',
    barWidth: 'w-[3.5px]',
    barRounded: 'rounded-full',
    gap: 'gap-[3px]',
    defaultBars: 5 as const,
  },
};

const barAnimationClasses = [
  'animate-wave-bar-1',
  'animate-wave-bar-2',
  'animate-wave-bar-3',
  'animate-wave-bar-4',
  'animate-wave-bar-5',
];

export function AudioWaveform({
  isActive = true,
  size = 'sm',
  color = 'emerald',
  barCount,
  volume,
  frequencyBands,
  className = '',
}: AudioWaveformProps) {
  const conf = sizeConfig[size] || sizeConfig.sm;
  const count = barCount ?? conf.defaultBars;
  const activeColor = colorMap[color] || colorMap.emerald;
  const hasLiveLevels = frequencyBands !== undefined || volume !== undefined;

  return (
    <div
      className={`inline-flex items-end justify-center ${conf.containerHeight} ${conf.gap} ${className}`}
      aria-label={isActive ? 'Audio transmitting' : 'Audio silent'}
    >
      {Array.from({ length: count }).map((_, idx) => {
        let liveHeightStyle: React.CSSProperties | undefined;
        let isVoiceDetected = false;

        if (hasLiveLevels && isActive) {
          const rawVal =
            frequencyBands && frequencyBands.length > idx
              ? frequencyBands[idx]
              : volume ?? 0;
          isVoiceDetected = rawVal > 4;

          if (isVoiceDetected) {
            liveHeightStyle = {
              height: `${Math.max(28, Math.min(100, rawVal))}%`,
              transformOrigin: 'bottom',
              transition: 'height 0.08s cubic-bezier(0.2, 0.8, 0.4, 1)',
            };
          }
        }

        const shouldAnimateWave = isActive && !liveHeightStyle;

        return (
          <span
            key={idx}
            className={`inline-block ${conf.barWidth} ${conf.barRounded} ${
              isActive
                ? `${activeColor.active} ${shouldAnimateWave ? barAnimationClasses[idx % barAnimationClasses.length] : ''}`
                : `h-0.5 ${activeColor.inactive}`
            }`}
            style={liveHeightStyle || (isActive ? { transformOrigin: 'bottom' } : undefined)}
          />
        );
      })}
    </div>
  );
}

export interface AudioRippleProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'emerald' | 'orange' | 'amber';
  className?: string;
}

const rippleSizes = {
  sm: 'h-14 w-14',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
};

const rippleBorders = {
  emerald: 'border-emerald-400/35',
  orange: 'border-[#ff7a1a]/35',
  amber: 'border-[#ffc53d]/35',
};

export function AudioRipple({
  isActive = true,
  isSpeaking = true,
  size = 'md',
  color = 'emerald',
  className = '',
}: AudioRippleProps) {
  if (!isActive || !isSpeaking) return null;

  const baseSize = rippleSizes[size] || rippleSizes.md;
  const borderCol = rippleBorders[color] || rippleBorders.emerald;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      <div className={`absolute ${baseSize} rounded-full border-2 ${borderCol} animate-audio-ripple-1`} />
      <div className={`absolute ${baseSize} rounded-full border-2 ${borderCol} animate-audio-ripple-2`} />
      <div className={`absolute ${baseSize} rounded-full border ${borderCol} animate-audio-ripple-3`} />
    </div>
  );
}

export interface AudioTileBadgeProps {
  isActive?: boolean;
  label?: string;
  size?: 'xs' | 'sm';
  color?: 'emerald' | 'orange' | 'amber';
  volume?: number;
  frequencyBands?: number[];
  className?: string;
}

export function AudioTileBadge({
  isActive = true,
  label = 'LIVE',
  size = 'sm',
  color = 'emerald',
  volume,
  frequencyBands,
  className = '',
}: AudioTileBadgeProps) {
  if (!isActive) return null;

  const isSpeaking = volume === undefined ? true : volume > 4;

  return (
    <div
      className={`bg-[#0a0a0c]/85 backdrop-blur-md px-2.5 py-1 rounded-full border transition-all duration-200 ${
        isSpeaking
          ? 'border-[#11ff99]/35 shadow-[0_0_15px_rgba(17,255,153,0.18)] text-[#11ff99]'
          : 'border-white/[0.08] text-[#888e90]'
      } flex items-center gap-1.5 ${className}`}
    >
      <AudioWaveform
        isActive={isActive}
        size={size}
        color={isSpeaking ? color : 'white'}
        volume={volume}
        frequencyBands={frequencyBands}
      />
      {label && (
        <span
          className={`text-[9px] font-mono font-bold tracking-wider uppercase ${
            isSpeaking ? 'text-[#11ff99]' : 'text-[#888e90]'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
