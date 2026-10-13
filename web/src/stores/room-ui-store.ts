import { create } from 'zustand';
import type { RoomParticipant } from '@/types/realtime';

interface RoomUIStoreState {
  participants: RoomParticipant[];
  activeSpeakerId: string | null;
  participantsOpen: boolean;
  settingsOpen: boolean;
  audioMenuOpen: boolean;
  videoMenuOpen: boolean;
  handRaised: boolean;

  setParticipants: (participants: RoomParticipant[]) => void;
  updateParticipant: (peerIdOrUserId: string, updates: Partial<RoomParticipant>) => void;
  setActiveSpeakerId: (id: string | null) => void;
  setParticipantsOpen: (open: boolean) => void;
  toggleParticipantsOpen: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleSettingsOpen: () => void;
  setAudioMenuOpen: (open: boolean) => void;
  setVideoMenuOpen: (open: boolean) => void;
  setHandRaised: (raised: boolean) => void;
  toggleHandRaised: () => void;
  reset: () => void;
}

export const useRoomUIStore = create<RoomUIStoreState>((set) => ({
  participants: [],
  activeSpeakerId: null,
  participantsOpen: false,
  settingsOpen: false,
  audioMenuOpen: false,
  videoMenuOpen: false,
  handRaised: false,

  setParticipants: (participants) => set({ participants }),

  updateParticipant: (peerIdOrUserId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.peerId === peerIdOrUserId || p.userId === peerIdOrUserId
          ? { ...p, ...updates }
          : p
      ),
    })),

  setActiveSpeakerId: (id) => set({ activeSpeakerId: id }),

  setParticipantsOpen: (open) => set({ participantsOpen: open }),
  toggleParticipantsOpen: () => set((s) => ({ participantsOpen: !s.participantsOpen })),

  setSettingsOpen: (open) => set({ settingsOpen: open }),
  toggleSettingsOpen: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

  setAudioMenuOpen: (open) => set({ audioMenuOpen: open }),
  setVideoMenuOpen: (open) => set({ videoMenuOpen: open }),

  setHandRaised: (raised) => set({ handRaised: raised }),
  toggleHandRaised: () => set((s) => ({ handRaised: !s.handRaised })),

  reset: () =>
    set({
      participants: [],
      activeSpeakerId: null,
      participantsOpen: false,
      settingsOpen: false,
      audioMenuOpen: false,
      videoMenuOpen: false,
      handRaised: false,
    }),
}));
