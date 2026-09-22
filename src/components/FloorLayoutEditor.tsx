import { fixtureTierLimit } from '../game/progression';
import { availableFixtures, fixtureName } from '../game/fixtures';
import React, { useEffect, useRef, useState } from 'react';
import { View, PanResponder, Animated, ScrollView, Pressable, Platform } from 'react-native';
import { GameState, Encounter } from '../game/types';
import { dispatch } from '../game/store';
import { Body, Button, Heading, Panel, Row } from './ui';
import { Sprite, FloorArt, SpriteKind } from './PixelArt';
import { ITEM_SLOTS } from '../game/layout';
import { colors as c } from '../theme';
const SLOT = 82;
function Tile({
  e,
  index,
  count,
  reversed,
  blocked,
  onDrop,
  onMove,
}: {
  e: Encounter;
  index: number;
  count: number;
  reversed: boolean;
  blocked: boolean;
  onDrop: (from: number, to: number) => void;
  onMove: (active: boolean) => void;
}) {
  const [active, setActive] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const x = useRef(new Animated.Value(0)).current;
  const latest = useRef({ index, count, reversed, blocked, onDrop, onMove });
  latest.current = { index, count, reversed, blocked, onDrop, onMove };
  const finish = () => {
    x.setValue(0);
    setActive(false);
    latest.current.onMove(false);
  };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.blocked,
      onMoveShouldSetPanResponder: () => !latest.current.blocked,
      onPanResponderGrant: () => {
        setActive(true);
        latest.current.onMove(true);
      },
      onPanResponderMove: (_, g) => {
        const v = latest.current;
        const visual = v.reversed ? v.count - 1 - v.index : v.index;
        x.setValue(Math.max(-visual * SLOT, Math.min((v.count - 1 - visual) * SLOT, g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        const v = latest.current;
        v.onDrop(v.index, v.index + Math.round(g.dx / SLOT) * (v.reversed ? -1 : 1));
        finish();
      },
      onPanResponderTerminate: finish,
    }),
  ).current;
  const sprite: SpriteKind =
    e.kind === 'wood'
      ? 'chest'
      : e.kind === 'trapdoor'
        ? 'trap'
        : (e.kind as SpriteKind);
  const label = ['zombie', 'slime'].includes(e.kind)
    ? `${e.kind} nest`
    : e.kind === 'mimic' && e.tier === 2
      ? 'Mimics II'
      : e.kind;
  return (
    <Animated.View
      testID={`layout-item-${e.id}-slot-${index + 1}`}
      style={{
        position: 'absolute',
        left: 30 + (reversed ? count + 1 - index : index + 1) * SLOT,
        top: 36,
        width: 76,
        alignItems: 'center',
        transform: [{ translateX: x }],
        zIndex: active ? 100 : 1,
      }}
    >
      {Platform.OS === 'web' ? (
        React.createElement(
          'div',
          {
            'aria-label': `Drag ${label} within this floor`,
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 8,
              border: `2px solid ${active ? c.gold : c.border}`,
              backgroundColor: c.raised,
              touchAction: 'none',
              userSelect: 'none',
              cursor: 'grab',
            },
            onPointerDown: (event: any) => {
              event.preventDefault();
              pointerStart.current = event.clientX;
              event.currentTarget.setPointerCapture(event.pointerId);
              setActive(true);
              latest.current.onMove(true);
            },
            onPointerMove: (event: any) => {
              if (pointerStart.current === null) return;
              const v = latest.current;
              x.setValue(
                Math.max(
                  -v.index * SLOT,
                  Math.min((v.count - 1 - v.index) * SLOT, event.clientX - pointerStart.current),
                ),
              );
            },
            onPointerUp: (event: any) => {
              if (pointerStart.current === null) return;
              const v = latest.current;
              const to = v.index + Math.round((event.clientX - pointerStart.current) / SLOT);
              pointerStart.current = null;
              v.onDrop(v.index, to);
              finish();
            },
            onPointerCancel: () => {
              pointerStart.current = null;
              finish();
            },
          },
          <>
            <Sprite kind={sprite} tier={e.tier} size={35} />
            <Body style={{ fontSize: 10 }}>{label}</Body>
          </>,
        )
      ) : (
        <View
          {...responder.panHandlers}
          accessibilityLabel={`Drag ${label} within this floor`}
          style={
            {
              alignItems: 'center',
              padding: 8,
              borderWidth: 2,
              borderColor: active ? c.gold : c.border,
              backgroundColor: c.raised,
              touchAction: 'none',
            } as any
          }
        >
          <Sprite kind={sprite} tier={e.tier} size={35} />
          <Body style={{ fontSize: 10 }}>{label}</Body>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {[-1, 1].map((direction) => (
          <Pressable
            key={direction}
            accessibilityRole="button"
            accessibilityLabel={`Move ${label} in slot ${index + 1} ${direction < 0 ? 'left' : 'right'}`}
            disabled={index + direction < 0 || index + direction >= count}
            onPress={() => onDrop(index, index + direction)}
            style={{
              width: 34,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.raised,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Body>{direction < 0 ? '←' : '→'}</Body>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}
export function FloorLayoutEditor({
  g,
  floor,
  onClose,
  onDragging,
}: {
  g: GameState;
  floor: number;
  onClose: () => void;
  onDragging: (active: boolean) => void;
}) {
  const [selected, setSelected] = useState(floor);
  const [dragging, setDragging] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const f = g.floors[selected - 1]!;
  const arrangement = () =>
    Array.from(
      { length: ITEM_SLOTS },
      (_, slot) => f.encounters.find((e, i) => !e.roaming && (e.slot ?? i) === slot)?.id ?? null,
    );
  const [ids, setIds] = useState<(number | null)[]>(arrangement);
  const signature = f.encounters.map((e) => `${e.id}:${e.slot}`).join(',');
  useEffect(() => setIds(arrangement()), [selected, signature]);
  useEffect(() => () => onDragging(false), []);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ITEM_SLOTS) return;
    setIds((old) => {
      const copy = [...old];
      [copy[from], copy[to]] = [copy[to]!, copy[from]!];
      return copy;
    });
  };
  const reversed = false;
  return (
    <Panel>
      <Heading>Edit shared floor layout · preview {selected}</Heading>
      <Body style={{ marginVertical: 12 }}>
        Drag items into the 12 numbered slots. Dropping onto another item swaps them. Doors and the
        rest room stay fixed. Saving applies to all unlocked and future floors. Follow sections 1–3
        from left to right; scroll sideways to see all three.
      </Body>
      <Row style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {g.floors.map((x) => (
          <Button
            key={x.id}
            compact
            secondary={x.id !== selected}
            disabled={dragging || !['ready', 'open'].includes(x.stage)}
            onPress={() => setSelected(x.id)}
          >
            Floor {x.id}
          </Button>
        ))}
      </Row>
      {!f.encounters.length && <Body>Furnish this floor first.</Body>}
      <ScrollView horizontal scrollEnabled={!dragging} style={{ marginVertical: 12 }}>
        <View
          style={{
            width: 15 * SLOT + 60,
            height: 205,
            borderWidth: 2,
            borderColor: c.gold,
            backgroundColor: c.bg,
          }}
        >
          {[0, 1, 2].map((section) => (
            <View
              key={section}
              style={{
                position: 'absolute',
                left: 30 + section * 5 * SLOT,
                top: 0,
                width: 5 * SLOT,
                height: 200,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Body style={{ textAlign: 'center' }}>Section {section + 1}</Body>
            </View>
          ))}
          {Array.from({ length: 15 }, (_, cell) => {
            const slot = cell - 1;
            const label =
              cell === 0
                ? 'Exit door'
                : cell === 13
                  ? 'Rest room'
                  : cell === 14
                    ? 'Entry door'
                    : `Item ${slot + 1}`;
            return (
              <View
                key={cell}
                style={{
                  position: 'absolute',
                  left: 30 + cell * SLOT,
                  top: 30,
                  width: 76,
                  height: 150,
                  borderWidth: 1,
                  borderStyle: cell > 0 && cell < 13 ? 'dashed' : 'solid',
                  borderColor: c.border,
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  paddingBottom: 6,
                }}
              >
                {cell > 0 && cell < 13 && ids[slot] === null && (
                  <Button compact onPress={() => setAdding(slot)}>
                    Add trap
                  </Button>
                )}
                <Body style={{ fontSize: 11 }}>{label}</Body>
                {(cell === 0 || cell >= 13) && (
                  <Body color={c.muted} style={{ fontSize: 10 }}>
                    Fixed
                  </Body>
                )}
              </View>
            );
          })}
          {ids.map((id, index) => {
            const e = f.encounters.find((e) => e.id === id);
            return e ? (
              <Tile
                key={`${selected}-${id}`}
                e={e}
                index={index}
                count={ids.length}
                reversed={reversed}
                blocked={false}
                onDrop={move}
                onMove={(active) => {
                  setDragging(active);
                  onDragging(active);
                }}
              />
            ) : null;
          })}
        </View>
      </ScrollView>
      <Row style={{ flexWrap: 'wrap' }}>
        {f.encounters
          .filter((e) => !e.roaming && (e.tier ?? 1) < fixtureTierLimit(g, e.kind))
          .map((e) => (
            <Button
              key={e.id}
              compact
              onPress={() =>
                void dispatch({ type: 'upgradeFixture', floor: f.id, encounter: e.id })
              }
            >
              Upgrade {e.kind} to {(e.tier ?? 1) + 1} · {((e.tier ?? 1) + 1) * 10} gold
            </Button>
          ))}
      </Row>
      {adding !== null && (
        <Panel>
          <Heading size={20}>Add trap · slot {adding + 1}</Heading>
          <Body>Choose an unlocked fixture. Maintenance installs it for one stamina.</Body>
          <Row style={{ flexWrap: 'wrap' }}>
            {availableFixtures(g).map((kind) => (
              <Button
                key={kind}
                compact
                onPress={async () => {
                  await dispatch({
                    type: 'reorder',
                    floor: selected,
                    ids: ids.filter((id): id is number => id !== null),
                    slots: ids.flatMap((id, slot) => (id === null ? [] : [slot])),
                  });
                  await dispatch({ type: 'addFixture', floor: selected, slot: adding, kind });
                  setAdding(null);
                }}
              >
                {fixtureName(g, kind)}
              </Button>
            ))}
            <Button compact secondary onPress={() => setAdding(null)}>
              Cancel
            </Button>
          </Row>
        </Panel>
      )}
      <Row>
        <Button
          disabled={!f.encounters.length}
          onPress={() =>
            void dispatch({
              type: 'reorder',
              floor: selected,
              ids: ids.filter((id): id is number => id !== null),
              slots: ids.flatMap((id, slot) => (id === null ? [] : [slot])),
            })
          }
        >
          Save layout
        </Button>
        <Button secondary onPress={onClose}>
          Done
        </Button>
      </Row>
    </Panel>
  );
}
