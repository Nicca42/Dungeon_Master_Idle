import { rule } from '../game/config';
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus, Minus, LockKeyhole, ArrowUp } from 'lucide-react-native';
import { GameState } from '../game/types';
import { dispatch } from '../game/store';
import { Body, Button, Divider, Heading, Label, Row } from './ui';
import { colors as c, fonts } from '../theme';
const tips = [
  {
    title: 'Make every adventure worthwhile',
    text: 'Actions earn XP. Each stat gained pays you 1 gold when the party finishes the floor. Balance rewards and difficulty so visitors survive.',
    keys: [],
  },
  {
    title: 'Trap doors',
    text: 'Trap doors deal 5–10 damage if unnoticed. They stay spent until a maintainer uses one stamina to reset them.',
    keys: ['trapdoors'],
  },
  {
    title: 'Arrow walls',
    text: 'Arrow walls deal 10–15 damage. Intelligence 5 spots the plate; adventurers avoid it and leave the trap armed.',
    keys: ['arrows'],
  },
  {
    title: 'Mimics',
    text: 'Mimics disguise themselves as chests. Defeat their shield and health; they recover themselves after one game hour.',
    keys: ['mimics'],
  },
  {
    title: 'Keep total trap strength under control',
    text: 'Caps limit the combined attack and defense of all traps on a floor. Lower caps help parties survive and bank their XP.',
    keys: ['trapAttackBudget', 'trapDefenseBudget'],
  },
  {
    title: 'Mobs have places to be',
    text: 'Zombies are fragile; slimes have stronger shields. Nests share the mob cap. Escaping mobs can threaten headquarters.',
    keys: ['mobSlots', 'attackBudget'],
  },
  {
    title: 'Treasure makes the trip worthwhile',
    text: 'Wood locks need skill 10 and one stamina; silver needs 20 and two. Wizards add mana. Maintainers refill spent chests.',
    keys: ['wood', 'silver', 'treasureBudget'],
  },
  {
    title: 'Rest before the next floor',
    text: 'Rest rooms restore stamina. Party members share available beds and regroup before moving on. Extra beds cost 5 gold each.',
    keys: [],
  },
  {
    title: 'Your first floor recipe',
    text: 'Furnish floor one with these shared limits. Next, buy its rest room here. Use Edit floor layout later to reorder encounters.',
    keys: null,
  },
];
type Field = {
  key: Exclude<keyof GameState['policy'], 'zombieNests'>;
  label: string;
  max: number;
  step?: number;
  group?: string;
};
const fields: Field[] = [
  { key: 'trapdoors', label: 'Trap doors', max: 4, group: 'Traps' },
  { key: 'arrows', label: 'Arrow walls', max: 4 },
  { key: 'mimics', label: 'Mimics', max: 4 },
  { key: 'trapAttackBudget', label: 'Total trap attack cap', max: 100, step: 5 },
  { key: 'trapDefenseBudget', label: 'Total trap defense cap', max: 100, step: 5 },
  { key: 'mobSlots', label: 'Monster nests', max: 4, group: 'Mobs' },
  { key: 'mobLimit', label: 'Monster limit per floor', max: 30 },
  { key: 'attackBudget', label: 'Total mob attack cap', max: 100, step: 5 },
  { key: 'wood', label: 'Wood chests', max: 5, group: 'Treasure' },
  { key: 'silver', label: 'Silver chests', max: 5 },
  { key: 'gold', label: 'Gold chests', max: 5 },
  { key: 'treasureBudget', label: 'Stocked gold cap / floor', max: 100, step: 5 },
];
export function FloorSettings({
  g,
  busy,
  onEdit,
  onComplete,
  guided = false,
}: {
  g: GameState;
  busy: boolean;
  onEdit?: () => void;
  onComplete?: () => void;
  guided?: boolean;
}) {
  const [p, setP] = useState(g.policy),
    [tip, setTip] = useState(0);
  useEffect(() => setP(g.policy), [g.policyRevision, g.policy.restCapacity, g.policy.restFee]);
  const nextRestFloor = g.floors.find(
    (f) => ['ready', 'open'].includes(f.stage) && f.restSpots === 0,
  );
  const restStep = g.tutorial === 5;
  const current = restStep
      ? {
          title: 'Build your first rest spot',
          text: 'Buy a rest room below for 5 gold. Ten beds restore stamina so parties and diggers can continue. Parties share available beds.',
          keys: [],
        }
      : tips[tip]!,
    last = tip === tips.length - 1,
    allowed = g.tutorial >= 4;
  const used = p.trapdoors + p.arrows + p.mimics + p.wood + p.silver + p.gold + p.mobSlots;
  const displayed = fields;
  return (
    <View>
      <Row style={{ justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <Heading size={20} style={{ flex: 1 }}>
          Shared floor rules, level {g.policy.floorLevel}
        </Heading>
        <Button
          compact
          secondary
          icon={g.research.includes('building') ? ArrowUp : LockKeyhole}
          disabled={
            busy ||
            !g.research.includes('building') ||
            g.floors.some((f) => f.upgradeWork !== undefined) ||
            g.policy.floorLevel === 2 ||
            g.gold < rule(g, 'cost.upgrade') * 100
          }
          onPress={() => void dispatch({ type: 'upgradeFloors' })}
        >
          {g.policy.floorLevel === 2 ? 'Level 2' : 'Upgrade · 50g'}
        </Button>
      </Row>
      <Body style={{ marginTop: 7 }}>
        Stats: Defense: {g.policy.floorDefense}, Health: {g.policy.floorHealth}.
      </Body>
      {!g.research.includes('building') && (
        <Body style={{ fontSize: 10, marginTop: 4 }}>
          Upgrade requires Better Building research.
        </Body>
      )}
      {onEdit && (
        <Button
          secondary
          compact
          style={{ marginTop: 12 }}
          disabled={!g.floors.some((f) => ['ready', 'open'].includes(f.stage))}
          onPress={onEdit}
        >
          Edit floor layout
        </Button>
      )}
      <Divider />
      {guided && (
        <View
          accessibilityRole="alert"
          style={{
            backgroundColor: '#3b3038',
            borderColor: c.gold,
            borderWidth: 1,
            borderRadius: 9,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <Label color={c.gold}>
            Dungeon guide · {restStep ? tips.length + 1 : tip + 1} / {tips.length + 1}
          </Label>
          <Heading size={21} style={{ marginTop: 8 }}>
            {current.title}
          </Heading>
          <Body color={c.text} style={{ marginTop: 9, lineHeight: 19, fontSize: 12 }}>
            {current.text}
          </Body>
          <Row style={{ marginTop: 13 }}>
            {restStep && (
              <Button
                disabled={busy || g.gold < rule(g, 'cost.rest') * 100}
                onPress={() => void dispatch({ type: 'rest', floor: 1 })}
              >
                {`Build 1 rest spot · ${rule(g, 'cost.rest')} gold`}
              </Button>
            )}
            {tip > 0 && !restStep && (
              <Button compact secondary onPress={() => setTip(tip - 1)}>
                Back
              </Button>
            )}
            {!last && !restStep && (
              <Button compact onPress={() => setTip(tip + 1)}>
                Next tip
              </Button>
            )}
          </Row>
        </View>
      )}
      {(!guided || last) && !restStep && (
        <>
          <Divider />
          <Body color={used > 12 ? c.red : c.muted}>
            {used} / 12 encounter slots used. Occupied floors keep their encounters until empty.
          </Body>
          <Button
            style={{ marginTop: 14 }}
            disabled={busy || !allowed || used > 12}
            onPress={async () => {
              await dispatch({
                type: 'policy',
                policy: {
                  ...p,
                  restCapacity: g.policy.restCapacity,
                  floorHealth: g.policy.floorHealth,
                  floorDefense: g.policy.floorDefense,
                  floorLevel: g.policy.floorLevel,
                },
              });
              if (guided) onComplete?.();
            }}
          >
            {guided ? 'Furnish first floor · 10 gold' : 'Apply group settings'}
          </Button>
        </>
      )}
      {displayed.map((f) => (
        <View
          key={f.key}
          style={{
            opacity: restStep || (guided && !last && !current.keys?.includes(f.key)) ? 0.35 : 1,
            borderWidth: guided && !!current.keys?.includes(f.key) ? 1 : 0,
            borderColor: c.gold,
            borderRadius: 5,
            paddingHorizontal: 6,
          }}
        >
          {f.group && (
            <Label color={c.gold} style={{ marginTop: 14, marginBottom: 6 }}>
              {f.group}
            </Label>
          )}
          {f.key === 'mobSlots' && (
            <Body style={{ fontSize: 11 }}>
              The monster limit is separate from nest count. Arrivals from below count too; spawning
              pauses at the limit.
            </Body>
          )}
          {f.key === 'trapAttackBudget' && g.research.includes('betterTraps') && (
            <Body style={{ fontSize: 11 }}>
              Mimics II and upgraded trap doors need at least 10 attack cap each. Current minimum:{' '}
              {10 * (p.trapdoors + p.mimics)}.
            </Body>
          )}
          <Row style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
            <Body style={{ flex: 1 }}>{f.label}</Body>
            <Row>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${f.label}`}
                disabled={
                  restStep ||
                  !allowed ||
                  busy ||
                  (f.key === 'gold' && !g.research.includes('goldChests')) ||
                  p[f.key] === 0
                }
                onPress={() => setP({ ...p, [f.key]: Math.max(0, p[f.key] - (f.step ?? 1)) })}
                style={{ padding: 12 }}
              >
                <Minus color={c.muted} size={15} />
              </Pressable>
              <Text
                style={{
                  fontFamily: fonts.medium,
                  color: c.gold,
                  minWidth: 24,
                  textAlign: 'center',
                }}
              >
                {p[f.key]}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Increase ${f.label}`}
                disabled={
                  restStep ||
                  !allowed ||
                  busy ||
                  (f.key === 'gold' && !g.research.includes('goldChests')) ||
                  p[f.key] >= f.max
                }
                onPress={() => setP({ ...p, [f.key]: Math.min(f.max, p[f.key] + (f.step ?? 1)) })}
                style={{ padding: 12 }}
              >
                <Plus color={c.muted} size={15} />
              </Pressable>
            </Row>
          </Row>
        </View>
      ))}
      {true && (
        <>
          <Divider />
          <Row
            style={{
              justifyContent: 'space-between',
              opacity: guided && !last && tip !== 7 && !restStep ? 0.35 : 1,
              borderWidth: g.tutorial === 5 || (guided && tip === 7) ? 2 : 0,
              borderColor: c.gold,
              padding: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <Label color={c.gold}>Rest rooms</Label>
              <Body>{g.policy.restCapacity} beds per floor</Body>
            </View>
            {!restStep && (
              <Button
                compact
                disabled={
                  busy ||
                  (!g.research.includes('rest') && g.tutorial !== 5) ||
                  g.policy.restCapacity >= 30 ||
                  g.gold < rule(g, 'cost.rest') * 100
                }
                onPress={() => void dispatch({ type: 'rest', floor: 1 })}
              >
                {g.floors[0]!.restSpots === 0
                  ? `Build 1 rest spot\n-${rule(g, 'cost.rest')} gold`
                  : `${rule(g, 'cost.rest')} gold\n+1 rest`}
              </Button>
            )}
          </Row>
          {!guided && (
            <>
              <Button
                compact
                style={{ marginTop: 8 }}
                disabled={
                  busy ||
                  !nextRestFloor ||
                  g.gold < rule(g, 'cost.rest') * 100 ||
                  !g.research.includes('rest')
                }
                onPress={() =>
                  nextRestFloor && void dispatch({ type: 'rest', floor: nextRestFloor.id })
                }
              >
                {`add rest room to new floor\n-${rule(g, 'cost.rest')} gold`}
              </Button>
              <Body style={{ fontSize: 11, marginTop: 5 }}>
                {nextRestFloor
                  ? `Adds a rest room to floor ${nextRestFloor.id}.`
                  : 'Furnish a new floor to add its rest room.'}
              </Body>
            </>
          )}
          <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <Body>Rest fee / adventurer</Body>
            <Row>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease rest fee"
                disabled={busy || p.restFee <= 0}
                onPress={() => setP({ ...p, restFee: p.restFee - 1 })}
                style={{ padding: 12 }}
              >
                <Minus size={15} color={c.muted} />
              </Pressable>
              <Body color={c.gold}>{p.restFee} gold</Body>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase rest fee"
                disabled={busy || p.restFee >= 20}
                onPress={() => setP({ ...p, restFee: p.restFee + 1 })}
                style={{ padding: 12 }}
              >
                <Plus size={15} color={c.muted} />
              </Pressable>
            </Row>
          </Row>
          <Body style={{ fontSize: 11 }}>
            Once per adventurer per floor, on bed admission. Staff rest free. Payment is limited to
            available gold. Apply group settings to save.
          </Body>
        </>
      )}
    </View>
  );
}
