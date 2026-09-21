import * as SQLite from 'expo-sqlite';
import { decode, Save } from './schema';
let database: Promise<SQLite.SQLiteDatabase> | null = null;
async function db() {
  database ??= SQLite.openDatabaseAsync('underkeep.db').then(async (d) => {
    await d.execAsync(
      'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS saves (slot TEXT PRIMARY KEY, payload TEXT NOT NULL);',
    );
    return d;
  });
  return database;
}
export async function acquireSession() {
  return true;
}
export async function read(): Promise<{ save: Save | null; recovered: boolean }> {
  const d = await db();
  const current = await d.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM saves WHERE slot = 'current'",
  );
  if (!current) return { save: null, recovered: false };
  try {
    return { save: decode(current.payload), recovered: false };
  } catch {
    const previous = await d.getFirstAsync<{ payload: string }>(
      "SELECT payload FROM saves WHERE slot = 'previous'",
    );
    if (previous) return { save: decode(previous.payload), recovered: true };
    throw new Error('This saved dungeon could not be recovered.');
  }
}
export async function write(save: Save) {
  const d = await db();
  await d.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      "INSERT OR REPLACE INTO saves (slot, payload) SELECT 'previous', payload FROM saves WHERE slot = 'current'",
    );
    await tx.runAsync(
      "INSERT OR REPLACE INTO saves (slot, payload) VALUES ('current', ?)",
      JSON.stringify(save),
    );
  });
}

export async function readBaseline(): Promise<Record<string, number> | null> {
  const row = await (
    await db()
  ).getFirstAsync<{ payload: string }>("SELECT payload FROM saves WHERE slot = 'baseline'");
  return row ? JSON.parse(row.payload) : null;
}
export async function writeBaseline(rules: Record<string, number>) {
  await (
    await db()
  ).runAsync(
    "INSERT OR REPLACE INTO saves (slot,payload) VALUES ('baseline', ?)",
    JSON.stringify(rules),
  );
}
