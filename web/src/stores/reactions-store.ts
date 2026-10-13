import { create } from 'zustand';
import type { RoomReaction } from '@/types/realtime';

interface ReactionsStoreState {
  floatingReactions: RoomReaction[];
  tileReactions: Record<string, { emoji: string; id: string }>;

  addReaction: (reaction: RoomReaction) => void;
  removeFloatingReaction: (id: string) => void;
  removeTileReaction: (userId: string, id: string) => void;
  reset: () => void;
}

// Active timeouts set for clean memory reclamation
const activeTimers = new Set<ReturnType<typeof setTimeout>>();

const safeTimeout = (fn: () => void, ms: number): ReturnType<typeof setTimeout> => {
  const timer = setTimeout(() => {
    activeTimers.delete(timer);
    fn();
  }, ms);
  activeTimers.add(timer);
  return timer;
};

const clearAllTimers = () => {
  activeTimers.forEach((t) => clearTimeout(t));
  activeTimers.clear();
};

export const useReactionsStore = create<ReactionsStoreState>((set, get) => ({
  floatingReactions: [],
  tileReactions: {},

  addReaction: (reaction: RoomReaction) => {
    set((state) => ({
      floatingReactions: [...state.floatingReactions, reaction],
      tileReactions: {
        ...state.tileReactions,
        [reaction.userId]: { emoji: reaction.emoji, id: reaction.id },
      },
    }));

    // Auto-cleanup floating reaction safely
    safeTimeout(() => {
      get().removeFloatingReaction(reaction.id);
    }, 3600);

    // Auto-cleanup tile reaction safely
    safeTimeout(() => {
      get().removeTileReaction(reaction.userId, reaction.id);
    }, 2800);
  },

  removeFloatingReaction: (id: string) => {
    set((state) => ({
      floatingReactions: state.floatingReactions.filter((r) => r.id !== id),
    }));
  },

  removeTileReaction: (userId: string, id: string) => {
    set((state) => {
      if (state.tileReactions[userId]?.id === id) {
        const next = { ...state.tileReactions };
        delete next[userId];
        return { tileReactions: next };
      }
      return state;
    });
  },

  reset: () => {
    clearAllTimers();
    set({
      floatingReactions: [],
      tileReactions: {},
    });
  },
}));
