import React, { ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { Actor } from '../game/types';
import { Sprite } from './PixelArt';
import { Body, Panel } from './ui';
import { countdown } from './LiveClock';
import { colors as c } from '../theme';

const jobs: Record<Actor['role'], string> = {
  miner: 'Digger',
  maintenance: 'Maintainer',
  defender: 'Defender',
  fighter: 'Fighter',
  wizard: 'Wizard',
  healer: 'Healer',
};
export function RestRoomPanel({
  title,
  capacity,
  roster,
  waiting = [],
  now,
  onActor,
  children,
}: {
  title: string;
  capacity: number;
  roster: { actor: Actor; end: number }[];
  waiting?: Actor[];
  now: number;
  onActor: (actor: Actor) => void;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <Panel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} occupants`}
        aria-expanded={expanded}
        onPress={() => setExpanded((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}
      >
        <Chevron size={18} color={c.gold} />
        <View style={{ flex: 1 }}>
          <Body color={c.text}>{title}</Body>
          <Body>
            {roster.length}/{capacity} occupied · {waiting.length} waiting
          </Body>
        </View>
      </Pressable>
      {children}
      {expanded && (
        <View style={{ gap: 8, marginTop: 10 }}>
          {!roster.length && <Body>No occupants right now.</Body>}
          {[...roster, ...waiting.map((actor) => ({ actor, end: null }))].map(({ actor, end }) => (
            <Pressable
              key={actor.id}
              accessibilityRole="button"
              accessibilityLabel={`${jobs[actor.role]} · ${actor.name}`}
              onPress={() => onActor(actor)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 8,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 6,
              }}
            >
              <Sprite
                kind={actor.role}
                size={30}
                variant={actor.variant}
                saturation={actor.outfitSaturation}
                tier={actor.outfitTier}
              />
              <View style={{ flex: 1 }}>
                <Body color={c.text}>
                  {jobs[actor.role]} · {actor.name}
                </Body>
                <Body>
                  {end === null
                    ? 'Waiting for a bed'
                    : `Stamina ${actor.stamina}/${actor.maxStamina} · ${countdown(end - now)} remaining`}
                </Body>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Panel>
  );
}
