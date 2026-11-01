import test from 'node:test';
import assert from 'node:assert/strict';
import { createPassiveBassRiffs } from '../site/js/riffs.js';
import { applyStudioAmpGain } from '../site/js/audio-studio.js';
import { ORDERED_STAGES, STAGES_BY_SLUG } from '../site/js/data/stages/index.js';

function defaultKnobs(stage) {
  return Object.fromEntries(stage.audioSpec.knobs.map((k) => [k.id, k.val]));
}

function rms(arr, start = 0, end = arr.length) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += arr[i] * arr[i];
  return Math.sqrt(sum / Math.max(1, end - start));
}

function measureKWeightedLufs(buf) {
  // ITU-R BS.1770-4 K-weighting biquad cascade at 48 kHz
  const b1_0 = 1.53512485958697;
  const b1_1 = -2.69169618940638;
  const b1_2 = 1.19839281085285;
  const a1_1 = -1.69065929318241;
  const a1_2 = 0.73248077421585;
  const b2_0 = 1.0;
  const b2_1 = -2.0;
  const b2_2 = 1.0;
  const a2_1 = -1.99004745483398;
  const a2_2 = 0.99007225036621;

  let x1_1 = 0;
  let x1_2 = 0;
  let y1_1 = 0;
  let y1_2 = 0;
  let x2_1 = 0;
  let x2_2 = 0;
  let y2_1 = 0;
  let y2_2 = 0;
  let sumK = 0;

  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y1 = b1_0 * x + b1_1 * x1_1 + b1_2 * x1_2 - a1_1 * y1_1 - a1_2 * y1_2;
    x1_2 = x1_1;
    x1_1 = x;
    y1_2 = y1_1;
    y1_1 = y1;
    const y2 = b2_0 * y1 + b2_1 * x2_1 + b2_2 * x2_2 - a2_1 * y2_1 - a2_2 * y2_2;
    x2_2 = x2_1;
    x2_1 = y1;
    y2_2 = y2_1;
    y2_1 = y2;
    sumK += y2 * y2;
  }

  return -0.691 + 10 * Math.log10(Math.max(1e-12, sumK / Math.max(1, buf.length)));
}

function countRisingZeroCrossings(arr, start, end) {
  let crossings = 0;
  for (let i = start + 1; i < end; i++) {
    if (arr[i - 1] <= 0 && arr[i] > 0) crossings++;
  }
  return crossings;
}

test('all 7 stage DSP processors produce finite bounded audio and non-empty telemetry at 48 kHz', () => {
  const fs = 48000;
  const riffs = createPassiveBassRiffs(fs);
  const input = riffs.groove;

  for (const stage of ORDERED_STAGES) {
    const knobs = defaultKnobs(stage);
    assert.equal(
      stage.audioSpec.knobs.some((k) => k.id === 'volume'),
      true,
      `Stage ${stage.slug} missing standardized volume knob`
    );
    const state = {
      presetId: stage.defaultPresetId,
      modeId: stage.defaultModeId,
      knobs
    };
    const dsp = stage.audioSpec.createDSP(fs, () => state);
    let peak = 0;
    for (let i = 0; i < 24000; i++) {
      const y = dsp.processSample(input[i]);
      assert.equal(Number.isFinite(y), true, `Stage ${stage.slug} NaN/Inf at sample ${i}`);
      peak = Math.max(peak, Math.abs(y));
    }
    assert.equal(
      peak >= 0.05 && peak <= 0.99,
      true,
      `Stage ${stage.slug} peak=${peak} out of [0.05, 0.99]`
    );
    const tel = dsp.getTelemetry();
    assert.equal(typeof tel === 'string' && tel.length > 0, true);
    assert.equal(/^[\x20-\x7E]+$/.test(tel), true, `Stage ${stage.slug} non-ASCII telemetry: ${tel}`);
  }
});

test('Stage 2 PINCH gate silences decaying tail below 0.001 RMS at high pinch setting', () => {
  const fs = 48000;
  const stage2 = STAGES_BY_SLUG['2'];
  const state = {
    presetId: stage2.defaultPresetId,
    modeId: stage2.defaultModeId,
    knobs: { ...defaultKnobs(stage2), pinch: 0.92, volume: 0.7 }
  };
  const dsp = stage2.audioSpec.createDSP(fs, () => state);
  const out = new Float32Array(fs);
  for (let i = 0; i < fs; i++) {
    const env = i < 8000 ? 0.5 : 0.0004;
    const x = Math.sin((2 * Math.PI * 41.2 * i) / fs) * env;
    out[i] = dsp.processSample(x);
  }
  const tailRms = rms(out, 36000, 48000);
  assert.equal(tailRms < 0.001, true, `expected gated tail < 0.001 RMS, got ${tailRms}`);
});

test('Stage 3 phase_trap cancels low E1 fundamental by > 10 dB relative to full_blend at 50% blend', () => {
  const fs = 48000;
  const stage3 = STAGES_BY_SLUG['3'];
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

test('Stage 5B optical compressor reduces slap riff crest factor under high compression', () => {
  const fs = 48000;
  const riffs = createPassiveBassRiffs(fs);
  const slap = riffs.slap.subarray(0, 48000);
  const stage5b = STAGES_BY_SLUG['5b'];

  const runComp = (compVal) => {
    const state = {
      presetId: stage5b.defaultPresetId,
      modeId: stage5b.defaultModeId,
      knobs: { ...defaultKnobs(stage5b), comp: compVal, volume: 0.75 }
    };
    const dsp = stage5b.audioSpec.createDSP(fs, () => state);
    let pk = 0;
    const out = new Float32Array(slap.length);
    for (let i = 0; i < slap.length; i++) {
      out[i] = dsp.processSample(slap[i]);
      if (i > 2000) pk = Math.max(pk, Math.abs(out[i]));
    }
    return pk / Math.max(1e-6, rms(out, 2000, out.length));
  };

  const lightCrest = runComp(0.05);
  const heavyCrest = runComp(0.95);
  assert.equal(heavyCrest < lightCrest, true, `expected compressed crest ${heavyCrest} < ${lightCrest}`);
});

test('Stage 6 CD4013 divider halves frequency for -1 octave and quarters frequency for -2 octave', () => {
  const fs = 48000;
  const stage6 = STAGES_BY_SLUG['6'];
  const f0 = 82.41;

  const measureCrossings = (presetId) => {
    const state = {
      presetId,
      modeId: stage6.defaultModeId,
      knobs: { ...defaultKnobs(stage6), mix: 0.0, volume: 0.85 }
    };
    const dsp = stage6.audioSpec.createDSP(fs, () => state);
    const out = new Float32Array(fs);
    for (let i = 0; i < fs; i++) {
      out[i] = dsp.processSample(0.45 * Math.sin((2 * Math.PI * f0 * i) / fs));
    }
    return countRisingZeroCrossings(out, 12000, 48000);
  };

  const expectedInputCrossings = f0 * 0.75; // ~61.8 crossings in 0.75s
  const oct1Crossings = measureCrossings('oct1_warm');
  const oct2Crossings = measureCrossings('oct2_deep');

  assert.equal(
    Math.abs(oct1Crossings - expectedInputCrossings / 2) <= 3,
    true,
    `oct1 crossings=${oct1Crossings}`
  );
  assert.equal(
    Math.abs(oct2Crossings - expectedInputCrossings / 4) <= 3,
    true,
    `oct2 crossings=${oct2Crossings}`
  );
});

test('all 7 stages match dry true-bypass loudness within 1.2 LU at defaults and keep dry/wet blend pots balanced', () => {
  const fs = 48000;
  const riffs = createPassiveBassRiffs(fs);

  const runStagePost = (stage, src, knobOverrides = {}) => {
    const knobs = { ...defaultKnobs(stage), ...knobOverrides };
    const state = {
      presetId: stage.defaultPresetId,
      modeId: stage.defaultModeId,
      knobs
    };
    const dsp = stage.audioSpec.createDSP(fs, () => state);
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) {
      out[i] = applyStudioAmpGain(dsp.processSample(src[i]));
    }
    return out;
  };

  for (const stage of ORDERED_STAGES) {
    const riffId = stage.audioSpec.defaultRiffId || 'groove';
    const src = riffs[riffId];
    const dryPost = Float32Array.from(src, applyStudioAmpGain);
    const dryLufs = measureKWeightedLufs(dryPost);

    const wetDefault = runStagePost(stage, src);
    const wetLufs = measureKWeightedLufs(wetDefault);
    const deltaLu = wetLufs - dryLufs;

    assert.equal(
      Math.abs(deltaLu) <= 1.2,
      true,
      `Stage ${stage.slug} (${riffId}) default wet loudness ${wetLufs.toFixed(2)} LUFS differs from dry bypass ${dryLufs.toFixed(2)} LUFS by ${deltaLu.toFixed(2)} LU`
    );

    const wetFullVol = runStagePost(stage, src, { volume: 1.0 });
    const fullVolLufs = measureKWeightedLufs(wetFullVol);
    assert.equal(
      fullVolLufs - wetLufs >= 2.0,
      true,
      `Stage ${stage.slug} expected >= +2.0 LU boost headroom at 100% volume, got ${(fullVolLufs - wetLufs).toFixed(2)} LU`
    );
  }

  for (const [slug, riffId, dryKnob, wetKnob] of [
    ['3', 'groove', { blend: 0.0 }, { blend: 1.0 }],
    ['5a', 'slap', { mix: 0.0 }, { mix: 1.0 }],
    ['6', 'upperSynth', { mix: 1.0 }, { mix: 0.0 }]
  ]) {
    const stage = STAGES_BY_SLUG[slug];
    const src = riffs[riffId];
    const cleanEndLufs = measureKWeightedLufs(runStagePost(stage, src, dryKnob));
    const wetEndLufs = measureKWeightedLufs(runStagePost(stage, src, wetKnob));
    const gapLu = Math.abs(wetEndLufs - cleanEndLufs);
    assert.equal(
      gapLu <= 1.8,
      true,
      `Stage ${slug} dry vs wet blend endpoints differ by ${gapLu.toFixed(2)} LU (expected <= 1.8 LU)`
    );
  }
});
