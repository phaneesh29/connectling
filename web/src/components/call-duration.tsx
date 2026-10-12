'use client';

import { useEffect, useState } from 'react';

export function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = seconds % 60;
  const mmss = `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  return hours ? `${String(hours).padStart(2, '0')}:${mmss}` : mmss;
}

// Mounted only after joining. Local elapsed time survives signaling reconnects and
// background-tab throttling; no duration is stored or sent to the server.
export function CallDuration({ active = true }: { active?: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const update = () => setSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    const interval = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', update); };
  }, [active]);
  return <span className="tabular-nums" role="timer" aria-label={`Your call duration: ${formatCallDuration(seconds)}`} title="Your time in this call">{formatCallDuration(seconds)}</span>;
}
