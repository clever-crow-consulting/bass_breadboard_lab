export const STAGE_SLUGS = ['1', '2', '3', '4', '5a', '5b', '6'];

const STAGE_SLUG_SET = new Set(STAGE_SLUGS);

export function formatStageHash(slug) {
  return `#/stage/${String(slug).trim().toLowerCase()}`;
}

export function parseHash(hashString) {
  if (typeof hashString !== 'string') {
    return { view: 'home', slug: null, invalid: false };
  }

  const trimmed = hashString.trim();
  if (trimmed === '' || trimmed === '#' || trimmed === '#/') {
    return { view: 'home', slug: null, invalid: false };
  }

  if (!trimmed.startsWith('#/')) {
    return { view: 'home', slug: null, invalid: true };
  }

  const body = trimmed.slice(2).replace(/\/+$/, '');
  if (body === '') {
    return { view: 'home', slug: null, invalid: false };
  }

  if (body.toLowerCase() === 'bom') {
    return { view: 'bom', slug: null, invalid: false };
  }

  const stageMatch = /^stage\/([^/]+)$/i.exec(body);
  if (stageMatch) {
    const slug = stageMatch[1].toLowerCase();
    if (STAGE_SLUG_SET.has(slug)) {
      return { view: 'stage', slug, invalid: false };
    }
    return { view: 'home', slug: null, invalid: true };
  }

  return { view: 'home', slug: null, invalid: true };
}

function canonicalHashForRoute(route) {
  if (route.view === 'bom') return '#/bom';
  if (route.view === 'stage' && route.slug) return formatStageHash(route.slug);
  return '#/';
}

function routeKey(route) {
  return `${route.view}:${route.slug || ''}`;
}

export function createRouter(win = globalThis.window) {
  let activeListener = null;
  let onChange = null;
  let lastDispatchedKey = null;

  function readHash() {
    try {
      return win && win.location && typeof win.location.hash === 'string' ? win.location.hash : '';
    } catch {
      return '';
    }
  }

  function writeHash(nextHash) {
    try {
      if (win && win.location && win.location.hash !== nextHash) {
        win.location.hash = nextHash;
      }
    } catch {
      // Ignore read-only location objects in constrained environments.
    }
  }

  function resolveAndNormalize() {
    const parsed = parseHash(readHash());
    if (parsed.invalid) {
      writeHash('#/');
      return { view: 'home', slug: null, invalid: false };
    }
    if (parsed.view === 'stage' && parsed.slug) {
      const canonical = formatStageHash(parsed.slug);
      if (readHash() !== canonical) {
        writeHash(canonical);
      }
    }
    return parsed;
  }

  function stop() {
    if (activeListener && win && typeof win.removeEventListener === 'function') {
      try {
        win.removeEventListener('hashchange', activeListener);
      } catch {
        // Ignore teardown failures on mock window targets.
      }
    }
    activeListener = null;
    onChange = null;
    lastDispatchedKey = null;
  }

  return {
    currentRoute() {
      return parseHash(readHash());
    },

    navigate(hash) {
      const raw = typeof hash === 'string' && hash.trim().length > 0
        ? (hash.trim().startsWith('#') ? hash.trim() : `#${hash.trim()}`)
        : '#/';
      const parsed = parseHash(raw);
      const normalized = parsed.invalid ? { view: 'home', slug: null, invalid: false } : parsed;
      const canonical = canonicalHashForRoute(normalized);
      writeHash(canonical);

      const key = routeKey(normalized);
      if (onChange && key !== lastDispatchedKey) {
        lastDispatchedKey = key;
        onChange(normalized);
      }
    },

    start(onRouteChange) {
      stop();
      onChange = typeof onRouteChange === 'function' ? onRouteChange : null;
      const initialRoute = resolveAndNormalize();
      lastDispatchedKey = routeKey(initialRoute);

      activeListener = () => {
        const nextRoute = resolveAndNormalize();
        const key = routeKey(nextRoute);
        if (key !== lastDispatchedKey) {
          lastDispatchedKey = key;
          if (onChange) {
            onChange(nextRoute);
          }
        }
      };

      if (win && typeof win.addEventListener === 'function') {
        win.addEventListener('hashchange', activeListener);
      }

      if (onChange) {
        onChange(initialRoute);
      }

      return stop;
    },

    stop
  };
}
