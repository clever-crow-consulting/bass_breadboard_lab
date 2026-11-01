import { STAGE_ROADMAP, PASSIVE_PICKUP_PRIMER } from '../data/curriculum.js';
import { formatStageHash } from '../router.js';
import { createDefaultState } from '../store.js';

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

export function buildHomeMarkup({ state = createDefaultState(), confirmReset = false } = {}) {
  const completedSet = new Set(Array.isArray(state?.completedStages) ? state.completedStages : []);
  const totalStages = STAGE_ROADMAP.length;
  const completedCount = STAGE_ROADMAP.filter((stage) => completedSet.has(stage.slug)).length;
  const pct = Math.round((completedCount / totalStages) * 100);

  const firstIncomplete = STAGE_ROADMAP.find((stage) => !completedSet.has(stage.slug));
  const resumeStage = firstIncomplete || STAGE_ROADMAP[0];
  const resumeHash = formatStageHash(resumeStage.slug);
  const resumeText = firstIncomplete
    ? `Quick Resume: ${resumeStage.stageNumber} (${resumeStage.shortLabel})`
    : `Quick Resume: ${STAGE_ROADMAP[0].stageNumber} (${STAGE_ROADMAP[0].shortLabel})`;

  const resetControlsHtml = confirmReset
    ? `<span class="reset-inline">
        <button type="button" class="btn btn-danger btn-sm" data-action="confirm-reset-progress">Confirm reset progress</button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="cancel-reset-progress">Cancel</button>
      </span>`
    : `<button type="button" class="btn btn-ghost btn-sm" data-action="request-reset-progress">Reset all progress</button>`;

  const stageCardsHtml = STAGE_ROADMAP.map((stage) => {
    const isComplete = completedSet.has(stage.slug);
    const isNext = firstIncomplete && firstIncomplete.slug === stage.slug;
    const stageHash = formatStageHash(stage.slug);
    const phaseText = stage.phaseDegrees === 180 ? '180 deg inverted' : '0 deg non-inverting';
    const phaseBadgeClass = stage.phaseDegrees === 180 ? 'badge-amber' : 'badge-cyan';
    const statusBadge = isComplete
      ? '<span class="badge badge-green">Completed</span>'
      : isNext
        ? '<span class="badge badge-amber">Up next</span>'
        : '<span class="badge">Pending</span>';

    const learningsHtml = (stage.learnings || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');

    return `<article class="stage-card${isComplete ? ' is-complete' : ''}" data-stage-card="${escapeHtml(stage.slug)}">
      <div>
        <div class="stage-card-header">
          <span class="badge badge-amber">${escapeHtml(stage.stageNumber)}</span>
          <div class="stage-card-badges">
            <span class="badge">${escapeHtml(stage.headlinePart)}</span>
            <span class="badge ${phaseBadgeClass}">${escapeHtml(phaseText)}</span>
            ${statusBadge}
          </div>
        </div>
        <h3 class="stage-card-title">
          <a href="${escapeHtml(stageHash)}" data-nav-hash="${escapeHtml(stageHash)}">${escapeHtml(stage.title)}</a>
        </h3>
        <p class="stage-card-topology">${escapeHtml(stage.topology)}</p>
        <p class="stage-card-summary">${escapeHtml(stage.summary)}</p>
        <p class="stage-card-focus">${escapeHtml(stage.bassFocus)}</p>
        <div class="stage-card-learn-heading">What you learn</div>
        <ul class="learning-list">${learningsHtml}</ul>
      </div>
      <div class="stage-card-footer">
        <span class="mono" style="font-size: 12px; color: var(--text-secondary);">Step-by-step wiring + live audio inside</span>
        <a class="btn ${isComplete ? 'btn-ghost' : 'btn-cyan'} btn-sm" href="${escapeHtml(stageHash)}" data-nav-hash="${escapeHtml(stageHash)}">Open ${escapeHtml(stage.stageNumber)}</a>
      </div>
    </article>`;
  }).join('');

  const primerCardsHtml = PASSIVE_PICKUP_PRIMER.map(
    (item) => `<article class="primer-card" data-primer-id="${escapeHtml(item.id)}">
      <span class="badge badge-cyan">${escapeHtml(item.badge)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    </article>`
  ).join('');

  return `<div class="view-stack" data-view="home">
    <section class="panel hero-panel">
      <div class="hero-top">
        <div>
          <span class="badge badge-cyan">400-point solderless breadboard curriculum</span>
          <h1 class="hero-title">Passive-bass analog effects workbench</h1>
          <p class="hero-lead">Build seven progressive analog bass circuits on one half-size Coppersound breadboard. Every stage preserves 31 Hz to 41 Hz fundamentals, shows exact pin-by-pin transitions from the previous layout, and lets you audition the circuit live in your browser.</p>
        </div>
        <div class="hero-cta-group">
          <a class="btn btn-primary" href="${escapeHtml(resumeHash)}" data-nav-hash="${escapeHtml(resumeHash)}" data-role="quick-resume">${escapeHtml(resumeText)}</a>
          <a class="btn btn-ghost" href="#/bom" data-nav-hash="#/bom">Open master BOM (41 parts)</a>
        </div>
      </div>
      <div class="progress-row">
        <div class="progress-meta">
          <span><strong>${completedCount} of ${totalStages} stages completed</strong> (${pct}%)</span>
          ${resetControlsHtml}
        </div>
        <div class="progress-bar-track" role="progressbar" aria-label="Curriculum completion progress" aria-valuemin="0" aria-valuemax="${totalStages}" aria-valuenow="${completedCount}">
          <div class="progress-bar-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    </section>

    <section aria-labelledby="roadmap-heading">
      <div style="margin-bottom: 12px;">
        <h2 id="roadmap-heading" class="section-heading">Six-stage breadboard roadmap</h2>
        <p class="section-subtext">Each phase introduces a core analog building block for passive bass. Open any stage for step-by-step breadboard wiring instructions, interactive layout diffs, and live Web Audio auditioning.</p>
      </div>
      <div class="roadmap-grid">
        ${stageCardsHtml}
      </div>
    </section>

    <section class="panel" aria-labelledby="primer-heading">
      <h2 id="primer-heading" class="section-heading">Passive pickup and breadboard reference rules</h2>
      <p class="section-subtext">Key impedance, coupling capacitor, and power-ground rules used across all seven layouts.</p>
      <div class="primer-grid">
        ${primerCardsHtml}
      </div>
    </section>
  </div>`;
}

export function mountHomeView(container, { store, router } = {}) {
  if (!container || !store) {
    return () => {};
  }

  let confirmReset = false;

  function render() {
    container.innerHTML = buildHomeMarkup({
      state: store.getState(),
      confirmReset
    });
  }

  function onClick(ev) {
    const actionEl = findNearestTarget(ev?.target, container, 'data-action');
    if (actionEl) {
      const action = actionEl.getAttribute('data-action');
      if (action === 'request-reset-progress') {
        confirmReset = true;
        render();
        return;
      }
      if (action === 'cancel-reset-progress') {
        confirmReset = false;
        render();
        return;
      }
      if (action === 'confirm-reset-progress') {
        confirmReset = false;
        store.resetAllProgress();
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

  render();
  container.addEventListener('click', onClick);
  const unsubscribe = store.subscribe(() => {
    render();
  });

  return () => {
    unsubscribe();
    if (typeof container.removeEventListener === 'function') {
      container.removeEventListener('click', onClick);
    }
  };
}
