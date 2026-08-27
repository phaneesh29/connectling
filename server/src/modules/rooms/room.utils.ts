import crypto from 'node:crypto';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export const generateRoomCode = (): string => {
  const bytes = crypto.randomBytes(10);
  let raw = '';
  for (let i = 0; i < 10; i++) {
    raw += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 10)}`;
};

export const normalizeRoomCode = (code: string): string => {
  return code.trim().toLowerCase();
};
