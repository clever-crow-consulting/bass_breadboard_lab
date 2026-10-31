import { createStore } from './store.js';
import { createRouter, formatStageHash } from './router.js';
import { STAGE_ROADMAP } from './data/curriculum.js';
import { getStage } from './data/stages/index.js';
import { createAudioStudio } from './audio-studio.js';
import { mountHomeView } from './views/home-view.js';
import { mountBomView } from './views/bom-view.js';
import { mountStageView } from './views/stage-view.js';

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

export function buildHeaderMarkup({ state, route, audioPlaying }) {
  const completedSet = new Set(Array.isArray(state?.completedStages) ? state.completedStages : []);
  const isHome = route?.view === 'home';
  const isBom = route?.view === 'bom';
  const themeLabel = state?.theme === 'light' ? 'Dark Bench' : 'Light Bench';

  const stagePillsHtml = STAGE_ROADMAP.map((stage) => {
    const hash = formatStageHash(stage.slug);
    const isActive = route?.view === 'stage' && route?.slug === stage.slug;
    const isDone = completedSet.has(stage.slug);
    const shortNum = stage.stageNumber.replace('Stage ', 'S');
    return `<a
      href="${escapeHtml(hash)}"
      data-nav-hash="${escapeHtml(hash)}"
      data-stage-pill="${escapeHtml(stage.slug)}"
      class="stage-pill${isActive ? ' is-active' : ''}"${isActive ? ' aria-current="page"' : ''}
      title="${escapeHtml(stage.stageNumber)}: ${escapeHtml(stage.title)}"
    >
      <span class="status-dot${isDone ? ' is-complete' : ''}" aria-hidden="true"></span>
      <span>${escapeHtml(shortNum)} ${escapeHtml(stage.shortLabel)}</span>
    </a>`;
  }).join('');

  return `<div class="header-inner">
    <div class="header-left">
      <a class="brand-link" href="#/" data-nav-hash="#/">
        <span class="brand-mark" aria-hidden="true"></span>
        <span>Bass Breadboard Lab</span>
      </a>
      <nav class="nav-group" aria-label="Primary sections">
        <a class="nav-link${isHome ? ' is-active' : ''}" href="#/" data-nav-hash="#/"${isHome ? ' aria-current="page"' : ''}>Overview</a>
        <a class="nav-link${isBom ? ' is-active' : ''}" href="#/bom" data-nav-hash="#/bom"${isBom ? ' aria-current="page"' : ''}>Parts BOM</a>
      </nav>
    </div>

    <nav class="stage-pills" aria-label="Breadboard stages">
      ${stagePillsHtml}
    </nav>

    <div class="header-actions">
      ${audioPlaying ? '<button type="button" class="btn btn-stop-audio btn-sm" data-action="header-stop-audio">Stop Audio</button>' : ''}
      <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-theme">${escapeHtml(themeLabel)}</button>
    </div>
  </div>`;
}

export function initWorkbenchApp({
  win = globalThis.window,
  doc = globalThis.document,
  storage,
  AudioContextClass,
  clipboard
} = {}) {
  const rootEl = doc?.getElementById?.('app-root');
  if (!rootEl) {
    return {
      store: null,
      router: null,
      audioStudio: null,
      destroy() {}
    };
  }

  const store = createStore(storage);
  const router = createRouter(win);
  let currentRoute = router.currentRoute();
  let activeViewCleanup = null;

  function applyThemeAttr(theme) {
    if (doc?.documentElement?.setAttribute) {
      doc.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    }
  }

  applyThemeAttr(store.getState().theme);

  rootEl.innerHTML = `<div class="workbench-shell">
    <header class="workbench-header" data-region="app-header"></header>
    <main class="workbench-main" id="workbench-main" data-region="app-main"></main>
    <footer class="workbench-footer">
      <div class="footer-inner">
        <span>Coppersound 400-point protoboard layout: 0V ground sleeve continuity, center-negative 9V DC, 470nF sub-bass coupling.</span>
        <span class="mono">Passive-bass analog workbench</span>
      </div>
    </footer>
  </div>`;

  const headerEl = rootEl.querySelector('[data-region="app-header"]');
  const mainEl = rootEl.querySelector('[data-region="app-main"]');

  let audioStudio = null;

  function renderHeader() {
    if (!headerEl || !audioStudio) return;
    headerEl.innerHTML = buildHeaderMarkup({
      state: store.getState(),
      route: currentRoute,
      audioPlaying: audioStudio.getState().playing
    });
  }

  audioStudio = createAudioStudio({
    AudioContextClass,
    win,
    doc,
    onChange() {
      renderHeader();
      if (typeof activeViewCleanup?.syncAudio === 'function') {
        activeViewCleanup.syncAudio();
      }
    }
  });

  const unsubscribeStore = store.subscribe((nextState) => {
    applyThemeAttr(nextState.theme);
    renderHeader();
  });

  function onHeaderClick(ev) {
    const actionEl = findNearestTarget(ev?.target, headerEl, 'data-action');
    if (actionEl) {
      const action = actionEl.getAttribute('data-action');
      if (action === 'header-stop-audio') {
        audioStudio.stop();
        return;
      }
      if (action === 'toggle-theme') {
        const nextTheme = store.getState().theme === 'dark' ? 'light' : 'dark';
        store.setTheme(nextTheme);
        return;
      }
    }

    const navEl = findNearestTarget(ev?.target, headerEl, 'data-nav-hash');
    if (navEl) {
      if (!ev?.metaKey && !ev?.ctrlKey && !ev?.shiftKey && !ev?.altKey) {
        ev?.preventDefault?.();
        router.navigate(navEl.getAttribute('data-nav-hash'));
      }
    }
  }

  headerEl.addEventListener('click', onHeaderClick);

  function mountRoute(route) {
    currentRoute = route;
    if (typeof activeViewCleanup === 'function') {
      activeViewCleanup();
      activeViewCleanup = null;
    }

    if (route.view !== 'stage') {
      if (audioStudio.getState().playing) {
        audioStudio.stop();
      }
    }

    if (route.view === 'bom') {
      const resolvedClipboard =
        clipboard !== undefined ? clipboard : win?.navigator?.clipboard;
      activeViewCleanup = mountBomView(mainEl, {
        store,
        clipboard: resolvedClipboard
      });
    } else if (route.view === 'stage' && route.slug) {
      const stage = getStage(route.slug);
      if (stage) {
        activeViewCleanup = mountStageView(mainEl, {
          stage,
          store,
          audioStudio,
          router
        });
      } else {
        activeViewCleanup = mountHomeView(mainEl, { store, router });
      }
    } else {
      activeViewCleanup = mountHomeView(mainEl, { store, router });
    }

    renderHeader();
  }

  router.start(mountRoute);

  function destroy() {
    if (typeof activeViewCleanup === 'function') {
      activeViewCleanup();
      activeViewCleanup = null;
    }
    router.stop();
    unsubscribeStore();
    if (typeof headerEl?.removeEventListener === 'function') {
      headerEl.removeEventListener('click', onHeaderClick);
    }
    audioStudio.destroy();
  }

  return {
    store,
    router,
    audioStudio,
    destroy
  };
}

if (
  typeof document !== 'undefined' &&
  typeof document.getElementById === 'function' &&
  document.getElementById('app-root')
) {
  initWorkbenchApp();
}
