'use client';

import React, { useState } from 'react';
import type { WebinarQuestion } from '@/types/realtime';
import { ThumbsUp, CheckCircle, HelpCircle, Send, Sparkles } from 'lucide-react';

interface WebinarQaProps {
  questions: WebinarQuestion[];
  currentUserId?: string;
  isHost?: boolean;
  onAskQuestion: (text: string) => void;
  onUpvoteQuestion: (questionId: string) => void;
  onAnswerQuestion: (questionId: string) => void;
}

export const WebinarQa = React.memo(function WebinarQa({
  questions,
  currentUserId,
  isHost = false,
  onAskQuestion,
  onUpvoteQuestion,
  onAnswerQuestion,
}: WebinarQaProps) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onAskQuestion(inputText.trim());
    setInputText('');
  };

  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.isAnswered !== b.isAnswered) {
      return a.isAnswered ? 1 : -1;
    }
    return b.upvotes - a.upvotes;
  });

  return (
    <div className="flex flex-col h-full bg-[#06060a] text-[#fcfdff]">
      {/* Header Info */}
      <div className="px-4 py-3 border-b border-white/[0.06] bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#FF9933]" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#fcfdff]">
            Q&A ({questions.length})
          </span>
        </div>
        <span className="text-[11px] text-[#888e90] font-mono">
          {sortedQuestions.filter((q) => !q.isAnswered).length} Unanswered
        </span>
      </div>

      {/* Questions Scrollable Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {sortedQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-[#888e90]">
            <Sparkles className="w-8 h-8 mb-2 text-[#888e90]/60" />
            <p className="text-xs font-medium text-[#fcfdff]">No questions yet</p>
            <p className="text-[11px] text-[#888e90] mt-0.5">
              Be the first to ask the host a question!
            </p>
          </div>
        ) : (
          sortedQuestions.map((q) => {
            const hasUpvoted = Boolean(currentUserId && q.upvotedBy?.includes(currentUserId));

            return (
              <div
                key={q.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  q.isAnswered
                    ? 'bg-[#0f0f14]/40 border-white/[0.04] opacity-65'
                    : 'bg-[#0f0f14]/80 hover:bg-[#14141c] border-white/[0.08] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#FF9933]/15 border border-[#FF9933]/30 flex items-center justify-center text-[10px] font-bold text-[#FF9933]">
                      {q.userName ? q.userName[0].toUpperCase() : 'A'}
                    </div>
                    <span className="text-xs font-medium text-[#fcfdff]">{q.userName}</span>
                  </div>

                  {q.isAnswered && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-[#11ff99] bg-[#11ff99]/10 px-2 py-0.5 rounded-md border border-[#11ff99]/25">
                      <CheckCircle className="w-3 h-3" /> Answered
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#fcfdff]/85 leading-relaxed mb-3">{q.text}</p>

                <div className="flex items-center justify-between pt-1">
                  {/* Upvote Button */}
                  <button
                    type="button"
                    onClick={() => onUpvoteQuestion(q.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      hasUpvoted
                        ? 'bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/40 font-semibold shadow-sm'
                        : 'bg-[#101012] hover:bg-[#18181c] text-[#888e90] hover:text-[#fcfdff] border border-white/[0.08]'
                    }`}
                    title="Upvote question"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="font-mono text-[11px]">{q.upvotes}</span>
                  </button>

                  {/* Host Action: Mark Answered */}
                  {isHost && !q.isAnswered && (
                    <button
                      type="button"
                      onClick={() => onAnswerQuestion(q.id)}
                      className="flex items-center gap-1 text-[11px] font-mono text-[#11ff99] bg-[#11ff99]/10 hover:bg-[#11ff99]/20 border border-[#11ff99]/25 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Answered
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ask Question Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.06] bg-[#06060a]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a question..."
            maxLength={300}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-[#fcfdff] placeholder-[#888e90] focus:outline-none focus:border-[#FF9933]/50 focus:ring-1 focus:ring-[#FF9933]/30 font-sans pr-10 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-1.5 p-1.5 rounded-lg text-[#888e90] hover:text-[#FF9933] disabled:opacity-30 disabled:hover:text-[#888e90] transition-colors cursor-pointer"
            title="Submit question"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
});
