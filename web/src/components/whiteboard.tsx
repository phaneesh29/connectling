'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, WhiteboardScenePayload, WhiteboardTogglePayload } from '@/types/realtime';
import type { AppState, ExcalidrawProps } from '@excalidraw/excalidraw/types';
import { useWhiteboardStore } from '@/stores/whiteboard-store';

interface ExcalidrawAPI {
  updateScene: (scene: {
    elements?: readonly unknown[];
    appState?: Partial<AppState>;
    captureUpdate?: unknown;
    commitToHistory?: boolean;
  }) => void;
  scrollToContent?: (
    target?: unknown,
    opts?: {
      fitToViewport?: boolean;
      viewportZoomFactor?: number;
      animate?: boolean;
      duration?: number;
    }
  ) => void;
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
  const containerRef = useRef<HTMLDivElement>(null);

  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const storeElements = useWhiteboardStore((s) => s.elements);
  const storeAppState = useWhiteboardStore((s) => s.appState);

  const effectiveInitialElements = storeElements.length > 0 ? storeElements : initialElements;
  const effectiveInitialAppState = storeAppState || initialAppState || null;

  const latestElementsRef = useRef<readonly unknown[]>(effectiveInitialElements);
  const pendingElementsRef = useRef<readonly unknown[] | null>(
    effectiveInitialElements && effectiveInitialElements.length > 0 ? effectiveInitialElements : null
  );
  const pendingAppStateRef = useRef<Record<string, unknown> | null>(effectiveInitialAppState);
  const hasCenteredContentRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReceivingRemoteUpdateRef = useRef(false);
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const safeTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      if (isMountedRef.current) {
        fn();
      }
    }, delay);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const timeouts = timeoutsRef.current;
    return () => {
      isMountedRef.current = false;
      for (const id of timeouts) {
        clearTimeout(id);
      }
      timeouts.clear();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Sync initial props or store into refs when updated
  useEffect(() => {
    if (effectiveInitialElements && effectiveInitialElements.length > 0) {
      latestElementsRef.current = effectiveInitialElements;
      pendingElementsRef.current = effectiveInitialElements;
    }
  }, [effectiveInitialElements]);

  useEffect(() => {
    if (effectiveInitialAppState) {
      pendingAppStateRef.current = effectiveInitialAppState;
    }
  }, [effectiveInitialAppState]);

  // Request latest whiteboard state on mount from server
  useEffect(() => {
    if (!socket) return;
    const requestSync = () => {
      if (socket.connected) {
        socket.emit('whiteboard:sync', { roomCode });
      }
    };
    socket.on('connect', requestSync);
    requestSync();
    return () => {
      socket.off('connect', requestSync);
    };
  }, [socket, roomCode]);

  // Sync incoming updates from host to viewer peers
  useEffect(() => {
    if (!socket) return;

    const handleWhiteboardUpdated = (payload: WhiteboardScenePayload) => {
      if (isHostRef.current) return; // Host does not overwrite own active drawing
      if (payload.roomCode?.trim().toLowerCase() !== roomCode.trim().toLowerCase()) return;

      if (payload.elements) {
        useWhiteboardStore.getState().syncState({
          elements: payload.elements,
          appState: payload.appState,
        });
        pendingElementsRef.current = payload.elements;
        latestElementsRef.current = payload.elements;
        if (payload.appState) pendingAppStateRef.current = payload.appState;
      }

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
            captureUpdate: 'NEVER' as unknown as undefined,
            commitToHistory: false,
          });

          // Ensure drawings are fitted and visible in viewport on mobile / smaller screens
          if (!hasCenteredContentRef.current && payload.elements.length > 0 && excalidrawAPI.scrollToContent) {
            hasCenteredContentRef.current = true;
            safeTimeout(() => {
              try {
                excalidrawAPI.scrollToContent?.(payload.elements, { fitToViewport: true, viewportZoomFactor: 0.85 });
              } catch { /* ignore */ }
            }, 100);
          }
        } finally {
          safeTimeout(() => {
            isReceivingRemoteUpdateRef.current = false;
          }, 50);
        }
      }
    };

    const handleWhiteboardToggled = (payload: WhiteboardTogglePayload) => {
      if (payload.roomCode?.trim().toLowerCase() !== roomCode.trim().toLowerCase()) return;
      useWhiteboardStore.getState().syncState({
        isOpen: payload.isOpen,
        elements: payload.elements,
        appState: payload.appState,
      });

      if (!payload.isOpen) {
        onClose?.();
        return;
      }
      if (isHostRef.current) return;

      if (payload.elements) {
        pendingElementsRef.current = payload.elements;
        latestElementsRef.current = payload.elements;
        if (payload.appState) pendingAppStateRef.current = payload.appState;

        if (excalidrawAPI) {
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
              captureUpdate: 'NEVER' as unknown as undefined,
              commitToHistory: false,
            });
            if (!hasCenteredContentRef.current && payload.elements.length > 0 && excalidrawAPI.scrollToContent) {
              hasCenteredContentRef.current = true;
              safeTimeout(() => {
                try {
                  excalidrawAPI.scrollToContent?.(payload.elements, { fitToViewport: true, viewportZoomFactor: 0.85 });
                } catch { /* ignore */ }
              }, 100);
            }
          } finally {
            safeTimeout(() => {
              isReceivingRemoteUpdateRef.current = false;
            }, 50);
          }
        }
      }
    };

    socket.on('whiteboard:updated', handleWhiteboardUpdated);
    socket.on('whiteboard:toggled', handleWhiteboardToggled);
    return () => {
      socket.off('whiteboard:updated', handleWhiteboardUpdated);
      socket.off('whiteboard:toggled', handleWhiteboardToggled);
    };
  }, [socket, roomCode, excalidrawAPI, onClose, safeTimeout]);

  useEffect(() => {
    if (!excalidrawAPI || isHostRef.current) return;
    const elementsToLoad = pendingElementsRef.current || (initialElements && initialElements.length > 0 ? initialElements : null);
    if (elementsToLoad && elementsToLoad.length > 0) {
      excalidrawAPI.updateScene({
        elements: elementsToLoad,
        appState: initialAppState as Partial<AppState> | undefined,
        captureUpdate: 'NEVER' as unknown as undefined,
        commitToHistory: false,
      });
      if (!hasCenteredContentRef.current && excalidrawAPI.scrollToContent) {
        hasCenteredContentRef.current = true;
        safeTimeout(() => {
          try {
            excalidrawAPI.scrollToContent?.(elementsToLoad, { fitToViewport: true, viewportZoomFactor: 0.85 });
          } catch { /* ignore */ }
        }, 150);
      }
    }
  }, [excalidrawAPI, initialElements, initialAppState, safeTimeout]);

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
        useWhiteboardStore.getState().setElements(latestElementsRef.current);
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
          initialData={
            effectiveInitialElements && effectiveInitialElements.length > 0
              ? ({
                  elements: effectiveInitialElements,
                  appState: effectiveInitialAppState || undefined,
                } as unknown as ExcalidrawProps['initialData'])
              : undefined
          }
          excalidrawAPI={(api: unknown) => {
            const typedApi = api as ExcalidrawAPI;
            setExcalidrawAPI(typedApi);
            const elementsToLoad = pendingElementsRef.current || (initialElements && initialElements.length > 0 ? initialElements : null);
            if (elementsToLoad && elementsToLoad.length > 0) {
              typedApi.updateScene({
                elements: elementsToLoad,
                appState: (pendingAppStateRef.current || initialAppState) as Partial<AppState> | undefined,
                captureUpdate: 'NEVER' as unknown as undefined,
                commitToHistory: false,
              });
              safeTimeout(() => {
                try {
                  typedApi.scrollToContent?.(elementsToLoad, { fitToViewport: true, viewportZoomFactor: 0.85 });
                  hasCenteredContentRef.current = true;
                } catch { /* ignore */ }
              }, 150);
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
