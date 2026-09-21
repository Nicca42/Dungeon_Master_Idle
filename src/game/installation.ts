import type { Actor, Encounter } from './types';
/** Completed work is stored on the fixture, so any maintainer can resume it. */
export function installationProgress(e: Encounter, task: Actor['task'], now: number) {
  const saved = e.installProgress ?? 0;
  if (!task || task.kind !== 'install' || task.encounter !== e.id) return saved;
  const start = task.arriveAt ?? now;
  const fraction = Math.min(1, Math.max(0, (now - start) / Math.max(1, task.until - start)));
  return Math.min(1, saved + (1 - saved) * fraction);
}
