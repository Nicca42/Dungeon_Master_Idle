# Tiered asset table

Demo settings → Art table groups assets by family, with five entity-tier columns (not research-stage numbers). Adventurers have wizard, fighter and healer subrows, each showing three variants per tier. Existing saved character choices supply the three silhouettes. Higher tiers add palette/trim detail as preview concepts. Staff and visitor rooms stop at the currently specified tiers. New undefined research entities are not invented.

Actions: lightning, waiting for rest, trap resetting, mob spawning, adventurer spawning, melee attack, healing and lock opening. Lightning scales from one short bolt to five large bolts. These are preview assets, not a replacement of live combat effects yet.

## Animation budget

Forty reusable 320×40 transparent PNG strips, eight frames each at 8 fps. One Animated.Value drives the entire gallery. Image strips move in clipped views; transforms use the native driver on mobile. No per-frame React setState, SVG reconstruction, gradients, random particles, or per-character timers. Assets load from bundled require() references and are shared. Animation pauses when the tab/app is inactive, honors reduced motion, and has a manual pause control. The table itself and individual previews are memoized.

For live deployment reuse the same shared clock/strips, cull offscreen floors, and profile on physical devices before claiming a hundreds-of-characters frame budget. No native device or mass-combat benchmark has been performed in this change.

Regenerate PNGs with `python3 scripts/build-action-art.py` from the project root. Author pixel shapes in `src/art/actionFrames.ts`; the generator needs only Python standard library and the project's Node/tsx install. Assets are generated at build time, never during animation.

Verification: TypeScript, strip dimensions/frame-count test, desktop and phone browser tests for variant counts, all 40 action previews, tab switching and pause controls.
