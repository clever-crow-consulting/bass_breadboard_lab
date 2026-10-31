import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDERED_STAGES,
  STAGES_BY_SLUG,
  getStage,
  getStageParts,
  getStageDefaultParts,
  getDiffAgainstPrevious
} from '../site/js/data/stages/index.js';
import {
  validateStageParts,
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
