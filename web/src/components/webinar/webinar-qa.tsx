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
    <div className="flex flex-col h-full bg-[#0a0a0e] text-white">
      {/* Header Info */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#FF9933]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Q&A ({questions.length})
          </span>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">
          {sortedQuestions.filter((q) => !q.isAnswered).length} Unanswered
        </span>
      </div>

      {/* Questions Scrollable Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500">
            <Sparkles className="w-8 h-8 mb-2 text-zinc-600" />
            <p className="text-xs font-medium text-zinc-400">No questions yet</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
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
                    ? 'bg-zinc-900/30 border-white/[0.04] opacity-65'
                    : 'bg-[#121218] border-white/[0.08] hover:border-white/[0.14]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#FF9933] to-[#138808] flex items-center justify-center text-[10px] font-bold text-black">
                      {q.userName ? q.userName[0].toUpperCase() : 'A'}
                    </div>
                    <span className="text-xs font-medium text-zinc-300">{q.userName}</span>
                  </div>

                  {q.isAnswered && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" /> Answered
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-200 leading-relaxed mb-3">{q.text}</p>

                <div className="flex items-center justify-between pt-1">
                  {/* Upvote Button */}
                  <button
                    onClick={() => onUpvoteQuestion(q.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      hasUpvoted
                        ? 'bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30 font-semibold'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                    }`}
                    title="Upvote question"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{q.upvotes}</span>
                  </button>

                  {/* Host Action: Mark Answered */}
                  {isHost && !q.isAnswered && (
                    <button
                      onClick={() => onAnswerQuestion(q.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-md hover:bg-emerald-500/10 transition-colors cursor-pointer"
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
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.08] bg-[#0c0c12]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask a question..."
            maxLength={300}
            className="w-full bg-[#16161e] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF9933] pr-10"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 p-1.5 rounded-lg text-zinc-400 hover:text-[#FF9933] disabled:opacity-40 disabled:hover:text-zinc-400 transition-colors cursor-pointer"
            title="Submit question"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
});
