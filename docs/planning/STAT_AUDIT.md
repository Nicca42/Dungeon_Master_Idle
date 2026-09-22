# Research-to-entity audit — 22 September 2026

Source: the user's saved research table in the demo, inspected through its UI. This table now differs from the original research-tree JSON. It has 10 research-stage columns; these are not 10 entity tiers. Entity tiers remain 1–5.

Updated entity-stats.v1.json and the demo's Entity stats table with:
- Builder hiring prices 5/10/15 for tiers I–III and researched hiring caps 5/10/15; the final builder improvement is recorded separately at 20 gold, speed 45 and cap 25.
- Floor background tiers and cumulative additional upgrade stamina 1/2/3/4 for structures II–V. Baseline upgrade stamina remains unspecified rather than invented.
- Staff training fees 10/10/15/20 for target tiers II–V, office training, earned-stat preservation, and conditional speed/tool/wage modifiers.
- Adventurer spawner interval multipliers 0.75/0.75/0.5/0.25/0.25 and maximum points 2/3/4/5/6. Guild modifiers remain separate: their stacking with the new tier multipliers needs a decision.
- Chest success chances 1/2 for wood/silver, 1/4 for gold, 1/5 for crystal, 1/6 for royal; intelligence checks precede the chance roll, each adventurer tries once, then another member may try.
- Better basic treasure intelligence bonuses +5 wood / +10 silver, explicitly conditional on that research.
- Existing tier-IV chest renamed crystal; mimic disguises match the materials.
- Rest admission fees 1/2/3/4 gold for visitor tiers I–IV, staff fees zero, door asset tiers and visitor room IV recovery 5/hour. Existing capacities and bed costs preserved.
- Existing containment probabilities, beginner stealth and finance reductions represented as research modifiers.

Original source conflicts (resolved decisions are recorded below):
- Better basic treasure: description says 1/3 failure; unlock says 1/3 success.
- Guild Grant: description says +1 per stat gain; unlock says +1 per admission.
- The Best Builders repeats tier III; retain it as an annotated tier-III improvement until clarified.
- Rest I description says 3/hour, unlock says 2/hour: retained existing 2/hour. Treat tier room recovery numbers as rates, not cumulative increments.
- Luxury Suites repeats staff room III: no staff room IV invented. Its research time is unspecified.
- Initial spawner purchase prices remain unspecified.

No bear-trap, fire-trap, skeleton-ghoul or additional chest tier was created. Existing proposals are retained in the user's research table, but new entity designs are outside this audit.

Migration applies reviewed line changes to saved entity cells, preserves independently edited values and table order, adds only missing settings rows, and leaves research cells unchanged. After migration, later edits are not overwritten again. No live dungeon rules are changed.

## Approved review decisions — 22 September 2026

The user approved: Better basic treasure succeeds with probability 1/3; Guild Grant pays +1 gold per stat point gained at a floor checkpoint; The Best Builders unlocks tier IV at 20 gold, speed 45, cap 25; Basic rest spots recover 2 points/hour; spawn interval bonuses use the smallest unlocked multiplier without multiplying guild and tier reductions; initial mob spawners have no separate charge and the floor installation order remains 5 gold. Tier upgrade prices remain separate.

Luxury Suites retains its original unlocks (visitor room IV, staff room III) and now takes 10 game hours to research. These decisions supersede the conflict notes above. Saved tables migrate once; subsequent user edits are preserved. See REVIEW_DECISIONS.json for the machine-readable record.
