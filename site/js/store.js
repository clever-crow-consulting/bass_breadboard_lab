export const STORAGE_KEY = 'bass_breadboard_lab:v1';

const VALID_THEMES = new Set(['dark', 'light']);
const VALID_RIFF_IDS = new Set(['groove', 'slap', 'sustain', 'upperSynth']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function createDefaultState() {
  return {
    version: 1,
    theme: 'dark',
    preferredRiffId: 'groove',
    bomOwnedIds: [],
    stagePartChecks: {},
    completedStages: []
  };
}

function isSafeStringKey(value) {
  return typeof value === 'string' && value.trim().length > 0 && !FORBIDDEN_KEYS.has(value);
}

function sanitizeStringArray(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of raw) {
    if (isSafeStringKey(entry) && !seen.has(entry)) {
      seen.add(entry);
      out.push(entry);
    }
  }
  return out;
}

function sanitizeStagePartChecks(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const cleaned = {};
  for (const [stageSlug, partIds] of Object.entries(raw)) {
    if (!isSafeStringKey(stageSlug)) continue;
    const sanitizedIds = sanitizeStringArray(partIds);
    if (sanitizedIds.length > 0) {
      cleaned[stageSlug] = sanitizedIds;
    }
  }
  return cleaned;
}

function sanitizeState(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.version !== 1) {
    return createDefaultState();
  }
  return {
    version: 1,
    theme: VALID_THEMES.has(parsed.theme) ? parsed.theme : 'dark',
    preferredRiffId: VALID_RIFF_IDS.has(parsed.preferredRiffId) ? parsed.preferredRiffId : 'groove',
    bomOwnedIds: sanitizeStringArray(parsed.bomOwnedIds),
    stagePartChecks: sanitizeStagePartChecks(parsed.stagePartChecks),
    completedStages: sanitizeStringArray(parsed.completedStages)
  };
}

function cloneState(state) {
  const stagePartChecks = {};
  for (const [slug, ids] of Object.entries(state.stagePartChecks)) {
    stagePartChecks[slug] = [...ids];
  }
  return {
    version: 1,
    theme: state.theme,
    preferredRiffId: state.preferredRiffId,
    bomOwnedIds: [...state.bomOwnedIds],
    stagePartChecks,
    completedStages: [...state.completedStages]
  };
}

function resolveStorage(explicitBackend) {
  if (explicitBackend !== undefined) {
    if (
      explicitBackend &&
      typeof explicitBackend.getItem === 'function' &&
      typeof explicitBackend.setItem === 'function'
    ) {
      return { backend: explicitBackend, fallback: false };
    }
    return { backend: null, fallback: true };
  }

  try {
    const candidate = globalThis.localStorage;
    if (
      candidate &&
      typeof candidate.getItem === 'function' &&
      typeof candidate.setItem === 'function'
    ) {
      return { backend: candidate, fallback: false };
    }
  } catch {
    return { backend: null, fallback: true };
  }
  return { backend: null, fallback: true };
}

export function createStore(storageBackend) {
  const resolved = resolveStorage(storageBackend);
  const backend = resolved.backend;
  let memoryFallback = resolved.fallback;
  let state = createDefaultState();

  if (backend) {
    let raw = null;
    try {
      raw = backend.getItem(STORAGE_KEY);
    } catch {
      memoryFallback = true;
    }

    if (!memoryFallback && typeof raw === 'string' && raw.length > 0) {
      try {
        state = sanitizeState(JSON.parse(raw));
      } catch {
        state = createDefaultState();
      }
    }
  }

  const listeners = new Set();

  function commit() {
    if (backend) {
      try {
        backend.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        memoryFallback = true;
      }
    }
    const snapshot = cloneState(state);
    for (const listener of [...listeners]) {
      listener(snapshot);
    }
  }

  return {
    getState() {
      return cloneState(state);
    },

    subscribe(listener) {
      if (typeof listener !== 'function') {
        return () => {};
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setTheme(theme) {
      const nextTheme = theme === 'light' ? 'light' : 'dark';
      state = { ...state, theme: nextTheme };
      commit();
    },

    setPreferredRiffId(riffId) {
      if (!VALID_RIFF_IDS.has(riffId)) return;
      state = { ...state, preferredRiffId: riffId };
      commit();
    },

    toggleBomOwned(itemId) {
      if (!isSafeStringKey(itemId)) return;
      const owned = new Set(state.bomOwnedIds);
      if (owned.has(itemId)) {
        owned.delete(itemId);
      } else {
        owned.add(itemId);
      }
      state = { ...state, bomOwnedIds: [...owned] };
      commit();
    },

    setBomOwnedBatch(itemIds, owned) {
      if (!Array.isArray(itemIds)) return;
      const nextSet = new Set(state.bomOwnedIds);
      for (const id of itemIds) {
        if (!isSafeStringKey(id)) continue;
        if (owned) {
          nextSet.add(id);
        } else {
          nextSet.delete(id);
        }
      }
      state = { ...state, bomOwnedIds: [...nextSet] };
      commit();
    },

    isPartChecked(stageSlug, partId) {
      if (!isSafeStringKey(stageSlug) || !isSafeStringKey(partId)) return false;
      const list = state.stagePartChecks[stageSlug];
      return Array.isArray(list) && list.includes(partId);
    },

    togglePartChecked(stageSlug, partId) {
      if (!isSafeStringKey(stageSlug) || !isSafeStringKey(partId)) return;
      const nextChecks = { ...state.stagePartChecks };
      const current = new Set(nextChecks[stageSlug] || []);
      if (current.has(partId)) {
        current.delete(partId);
      } else {
        current.add(partId);
      }
      if (current.size > 0) {
        nextChecks[stageSlug] = [...current];
      } else {
        delete nextChecks[stageSlug];
      }
      state = { ...state, stagePartChecks: nextChecks };
      commit();
    },

    resetStageChecks(stageSlug) {
      if (!isSafeStringKey(stageSlug)) return;
      const nextChecks = { ...state.stagePartChecks };
      delete nextChecks[stageSlug];
      state = { ...state, stagePartChecks: nextChecks };
      commit();
    },

    toggleStageCompleted(stageSlug) {
      if (!isSafeStringKey(stageSlug)) return;
      const completed = new Set(state.completedStages);
      if (completed.has(stageSlug)) {
        completed.delete(stageSlug);
      } else {
        completed.add(stageSlug);
      }
      state = { ...state, completedStages: [...completed] };
      commit();
    },

    isStageCompleted(stageSlug) {
      if (!isSafeStringKey(stageSlug)) return false;
      return state.completedStages.includes(stageSlug);
    },

    resetAllProgress() {
      state = {
        ...createDefaultState(),
        theme: state.theme
      };
      commit();
    },

    isUsingMemoryFallback() {
      return memoryFallback;
    }
  };
}
