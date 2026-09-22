import React from 'react';
import { GameState } from '../game/types';
import { unlockedTier } from '../game/progression';
import { tierStaffHireCost } from '../game/config';
import { dispatch } from '../game/store';
import { Button, Row } from './ui';
export function StaffHireButtons({
  g,
  role,
  busy,
}: {
  g: GameState;
  role: 'maintenance' | 'miner' | 'defender';
  busy: boolean;
}) {
  const name = role === 'maintenance' ? 'Maintainer' : role === 'miner' ? 'Digger' : 'Defender';
  return (
    <Row style={{ flexWrap: 'wrap' }}>
      {Array.from({ length: unlockedTier(g, 'staff') }, (_, i) => i + 1).map((tier) => {
        const price = tierStaffHireCost(g, tier);
        return (
          <Button
            key={tier}
            disabled={busy || !g.research.includes('staff') || g.gold < price * 100}
            onPress={() => void dispatch({ type: 'hireStaff', role, tier })}
          >
            {`${name} ${['I', 'II', 'III', 'IV', 'V'][tier - 1]}\n${price} gold`}
          </Button>
        );
      })}
    </Row>
  );
}
