'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';
import { Pencil, X, Eye, ShieldCheck, Maximize2, Minimize2 } from 'lucide-react';
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
  onClose,
  className = '',
}: WhiteboardProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative rounded-2xl overflow-hidden bg-[#121212] border border-white/[0.14] shadow-2xl flex flex-col z-20 transition-all ${
        isFullscreen ? 'fixed inset-3 z-50 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.9)]' : ''
      } ${className}`}
    >
      {/* Top Header Bar */}
      <div className="h-10 px-3 sm:px-4 bg-[#0a0a0c]/90 border-b border-white/[0.08] backdrop-blur-md flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-md bg-[#FF9933]/15 text-[#FF9933] border border-[#FF9933]/30 flex items-center justify-center shrink-0">
            <Pencil className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-[#fcfdff] truncate">Excalidraw Whiteboard</span>
          {isHost ? (
            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#FF9933]/15 text-[#FF9933] border border-[#FF9933]/30 font-bold hidden xs:inline-flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-2.5 h-2.5" />
              Host Broadcasting
            </span>
          ) : (
            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold hidden xs:inline-flex items-center gap-1 shrink-0">
              <Eye className="w-2.5 h-2.5" />
              Viewing Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="h-7 w-7 rounded-lg text-[#888e90] hover:text-[#fcfdff] hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {isHost && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[10px] sm:text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              title="Stop broadcasting whiteboard"
            >
              <X className="w-3 h-3" />
              <span>Close Whiteboard</span>
            </button>
          )}
        </div>
      </div>

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
