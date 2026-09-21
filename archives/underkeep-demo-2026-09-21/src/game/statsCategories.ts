/** Presentation only: underlying baseline keys and saved values remain unchanged. */
export const STATS_CATEGORIES = [
  {
    name: 'Adventurers',
    pages: [
      ['fighter', 'Fighter'],
      ['Level 2 fighter', 'Level 2 fighter'],
      ['wizard', 'Wizard'],
      ['Level 2 wizard', 'Level 2 wizard'],
      ['healer', 'Healer'],
      ['Level 2 healer', 'Level 2 healer'],
      ['Level 1 adventurer spawners', 'Level 1 spawner'],
      ['Level 2 adventurer spawners', 'Level 2 spawner'],
    ],
  },
  {
    name: 'Mobs',
    pages: [
      ['slime', 'Slimes'],
      ['Slime spawners', 'Slime spawners'],
      ['zombie', 'Zombies'],
      ['Zombie spawners', 'Zombie spawners'],
    ],
  },
  {
    name: 'Traps',
    pages: [
      ['arrows', 'Arrows'],
      ['trapdoor', 'Trap doors'],
      ['mimic', 'Mimics'],
    ],
  },
  {
    name: 'Treasure',
    pages: [
      ['wood', 'Wood'],
      ['silver', 'Silver'],
      ['gold', 'Gold'],
    ],
  },
  {
    name: 'Economy',
    pages: [
      ['Costs', 'Costs'],
      ['Economy', 'Economy'],
    ],
  },
  {
    name: 'Staff',
    pages: [
      ['miner', 'Diggers'],
      ['maintenance', 'Maintainers'],
      ['defender', 'Defenders'],
    ],
  },
  { name: 'Dungeon', pages: [['Floor group', 'Floor groups']] },
  {
    name: 'Simulation',
    pages: [
      ['Timing', 'Timing'],
      ['Research', 'Research'],
    ],
  },
] as const;
