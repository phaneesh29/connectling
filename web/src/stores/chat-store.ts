import { create } from 'zustand';
import type { ChatMessage } from '@/types/realtime';

interface ChatStoreState {
  isOpen: boolean;
  messages: ChatMessage[];
  unreadCount: number;

  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  markAllRead: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  isOpen: false,
  messages: [],
  unreadCount: 0,

  setIsOpen: (isOpen) =>
    set((state) => ({
      isOpen,
      unreadCount: isOpen ? 0 : state.unreadCount,
    })),

  toggleOpen: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      unreadCount: !state.isOpen ? 0 : state.unreadCount,
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
    })),

  setMessages: (messages) => set({ messages }),

  markAllRead: () => set({ unreadCount: 0 }),

  reset: () =>
    set({
      isOpen: false,
      messages: [],
      unreadCount: 0,
    }),
}));
