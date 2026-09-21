import React, { useState } from 'react';
import { View } from 'react-native';
import Svg from 'react-native-svg';
import { GameState, ArtChoices } from '../game/types';
import { dispatch } from '../game/store';
import { Sprite, SpriteKind } from './PixelArt';
import { SpawnArt } from './ArtVariants';
import { Body, Button, Heading, Panel, Row } from './ui';
const names = {
  coffin: ['Crooked oak', 'Iron-bound crypt', 'Amethyst vault', 'Mosswood', 'Royal casket'],
  puddle: ['Ripple pool', 'Bubble bog', 'Azure ooze', 'Glow spring', 'Moss mire'],
  zombie: ['Shambler', 'Gravedigger', 'Bonewalker', 'Fallen guard', 'Fungal husk'],
  fighter: ['Sellsword', 'Vanguard', 'Cloaked duelist', 'Iron sentinel', 'Horned champion'],
  wizard: ['Wandering mage', 'Battle scholar', 'Hooded mystic', 'Rune keeper', 'Archmage'],
  healer: ['Pilgrim', 'Sun cleric', 'Grove keeper', 'Temple guardian', 'Antler oracle'],
};
export function ArtGallery({ g }: { g: GameState }) {
  const [category, setCategory] = useState<keyof ArtChoices>('coffin');
  const [draft, setDraft] = useState<ArtChoices>(g.artChoices ?? {});
  const [notice, setNotice] = useState('');
  const count = category === 'coffin' || category === 'puddle' ? 1 : 3;
  const value = draft[category];
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const choose = (v: number) => {
    const picks =
      count === 1
        ? [v]
        : selected.includes(v)
          ? selected.filter((n) => n !== v)
          : selected.length < 3
            ? [...selected, v]
            : selected;
    setDraft({ ...draft, [category]: count === 1 ? picks[0] : picks });
    setNotice('');
  };
  return (
    <View style={{ gap: 16 }}>
      <Heading>Choose the dungeon’s new look</Heading>
      <Body>
        Pick one coffin and puddle, and three designs for zombies and each adventurer class.
        Character selections cycle in the order you choose, with ±20% saturation on new spawns. Each
        card shows a large preview and its tiny game icon.
      </Body>
      <Row style={{ flexWrap: 'wrap' }}>
        {Object.keys(names).map((key) => (
          <Button
            key={key}
            compact
            secondary={category !== key}
            onPress={() => {
              setCategory(key as keyof ArtChoices);
              setNotice('');
            }}
          >
            {key}
          </Button>
        ))}
      </Row>
      <Body>
        {category} · {selected.length}/{count} selected
      </Body>
      <Row style={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
        {names[category].map((name, i) => (
          <Panel key={`${category}-${i}`} style={{ width: 180, flexGrow: 1 }}>
            <Heading size={19}>
              {i + 1}. {name}
            </Heading>
            <Row style={{ height: 115, alignItems: 'center', justifyContent: 'center' }}>
              {category === 'coffin' || category === 'puddle' ? (
                <>
                  <Svg width={100} height={100} viewBox="-3 -4 40 40">
                    <SpawnArt kind={category} variant={i + 1} />
                  </Svg>
                  <Svg width={30} height={30} viewBox="-3 -4 40 40">
                    <SpawnArt kind={category} variant={i + 1} />
                  </Svg>
                </>
              ) : (
                <>
                  <Sprite kind={category as SpriteKind} variant={i + 1} size={90} />
                  <Sprite kind={category as SpriteKind} variant={i + 1} size={25} />
                </>
              )}
            </Row>
            <Button compact secondary={!selected.includes(i + 1)} onPress={() => choose(i + 1)}>
              {selected.includes(i + 1)
                ? `Selected · ${selected.indexOf(i + 1) + 1}`
                : `Choose ${i + 1}`}
            </Button>
          </Panel>
        ))}
      </Row>
      <Button
        disabled={selected.length !== count}
        onPress={async () => {
          await dispatch({ type: 'artChoices', choices: { [category]: draft[category] } });
          setNotice('Saved. Spawner art updates now; character designs apply to new spawns.');
        }}
      >
        Apply {category} selection
      </Button>
      {!!notice && <Body>{notice}</Body>}
    </View>
  );
}
