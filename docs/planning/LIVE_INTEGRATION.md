# Live integration checkpoint — 22 September 2026

## Connected

The live renderer now uses the reviewed TierArt components for characters (including mini-icons), traps, closed chest/mimic disguises, slimes, puddles and furnished floor backgrounds. Existing depleted-chest and revealed-mimic states retain visible indicators. Visitor rest doors follow the room tier. Research cards display the new icons.

Party attack, spell, heal, lock and gold cues use the pre-baked action strips. Waiting, maintenance, town arrival and mob arrival previews are attached to the corresponding live states. One shared animation clock drives live strips and stops in the background or with reduced motion. Gameplay continues to use its deterministic simulation ticks; visual effects do not award XP or money.

Research progression includes floors II–V, traps II–V, mobs II–V, adventurers II–V, builder hiring II–IV, maintenance/defender training II–V, visitor rooms II–IV and staff rooms II–III. Supporting effects include guild III, regional ads, containment, toolbelts/reset kits, unpaid overtime and Guild Grant.

- Fixture upgrades are paid commands in the layout editor. Existing fixtures do not silently jump to tiers III–V. Gold fixtures upgrade to crystal/royal materials in the existing gold slot type.
- Staff training is exposed on staff character cards at the office, preserves earned growth and sends depleted resources through staff recovery.
- Spawn bonuses use the strongest reduction. Active play remains a separate speed bonus.
- Chest rolls are deterministic, allow each eligible member an attempt, consume stamina and award experience on attempts.
- Research room rates affect both simulation recovery and roster ETAs.
- New save fields and expanded research/spawn-tier validation preserve ongoing games. A one-time migration replaces known old default prices/durations while preserving non-default tuning. Original save generations remain handled by the existing persistence layer.

## Not yet complete

The full request is not complete. The clarification asked in this task remains pending. No bear/fire traps or skeleton ghoul stats were invented. Conflicting builder-V hiring, five-vs-six-point capacity, Luxury staff recovery, and cumulative upgrade stamina still need resolution. Current conservative behavior is builder hiring capped at IV, arrival points capped by both tier and advertising unlock, staff rooms capped at III, and the existing builder work/stamina model.

Additional planning-only finance controls (independent per-depth admission policies, reserve target controls, and research-gated payroll planning) still need dedicated integration. The existing global policy and Stats forecast remain in place. Planning tables remain design documents; arbitrary free-text edits do not directly execute as live rules.

Research costs absent from the reviewed descriptions use the demo convention of 5 gold per research hour for new nodes. Fixture upgrades use 10 gold × destination tier. These are implementation defaults rather than approved balance targets.

## Validation

172 simulation/data tests passed, followed by a separate five-test integration run including the new default migration check. TypeScript passes. The browser suite had 68 passing checks plus eight obsolete menu/art/timing assertions; those eight were updated and all eight passed on rerun. Desktop and phone tutorial, save/reload, movement, rest, layout and research checks are covered. The user's current dungeon was reloaded successfully without a reset.
