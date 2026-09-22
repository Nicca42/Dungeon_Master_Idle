import { unlockedTier, spawnPointLimit } from '../game/progression';
import { RESEARCH_ART, ResearchIcon } from './ResearchArt';
import React, { useState } from 'react';
import { View } from 'react-native';
import { GameState } from '../game/types';
import { RESEARCH } from '../game/content';
import {
  RESEARCH_CATEGORIES,
  CATEGORY_IDS,
  researchDone,
  researchAvailable,
  PREREQUISITES,
} from '../game/research';
import { rule } from '../game/config';
import { dispatch } from '../game/store';
import { Heading, Body, Button, Panel, Row, Label, Progress } from './ui';
import { colors as c } from '../theme';
import { countdown } from './LiveClock';
export function ResearchPanel({ g, busy }: { g: GameState; busy: boolean }) {
  const [page, setPage] = useState(0),
    category = RESEARCH_CATEGORIES[page]!;
  const all = CATEGORY_IDS[category]!.map((id) => RESEARCH.find((r) => r.id === id)!);
  const pending = all.filter((r) => !researchDone(g, r.id) && g.researchJob?.id !== r.id);
  const done = all.filter((r) => researchDone(g, r.id));
  return (
    <View style={{ gap: 12 }}>
      <Heading>Research workshop</Heading>
      <Row style={{ flexWrap: 'wrap' }}>
        {RESEARCH_CATEGORIES.map((name, i) => (
          <Button key={name} compact secondary={i !== page} onPress={() => setPage(i)}>
            {name}
          </Button>
        ))}
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button compact secondary disabled={!page} onPress={() => setPage((p) => p - 1)}>
          Previous category
        </Button>
        <Body>
          {page + 1} / {RESEARCH_CATEGORIES.length}
        </Body>
        <Button
          compact
          secondary
          disabled={page === RESEARCH_CATEGORIES.length - 1}
          onPress={() => setPage((p) => p + 1)}
        >
          Next category
        </Button>
      </Row>
      {g.researchJob && (
        <Panel>
          <Label color={c.purple}>Research in progress</Label>
          <Heading size={22}>{RESEARCH.find((r) => r.id === g.researchJob!.id)?.name}</Heading>
          <Body>{countdown(g.researchJob.end - g.now)} remaining</Body>
          <Progress
            color={c.purple}
            value={
              1 -
              (g.researchJob.end - g.now) /
                (rule(g, `research.${g.researchJob.id}.hours`) * 3600000)
            }
          />
        </Panel>
      )}
      {pending.map((r, i) => (
        <Panel key={r.id} style={{ borderColor: i === 0 ? c.gold : c.border }}>
          <Label color={c.gold}>{i === 0 ? 'Next research' : category}</Label>
          <Row>
            <ResearchIcon
              branch={
                RESEARCH_ART.find((b) => b.id === r.icon) ??
                RESEARCH_ART.find((b) => b.name === category) ??
                RESEARCH_ART[0]
              }
              level={Math.min(5, Number(r.id.match(/\d$/)?.[0] ?? 1))}
            />
            <Heading size={23}>{r.name}</Heading>
          </Row>
          <Body style={{ marginVertical: 8 }}>{r.description}</Body>
          {r.id === 'depths' && (
            <Body>
              {g.floors.length}/50 floors unlocked · next unlock: {g.floors.length + 1}–
              {Math.min(50, g.floors.length + 5)}
            </Body>
          )}
          {r.id === 'stealth' && (
            <Body>
              Beginner stealth: {g.trapStealth ?? 5}/10 · next{' '}
              {Math.min(10, (g.trapStealth ?? 5) + 1)}
            </Body>
          )}
          {!researchAvailable(g, r.id) && (
            <Body color={c.purple}>
              Requires{' '}
              {(PREREQUISITES[r.id] ?? [])
                .map((id) => RESEARCH.find((x) => x.id === id)?.name)
                .join(', ')}
            </Body>
          )}
          <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <Body>
              {rule(g, `research.${r.id}.cost`)} gold · {rule(g, `research.${r.id}.hours`)}h
            </Body>
            <Button
              compact
              disabled={
                busy ||
                !!g.researchJob ||
                g.tutorial < 9 ||
                !researchAvailable(g, r.id) ||
                g.gold < rule(g, `research.${r.id}.cost`) * 100
              }
              onPress={() => void dispatch({ type: 'research', id: r.id })}
            >
              Research {r.name}
            </Button>
          </Row>
        </Panel>
      ))}
      <Label color={c.green}>Completed research · {done.length}</Label>
      {done.map((r) => (
        <Panel key={r.id}>
          <Heading size={20}>✓ {r.name}</Heading>
          <Body>{r.description}</Body>
        </Panel>
      ))}
    </View>
  );
}
export function AdventurerOffice({ g, busy }: { g: GameState; busy: boolean }) {
  return (
    <View style={{ gap: 12 }}>
      <Heading>Adventurers</Heading>
      {g.research.includes('guild') && (
        <Body>
          Basic Adventurers Guild active · new arrivals prioritize the classes missing from eligible
          waiting parties.
        </Body>
      )}
      <Body>
        Manage town spawn points. Each extra point adds 10 to the population limit. Upgrading
        affects future arrivals; existing characters keep their earned stats. Level 2 arrivals need
        a level 2 first floor to enter.
      </Body>
      <Button
        disabled={
          busy ||
          !g.research.includes('localAds') ||
          g.spawnPoints >= spawnPointLimit(g) ||
          g.gold < rule(g, 'cost.spawn') * 100
        }
        onPress={() => void dispatch({ type: 'buySpawnPoint' })}
      >{`Buy spawn point · ${rule(g, 'cost.spawn')} gold · +10 adventurers`}</Button>
      {Array.from({ length: g.spawnPoints }, (_, point) => (
        <Panel key={point}>
          <Heading size={20}>
            Spawn point {point + 1} · Level {g.spawnTiers?.[point] ?? 1}
          </Heading>
          <Body>
            {(g.spawnTiers?.[point] ?? 1) === 2
              ? 'Double baseline stats · elaborate class attire'
              : 'Level 1 adventurers'}
          </Body>
          <Button
            compact
            disabled={
              busy ||
              !g.research.includes('level2Adventurers') ||
              (g.spawnTiers?.[point] ?? 1) >= unlockedTier(g, 'adventurer') ||
              g.gold < 2500
            }
            onPress={() => void dispatch({ type: 'upgradeSpawn', point })}
          >
            Upgrade to level {(g.spawnTiers?.[point] ?? 1) + 1} · 25 gold
          </Button>
        </Panel>
      ))}
    </View>
  );
}
