import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheckIcon,
  VideoIcon,
  LockIcon,
  ArrowLeftIcon,
  SparklesIcon,
  ChevronDownIcon,
} from '@animateicons/react/lucide';
import { CircleHelp } from 'lucide-react';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://connectling.vercel.app';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers to common questions about Connectling’s privacy-first architecture, peer-to-peer WebRTC video conferences, drop-in voice stages, and zero-data retention policy.',
  alternates: {
    canonical: '/faqs',
  },
  openGraph: {
    title: 'Frequently Asked Questions | Connectling',
    description:
      'Learn how Connectling provides encrypted WebRTC video calls and drop-in audio stages with zero recordings and zero persistent data retention.',
    url: '/faqs',
  },
};

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  badge: string;
  icon: typeof ShieldCheckIcon;
  items: FaqItem[];
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: 'Privacy & Zero-Data Architecture',
    badge: '100% Ephemeral',
    icon: ShieldCheckIcon,
    items: [
      {
        question: 'How does Connectling ensure private meetings with zero recordings?',
        answer:
          'Connectling is engineered from the ground up with a strict zero-data retention architecture. All video streams and audio stages route peer-to-peer using encrypted WebRTC with DTLS-SRTP protocols. We never record calls, store persistent transcripts, or log conversation contents to disk. Once you close the tab, all media streams evaporate immediately.',
      },
      {
        question: 'What happens to a room after a meeting concludes?',
        answer:
          'All spaces are completely ephemeral with an automatic 24-hour expiration window. Once the space host ends a room or the 24-hour lifetime elapses, the room record, temporary active state, and in-memory chat histories are permanently destroyed with zero residual logs.',
      },
      {
        question: 'Are text messages or chat transcripts saved after calls?',
        answer:
          'No. In-call chat messages are stored exclusively in volatile server memory for the duration of the active session. When the last participant leaves or the space is closed, all chat buffers are wiped clean. We do not maintain any persistent database of user conversations.',
      },
    ],
  },
  {
    title: 'Video Meetings & Voice Lounges',
    badge: 'P2P WebRTC',
    icon: VideoIcon,
    items: [
      {
        question: 'How does Connectling compare to Zoom, Google Meet, or Clubhouse?',
        answer:
          'Unlike Zoom or Microsoft Teams that require desktop client installations, paid cloud recording add-ons, and persistent user profiling, Connectling runs completely in your web browser with zero-install instant sharing links. Additionally, Connectling combines drop-in audio lounge stages (similar to Clubhouse) with encrypted HD video conferencing in one privacy-first platform.',
      },
      {
        question: 'What are the capacity limits for video meetings and audio lounges?',
        answer:
          'Video spaces support up to 6 concurrent high-definition video feeds with screen sharing, engineered for ultra-low latency team standups and private consultations. Voice rooms accommodate up to 16 active stage participants with moderation controls (speaker permission grants, mic muting, and hand raising).',
      },
      {
        question: 'Does Connectling support screen sharing and audio device selection?',
        answer:
          'Yes. Connectling provides crisp, high-framerate screen sharing for product demos, code reviews, and presentations. You can also customize your microphone, camera, and speaker outputs anytime directly from the in-room device settings menu.',
      },
    ],
  },
  {
    title: 'Access, Security & Moderation',
    badge: 'Zero Friction',
    icon: LockIcon,
    items: [
      {
        question: 'Do attendees need an account or credit card to join a space?',
        answer:
          'No payment or credit card is ever required — Connectling is 100% free. Space creators sign in with Google to host and moderate rooms, while participants can seamlessly drop in via your shared link or room ID without friction.',
      },
      {
        question: 'Can spaces be password-protected against unwanted visitors?',
        answer:
          'Yes. When launching either a video meeting or voice lounge, hosts can configure an optional alphanumeric passcode. Anyone joining the space must supply the correct passcode before being admitted to the live session.',
      },
      {
        question: 'What moderation tools do hosts have during live sessions?',
        answer:
          'Space hosts have full moderation powers: they can mute individual participants, ask attendees to unmute, grant stage speaking rights in voice rooms, kick disruptive users, or transfer host status to another participant before leaving.',
      },
    ],
  },
];

const ARCHITECTURE_FEATURES = [
  {
    title: 'Peer-to-Peer Encrypted WebRTC',
    description:
      'Direct browser-to-browser media streaming with DTLS-SRTP encryption, sub-second latency, and lossless crystal-clear screen sharing.',
    badge: 'End-to-End Encrypted',
  },
  {
    title: 'Zero Data Retention Architecture',
    description:
      'We do not record calls, store persistent transcripts, or keep historical activity logs on our servers. Your conversations stay strictly in the room.',
    badge: '100% Private',
  },
  {
    title: '24-Hour Ephemeral Lifespan',
    description:
      'Every space automatically self-destructs after 24 hours. Rooms can be password-protected or moderated in real time by the space host.',
    badge: 'Auto Self-Destruct',
  },
];

const allFaqItems = FAQ_CATEGORIES.flatMap((c) => c.items);

const faqPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${siteUrl}/faqs#faq`,
  mainEntity: allFaqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function FaqsPage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-4 sm:px-6 bg-black ambient-glow-meet text-[#fcfdff]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
      />

      <div className="max-w-3xl mx-auto space-y-12">
        {/* Top Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-[#888e90] hover:text-[#fcfdff] p-2 -ml-2 rounded-lg hover:bg-white/[0.05] transition-all"
          >
            <ArrowLeftIcon size={14} />
            <span>Back to Spaces</span>
          </Link>
        </div>

        {/* Header */}
        <header className="space-y-4 border-b border-white/[0.10] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-[#ff7a1a]">
            <CircleHelp size={13} />
            <span>Help Center &amp; Knowledge Base</span>
          </div>

          <h1 className="font-serif-headline text-3xl sm:text-5xl font-normal tracking-tight text-[#fcfdff]">
            Frequently Asked Questions
          </h1>

          <p className="text-[#888e90] text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
            Everything you need to know about Connectling’s privacy-first architecture, peer-to-peer WebRTC video conferences, drop-in voice stages, and zero-data retention.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-[#888e90] font-mono">
            <span>Last Updated: October 2026</span>
            <span>•</span>
            <span className="text-[#ff7a1a]">Zero-Telemetry Standard</span>
          </div>
        </header>

        {/* Architecture & Zero-Data Highlights */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-medium text-[#fcfdff]">
              Engineered for Zero Surveillance
            </h2>
            <p className="text-xs text-[#888e90]">
              The core architectural principles underpinning Connectling’s private conferences and voice stages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ARCHITECTURE_FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="p-5 rounded-2xl border border-white/[0.08] bg-[#0a0a0c] space-y-3 relative group hover:border-white/[0.18] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#FF9933]">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#fcfdff]">
                  {feat.title}
                </h3>
                <p className="text-xs text-[#888e90] leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Category Accordions */}
        <div className="space-y-10">
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <section key={cat.title} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#ff7a1a]">
                      <Icon size={14} />
                    </div>
                    <h2 className="text-base sm:text-lg font-medium text-[#fcfdff]">
                      {cat.title}
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#888e90]">
                    {cat.badge}
                  </span>
                </div>

                <div className="space-y-3">
                  {cat.items.map((item, idx) => (
                    <details
                      key={idx}
                      className="group rounded-2xl border border-white/[0.08] bg-[#0a0a0c] overflow-hidden transition-all duration-200 open:border-white/[0.18]"
                    >
                      <summary className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer list-none select-none hover:bg-white/[0.02] transition-colors">
                        <span className="text-xs sm:text-sm font-medium text-[#fcfdff] group-open:text-[#ff7a1a] transition-colors">
                          {item.question}
                        </span>
                        <ChevronDownIcon
                          size={15}
                          className="text-[#888e90] shrink-0 transition-transform duration-200 group-open:rotate-180 group-open:text-[#ff7a1a]"
                        />
                      </summary>
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-[#888e90] leading-relaxed border-t border-white/[0.04] pt-3">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Bottom CTA Card */}
        <section className="relative overflow-hidden p-6 sm:p-8 rounded-2xl border border-white/[0.12] bg-[#0a0a0c] text-center space-y-4 glow-card mt-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-brand-br opacity-20 blur-3xl pointer-events-none" />
          <div className="max-w-xl mx-auto space-y-2 relative z-10">
            <h2 className="font-serif-headline text-xl sm:text-2xl font-normal text-[#fcfdff] tracking-tight">
              Ready to start your next private conversation?
            </h2>
            <p className="text-xs text-[#888e90] leading-relaxed">
              Launch an instant encrypted video conference or drop-in voice stage in seconds. No credit card required, zero recordings stored.
            </p>
          </div>
          <div className="relative z-10 pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-brand-r hover:brightness-105 text-black font-semibold text-xs rounded-xl transition-all shadow-brand-glow active:scale-[0.98]"
            >
              <SparklesIcon size={14} />
              <span>Launch a Space</span>
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center gap-2 px-5 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.10] text-[#fcfdff] font-medium text-xs rounded-xl transition-all"
            >
              <span>View Privacy Commitments</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
