'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, WhiteboardScenePayload } from '@/types/realtime';
import type { AppState, ExcalidrawProps } from '@excalidraw/excalidraw/types';

interface ExcalidrawAPI {
  updateScene: (scene: {
    elements?: readonly unknown[];
    appState?: Partial<AppState>;
    commitToHistory?: boolean;
  }) => void;
}

// Dynamically import Excalidraw so that browser-only dependencies (window, document, canvas) don't trigger SSR errors
const ExcalidrawComponent = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#070709] text-[#888e90] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#FF9933] border-t-transparent animate-spin" />
        <span className="text-xs font-mono tracking-wider uppercase text-zinc-400">Loading Whiteboard...</span>
      </div>
    ),
  }
);

export interface WhiteboardProps {
  roomCode: string;
  isHost: boolean;
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  initialElements?: readonly unknown[];
  initialAppState?: Record<string, unknown>;
  onClose?: () => void;
  className?: string;
}

export function Whiteboard({
  roomCode,
  isHost,
  socket,
  initialElements = [],
  initialAppState,
  className = '',
}: WhiteboardProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const latestElementsRef = useRef<readonly unknown[]>(initialElements);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReceivingRemoteUpdateRef = useRef(false);

  // Sync incoming updates from host to viewer peers
  useEffect(() => {
    if (!socket) return;

    const handleWhiteboardUpdated = (payload: WhiteboardScenePayload) => {
      if (isHostRef.current) return; // Host does not overwrite own active drawing
      if (payload.roomCode !== roomCode.trim().toLowerCase()) return;

      if (excalidrawAPI && payload.elements) {
        isReceivingRemoteUpdateRef.current = true;
        try {
          excalidrawAPI.updateScene({
            elements: payload.elements,
            appState: payload.appState
              ? {
                  viewBackgroundColor:
                    typeof payload.appState.viewBackgroundColor === 'string'
                      ? payload.appState.viewBackgroundColor
                      : undefined,
                }
              : undefined,
            commitToHistory: false,
          });
        } finally {
          setTimeout(() => {
            isReceivingRemoteUpdateRef.current = false;
          }, 50);
        }
      }
    };

    socket.on('whiteboard:updated', handleWhiteboardUpdated);
    return () => {
      socket.off('whiteboard:updated', handleWhiteboardUpdated);
    };
  }, [socket, roomCode, excalidrawAPI]);

  useEffect(() => {
    if (!excalidrawAPI || isHostRef.current) return;
    if (initialElements && initialElements.length > 0) {
      excalidrawAPI.updateScene({ elements: initialElements, appState: initialAppState as Partial<AppState> | undefined });
    }
  }, [excalidrawAPI, initialElements, initialAppState]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Host change handler: debounces sending canvas changes to room peers
  const handleExcalidrawChange: NonNullable<ExcalidrawProps['onChange']> = useCallback(
    (elements, appState) => {
      if (!isHostRef.current) return;
      if (isReceivingRemoteUpdateRef.current) return;

      latestElementsRef.current = elements;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        if (!socket || !socket.connected) return;
        socket.emit('whiteboard:update', {
          roomCode,
          elements: latestElementsRef.current,
          appState: {
            viewBackgroundColor: appState?.viewBackgroundColor,
          },
        });
      }, 100);
    },
    [socket, roomCode]
  );

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative rounded-2xl overflow-hidden bg-[#121212] border border-white/[0.14] shadow-2xl flex flex-col z-20 ${className}`}
    >
      {/* Excalidraw Canvas Container */}
      <div className="flex-1 w-full min-h-0 relative bg-[#121212]">
        <ExcalidrawComponent
          excalidrawAPI={(api: unknown) => {
            const typedApi = api as ExcalidrawAPI;
            setExcalidrawAPI(typedApi);
            if (initialElements && initialElements.length > 0) {
              typedApi.updateScene({ elements: initialElements, appState: initialAppState as Partial<AppState> | undefined });
            }
          }}
          theme="dark"
          viewModeEnabled={!isHost}
          zenModeEnabled={false}
          gridModeEnabled={false}
          UIOptions={{
            canvasActions: {
              toggleTheme: false,
              saveToActiveFile: false,
              loadScene: false,
            },
          }}
          onChange={handleExcalidrawChange}
        />
      </div>
    </div>
  );
}
