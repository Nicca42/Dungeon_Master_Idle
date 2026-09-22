import { PixelActionIcon } from './PixelActionIcon';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Shield } from 'lucide-react-native';
import { ActionCue } from '../game/types';
import { actionVisual, cueKey } from '../game/actionVisuals';
import { ActionEffect } from './ActionEffect';

/** A short, actor-free effect anchored inside the real character's hit target. */
export function CharacterAction({ cue, reduced }: { cue: ActionCue; reduced: boolean }) {
  const [phase, setPhase] = useState(reduced ? 'result' : 'action');
  useEffect(() => {
    const result = setTimeout(() => setPhase('result'), reduced ? 0 : 1000);
    const done = setTimeout(() => setPhase('done'), reduced ? 900 : 1800);
    return () => {
      clearTimeout(result);
      clearTimeout(done);
    };
  }, [reduced]);
  if (phase === 'done') return null;
  const kind = actionVisual(cue);
  const weapon = cue.kind === 'attack';
  return (
    <View
      pointerEvents="none"
      testID={`character-action-${cue.actorId ?? cue.actor}`}
      accessibilityLabel={`${cue.actor}: ${cue.kind}${phase === 'result' ? (cue.success ? ' succeeded' : ' failed') : ''}`}
      style={{
        position: 'absolute',
        left: weapon ? -1 : -6,
        top: weapon ? -4 : -23,
        width: 40,
        height: 40,
        zIndex: 5,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {phase === 'result' ? (
        <PixelActionIcon
          kind={cue.success ? 'check' : 'cross'}
          size={18}
          color={cue.success ? '#96e7a1' : '#ff6969'}
        />
      ) : kind ? (
        <ActionEffect kind={kind} tier={cue.tier} size={40} overlay once />
      ) : cue.kind === 'defend' ? (
        <Shield size={18} color="#86b8ff" />
      ) : (
        <PixelActionIcon kind="eye" color="#eadc9a" />
      )}
    </View>
  );
}

/** Play each action in a simulation batch once, including defense followed by an attack. */
export function CharacterActions({ cues, reduced }: { cues: ActionCue[]; reduced: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (index >= cues.length) return;
    const timer = setTimeout(() => setIndex(index + 1), reduced ? 950 : 1850);
    return () => clearTimeout(timer);
  }, [index, cues.length, reduced]);
  const cue = cues[index];
  return cue ? <CharacterAction key={cueKey(cue)} cue={cue} reduced={reduced} /> : null;
}
