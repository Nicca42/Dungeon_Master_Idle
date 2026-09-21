import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { GameState, Stat } from '../game/types';
import { emptyCombat, skillNames } from '../game/adventureStats';
import { Body, Button, Heading, Panel, Row } from './ui';
import { colors as c } from '../theme';
import { HOUR } from '../game/content';
const labels: Record<Stat, string> = {
  primary: 'Primary skill',
  damage: 'Damage',
  maxHealth: 'Health',
  maxDefense: 'Defense',
  maxStamina: 'Stamina',
  speed: 'Speed',
  intelligence: 'Intelligence',
};
export function AdventureStats({ g }: { g: GameState }) {
  const [skill, setSkill] = useState<Stat>('primary');
  const data = g.adventureStats,
    totals = data?.totals ?? emptyCombat();
  const inside = g.parties.filter((p) => p.status !== 'arriving');
  const roster = inside
    .flatMap((p) =>
      p.members.map((id) => ({ actor: g.actors.find((a) => a.id === id), floor: p.floor })),
    )
    .filter((x) => x.actor && x.actor.health > 0);
  const points = (data?.history ?? []).slice(-48);
  const max = Math.max(1, ...points.map((p) => p.xp[skill]));
  const line = points
    .map(
      (p, i) =>
        `${35 + (i * 510) / Math.max(1, points.length - 1)},${150 - (p.xp[skill] / max) * 120}`,
    )
    .join(' ');
  return (
    <View style={{ gap: 12 }}>
      <Heading>Adventure stats</Heading>
      <Body>
        Recorded since game hour {Math.floor((data?.since ?? g.now) / HOUR)}. Earlier XP, damage and
        deaths cannot be reconstructed from older saves. XP counts every use, including XP later
        spent on level-ups or lost on death.
      </Body>
      <Panel>
        <Row style={{ flexWrap: 'wrap', gap: 18 }}>
          <Body>Adventurers inside: {roster.length}</Body>
          <Body>Parties inside: {inside.length}</Body>
          <Body>Parties arriving: {g.parties.length - inside.length}</Body>
          <Body>Parties formed / known: {data?.partiesTotal ?? g.parties.length}</Body>
          <Body color={c.red}>Adventurers died: {totals.deaths}</Body>
        </Row>
      </Panel>
      <Panel>
        <Heading size={22}>Combat damage</Heading>
        <Body>
          Defense damage dealt: {totals.defenseDealt} · Health damage dealt: {totals.healthDealt}
        </Body>
        <Body>
          Defense damage received: {totals.defenseTaken} · Health damage received:{' '}
          {totals.healthTaken}
        </Body>
        <Body>Actual shield and health points removed; overkill is excluded.</Body>
      </Panel>
      <Panel>
        <Heading size={22}>Skill XP over time</Heading>
        <Row style={{ flexWrap: 'wrap' }}>
          {skillNames.map((key) => (
            <Button key={key} compact secondary={key !== skill} onPress={() => setSkill(key)}>
              {labels[key]}
            </Button>
          ))}
        </Row>
        <Body>
          {labels[skill]} · total earned: {totals.xp[skill]} XP · hourly gains, last 48 recorded
          hours
        </Body>
        {points.length ? (
          <Svg width="100%" height={180} viewBox="0 0 570 180">
            <Line x1={35} y1={150} x2={550} y2={150} stroke={c.muted} />
            <Polyline points={line} stroke={c.gold} strokeWidth={3} fill="none" />
            <SvgText x={5} y={30} fill={c.muted} fontSize={12}>
              {max}
            </SvgText>
            <SvgText x={35} y={173} fill={c.muted} fontSize={12}>
              Hour {points[0]!.hour}
            </SvgText>
            <SvgText x={480} y={173} fill={c.muted} fontSize={12}>
              {points.at(-1)!.hour}
            </SvgText>
          </Svg>
        ) : (
          <Body>XP history will appear as adventurers take actions.</Body>
        )}
      </Panel>
      <Panel>
        <Heading size={22}>Adventurers in the dungeon</Heading>
        {!roster.length && <Body>No adventurers inside right now.</Body>}
        {roster.map(({ actor: a, floor }) => (
          <View key={a!.id} style={{ marginTop: 14 }}>
            <Body>
              {a!.name} · {a!.role} · floor {floor} · {a!.status}
            </Body>
            <Body>
              {skillNames
                .map((key) => `${labels[key]} ${a!.combatStats?.xp[key] ?? 0} XP`)
                .join(' · ')}
            </Body>
            <Body>
              Damage dealt: {a!.combatStats?.defenseDealt ?? 0} defense /{' '}
              {a!.combatStats?.healthDealt ?? 0} health
            </Body>
          </View>
        ))}
      </Panel>
      <Panel>
        <Heading size={22}>Hourly history</Heading>
        <Body>
          Most recent first · retained for 720 game hours. Lifetime totals remain after older rows
          expire.
        </Body>
        <ScrollView horizontal>
          <View style={{ minWidth: 650 }}>
            <Body>
              Hour · XP · Defense dealt · Health dealt · Deaths · Parties inside · Adventurers
            </Body>
            {[...points].reverse().map((p) => (
              <Body key={p.hour}>
                {p.hour} · {p.xp[skill]} · {p.defenseDealt} · {p.healthDealt} · {p.deaths} ·{' '}
                {p.parties} · {p.adventurers}
              </Body>
            ))}
          </View>
        </ScrollView>
      </Panel>
    </View>
  );
}
