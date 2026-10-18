'use client';

import { useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useWebinarStore } from '@/stores/webinar-store';
import { useChatStore } from '@/stores/chat-store';
import { useReactionsStore } from '@/stores/reactions-store';
import { useWhiteboardStore } from '@/stores/whiteboard-store';
import type { ChatMessage, RoomReaction, WebinarQuestion } from '@/types/realtime';

interface UseWebinarSocketOptions {
  webinarCode: string;
  enabled?: boolean;
}

export function useWebinarSocket({ webinarCode, enabled = true }: UseWebinarSocketOptions) {
  useEffect(() => {
    if (!enabled || !webinarCode) return;

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    // Join the webinar room
    socket.emit('webinar:join', { webinarCode });

    // Event listeners
    const handleStatusChanged = (payload: { status: 'scheduled' | 'live' | 'ended' }) => {
      useWebinarStore.getState().setStatus(payload.status);
    };

    const handleWebinarUpdated = (payload: {
      title?: string;
      description?: string | null;
      youtubeVideoId?: string | null;
      allowChat?: boolean;
      allowQa?: boolean;
      allowWhiteboard?: boolean;
      allowReactions?: boolean;
    }) => {
      useWebinarStore.getState().updateWebinarDetails(payload);
    };

    const handleStats = (payload: { viewerCount: number }) => {
      useWebinarStore.getState().setViewerCount(payload.viewerCount);
    };

    const handleNewChat = (payload: ChatMessage) => {
      useChatStore.getState().addMessage(payload);
    };

    const handleReaction = (payload: RoomReaction) => {
      useReactionsStore.getState().addReaction(payload);
    };

    const handleWhiteboardToggled = (payload: {
      isOpen: boolean;
      elements?: readonly unknown[];
      appState?: Record<string, unknown>;
    }) => {
      useWebinarStore.getState().setIsWhiteboardActive(payload.isOpen);
      useWhiteboardStore.getState().syncState({
        isOpen: payload.isOpen,
        elements: payload.elements,
        appState: payload.appState,
      });
    };

    const handleWhiteboardUpdated = (payload: {
      elements: readonly unknown[];
      appState?: Record<string, unknown>;
    }) => {
      useWhiteboardStore.getState().syncState({
        elements: payload.elements,
        appState: payload.appState,
      });
    };

    const handleQaList = (payload: { questions: WebinarQuestion[] }) => {
      useWebinarStore.getState().setQuestions(payload.questions);
    };

    const handleQaNew = (payload: WebinarQuestion) => {
      useWebinarStore.getState().addQuestion(payload);
    };

    const handleQaUpdated = (payload: WebinarQuestion) => {
      useWebinarStore.getState().updateQuestion(payload);
    };

    socket.on('webinar:status:changed', handleStatusChanged);
    socket.on('webinar:updated', handleWebinarUpdated);
    socket.on('webinar:stats', handleStats);
    socket.on('webinar:chat:new', handleNewChat);
    socket.on('webinar:reaction:fly', handleReaction);
    socket.on('webinar:whiteboard:toggled', handleWhiteboardToggled);
    socket.on('webinar:whiteboard:updated', handleWhiteboardUpdated);
    socket.on('webinar:qa:list', handleQaList);
    socket.on('webinar:qa:new', handleQaNew);
    socket.on('webinar:qa:updated', handleQaUpdated);

    return () => {
      socket.emit('webinar:leave', { webinarCode });
      socket.off('webinar:status:changed', handleStatusChanged);
      socket.off('webinar:updated', handleWebinarUpdated);
      socket.off('webinar:stats', handleStats);
      socket.off('webinar:chat:new', handleNewChat);
      socket.off('webinar:reaction:fly', handleReaction);
      socket.off('webinar:whiteboard:toggled', handleWhiteboardToggled);
      socket.off('webinar:whiteboard:updated', handleWhiteboardUpdated);
      socket.off('webinar:qa:list', handleQaList);
      socket.off('webinar:qa:new', handleQaNew);
      socket.off('webinar:qa:updated', handleQaUpdated);
    };
  }, [webinarCode, enabled]);

  const sendChatMessage = useCallback(
    (text: string) => {
      if (!webinarCode) return;
      getSocket().emit('webinar:chat', { webinarCode, text });
    },
    [webinarCode]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!webinarCode) return;
      getSocket().emit('webinar:reaction', { webinarCode, emoji });
    },
    [webinarCode]
  );

  const toggleWhiteboard = useCallback(
    (isOpen: boolean) => {
      if (!webinarCode) return;
      getSocket().emit('webinar:whiteboard:toggle', { webinarCode, isOpen });
    },
    [webinarCode]
  );

  const updateWhiteboard = useCallback(
    (elements: readonly unknown[], appState?: Record<string, unknown>) => {
      if (!webinarCode) return;
      getSocket().emit('webinar:whiteboard:update', { webinarCode, elements, appState });
    },
    [webinarCode]
  );

  const askQuestion = useCallback(
    (text: string) => {
      if (!webinarCode) return;
      getSocket().emit('webinar:qa:ask', { webinarCode, text });
    },
    [webinarCode]
  );

  const upvoteQuestion = useCallback(
    (questionId: string) => {
      if (!webinarCode) return;
      getSocket().emit('webinar:qa:upvote', { webinarCode, questionId });
    },
    [webinarCode]
  );

  const answerQuestion = useCallback(
    (questionId: string) => {
      if (!webinarCode) return;
      getSocket().emit('webinar:qa:answer', { webinarCode, questionId });
    },
    [webinarCode]
  );

  return {
    sendChatMessage,
    sendReaction,
    toggleWhiteboard,
    updateWhiteboard,
    askQuestion,
    upvoteQuestion,
    answerQuestion,
  };
}
