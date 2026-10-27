# CODEX_HANDOFF · 三维弹球

## Goal and phase

Add a playable game to the site's game directory with high fidelity to Windows 3D Pinball: Space Cadet. Implementation and local verification complete; no commit, push or public deployment performed.

## Delivered

- Unmodified alula/SpaceCadetPinball JS/WASM/data files hosted locally, with full engine MIT license, source URLs and SHA-256 manifest. Original game assets retain their original rights; see README.md.
- Original table, collision, plunger, flippers, score, missions, ranks, sounds, nudging and TILT, using the upstream native game logic.
- Chinese responsive shell; explicit start, progress, retry, pause/resume, sound, fullscreen, arrow-key aliases and multitouch controls. Hiding the page pauses; pointer cancellation releases inputs.
- Game directory card and actual table screenshot cover, searchable catalog entry, arcade breadcrumb and bilingual directory copy. Shared files contained other ongoing work; preserve it.
- Preview server serves `.wasm` as `application/wasm`.

## Important files

- `index.html`, `pinball.css`, `pinball.js`: page, controls and shell state.
- `runtime.html`, `runtime.js`: isolated SDL runtime and input bridge; native 60/60 INI configuration.
- `engine/`: original upstream distribution and license; manifest validates exact bytes.
- `tests/integration.test.mjs`, `tests/browser.mjs`: integrity/integration and runtime regressions.
- Site integration: `games.html`, `assets/catalog.js`, `assets/i18n.js`, `assets/navigation.js`, `THIRD_PARTY_NOTICES.md`, `scripts/check-navigation.mjs`, `scripts/serve-site.mjs`, `scripts/serve-site.test.mjs`.

## Verification

From repository root:

```sh
node --test games/arcade/space-cadet-pinball/tests/integration.test.mjs scripts/serve-site.test.mjs
node scripts/check-navigation.mjs
node games/arcade/space-cadet-pinball/tests/browser.mjs
```

The browser script needs Playwright and Chromium; configurable paths are documented in README.md. Verified on bundled Chromium 1234 / Windows:

- 6 resource/integration/server tests passed; navigation checks passed; diff whitespace check passed.
- 33 browser checks passed, including real two-contact touch input, touch cancel, plunger, native keyboard bindings, ten consistent flipper cycles, audio unlock, pause/resume, sound, fullscreen continued rendering, load-failure recovery, and arcade filtering.
- Actual drawn-frame measurement: 56.04 FPS; input to changed flipper pixels: 11 ms. These are local instrumented headless measurements, not device-wide guarantees.
- Viewports: 1440×1080, 360×640, 390×844, 720×1280, 1080×2400. No horizontal overflow; ball table remains complete and continues rendering after resize.
- Screenshots visually inspected after the final fix: desktop, mobile, fullscreen and directory. Evidence and machine-readable results: `docs/audit/evidence/space-cadet-pinball/`.
- A full launch was visually confirmed on the upper rail with native mission instructions. All packed resource offsets and WASM validation passed; no uncaught errors or missing local resources in the primary runtime test.

## Limits and next safe task

No physical iPhone/Safari validation or long mission/rank playthrough. The game's original English table text and native menu remain. Scores are not promised to persist after reload. Native menu key remapping can supersede default bindings. Original asset rights are independent of the open-source engine license.

Next safe task: optional physical-device Safari/touch verification. The code is ready for review and the site's usual deployment workflow when requested.
