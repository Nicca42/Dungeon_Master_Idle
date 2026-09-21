import React from 'react';
import { View } from 'react-native';
import { Progress } from './ui';
function HealthBarsImpl({
  health,
  maxHealth = 10,
  defense = 0,
  maxDefense = 10,
  width = 26,
}: {
  health: number;
  maxHealth?: number;
  defense?: number;
  maxDefense?: number;
  width?: number;
}) {
  return (
    <View
      accessibilityLabel={`Defense ${defense}/${maxDefense}, health ${health}/${maxHealth}`}
      style={{ width, gap: 2, marginBottom: 3 }}
    >
      <Progress value={defense / Math.max(1, maxDefense)} height={3} color="#6ea8ff" />
      <Progress value={health / Math.max(1, maxHealth)} height={3} color="#e56a75" />
    </View>
  );
}

export const HealthBars = React.memo(HealthBarsImpl);
