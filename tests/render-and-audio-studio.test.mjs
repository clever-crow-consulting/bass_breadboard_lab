import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDERED_STAGES, getStageParts, getDiffAgainstPrevious } from '../site/js/data/stages/index.js';
import { traceConnectedNet } from '../site/js/breadboard-diff.js';
import {
  resolvePinCoord,
  renderBreadboardSvg,
  bindBreadboardInteractions
} from '../site/js/breadboard-svg.js';
import {
  findRisingZeroCrossing,
  drawOscilloscope,
  applyStudioAmpGain,
  createAudioStudio
} from '../site/js/audio-studio.js';
import { createPassiveBassRiffs } from '../site/js/riffs.js';

test('resolvePinCoord resolves holes, rails, and headers and returns null for invalid tokens', () => {
  const a1 = resolvePinCoord('A1');
  const e1 = resolvePinCoord('E1');
  const f1 = resolvePinCoord('F1');
  const j30 = resolvePinCoord('J30');
  assert.ok(a1 && e1 && f1 && j30);
  assert.equal(a1.x, e1.x);
  assert.equal(a1.x, f1.x);
  assert.equal(j30.x > a1.x, true);
  assert.equal(e1.y > a1.y, true);
  assert.equal(f1.y - e1.y > 40, true, 'expected center DIP ravine gap between E and F');

  for (const token of ['TOP_PLUS_1', 'TOP_MINUS_15', 'BOT_PLUS_30', 'BOT_MINUS_8', 'HDR_IN', 'HDR_OUT', 'HDR_9V', 'HDR_GND']) {
    const pos = resolvePinCoord(token);
    assert.ok(pos && Number.isFinite(pos.x) && Number.isFinite(pos.y), `expected coordinate for ${token}`);
  }

  assert.equal(resolvePinCoord('Z99'), null);
  assert.equal(resolvePinCoord('A31'), null);
  assert.equal(resolvePinCoord(''), null);
  assert.equal(resolvePinCoord(null), null);
});

test('renderBreadboardSvg renders all 7 stages across presets/modes, enforces >=12px SVG fonts, and applies diff opacities and outlines', () => {
  for (const stage of ORDERED_STAGES) {
    for (const preset of Object.values(stage.presets)) {
      for (const mode of Object.values(stage.modes)) {
        const parts = getStageParts(stage.slug, preset.id, mode.id);
        const svg = renderBreadboardSvg({ preset, parts, theme: 'dark' });
        assert.match(svg, /^<svg\b[^>]*viewBox="0 0 1060 540"/);
        assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        assert.match(svg, /HDR_IN/);
        assert.match(svg, /data-pin="A1"/);
        assert.match(svg, /data-pin="J30"/);

        for (const m of svg.matchAll(/font-size="([0-9.]+)"/g)) {
          assert.equal(
            Number(m[1]) >= 12,
            true,
            `Stage ${stage.slug} (${preset.id}/${mode.id}) has font-size=${m[1]} < 12`
          );
        }
        for (const part of parts) {
          assert.equal(
            svg.includes(`data-part-id="${part.id}"`),
            true,
            `Stage ${stage.slug} missing SVG group for ${part.id}`
          );
        }
      }
    }
  }

  const s5aSvg = renderBreadboardSvg({
    preset: ORDERED_STAGES[4].presets[ORDERED_STAGES[4].defaultPresetId],
    parts: getStageParts('5a'),
    theme: 'light'
  });
  assert.match(s5aSvg, /bb-vactrol-sleeve/);

  const s2 = ORDERED_STAGES[1];
  const s2Preset = s2.presets[s2.defaultPresetId];
  const s2Parts = getStageParts('2');
  const transition = getDiffAgainstPrevious('2');
  const diffSvg = renderBreadboardSvg({
    preset: s2Preset,
    parts: s2Parts,
    diffResult: transition.diff,
    diffEnabled: true,
    highlightedNet: traceConnectedNet(s2Parts, 'HDR_GND')
  });
  assert.match(diffSvg, /data-diff-status="unchanged"[^>]*opacity="0\.28"/);
  assert.match(diffSvg, /data-diff-status="added"/);
  assert.match(diffSvg, /#10b981/);
  assert.match(diffSvg, /bb-net-strip/);

  const s5bTransition = getDiffAgainstPrevious('5b');
  const s5bParts = getStageParts('5b');
  const s5bDiffSvg = renderBreadboardSvg({
    preset: ORDERED_STAGES[5].presets[ORDERED_STAGES[5].defaultPresetId],
    parts: s5bParts,
    diffResult: s5bTransition.diff,
    diffEnabled: true
  });
  assert.match(s5bDiffSvg, /data-diff-status="modified"/);
  assert.match(s5bDiffSvg, /#f59e0b/);
});

test('diagonal wire and 2-pin halos follow lead segments without oversized rects and set pointer-events="none" on overlays', () => {
  const s3Transition = getDiffAgainstPrevious('3');
  const s3Parts = getStageParts('3');
  const s3Svg = renderBreadboardSvg({
    preset: ORDERED_STAGES[2].presets[ORDERED_STAGES[2].defaultPresetId],
    parts: s3Parts,
    selectedPartId: 'J_CG_VREF',
    diffResult: s3Transition.diff,
    diffEnabled: true,
    highlightedNet: traceConnectedNet(s3Parts, 'HDR_GND')
  });

  const extractPartGroup = (svg, partId) => {
    const re = new RegExp(`<g class="bb-part[^"]*" data-part-id="${partId}"[^>]*>([\\s\\S]*?)</g>`);
    const match = svg.match(re);
    assert.ok(match, `expected group for ${partId}`);
    return match[1];
  };

  const jCgGroup = extractPartGroup(s3Svg, 'J_CG_VREF');
  assert.doesNotMatch(jCgGroup, /<rect\b/, 'wire jumper J_CG_VREF must not emit axis-aligned rect halos');
  assert.match(jCgGroup, /<line[^>]*class="bb-diff-halo"[^>]*pointer-events="none"/);
  assert.match(jCgGroup, /<line[^>]*class="bb-selected-halo"[^>]*pointer-events="none"/);
  assert.match(jCgGroup, /#10b981/);
  assert.match(jCgGroup, /#38bdf8/);

  const s5bTransition = getDiffAgainstPrevious('5b');
  const s5bParts = getStageParts('5b');
  const s5bSvg = renderBreadboardSvg({
    preset: ORDERED_STAGES[5].presets[ORDERED_STAGES[5].defaultPresetId],
    parts: s5bParts,
    selectedPartId: 'J_LED_VREF',
    diffResult: s5bTransition.diff,
    diffEnabled: true,
    highlightedNet: traceConnectedNet(s5bParts, 'HDR_GND')
  });

  const jLedGroup = extractPartGroup(s5bSvg, 'J_LED_VREF');
  assert.doesNotMatch(jLedGroup, /<rect\b/, 'diagonal wire J_LED_VREF must not emit board-covering rect halos');
  assert.match(jLedGroup, /<line[^>]*class="bb-diff-halo"[^>]*pointer-events="none"/);
  assert.match(jLedGroup, /<line[^>]*class="bb-selected-halo"[^>]*pointer-events="none"/);

  const vacLdrGroup = extractPartGroup(s5bSvg, 'VAC_LDR');
  assert.doesNotMatch(vacLdrGroup, /<rect\b/, 'diagonal 2-pin VAC_LDR must use segment + local body halos');
  assert.match(vacLdrGroup, /<line[^>]*class="bb-diff-halo"[^>]*pointer-events="none"/);
  assert.match(vacLdrGroup, /<ellipse[^>]*class="bb-diff-halo"[^>]*pointer-events="none"/);
  assert.match(vacLdrGroup, /#f59e0b/);

  for (const overlayTag of s5bSvg.matchAll(/<[a-z]+\b[^>]*class="bb-(?:diff-halo|selected-halo|net-strip|vactrol-sleeve)"[^>]*>/g)) {
    assert.match(
      overlayTag[0],
      /pointer-events="none"/,
      `overlay element must disable pointer events: ${overlayTag[0]}`
    );
  }

  for (const stage of ORDERED_STAGES.slice(1)) {
    const tr = getDiffAgainstPrevious(stage.slug);
    const parts = getStageParts(stage.slug);
    const svg = renderBreadboardSvg({
      preset: stage.presets[stage.defaultPresetId],
      parts,
      selectedPartId: parts[parts.length - 1].id,
      diffResult: tr.diff,
      diffEnabled: true
    });
    for (const rectMatch of svg.matchAll(/<rect\b[^>]*class="bb-(?:diff|selected)-halo"[^>]*>/g)) {
      const wMatch = rectMatch[0].match(/\bwidth="([0-9.]+)"/);
      const hMatch = rectMatch[0].match(/\bheight="([0-9.]+)"/);
      assert.ok(wMatch && hMatch);
      assert.equal(Number(wMatch[1]) <= 270, true, `Stage ${stage.slug} halo rect too wide: ${rectMatch[0]}`);
      assert.equal(Number(hMatch[1]) <= 95, true, `Stage ${stage.slug} halo rect too tall: ${rectMatch[0]}`);
    }
  }
});

test('bindBreadboardInteractions delegates click, mouseover, and mouseleave for parts and pins', () => {
  const listeners = new Map();
  const container = {
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    }
  };

  const parts = getStageParts('1');
  const selectedCalls = [];
  const hoverCalls = [];

  const cleanup = bindBreadboardInteractions(container, {
    parts,
    onSelectPart: (id) => selectedCalls.push(id),
    onHoverNet: (net, info) => hoverCalls.push({ net, info })
  });

  const partChild = {
    parentElement: {
      getAttribute(attr) {
        return attr === 'data-part-id' ? 'R_PWR' : null;
      },
      parentElement: container
    },
    getAttribute() {
      return null;
    }
  };

  listeners.get('click')({ target: partChild });
  assert.deepEqual(selectedCalls, ['R_PWR']);

  listeners.get('click')({ target: container });
  assert.deepEqual(selectedCalls, ['R_PWR', null]);

  listeners.get('mouseover')({ target: partChild });
  assert.equal(hoverCalls.length, 1);
  assert.equal(hoverCalls[0].net.partIds.has('R_PWR'), true);
  assert.equal(hoverCalls[0].net.strips.has('TOP_ROW_2'), true);

  const holeTarget = {
    getAttribute(attr) {
      return attr === 'data-pin' ? 'HDR_GND' : null;
    },
    parentElement: container
  };
  listeners.get('mouseover')({ target: holeTarget });
  assert.equal(hoverCalls.length, 2);
  assert.equal(hoverCalls[1].net.strips.has('TOP_MINUS'), true);

  listeners.get('mouseleave')({});
  assert.equal(hoverCalls.length, 3);
  assert.equal(hoverCalls[2].net, null);

  cleanup();
  assert.equal(listeners.size, 0);
});

test('findRisingZeroCrossing locates rising zero crossing deterministically and drawOscilloscope enforces >=12px canvas font', () => {
  const buf = new Float32Array(256);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.sin((2 * Math.PI * (i - 17)) / 64);
  }
  const idx = findRisingZeroCrossing(buf, 128);
  assert.equal(buf[idx - 1] <= 0 && buf[idx] > 0, true);
  assert.equal(findRisingZeroCrossing(new Float32Array(32).fill(-0.2), 32), 0);

  const strokes = [];
  const fonts = [];
  const mockCanvas = {
    width: 560,
    height: 150,
    getContext(kind) {
      assert.equal(kind, '2d');
      return {
        set fillStyle(_v) {},
        set strokeStyle(v) {
          strokes.push(v);
        },
        set lineWidth(_v) {},
        set font(v) {
          fonts.push(v);
        },
        fillRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        fillText() {},
        setLineDash() {}
      };
    }
  };

  drawOscilloscope(mockCanvas, {
    dryBuffer: buf,
    wetBuffer: buf,
    bypass: false,
    theme: 'dark'
  });
  assert.equal(strokes.includes('#22c55e'), true);
  assert.equal(strokes.includes('#f59e0b'), true);
  assert.equal(fonts.length > 0, true);
  for (const f of fonts) {
    const m = f.match(/([0-9.]+)px/);
    assert.ok(m && Number(m[1]) >= 12, `expected canvas font >= 12px, got ${f}`);
  }

  strokes.length = 0;
  drawOscilloscope(mockCanvas, {
    dryBuffer: buf,
    wetBuffer: buf,
    bypass: true,
    theme: 'dark'
  });
  assert.equal(strokes.includes('#38bdf8'), true);
});

test('createAudioStudio runs singleton DSP loop, crossfades stage and variant swaps, handles pluck/visibility, supports bypass, and stops cleanly', async () => {
  let onaudioprocess = null;
  let instanceCount = 0;
  const winListeners = new Map();
  const docListeners = new Map();

  class MockAudioContext {
    constructor() {
      instanceCount++;
      this.sampleRate = 48000;
      this.state = 'suspended';
      this.destination = {};
    }
    async resume() {
      this.state = 'running';
    }
    createConstantSource() {
      return { offset: { value: 0 }, connect() {}, start() {}, disconnect() {} };
    }
    createGain() {
      return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }
    createScriptProcessor(bufSize) {
      const node = {
        bufferSize: bufSize,
        connect() {},
        disconnect() {},
        set onaudioprocess(fn) {
          onaudioprocess = fn;
        },
        get onaudioprocess() {
          return onaudioprocess;
        }
      };
      return node;
    }
  }

  const mockDoc = {
    visibilityState: 'visible',
    addEventListener(t, fn) {
      docListeners.set(t, fn);
    },
    removeEventListener(t, fn) {
      if (docListeners.get(t) === fn) docListeners.delete(t);
    }
  };
  const mockWin = {
    addEventListener(t, fn) {
      winListeners.set(t, fn);
    },
    removeEventListener(t, fn) {
      if (winListeners.get(t) === fn) winListeners.delete(t);
    },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}
  };

  const studio = createAudioStudio({
    AudioContextClass: MockAudioContext,
    win: mockWin,
    doc: mockDoc
  });

  studio.attachStage(ORDERED_STAGES[0], { presetId: 'toString', modeId: 'valueOf' });
  assert.equal(studio.getState().presetId, ORDERED_STAGES[0].defaultPresetId);
  assert.equal(studio.getState().modeId, ORDERED_STAGES[0].defaultModeId);
  studio.updateVariant({ presetId: 'constructor', modeId: 'toString' });
  assert.equal(studio.getState().presetId, ORDERED_STAGES[0].defaultPresetId);
  assert.equal(studio.getState().modeId, ORDERED_STAGES[0].defaultModeId);
  assert.equal(instanceCount, 0, 'AudioContext must be created lazily on play/pluck');

  const playPromise = studio.play();
  assert.equal(studio.getState().playing, true, 'playing must flip synchronously before resume settles');
  await playPromise;
  assert.equal(instanceCount, 1);

  const outBuf = new Float32Array(1024);
  onaudioprocess({ outputBuffer: { getChannelData: () => outBuf } });
  let energy = 0;
  for (const s of outBuf) energy += s * s;
  assert.equal(energy > 0.001, true, 'expected non-silent wet output');

  studio.setKnob('volume', 0.9);
  assert.equal(studio.getState().knobs.volume, 0.9);
  studio.setRiff('slap');
  assert.equal(studio.getState().riffId, 'slap');

  studio.updateVariant({ presetId: 'pnp_2n3906', modeId: 'hard_clip' });
  const variantBuf = new Float32Array(1024);
  onaudioprocess({ outputBuffer: { getChannelData: () => variantBuf } });
  assert.equal(variantBuf.every((v) => Number.isFinite(v)), true);

  studio.attachStage(ORDERED_STAGES[2], {});
  assert.equal(instanceCount, 1, 'must reuse singleton AudioContext across stage swaps');
  const swapBuf = new Float32Array(1024);
  onaudioprocess({ outputBuffer: { getChannelData: () => swapBuf } });
  assert.equal(swapBuf.every((v) => Number.isFinite(v)), true);

  studio.setBypass(true);
  assert.equal(studio.getState().bypass, true);
  studio.stop();
  await studio.play();
  const bypassBuf = new Float32Array(1024);
  onaudioprocess({ outputBuffer: { getChannelData: () => bypassBuf } });
  const expectedGroove = createPassiveBassRiffs(48000).groove;
  for (let i = 0; i < 64; i++) {
    assert.equal(
      Math.abs(bypassBuf[i] - applyStudioAmpGain(expectedGroove[i])) < 1e-6,
      true,
      `expected 1:1 unattenuated bypass through studio amp gain at sample ${i}`
    );
  }
  let rawEnergy = 0;
  let boostedBypassEnergy = 0;
  for (let i = 0; i < expectedGroove.length; i++) {
    rawEnergy += expectedGroove[i] * expectedGroove[i];
    const b = applyStudioAmpGain(expectedGroove[i]);
    boostedBypassEnergy += b * b;
  }
  const boostDb = 10 * Math.log10(boostedBypassEnergy / rawEnergy);
  assert.equal(boostDb >= 3.0, true, `expected >= +3.0 dB clean DI gain on dry bass, got ${boostDb.toFixed(2)} dB`);
  const slapRiff = createPassiveBassRiffs(48000).slap;
  for (let i = 0; i < slapRiff.length; i++) {
    assert.equal(Math.abs(applyStudioAmpGain(slapRiff[i])) < 0.98, true);
  }
  studio.toggleBypass();
  assert.equal(studio.getState().bypass, false);

  await studio.triggerPluck();
  assert.equal(studio.getState().playing, true);
  assert.equal(studio.getState().oneShotMode, true);

  mockDoc.visibilityState = 'hidden';
  docListeners.get('visibilitychange')();
  assert.equal(studio.getState().playing, false, 'visibilitychange hidden must stop playback');

  mockDoc.visibilityState = 'visible';
  await studio.play();
  assert.equal(studio.getState().playing, true);

  studio.stop();
  assert.equal(studio.getState().playing, false);
  const silentBuf = new Float32Array(1024).fill(1);
  onaudioprocess({ outputBuffer: { getChannelData: () => silentBuf } });
  assert.equal(silentBuf.every((v) => v === 0), true);

  studio.destroy();
  assert.equal(docListeners.size, 0);
  assert.equal(winListeners.size, 0);
});

test('createAudioStudio recovers cleanly when AudioContext.resume() rejects on play and triggerPluck', async () => {
  let rafCancelCount = 0;
  class RejectingAudioContext {
    constructor() {
      this.sampleRate = 48000;
      this.state = 'suspended';
      this.destination = {};
    }
    async resume() {
      throw new Error('NotAllowedError: play() blocked by autoplay policy');
    }
    createConstantSource() {
      return { offset: { value: 0 }, connect() {}, start() {}, disconnect() {} };
    }
    createGain() {
      return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }
    createScriptProcessor(bufSize) {
      return {
        bufferSize: bufSize,
        onaudioprocess: null,
        connect() {},
        disconnect() {}
      };
    }
  }

  const stateSnapshots = [];
  const studio = createAudioStudio({
    AudioContextClass: RejectingAudioContext,
    win: {
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame: () => 42,
      cancelAnimationFrame() {
        rafCancelCount++;
      }
    },
    doc: {
      visibilityState: 'visible',
      addEventListener() {},
      removeEventListener() {}
    },
    onChange(st) {
      stateSnapshots.push(st.playing);
    }
  });

  studio.attachStage(ORDERED_STAGES[0], {});
  stateSnapshots.length = 0;

  const playResult = await studio.play();
  assert.equal(playResult, false);
  assert.equal(studio.getState().playing, false);
  assert.deepEqual(stateSnapshots, [true, false]);
  assert.equal(rafCancelCount, 1);

  const toggleResult = await studio.togglePlay();
  assert.equal(toggleResult, false);
  assert.equal(studio.getState().playing, false);

  const pluckResult = await studio.triggerPluck();
  assert.equal(pluckResult, false);
  assert.equal(studio.getState().playing, false);
  assert.equal(studio.getState().oneShotMode, false);

  studio.destroy();
});
