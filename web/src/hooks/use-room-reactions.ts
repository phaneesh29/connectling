'use client';

import { useState, useCallback } from 'react';
import type { RoomReaction } from '@/types/realtime';

export function useRoomReactions() {
  const [floatingReactions, setFloatingReactions] = useState<RoomReaction[]>([]);
  const [tileReactions, setTileReactions] = useState<Record<string, { emoji: string; id: string }>>({});

  const handleIncomingReaction = useCallback((reaction: RoomReaction) => {
    setFloatingReactions((prev) => [...prev, reaction]);

    setTileReactions((prev) => ({
      ...prev,
      [reaction.userId]: { emoji: reaction.emoji, id: reaction.id },
    }));

    // Auto-cleanup floating reaction
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2800);

    // Auto-cleanup tile reaction
    setTimeout(() => {
      setTileReactions((prev) => {
        if (prev[reaction.userId]?.id === reaction.id) {
          const copy = { ...prev };
          delete copy[reaction.userId];
          return copy;
        }
        return prev;
      });
    }, 2800);
  }, []);

  return {
    floatingReactions,
    tileReactions,
    handleIncomingReaction,
  };
}
