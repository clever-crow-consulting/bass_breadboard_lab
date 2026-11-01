import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDERED_STAGES,
  STAGES_BY_SLUG,
  getStage,
  getStageParts,
  getStageDefaultParts,
  getStageWiringSteps,
  getDiffAgainstPrevious
} from '../site/js/data/stages/index.js';
import {
  validateStageParts,
  getPartPins,
  traceConnectedNet,
  computeBreadboardDiff
} from '../site/js/breadboard-diff.js';

const SERIES_AUDIO_COUPLING_CAPS = ['C1', 'C_DRV_IN', 'C_INTER', 'C_TO_EQ', 'C_OUT'];

test('all 7 stages validate cleanly with zero breadboard hole collisions across every preset and mode', () => {
  assert.deepEqual(
    ORDERED_STAGES.map((s) => s.slug),
    ['1', '2', '3', '4', '5a', '5b', '6']
  );
  assert.equal(getStage('unknown'), null);
  assert.equal(getStage('constructor'), null);
  assert.equal(getStage('toString'), null);
  assert.equal(getStage('valueOf'), null);
  assert.deepEqual(getStageParts('unknown'), []);
  assert.deepEqual(getStageParts('constructor', 'toString', 'valueOf'), []);
  assert.deepEqual(getStageDefaultParts('unknown'), []);
  assert.deepEqual(getStageParts('1', 'toString', 'valueOf'), getStageDefaultParts('1'));

  for (const stage of ORDERED_STAGES) {
    assert.equal(getStage(stage.slug), stage);
    assert.equal(STAGES_BY_SLUG[stage.slug], stage);

    const defParts = getStageDefaultParts(stage.slug);
    assert.equal(defParts.length > 0, true);
    const selfDiff = computeBreadboardDiff(defParts, defParts);
    assert.equal(selfDiff.unchanged.length, defParts.length);
    assert.equal(selfDiff.modified.length, 0);
    assert.equal(selfDiff.added.length, 0);
    assert.equal(selfDiff.removed.length, 0);

    for (const preset of Object.values(stage.presets)) {
      assert.equal(Array.isArray(preset.probePoints) && preset.probePoints.length > 0, true, `Stage ${stage.slug} (${preset.id}) missing probePoints`);
      assert.equal(Array.isArray(preset.voltages) && preset.voltages.length > 0, true, `Stage ${stage.slug} (${preset.id}) missing voltages`);
      for (const mode of Object.values(stage.modes)) {
        const parts = getStageParts(stage.slug, preset.id, mode.id);
        const res = validateStageParts(parts);
        assert.equal(
          res.valid,
          true,
          `Stage ${stage.slug} (${preset.id}/${mode.id}): ${res.errors.join(', ')}`
        );
        for (const p of parts) {
          if (p.type === 'transistor' || p.type === 'pot' || p.type === 'dipN') {
            assert.equal(typeof p.tag === 'string' && p.tag.length > 0, true, `Stage ${stage.slug} ${p.id} missing tag`);
          }
          if (p.type === 'ecap') {
            assert.equal(typeof p.plusAt === 'string' && p.plusAt.length > 0, true, `Stage ${stage.slug} ${p.id} missing plusAt`);
          }
        }

        const plusNet = traceConnectedNet(parts, 'TOP_PLUS_2');
        assert.equal(
          plusNet.strips.has('HDR_GND'),
          false,
          `Stage ${stage.slug} (${preset.id}/${mode.id}) shorts TOP_PLUS_2 to HDR_GND`
        );
        assert.equal(
          plusNet.strips.has('TOP_MINUS'),
          false,
          `Stage ${stage.slug} (${preset.id}/${mode.id}) shorts TOP_PLUS_2 to TOP_MINUS`
        );
        assert.equal(
          plusNet.pins.has('TOP_MINUS_1'),
          false,
          `Stage ${stage.slug} (${preset.id}/${mode.id}) shorts TOP_PLUS_2 to TOP_MINUS_1`
        );

        const gndNet = traceConnectedNet(parts, 'HDR_GND');
        assert.equal(
          gndNet.strips.has('TOP_PLUS'),
          false,
          `Stage ${stage.slug} (${preset.id}/${mode.id}) shorts HDR_GND to TOP_PLUS`
        );

        for (const capId of SERIES_AUDIO_COUPLING_CAPS) {
          assert.equal(
            plusNet.partIds.has(capId),
            false,
            `Stage ${stage.slug} (${preset.id}/${mode.id}) shorts series audio cap ${capId} to TOP_PLUS_2`
          );
          assert.equal(
            gndNet.partIds.has(capId),
            false,
            `Stage ${stage.slug} (${preset.id}/${mode.id}) shorts series audio cap ${capId} to HDR_GND`
          );
        }
      }
    }
  }
});

test('stage-to-stage transition diffs preserve shared power and Stage 5A->5B Rows 1-15 backbone', () => {
  assert.equal(getDiffAgainstPrevious('1'), null);

  for (const slug of ['2', '3', '4', '5a', '5b', '6']) {
    const transition = getDiffAgainstPrevious(slug);
    assert.ok(transition, `expected transition for stage ${slug}`);
    assert.equal(transition.previousStage.slug, STAGES_BY_SLUG[slug].previousStageSlug);
    const unchangedIds = new Set(transition.diff.unchanged.map((p) => p.id));
    for (const pwrId of ['J_GND_HDR', 'J_GND_BRIDGE', 'J_9V_HDR', 'R_PWR', 'C_PWR']) {
      assert.equal(unchangedIds.has(pwrId), true, `stage ${slug} must keep ${pwrId} unchanged`);
    }
  }

  const s2Transition = getDiffAgainstPrevious('2');
  assert.equal(s2Transition.diff.removed.some((p) => p.id === 'D1'), true);
  assert.equal(s2Transition.diff.added.some((p) => p.id === 'Q2'), true);

  const s5Transition = getDiffAgainstPrevious('5b');
  const s5Unchanged = new Set(s5Transition.diff.unchanged.map((p) => p.id));
  for (const backboneId of [
    'R_V1',
    'R_V2',
    'C_VREF',
    'J_VREF_LINK',
    'IC1',
    'J_IC_VCC',
    'J_IC_GND',
    'J_IN',
    'R_PD',
    'C1',
    'J_IN_PIN3',
    'R_BIAS'
  ]) {
    assert.equal(s5Unchanged.has(backboneId), true, `Stage 5A->5B must keep ${backboneId} unchanged`);
  }
  const modifiedIds = new Set(s5Transition.diff.modified.map((m) => m.id));
  assert.equal(
    modifiedIds.has('VAC_LDR'),
    true,
    'Stage 5A->5B must relocate VAC_LDR into Op-Amp A feedback'
  );
});

test('all 7 stages provide preset- and mode-aware step-by-step wiring instructions aligned with part.stage', () => {
  assert.deepEqual(getStageWiringSteps('unknown'), []);
  assert.deepEqual(
    getStageWiringSteps('1', 'toString', 'valueOf'),
    getStageWiringSteps('1', 'npn_mpsa13', 'stock')
  );

  for (const stage of ORDERED_STAGES) {
    assert.equal(
      typeof stage.buildWiringSteps,
      'function',
      `Stage ${stage.slug} must define buildWiringSteps(preset, mode)`
    );
    for (const preset of Object.values(stage.presets)) {
      for (const mode of Object.values(stage.modes)) {
        const parts = getStageParts(stage.slug, preset.id, mode.id);
        const steps = getStageWiringSteps(stage.slug, preset.id, mode.id);
        assert.equal(
          Array.isArray(steps) && steps.length >= 4,
          true,
          `Stage ${stage.slug} (${preset.id}/${mode.id}) must return >= 4 wiring steps`
        );

        const stepNums = steps.map((s) => s.step);
        const expectedNums = Array.from({ length: steps.length }, (_, idx) => idx + 1);
        assert.deepEqual(
          stepNums,
          expectedNums,
          `Stage ${stage.slug} (${preset.id}/${mode.id}) wiring steps must be numbered 1..N`
        );

        const partStages = [...new Set(parts.map((p) => p.stage))].sort((a, b) => a - b);
        assert.deepEqual(
          partStages,
          expectedNums,
          `Stage ${stage.slug} (${preset.id}/${mode.id}) part.stage values must match wiring step numbers`
        );

        for (const step of steps) {
          assert.equal(typeof step.title === 'string' && step.title.length > 0, true);
          assert.equal(typeof step.goal === 'string' && step.goal.length > 0, true);
          assert.equal(
            Array.isArray(step.instructions) && step.instructions.length >= 2,
            true,
            `Stage ${stage.slug} Step ${step.step} must provide >= 2 concrete wiring bullets`
          );
          const combined = [step.title, step.goal, step.check || '', ...step.instructions].join(' ');
          assert.doesNotMatch(combined, /[—–]/, `Stage ${stage.slug} Step ${step.step} contains forbidden em/en dash`);

          const stepParts = parts.filter((p) => p.stage === step.step);
          const stepPartIds = new Set(stepParts.map((p) => p.id));
          const stepPins = new Set(stepParts.flatMap((p) => getPartPins(p)));
          const instructionsText = step.instructions.join(' ');
          for (const part of stepParts) {
            assert.equal(
              instructionsText.includes(part.id),
              true,
              `Stage ${stage.slug} (${preset.id}/${mode.id}) Step ${step.step} must explicitly reference part ${part.id}`
            );
          }
          const pinTokenRe = /\b(?:HDR_(?:IN|OUT|9V|GND)|(?:TOP|BOT)_(?:PLUS|MINUS)_\d{1,2}|[A-J](?:[1-9]|[12]\d|30))\b/g;
          for (const match of instructionsText.matchAll(pinTokenRe)) {
            const tok = match[0];
            if (stepPartIds.has(tok)) continue;
            assert.equal(
              stepPins.has(tok),
              true,
              `Stage ${stage.slug} (${preset.id}/${mode.id}) Step ${step.step} mentions coordinate ${tok} not belonging to Step ${step.step} parts`
            );
          }
        }
      }
    }
  }

  const s1NpnSteps = getStageWiringSteps('1', 'npn_mpsa13', 'stock');
  const s1GeClipSteps = getStageWiringSteps('1', 'pnp_ac128', 'hard_clip');
  assert.match(s1NpnSteps[2].instructions.join(' '), /TOP_MINUS_12/);
  assert.match(s1GeClipSteps[2].instructions.join(' '), /R_LEAK/);
  assert.match(s1GeClipSteps[3].instructions.join(' '), /D16/);
  assert.match(s1GeClipSteps[4].instructions.join(' '), /D_CLIP/);

  const s2ActiveTamed = getStageWiringSteps('2', 'npn_active', 'tamed_wool');
  assert.match(s2ActiveTamed[1].instructions.join(' '), /R_PAD/);
  assert.match(s2ActiveTamed[3].instructions.join(' '), /1k ohm/);

  const s3PhaseTrap = getStageWiringSteps('3', 'phase_trap', 'standard');
  assert.match(s3PhaseTrap[2].instructions.join(' '), /J_VREF_PIN5|R_INV_IN/);

  const s4RedLlama = getStageWiringSteps('4', 'red_llama_raw', 'standard');
  assert.match(s4RedLlama[2].instructions.join(' '), /J_UNUSED_5|H14/);

  const s6Oct2 = getStageWiringSteps('6', 'oct2_deep', 'standard');
  const s6RawSq = getStageWiringSteps('6', 'oct1_synth_sq', 'standard');
  assert.match(s6Oct2[2].instructions.join(' '), /J_CLK2/);
  assert.doesNotMatch(s6RawSq[3].instructions.join(' '), /B21.*B23/);
});
