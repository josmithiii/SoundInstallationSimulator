# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Prototype browser-based simulator for modular sound installations (wooden sticks, metal objects, stones, ceramics) placed in a configurable acoustic space, previewed through a chosen microphone rig. See `COLLABORATOR_HANDOFF_PROMPT.md` for the project goal narrative and the maintainer's "good next steps" list.

## Run / verify

- Run: open `index.html` directly in a browser. No build, no install, no server required — preserve this no-build workflow unless the user explicitly asks otherwise.
- Syntax-check JS edits: `node --check app.js`
- Interactive verification: reload `index.html` in the browser and watch the devtools console. There is no automated test suite.

## Architecture

Three files; all behavior is in `app.js`. `index.html` defines the DOM + control IDs; `styles.css` is the visual system.

- **Single source of truth: `state` (app.js:41).** Holds `sources[]`, `samples[]`, `selectedId`, `layout`, `playing`, `nextId`. UI inputs are read on demand via `currentRoom()` / `currentMic()` (they are not duplicated into `state`). Mutate `state` (or DOM inputs), then call `renderAll()` — it recomputes readouts, redraws the canvas, and re-renders the source/sample lists from scratch.
- **Element cache: `els` (app.js:62, populated in `cacheElements`).** When you add a new control to `index.html`, also add its id to the array in `cacheElements()` or `els.<id>` will be undefined.
- **Web Audio graph (`buildAudio`, `playEvent`).** Lazily constructed on first preview/audition. Per-event chain: `BufferSource → [filter if synthetic] → gain → delay → stereoPanner → (dry + convolver→wet) → destination`. Distance becomes `delay.delayTime = distance/343` and a pan offset; reverb is a synthetic noise impulse from `makeImpulse` keyed by `impulseSignature()` and refreshed only when room params change. Decoded user samples bypass the family/excitation filter; absent samples fall back to `makeNoiseBuffer` driven by `familyFrequency` + excitation envelope.
- **Scheduler.** `startPreview` sets `setInterval(scheduleAudio, 40)`. `scheduleAudio` walks each source forward to a 160 ms horizon, calling `playEvent` and advancing `source.nextFire` by an exponential inter-arrival `-ln(U)/(rate·density·0.38)`.
- **Persistence.** `serializeProject` / `restoreProject` round-trip controls + sources + sample *metadata* through `localStorage` (key `spatialSoundLab.project.v1`) or a downloaded JSON file. Schema is gated by `projectSchemaVersion` (app.js:16) — bump it and reject old payloads when the shape changes; do not write a silent migration. **AudioBuffers are intentionally never serialized** — uploaded audio is in-memory only and is lost on reload. Manifest export (`renderManifest`) likewise emits metadata only.
- **Variants / activators / excitations** are closed enums declared at the top of `app.js` (`familyVariants`, `activatorNames`, `excitationNames`, `familyColors`, `spacePresets`). Adding a new family/activator/excitation requires updating the enum object **and** the matching `<select>` options in `index.html` (and any branching in `playEvent` / `makeNoiseBuffer` that switches on the value). `normalizeSavedSource` validates against these enums on load.
- **Canvas plan view.** `drawCanvas` resets the transform for devicePixelRatio each frame, fits the room into the canvas via `fitRect`, and converts meters→pixels with `roomToPixel`. `handleCanvasClick` reuses the same fit math to hit-test source selection (28 px radius). Click-to-select is implemented; click-and-drag placement is on the maintainer's wishlist, not built.

## Conventions specific to this repo

- Static, no-framework, no-build. Don't introduce a bundler, package.json, or dependencies without asking.
- Keep UI compact and utilitarian — this is a working simulator, not a marketing page.
- Console messages reporting unexpected behavior (ignored requests, dropped state) start with `***`.
- Research code: fail fast, no backward-compat shims. When changing the project schema, bump `projectSchemaVersion` rather than writing migrations.
