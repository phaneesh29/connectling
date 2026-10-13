import { create } from 'zustand';

interface MediaStoreState {
  isMicOn: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isMirrored: boolean;
  isHandRaised: boolean;

  setMicOn: (on: boolean) => void;
  toggleMic: () => void;
  setVideoOn: (on: boolean) => void;
  toggleVideo: () => void;
  setScreenSharing: (sharing: boolean) => void;
  toggleScreenSharing: () => void;
  setMirrored: (mirrored: boolean) => void;
  toggleMirrored: () => void;
  setHandRaised: (raised: boolean) => void;
  toggleHandRaised: () => void;
  reset: () => void;
}

export const useMediaStore = create<MediaStoreState>((set) => ({
  isMicOn: true,
  isVideoOn: true,
  isScreenSharing: false,
  isMirrored: true,
  isHandRaised: false,

  setMicOn: (isMicOn) => set({ isMicOn }),
  toggleMic: () => set((s) => ({ isMicOn: !s.isMicOn })),

  setVideoOn: (isVideoOn) => set({ isVideoOn }),
  toggleVideo: () => set((s) => ({ isVideoOn: !s.isVideoOn })),

  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  toggleScreenSharing: () => set((s) => ({ isScreenSharing: !s.isScreenSharing })),

  setMirrored: (isMirrored) => set({ isMirrored }),
  toggleMirrored: () => set((s) => ({ isMirrored: !s.isMirrored })),

  setHandRaised: (isHandRaised) => set({ isHandRaised }),
  toggleHandRaised: () => set((s) => ({ isHandRaised: !s.isHandRaised })),

  reset: () =>
    set({
      isMicOn: true,
      isVideoOn: true,
      isScreenSharing: false,
      isMirrored: true,
      isHandRaised: false,
    }),
}));

export const useIsMicOn = () => useMediaStore((s) => s.isMicOn);
export const useIsVideoOn = () => useMediaStore((s) => s.isVideoOn);
export const useIsScreenSharing = () => useMediaStore((s) => s.isScreenSharing);
export const useIsMirrored = () => useMediaStore((s) => s.isMirrored);
export const useIsHandRaised = () => useMediaStore((s) => s.isHandRaised);
