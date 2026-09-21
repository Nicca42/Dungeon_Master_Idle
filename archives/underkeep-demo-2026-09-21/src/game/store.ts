import { defaultArtChoices } from './appearance';
import { DEFAULT_RULES, Rules, applyRules, validateRules } from './config';
import { create } from 'zustand';
import { advanceTo, command, demoState, initialState } from './engine';
import { Command, GameState, Totals } from './types';
import * as repository from '../persistence';
import { Save } from '../persistence/schema';
import { DAY, HOUR } from './content';
import { projectedTime, shouldPersist } from './timing';

export interface Report {
  realHours: number;
  simulated: boolean;
  totals: Totals;
}
interface Store {
  game: GameState;
  wall: number;
  foreground: boolean;
  ready: boolean;
  busy: boolean;
  error: string | null;
  toast: string | null;
  report: Report | null;
  progress: number;
  welcomeUntil: number;
}
export const useGame = create<Store>(() => ({
  game: initialState(),
  wall: Date.now(),
  foreground: false,
  ready: false,
  busy: false,
  error: null,
  toast: null,
  report: null,
  progress: 0,
  welcomeUntil: Date.now() + 5000,
}));
let baseline: Rules = DEFAULT_RULES;
let saved: Save = { state: initialState(), wall: Date.now() };
let queue = Promise.resolve();
let initialized = false;
let foreground = false;
let lastWrite = 0;
let tickPending = false;
async function persist() {
  await repository.write(saved);
  lastWrite = saved.wall;
}
const delay = () => new Promise((resolve) => setTimeout(resolve, 0));
function fail(e: unknown) {
  useGame.setState({
    error: e instanceof Error ? e.message : 'Something went wrong.',
    busy: false,
  });
}
function run(job: () => Promise<void>) {
  queue = queue.then(job).catch(fail);
  return queue;
}
function publish() {
  useGame.setState({ game: saved.state, wall: saved.wall, busy: false, progress: 0 });
}
async function catchUp(target: number, wall: number, active = false) {
  const start = saved.state.now;
  saved = { ...saved, pending: { game: target, wall, active } };
  await repository.write(saved);
  while (saved.state.now < target) {
    saved = {
      ...saved,
      state: advanceTo(saved.state, Math.min(target, saved.state.now + DAY), active),
    };
    await repository.write(saved);
    useGame.setState({ progress: (saved.state.now - start) / Math.max(1, target - start) });
    await delay();
  }
  saved = { state: saved.state, wall };
  await repository.write(saved);
}
function report(before: GameState, realHours: number, simulated: boolean) {
  const totals = Object.fromEntries(
    Object.entries(saved.state.totals).map(([k, v]) => [k, v - before.totals[k as keyof Totals]]),
  ) as unknown as Totals;
  useGame.setState({ report: { totals, realHours, simulated } });
}
async function syncTime(showReport: boolean, forceSave = false) {
  const now = Math.max(Date.now(), saved.wall),
    elapsed = now - saved.wall;
  if (!saved.state.opened) {
    saved = { state: saved.state, wall: now };
    return;
  }
  const before = saved.state;
  if (saved.pending)
    await catchUp(saved.pending.game, saved.pending.wall, saved.pending.active ?? false);
  const delta = Math.max(0, now - saved.wall);
  if (delta > 0) {
    if (delta > 60_000) {
      useGame.setState({ busy: true });
      await catchUp(projectedTime(saved.state.now, saved.wall, now, true), now, foreground);
    } else {
      saved = {
        state: advanceTo(
          saved.state,
          projectedTime(saved.state.now, saved.wall, now, true),
          foreground,
        ),
        wall: now,
      };
      if (forceSave || shouldPersist(now, lastWrite)) await persist();
    }
  }
  if (showReport && elapsed >= 60_000) report(before, elapsed / HOUR, false);
}
export function initialize(retry = false) {
  if (initialized && !retry) return;
  initialized = true;
  useGame.setState({ ready: false, error: null, busy: false });
  return run(async () => {
    if (!(await repository.acquireSession()))
      throw new Error(
        'This dungeon is open in another tab. Close that tab and reload to continue here.',
      );
    baseline = validateRules((await repository.readBaseline()) ?? DEFAULT_RULES);
    const result = await repository.read();
    saved = result.save ?? { state: initialState(42691, baseline), wall: Date.now() };
    saved.state.artChoices = { ...defaultArtChoices(), ...saved.state.artChoices };
    if (JSON.stringify(saved.state.config ?? DEFAULT_RULES) !== JSON.stringify(baseline))
      saved.state = applyRules(saved.state, baseline);
    if (result.recovered) useGame.setState({ toast: 'Recovered your previous complete save.' });
    await syncTime(true);
    await repository.write(saved);
    publish();
    useGame.setState({ ready: true, welcomeUntil: Date.now() + 5000 });
  });
}
export function setForeground(active: boolean) {
  return run(async () => {
    if (!useGame.getState().ready || useGame.getState().error) return;
    await syncTime(false, true);
    foreground = active;
    useGame.setState({ foreground: active });
    publish();
  });
}
export function tickNow(forceSave = false) {
  if (
    !useGame.getState().ready ||
    useGame.getState().busy ||
    useGame.getState().error ||
    tickPending
  )
    return;
  tickPending = true;
  return run(async () => {
    await syncTime(true, forceSave);
    publish();
  }).finally(() => {
    tickPending = false;
  });
}
export function dispatch(action: Command) {
  if (useGame.getState().busy || useGame.getState().error) return;
  useGame.setState({ busy: true });
  return run(async () => {
    await syncTime(false);
    let next: GameState;
    try {
      next = command(saved.state, action);
    } catch (e) {
      useGame.setState({
        busy: false,
        toast: e instanceof Error ? e.message : 'Action unavailable.',
      });
      return;
    }
    const nextSave = { state: next, wall: saved.wall };
    await repository.write(nextSave);
    saved = nextSave;
    publish();
    if (action.type !== 'tutorial')
      useGame.setState({
        toast:
          action.type === 'fund'
            ? 'Treasure reserve topped up.'
            : action.type === 'research'
              ? 'Research started. Your scholars are on it.'
              : 'Dungeon updated. All changes saved.',
      });
  });
}
export function skipTime(realHours: number) {
  if (!useGame.getState().game.opened || useGame.getState().busy || useGame.getState().error)
    return;
  useGame.setState({ busy: true });
  return run(async () => {
    await syncTime(false);
    const before = saved.state;
    await catchUp(saved.state.now + Math.round(realHours * HOUR * 24), saved.wall);
    publish();
    report(before, realHours, true);
  });
}
export function resetDemo(prepared = false) {
  useGame.setState({ busy: true });
  return run(async () => {
    const next = {
      state: prepared ? demoState(baseline) : initialState(42691, baseline),
      wall: Date.now(),
    };
    await repository.write(next);
    saved = next;
    useGame.setState({
      error: null,
      report: null,
      toast: prepared
        ? 'Demo dungeon loaded. Let the misadventures begin.'
        : 'A fresh start. Your new dungeon awaits.',
    });
    publish();
  });
}
export function dismissReport() {
  useGame.setState({ report: null });
}
export function clearToast() {
  useGame.setState({ toast: null });
}

export function saveBaseline(input: Rules) {
  if (useGame.getState().busy) return Promise.resolve();
  useGame.setState({ busy: true, progress: 0 });
  return run(async () => {
    const rules = validateRules(input);
    await syncTime(false);
    const next = applyRules(saved.state, rules);
    // Yield between progress updates so the one-second recalculation state is visible on mobile.
    for (let i = 1; i <= 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      useGame.setState({ progress: i / 10 });
    }
    await repository.writeBaseline(rules);
    await repository.write({ state: next, wall: saved.wall });
    baseline = rules;
    saved = { state: next, wall: saved.wall };
    publish();
    useGame.setState({ toast: 'Baseline saved. Current and future dungeons use these rules.' });
  });
}
