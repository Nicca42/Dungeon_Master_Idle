import { ActionCue, Actor } from './types';
import { ActionKind } from '../art/actionFrames';

/** Old saves used names; assign those cues only to the first matching party member. */
export function actorCues(actions: ActionCue[], actor: Actor, team: Actor[]) {
  return actions.filter((cue) =>
    cue.actorId !== undefined
      ? cue.actorId === actor.id
      : cue.actor === actor.name &&
        team.find((member) => member.name === cue.actor)?.id === actor.id,
  );
}
export function actionVisual(cue: ActionCue): ActionKind | undefined {
  switch (cue.kind) {
    case 'gold':
      return 'Gold earned';
    case 'lock':
      return 'Opening chest';
    case 'heal':
      return 'Healing';
    case 'attack':
      return cue.role === 'wizard' ? 'Lightning spell' : 'Fighter attack';
    default:
      return undefined;
  }
}
export function cueKey(cue: ActionCue) {
  return `${cue.actorId ?? cue.actor}:${cue.time}:${cue.kind}:${cue.success}:${cue.power}`;
}

export function latestActorCues(actions: ActionCue[], actor: Actor, team: Actor[]) {
  const own = actorCues(actions, actor, team);
  const latest = Math.max(...own.map((cue) => cue.time));
  return own.filter((cue) => cue.time === latest);
}
