# Sound Installation Simulator

A prototype browser-based simulator for modular sound installations. It organizes physical sound sources (wooden sticks, metal objects, stones, ceramic/glass), places them in a configurable acoustic space, and previews a spatialized soundscape through a chosen microphone rig — all in a single static page with no build step.

## Run

Open `index.html` in a modern browser. No install, no build, no server. Audio preview uses the Web Audio API and starts on first click (browser autoplay policy).

## Features

- **Source instances** with family (wood / metal / stone / ceramic), variant, activator (solenoid, motor, cable, pendulum, air), excitation (tap, scrape, roll, friction), 3D position, orientation, trigger rate, and gain.
- **Configurable space**: room presets (gallery, racquetball, gym, warehouse, custom), dimensions, surface set, absorption, diffusion, with an estimated RT60 readout.
- **Microphone rigs**: XY stereo, binaural head, tetrahedral ambisonic, distributed array (currently rendered as stereo with distance delay + synthetic convolution reverb).
- **Layout tools**: random scatter, grid, ceiling suspension. Click sources on the plan view to select.
- **Sample loading**: drop audio files onto a source's *Load* control. Decoded buffers become that source's statistical sample pool; otherwise audition falls back to procedural noise based on family/excitation.
- **Project save/load**: localStorage plus JSON import/export. Sample *metadata* is persisted; raw AudioBuffers are intentionally in-memory only.
- **Scene manifest export**: JSON describing room, mic, sources, and sample pools — a starting point for packaging to Web Audio worklet, Max, JUCE, or SuperCollider.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Single-page DOM and control IDs |
| `styles.css` | Visual system and responsive layout |
| `app.js` | App state, audio graph, scheduler, canvas rendering, persistence |
| `CLAUDE.md` | Architecture notes for AI assistants and contributors |
| `COLLABORATOR_HANDOFF_PROMPT.md` | Onboarding prompt for new collaborators |

## Status

Prototype / research code. The acoustic model is a lightweight synthetic impulse approximation — not a physically exact spatial reverberator. Spatial output is currently stereo panning with distance delay and convolution; binaural / ambisonic / mic-array rendering are on the roadmap (see `COLLABORATOR_HANDOFF_PROMPT.md`).

## License

No license file yet — all rights reserved by the author until one is added.
