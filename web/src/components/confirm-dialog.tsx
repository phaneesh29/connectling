'use client';

import React, { useEffect } from 'react';
import { TriangleAlertIcon, InfoIcon, XIcon } from '@animateicons/react/lucide';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  alertOnly?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
  alertOnly = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !isLoading) {
        if (onCancel) onCancel();
        else onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel, onConfirm]);

  if (!isOpen) return null;

  const getVariantConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          glow: 'bg-[#ff2047]',
          icon: <TriangleAlertIcon size={16} />,
          iconBox: 'bg-[#ff2047]/10 text-[#ff2047] border-[#ff2047]/20',
          confirmBtn:
            'bg-[#ff2047] hover:bg-[#e0163b] text-white shadow-lg shadow-[#ff2047]/20 active:scale-[0.98]',
        };
      case 'warning':
        return {
          glow: 'bg-[#ffc53d]',
          icon: <TriangleAlertIcon size={16} />,
          iconBox: 'bg-[#ffc53d]/10 text-[#ffc53d] border-[#ffc53d]/20',
          confirmBtn:
            'bg-[#ffc53d] hover:bg-[#e6b035] text-black shadow-lg shadow-[#ffc53d]/20 active:scale-[0.98]',
        };
      case 'primary':
      default:
        return {
          glow: 'bg-[#ff7a1a]',
          icon: <InfoIcon size={16} />,
          iconBox: 'bg-[#ff7a1a]/10 text-[#ff7a1a] border-[#ff7a1a]/20',
          confirmBtn:
            'bg-[#fcfdff] hover:bg-[#f1f7fe] text-black shadow-sm active:scale-[0.98]',
        };
    }
  };

  const { glow, icon, iconBox, confirmBtn } = getVariantConfig();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => {
        if (!isLoading) {
          if (onCancel) onCancel();
          else onConfirm();
        }
      }}
    >
      <div
        className="w-full max-w-md bg-[#0a0a0c] border border-white/[0.12] rounded-2xl overflow-hidden shadow-2xl relative text-[#fcfdff] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 blur-3xl pointer-events-none opacity-25 ${glow}`}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#06060a]/60 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center border shrink-0 ${iconBox}`}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-serif-headline text-base font-normal text-[#fcfdff] tracking-tight">
                {title}
              </h3>
            </div>
          </div>
          {onCancel && !alertOnly && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-[#888e90] hover:text-[#fcfdff] p-1.5 rounded-lg hover:bg-[#101012] transition-colors cursor-pointer disabled:opacity-50"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 relative z-10 space-y-4">
          <p className="text-xs text-[#888e90] leading-relaxed">{description}</p>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
            {!alertOnly && onCancel && (
              <button
                type="button"
                disabled={isLoading}
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium text-[#888e90] hover:text-[#fcfdff] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-medium rounded-xl transition-all flex items-center gap-2 cursor-pointer ${confirmBtn} disabled:opacity-50`}
            >
              {isLoading && (
                <div className="animate-spin h-3 w-3 border border-current/30 border-t-current rounded-full" />
              )}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
