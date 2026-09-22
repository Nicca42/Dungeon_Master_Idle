# Ghosts and revival

A party member killed inside the dungeon leaves a translucent ghost. The party pauses its expedition for the five-game-minute revival window (00:05); the normal five-minute simulation tick does not delay casts. Events resolve identically during live play and time skips.

## Training research

Training → Revival class is a one-time unlock. Initial tuning: 5 gold and 1 game hour of research. After unlocking it, each untrained healer in town automatically buys the course once if they can afford it. The healer pays 10 gold from personal wealth to the dungeon, recorded as Revival course income. Training persists in saves and is shown on the character card. Existing healers already exploring can train when they return to town.

## Revival

- A living trained healer automatically attempts revival, one member at a time.
- Cost: ceil(2/3 × maximum stamina), charged on successful completion, with stamina and primary-skill XP.
- Cast duration: 1 game minute × 10 / max(1, speed). Normal speed 10 takes 00:01; speed below 2 cannot finish a fresh cast before the deadline.
- A cast finishing exactly at the five-minute deadline succeeds. The caster must still be alive and have enough stamina.
- The member returns with half their unchanged maximum health, zero defense, and their other resources unchanged.
- A revived member can die and be revived again; each death creates a new window.

## Hostile ghosts

At the deadline an unrevived ghost gets red eyes and attacks its own party. Its health, defense, stamina, damage, primary, speed and intelligence are half the original member's maximum/resource-cap or attribute snapshot at death. Ghosts initiate combat and surviving members retaliate using normal damage/defense and XP handling. A defeated ghost is removed; it cannot revive. Remaining ghosts disappear when their party's expedition ends, including a full wipe. Ghosts are death events rather than purchases or spawner products.

The research and entity JSONs are updated, and existing editable planning tables receive additive Training and Ghosts rows without overwriting custom cells.

Validation: unit tests cover cast timing, failure, combat, course billing, persistence, table migration, and time-skip equivalence. Browser tests cover red-eye rendering and research access on desktop and phone.
