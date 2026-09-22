import React, { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Heading, Panel, Row } from './ui';
import { GameState } from '../game/types';
import { money } from '../game/content';
export function DailyReports({ g }: { g: GameState }) {
  const [selected, setSelected] = useState<number | null>(null);
  const reports = g.dailyReports?.reports ?? [];
  const index =
    selected === null
      ? reports.length - 1
      : Math.max(
          0,
          reports.findIndex((r) => r.day === selected),
        );
  const report = reports[index];
  const metric = (label: string, value: string | number) => (
    <Row key={label} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <Body>{label}</Body>
      <Body>{value}</Body>
    </Row>
  );
  return (
    <View testID="daily-report" style={{ gap: 12 }}>
      <Heading>Daily reports</Heading>
      <Body>Generated at midnight, game time. The latest 90 days are kept.</Body>
      {!report ? (
        <Panel>
          <Heading>First report at midnight</Heading>
          <Body>
            Today's activity is being recorded. Return after the game clock passes midnight.
          </Body>
        </Panel>
      ) : (
        <>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Button
              compact
              secondary
              disabled={index <= 0}
              onPress={() => setSelected(reports[index - 1].day)}
            >
              Previous day
            </Button>
            <Heading>Day {report.day}</Heading>
            <Button
              compact
              secondary
              disabled={index >= reports.length - 1}
              onPress={() =>
                setSelected(index + 1 === reports.length - 1 ? null : reports[index + 1].day)
              }
            >
              Next day
            </Button>
          </Row>
          {report.partial && <Body>Partial day: recording began after this day started.</Body>}
          <Panel>
            <Heading>Visitors</Heading>
            {metric('Adventurers admitted', report.adventurers)}
            {metric('Parties admitted', report.parties)}
            {metric('Adventurer deaths', report.deaths)}
          </Panel>
          <Panel>
            <Heading>Dungeon activity</Heading>
            {metric('Traps triggered', report.traps)}
            {metric('Treasure taken', `${money(report.treasureGold)} gold`)}
            {metric('Skill XP earned', report.xp)}
            {metric('Stat levels gained', report.levels)}
          </Panel>
          <Panel>
            <Heading>Admission & advancement earnings</Heading>
            {metric('Entry fees collected', `${money(report.entryGold)} gold`)}
            {metric('Level-up fees collected', `${money(report.levelGold)} gold`)}
            {metric('Combined fees', `${money(report.entryGold + report.levelGold)} gold`)}
          </Panel>
          <Body>
            Visitors count paid admissions, including repeat visits. XP includes points later lost.
            Stat levels are individual skill increases secured at floor checkpoints. Deaths include
            members later revived. Traps include mimics; detected traps avoided do not count.
          </Body>
          <Body>
            Fees are gross receipts before treasure reinvestment. Treasure taken is loot from
            chests, not a second treasury deduction. Other income and expenses remain in Gold stats.
          </Body>
        </>
      )}
    </View>
  );
}
