# Research / entity consistency review — 22 September 2026

Authority: the saved Research table visible in Demo settings, including the user's ten stage columns and supporting research. The older research-tree.v1.json is a historical seed, not a faithful copy of those browser edits. Research stages and entity tiers are different axes.

## Clear omissions corrected

- Local ads: two additional arrival points, 25 gold purchase per point, +10 population capacity per point. Recorded conditionally on each adventurer-spawner tier.
- Basic guild: missing-role selection and base party formation time of 20 real seconds (480 game seconds). Existing guild II/III formation values 360/240 game seconds are consistent with 15/10 real seconds at 24× time.
- Beginner stealth applies to tier-I mimics as well as tier-I arrows/trapdoors: +1 perception per rank, ceiling 10. A trap already at 10 receives no additional effective perception.

These additions update the entity JSON and migrate saved stats once. Research wording, saved custom numbers, column order and row order are preserved. These are planning tables; they do not reconfigure live gameplay.

## Confirmed aligned

- Floors I–V: health/defense 10/20/30/40/50 and matching background tiers.
- Builders I–IV: hire 5/10/15/20, speed 10/20/30/45, hire caps 5/10/15/25.
- Trapdoor II: damage 10–20, perception 20. Mimic II: damage 10–20, silver imitation; later materials gold/crystal/royal.
- Chest success: wood/silver 1/2 initially; Better basic treasure conditionally changes both to 1/3 and adds difficulty 5/10. Gold/crystal/royal success 1/4, 1/5, 1/6.
- Staff training costs to tiers II–V: 10/10/15/20. Speed multiplier 2; reset bonuses 5 then 10 replace rather than stack.
- Adventurer interval multipliers .75/.75/.5/.25/.25, maximum points 2/3/4/5/6, strongest interval bonus wins. Guild capacity bonuses 20/40 remain conditional.
- Visitor rest I–IV: recovery 2/3/4/5 per game hour, fee 1/2/3/4 gold. Staff room tiers I–III remain separate.
- Guild Grant: +1 gold per checkpoint stat gain. Unpaid overtime: hire cost reduction 1 and working defender wage reduction .5.
- Initial mob spawner separate price 0; floor installation order 5. Upgrade costs remain separate. Containment chances .20 → .10 → .05.
- Luxury Suits retains visitor IV / staff III and 10 research hours, per the explicit decision.

## Remaining source conflicts or undefined rules

These were not silently resolved by inventing stats:

1. **Builders:** The Best Builders describes maximum speed/cap at tier IV, but Professional crew V also unlocks diggers V. The stats retain the existing tier-V proposal (speed 50, hire 50), with no tier-V hire cap. Research must establish whether diggers V exist and what they cost/cap at.
2. **Arrival points:** Regional ads says five total, while adventurer tier V says maximum six. It is not specified whether ads is an independent capacity gate or superseded by the tier unlock. Both claims are retained; no combined cap is fabricated.
3. **Luxury staff recovery:** Luxury Suits unlocks staff III again and says recovery 5/hour. Staff III otherwise has recovery 4/hour. Decide whether Luxury adds a conditional 5/hour improvement to staff III, or the 5/hour only refers to visitor IV. The approved tier and duration remain unchanged.
4. **Floor upgrade stamina:** Each building milestone says +1 upgrade stamina. Entity stats currently store cumulative additional stamina 1/2/3/4. Confirm whether these are cumulative increments or every upgrade simply costs one extra stamina. Base upgrade stamina is unspecified.
5. **Chest doubling scope:** Silver/gold health, defense, gold contents, lock difficulty and opening stamina double. Refill stamina stays 1 and chance is governed by separate explicit research values. “All stats double” is too broad to establish whether refill stamina must double; chance cannot literally double while also matching explicit probabilities.
6. **New entity definitions:** Bear traps I–III, fire traps I–III and skeleton ghouls I–III appear in research but lack entity stats. No new entities or numerical balance were invented, consistent with the earlier scope restriction.
7. **Naming:** Crystal chests still says “runic chests” in its research description. Title, unlock and entity material say crystal.
8. **Finance seed:** The non-table finance.defaults JSON still has restFeeGold 0; visitor room research/stats specify tier-I fee 1. This could mean a pre-unlock default; its applicability is not specified. Finance defaults are omitted from the current stats-table generator, so this is a source-file coverage gap, not an editable-table contradiction.

Other numeric baseline stats that research never specifies were retained as proposals, not treated as research-validated values. The audit does not certify them as balanced.

## Validation

TypeScript check and ten planning-table tests pass, including migration idempotence, preservation of custom fields and row/column order, and research remaining unchanged during this audit. Saved browser tables were reloaded to apply the additions.
