'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { ChatMessage } from '@/types/realtime';
import { MessageSquareIcon, SendIcon, XIcon } from '@animateicons/react/lucide';

interface InRoomChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUserId: string;
  roomTitle?: string;
}

export function InRoomChat({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentUserId,
  roomTitle,
}: InRoomChatProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-88 md:w-96 bg-[#0a0a0e]/95 backdrop-blur-2xl border-l border-white/[0.12] shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Top Header */}
      <div className="h-14 px-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-[#fcfdff]">
            <MessageSquareIcon size={14} />
          </div>
          <div>
            <h3 className="text-xs font-medium text-[#fcfdff]">In-Call Messages</h3>
            <p className="text-[10px] text-[#888e90] font-mono truncate max-w-[170px]">
              {roomTitle || 'Active Space'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.08] flex items-center justify-center text-[#888e90] hover:text-[#fcfdff] transition-all"
          title="Close chat"
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* Ephemeral Notice */}
      <div className="px-4 py-2 bg-blue-500/[0.08] border-b border-blue-500/20 text-[10px] text-[#3b9eff] flex items-center gap-2 shrink-0 font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-[#3b9eff] animate-pulse" />
        <span>Temporary in-memory chat • Cleared on exit</span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-60">
            <div className="h-10 w-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#888e90]">
              <MessageSquareIcon size={18} />
            </div>
            <p className="text-xs text-[#fcfdff] font-medium">No messages yet</p>
            <p className="text-[11px] text-[#888e90] max-w-[200px]">
              Messages sent here are visible to everyone in the room and will vanish when you leave.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const userInitial = msg.name ? msg.name.trim().charAt(0).toUpperCase() : 'U';

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isMe && (
                  <div className="shrink-0 mt-0.5">
                    {msg.image ? (
                      <Image
                        src={msg.image}
                        alt={msg.name}
                        width={24}
                        height={24}
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full object-cover border border-white/20"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-medium text-[#fcfdff]">
                        {userInitial}
                      </div>
                    )}
                  </div>
                )}

                <div className={`space-y-1 max-w-[80%] ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#888e90] px-1 font-mono">
                    <span className="font-medium text-[#fcfdff]">{isMe ? 'You' : msg.name}</span>
                    <span>•</span>
                    <span>{timeStr}</span>
                  </div>

                  <div
                    className={`p-2.5 rounded-2xl text-xs break-words leading-relaxed ${
                      isMe
                        ? 'bg-blue-600/20 text-[#fcfdff] border border-blue-500/30 rounded-tr-sm'
                        : 'bg-white/[0.06] text-[#fcfdff] border border-white/[0.10] rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-white/[0.08] bg-[#06060a] flex items-center gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Send a message to everyone..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.10] text-xs text-[#fcfdff] placeholder-[#888e90] focus:outline-none focus:border-white/40 transition-all font-sans"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="h-8 w-8 rounded-xl bg-[#fcfdff] hover:bg-[#f1f7fe] text-black flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-[#fcfdff] shrink-0"
          title="Send"
        >
          <SendIcon size={13} />
        </button>
      </form>
    </aside>
  );
}
