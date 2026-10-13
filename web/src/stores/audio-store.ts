import { create } from 'zustand';

export interface PeerAudioLevel {
  volume: number;
  isSpeaking: boolean;
}

interface AudioStoreState {
  localVolume: number;
  isLocalSpeaking: boolean;
  localFrequencyBands: number[];
  peerAudioLevels: Record<string, PeerAudioLevel>;

  setLocalAudio: (volume: number, isSpeaking: boolean, frequencyBands: number[]) => void;
  setPeerAudioLevels: (levels: Record<string, PeerAudioLevel>) => void;
  setPeerAudioLevel: (peerId: string, level: PeerAudioLevel) => void;
  reset: () => void;
}

const DEFAULT_FREQUENCY_BANDS = [0, 0, 0, 0, 0];

export const useAudioStore = create<AudioStoreState>((set) => ({
  localVolume: 0,
  isLocalSpeaking: false,
  localFrequencyBands: DEFAULT_FREQUENCY_BANDS,
  peerAudioLevels: {},

  setLocalAudio: (volume, isSpeaking, frequencyBands) =>
    set((state) => {
      // Fast path: avoid state trigger if volume is 0 and was already 0 and not speaking
      if (
        volume === 0 &&
        state.localVolume === 0 &&
        !isSpeaking &&
        !state.isLocalSpeaking &&
        state.localFrequencyBands === DEFAULT_FREQUENCY_BANDS
      ) {
        return state;
      }
      return {
        localVolume: volume,
        isLocalSpeaking: isSpeaking,
        localFrequencyBands: frequencyBands,
      };
    }),

  setPeerAudioLevels: (levels) =>
    set((state) => {
      const keys = Object.keys(levels);
      const prevKeys = Object.keys(state.peerAudioLevels);
      if (
        keys.length === prevKeys.length &&
        keys.every(
          (k) =>
            state.peerAudioLevels[k]?.volume === levels[k]?.volume &&
            state.peerAudioLevels[k]?.isSpeaking === levels[k]?.isSpeaking
        )
      ) {
        return state;
      }
      return { peerAudioLevels: levels };
    }),

  setPeerAudioLevel: (peerId, level) =>
    set((state) => {
      const current = state.peerAudioLevels[peerId];
      if (current?.volume === level.volume && current?.isSpeaking === level.isSpeaking) {
        return state;
      }
      return {
        peerAudioLevels: {
          ...state.peerAudioLevels,
          [peerId]: level,
        },
      };
    }),

  reset: () =>
    set({
      localVolume: 0,
      isLocalSpeaking: false,
      localFrequencyBands: DEFAULT_FREQUENCY_BANDS,
      peerAudioLevels: {},
    }),
}));

// Granular selector hooks to minimize re-renders
export const useIsLocalSpeaking = () => useAudioStore((s) => s.isLocalSpeaking);
export const useLocalAudioVolume = () => useAudioStore((s) => s.localVolume);
export const useLocalFrequencyBands = () => useAudioStore((s) => s.localFrequencyBands);
export const usePeerAudioLevel = (peerId?: string) =>
  useAudioStore((s) => (peerId ? s.peerAudioLevels[peerId] : undefined));
export const usePeerIsSpeaking = (peerId?: string) =>
  useAudioStore((s) => Boolean(peerId && s.peerAudioLevels[peerId]?.isSpeaking));
