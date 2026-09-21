import { RestRoomPanel } from './RestRoomPanel';
import React from 'react';
import { GameState, Actor } from '../game/types';
import { staffRoom, staffRestRoster } from '../game/staffRest';
import { Button } from './ui';
import { dispatch } from '../game/store';
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
    <RestRoomPanel
      title="Staff-only office rest room"
      capacity={room.capacity}
      roster={staffRestRoster(g)}
      waiting={room.queue.flatMap((id) => {
        const a = g.actors.find((a) => a.id === id);
        return a ? [a] : [];
      })}
      now={now}
      onActor={onActor}
    >
      <Button
        compact
        disabled={busy || g.gold < 500 || room.capacity >= 100}
        onPress={() => void dispatch({ type: 'expandStaffRoom' })}
        style={{ marginTop: 8 }}
      >
        Expand staff room · +1 person · 5 gold
      </Button>
    </RestRoomPanel>
  );
}
