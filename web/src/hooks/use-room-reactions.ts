'use client';

import { useCallback, useEffect } from 'react';
import { useReactionsStore } from '@/stores/reactions-store';
import type { RoomReaction } from '@/types/realtime';

export function useRoomReactions() {
  const floatingReactions = useReactionsStore((s) => s.floatingReactions);
  const tileReactions = useReactionsStore((s) => s.tileReactions);

  const handleIncomingReaction = useCallback((reaction: RoomReaction) => {
    useReactionsStore.getState().addReaction(reaction);
  }, []);

  useEffect(() => {
    return () => {
      useReactionsStore.getState().reset();
    };
  }, []);

  return {
    floatingReactions,
    tileReactions,
    handleIncomingReaction,
  };
}
