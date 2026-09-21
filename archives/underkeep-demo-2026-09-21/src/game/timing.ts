// Simulation stays deterministic; presentation interpolates from the same wall anchor.
export const TIME_SCALE = 24;
export const UI_PULSE_MS = 250;
export const SYNC_INTERVAL_MS = 1000;
export const SAVE_INTERVAL_MS = 5000;
export function projectedTime(game: number, wall: number, now: number, running: boolean) {
  return game + (running ? Math.max(0, now - wall) * TIME_SCALE : 0);
}
export function shouldPersist(wall: number, lastWrite: number) {
  return wall - lastWrite >= SAVE_INTERVAL_MS;
}
export function movementDuration(reduced: boolean, interval: number) {
  return reduced ? 0 : interval;
}
