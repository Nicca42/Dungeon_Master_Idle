import { useEffect, useState } from 'react';
import { GameState } from '../game/types';
import { projectedTime, UI_PULSE_MS } from '../game/timing';
export function useLiveClock(g: GameState, wall: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), UI_PULSE_MS);
    return () => clearInterval(timer);
  }, []);
  return projectedTime(g.now, wall, Math.max(now, wall), g.opened && !g.gameOver);
}
export function countdown(ms: number) {
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
