// A mesh shares one uplink across all outgoing copies of the video.
export const VIDEO_PROFILES = [
  { height: 180, width: 320, frameRate: 12, bitrate: 180_000 },
  { height: 360, width: 640, frameRate: 15, bitrate: 400_000 },
  { height: 540, width: 960, frameRate: 24, bitrate: 800_000 },
  { height: 720, width: 1280, frameRate: 30, bitrate: 1_400_000 },
  { height: 1080, width: 1920, frameRate: 30, bitrate: 2_500_000 },
] as const;

export function profileForBitrate(bitrate: number): number {
  let profile = 0;
  VIDEO_PROFILES.forEach((value, index) => {
    if (bitrate >= value.bitrate) profile = index;
  });
  return profile;
}

export function meshVideoBudget(peerCount: number, availableUplink = 3_000_000): number {
  const count = Math.max(1, peerCount);
  return Math.max(0, Math.min(2_500_000, (availableUplink * 0.75 - count * 64_000) / count));
}

export function nextVideoProfile(current: number, desired: number, healthySamples: number) {
  if (desired < current) return { profile: desired, healthySamples: 0 };
  if (desired === current) return { profile: current, healthySamples: 0 };
  const samples = healthySamples + 1;
  return samples >= 3
    ? { profile: current + 1, healthySamples: 0 }
    : { profile: current, healthySamples: samples };
}
