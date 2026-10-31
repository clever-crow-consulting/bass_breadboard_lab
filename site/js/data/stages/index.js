import { computeBreadboardDiff } from '../../breadboard-diff.js';
import { stageDescriptor as stage1 } from './stage1-bazz-fuss.js';
import { stageDescriptor as stage2 } from './stage2-woolly-mammoth.js';
import { stageDescriptor as stage3 } from './stage3-tl072-clean-blend.js';
import { stageDescriptor as stage4 } from './stage4-svt-cmos-drive.js';
import { stageDescriptor as stage5a } from './stage5a-vactrol-filter.js';
import { stageDescriptor as stage5b } from './stage5b-optical-compressor.js';
import { stageDescriptor as stage6 } from './stage6-cd4013-sub-octave.js';

export const ORDERED_STAGES = [stage1, stage2, stage3, stage4, stage5a, stage5b, stage6];

export const STAGES_BY_SLUG = Object.fromEntries(ORDERED_STAGES.map((s) => [s.slug, s]));

function getOwnProp(obj, key) {
  return obj && typeof key === 'string' && Object.hasOwn(obj, key) ? obj[key] : undefined;
}

export function getStage(slug) {
  if (typeof slug !== 'string' && typeof slug !== 'number') {
    return null;
  }
  const key = String(slug).trim().toLowerCase();
  return getOwnProp(STAGES_BY_SLUG, key) || null;
}

export function getStageParts(slug, presetId, modeId) {
  const stage = getStage(slug);
  if (!stage) return [];
  const preset =
    getOwnProp(stage.presets, presetId) || getOwnProp(stage.presets, stage.defaultPresetId);
  const mode = getOwnProp(stage.modes, modeId) || getOwnProp(stage.modes, stage.defaultModeId);
  return stage.buildComponents(preset, mode);
}

export function getStageDefaultParts(slug) {
  const stage = getStage(slug);
  if (!stage) return [];
  return getStageParts(stage.slug, stage.defaultPresetId, stage.defaultModeId);
}

export function getDiffAgainstPrevious(slug, presetId, modeId) {
  const stage = getStage(slug);
  if (!stage || !stage.previousStageSlug) {
    return null;
  }
  const previousStage = getStage(stage.previousStageSlug);
  if (!previousStage) {
    return null;
  }
  const previousParts = getStageDefaultParts(previousStage.slug);
  const currentParts = getStageParts(stage.slug, presetId, modeId);
  const diff = computeBreadboardDiff(previousParts, currentParts);
  return {
    previousStage,
    diff
  };
}
