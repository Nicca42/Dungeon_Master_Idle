import { Research } from './types';
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const TICK = 5 * MINUTE;
export const RESEARCH: Research[] = [
  {
    id: 'guild',
    name: 'Basic Adventurers Guild',
    description:
      'A recruitment stand that prioritizes missing party roles among eligible, unpartied adventurers.',
    cost: 1500,
    hours: 2,
    icon: 'staff',
  },
  {
    id: 'getDigging',
    name: "Get diggin'",
    description: 'The first five dungeon floors are unlocked.',
    cost: 0,
    hours: 0,
    icon: 'pick',
  },
  {
    id: 'betterTraps',
    name: 'Better basic traps',
    description:
      'Medium · Mimics II resemble silver chests and deal 10–20 damage. Trap doors deal 10–20 damage and require perception 20.',
    cost: 2000,
    hours: 4,
    icon: 'trap',
  },
  {
    id: 'stealth',
    name: 'Beginner trap stealth',
    description:
      'Fast · Increase beginner trap detection difficulty by 1, up to 10. Advanced trap doors retain perception 20.',
    cost: 500,
    hours: 1,
    icon: 'trap',
  },
  {
    id: 'depths',
    name: 'Getting serious are we?',
    description: 'Large · Unlock the next five floors. Repeat to reach 50 floors.',
    cost: 3000,
    hours: 8,
    icon: 'pick',
  },
  {
    id: 'staffSpeed',
    name: 'Fleet-footed staff',
    description:
      'Medium · Double staff movement speed and speed up maintenance work. Level-two traps still take 50% longer to reset.',
    cost: 1500,
    hours: 4,
    icon: 'staff',
  },
  {
    id: 'staminaManagement',
    name: 'Better stamina management',
    description: 'Fast · Choose the stamina threshold at which staff take their next office break.',
    cost: 1000,
    hours: 1,
    icon: 'staff',
  },
  {
    id: 'level2Adventurers',
    name: 'Level 2 adventurers',
    description:
      'Medium · Upgrade individual town spawn points to attract adventurers with double baseline stats and elaborate class outfits.',
    cost: 2000,
    hours: 4,
    icon: 'staff',
  },
  {
    id: 'goldChests',
    name: 'Gold chests',
    description:
      'Medium · Unlock gold chests. Silver has twice the wood stats; gold doubles silver again.',
    cost: 2000,
    hours: 4,
    icon: 'chest',
  },
  {
    id: 'localAds',
    name: 'Local ads',
    description:
      'Unlock two extra adventurer spawn points. Each costs 25 gold and adds 10 to the adventurer population cap.',
    cost: 2000,
    hours: 4,
    icon: 'staff',
  },
  {
    id: 'traps',
    name: "It's a trap!",
    description: 'Trap doors, arrow walls, and suspiciously toothy chests.',
    cost: 500,
    hours: 1,
    icon: 'trap',
  },
  {
    id: 'mobs',
    name: 'Mob-tastic',
    description: 'Invite zombies and slimes to make themselves at home.',
    cost: 500,
    hours: 1,
    icon: 'mob',
  },
  {
    id: 'treasure',
    name: 'Treasure-me-timbers',
    description: 'Wood and silver chests. A little incentive goes a long way.',
    cost: 500,
    hours: 1,
    icon: 'chest',
  },
  {
    id: 'rest',
    name: 'Basic rest spots',
    description: 'Bunks, a tap, and a much-needed stamina refill.',
    cost: 500,
    hours: 1,
    icon: 'rest',
  },
  {
    id: 'door',
    name: 'Basic door policy',
    description: 'Level-one adventurers only. Set your entrance fee.',
    cost: 500,
    hours: 1,
    icon: 'door',
  },
  {
    id: 'finance',
    name: 'Sketchy finances',
    description: 'Decide how much admission income goes back into treasure.',
    cost: 500,
    hours: 1,
    icon: 'coin',
  },
  {
    id: 'staff',
    name: 'Staff management',
    description: 'Hire maintenance workers and keep an eye on your crew.',
    cost: 500,
    hours: 1,
    icon: 'staff',
  },
  {
    id: 'training',
    name: 'Short-sighted training',
    description: '+1 to all stats. Including the XP requirement. How convenient.',
    cost: 500,
    hours: 1,
    icon: 'training',
  },
  {
    id: 'digging',
    name: 'Faster digging',
    description: 'Bigger shovels. Twice the excavation speed.',
    cost: 1000,
    hours: 4,
    icon: 'pick',
  },
  {
    id: 'building',
    name: 'Better building',
    description:
      'Reinforced foundations: 20 health and defense. Builders upgrade furnished floors from deepest to shallowest. Novice builders take twice as long.',
    cost: 1500,
    hours: 6,
    icon: 'build',
  },
];
export const TUTORIAL = [
  {
    title: 'Every empire starts somewhere.',
    text: 'An abandoned office. A patch of land. Questionable ambition. Open your headquarters and put this dungeon on the map.',
    action: 'Open headquarters',
    label: 'Establish your office',
    cost: 'FREE',
  },
  {
    title: 'Meet your ground-breaking team.',
    text: 'Hire three miners. They dig, build, and complain about the lack of a break room. A promising start.',
    action: 'Excavate three floors',
    label: 'Hire your first crew',
    cost: '30 GOLD',
  },
  {
    title: 'Think below the surface.',
    text: 'Queue the first three floors. Your crew will work their way down, one shovel at a time.',
    action: 'Queue three excavations',
    label: 'Plan your first floors',
    cost: '5 GOLD PER FLOOR',
  },
  {
    title: 'A little head start.',
    text: 'Build the first foundation. This tutorial boost finishes only floor one, so we can get to the fun part.',
    action: 'Build & fast-track floor 1',
    label: 'Lay the first foundation',
    cost: '10 GOLD',
  },
  {
    title: 'Make a terrible first impression.',
    text: 'A trap door, an arrow wall, a mimic, treasure, and two monster nests. Apply the starter layout to welcome your guests.',
    action: 'Furnish the first floor',
    label: 'Traps, monsters & treasure',
    cost: '10 GOLD',
  },
  {
    title: 'Evil needs a good night’s sleep.',
    text: 'Build one rest spot. Diggers recover here until their stamina is full. Bunk beds are cheaper than a union dispute.',
    action: 'Build 1 rest spot',
    label: 'Give everyone a break',
    cost: '5 GOLD',
  },
  {
    title: 'Let’s talk questionable finances.',
    text: 'Charge 1 gold per visitor and put 30% back into treasure. Add 20 gold to the treasure reserve to stock the first chests.',
    action: 'Set up dungeon finances',
    label: 'Set fees & fill the chests',
    cost: '20 GOLD',
  },
  {
    title: 'Someone has to reset the spikes.',
    text: 'Three maintenance workers will reset traps, rebuild mimics, and refill empty chests automatically.',
    action: 'Hire three maintainers',
    label: 'Keep the dungeon running',
    cost: '15 GOLD EACH',
  },
  {
    title: 'Open for misadventure.',
    text: 'The traps are primed. The beds are made. Welcome one curious fighter. From here, the dungeon runs even when you’re away.',
    action: 'Open the dungeon',
    label: 'Welcome your first party',
    cost: 'READY TO OPEN',
  },
  {
    title: 'Adventures are better together.',
    text: 'Invite a second fighter, a wizard and a healer for free. They will form your first party and walk to the dungeon cave together.',
    action: 'Spawn first party · free',
    label: 'Assemble the first party',
    cost: 'FREE PARTY',
  },
];
export const floorNames = [
  'The Welcome Depths',
  'The Mossy Hollow',
  'The Forgotten Vault',
  'The Ember Halls',
  'The Last Descent',
];
export const money = (value: number) =>
  (value / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
export const gameDate = (now: number) =>
  `Day ${Math.floor(now / DAY) + 1} · ${Math.floor(now / HOUR) % 12 || 12} ${Math.floor(now / HOUR) % 24 < 12 ? 'AM' : 'PM'}`;
