import { create } from 'zustand';
import type { WebinarQuestion } from '@/types/realtime';

export interface WebinarData {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  hostId: string;
  host?: {
    id: string;
    name: string;
    image?: string | null;
  };
  youtubeVideoId?: string | null;
  status: 'scheduled' | 'live' | 'ended';
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  allowChat: boolean;
  allowQa: boolean;
  allowWhiteboard: boolean;
  allowReactions: boolean;
  isHost: boolean;
}

interface WebinarStoreState {
  webinar: WebinarData | null;
  viewerCount: number;
  isWhiteboardActive: boolean;
  questions: WebinarQuestion[];
  activeTab: 'chat' | 'qa';

  // Actions
  setWebinar: (webinar: WebinarData | null) => void;
  updateWebinarDetails: (patch: Partial<WebinarData>) => void;
  setStatus: (status: 'scheduled' | 'live' | 'ended') => void;
  setYoutubeVideoId: (id: string | null) => void;
  setViewerCount: (count: number) => void;
  setIsWhiteboardActive: (active: boolean) => void;
  setQuestions: (questions: WebinarQuestion[]) => void;
  addQuestion: (question: WebinarQuestion) => void;
  updateQuestion: (question: WebinarQuestion) => void;
  setActiveTab: (tab: 'chat' | 'qa') => void;
  reset: () => void;
}

const initialState = {
  webinar: null,
  viewerCount: 0,
  isWhiteboardActive: false,
  questions: [] as WebinarQuestion[],
  activeTab: 'chat' as const,
};

export const useWebinarStore = create<WebinarStoreState>((set) => ({
  ...initialState,

  setWebinar: (webinar) => set({ webinar }),

  updateWebinarDetails: (patch) =>
    set((state) => ({
      webinar: state.webinar ? { ...state.webinar, ...patch } : null,
    })),

  setStatus: (status) =>
    set((state) => ({
      webinar: state.webinar ? { ...state.webinar, status } : null,
    })),

  setYoutubeVideoId: (youtubeVideoId) =>
    set((state) => ({
      webinar: state.webinar ? { ...state.webinar, youtubeVideoId } : null,
    })),

  setViewerCount: (viewerCount) => set({ viewerCount }),

  setIsWhiteboardActive: (isWhiteboardActive) => set({ isWhiteboardActive }),

  setQuestions: (questions) => set({ questions }),

  addQuestion: (question) =>
    set((state) => ({
      questions: [question, ...state.questions.filter((q) => q.id !== question.id)],
    })),

  updateQuestion: (question) =>
    set((state) => ({
      questions: state.questions.map((q) => (q.id === question.id ? question : q)),
    })),

  setActiveTab: (activeTab) => set({ activeTab }),

  reset: () => set(initialState),
}));
