# Collaborator Handoff Prompt

Use this prompt when opening the unzipped project in a new Codex/chat environment:

```text
You are helping continue a static web app project called soundInstallationSimulator. Start by orienting yourself to the local project folder and reading the three main files:

- index.html: the single-page app structure.
- styles.css: the full visual system and responsive layout.
- app.js: app state, source management, sample loading, Web Audio preview, spatial plan rendering, and manifest export.

Project goal:
This is a prototype modular sound installation simulator. It organizes physical sound sources such as wooden sticks, metal objects, stones, and ceramic/glass objects; lets each source have variants, activators, excitation types, positions, orientations, random trigger rates, and gains; places those sources in a configurable acoustic space; and previews a spatialized soundscape through a selected microphone setup.

Current app behavior:
- It runs directly by opening index.html in a browser. No build step or package install is required.
- The first screen is the simulator workspace, not a landing page.
- The left sidebar configures room preset, dimensions, surface set, absorption, diffusion, and microphone rig.
- The main plan view draws the room, source positions, orientations, and microphone.
- The Sources tab edits the selected source.
- The Samples tab lets the user add recording metadata and global sample listings.
- The Synth tab generates a JSON scene manifest.
- The Source Instances strip has one card per source.
- Each source card has an audition play button and a Load control.
- The Load control accepts multiple audio files for that specific source instance. Loaded files are decoded with Web Audio and become that source's statistical sample pool.
- If a source has decoded recordings, audition/random playback uses those recordings. Otherwise it falls back to synthetic procedural sound based on family and excitation.
- The add-source form in the Source Instances header creates a new randomly placed source from selected family, variant, activator, and excitation fields.

Important implementation notes:
- Keep the project static unless the user explicitly asks for a framework.
- Preserve the no-build workflow because it makes sharing easy.
- Use app.js state as the source of truth.
- Uploaded audio files are held in memory only; they are not persisted after reload.
- Raw AudioBuffer objects are intentionally excluded from scene manifest JSON. Manifest export includes file names, metadata, duration, and status.
- The current reverb is a lightweight synthetic impulse approximation, not a physically exact spatial reverberator yet.
- Current spatial audio is stereo panning plus distance delay and convolution. It is a prototype path toward later binaural/ambisonic/array rendering.

Good next steps:
1. Add project save/load so source layouts and sample metadata persist.
2. Add draggable source and microphone positioning on the canvas.
3. Add per-source sample metadata editing after upload.
4. Add source groups and family editors so new object families can be defined without editing code.
5. Improve the acoustic model toward image-source or ray/geometry-based early reflections.
6. Add true binaural/ambisonic/mic-array output modes.
7. Add export packaging for a realtime synth target such as Web Audio worklet, Max, JUCE, or SuperCollider.

Before changing code:
- Run `node --check app.js` after JavaScript edits.
- If using an in-app browser or local browser, reload index.html after edits.
- Check browser console errors after interactive changes.
- Keep UI controls compact and utilitarian; this is a working simulator, not a marketing page.
```
