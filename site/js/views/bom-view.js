import {
  BOM_CATEGORIES,
  BOM_ITEMS,
  filterBomItems,
  formatBomPlainText,
  formatBomMarkdown
} from '../data/bom.js';
import { STAGE_ROADMAP } from '../data/curriculum.js';
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

const STAGE_FILTER_OPTIONS = [
  { value: 'all', label: 'All stages' },
  ...STAGE_ROADMAP.map((stage) => ({
    value: stage.slug,
    label: `${stage.stageNumber}: ${stage.shortLabel}`
  })),
  { value: '5', label: 'Stage 5 (5A and 5B combined)' }
];

function formatStageLabel(slug) {
  return `Stage ${String(slug).toUpperCase()}`;
}

export function buildBomMarkup({
  state = createDefaultState(),
  filters = {},
  copyStatus = '',
  fallbackExport = null
} = {}) {
  const safeFilters = {
    stageFilter: filters.stageFilter || 'all',
    category: filters.category || 'all',
    hideOwned: Boolean(filters.hideOwned)
  };

  const ownedIds = Array.isArray(state?.bomOwnedIds) ? state.bomOwnedIds : [];
  const ownedSet = new Set(ownedIds);
  const ownedTotal = BOM_ITEMS.filter((item) => ownedSet.has(item.id)).length;
  const filteredItems = filterBomItems(BOM_ITEMS, {
    ...safeFilters,
    ownedIds
  });

  const stageOptionsHtml = STAGE_FILTER_OPTIONS.map((opt) => {
    const selected = opt.value === safeFilters.stageFilter ? ' selected' : '';
    return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(opt.label)}</option>`;
  }).join('');

  const categoryOptionsHtml = [
    `<option value="all"${safeFilters.category === 'all' ? ' selected' : ''}>All categories</option>`,
    ...BOM_CATEGORIES.map((cat) => {
      const selected = cat.id === safeFilters.category ? ' selected' : '';
      return `<option value="${escapeHtml(cat.id)}"${selected}>${escapeHtml(cat.label)}</option>`;
    })
  ].join('');

  const categoryCardsHtml = BOM_CATEGORIES.map((cat) => {
    const itemsInCat = BOM_ITEMS.filter((item) => item.category === cat.id);
    const ownedInCat = itemsInCat.filter((item) => ownedSet.has(item.id)).length;
    return `<div class="category-card" data-category-card="${escapeHtml(cat.id)}">
      <div>
        <h3 class="category-card-title">${escapeHtml(cat.label)}</h3>
        <p class="category-card-desc">${escapeHtml(cat.description)}</p>
      </div>
      <div class="category-card-actions">
        <span class="badge ${ownedInCat === itemsInCat.length ? 'badge-green' : 'badge-cyan'}">${ownedInCat} / ${itemsInCat.length} owned</span>
        <span style="display: inline-flex; gap: 6px;">
          <button type="button" class="btn btn-ghost btn-sm" data-action="category-select-all" data-category="${escapeHtml(cat.id)}">Select all</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="category-clear" data-category="${escapeHtml(cat.id)}">Clear</button>
        </span>
      </div>
    </div>`;
  }).join('');

  const rowsHtml =
    filteredItems.length > 0
      ? filteredItems
          .map((item) => {
            const isOwned = ownedSet.has(item.id);
            const stageBadges = (item.stages || [])
              .map((slug) => `<span class="badge">${escapeHtml(formatStageLabel(slug))}</span>`)
              .join(' ');
            return `<tr class="${isOwned ? 'is-owned' : ''}" data-bom-row="${escapeHtml(item.id)}">
              <td>
                <input type="checkbox" data-action="toggle-bom-item" data-item-id="${escapeHtml(item.id)}" aria-label="Mark ${escapeHtml(item.part)} owned"${isOwned ? ' checked' : ''}>
              </td>
              <td><strong>${escapeHtml(item.part)}</strong></td>
              <td class="mono">${escapeHtml(item.qty)}x</td>
              <td class="mono">${escapeHtml(item.packageOrTaper)}</td>
              <td><div style="display: flex; flex-wrap: wrap; gap: 4px;">${stageBadges}</div></td>
              <td>${escapeHtml(item.role)}</td>
            </tr>`;
          })
          .join('')
      : `<tr>
          <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 24px;">No parts match the active filter settings.</td>
        </tr>`;

  const fallbackDrawerHtml = fallbackExport
    ? `<div class="bom-export-drawer" data-export-fallback="true">
        <div class="bom-export-drawer-header">
          <span>${escapeHtml(fallbackExport.label)}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-action="close-export-fallback">Close</button>
        </div>
        <textarea class="bom-export-textarea" rows="8" readonly aria-label="${escapeHtml(fallbackExport.label)}">${escapeHtml(fallbackExport.text)}</textarea>
      </div>`
    : '';

  return `<div class="view-stack" data-view="bom">
    <section class="panel">
      <div class="bom-header-top">
        <div>
          <span class="badge badge-amber">${ownedTotal} of ${BOM_ITEMS.length} parts owned</span>
          <h1 class="section-heading" style="margin-top: 8px; font-size: 24px;">Master bill of materials</h1>
          <p class="section-subtext">Track parts on hand across all seven breadboard stages and export a filtered shopping list in plain text or Markdown.</p>
        </div>
        <div class="bom-export-bar">
          ${copyStatus ? `<span class="copy-status-pill" role="status">${escapeHtml(copyStatus)}</span>` : ''}
          <button type="button" class="btn btn-ghost" data-action="copy-plain">Copy Plain Text</button>
          <button type="button" class="btn btn-primary" data-action="copy-markdown">Copy Markdown</button>
        </div>
      </div>

      <div class="bom-toolbar">
        <label class="filter-field">
          <span>Stage</span>
          <select class="filter-select" data-filter="stageFilter" aria-label="Filter by stage">
            ${stageOptionsHtml}
          </select>
        </label>

        <label class="filter-field">
          <span>Category</span>
          <select class="filter-select" data-filter="category" aria-label="Filter by category">
            ${categoryOptionsHtml}
          </select>
        </label>

        <label class="checkbox-label">
          <input type="checkbox" data-filter="hideOwned"${safeFilters.hideOwned ? ' checked' : ''}>
          <span>Hide owned parts</span>
        </label>

        <span class="mono" style="margin-left: auto; font-size: 12px; color: var(--text-secondary);">Showing ${filteredItems.length} of ${BOM_ITEMS.length} items</span>
      </div>

      ${fallbackDrawerHtml}
    </section>

    <section aria-label="BOM categories">
      <div class="category-summary-grid">
        ${categoryCardsHtml}
      </div>
    </section>

    <section class="bom-table-wrap" aria-label="Parts list">
      <table class="bom-table">
        <thead>
          <tr>
            <th>Owned</th>
            <th>Part</th>
            <th>Qty</th>
            <th>Package / taper</th>
            <th>Stages</th>
            <th>Circuit role</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </section>
  </div>`;
}

export function mountBomView(container, { store, clipboard } = {}) {
  if (!container || !store) {
    return () => {};
  }

  let filters = {
    stageFilter: 'all',
    category: 'all',
    hideOwned: false
  };
  let copyStatus = '';
  let fallbackExport = null;

  function resolveClipboard() {
    if (clipboard !== undefined) return clipboard;
    try {
      return globalThis.navigator?.clipboard || null;
    } catch {
      return null;
    }
  }

  function render() {
    container.innerHTML = buildBomMarkup({
      state: store.getState(),
      filters,
      copyStatus,
      fallbackExport
    });
  }

  function buildExportPayload(kind, state = store.getState()) {
    const visibleItems = filterBomItems(BOM_ITEMS, {
      ...filters,
      ownedIds: state.bomOwnedIds
    });
    const normalizedKind = kind === 'markdown' ? 'markdown' : 'plain';
    const text =
      normalizedKind === 'markdown'
        ? formatBomMarkdown(visibleItems, state.bomOwnedIds)
        : formatBomPlainText(visibleItems, state.bomOwnedIds);
    const label =
      normalizedKind === 'markdown' ? 'Markdown shopping list' : 'Plain-text shopping list';
    return {
      kind: normalizedKind,
      label,
      text,
      count: visibleItems.length
    };
  }

  function syncExportOnStateOrFilterChange() {
    copyStatus = '';
    if (fallbackExport) {
      const refreshed = buildExportPayload(fallbackExport.kind);
      fallbackExport = {
        kind: refreshed.kind,
        label: refreshed.label,
        text: refreshed.text
      };
    }
  }

  async function handleExport(kind) {
    const payload = buildExportPayload(kind);

    const clip = resolveClipboard();
    if (clip && typeof clip.writeText === 'function') {
      try {
        await clip.writeText(payload.text);
        copyStatus =
          payload.kind === 'markdown'
            ? `Copied Markdown (${payload.count} items)`
            : `Copied Plain Text (${payload.count} items)`;
        fallbackExport = null;
        render();
        return;
      } catch {
        // Fall back to selectable textarea drawer below.
      }
    }

    copyStatus = 'Clipboard unavailable: copy from box below';
    fallbackExport = {
      kind: payload.kind,
      label: payload.label,
      text: payload.text
    };
    render();
  }

  function onChange(ev) {
    const filterEl = findNearestTarget(ev?.target, container, 'data-filter');
    if (filterEl) {
      const filterKey = filterEl.getAttribute('data-filter');
      if (filterKey === 'stageFilter') {
        filters = { ...filters, stageFilter: filterEl.value || 'all' };
        syncExportOnStateOrFilterChange();
        render();
        return;
      }
      if (filterKey === 'category') {
        filters = { ...filters, category: filterEl.value || 'all' };
        syncExportOnStateOrFilterChange();
        render();
        return;
      }
      if (filterKey === 'hideOwned') {
        filters = { ...filters, hideOwned: Boolean(filterEl.checked) };
        syncExportOnStateOrFilterChange();
        render();
        return;
      }
    }

    const toggleItemEl = findNearestTarget(ev?.target, container, 'data-action');
    if (toggleItemEl && toggleItemEl.getAttribute('data-action') === 'toggle-bom-item') {
      const itemId = toggleItemEl.getAttribute('data-item-id');
      if (itemId) {
        store.toggleBomOwned(itemId);
      }
    }
  }

  function onClick(ev) {
    const actionEl = findNearestTarget(ev?.target, container, 'data-action');
    if (!actionEl) return;
    const action = actionEl.getAttribute('data-action');

    if (action === 'category-select-all' || action === 'category-clear') {
      const catId = actionEl.getAttribute('data-category');
      const ids = BOM_ITEMS.filter((item) => item.category === catId).map((item) => item.id);
      store.setBomOwnedBatch(ids, action === 'category-select-all');
      return;
    }

    if (action === 'copy-plain') {
      handleExport('plain');
      return;
    }

    if (action === 'copy-markdown') {
      handleExport('markdown');
      return;
    }

    if (action === 'close-export-fallback') {
      fallbackExport = null;
      copyStatus = '';
      render();
    }
  }

  render();
  container.addEventListener('change', onChange);
  container.addEventListener('click', onClick);
  const unsubscribe = store.subscribe(() => {
    syncExportOnStateOrFilterChange();
    render();
  });

  return () => {
    unsubscribe();
    if (typeof container.removeEventListener === 'function') {
      container.removeEventListener('change', onChange);
      container.removeEventListener('click', onClick);
    }
  };
}
