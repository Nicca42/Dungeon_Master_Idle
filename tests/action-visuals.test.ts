import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actorCues, latestActorCues, actionVisual } from '../src/game/actionVisuals';
import { demoState } from '../src/game/engine';
import { ActionCue } from '../src/game/types';
import { actionStrip } from '../src/art/actionFrames';

test('actions belong to IDs, with unambiguous fallback for old saves', () => {
  const team = demoState().actors.slice(0, 2);
  team.forEach((a) => (a.name = 'Robin'));
  const cue: ActionCue = {
    actor: 'Robin',
    actorId: team[1].id,
    kind: 'attack',
    role: 'wizard',
    time: 1,
    power: 10,
    difficulty: 5,
    success: true,
  };
  assert.equal(actorCues([cue], team[0], team).length, 0);
  assert.equal(actorCues([cue], team[1], team).length, 1);
  delete cue.actorId;
  assert.equal(actorCues([cue], team[0], team).length, 1);
  assert.equal(actorCues([cue], team[1], team).length, 0);
  assert.equal(actionVisual(cue), 'Lightning spell');
  assert.equal(
    latestActorCues([cue, { ...cue, time: 2, kind: 'defend' }, { ...cue, time: 2 }], team[0], team)
      .length,
    2,
  );
});

test('live gold, sword and lightning strips contain no duplicate character faces', () => {
  for (const kind of ['Gold earned', 'Fighter attack', 'Lightning spell'] as const) {
    const preview = decodeURIComponent(actionStrip(kind, 3));
    const live = decodeURIComponent(actionStrip(kind, 3, false));
    assert.match(preview, /#292333/);
    assert.doesNotMatch(live, /#292333/);
    assert.ok(live.length < preview.length);
  }
  assert.notEqual(
    actionStrip('Lightning spell', 1, false),
    actionStrip('Lightning spell', 5, false),
  );
});

test('admission effects begin at the cave and retain actor IDs through a save', async () => {
  const { advanceTo } = await import('../src/game/engine');
  const { decode } = await import('../src/persistence/schema');
  const state = demoState();
  const party = state.parties[0];
  party.actions = [
    { kind: 'gold', actor: 'Party', time: state.now, power: 40, difficulty: 0, success: true },
  ];
  party.status = 'arriving';
  party.surfaceUntil = state.nextTick - 1;
  const next = advanceTo(state, party.surfaceUntil);
  const entered = next.parties.find((p) => p.id === party.id)!;
  assert.equal(entered.status, 'moving');
  assert.deepEqual(entered.actions.map((c) => c.actorId).sort(), party.members.slice().sort());
  assert.ok(entered.actions.every((c) => c.time === next.now && c.kind === 'gold'));
  const restored = decode(JSON.stringify({ state: next, wall: Date.now() })).state;
  assert.deepEqual(restored.parties.find((p) => p.id === party.id)!.actions, entered.actions);
});
