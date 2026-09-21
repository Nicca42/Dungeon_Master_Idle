# Underkeep — completed demo specification

Frozen 21 September 2026. This is the implemented demo, not a promise of production scope. It supersedes the original planning documents where they differ. The executable authority is the archived source and tests; [BALANCE_CATALOG.json](BALANCE_CATALOG.json) records all exposed baseline keys, ranges, defaults and research entries directly from code. A player's saved Deep stats overrides can differ from these defaults.

## Product and platform

Single-player, pixel-style 2D dungeon management. The player builds and prices a dungeon, attracts autonomous parties, and maintains its encounters and rest facilities. Revenue comes from entry, checkpoint stat gains, training and rest fees. Spending includes construction, research, recruitment, security wages and stocking treasure. Browser demo plus shared iOS/Android Expo application code. No backend, account, purchases, ads SDK or cloud synchronization. Physical-device release qualification is not complete.

Navigation: Dungeon, Build, Research, Office, Stats, Demo settings. Only Demo settings contains time skips, prepared-demo loading, restart, recovery grant when eligible, excavation spells and art selection. These are development aids, not production monetization.

## Time and determinism

- One real hour equals 24 game hours. Five game minutes equal 12.5 real seconds.
- The base rules tick is five game minutes. Exact party-arrival and maintenance completion deadlines can settle between ticks.
- World time advances through timestamp catch-up when returning. The OS does not run a background game loop while closed.
- Active play doubles adventurer spawn and research progress only. Construction, combat, rest and the world clock retain normal rates. Offline time and demo skips use normal rates.
- Presentation time refreshes every 250 ms; foreground state synchronization runs every second; normal periodic saving is five seconds. Commands save before publishing their new state.
- RNG state, next tick, task deadlines and pending catch-up target are saved. Offline catch-up is processed in game-day chunks, with checkpoints and yielding between chunks.
- Time is integer milliseconds; displayed countdowns are game HH:MM and the world clock shows day and AM/PM hours.

## Setup and construction

A ten-step guided setup opens the relevant menu. Required enabled buttons pulse gold. Hire three diggers individually, queue three excavations individually, fast-track the first floor, configure encounters through focused tooltips, buy the first rest room without leaving that guide, configure finances, hire three maintainers individually, open the dungeon, then complete the initial party with a free spawn.

Five visible floor shells are initially available. Repeated depth research unlocks five more to a maximum of 50. The work sequence is excavation → foundation → furnishing → fixture installation → open. Digging a deeper floor waits for furnishing of its predecessor. Three active diggers establish the base throughput: 10 real minutes for floor 1, multiplied by 1.5 for each deeper floor. Faster Digging doubles throughput; more active diggers scale it linearly. Actual completion includes queued work and rest. Two free excavation spells finish digging only, not foundation/furnishing.

Newly furnished floors require a 5-gold installation order. Maintainers install fixtures; only a complete floor can open. Tutorial construction has subsidies/fast-tracking. Structural health and defense derive from the floor tier and cannot be directly changed in ordinary floor settings. Deep stats remains an explicit demo-wide configuration editor. Attacks exceeding floor defense cause structural damage equal to the excess. Maintainers repair damage. There is no implemented structural-collapse simulation.

## Final floor rendering and editing

Each floor has 15 equal horizontal columns: exit cave, 12 fixture slots, rest room, onward entry cave. Parties traverse left to right. Do not revert to alternating-direction floors or spiral stairs.

Top to bottom:

1. A single centered heading line: `02 - The Mossy Hollow | Mobs: 0/2 | Parties: 4`, with status and, when applicable, construction timing in the same line.
2. A 40-unit fixture-information row: chest gold, trap name/damage/XP, rest occupancy/waiting counts, spawn or maintenance timer. Each label group is centered horizontally in its column and vertically in the row.
3. An 18-unit resource-bar row. Defense is blue and above red health; worker stamina is green.
4. A 60-unit scene row containing characters, fixtures and cave doors.

The header is 28 design units: total floor height 146 before separators. The dungeon canvas is 640 design units wide and scales to available width; zoom allows detailed viewing. These are design units, not guaranteed physical pixels. Brickwork and pillars continue behind information, bars and scene, with a light tint for readability. Undug floors use dirt; excavation, foundations and upgrades reveal their backgrounds progressively. Counter warnings are yellow at cap and red above cap. Spawners no longer repeat “At limit” text. Compact action bubbles stay inside the actor row.

Layout editing offers drag/drop and move buttons, within the 12 fixture slots only; cave/rest positions are fixed. Changes can save while actors are present and preserve encounter identity/progress. Empty slots can add unlocked fixtures. The current state contains one shared policy and layout template; despite five-floor visual grouping, fully independent per-group rule storage is a production gap.

## Characters, combat and progression

Classes are fighter, wizard and healer. Staff are diggers, maintainers and defenders. Baseline primary ratings, health, defense, stamina, damage, speed, intelligence and learning threshold are generally 10; adventurer starting wealth is 20 gold. Level-two spawns use doubled ratings. Current health, defense, stamina and primary resource are separate from their maximum/permanent ratings.

Implemented combat is deterministic shield-first damage, not D&D armor-class/d20 combat:

```
shieldLoss = min(currentDefense, attackPower)
healthLoss = min(currentHealth, attackPower - shieldLoss)
```

Fighters and wizards attack with damage plus available primary resource. Fighter attacks cost one stamina; wizard attack stamina is max(1, floor(power / 10)). Using a primary resource consumes one point when available. Healing power is available divinity plus intelligence; healing first restores health, and power tier two or above can send overflow into defense. Stamina use awards one XP event for the use, not one per stamina point. Absorbed hits award defense XP; health loss awards health XP. Movement, manipulation and attacks award their relevant XP. Basic fighter interception is implemented; full positional blocking and a complete wizard protection/counterspell system are not.

Character cards show activity, queued intent, class-colored primary rating, base skills and gold XP bars. XP can exceed a single threshold. Adventurers bank gains at a floor checkpoint; per-stat gains charge available pooled party wealth, without creating debt. Failure before the checkpoint discards unbanked XP. Staff bank XP on office rest. Healer work in a rest room is credited to the following floor checkpoint.

Level is floor(minimum permanent combat/resource rating / 10). The actual entrance predicate is alive, level at least 1 and no higher than the first floor's level, and wealth sufficient for entry. This is an upper admission tier, not a minimum-tier-only gate. Newly ineligible arrivals leave immediately; unassigned ineligible town members are removed on simulation updates. Eligible unpartied characters wait indefinitely. The old training aspiration conflicts with this immediate-departure policy: training UI/mechanics remain, but do not promise every rejected arrival a training opportunity.

## Parties, guild and spawners

Ordinary class spawning uses configurable ratios (default 3 fighter : 2 wizard : 1 healer) and caps. Caps affect new spawns, not recruitment from the waiting backlog. Population accounting excludes departed/irrelevant lifecycle states. A legal party requires two fighters, one wizard and one healer. Basic guild recruitment drains eligible complete teams independently of new arrivals/caps; guild-directed spawning prioritizes missing roles. Guild level 2 shortens formation from 20 to 15 real seconds, reduces spawn interval and increases population capacity. Exact editable values are in the balance catalog.

Local Ads permits two purchased extra spawn points; each adds capacity. Level-two adventurer research enables spawn-point upgrades. Arrival points are staggered across a cycle. Monster nests are staggered too, with capped production storing one ready spawn rather than accumulating a burst backlog. Mob occupancy belongs to the floor currently occupied, including transferred mobs. Monsters pursue parties, ignore maintainers, and patrol near the exit if no party remains. Exit passage succeeds with 20% probability per attempt. Escaped mobs threaten headquarters; defenders engage them. Headquarters destruction ends the run.

## Fixtures, staff and rest

Trap doors and arrow traps become spent and need resetting. Living mimics self-reset; basic ones resemble wooden chests and tier two resembles silver. Triggering a mimic grants it XP. Empty ordinary treasure chests retain their material and show open lids; their gold label is red at zero. Silver values derive from wood at 2×, gold at 4× through the rule resolver. Destroyed nonliving fixtures show a red silhouette until replaced.

Reset priority interrupts installation if a maintainer has the necessary stamina. Partial progress and whether installation stamina was paid are stored on the fixture and survive reload; another maintainer may resume it. Reset work finishes before installation resumes; resumption does not charge that installation again. Unfinished installations retain a partial progress ring.

```
effectiveSpeed = max(1, speed) × (Fleet-footed research ? 2 : 1)
resetSkill = effectiveSpeed + intelligence
resetDifficulty = baseDifficulty + (tier - 1) × difficultyPerLevel
steps = trunc((resetDifficulty - resetSkill) / skillStep)
multiplier = max(minimumPercent / 100, 1 + steps × percentPerStep / 100)
resetMinutes = baseMinutes × multiplier
```

Defaults: difficulty 20 plus 10 per tier, skill step 5, adjustment 20%, base five game minutes, minimum 20% of base. Skill 20 against difficulty 20 takes five minutes; difficulty 30 takes seven. Travel is separate and scales inversely with effective speed. Other maintenance jobs use the maintenance-hours rule and speed. Active maintenance replaces the fixture's information with a ring and remaining HH:MM; the ring is no longer over the worker's head.

Purchased dungeon rest rooms admit party members individually in FIFO order; a whole party need not fit. Capacity increases admit waiting members. Parties continue once all members are fully recovered, including healing. If no member gains a bed for six game hours, the party leaves and complains. Recovered members are summarized by party counts above the onward cave, not drawn outside the rest door. Waiting checks occur every five game minutes with a brief icon.

Staff have a separate blue-door office rest room, initially 10 capacity, expandable for 5 gold per person. It excludes visitors; staff recover here and bank XP. Maintainers/defenders wait at their station only when ready for duty. Staff rest-threshold research makes the policy configurable. Defender wages are 1 gold per working game hour by default, not during rest. Health, defense, stamina and primary resource recover at one point per two quiet game hours outside rooms; beds restore each at one point per half game hour. Not every attribute is a consumable resource: damage, speed and intelligence remain ratings.

All room menus use matching collapsed occupant lists, with persistent capacity-expansion access for the staff room. Occupant buttons show saved icon → job/class → name and remaining HH:MM. Rest fees are configured in floor settings.

## Research, finance, statistics and art

Research pages: Traps, Dungeon depths, Finance, Staff investment, Adventurer attractions, Treasure. Next available items are emphasized; completed items are below. A live purple research banner opens its page. Building is shared across categories, not purchased twice; upgrades proceed deepest first. The generated catalog contains every research ID, cost and duration, including the already-completed Get diggin' policy.

Stats provides treasury history by cause, a dotted 24-game-hour forecast, adventure XP/damage/death/party history and categorized Deep stats. Forecasting runs three seeded copies and displays their mean; it is not a guaranteed expected value or calibrated confidence interval. Deep stats has explicit edit/save, about one second of progress indication, persistent baseline overrides, and recalculation of affected existing entities/jobs. Ordinary floor health/defense are not editable outside this deliberate baseline tool.

Art defaults frozen from the user's chosen designs: coffin 4, puddle 1; zombies [1,3,5], fighters [1,3,4], wizards [2,1,3], healers [1,3,4]. Order matters. New actors cycle these with 0.8–1.2 saturation multipliers; existing actors keep saved appearance. Scene and mini portraits share variants and palette. Settings apply to subsequent spawns; custom selections remain per save while these defaults seed new games.

## Persistence and limits

Web uses localStorage `underkeep-demo-v1` (current/previous serialized generations) and `underkeep-baseline-v1`. Native uses `underkeep.db`, WAL, and exclusive transactions for save generations. Zod validates decoded saves with additive compatibility defaults. Baseline writes and save writes are not one cross-record transaction. A malformed outer browser JSON envelope can defeat the inner-generation fallback; this is documented production hardening work.

Gold is stored in hundredths. The gold ledger aggregates reason/hour and retains at most 4,000 entries; adventure history retains 720 hourly samples. No infinite history or bank-grade accounting claim is made. The snapshot contains all source and assets, not the player's browser/device save, signing material, dependencies or generated builds. This archive does not alter the live dungeon.

Non-goals: bosses, merchants, race modifiers, full equipment inventory, pathfinding around other parties, audio, server authority, cloud saves, app-store shipping, or an engine rewrite. See the [research report](RESEARCH_REPORT.md) for the proposed next phase and [verification](VERIFICATION.md) for evidence and limitations.
