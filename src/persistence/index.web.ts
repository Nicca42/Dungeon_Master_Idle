import { decode, Save } from './schema';
const KEY = 'underkeep-demo-v1';
// Keep ownership across Metro Fast Refresh; a full document reload releases the lock.
const session = globalThis as typeof globalThis & { __underkeepOwnsLock?: boolean };
export async function acquireSession(): Promise<boolean> {
  if (session.__underkeepOwnsLock) return true;
  if (typeof navigator === 'undefined' || !navigator.locks) return true;
  return new Promise((resolve) => {
    void navigator.locks.request(KEY, { ifAvailable: true }, (lock) => {
      session.__underkeepOwnsLock = !!lock;
      resolve(!!lock);
      return lock ? new Promise<void>(() => {}) : Promise.resolve();
    });
  });
}
export async function read(): Promise<{ save: Save | null; recovered: boolean }> {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { save: null, recovered: false };
  const generations = JSON.parse(raw);
  try {
    return { save: decode(generations.current), recovered: false };
  } catch {
    if (generations.previous) return { save: decode(generations.previous), recovered: true };
    throw new Error(
      'This save could not be read. Export or clear this site’s data to start a new demo.',
    );
  }
}
export async function write(save: Save): Promise<void> {
  const raw = localStorage.getItem(KEY);
  let previous: string | null = null;
  if (raw) {
    const data = JSON.parse(raw);
    try {
      decode(data.current);
      previous = data.current;
    } catch {
      previous = data.previous;
    }
  }
  localStorage.setItem(KEY, JSON.stringify({ current: JSON.stringify(save), previous }));
}

export async function readBaseline(): Promise<Record<string, number> | null> {
  const raw = localStorage.getItem('underkeep-baseline-v1');
  return raw ? JSON.parse(raw) : null;
}
export async function writeBaseline(rules: Record<string, number>) {
  localStorage.setItem('underkeep-baseline-v1', JSON.stringify(rules));
}
