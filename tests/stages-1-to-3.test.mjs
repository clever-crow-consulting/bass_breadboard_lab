import test from 'node:test';
import assert from 'node:assert/strict';
import { RIFF_CATALOG, onePoleAlpha, createPassiveBassRiffs } from '../site/js/riffs.js';
import {
  VALID_HEADERS,
  getPartPins,
  classifyPinToken,
  getStripKeyForPin,
  validateStageParts,
  computeBreadboardDiff,
  traceConnectedNet
} from '../site/js/breadboard-diff.js';
import { stageDescriptor as stage1 } from '../site/js/data/stages/stage1-bazz-fuss.js';
import { stageDescriptor as stage2 } from '../site/js/data/stages/stage2-woolly-mammoth.js';
import { stageDescriptor as stage3 } from '../site/js/data/stages/stage3-tl072-clean-blend.js';

function defaultKnobs(stage) {
  return Object.fromEntries(stage.audioSpec.knobs.map((k) => [k.id, k.val]));
}

function rms(arr, start = 0, end = arr.length) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += arr[i] * arr[i];
  return Math.sqrt(sum / Math.max(1, end - start));
}

test('createPassiveBassRiffs synthesizes finite bounded Float32Arrays', () => {
  assert.deepEqual(
    RIFF_CATALOG.map((r) => r.id),
    ['groove', 'slap', 'sustain', 'upperSynth']
  );
  const alpha = onePoleAlpha(100, 48000);
  assert.equal(alpha > 0 && alpha < 1, true);

  const riffs = createPassiveBassRiffs(48000);
  for (const key of ['groove', 'slap', 'sustain', 'upperSynth', 'singlePluck']) {
    const buf = riffs[key];
    assert.equal(buf instanceof Float32Array, true);
    assert.equal(buf.length > 48000, true);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
      assert.equal(Number.isFinite(buf[i]), true);
      peak = Math.max(peak, Math.abs(buf[i]));
    }
    assert.equal(peak > 0.4 && peak < 0.99, true);
  }
});

test('breadboard pin classifier and validator enforce holes, rails, headers, and collisions', () => {
  assert.equal(VALID_HEADERS.has('HDR_IN'), true);
  assert.deepEqual(classifyPinToken('C14'), {
    kind: 'hole',
    col: 'C',
    row: 14,
    strip: 'TOP_ROW_14'
  });
  assert.deepEqual(classifyPinToken('G28'), {
    kind: 'hole',
    col: 'G',
    row: 28,
    strip: 'BOT_ROW_28'
  });
  assert.deepEqual(classifyPinToken('TOP_MINUS_4'), {
    kind: 'rail',
    rail: 'TOP_MINUS',
    row: 4,
    strip: 'TOP_MINUS'
  });
  assert.deepEqual(classifyPinToken('HDR_GND'), {
    kind: 'header',
    id: 'HDR_GND',
    strip: 'HDR_GND'
  });
  assert.equal(classifyPinToken('Z99').kind, 'invalid');
  assert.equal(getStripKeyForPin('E13'), 'TOP_ROW_13');
  assert.equal(getStripKeyForPin('BAD_PIN'), null);
  assert.deepEqual(getPartPins({ from: 'A2', to: 'TOP_PLUS_2' }), ['A2', 'TOP_PLUS_2']);
  assert.deepEqual(getPartPins({ pins: ['C12', 'C14', 'C16'], from: 'ignored', to: 'ignored' }), [
    'C12',
    'C14',
    'C16'
  ]);

  const colliding = validateStageParts([
    { id: 'R1', type: 'resistor', value: '10k', from: 'A10', to: 'TOP_PLUS_10' },
    { id: 'R2', type: 'resistor', value: '10k', from: 'A10', to: 'TOP_MINUS_10' }
  ]);
  assert.equal(colliding.valid, false);
  assert.equal(colliding.errors.some((e) => e.includes('A10')), true);
});

test('Stages 1, 2, and 3 pass pin validation with zero hole collisions across all presets and modes', () => {
  for (const stage of [stage1, stage2, stage3]) {
    for (const preset of Object.values(stage.presets)) {
      for (const mode of Object.values(stage.modes)) {
        const parts = stage.buildComponents(preset, mode);
        const check = validateStageParts(parts);
        assert.equal(
          check.valid,
          true,
          `${stage.stageNumber} ${preset.id}/${mode.id}: ${check.errors.join('; ')}`
        );
        for (const p of parts) {
          if (p.type === 'transistor' || p.type === 'pot') {
            assert.equal(typeof p.tag === 'string' && p.tag.length > 0, true, `${p.id} missing tag`);
          }
        }
      }
    }
  }

  const s3Parts = stage3.buildComponents(
    stage3.presets[stage3.defaultPresetId],
    stage3.modes[stage3.defaultModeId]
  );
  const ic1 = s3Parts.find((p) => p.id === 'IC1');
  assert.ok(ic1);
  assert.equal(ic1.type, 'dipN');
  assert.equal(ic1.startCol, 13);
  assert.equal(ic1.spanCols, 4);
  assert.equal(ic1.chipLabel, 'TL072');
});

test('Stage 1 to Stage 2 diff keeps Row 1-4 power filter unchanged, removes D1, and adds Q2', () => {
  const s1Parts = stage1.buildComponents(
    stage1.presets[stage1.defaultPresetId],
    stage1.modes[stage1.defaultModeId]
  );
  const s2Parts = stage2.buildComponents(
    stage2.presets[stage2.defaultPresetId],
    stage2.modes[stage2.defaultModeId]
  );

  const selfDiff = computeBreadboardDiff(s1Parts, s1Parts);
  assert.equal(selfDiff.unchanged.length, s1Parts.length);
  assert.equal(selfDiff.modified.length, 0);
  assert.equal(selfDiff.added.length, 0);
  assert.equal(selfDiff.removed.length, 0);

  const s1ToS2 = computeBreadboardDiff(s1Parts, s2Parts);
  const unchangedIds = new Set(s1ToS2.unchanged.map((p) => p.id));
  for (const pwrId of ['J_GND_HDR', 'J_GND_BRIDGE', 'J_9V_HDR', 'R_PWR', 'C_PWR']) {
    assert.equal(unchangedIds.has(pwrId), true, `expected ${pwrId} unchanged`);
  }
  assert.equal(s1ToS2.removed.some((p) => p.id === 'D1'), true);
  assert.equal(s1ToS2.added.some((p) => p.id === 'Q2'), true);
  assert.equal(s1ToS2.statusById.get('D1'), 'removed');
  assert.equal(s1ToS2.statusById.get('Q2'), 'added');
  assert.equal(s1ToS2.statusById.get('R_PWR'), 'unchanged');

  const gndNet = traceConnectedNet(s2Parts, 'HDR_GND');
  assert.equal(gndNet.strips.has('TOP_MINUS'), true);
  assert.equal(gndNet.strips.has('BOT_MINUS'), true);
  assert.equal(gndNet.partIds.has('J_GND_HDR'), true);
  assert.equal(gndNet.partIds.has('J_GND_BRIDGE'), true);

  const s3Parts = stage3.buildComponents(
    stage3.presets[stage3.defaultPresetId],
    stage3.modes[stage3.defaultModeId]
  );
  const s2ToS3 = computeBreadboardDiff(s2Parts, s3Parts);
  const s2ToS3Unchanged = new Set(s2ToS3.unchanged.map((p) => p.id));
  for (const pwrId of ['J_GND_HDR', 'J_GND_BRIDGE', 'J_9V_HDR', 'R_PWR', 'C_PWR']) {
    assert.equal(s2ToS3Unchanged.has(pwrId), true, `Stage 2->3 expected ${pwrId} unchanged`);
  }
  const vrefNet = traceConnectedNet(s3Parts, 'R_V1');
  assert.equal(vrefNet.strips.has('TOP_ROW_10'), true);
  assert.equal(vrefNet.strips.has('BOT_ROW_10'), true);
  assert.equal(vrefNet.partIds.has('R_BIAS'), true);
});

test('Stages 1-3 DSP processors enforce bounded output, ASCII telemetry, Stage 2 PINCH gate, and Stage 3 phase_trap >10 dB cancellation', () => {
  const fs = 48000;
  const riffs = createPassiveBassRiffs(fs);
  const input = riffs.groove;

  for (const stage of [stage1, stage2, stage3]) {
    const state = {
      presetId: stage.defaultPresetId,
      modeId: stage.defaultModeId,
      knobs: defaultKnobs(stage)
    };
    const dsp = stage.audioSpec.createDSP(fs, () => state);
    let peak = 0;
    for (let i = 0; i < 24000; i++) {
      const y = dsp.processSample(input[i]);
      assert.equal(Number.isFinite(y), true, `Stage ${stage.slug} NaN/Inf at sample ${i}`);
      peak = Math.max(peak, Math.abs(y));
    }
    assert.equal(peak >= 0.05 && peak <= 0.99, true, `Stage ${stage.slug} peak=${peak}`);
    const tel = dsp.getTelemetry();
    assert.equal(typeof tel === 'string' && tel.length > 0, true);
    assert.equal(/^[\x20-\x7E]+$/.test(tel), true, `non-ASCII telemetry: ${tel}`);
  }

  // Stage 2 PINCH gate invariant (< 0.001 RMS on 0.0004 decaying tail at pinch=0.92, volume=0.7)
  const s2State = {
    presetId: stage2.defaultPresetId,
    modeId: stage2.defaultModeId,
    knobs: { ...defaultKnobs(stage2), pinch: 0.92, volume: 0.7 }
  };
  const s2Dsp = stage2.audioSpec.createDSP(fs, () => s2State);
  const s2Out = new Float32Array(fs);
  for (let i = 0; i < fs; i++) {
    const env = i < 8000 ? 0.5 : 0.0004;
    s2Out[i] = s2Dsp.processSample(Math.sin((2 * Math.PI * 41.2 * i) / fs) * env);
  }
  const tailRms = rms(s2Out, 36000, 48000);
  assert.equal(tailRms < 0.001, true, `expected gated tail < 0.001 RMS, got ${tailRms}`);

  // Stage 3 phase_trap vs full_blend invariant (> 10 dB cancellation at 41.2 Hz, 0.12 amp, drive=0, blend=0.5, volume=0.8)
  const runLowSine = (presetId) => {
    const state = {
      presetId,
      modeId: stage3.defaultModeId,
      knobs: { ...defaultKnobs(stage3), drive: 0.0, blend: 0.5, volume: 0.8 }
    };
    const dsp = stage3.audioSpec.createDSP(fs, () => state);
    const out = new Float32Array(24000);
    for (let i = 0; i < out.length; i++) {
      out[i] = dsp.processSample(0.12 * Math.sin((2 * Math.PI * 41.2 * i) / fs));
    }
    return rms(out, 6000, 24000);
  };

  const inPhaseRms = runLowSine('full_blend');
  const outOfPhaseRms = runLowSine('phase_trap');
  const lossDb = 20 * Math.log10(inPhaseRms / Math.max(1e-9, outOfPhaseRms));
  assert.equal(lossDb > 10, true, `expected > 10 dB cancellation, got ${lossDb.toFixed(2)} dB`);
});
