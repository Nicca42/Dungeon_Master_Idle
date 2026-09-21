import { STATS_CATEGORIES } from '../game/statsCategories';
import { AdventureStats } from './AdventureStats';
import React, { useEffect, useState } from 'react';
import { View, Pressable, Text, ScrollView } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { Body, Button, Heading, Panel, Row, Progress } from './ui';
import { colors as c } from '../theme';
import { GameState } from '../game/types';
import {
  rule,
  RULE_FIELDS,
  adjustRule,
  editableRuleKey,
  DEFAULT_RULES,
  Rules,
  validateRules,
} from '../game/config';
import { saveBaseline, useGame } from '../game/store';
import { forecastGold, ForecastPoint } from '../game/forecast';
import { HOUR, money } from '../game/content';

export function Stats({ g, busy }: { g: GameState; busy: boolean }) {
  const [page, setPage] = useState(0),
    [edit, setEdit] = useState(false),
    [draft, setDraft] = useState<Rules>({ ...DEFAULT_RULES, ...g.config }),
    [group, setGroup] = useState(0),
    [category, setCategory] = useState(0),
    [error, setError] = useState(''),
    [forecast, setForecast] = useState<ForecastPoint[]>([]),
    [loading, setLoading] = useState(false),
    [refresh, setRefresh] = useState(0),
    [inspect, setInspect] = useState(false);
  const active = useGame((s) => s.foreground),
    progress = useGame((s) => s.progress);
  const selectedCategory = STATS_CATEGORIES[category]!;
  const groups = selectedCategory.pages;
  const selectedGroup = groups[group]!;
  useEffect(() => {
    if (!edit) setDraft({ ...DEFAULT_RULES, ...g.config });
  }, [g.configRevision, edit]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    forecastGold(g, active, () => cancelled)
      .then((points) => {
        if (!cancelled) {
          setForecast(points);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [g.configRevision, refresh, active, Math.floor(g.now / HOUR)]);
  const entries = g.ledger ?? [],
    income = entries.filter((e) => e.amount > 0).reduce((n, e) => n + e.amount, 0),
    spent = -entries.filter((e) => e.amount < 0).reduce((n, e) => n + e.amount, 0);
  const reasons = Object.entries(
    entries.reduce<Record<string, number>>((totals, e) => {
      totals[e.reason] = (totals[e.reason] ?? 0) + e.amount;
      return totals;
    }, {}),
  ).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const save = async () => {
    try {
      validateRules(draft);
      setError('');
      await saveBaseline(draft);
      if (!useGame.getState().error) setEdit(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <View style={{ gap: 12 }}>
      <Row style={{ flexWrap: 'wrap' }}>
        <Button compact secondary={page !== 0} onPress={() => setPage(0)}>
          Gold stats
        </Button>
        <Button compact secondary={page !== 1} onPress={() => setPage(1)}>
          Deep stats
        </Button>
        <Button compact secondary={page !== 2} onPress={() => setPage(2)}>
          Adventure stats
        </Button>
      </Row>
      {page === 2 ? (
        <AdventureStats g={g} />
      ) : page === 0 ? (
        <>
          <Panel>
            <Heading>Gold over time</Heading>
            <Body>
              Treasury cash flow · game hours · recorded since hour{' '}
              {Math.floor((g.ledgerSince ?? g.now) / HOUR)}. Earlier transactions were not recorded.
            </Body>
            <Row style={{ flexWrap: 'wrap', marginVertical: 14 }}>
              <Body color={c.green}>Earned {money(income)} g</Body>
              <Body color={c.red}>Spent / allocated {money(spent)} g</Body>
              <Body color={c.gold}>Treasury {money(g.gold)} g</Body>
            </Row>
            <GoldChart g={g} forecast={forecast} />
            <Body>
              Green: earned · Red: spent/allocated · Gold: treasury · Dotted gold: projected
              treasury, next 24 game hours.
            </Body>
            <Body style={{ marginTop: 8 }}>
              Projection averages 3 simulated runs with current spawn rates, maintainers, chests,
              fees and {active ? 'active-play bonuses' : 'offline rates'}. No new player purchases
              are assumed. Combat and party demand can change results.
            </Body>
            {loading ? (
              <Body color={c.purple}>Calculating forecast…</Body>
            ) : (
              <Body color={c.gold}>
                Expected net:{' '}
                {money((forecast.at(-1)?.gold ?? g.gold) - (forecast[0]?.gold ?? g.gold))} gold /
                next 24 game hours
              </Body>
            )}
            <Button
              compact
              secondary
              disabled={loading || busy}
              onPress={() => setRefresh((n) => n + 1)}
              style={{ marginTop: 10 }}
            >
              Refresh forecast
            </Button>
          </Panel>
          <Panel>
            <Heading>Where the gold went</Heading>
            {reasons.length ? (
              reasons.map(([reason, amount]) => (
                <Row key={reason} style={{ justifyContent: 'space-between', marginTop: 12 }}>
                  <Body>{reason}</Body>
                  <Body color={amount >= 0 ? c.green : c.red}>
                    {amount >= 0 ? '+' : ''}
                    {money(amount)} g
                  </Body>
                </Row>
              ))
            ) : (
              <Body>No transactions recorded yet.</Body>
            )}
            <Body style={{ marginTop: 12 }}>
              Treasure reinvestment and reserve funding are treasury outflows, not destroyed gold.
              Reserve: {money(g.reserve)} g. In chests:{' '}
              {money(
                g.floors.reduce((n, f) => n + f.encounters.reduce((m, e) => m + e.gold, 0), 0),
              )}{' '}
              g.
            </Body>
          </Panel>
        </>
      ) : (
        <>
          <Panel>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Heading>Deep stats</Heading>
              {edit ? (
                <Row>
                  <Button compact disabled={busy} onPress={() => void save()}>
                    Save baseline
                  </Button>
                  <Button compact secondary disabled={busy} onPress={() => setEdit(false)}>
                    Cancel
                  </Button>
                </Row>
              ) : (
                <Button compact disabled={busy} onPress={() => setEdit(true)}>
                  Edit baseline
                </Button>
              )}
            </Row>
            <Body style={{ marginTop: 8 }}>
              Silver and gold chest values are derived from wood at 2× and 4×. Gameplay values for
              current and future games on this device. Existing earned stat gains and wounds are
              preserved. Identity, save data and progress are read-only.
            </Body>
            {busy && edit && (
              <View testID="baseline-progress" style={{ marginTop: 12 }}>
                <Body color={c.purple}>
                  Recalculating game configuration… {Math.round(progress * 100)}%
                </Body>
                <Progress value={progress} color={c.purple} />
              </View>
            )}
            {!!error && <Body color={c.red}>{error}</Body>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 }}>
              {STATS_CATEGORIES.map((item, i) => (
                <Pressable
                  key={item.name}
                  accessibilityRole="button"
                  accessibilityLabel={`Stats category ${item.name}`}
                  accessibilityState={{ selected: category === i }}
                  onPress={() => {
                    setCategory(i);
                    setGroup(0);
                  }}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    backgroundColor: category === i ? '#40334a' : c.panel,
                  }}
                >
                  <Body color={category === i ? c.gold : c.muted}>{item.name}</Body>
                </Pressable>
              ))}
            </View>
            <Row style={{ justifyContent: 'space-between', marginTop: 16 }}>
              <Button
                compact
                secondary
                disabled={group === 0}
                onPress={() => setGroup((n) => n - 1)}
              >
                Previous
              </Button>
              <Body color={c.gold}>
                {group + 1}/{groups.length} · {selectedGroup[1]}
              </Body>
              <Button
                compact
                secondary
                disabled={group === groups.length - 1}
                onPress={() => setGroup((n) => n + 1)}
              >
                Next
              </Button>
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 12, gap: 4 }}>
              {groups.map(([name, label], i) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={`Stats group ${name}`}
                  accessibilityState={{ selected: group === i }}
                  onPress={() => setGroup(i)}
                  style={{ padding: 10, backgroundColor: i === group ? '#40334a' : 'transparent' }}
                >
                  <Body color={i === group ? c.gold : c.muted}>{label}</Body>
                </Pressable>
              ))}
            </View>
            {selectedGroup[0].includes('adventurer spawners') && (
              <Body>
                Ratios apply before guild research. The guild fills teams in order: 2 fighters → 1
                wizard → 1 healer, using adventurers already waiting. Class skills are on their own
                class pages.
              </Body>
            )}
            {RULE_FIELDS.filter((f) => f.group === selectedGroup[0]).map((f) => (
              <Row
                key={f.key}
                style={{ justifyContent: 'space-between', paddingVertical: 8, gap: 8 }}
              >
                <Body style={{ flex: 1 }}>
                  {f.label}
                  {/^(silver|gold)\./.test(f.key) ? ' · linked to wood' : ''}
                </Body>
                <Row>
                  {edit && (
                    <Button
                      compact
                      secondary
                      disabled={
                        busy ||
                        draft[editableRuleKey(f.key)]! <=
                          RULE_FIELDS.find((x) => x.key === editableRuleKey(f.key))!.min
                      }
                      accessibilityLabel={`Decrease ${f.key}`}
                      onPress={() => setDraft(adjustRule(draft, f.key, -1))}
                    >
                      −
                    </Button>
                  )}
                  <Text
                    testID={`rule-${f.key}`}
                    style={{ color: c.gold, minWidth: 42, textAlign: 'center' }}
                  >
                    {rule({ config: draft }, f.key)}
                  </Text>
                  {edit && (
                    <Button
                      compact
                      secondary
                      disabled={
                        busy ||
                        draft[editableRuleKey(f.key)]! >=
                          RULE_FIELDS.find((x) => x.key === editableRuleKey(f.key))!.max
                      }
                      accessibilityLabel={`Increase ${f.key}`}
                      onPress={() => setDraft(adjustRule(draft, f.key, 1))}
                    >
                      +
                    </Button>
                  )}
                </Row>
              </Row>
            ))}
          </Panel>
          <Panel>
            <Heading>Live world inventory</Heading>
            <Body>
              {g.actors.length} characters · {g.floors.length} floors · {g.parties.length} parties.
              Includes health, defense, perception, primary pools, XP, wealth, costs, chest
              contents, positions, queues, timers and current settings.
            </Body>
            <Button
              compact
              secondary
              onPress={() => setInspect(!inspect)}
              style={{ marginTop: 12 }}
            >
              {inspect ? 'Hide live values' : 'Inspect all live values'}
            </Button>
            {inspect && (
              <Text
                selectable
                style={{ color: c.muted, fontFamily: 'monospace', fontSize: 11, marginTop: 12 }}
              >
                {JSON.stringify(
                  {
                    actors: g.actors,
                    floors: g.floors,
                    parties: g.parties,
                    escapedMobs: g.escapedMobs,
                    research: g.research,
                    researchJob: g.researchJob,
                    policy: g.policy,
                    fee: g.fee,
                    reserve: g.reserve,
                    officeHealth: g.officeHealth,
                    staffRoom: g.staffRoom,
                  },
                  null,
                  2,
                )}
              </Text>
            )}
          </Panel>
        </>
      )}
    </View>
  );
}
function GoldChart({ g, forecast }: { g: GameState; forecast: ForecastPoint[] }) {
  const ledger = g.ledger ?? [],
    start = Math.max(g.ledgerSince ?? g.now, g.now - 24 * HOUR),
    end = g.now + 24 * HOUR;
  const recent = ledger.filter((e) => e.hour >= start);
  let earned = 0,
    spent = 0,
    balance = g.gold - recent.reduce((n, e) => n + e.amount, 0);
  const rows = [{ time: start, earned, spent, balance }];
  for (let hour = Math.floor(start / HOUR) * HOUR; hour <= g.now; hour += HOUR) {
    for (const e of recent.filter((e) => e.hour === hour)) {
      if (e.amount > 0) earned += e.amount;
      else spent -= e.amount;
      balance += e.amount;
    }
    rows.push({ time: Math.max(start, hour), earned, spent, balance });
  }
  rows.push({ time: g.now, earned, spent, balance: g.gold });
  const max = Math.max(
    100,
    ...rows.flatMap((r) => [r.earned, r.spent, r.balance]),
    ...forecast.map((p) => p.gold),
  );
  const x = (time: number) => 44 + ((time - start) / Math.max(HOUR, end - start)) * 540,
    y = (gold: number) => 185 - (gold / max) * 160;
  const line = (key: 'earned' | 'spent' | 'balance') =>
    rows.map((r) => `${x(r.time)},${y(r[key])}`).join(' ');
  return (
    <View
      accessibilityLabel="Gold history and dotted 24-hour forecast chart"
      style={{ width: '100%', marginVertical: 12 }}
    >
      <Svg width="100%" height={220} viewBox="0 0 600 220">
        {[0, 0.5, 1].map((n) => (
          <React.Fragment key={n}>
            <Line x1={44} x2={584} y1={y(max * n)} y2={y(max * n)} stroke="#49404e" />
            <SvgText x={40} y={y(max * n) + 4} textAnchor="end" fill={c.muted} fontSize={10}>
              {Math.round((max * n) / 100)}
            </SvgText>
          </React.Fragment>
        ))}
        <Polyline points={line('earned')} fill="none" stroke={c.green} strokeWidth={2} />
        <Polyline points={line('spent')} fill="none" stroke={c.red} strokeWidth={2} />
        <Polyline points={line('balance')} fill="none" stroke={c.gold} strokeWidth={2} />
        <Polyline
          points={forecast.map((p) => `${x(p.time)},${y(p.gold)}`).join(' ')}
          fill="none"
          stroke={c.gold}
          strokeWidth={2}
          strokeDasharray="4 5"
        />
        <Line x1={x(g.now)} x2={x(g.now)} y1={20} y2={185} stroke={c.muted} strokeDasharray="2 4" />
        <SvgText x={44} y={207} fill={c.muted} fontSize={11}>
          Hour {Math.floor(start / HOUR)}
        </SvgText>
        <SvgText x={x(g.now)} y={207} fill={c.gold} fontSize={11} textAnchor="middle">
          Now
        </SvgText>
        <SvgText x={584} y={207} fill={c.muted} fontSize={11} textAnchor="end">
          +24h
        </SvgText>
      </Svg>
    </View>
  );
}
