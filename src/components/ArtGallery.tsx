import React, { useState } from 'react';
import { ArtAssetTable } from './ArtAssetTable';
import { PlanningTables } from './PlanningTables';
import { View } from 'react-native';
import { GameState } from '../game/types';
import { Button, Row } from './ui';
export function ArtGallery({ g }: { g: GameState }) {
  const [page, setPage] = useState<'art' | 'tables'>('art');
  return (
    <View style={{ gap: 16 }}>
      <Row style={{ flexWrap: 'wrap' }}>
        <Button compact secondary={page !== 'art'} onPress={() => setPage('art')}>
          Art table
        </Button>
        <Button compact secondary={page !== 'tables'} onPress={() => setPage('tables')}>
          Planning tables
        </Button>
      </Row>
      <View style={{ display: page === 'tables' ? 'flex' : 'none' }}>
        <PlanningTables />
      </View>
      <View style={{ display: page === 'art' ? 'flex' : 'none', gap: 16 }}>
        <ArtAssetTable choices={g.artChoices ?? {}} active={page === 'art'} />
      </View>
    </View>
  );
}
