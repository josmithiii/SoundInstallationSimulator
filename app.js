const familyVariants = {
  wood: ["Maple dowel", "Bamboo cane", "Oak slat", "Hardwood bundle", "Plywood tongue"],
  metal: ["Brass plate", "Steel rod", "Aluminum tube", "Chain cluster", "Found iron strip"],
  stone: ["Granite fragment", "Slate tile shard", "River stone", "Basalt chip", "Marble offcut"],
  ceramic: ["Porcelain rod", "Glass tube", "Terracotta shard", "Tile strip", "Glazed bowl rim"]
};

const familyColors = {
  wood: "#e0b94f",
  metal: "#98a6b3",
  stone: "#8cb56b",
  ceramic: "#b8705d"
};

const projectStorageKey = "spatialSoundLab.project.v1";
const projectSchemaVersion = 1;

const spacePresets = {
  gallery: { name: "Gallery Room A", width: 18, depth: 12, height: 5, absorption: 0.27, diffusion: 0.46, surface: "wood" },
  racquetball: { name: "Racquetball Court", width: 12.2, depth: 6.1, height: 6.1, absorption: 0.18, diffusion: 0.22, surface: "rubber" },
  gym: { name: "Large Gym", width: 38, depth: 26, height: 11, absorption: 0.35, diffusion: 0.6, surface: "mixed" },
  warehouse: { name: "Concrete Warehouse", width: 42, depth: 30, height: 9, absorption: 0.12, diffusion: 0.38, surface: "concrete" },
  custom: { name: "Custom Space", width: 18, depth: 12, height: 5, absorption: 0.27, diffusion: 0.46, surface: "mixed" }
};

const activatorNames = {
  solenoid: "solenoid taps",
  motor: "eccentric motor",
  cable: "dragged cable",
  pendulum: "pendulum striker",
  air: "air pulse"
};

const excitationNames = {
  tap: "collision",
  scrape: "scrape",
  roll: "rolling chatter",
  bow: "friction tone"
};

const state = {
  selectedId: 1,
  layout: "random",
  playing: false,
  nextId: 9,
  samples: [
    { sourceId: 1, name: "maple-stick-tap-a.wav", detail: "Wood, maple floor, collision transient" },
    { sourceId: 2, name: "brass-scrape-cement-03.wav", detail: "Steel, concrete, scrape texture" }
  ],
  sources: [
    makeSource(1, "wood", 3.2, 3.4, 0.1, 22, 0.62, 0.72, "solenoid", "tap"),
    makeSource(2, "metal", 6.8, 7.7, 0.1, 130, 0.38, 0.68, "motor", "scrape"),
    makeSource(3, "stone", 13.7, 2.8, 0.1, 275, 0.25, 0.74, "cable", "roll"),
    makeSource(4, "wood", 15.4, 8.4, 1.9, 310, 0.42, 0.59, "pendulum", "tap"),
    makeSource(5, "ceramic", 4.7, 10.0, 0.1, 84, 0.18, 0.5, "air", "scrape"),
    makeSource(6, "metal", 10.4, 5.3, 0.1, 180, 0.7, 0.61, "solenoid", "tap"),
    makeSource(7, "stone", 8.2, 2.1, 0.1, 44, 0.2, 0.78, "motor", "roll"),
    makeSource(8, "wood", 16.1, 4.9, 2.6, 250, 0.31, 0.63, "pendulum", "bow")
  ]
};

const els = {};
let audio = null;
let schedulerId = null;
let canvasCtx = null;

function makeSource(id, family, x, y, z, angle, rate, gain, activator, excitation) {
  const variants = familyVariants[family];
  return {
    id,
    family,
    variant: variants[(id - 1) % variants.length],
    x,
    y,
    z,
    angle,
    rate,
    gain,
    activator,
    excitation,
    sampleCount: 0,
    nextFire: 0
  };
}

function init() {
  cacheElements();
  canvasCtx = els.roomCanvas.getContext("2d");
  populateVariantMenu();
  populateNewSourceVariantMenu();
  bindEvents();
  restoreProjectFromStorage({ silent: true });
  syncSelectedToForm();
  renderAll();
}

function cacheElements() {
  [
    "spacePreset", "roomWidth", "roomDepth", "roomHeight", "surfacePreset", "absorption", "diffusion",
    "absorptionOut", "diffusionOut", "roomReadout", "micPreset", "micX", "micY", "micAim", "micReadout",
    "arraySpan", "arraySpanOut", "density", "densityOut", "roomCanvas", "simulationReadout", "sourceList",
    "sourceCount", "sourceFamily", "sourceVariant", "activator", "excitation", "sourceX", "sourceY",
    "sourceZ", "sourceAngle", "sourceRate", "sourceRateOut", "sourceGain", "sourceGainOut",
    "selectedSourceName", "selectedSourceSummary", "addSourceButton", "randomizeButton", "playButton",
    "stopButton", "sampleUpload", "dropZone", "sampleList", "sampleMaterial", "sampleSurface",
    "sampleClass", "recordingGroup", "runtimeTarget", "outputBus", "exportButton", "manifestPreview",
    "newSourceForm", "newSourceFamily", "newSourceVariant", "newActivator", "newExcitation",
    "saveProjectButton", "loadProjectButton", "downloadProjectButton", "projectImport", "projectStatus"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.spacePreset.addEventListener("change", applySpacePreset);
  ["roomWidth", "roomDepth", "roomHeight", "absorption", "diffusion", "surfacePreset"].forEach((id) => {
    els[id].addEventListener("input", renderAll);
  });
  ["micPreset", "micX", "micY", "micAim", "arraySpan"].forEach((id) => {
    els[id].addEventListener("input", renderAll);
  });
  els.density.addEventListener("input", renderAll);

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  document.querySelectorAll(".tool-button").forEach((button) => {
    button.addEventListener("click", () => setLayout(button.dataset.layout));
  });

  els.sourceFamily.addEventListener("change", () => {
    const source = selectedSource();
    source.family = els.sourceFamily.value;
    populateVariantMenu();
    source.variant = els.sourceVariant.value;
    renderAll();
  });
  ["sourceVariant", "activator", "excitation", "sourceX", "sourceY", "sourceZ", "sourceAngle", "sourceRate", "sourceGain"].forEach((id) => {
    els[id].addEventListener("input", updateSelectedFromForm);
  });

  els.addSourceButton.addEventListener("click", addSource);
  els.newSourceFamily.addEventListener("change", populateNewSourceVariantMenu);
  els.newSourceForm.addEventListener("submit", addSourceFromWidget);
  els.randomizeButton.addEventListener("click", randomizeLayout);
  els.playButton.addEventListener("click", startPreview);
  els.stopButton.addEventListener("click", stopPreview);
  els.exportButton.addEventListener("click", renderManifest);
  els.sampleUpload.addEventListener("change", (event) => addSamples(event.target.files));
  els.saveProjectButton.addEventListener("click", saveProjectToStorage);
  els.loadProjectButton.addEventListener("click", () => restoreProjectFromStorage({ silent: false }));
  els.downloadProjectButton.addEventListener("click", downloadProjectFile);
  els.projectImport.addEventListener("change", importProjectFile);

  els.roomCanvas.addEventListener("click", handleCanvasClick);
  window.addEventListener("resize", drawCanvas);
}

function setView(view) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view-pane").forEach((pane) => pane.classList.remove("active"));
  document.getElementById(`${view}View`).classList.add("active");
}

function setLayout(layout) {
  state.layout = layout;
  document.querySelectorAll(".tool-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.layout === layout);
  });
  applyLayout(layout);
  renderAll();
}

function applySpacePreset() {
  const preset = spacePresets[els.spacePreset.value];
  els.roomWidth.value = preset.width;
  els.roomDepth.value = preset.depth;
  els.roomHeight.value = preset.height;
  els.absorption.value = preset.absorption;
  els.diffusion.value = preset.diffusion;
  els.surfacePreset.value = preset.surface;
  els.micX.value = round(preset.width / 2, 1);
  els.micY.value = round(preset.depth / 2, 1);
  fitSourcesToRoom();
  renderAll();
}

function applyLayout(layout) {
  const room = currentRoom();
  if (layout === "grid") {
    const columns = Math.ceil(Math.sqrt(state.sources.length * room.width / room.depth));
    state.sources.forEach((source, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const rows = Math.ceil(state.sources.length / columns);
      source.x = ((col + 1) / (columns + 1)) * room.width;
      source.y = ((row + 1) / (rows + 1)) * room.depth;
      source.z = 0.1;
      source.angle = (index * 47) % 360;
    });
  } else if (layout === "ceiling") {
    state.sources.forEach((source, index) => {
      const t = (index / state.sources.length) * Math.PI * 2;
      source.x = room.width * (0.5 + Math.cos(t) * 0.34);
      source.y = room.depth * (0.5 + Math.sin(t) * 0.34);
      source.z = Math.max(1.5, room.height - 0.8 - (index % 3) * 0.45);
      source.angle = (t * 180 / Math.PI + 90) % 360;
    });
  } else {
    randomizeLayout();
  }
}

function randomizeLayout() {
  const room = currentRoom();
  state.sources.forEach((source) => {
    source.x = randomRange(room.width * 0.08, room.width * 0.92);
    source.y = randomRange(room.depth * 0.08, room.depth * 0.92);
    source.z = state.layout === "ceiling" ? randomRange(room.height * 0.55, room.height * 0.95) : randomRange(0.05, 0.35);
    source.angle = Math.floor(randomRange(0, 360));
    source.rate = randomRange(0.12, 1.2);
    source.gain = randomRange(0.42, 0.86);
  });
  syncSelectedToForm();
  renderAll();
}

function addSource() {
  const room = currentRoom();
  const families = Object.keys(familyVariants);
  const family = families[state.nextId % families.length];
  const source = makeSource(
    state.nextId,
    family,
    randomRange(room.width * 0.12, room.width * 0.88),
    randomRange(room.depth * 0.12, room.depth * 0.88),
    0.1,
    Math.floor(randomRange(0, 360)),
    randomRange(0.14, 1.1),
    randomRange(0.42, 0.82),
    "solenoid",
    "tap"
  );
  state.sources.push(source);
  state.selectedId = source.id;
  state.nextId += 1;
  syncSelectedToForm();
  renderAll();
}

function addSourceFromWidget(event) {
  event.preventDefault();
  const room = currentRoom();
  const family = els.newSourceFamily.value;
  const source = makeSource(
    state.nextId,
    family,
    randomRange(room.width * 0.12, room.width * 0.88),
    randomRange(room.depth * 0.12, room.depth * 0.88),
    state.layout === "ceiling" ? randomRange(room.height * 0.55, room.height * 0.9) : 0.1,
    Math.floor(randomRange(0, 360)),
    randomRange(0.14, 1.1),
    randomRange(0.42, 0.82),
    els.newActivator.value,
    els.newExcitation.value
  );
  source.variant = els.newSourceVariant.value;
  state.sources.push(source);
  state.selectedId = source.id;
  state.nextId += 1;
  syncSelectedToForm();
  renderAll();
}

function populateVariantMenu() {
  const family = els.sourceFamily.value;
  els.sourceVariant.innerHTML = familyVariants[family]
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
}

function populateNewSourceVariantMenu() {
  const family = els.newSourceFamily.value;
  els.newSourceVariant.innerHTML = familyVariants[family]
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
}

function syncSelectedToForm() {
  const source = selectedSource();
  els.sourceFamily.value = source.family;
  populateVariantMenu();
  els.sourceVariant.value = source.variant;
  els.activator.value = source.activator;
  els.excitation.value = source.excitation;
  els.sourceX.value = round(source.x, 1);
  els.sourceY.value = round(source.y, 1);
  els.sourceZ.value = round(source.z, 1);
  els.sourceAngle.value = Math.round(source.angle);
  els.sourceRate.value = source.rate;
  els.sourceGain.value = source.gain;
  updateSourceReadouts();
}

function updateSelectedFromForm() {
  const source = selectedSource();
  source.family = els.sourceFamily.value;
  source.variant = els.sourceVariant.value;
  source.activator = els.activator.value;
  source.excitation = els.excitation.value;
  source.x = Number(els.sourceX.value);
  source.y = Number(els.sourceY.value);
  source.z = Number(els.sourceZ.value);
  source.angle = Number(els.sourceAngle.value);
  source.rate = Number(els.sourceRate.value);
  source.gain = Number(els.sourceGain.value);
  fitSourcesToRoom();
  renderAll();
}

function selectedSource() {
  return state.sources.find((source) => source.id === state.selectedId) || state.sources[0];
}

function currentRoom() {
  return {
    width: Number(els.roomWidth.value),
    depth: Number(els.roomDepth.value),
    height: Number(els.roomHeight.value),
    absorption: Number(els.absorption.value),
    diffusion: Number(els.diffusion.value)
  };
}

function currentMic() {
  return {
    kind: els.micPreset.value,
    x: Number(els.micX.value),
    y: Number(els.micY.value),
    aim: Number(els.micAim.value),
    span: Number(els.arraySpan.value)
  };
}

function fitSourcesToRoom() {
  const room = currentRoom();
  state.sources.forEach((source) => {
    source.x = clamp(source.x, 0, room.width);
    source.y = clamp(source.y, 0, room.depth);
    source.z = clamp(source.z, 0, room.height);
  });
  els.micX.value = clamp(Number(els.micX.value), 0, room.width);
  els.micY.value = clamp(Number(els.micY.value), 0, room.depth);
}

function renderAll() {
  const room = currentRoom();
  const rt60 = estimateRt60(room);
  els.absorptionOut.value = room.absorption.toFixed(2);
  els.diffusionOut.value = room.diffusion.toFixed(2);
  els.arraySpanOut.value = `${Number(els.arraySpan.value).toFixed(1)} m`;
  els.densityOut.value = `${Number(els.density.value).toFixed(1)}/s`;
  els.roomReadout.textContent = spacePresets[els.spacePreset.value].name;
  els.micReadout.textContent = els.micPreset.options[els.micPreset.selectedIndex].text;
  els.simulationReadout.textContent = `${state.sources.length} sources, ${room.width} x ${room.depth} x ${room.height} m, RT60 ${rt60.toFixed(2)} s`;
  els.sourceCount.textContent = `${state.sources.length} active`;
  updateSourceReadouts();
  renderSourceList();
  renderSampleList();
  drawCanvas();
}

function updateSourceReadouts() {
  const source = selectedSource();
  const samples = samplesForSource(source.id);
  els.selectedSourceName.textContent = `Source ${source.id}`;
  els.selectedSourceSummary.textContent = `${source.variant}, ${activatorNames[source.activator]}, ${placementName(source)}, ${samples.length} recordings`;
  els.sourceRateOut.value = `${Number(source.rate).toFixed(2)}/s`;
  els.sourceGainOut.value = Number(source.gain).toFixed(2);
}

function placementName(source) {
  if (source.z > 1.3) return "ceiling suspension";
  if (source.excitation === "scrape" || source.activator === "cable") return "floor slide";
  return "floor scatter";
}

function renderSourceList() {
  els.sourceList.innerHTML = "";
  state.sources.forEach((source) => {
    const samples = samplesForSource(source.id);
    const card = document.createElement("article");
    card.className = `source-card${source.id === state.selectedId ? " active" : ""}`;
    card.innerHTML = `
      <div class="meta-line">
        <strong>Source ${source.id}</strong>
        <div class="source-actions">
          <button class="audition-button" type="button" aria-label="Audition Source ${source.id}" title="Audition Source ${source.id}">
            <span class="icon play-icon" aria-hidden="true"></span>
          </button>
          <label class="load-button" aria-label="Load recordings for Source ${source.id}" title="Load recordings for Source ${source.id}">
            <span class="icon load-icon" aria-hidden="true"></span>
            <span class="load-label">Load</span>
            <input class="source-upload" type="file" accept="audio/*" multiple>
          </label>
        </div>
      </div>
      <button class="source-select-button" type="button" aria-label="Select Source ${source.id}">
        <span>${escapeHtml(source.variant)} / ${escapeHtml(excitationNames[source.excitation])}</span>
        <span>${source.x.toFixed(1)} m, ${source.y.toFixed(1)} m, ${source.z.toFixed(1)} m</span>
        <span>${source.rate.toFixed(2)}/s, gain ${source.gain.toFixed(2)}, ${samples.length} recordings</span>
      </button>
    `;
    card.querySelector(".source-select-button").addEventListener("click", () => {
      state.selectedId = source.id;
      syncSelectedToForm();
      renderAll();
    });
    card.querySelector(".audition-button").addEventListener("click", () => auditionSource(source.id));
    card.querySelector(".source-upload").addEventListener("change", (event) => addSamples(event.target.files, source.id));
    els.sourceList.appendChild(card);
  });
}

function renderSampleList() {
  els.sampleList.innerHTML = state.samples.map((sample) => `
    <li>
      <strong>Source ${sample.sourceId}: ${escapeHtml(sample.name)}</strong>
      <span>${escapeHtml(sample.detail)}${sample.status ? `, ${escapeHtml(sample.status)}` : ""}</span>
    </li>
  `).join("");
}

function drawCanvas() {
  if (!canvasCtx) return;
  const canvas = els.roomCanvas;
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  canvasCtx.setTransform(scale, 0, 0, scale, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const room = currentRoom();
  const mic = currentMic();
  const pad = 28;
  const plan = fitRect(room.width, room.depth, width - pad * 2, height - pad * 2);
  const ox = (width - plan.w) / 2;
  const oy = (height - plan.h) / 2;

  canvasCtx.clearRect(0, 0, width, height);
  drawGrid(ox, oy, plan, room);
  drawRoom(ox, oy, plan);
  drawMicrophone(ox, oy, plan, room, mic);
  state.sources.forEach((source) => drawSource(ox, oy, plan, room, source));
}

function drawGrid(ox, oy, plan, room) {
  canvasCtx.save();
  canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  canvasCtx.lineWidth = 1;
  const meters = Math.max(room.width, room.depth) > 30 ? 5 : 2;
  for (let x = 0; x <= room.width; x += meters) {
    const px = ox + (x / room.width) * plan.w;
    canvasCtx.beginPath();
    canvasCtx.moveTo(px, oy);
    canvasCtx.lineTo(px, oy + plan.h);
    canvasCtx.stroke();
  }
  for (let y = 0; y <= room.depth; y += meters) {
    const py = oy + (y / room.depth) * plan.h;
    canvasCtx.beginPath();
    canvasCtx.moveTo(ox, py);
    canvasCtx.lineTo(ox + plan.w, py);
    canvasCtx.stroke();
  }
  canvasCtx.restore();
}

function drawRoom(ox, oy, plan) {
  canvasCtx.save();
  canvasCtx.strokeStyle = "#6a6f61";
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeRect(ox, oy, plan.w, plan.h);
  canvasCtx.fillStyle = "rgba(224, 185, 79, 0.05)";
  canvasCtx.fillRect(ox, oy, plan.w, plan.h);
  canvasCtx.restore();
}

function drawSource(ox, oy, plan, room, source) {
  const pos = roomToPixel(ox, oy, plan, room, source.x, source.y);
  const radius = source.id === state.selectedId ? 10 : 7;
  const heightAlpha = clamp(source.z / Math.max(room.height, 1), 0, 1);

  canvasCtx.save();
  canvasCtx.translate(pos.x, pos.y);
  canvasCtx.rotate((source.angle * Math.PI) / 180);
  canvasCtx.strokeStyle = "rgba(0, 0, 0, 0.45)";
  canvasCtx.lineWidth = 5;
  canvasCtx.beginPath();
  canvasCtx.moveTo(-radius * 1.6, 0);
  canvasCtx.lineTo(radius * 1.6, 0);
  canvasCtx.stroke();
  canvasCtx.strokeStyle = familyColors[source.family];
  canvasCtx.lineWidth = 3;
  canvasCtx.beginPath();
  canvasCtx.moveTo(-radius * 1.6, 0);
  canvasCtx.lineTo(radius * 1.6, 0);
  canvasCtx.stroke();
  canvasCtx.rotate(-(source.angle * Math.PI) / 180);
  canvasCtx.fillStyle = familyColors[source.family];
  canvasCtx.globalAlpha = 0.68 + heightAlpha * 0.32;
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, radius, 0, Math.PI * 2);
  canvasCtx.fill();
  if (source.id === state.selectedId) {
    canvasCtx.globalAlpha = 1;
    canvasCtx.strokeStyle = "#f3f0e8";
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    canvasCtx.arc(0, 0, radius + 5, 0, Math.PI * 2);
    canvasCtx.stroke();
  }
  canvasCtx.restore();
}

function drawMicrophone(ox, oy, plan, room, mic) {
  const pos = roomToPixel(ox, oy, plan, room, mic.x, mic.y);
  canvasCtx.save();
  canvasCtx.translate(pos.x, pos.y);
  canvasCtx.rotate((mic.aim * Math.PI) / 180);
  canvasCtx.fillStyle = "#62b6a4";
  canvasCtx.strokeStyle = "#d7fff4";
  canvasCtx.lineWidth = 2;
  canvasCtx.beginPath();
  canvasCtx.rect(-8, -8, 16, 16);
  canvasCtx.fill();
  canvasCtx.stroke();
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, 0);
  canvasCtx.lineTo(28, -12);
  canvasCtx.moveTo(0, 0);
  canvasCtx.lineTo(28, 12);
  canvasCtx.stroke();
  canvasCtx.restore();
}

function handleCanvasClick(event) {
  const rect = els.roomCanvas.getBoundingClientRect();
  const room = currentRoom();
  const pad = 28;
  const plan = fitRect(room.width, room.depth, rect.width - pad * 2, rect.height - pad * 2);
  const ox = (rect.width - plan.w) / 2;
  const oy = (rect.height - plan.h) / 2;
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  let nearest = null;
  let nearestDistance = Infinity;
  state.sources.forEach((source) => {
    const pos = roomToPixel(ox, oy, plan, room, source.x, source.y);
    const distance = Math.hypot(pos.x - clickX, pos.y - clickY);
    if (distance < nearestDistance) {
      nearest = source;
      nearestDistance = distance;
    }
  });
  if (nearest && nearestDistance < 28) {
    state.selectedId = nearest.id;
    syncSelectedToForm();
    renderAll();
  }
}

function roomToPixel(ox, oy, plan, room, x, y) {
  return {
    x: ox + (x / room.width) * plan.w,
    y: oy + (y / room.depth) * plan.h
  };
}

function fitRect(roomWidth, roomDepth, maxWidth, maxHeight) {
  const ratio = roomWidth / roomDepth;
  let w = maxWidth;
  let h = w / ratio;
  if (h > maxHeight) {
    h = maxHeight;
    w = h * ratio;
  }
  return { w, h };
}

function estimateRt60(room) {
  const volume = room.width * room.depth * room.height;
  const area = 2 * (room.width * room.depth + room.width * room.height + room.depth * room.height);
  return clamp((0.161 * volume) / Math.max(area * room.absorption, 0.01), 0.18, 7.5);
}

async function addSamples(files, sourceId = state.selectedId) {
  if (!files.length) return;
  if (!audio) buildAudio();
  const material = els.sampleMaterial.value;
  const surface = els.sampleSurface.value;
  const soundClass = els.sampleClass.value;
  for (const file of Array.from(files)) {
    const sample = {
      sourceId,
      name: file.name,
      detail: `${material}, ${surface}, ${soundClass}`,
      status: "decoding",
      duration: 0,
      buffer: null
    };
    state.samples.push(sample);
    renderAll();
    try {
      const data = await file.arrayBuffer();
      sample.buffer = await audio.context.decodeAudioData(data);
      sample.duration = sample.buffer.duration;
      sample.status = `${sample.duration.toFixed(2)} s`;
    } catch (error) {
      sample.status = "metadata only";
      sample.error = error.message;
    }
    renderAll();
  }
}

function samplesForSource(sourceId) {
  return state.samples.filter((sample) => sample.sourceId === sourceId);
}

function decodedSamplesForSource(sourceId) {
  return samplesForSource(sourceId).filter((sample) => sample.buffer);
}

async function startPreview() {
  if (!audio) buildAudio();
  await audio.context.resume();
  if (state.playing) return;
  state.playing = true;
  const now = audio.context.currentTime;
  state.sources.forEach((source) => {
    source.nextFire = now + Math.random() / Math.max(source.rate, 0.01);
  });
  schedulerId = window.setInterval(scheduleAudio, 40);
  els.playButton.classList.add("active");
}

async function auditionSource(sourceId) {
  if (!audio) buildAudio();
  await audio.context.resume();
  const source = state.sources.find((item) => item.id === sourceId);
  if (!source) return;
  refreshImpulseIfNeeded();
  playEvent(source, audio.context.currentTime + 0.025, currentRoom(), currentMic());
}

function stopPreview() {
  state.playing = false;
  if (schedulerId) window.clearInterval(schedulerId);
  schedulerId = null;
  els.playButton.classList.remove("active");
}

function buildAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();
  const wet = context.createGain();
  const dry = context.createGain();
  const convolver = context.createConvolver();
  const impulseKey = impulseSignature();

  dry.gain.value = 0.78;
  wet.gain.value = 0.34;
  convolver.buffer = makeImpulse(context, estimateRt60(currentRoom()), currentRoom().absorption);
  convolver.connect(wet);
  wet.connect(context.destination);
  dry.connect(context.destination);

  audio = { context, dry, convolver, impulseKey };
}

function scheduleAudio() {
  if (!state.playing || !audio) return;
  const context = audio.context;
  const room = currentRoom();
  const mic = currentMic();
  const density = Number(els.density.value);
  refreshImpulseIfNeeded();

  const horizon = context.currentTime + 0.16;
  state.sources.forEach((source) => {
    while (source.nextFire < horizon) {
      playEvent(source, source.nextFire, room, mic);
      const interval = -Math.log(Math.max(Math.random(), 0.0001)) / Math.max(source.rate * density * 0.38, 0.01);
      source.nextFire += interval;
    }
  });
}

function playEvent(source, time, room, mic) {
  const context = audio.context;
  const sample = chooseDecodedSample(source.id);
  const playbackRate = sample ? randomRange(0.96, 1.04) : randomRange(0.88, 1.14);
  const duration = sample ? sample.buffer.duration / playbackRate : eventDuration(source);
  const distance = Math.hypot(source.x - mic.x, source.y - mic.y, source.z - 1.5);
  const delay = context.createDelay(1);
  const gain = context.createGain();
  const pan = context.createStereoPanner();
  const filter = context.createBiquadFilter();
  const player = context.createBufferSource();

  player.buffer = sample ? sample.buffer : makeNoiseBuffer(context, source);
  player.playbackRate.value = playbackRate;
  filter.type = source.family === "metal" || source.family === "ceramic" ? "bandpass" : "lowpass";
  filter.frequency.value = familyFrequency(source.family) * randomRange(0.82, 1.25);
  filter.Q.value = source.excitation === "scrape" ? 2.4 : 7.5;
  delay.delayTime.value = distance / 343;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.02, source.gain / (1 + distance * 0.22)), time + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  pan.pan.value = clamp((source.x - mic.x) / Math.max(room.width * 0.42, 1), -1, 1);

  if (sample) {
    player.connect(gain);
  } else {
    player.connect(filter);
    filter.connect(gain);
  }
  gain.connect(delay);
  delay.connect(pan);
  pan.connect(audio.dry);
  pan.connect(audio.convolver);
  player.start(time);
  player.stop(time + duration + 0.08);
}

function chooseDecodedSample(sourceId) {
  const samples = decodedSamplesForSource(sourceId);
  if (!samples.length) return null;
  return samples[Math.floor(Math.random() * samples.length)];
}

function refreshImpulseIfNeeded() {
  const nextImpulseKey = impulseSignature();
  if (audio.impulseKey === nextImpulseKey) return;
  const room = currentRoom();
  audio.convolver.buffer = makeImpulse(audio.context, estimateRt60(room), room.absorption);
  audio.impulseKey = nextImpulseKey;
}

function makeNoiseBuffer(context, source) {
  const duration = eventDuration(source);
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let phase = Math.random() * Math.PI * 2;
  const base = familyFrequency(source.family);
  for (let i = 0; i < length; i += 1) {
    const t = i / context.sampleRate;
    const env = source.excitation === "scrape"
      ? Math.pow(1 - i / length, 0.7) * (0.55 + 0.45 * Math.sin(t * 37))
      : Math.exp(-t * (source.family === "metal" ? 10 : 18));
    phase += (base + Math.sin(t * 29) * base * 0.08) / context.sampleRate * Math.PI * 2;
    const tonal = Math.sin(phase) * 0.45 + Math.sin(phase * 1.74) * 0.18;
    const rough = (Math.random() * 2 - 1) * (source.excitation === "scrape" ? 0.72 : 0.36);
    data[i] = (tonal + rough) * env;
  }
  return buffer;
}

function makeImpulse(context, rt60, absorption) {
  const duration = clamp(rt60, 0.18, 4.5);
  const length = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2 + absorption * 2.8);
    }
  }
  return buffer;
}

function impulseSignature() {
  const room = currentRoom();
  return [
    round(room.width, 1),
    round(room.depth, 1),
    round(room.height, 1),
    round(room.absorption, 2),
    round(room.diffusion, 2),
    els.surfacePreset.value
  ].join(":");
}

function serializeProject() {
  const room = currentRoom();
  return {
    schemaVersion: projectSchemaVersion,
    savedAt: new Date().toISOString(),
    controls: {
      spacePreset: els.spacePreset.value,
      roomWidth: room.width,
      roomDepth: room.depth,
      roomHeight: room.height,
      surfacePreset: els.surfacePreset.value,
      absorption: room.absorption,
      diffusion: room.diffusion,
      micPreset: els.micPreset.value,
      micX: Number(els.micX.value),
      micY: Number(els.micY.value),
      micAim: Number(els.micAim.value),
      arraySpan: Number(els.arraySpan.value),
      density: Number(els.density.value),
      runtimeTarget: els.runtimeTarget.value,
      outputBus: els.outputBus.value
    },
    layout: state.layout,
    selectedId: state.selectedId,
    nextId: state.nextId,
    sources: state.sources.map((source) => ({
      id: source.id,
      family: source.family,
      variant: source.variant,
      x: round(source.x, 3),
      y: round(source.y, 3),
      z: round(source.z, 3),
      angle: round(source.angle, 3),
      rate: round(source.rate, 3),
      gain: round(source.gain, 3),
      activator: source.activator,
      excitation: source.excitation
    })),
    samples: state.samples.map((sample) => ({
      sourceId: sample.sourceId,
      name: sample.name,
      detail: sample.detail,
      duration: sample.duration ? round(sample.duration, 3) : 0,
      status: sample.buffer ? "saved metadata" : sample.status || "metadata"
    }))
  };
}

function saveProjectToStorage() {
  try {
    window.localStorage.setItem(projectStorageKey, JSON.stringify(serializeProject()));
    setProjectStatus("Saved locally");
  } catch (error) {
    setProjectStatus("Save failed");
  }
}

function restoreProjectFromStorage({ silent }) {
  try {
    const stored = window.localStorage.getItem(projectStorageKey);
    if (!stored) {
      if (!silent) setProjectStatus("No saved project");
      return false;
    }
    restoreProject(JSON.parse(stored));
    setProjectStatus(silent ? "Restored saved" : "Loaded saved");
    return true;
  } catch (error) {
    setProjectStatus("Load failed");
    return false;
  }
}

function downloadProjectFile() {
  const blob = new Blob([JSON.stringify(serializeProject(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `spatial-sound-lab-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setProjectStatus("Exported JSON");
}

async function importProjectFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    restoreProject(JSON.parse(await file.text()));
    saveProjectToStorage();
    setProjectStatus("Imported JSON");
  } catch (error) {
    setProjectStatus("Import failed");
  } finally {
    event.target.value = "";
  }
}

function restoreProject(project) {
  if (!project || project.schemaVersion !== projectSchemaVersion) {
    throw new Error("Unsupported project schema");
  }

  const controls = project.controls || {};
  setControlValue(els.spacePreset, controls.spacePreset);
  setControlValue(els.roomWidth, controls.roomWidth);
  setControlValue(els.roomDepth, controls.roomDepth);
  setControlValue(els.roomHeight, controls.roomHeight);
  setControlValue(els.surfacePreset, controls.surfacePreset);
  setControlValue(els.absorption, controls.absorption);
  setControlValue(els.diffusion, controls.diffusion);
  setControlValue(els.micPreset, controls.micPreset);
  setControlValue(els.micX, controls.micX);
  setControlValue(els.micY, controls.micY);
  setControlValue(els.micAim, controls.micAim);
  setControlValue(els.arraySpan, controls.arraySpan);
  setControlValue(els.density, controls.density);
  setControlValue(els.runtimeTarget, controls.runtimeTarget);
  setControlValue(els.outputBus, controls.outputBus);

  const sources = Array.isArray(project.sources) ? project.sources : [];
  state.sources = sources.map(normalizeSavedSource).filter(Boolean);
  if (!state.sources.length) {
    throw new Error("Project does not contain sources");
  }
  const restoredSourceIds = new Set(state.sources.map((source) => source.id));
  state.samples = Array.isArray(project.samples)
    ? project.samples.map(normalizeSavedSample).filter((sample) => sample && restoredSourceIds.has(sample.sourceId))
    : [];
  state.layout = ["random", "grid", "ceiling"].includes(project.layout) ? project.layout : "random";
  syncLayoutButtons();
  state.selectedId = state.sources.some((source) => source.id === project.selectedId)
    ? project.selectedId
    : state.sources[0].id;
  state.nextId = Math.max(
    Number(project.nextId) || 1,
    Math.max(...state.sources.map((source) => source.id)) + 1
  );
  fitSourcesToRoom();
  syncSelectedToForm();
  renderAll();
}

function syncLayoutButtons() {
  document.querySelectorAll(".tool-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.layout === state.layout);
  });
}

function normalizeSavedSource(source) {
  const id = Math.max(1, Math.floor(Number(source.id)));
  const family = familyVariants[source.family] ? source.family : "wood";
  if (!Number.isFinite(id)) return null;
  return {
    id,
    family,
    variant: familyVariants[family].includes(source.variant) ? source.variant : familyVariants[family][0],
    x: Number(source.x) || 0,
    y: Number(source.y) || 0,
    z: Number(source.z) || 0,
    angle: Number(source.angle) || 0,
    rate: clamp(Number(source.rate) || 0.4, 0.05, 3.5),
    gain: clamp(Number(source.gain) || 0.6, 0, 1),
    activator: activatorNames[source.activator] ? source.activator : "solenoid",
    excitation: excitationNames[source.excitation] ? source.excitation : "tap",
    sampleCount: 0,
    nextFire: 0
  };
}

function normalizeSavedSample(sample) {
  const sourceId = Math.max(1, Math.floor(Number(sample.sourceId)));
  if (!Number.isFinite(sourceId) || !sample.name) return null;
  return {
    sourceId,
    name: String(sample.name),
    detail: sample.detail ? String(sample.detail) : "Saved sample metadata",
    duration: Number(sample.duration) || 0,
    status: sample.duration ? `metadata, ${Number(sample.duration).toFixed(2)} s` : sample.status || "metadata",
    buffer: null
  };
}

function setControlValue(element, value) {
  if (value === undefined || value === null || !element) return;
  const stringValue = String(value);
  if (element.tagName === "SELECT" && !Array.from(element.options).some((option) => option.value === stringValue || option.text === stringValue)) {
    return;
  }
  element.value = stringValue;
}

function setProjectStatus(message) {
  els.projectStatus.textContent = message;
}

function eventDuration(source) {
  if (source.excitation === "scrape" || source.excitation === "bow") return randomRange(0.28, 0.72);
  if (source.excitation === "roll") return randomRange(0.18, 0.42);
  return randomRange(0.06, 0.2);
}

function familyFrequency(family) {
  return {
    wood: 380,
    metal: 940,
    stone: 520,
    ceramic: 1120
  }[family];
}

function renderManifest() {
  const room = currentRoom();
  const manifest = {
    project: "Spatial Sound Lab scene",
    room: {
      preset: els.spacePreset.value,
      dimensionsMeters: [room.width, room.depth, room.height],
      surface: els.surfacePreset.value,
      absorption: room.absorption,
      diffusion: room.diffusion,
      estimatedRt60: Number(estimateRt60(room).toFixed(3))
    },
    microphone: {
      rig: els.micPreset.value,
      positionMeters: [Number(els.micX.value), Number(els.micY.value), 1.5],
      aimDegrees: Number(els.micAim.value),
      arraySpanMeters: Number(els.arraySpan.value)
    },
    synthesis: {
      runtimeTarget: els.runtimeTarget.value,
      outputBus: els.outputBus.value,
      densityPerSecond: Number(els.density.value)
    },
    sourceFamilies: familyVariants,
    sources: state.sources.map((source) => ({
      id: source.id,
      family: source.family,
      variant: source.variant,
      activator: source.activator,
      excitation: source.excitation,
      positionMeters: [round(source.x, 2), round(source.y, 2), round(source.z, 2)],
      orientationDegrees: Math.round(source.angle),
      ratePerSecond: round(source.rate, 3),
      gain: round(source.gain, 3),
      samplePool: samplesForSource(source.id).map((sample) => ({
        name: sample.name,
        detail: sample.detail,
        duration: sample.duration ? round(sample.duration, 3) : null,
        status: sample.status || "metadata"
      }))
    })),
    samplePools: state.sources.map((source) => ({
      sourceId: source.id,
      variant: source.variant,
      recordings: samplesForSource(source.id).map((sample) => ({
        name: sample.name,
        detail: sample.detail,
        duration: sample.duration ? round(sample.duration, 3) : null,
        status: sample.status || "metadata"
      }))
    }))
  };
  els.manifestPreview.textContent = JSON.stringify(manifest, null, 2);
}

function round(value, places) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

init();
