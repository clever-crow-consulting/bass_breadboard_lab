import { createPassiveBassRiffs } from './riffs.js';

const VALID_RIFF_IDS = new Set(['groove', 'slap', 'sustain', 'upperSynth']);
const SCOPE_RING_SIZE = 512;
const SCOPE_RING_MASK = SCOPE_RING_SIZE - 1;
const STUDIO_AMP_GAIN = 1.48;
const STUDIO_AMP_KNEE_START = 0.78;
const STUDIO_AMP_KNEE_WIDTH = 0.18;

export function applyStudioAmpGain(sample) {
  const s = (Number(sample) || 0) * STUDIO_AMP_GAIN;
  const abs = Math.abs(s);
  if (abs <= STUDIO_AMP_KNEE_START) {
    return s;
  }
  return (
    Math.sign(s) *
    (STUDIO_AMP_KNEE_START +
      STUDIO_AMP_KNEE_WIDTH * Math.tanh((abs - STUDIO_AMP_KNEE_START) / STUDIO_AMP_KNEE_WIDTH))
  );
}

export function formatKnobValue(knobDef, value) {
  const v = Number(value ?? knobDef?.val ?? 0);
  const fmt = knobDef?.fmt || 'pct';
  if (fmt === 'ledToggle') {
    return v >= 0.5 ? '3mm Red LED' : '1N4148 Si';
  }
  if (fmt === 'dbShelf') {
    const db = (v - 0.5) * 22;
    const sign = db >= 0 ? '+' : '';
    return `${sign}${db.toFixed(1)} dB`;
  }
  if (fmt === 'subMix') {
    const subPct = Math.round((1 - v) * 100);
    return `${subPct}% Sub / ${100 - subPct}% Clean`;
  }
  return `${Math.round(v * 100)}%`;
}

export function findRisingZeroCrossing(buffer, maxSearch = 512) {
  if (!buffer || typeof buffer.length !== 'number' || buffer.length < 2) {
    return 0;
  }
  const limit = Math.min(buffer.length, Math.max(2, Math.floor(maxSearch)));
  for (let i = 1; i < limit; i++) {
    if (buffer[i - 1] <= 0 && buffer[i] > 0) {
      return i;
    }
  }
  return 0;
}

export function drawOscilloscope(
  canvas,
  { dryBuffer = null, wetBuffer = null, bypass = false, theme = 'dark' } = {}
) {
  if (!canvas || typeof canvas.getContext !== 'function') {
    return;
  }
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) {
    return;
  }

  const width = Number(canvas.width) || 560;
  const height = Number(canvas.height) || 150;
  const isLight = theme === 'light';

  const bgColor = isLight ? '#f6f8fa' : '#0b0d10';
  const gridColor = isLight ? '#d0d7de' : '#232a34';
  const dryColor = isLight ? '#16a34a' : '#22c55e';
  const wetColor = bypass
    ? isLight
      ? '#0284c7'
      : '#38bdf8'
    : isLight
      ? '#d97706'
      : '#f59e0b';

  ctx2d.fillStyle = bgColor;
  ctx2d.fillRect(0, 0, width, height);

  ctx2d.strokeStyle = gridColor;
  ctx2d.lineWidth = 1;
  if (typeof ctx2d.setLineDash === 'function') {
    ctx2d.setLineDash([]);
  }
  ctx2d.beginPath();
  ctx2d.moveTo(0, height * 0.5);
  ctx2d.lineTo(width, height * 0.5);
  ctx2d.moveTo(0, height * 0.22);
  ctx2d.lineTo(width, height * 0.22);
  ctx2d.moveTo(0, height * 0.78);
  ctx2d.lineTo(width, height * 0.78);
  ctx2d.stroke();

  if (dryBuffer && dryBuffer.length >= 2) {
    const searchWindow = Math.min(512, Math.max(2, Math.floor(dryBuffer.length / 2)));
    const trigOffset = findRisingZeroCrossing(dryBuffer, searchWindow);
    const drawLen = Math.min(280, Math.max(2, dryBuffer.length - trigOffset));

    if (typeof ctx2d.setLineDash === 'function') {
      ctx2d.setLineDash([4, 3]);
    }
    ctx2d.strokeStyle = dryColor;
    ctx2d.lineWidth = 1.5;
    ctx2d.beginPath();
    for (let i = 0; i < drawLen; i++) {
      const sample = Math.max(-1.15, Math.min(1.15, dryBuffer[trigOffset + i] || 0));
      const x = (i / (drawLen - 1)) * width;
      const y = height * 0.5 - sample * (height * 0.42);
      if (i === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
    }
    ctx2d.stroke();

    if (typeof ctx2d.setLineDash === 'function') {
      ctx2d.setLineDash([]);
    }

    if (wetBuffer && wetBuffer.length >= 2) {
      ctx2d.strokeStyle = wetColor;
      ctx2d.lineWidth = 2.2;
      ctx2d.beginPath();
      for (let i = 0; i < drawLen; i++) {
        const idx = Math.min(wetBuffer.length - 1, trigOffset + i);
        const sample = Math.max(-1.15, Math.min(1.15, wetBuffer[idx] || 0));
        const x = (i / (drawLen - 1)) * width;
        const y = height * 0.5 - sample * (height * 0.42);
        if (i === 0) ctx2d.moveTo(x, y);
        else ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();
    }
  }

  ctx2d.font = '12px ui-monospace, monospace';
  if (typeof ctx2d.fillText === 'function') {
    ctx2d.fillStyle = dryColor;
    ctx2d.fillText('DRY IN', 10, 18);
    ctx2d.fillStyle = wetColor;
    ctx2d.fillText(bypass ? 'BYPASS OUT' : 'STAGE OUT', 74, 18);
  }
}

export function createAudioStudio({
  AudioContextClass,
  win = globalThis.window,
  doc = globalThis.document,
  onChange
} = {}) {
  let ctx = null;
  let sourceKeepAlive = null;
  let processor = null;
  let masterGain = null;
  let riffs = null;

  let activeStage = null;
  let activePresetId = null;
  let activeModeId = null;
  let knobs = {};
  let riffId = 'groove';

  let activeDspEntry = null;
  let prevDspEntry = null;
  let fadeTotalSamples = 0;
  let fadeRemainingSamples = 0;

  let playing = false;
  let oneShotMode = false;
  let bypass = false;
  let bypassSmooth = 0.0;
  let playhead = 0;

  const scopeDry = new Float32Array(SCOPE_RING_SIZE);
  const scopeWet = new Float32Array(SCOPE_RING_SIZE);
  const unwrappedDry = new Float32Array(SCOPE_RING_SIZE);
  const unwrappedWet = new Float32Array(SCOPE_RING_SIZE);
  let scopeWrite = 0;
  let scopeCanvas = null;
  let rafId = null;
  let destroyed = false;

  function resolveTheme() {
    const attr = doc?.documentElement?.getAttribute?.('data-theme');
    return attr === 'light' ? 'light' : 'dark';
  }

  function buildDspEntry(stage, sampleRate, presetId, modeId, knobMap) {
    if (!stage?.audioSpec?.createDSP) return null;
    const stateRef = {
      presetId,
      modeId,
      knobs: knobMap
    };
    const dsp = stage.audioSpec.createDSP(sampleRate, () => stateRef);
    return {
      stageSlug: stage.slug,
      sampleRate,
      stateRef,
      dsp
    };
  }

  function getState() {
    let telemetry = 'Idle';
    if (activeStage) {
      if (bypass) {
        telemetry = 'True Bypass (Dry Passive P-Bass)';
      } else if (typeof activeDspEntry?.dsp?.getTelemetry === 'function') {
        telemetry = activeDspEntry.dsp.getTelemetry();
      }
    }
    return {
      playing,
      oneShotMode,
      bypass,
      riffId,
      stageSlug: activeStage ? activeStage.slug : null,
      presetId: activePresetId,
      modeId: activeModeId,
      knobs: { ...knobs },
      telemetry
    };
  }

  function emitChange() {
    if (typeof onChange === 'function') {
      onChange(getState());
    }
  }

  function renderScopeFrame() {
    if (!scopeCanvas) return;
    if (!playing) {
      drawOscilloscope(scopeCanvas, {
        dryBuffer: null,
        wetBuffer: null,
        bypass,
        theme: resolveTheme()
      });
      return;
    }
    const base = scopeWrite;
    for (let i = 0; i < SCOPE_RING_SIZE; i++) {
      const idx = (base + i) & SCOPE_RING_MASK;
      unwrappedDry[i] = scopeDry[idx];
      unwrappedWet[i] = scopeWet[idx];
    }
    drawOscilloscope(scopeCanvas, {
      dryBuffer: unwrappedDry,
      wetBuffer: unwrappedWet,
      bypass,
      theme: resolveTheme()
    });
  }

  function cancelScopeLoop() {
    if (rafId !== null) {
      if (typeof win?.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(rafId);
      }
      rafId = null;
    }
  }

  function startScopeLoop() {
    if (rafId !== null || typeof win?.requestAnimationFrame !== 'function') {
      return;
    }
    const tick = () => {
      renderScopeFrame();
      if (playing) {
        rafId = win.requestAnimationFrame(tick);
      } else {
        rafId = null;
        renderScopeFrame();
        emitChange();
      }
    };
    rafId = win.requestAnimationFrame(tick);
  }

  function swapActiveDsp(nextEntry) {
    if (playing && ctx && activeDspEntry?.dsp && nextEntry?.dsp) {
      prevDspEntry = activeDspEntry;
      fadeTotalSamples = Math.max(16, Math.round(ctx.sampleRate * 0.012));
      fadeRemainingSamples = fadeTotalSamples;
    } else {
      prevDspEntry = null;
      fadeTotalSamples = 0;
      fadeRemainingSamples = 0;
    }
    activeDspEntry = nextEntry;
  }

  function ensureAudioGraph() {
    if (destroyed) return false;
    if (!ctx) {
      const AC = AudioContextClass || win?.AudioContext || win?.webkitAudioContext;
      if (typeof AC !== 'function') return false;

      ctx = new AC();
      riffs = createPassiveBassRiffs(ctx.sampleRate);

      if (activeStage && (!activeDspEntry || activeDspEntry.sampleRate !== ctx.sampleRate)) {
        activeDspEntry = buildDspEntry(
          activeStage,
          ctx.sampleRate,
          activePresetId,
          activeModeId,
          knobs
        );
      }

      processor = ctx.createScriptProcessor(1024, 1, 1);
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.92;

      if (typeof ctx.createConstantSource === 'function') {
        sourceKeepAlive = ctx.createConstantSource();
        if (sourceKeepAlive.offset) {
          sourceKeepAlive.offset.value = 0;
        }
        sourceKeepAlive.connect(processor);
        sourceKeepAlive.start();
      }

      processor.onaudioprocess = (ev) => {
        const out = ev.outputBuffer.getChannelData(0);
        if (!playing || !riffs) {
          out.fill(0);
          return;
        }

        const srcBuf = oneShotMode
          ? riffs.singlePluck
          : Object.hasOwn(riffs, riffId)
            ? riffs[riffId]
            : riffs.groove;
        const targetBypass = bypass ? 1.0 : 0.0;

        for (let i = 0; i < out.length; i++) {
          if (playhead >= srcBuf.length) {
            if (oneShotMode) {
              playing = false;
              oneShotMode = false;
              out[i] = 0;
              continue;
            }
            playhead = 0;
          }

          const dry = srcBuf[playhead++];
          let wet = activeDspEntry?.dsp ? activeDspEntry.dsp.processSample(dry) : dry;

          if (fadeRemainingSamples > 0 && prevDspEntry?.dsp && fadeTotalSamples > 0) {
            const prevWet = prevDspEntry.dsp.processSample(dry);
            const alpha = 1 - fadeRemainingSamples / fadeTotalSamples;
            wet = prevWet * (1 - alpha) + wet * alpha;
            fadeRemainingSamples--;
            if (fadeRemainingSamples === 0) {
              prevDspEntry = null;
            }
          }

          bypassSmooth += 0.004 * (targetBypass - bypassSmooth);
          const pedalOut = wet * (1 - bypassSmooth) + dry * bypassSmooth;
          const safePedalOut = Number.isFinite(pedalOut) ? pedalOut : 0;
          const ampSample = applyStudioAmpGain(safePedalOut);
          out[i] = Number.isFinite(ampSample) ? ampSample : 0;

          const sw = scopeWrite;
          scopeDry[sw] = dry;
          scopeWet[sw] = safePedalOut;
          scopeWrite = (sw + 1) & SCOPE_RING_MASK;
        }
      };

      processor.connect(masterGain);
      masterGain.connect(ctx.destination);
    }
    return true;
  }

  function attachStage(stageDescriptor, { presetId, modeId, preferredRiffId } = {}) {
    if (!stageDescriptor) return getState();

    const sameStage = activeStage && activeStage.slug === stageDescriptor.slug;
    const nextPresetId =
      typeof presetId === 'string' &&
      stageDescriptor.presets &&
      Object.hasOwn(stageDescriptor.presets, presetId)
        ? presetId
        : stageDescriptor.defaultPresetId;
    const nextModeId =
      typeof modeId === 'string' &&
      stageDescriptor.modes &&
      Object.hasOwn(stageDescriptor.modes, modeId)
        ? modeId
        : stageDescriptor.defaultModeId;

    const nextKnobs = {};
    const knobDefs = Array.isArray(stageDescriptor.audioSpec?.knobs)
      ? stageDescriptor.audioSpec.knobs
      : [];
    for (const def of knobDefs) {
      if (sameStage && Object.hasOwn(knobs, def.id)) {
        nextKnobs[def.id] = knobs[def.id];
      } else {
        nextKnobs[def.id] = def.val;
      }
    }

    if (preferredRiffId && VALID_RIFF_IDS.has(preferredRiffId)) {
      riffId = preferredRiffId;
    } else if (!sameStage) {
      const stageDefaultRiff = stageDescriptor.audioSpec?.defaultRiffId;
      riffId = VALID_RIFF_IDS.has(stageDefaultRiff) ? stageDefaultRiff : 'groove';
    }

    const sr = ctx ? ctx.sampleRate : 48000;
    const nextEntry = buildDspEntry(
      stageDescriptor,
      sr,
      nextPresetId,
      nextModeId,
      nextKnobs
    );

    activeStage = stageDescriptor;
    activePresetId = nextPresetId;
    activeModeId = nextModeId;
    knobs = nextKnobs;
    swapActiveDsp(nextEntry);

    if (!playing) {
      renderScopeFrame();
    }
    emitChange();
    return getState();
  }

  function updateVariant({ presetId, modeId } = {}) {
    if (!activeStage) return getState();
    const nextPresetId =
      typeof presetId === 'string' &&
      activeStage.presets &&
      Object.hasOwn(activeStage.presets, presetId)
        ? presetId
        : activePresetId;
    const nextModeId =
      typeof modeId === 'string' &&
      activeStage.modes &&
      Object.hasOwn(activeStage.modes, modeId)
        ? modeId
        : activeModeId;

    if (nextPresetId === activePresetId && nextModeId === activeModeId) {
      return getState();
    }

    const nextKnobs = { ...knobs };
    const sr = ctx ? ctx.sampleRate : 48000;
    const nextEntry = buildDspEntry(
      activeStage,
      sr,
      nextPresetId,
      nextModeId,
      nextKnobs
    );

    activePresetId = nextPresetId;
    activeModeId = nextModeId;
    knobs = nextKnobs;
    swapActiveDsp(nextEntry);
    emitChange();
    return getState();
  }

  function setKnob(knobId, value) {
    const num = Number(value);
    if (!knobId || !Number.isFinite(num)) return getState();
    const def = activeStage?.audioSpec?.knobs?.find((k) => k.id === knobId);
    const clamped = def
      ? Math.min(def.max, Math.max(def.min, num))
      : num;
    knobs[knobId] = clamped;
    if (activeDspEntry?.stateRef?.knobs) {
      activeDspEntry.stateRef.knobs[knobId] = clamped;
    }
    emitChange();
    return getState();
  }

  function setRiff(nextRiffId) {
    if (!VALID_RIFF_IDS.has(nextRiffId)) return getState();
    riffId = nextRiffId;
    if (oneShotMode) {
      oneShotMode = false;
      playhead = 0;
    }
    emitChange();
    return getState();
  }

  async function play() {
    if (!ensureAudioGraph()) return false;
    const wasLooping = playing && !oneShotMode;
    oneShotMode = false;
    if (!wasLooping) {
      playhead = 0;
    }
    playing = true;
    bypassSmooth = bypass ? 1.0 : 0.0;
    startScopeLoop();
    emitChange();
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        await ctx.resume();
      } catch {
        stop();
        return false;
      }
    }
    return true;
  }

  function stop() {
    playing = false;
    oneShotMode = false;
    prevDspEntry = null;
    fadeRemainingSamples = 0;
    scopeDry.fill(0);
    scopeWet.fill(0);
    cancelScopeLoop();
    renderScopeFrame();
    emitChange();
  }

  async function togglePlay() {
    if (playing && !oneShotMode) {
      stop();
      return false;
    }
    return play();
  }

  async function triggerPluck() {
    if (!ensureAudioGraph()) return false;
    oneShotMode = true;
    playhead = 0;
    playing = true;
    bypassSmooth = bypass ? 1.0 : 0.0;
    startScopeLoop();
    emitChange();
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        await ctx.resume();
      } catch {
        stop();
        return false;
      }
    }
    return true;
  }

  function setBypass(nextBypass) {
    bypass = Boolean(nextBypass);
    if (!playing) {
      bypassSmooth = bypass ? 1.0 : 0.0;
      renderScopeFrame();
    }
    emitChange();
    return bypass;
  }

  function toggleBypass() {
    return setBypass(!bypass);
  }

  function bindScopeCanvas(canvasEl) {
    scopeCanvas = canvasEl || null;
    renderScopeFrame();
    if (playing && scopeCanvas) {
      startScopeLoop();
    }
  }

  const onVisibilityChange = () => {
    if (doc && (doc.visibilityState === 'hidden' || doc.hidden === true)) {
      if (playing) {
        stop();
      }
    }
  };

  const onPageHide = () => {
    if (playing) {
      stop();
    }
  };

  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('visibilitychange', onVisibilityChange);
  }
  if (win && typeof win.addEventListener === 'function') {
    win.addEventListener('pagehide', onPageHide);
  }

  function destroy() {
    if (destroyed) return;
    stop();
    destroyed = true;
    scopeCanvas = null;

    if (doc && typeof doc.removeEventListener === 'function') {
      doc.removeEventListener('visibilitychange', onVisibilityChange);
    }
    if (win && typeof win.removeEventListener === 'function') {
      win.removeEventListener('pagehide', onPageHide);
    }

    if (processor) {
      processor.onaudioprocess = null;
      if (typeof processor.disconnect === 'function') processor.disconnect();
      processor = null;
    }
    if (sourceKeepAlive) {
      if (typeof sourceKeepAlive.stop === 'function') {
        try {
          sourceKeepAlive.stop();
        } catch {
          // Ignore if source was already stopped.
        }
      }
      if (typeof sourceKeepAlive.disconnect === 'function') sourceKeepAlive.disconnect();
      sourceKeepAlive = null;
    }
    if (masterGain) {
      if (typeof masterGain.disconnect === 'function') masterGain.disconnect();
      masterGain = null;
    }
    if (ctx) {
      if (typeof ctx.close === 'function') {
        try {
          ctx.close();
        } catch {
          // Ignore close errors in mock contexts.
        }
      }
      ctx = null;
    }
  }

  return {
    attachStage,
    updateVariant,
    setKnob,
    setRiff,
    play,
    togglePlay,
    triggerPluck,
    stop,
    setBypass,
    toggleBypass,
    bindScopeCanvas,
    getState,
    destroy
  };
}
