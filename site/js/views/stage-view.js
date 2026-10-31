import {
  ORDERED_STAGES,
  getStageParts,
  getDiffAgainstPrevious
} from '../data/stages/index.js';
import { getPartPins, traceConnectedNet } from '../breadboard-diff.js';
import {
  renderBreadboardSvg,
  bindBreadboardInteractions
} from '../breadboard-svg.js';
import { formatKnobValue } from '../audio-studio.js';
import { RIFF_CATALOG } from '../riffs.js';
import { formatStageHash } from '../router.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function findNearestTarget(target, root, attrName) {
  if (!target || typeof target !== 'object') return null;
  if (typeof target.closest === 'function') {
    const found = target.closest(`[${attrName}]`);
    if (found && (!root?.contains || root.contains(found) || found === root)) {
      return found;
    }
  }
  let cur = target;
  while (cur && cur !== root) {
    if (typeof cur.getAttribute === 'function' && cur.getAttribute(attrName) !== null) {
      return cur;
    }
    cur = cur.parentElement || cur.parentNode || null;
  }
  return null;
}

export function buildTransitionChecklistMarkup(transition) {
  if (!transition || !transition.diff) {
    return `<div class="transition-content">
      <h3>Transition checklist</h3>
      <p class="section-subtext">Stage 1 is the initial baseline layout.</p>
    </div>`;
  }

  const { previousStage, diff } = transition;
  const removed = Array.isArray(diff.removed) ? diff.removed : [];
  const modified = Array.isArray(diff.modified) ? diff.modified : [];
  const added = Array.isArray(diff.added) ? diff.added : [];
  const unchanged = Array.isArray(diff.unchanged) ? diff.unchanged : [];
  const prevLabel = previousStage?.stageNumber || 'previous stage';

  const removedHtml =
    removed.length > 0
      ? `<ul class="transition-list">${removed
          .map((part) => {
            const pins = getPartPins(part).join(', ');
            return `<li><strong class="mono">${escapeHtml(part.id)}</strong> (${escapeHtml(part.value || part.name)}) from <span class="mono">${escapeHtml(pins)}</span></li>`;
          })
          .join('')}</ul>`
      : `<p class="section-subtext" style="font-size: 12px;">No parts need to be removed for this step.</p>`;

  const modifiedHtml =
    modified.length > 0
      ? `<ul class="transition-list">${modified
          .map((entry) => {
            const fromPins = (entry.fromPins || []).join(', ');
            const toPins = (entry.toPins || []).join(', ');
            const valueChanged =
              String(entry.fromValue || '').trim() !== String(entry.toValue || '').trim();
            const valDetail = valueChanged
              ? ` | swap ${escapeHtml(entry.fromValue)} -> ${escapeHtml(entry.toValue)}`
              : ` (${escapeHtml(entry.toValue)})`;
            return `<li><button type="button" class="transition-part-btn" data-action="inspect-part" data-part-id="${escapeHtml(entry.id)}">${escapeHtml(entry.id)}</button>${valDetail}: <span class="mono">${escapeHtml(fromPins)} -> ${escapeHtml(toPins)}</span></li>`;
          })
          .join('')}</ul>`
      : `<p class="section-subtext" style="font-size: 12px;">No existing part IDs change value or hole coordinates.</p>`;

  const addedHtml =
    added.length > 0
      ? `<ul class="transition-list">${added
          .map((part) => {
            const pins = getPartPins(part).join(', ');
            return `<li><button type="button" class="transition-part-btn" data-action="inspect-part" data-part-id="${escapeHtml(part.id)}">${escapeHtml(part.id)}</button> (${escapeHtml(part.value || part.name)}) at <span class="mono">${escapeHtml(pins)}</span></li>`;
          })
          .join('')}</ul>`
      : `<p class="section-subtext" style="font-size: 12px;">No additional parts inserted in this step.</p>`;

  return `<div class="transition-content">
    <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px;">
      <h3 style="margin: 0;">Transition from ${escapeHtml(prevLabel)}</h3>
      <span class="badge badge-cyan">${unchanged.length} unchanged kept</span>
    </div>
    <p class="section-subtext" style="font-size: 12px; margin-top: 4px;">Follow these three steps in order so no two leads collide in the same hole.</p>
    <div class="transition-steps">
      <div class="transition-step step-removed">
        <h4>Step 1: Pull removed parts (${removed.length})</h4>
        ${removedHtml}
      </div>
      <div class="transition-step step-modified">
        <h4>Step 2: Relocate or swap modified parts (${modified.length})</h4>
        ${modifiedHtml}
      </div>
      <div class="transition-step step-added">
        <h4>Step 3: Insert added parts (${added.length})</h4>
        ${addedHtml}
      </div>
    </div>
  </div>`;
}

function buildInspectorMarkup({ parts, selectedPartId, hoveredNet, hoverMeta, stageSlug, store }) {
  const inspectedId = hoverMeta?.partId || selectedPartId || null;
  const part = inspectedId ? parts.find((p) => p.id === inspectedId) : null;

  if (part) {
    const pins = getPartPins(part);
    const net = hoveredNet && hoverMeta?.partId === part.id
      ? hoveredNet
      : traceConnectedNet(parts, part.id);
    const strips = [...(net.strips || [])];
    const peers = [...(net.partIds || [])].filter((id) => id !== part.id);
    const isChecked = store.isPartChecked(stageSlug, part.id);
    const isPinned = selectedPartId === part.id;

    return `<div>
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px;">
        <h3 style="margin: 0;">Pin-and-role inspector</h3>
        <div style="display: inline-flex; gap: 6px;">
          <span class="badge ${isPinned ? 'badge-cyan' : ''}">${isPinned ? 'Pinned' : 'Hover'}</span>
          ${isPinned ? '<button type="button" class="btn btn-ghost btn-sm" data-action="clear-selection">Clear</button>' : ''}
        </div>
      </div>

      <dl class="inspector-kv">
        <dt>Part ID</dt>
        <dd class="mono"><strong>${escapeHtml(part.id)}</strong> (${escapeHtml(part.name || part.type)})</dd>
        <dt>Value</dt>
        <dd class="mono">${escapeHtml(part.value || '')}</dd>
        <dt>Pins</dt>
        <dd>
          <div class="pin-chip-list">
            ${pins.map((pin) => `<span class="pin-chip">${escapeHtml(pin)}</span>`).join('')}
          </div>
        </dd>
        <dt>Signal net</dt>
        <dd>${escapeHtml(part.net || 'Stage net')}</dd>
        <dt>Tie-strips</dt>
        <dd class="mono" style="font-size: 12px;">${escapeHtml(strips.join(', ') || 'None')}</dd>
        <dt>Connected</dt>
        <dd class="mono" style="font-size: 12px;">${escapeHtml(peers.join(', ') || 'Isolated node')}</dd>
      </dl>

      <p class="inspector-notes">${escapeHtml(part.role || part.notes || '')}</p>

      <div style="margin-top: 12px;">
        <label class="checkbox-label">
          <input type="checkbox" data-action="toggle-part-check" data-part-id="${escapeHtml(part.id)}"${isChecked ? ' checked' : ''}>
          <span>${isChecked ? 'Wired on breadboard' : 'Mark part wired'}</span>
        </label>
      </div>
    </div>`;
  }

  if (hoverMeta?.pin) {
    const net = hoveredNet || traceConnectedNet(parts, hoverMeta.pin);
    const strips = [...(net.strips || [])];
    const connectedParts = [...(net.partIds || [])];
    return `<div>
      <h3>Pin-and-role inspector</h3>
      <dl class="inspector-kv">
        <dt>Hole / socket</dt>
        <dd class="mono"><strong>${escapeHtml(hoverMeta.pin)}</strong></dd>
        <dt>Tie-strip</dt>
        <dd class="mono">${escapeHtml(hoverMeta.strip || 'Header')}</dd>
        <dt>Bridged strips</dt>
        <dd class="mono" style="font-size: 12px;">${escapeHtml(strips.join(', ') || 'Unconnected strip')}</dd>
        <dt>Parts on net</dt>
        <dd class="mono" style="font-size: 12px;">${escapeHtml(connectedParts.join(', ') || 'Empty tie-strip')}</dd>
      </dl>
      <p class="inspector-notes">Click any component body or wiring row to lock it in the inspector while placing jumpers.</p>
    </div>`;
  }

  const quickParts = parts.slice(0, 5);
  return `<div>
    <h3>Pin-and-role inspector</h3>
    <p class="section-subtext" style="font-size: 13px;">Hover or click any component or hole from <span class="mono">A1</span> to <span class="mono">J30</span> on the breadboard to highlight its 5-hole tie-strips and inspect orientation details.</p>
    <div style="margin-top: 12px;">
      <span class="variant-label" style="display: block; margin-bottom: 6px;">Quick inspect:</span>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${quickParts
          .map(
            (p) =>
              `<button type="button" class="btn btn-ghost btn-sm mono" data-action="inspect-part" data-part-id="${escapeHtml(p.id)}">${escapeHtml(p.id)}</button>`
          )
          .join('')}
      </div>
    </div>
  </div>`;
}

export function mountStageView(container, { stage, store, audioStudio, router } = {}) {
  if (!container || !stage || !store || !audioStudio) {
    return () => {};
  }

  let activePresetId = stage.defaultPresetId;
  let activeModeId = stage.defaultModeId;
  let diffEnabled = false;
  let selectedPartId = null;
  let hoveredNet = null;
  let hoverMeta = null;
  let currentParts = [];
  let currentTransition = null;
  let breadboardCleanup = null;

  const initialStoreState = store.getState();
  let lastTheme = initialStoreState.theme;

  audioStudio.attachStage(stage, {
    presetId: activePresetId,
    modeId: activeModeId,
    preferredRiffId: initialStoreState.preferredRiffId
  });

  function recomputeCircuitData() {
    currentParts = getStageParts(stage.slug, activePresetId, activeModeId);
    currentTransition = stage.previousStageSlug
      ? getDiffAgainstPrevious(stage.slug, activePresetId, activeModeId)
      : null;
    if (selectedPartId && !currentParts.some((p) => p.id === selectedPartId)) {
      selectedPartId = null;
    }
  }

  recomputeCircuitData();

  const knobs = Array.isArray(stage.audioSpec?.knobs) ? stage.audioSpec.knobs : [];
  const initialAudio = audioStudio.getState();

  const riffButtonsHtml = RIFF_CATALOG.map((riff) => {
    const active = initialAudio.riffId === riff.id;
    return `<button type="button" class="btn btn-toggle btn-sm${active ? ' is-active' : ''}" data-action="studio-riff" data-riff-id="${escapeHtml(riff.id)}" aria-pressed="${active}" title="${escapeHtml(riff.description)}">${escapeHtml(riff.shortLabel)}</button>`;
  }).join('');

  const knobsHtml = knobs
    .map((knob) => {
      const val = initialAudio.knobs?.[knob.id] ?? knob.val;
      const inputId = `knob-${stage.slug}-${knob.id}`;
      return `<div class="knob-card">
        <div class="knob-label-row">
          <label for="${escapeHtml(inputId)}"><strong>${escapeHtml(knob.label)}</strong></label>
          <output class="knob-readout" data-knob-readout="${escapeHtml(knob.id)}">${escapeHtml(formatKnobValue(knob, val))}</output>
        </div>
        <input
          id="${escapeHtml(inputId)}"
          class="knob-slider"
          type="range"
          data-action="studio-knob"
          data-knob-id="${escapeHtml(knob.id)}"
          min="${escapeHtml(knob.min)}"
          max="${escapeHtml(knob.max)}"
          step="${escapeHtml(knob.step)}"
          value="${escapeHtml(val)}"
        >
      </div>`;
    })
    .join('');

  const theoryCardsHtml = (stage.theoryNotes || [])
    .map(
      (note) => `<article class="theory-card">
        <h3>${escapeHtml(note.title)}</h3>
        <p>${escapeHtml(note.body)}</p>
      </article>`
    )
    .join('');

  container.innerHTML = `<div class="view-stack" data-view="stage" data-stage-slug="${escapeHtml(stage.slug)}">
    <section class="panel" data-region="stage-header"></section>
    <section class="panel variant-panel" data-region="variant-controls"></section>

    <div class="workbench-grid">
      <section class="panel breadboard-card" aria-label="400-point breadboard layout">
        <div class="breadboard-toolbar" data-region="breadboard-toolbar"></div>
        <div class="breadboard-frame" data-region="breadboard-canvas"></div>
      </section>

      <aside class="side-stack">
        <section class="panel inspector-card" data-region="inspector-panel" aria-live="polite"></section>
        <section class="panel transition-card" data-region="transition-panel" hidden></section>
      </aside>
    </div>

    <section class="panel studio-panel" data-region="audio-studio" aria-labelledby="studio-heading">
      <div class="studio-header">
        <div>
          <h2 id="studio-heading" class="section-heading">Web Audio circuit audition studio</h2>
        </div>
        <span class="telemetry-badge" data-role="studio-telemetry">${escapeHtml(initialAudio.telemetry)}</span>
      </div>
      <p class="studio-hint">${escapeHtml(stage.audioSpec?.hint || '')}</p>

      <div class="studio-grid">
        <div class="studio-controls">
          <div class="studio-transport">
            <button type="button" class="btn btn-primary" data-action="studio-toggle-play" aria-pressed="false">Play Riff Loop</button>
            <button type="button" class="btn btn-cyan" data-action="studio-pluck">Pluck Low E1 (41.2 Hz)</button>
            <button type="button" class="btn btn-toggle" data-action="studio-bypass" aria-pressed="false">True Bypass A/B</button>
          </div>

          <div>
            <span class="variant-label" style="display: block; margin-bottom: 6px;">Synthesized passive-bass riffs:</span>
            <div class="riff-buttons">
              ${riffButtonsHtml}
            </div>
          </div>

          <div class="knob-grid" data-region="studio-knobs">
            ${knobsHtml}
          </div>
        </div>

        <div class="scope-wrap">
          <canvas class="scope-canvas" data-role="scope-canvas" width="560" height="150" aria-label="Dual-trace dry input and stage output oscilloscope"></canvas>
          <div class="scope-caption">
            <span>Dashed green: Dry P-Bass</span>
            <span>Solid amber/cyan: Stage output</span>
          </div>
        </div>
      </div>
    </section>

    <section class="panel wiring-panel" data-region="wiring-checklist" aria-label="Component wiring checklist"></section>

    <section class="panel" data-region="theory-notes" aria-labelledby="theory-heading">
      <h2 id="theory-heading" class="section-heading">Circuit design notes</h2>
      <p class="section-subtext">How this breadboard layout behaves electrically with passive bass pickups and 9V pedal supplies.</p>
      <div class="theory-grid">
        ${theoryCardsHtml}
      </div>
    </section>
  </div>`;

  const stageHeaderEl = container.querySelector('[data-region="stage-header"]');
  const variantControlsEl = container.querySelector('[data-region="variant-controls"]');
  const breadboardToolbarEl = container.querySelector('[data-region="breadboard-toolbar"]');
  const breadboardCanvasEl = container.querySelector('[data-region="breadboard-canvas"]');
  const inspectorPanelEl = container.querySelector('[data-region="inspector-panel"]');
  const transitionPanelEl = container.querySelector('[data-region="transition-panel"]');
  const wiringChecklistEl = container.querySelector('[data-region="wiring-checklist"]');
  const scopeCanvasEl = container.querySelector('canvas[data-role="scope-canvas"]');

  audioStudio.bindScopeCanvas(scopeCanvasEl);

  function renderStageHeader() {
    const isComplete = store.isStageCompleted(stage.slug);
    const stageIdx = ORDERED_STAGES.findIndex((s) => s.slug === stage.slug);
    const prevStage = stageIdx > 0 ? ORDERED_STAGES[stageIdx - 1] : null;
    const nextStage =
      stageIdx >= 0 && stageIdx < ORDERED_STAGES.length - 1 ? ORDERED_STAGES[stageIdx + 1] : null;
    const activePreset = stage.presets[activePresetId] || stage.presets[stage.defaultPresetId];
    const phaseLabel =
      activePreset?.phaseLabel ||
      (stage.phaseDegrees === 180 ? '180 deg phase inverted' : '0 deg non-inverting');
    const phaseClass = stage.phaseDegrees === 180 ? 'badge-amber' : 'badge-cyan';

    stageHeaderEl.innerHTML = `<div class="stage-header-top">
      <div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
          <span class="badge badge-amber">${escapeHtml(stage.stageNumber)}</span>
          <span class="badge ${phaseClass}">${escapeHtml(phaseLabel)}</span>
          ${isComplete ? '<span class="badge badge-green">Completed</span>' : ''}
        </div>
        <h1 class="stage-title">${escapeHtml(stage.title)}</h1>
        ${stage.subtitle ? `<p class="stage-subtitle">${escapeHtml(stage.subtitle)}</p>` : ''}
        <p class="stage-summary">${escapeHtml(stage.summary)}</p>
      </div>
      <div class="stage-actions-col">
        ${prevStage ? `<a class="btn btn-ghost btn-sm" href="${escapeHtml(formatStageHash(prevStage.slug))}" data-nav-hash="${escapeHtml(formatStageHash(prevStage.slug))}">Prev: ${escapeHtml(prevStage.stageNumber)}</a>` : ''}
        <button type="button" class="btn ${isComplete ? 'btn-green' : 'btn-primary'} btn-sm" data-action="toggle-stage-complete" aria-pressed="${isComplete}">${isComplete ? 'Stage completed' : 'Mark stage complete'}</button>
        ${nextStage ? `<a class="btn btn-ghost btn-sm" href="${escapeHtml(formatStageHash(nextStage.slug))}" data-nav-hash="${escapeHtml(formatStageHash(nextStage.slug))}">Next: ${escapeHtml(nextStage.stageNumber)}</a>` : ''}
      </div>
    </div>`;
  }

  function renderVariantControls() {
    const presets = Object.values(stage.presets || {});
    const modes = Object.values(stage.modes || {});
    const activePreset = stage.presets[activePresetId] || presets[0];

    const presetBtnsHtml = presets
      .map((preset) => {
        const isAct = preset.id === activePresetId;
        return `<button type="button" class="variant-btn${isAct ? ' is-active' : ''}" data-action="select-preset" data-preset-id="${escapeHtml(preset.id)}" aria-pressed="${isAct}">
          <span>${escapeHtml(preset.label)}</span>
          ${preset.badge ? `<span class="badge">${escapeHtml(preset.badge)}</span>` : ''}
        </button>`;
      })
      .join('');

    const modeGroupHtml =
      modes.length > 1
        ? `<div class="variant-group">
            <span class="variant-label">Mode:</span>
            ${modes
              .map((mode) => {
                const isAct = mode.id === activeModeId;
                return `<button type="button" class="variant-btn${isAct ? ' is-active' : ''}" data-action="select-mode" data-mode-id="${escapeHtml(mode.id)}" aria-pressed="${isAct}" title="${escapeHtml(mode.desc || mode.summary || '')}">${escapeHtml(mode.label)}</button>`;
              })
              .join('')}
          </div>`
        : '';

    const diffControlHtml = stage.previousStageSlug
      ? `<div class="diff-control-box">
          <button type="button" class="btn btn-toggle btn-sm${diffEnabled ? ' is-active' : ''}" data-action="toggle-diff" aria-pressed="${diffEnabled}">Diff from previous stage</button>
          ${
            currentTransition
              ? `<span class="diff-baseline-note">vs ${escapeHtml(currentTransition.previousStage.stageNumber)}: -${currentTransition.diff.removed.length} / ~${currentTransition.diff.modified.length} / +${currentTransition.diff.added.length}</span>`
              : ''
          }
        </div>`
      : `<div class="diff-control-box">
          <button type="button" class="btn btn-toggle btn-sm" data-action="toggle-diff" disabled aria-disabled="true" aria-pressed="false">Diff from previous stage</button>
          <span class="diff-baseline-note">Stage 1 is the initial baseline layout</span>
        </div>`;

    const voltages = Array.isArray(activePreset?.voltages) ? activePreset.voltages : [];
    const voltagesHtml =
      voltages.length > 0
        ? `<div class="voltage-grid">${voltages
            .map(
              (v) => `<div class="voltage-item">
                <div class="voltage-pin">${escapeHtml(v.pin)}</div>
                <div class="voltage-val">${escapeHtml(v.val)}</div>
                <div style="color: var(--text-secondary);">${escapeHtml(v.net)}</div>
              </div>`
            )
            .join('')}</div>`
        : '';

    const calloutHtml = activePreset?.bannerTitle
      ? `<div class="preset-callout">
          <h3>${escapeHtml(activePreset.bannerTitle)}</h3>
          <p>${escapeHtml(activePreset.bannerText || '')}</p>
          ${voltagesHtml}
          ${activePreset.voltageNote ? `<p class="voltage-note">Meter check: ${escapeHtml(activePreset.voltageNote)}</p>` : ''}
        </div>`
      : '';

    variantControlsEl.innerHTML = `<div class="variant-row">
        <div class="variant-group">
          <span class="variant-label">Preset:</span>
          ${presetBtnsHtml}
        </div>
        ${diffControlHtml}
      </div>
      ${modeGroupHtml}
      ${calloutHtml}`;
  }

  function renderBreadboard({ rebind = false } = {}) {
    const state = store.getState();
    const checkedIds = new Set(state.stagePartChecks?.[stage.slug] || []);
    const activePreset = stage.presets[activePresetId] || stage.presets[stage.defaultPresetId];

    breadboardToolbarEl.innerHTML = `<span><strong class="mono">${currentParts.length}</strong> components on 30-row protoboard (<span class="mono">${checkedIds.size}</span> wired)</span>
      <span>${
        diffEnabled && currentTransition
          ? 'Diff active: emerald = added, amber dashed = relocated/swapped, dimmed = unchanged'
          : 'Click a component to pin it; hover holes A1 to J30 to trace connected 5-hole strips'
      }</span>`;

    breadboardCanvasEl.innerHTML = renderBreadboardSvg({
      preset: activePreset,
      parts: currentParts,
      selectedPartId,
      highlightedNet: hoveredNet,
      diffResult: currentTransition?.diff || null,
      diffEnabled,
      checkedPartIds: checkedIds,
      theme: state.theme
    });

    if (rebind) {
      breadboardCleanup = bindBreadboardInteractions(breadboardCanvasEl, {
        parts: currentParts,
        onSelectPart(partId) {
          selectedPartId = selectedPartId === partId ? null : partId;
          renderBreadboard({ rebind: false });
          renderInspector();
          syncWiringSelectionHighlight();
        },
        onHoverNet(net, meta) {
          if (!net && !hoveredNet && !meta?.pin && !hoverMeta?.pin) {
            return;
          }
          hoveredNet = net;
          hoverMeta = meta;
          renderBreadboard({ rebind: false });
          renderInspector();
        }
      });
    }
  }

  function renderInspector() {
    inspectorPanelEl.innerHTML = buildInspectorMarkup({
      parts: currentParts,
      selectedPartId,
      hoveredNet,
      hoverMeta,
      stageSlug: stage.slug,
      store
    });
  }

  function renderTransition() {
    const show = Boolean(diffEnabled && currentTransition);
    transitionPanelEl.hidden = !show;
    if (show) {
      transitionPanelEl.innerHTML = buildTransitionChecklistMarkup(currentTransition);
    } else {
      transitionPanelEl.innerHTML = '';
    }
  }

  function renderWiringChecklist() {
    const state = store.getState();
    const checkedSet = new Set(state.stagePartChecks?.[stage.slug] || []);
    const checkedCount = currentParts.filter((p) => checkedSet.has(p.id)).length;

    const itemsHtml = currentParts
      .map((part) => {
        const isChecked = checkedSet.has(part.id);
        const isSelected = selectedPartId === part.id;
        const pins = getPartPins(part).join(' -> ');
        return `<div class="wiring-item${isChecked ? ' is-checked' : ''}${isSelected ? ' is-selected' : ''}" data-wiring-row="${escapeHtml(part.id)}">
          <input type="checkbox" data-action="toggle-part-check" data-part-id="${escapeHtml(part.id)}" aria-label="Mark ${escapeHtml(part.id)} wired"${isChecked ? ' checked' : ''}>
          <div class="wiring-item-body">
            <div class="wiring-item-top">
              <button type="button" class="transition-part-btn" data-action="inspect-part" data-part-id="${escapeHtml(part.id)}">${escapeHtml(part.id)} - ${escapeHtml(part.name || part.type)}</button>
              <span class="badge">${escapeHtml(part.value || '')}</span>
            </div>
            <div class="wiring-item-pins">${escapeHtml(pins)}</div>
            <div class="wiring-item-role">${escapeHtml(part.role || part.notes || '')}</div>
          </div>
        </div>`;
      })
      .join('');

    wiringChecklistEl.innerHTML = `<div class="wiring-header">
      <div>
        <h2 class="section-heading">Component wiring checklist</h2>
        <p class="section-subtext">${checkedCount} of ${currentParts.length} components checked off for ${escapeHtml(stage.stageNumber)}.</p>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" data-action="reset-stage-checks"${checkedCount === 0 ? ' disabled' : ''}>Reset stage checks</button>
    </div>
    <div class="wiring-grid">
      ${itemsHtml}
    </div>`;
  }

  function syncWiringSelectionHighlight() {
    for (const row of wiringChecklistEl.querySelectorAll('[data-wiring-row]')) {
      const id = row.getAttribute('data-wiring-row');
      row.classList.toggle('is-selected', id === selectedPartId);
    }
  }

  function syncStudioControls() {
    const st = audioStudio.getState();

    const playBtn = container.querySelector('[data-action="studio-toggle-play"]');
    if (playBtn) {
      const looping = Boolean(st.playing && !st.oneShotMode);
      playBtn.textContent = looping ? 'Stop' : 'Play Riff Loop';
      playBtn.setAttribute('aria-pressed', String(looping));
      playBtn.classList.toggle('btn-danger', looping);
      playBtn.classList.toggle('btn-primary', !looping);
    }

    const bypassBtn = container.querySelector('[data-action="studio-bypass"]');
    if (bypassBtn) {
      bypassBtn.setAttribute('aria-pressed', String(Boolean(st.bypass)));
      bypassBtn.classList.toggle('is-active', Boolean(st.bypass));
      bypassBtn.textContent = st.bypass ? 'True Bypass A/B (Dry)' : 'True Bypass A/B';
    }

    for (const riffBtn of container.querySelectorAll('[data-action="studio-riff"]')) {
      const id = riffBtn.getAttribute('data-riff-id');
      const active = id === st.riffId;
      riffBtn.setAttribute('aria-pressed', String(active));
      riffBtn.classList.toggle('is-active', active);
    }

    for (const knob of knobs) {
      const val = st.knobs?.[knob.id] ?? knob.val;
      const readout = container.querySelector(`[data-knob-readout="${knob.id}"]`);
      if (readout) {
        readout.textContent = formatKnobValue(knob, val);
      }
    }

    const telemetryEl = container.querySelector('[data-role="studio-telemetry"]');
    if (telemetryEl) {
      telemetryEl.textContent = st.telemetry;
    }
  }

  function onClick(ev) {
    const actionEl = findNearestTarget(ev?.target, container, 'data-action');
    if (actionEl) {
      const action = actionEl.getAttribute('data-action');

      if (action === 'toggle-stage-complete') {
        store.toggleStageCompleted(stage.slug);
        return;
      }

      if (action === 'select-preset') {
        const nextPreset = actionEl.getAttribute('data-preset-id');
        if (nextPreset && stage.presets[nextPreset] && nextPreset !== activePresetId) {
          activePresetId = nextPreset;
          hoveredNet = null;
          hoverMeta = null;
          recomputeCircuitData();
          audioStudio.updateVariant({ presetId: activePresetId, modeId: activeModeId });
          renderStageHeader();
          renderVariantControls();
          renderBreadboard({ rebind: true });
          renderInspector();
          renderTransition();
          renderWiringChecklist();
          syncStudioControls();
        }
        return;
      }

      if (action === 'select-mode') {
        const nextMode = actionEl.getAttribute('data-mode-id');
        if (nextMode && stage.modes[nextMode] && nextMode !== activeModeId) {
          activeModeId = nextMode;
          hoveredNet = null;
          hoverMeta = null;
          recomputeCircuitData();
          audioStudio.updateVariant({ presetId: activePresetId, modeId: activeModeId });
          renderVariantControls();
          renderBreadboard({ rebind: true });
          renderInspector();
          renderTransition();
          renderWiringChecklist();
          syncStudioControls();
        }
        return;
      }

      if (action === 'toggle-diff') {
        if (!stage.previousStageSlug) return;
        diffEnabled = !diffEnabled;
        renderVariantControls();
        renderBreadboard({ rebind: false });
        renderTransition();
        return;
      }

      if (action === 'inspect-part') {
        const partId = actionEl.getAttribute('data-part-id');
        if (partId) {
          selectedPartId = selectedPartId === partId ? null : partId;
          renderBreadboard({ rebind: false });
          renderInspector();
          syncWiringSelectionHighlight();
        }
        return;
      }

      if (action === 'clear-selection') {
        selectedPartId = null;
        renderBreadboard({ rebind: false });
        renderInspector();
        syncWiringSelectionHighlight();
        return;
      }

      if (action === 'reset-stage-checks') {
        store.resetStageChecks(stage.slug);
        return;
      }

      if (action === 'studio-toggle-play') {
        audioStudio.togglePlay();
        syncStudioControls();
        return;
      }

      if (action === 'studio-pluck') {
        audioStudio.triggerPluck();
        syncStudioControls();
        return;
      }

      if (action === 'studio-bypass') {
        audioStudio.toggleBypass();
        syncStudioControls();
        return;
      }

      if (action === 'studio-riff') {
        const nextRiffId = actionEl.getAttribute('data-riff-id');
        if (nextRiffId) {
          store.setPreferredRiffId(nextRiffId);
          audioStudio.setRiff(nextRiffId);
          syncStudioControls();
        }
        return;
      }
    }

    const navEl = findNearestTarget(ev?.target, container, 'data-nav-hash');
    if (navEl && router && typeof router.navigate === 'function') {
      if (!ev?.metaKey && !ev?.ctrlKey && !ev?.shiftKey && !ev?.altKey) {
        ev?.preventDefault?.();
        router.navigate(navEl.getAttribute('data-nav-hash'));
      }
    }
  }

  function onInput(ev) {
    const knobEl = findNearestTarget(ev?.target, container, 'data-action');
    if (knobEl && knobEl.getAttribute('data-action') === 'studio-knob') {
      const knobId = knobEl.getAttribute('data-knob-id');
      if (knobId) {
        audioStudio.setKnob(knobId, Number(knobEl.value));
        syncStudioControls();
      }
    }
  }

  function onChange(ev) {
    const checkEl = findNearestTarget(ev?.target, container, 'data-action');
    if (!checkEl) return;
    const action = checkEl.getAttribute('data-action');
    if (action === 'toggle-part-check') {
      const partId = checkEl.getAttribute('data-part-id');
      if (partId) {
        store.togglePartChecked(stage.slug, partId);
      }
      return;
    }
    if (action === 'studio-knob') {
      const knobId = checkEl.getAttribute('data-knob-id');
      if (knobId) {
        audioStudio.setKnob(knobId, Number(checkEl.value));
        syncStudioControls();
      }
    }
  }

  renderStageHeader();
  renderVariantControls();
  renderBreadboard({ rebind: true });
  renderInspector();
  renderTransition();
  renderWiringChecklist();
  syncStudioControls();

  container.addEventListener('click', onClick);
  container.addEventListener('input', onInput);
  container.addEventListener('change', onChange);

  const unsubscribeStore = store.subscribe((nextState) => {
    const themeChanged = nextState.theme !== lastTheme;
    lastTheme = nextState.theme;
    renderStageHeader();
    renderBreadboard({ rebind: false });
    renderInspector();
    renderWiringChecklist();
    if (themeChanged) {
      audioStudio.bindScopeCanvas(scopeCanvasEl);
    }
  });

  const cleanup = () => {
    unsubscribeStore();
    if (typeof breadboardCleanup === 'function') {
      breadboardCleanup();
      breadboardCleanup = null;
    }
    if (typeof container.removeEventListener === 'function') {
      container.removeEventListener('click', onClick);
      container.removeEventListener('input', onInput);
      container.removeEventListener('change', onChange);
    }
  };
  cleanup.syncAudio = syncStudioControls;
  return cleanup;
}
