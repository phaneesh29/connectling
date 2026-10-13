import { create } from 'zustand';

export interface WhiteboardState {
  isOpen: boolean;
  elements: readonly unknown[];
  appState: Record<string, unknown> | null;

  // Actions
  setIsOpen: (isOpen: boolean) => void;
  setElements: (elements: readonly unknown[]) => void;
  setAppState: (appState: Record<string, unknown> | null) => void;
  syncState: (payload: {
    isOpen?: boolean;
    elements?: readonly unknown[];
    appState?: Record<string, unknown> | null;
  }) => void;
  reset: () => void;
}

const initialState = {
  isOpen: false,
  elements: [] as readonly unknown[],
  appState: null as Record<string, unknown> | null,
};

export const useWhiteboardStore = create<WhiteboardState>((set) => ({
  ...initialState,

  setIsOpen: (isOpen) => set({ isOpen }),
  setElements: (elements) => set({ elements }),
  setAppState: (appState) => set({ appState }),
  syncState: (payload) =>
    set((state) => ({
      isOpen: typeof payload.isOpen === 'boolean' ? payload.isOpen : state.isOpen,
      elements: Array.isArray(payload.elements) ? payload.elements : state.elements,
      appState: payload.appState !== undefined ? payload.appState : state.appState,
    })),
  reset: () => set(initialState),
}));
