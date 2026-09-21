import React from 'react';
import { View } from 'react-native';
import { GameState, Actor } from '../game/types';
import { staffRoom, staffRestRoster } from '../game/staffRest';
import { Body, Heading, Button, Row, Panel } from './ui';
import { dispatch } from '../game/store';
import { countdown } from './LiveClock';
export function StaffRoom({
  g,
  busy,
  now,
  onActor,
}: {
  g: GameState;
  busy: boolean;
  now: number;
  onActor: (a: Actor) => void;
}) {
  const room = staffRoom(g);
  return (
    <Panel>
      <Heading size={20}>Staff-only office rest room</Heading>
      <Body color="#8fc7ff">
        {room.occupants.length}/{room.capacity} occupied · {room.queue.length} waiting
      </Body>
      <Body>
        Staff bank their XP here and recover before returning to work. Adventurers cannot enter.
        Defenders are not paid while resting.
      </Body>
      <Button
        compact
        disabled={busy || g.gold < 500 || room.capacity >= 100}
        onPress={() => void dispatch({ type: 'expandStaffRoom' })}
        style={{ marginTop: 10 }}
      >
        Expand staff room · +1 person · 5 gold
      </Button>
      {staffRestRoster(g).map(({ actor, end }) => (
        <Row key={actor.id} style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <Button compact secondary onPress={() => onActor(actor)}>
            {actor.name} · {actor.role}
          </Button>
          <Body>{countdown(end - now)} remaining</Body>
        </Row>
      ))}
      {room.queue.map((id) => {
        const a = g.actors.find((a) => a.id === id);
        return a ? <Body key={id}>{a.name} · waiting for a staff bed</Body> : null;
      })}
    </Panel>
  );
}
