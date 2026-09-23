const MEET_CURATED = [
  'Core Architecture Sync',
  'Product Roadmap Review',
  'Engineering Team Huddle',
  'Sprint Retro & Planning',
  'Design Systems Workshop',
  'UX & Wireframe Critique',
  'Founders Standup & Catch-up',
  'AI Systems Deep Dive',
  'Frontend Architecture Jam',
  'Quarterly Strategy War Room',
  'API Contract Review',
  'Launch Readiness Check',
  'Performance Tuning Lounge',
  'Cross-Functional Sync',
  'Rapid Prototyping Lab',
  'Security & Infrastructure Review',
  'Customer Feedback Review',
  'Demo Day Prep Session',
];

const MEET_ADJECTIVES = [
  'Agile',
  'Focus',
  'Swift',
  'Prime',
  'Stellar',
  'Zen',
  'Nova',
  'Hyper',
  'Nexus',
  'Vibrant',
  'Apex',
  'Matrix',
  'Pulse',
  'Quantum',
];

const MEET_DOMAINS = [
  'Product',
  'Tech',
  'Design',
  'Platform',
  'Frontend',
  'Backend',
  'AI',
  'Cloud',
  'Data',
  'Systems',
  'Growth',
];

const MEET_FORMATS = [
  'Sync',
  'Huddle',
  'War Room',
  'Review',
  'Workshop',
  'Retro',
  'Standup',
  'Sprint',
  'Alignment',
  'Lab',
];

const TALK_CURATED = [
  'Late Night Tech Talk',
  'Friday Open Mic & Chill',
  'Coffee & Code Banter',
  'Indie Hackers Roundtable',
  'Startup War Stories',
  'Ambient Flow & Work Jam',
  'AI Frontiers Fireside',
  'DevOps Horror Stories',
  'Deep Thoughts & Hot Takes',
  'Designers Lounge & AMAs',
  'Weekend Builders Circle',
  'Show & Tell Live Stage',
  'Pitch Practice Lounge',
  'Midnight Coding Lounge',
  'Casual Community Hangout',
  'Global Creators Stage',
  'Tech Radar & Speculations',
  'Product Hunters Hangout',
];

const TALK_VIBES = [
  'Late Night',
  'Friday',
  'Weekend',
  'Midnight',
  'Casual',
  'Ambient',
  'Open',
  'Deep',
  'Global',
  'Future',
  'Indie',
];

const TALK_TOPICS = [
  'Code',
  'Startup',
  'Builders',
  'Design',
  'Tech',
  'AI',
  'Creators',
  'Hot Takes',
  'Product',
  'Culture',
];

const TALK_FORMATS = [
  'Lounge',
  'Roundtable',
  'Open Mic',
  'Fireside',
  'Stage',
  'Jam',
  'Banter',
  'Circle',
  'Hangout',
  'Radio',
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateSingleName(type: 'meet' | 'audio'): string {
  const useCurated = Math.random() < 0.55;

  if (type === 'meet') {
    if (useCurated) {
      return pickRandom(MEET_CURATED);
    }
    return `${pickRandom(MEET_ADJECTIVES)} ${pickRandom(MEET_DOMAINS)} ${pickRandom(MEET_FORMATS)}`;
  }

  // type === 'audio'
  if (useCurated) {
    return pickRandom(TALK_CURATED);
  }
  return `${pickRandom(TALK_VIBES)} ${pickRandom(TALK_TOPICS)} ${pickRandom(TALK_FORMATS)}`;
}

/**
 * Generate a random title for a space (meeting or audio stage).
 * Avoids returning the exact currentTitle to ensure clicking gives a new suggestion each time.
 */
export function generateRandomRoomTitle(
  type: 'meet' | 'audio',
  currentTitle?: string
): string {
  let candidate = generateSingleName(type);
  let attempts = 0;

  while (candidate === currentTitle && attempts < 10) {
    candidate = generateSingleName(type);
    attempts++;
  }

  return candidate;
}
