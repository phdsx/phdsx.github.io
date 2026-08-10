# Sand Sort Design QA

## Findings

No actionable P0/P1/P2 issue remains.

The recreation preserves the reference game's core visual hierarchy and play loop: a fixed dark-navy portrait board, resource indicators, two wooden shelves, glowing glass bottles, layered colored sand, select-and-pour interaction, tutorial guidance, free helper controls, and a celebratory win state. The following differences are intentional product adaptations rather than defects:

- The Y8 page shell, tracking, privacy prompts, advertisements, and storefront are not reproduced.
- All helper functions are permanently free. The reference's ad-gated reward behavior is consolidated into a free next-level reward, with no ad prompt, currency cost, cooldown, purchase flow, or external navigation.
- Interface copy is localized to Simplified Chinese and uses larger accessible text and touch targets.
- The local generated background and bottles add texture and glow while retaining the reference's palette, portrait composition, shelf alignment, and bottle silhouette.

## Source comparison

- Reference: `https://zh.y8.com/games/sand_sort_color_puzzle`
- Scope: game-only recreation; Y8 shell and monetization intentionally omitted.
- Source visual truth:
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/source-tutorial-395x700.png`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/source-active-395x700.png`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/source-mid-pour-395x700.png`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/source-win-395x700.png`
- Local implementation truth:
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/local-desktop-start-1440x900.jpg`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/local-desktop-active-1440x900.jpg`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/local-desktop-mid-pour-1440x900.jpg`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/local-desktop-win-1440x900.jpg`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/local-mobile-start-390x844.jpg`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/local-mobile-active-390x844.jpg`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/local-mobile-win-390x844.jpg`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/local-mobile-reduced-motion-win-390x844.jpg`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/local-games-entry-1440x900.jpg`
- Physical side-by-side comparison artifacts:
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/comparison-tutorial-matched-390x700.png`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/comparison-active-matched-390x700.png`
  - `.superpowers/sdd/2026-08-09-sand-sort-game/task-6-evidence/comparison-win-matched-390x700.png`
  - Full-height comparisons are also retained as `comparison-*-source-vs-local.png`.
- Density normalization: the source game's fixed 395 × 700 internal surface was horizontally normalized to 390 × 700; the local 390 × 844 capture was compared at native width using its top 700-pixel game region. Device pixel ratio was 1 for both captures. Full-height comparisons were reviewed separately to include the local free-tool dock.
- States compared: tutorial/start, active gameplay, mid-pour animation, and win.

### Fidelity review

- Typography: both versions use a bold, high-contrast hierarchy for level status, prompts, controls, and win copy. Chinese wrapping remains readable without clipping.
- Spacing and layout: the portrait board, top status row, two shelf rows, bottle centering, overlay placement, and bottom controls follow the reference's vertical rhythm. The local canvas remains centered on desktop and fills the mobile width without overflow.
- Color and depth: the dark navy/purple field, saturated sand colors, cyan glass edge light, white dialog surfaces, and bright purple actions closely match the reference's contrast and mood.
- Assets: the generated background, transparent glass bottle, and game cover are sharp, correctly cropped, and load only from local files.
- Interaction states: selection, valid pour, invalid shake, input lock, hint, undo, reshuffle, extra bottle, restart, reduced motion, completion, reward, and next level were exercised.

## Automated checks

- Full `Games/*.test.mjs` suite: passed, 36 tests, 0 failures.
- Rules, 30 deterministic solvable levels, renderer, session tools, persistence normalization, keyboard navigation, and modal gating: passed.
- Syntax checks for all five production modules: passed.
- Prohibited network/monetization scan: no external URLs, ad SDK markers, ad-unlock copy, purchase copy, or remote runtime dependency.
- Runtime inventory remained stable after load and contained only local CSS, modules, and image assets.

## Browser checks

- Browser: Codex in-app Browser only.
- Desktop 1440 × 900: tutorial, active gameplay, mid-pour input lock, and win dialog passed. The 560-pixel game scene stayed centered, all five tools were visible, and the document had no horizontal or vertical overflow.
- Mobile 390 × 844: selection, valid and invalid pours, undo, hint, reshuffle, extra bottle, restart, win, and next-level flows passed. Bottle hit regions measured 66 × 161.7 CSS pixels; tool targets measured about 74.8 × 66 CSS pixels; the fifth tool and win dialog fit without scrolling.
- Free tools: each tool was used repeatedly. Coins were not deducted; controls remained enabled; no ad, cooldown, purchase, or external navigation appeared.
- Persistence: completing level 1 and choosing next produced level 2 with 250 coins; reload preserved the state. Malformed saved data recovered safely to level 1, 200 coins, and the tutorial.
- Reduced motion: pour timing shortened and the long celebration delay was suppressed.
- Console: no errors or warnings during the completed local acceptance runs.

## Comparison history

- Iteration 0: blocked because the source URL permission was declined. Local desktop/mobile acceptance completed independently.
- Iteration 1: after the user's renewed explicit request, the source was captured in the in-app Browser at tutorial, active, mid-pour, and win states. Matched physical side-by-side artifacts were created and reviewed. No actionable P0/P1/P2 mismatch remained.

## Implementation checklist

- [x] Add exactly one Sand Sort card to the game index.
- [x] Complete desktop, mobile, interaction, persistence, corrupted-storage, reduced-motion, console, and local-network checks.
- [x] Capture source and local screenshots for the same core states.
- [x] Create and judge physical source/local side-by-side artifacts.
- [x] Confirm all helper and reward behavior is free of advertising and purchases.
- [x] Confirm no actionable P0/P1/P2 issue remains.

## Result

final result: passed
