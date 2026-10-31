import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRepository } from '../scripts/check_site.mjs';
import { createStaticServer } from '../scripts/serve_local.mjs';
import { createDefaultState, createStore } from '../site/js/store.js';
import { createRouter } from '../site/js/router.js';
import { getStage, getDiffAgainstPrevious } from '../site/js/data/stages/index.js';
import { createAudioStudio } from '../site/js/audio-studio.js';
import { buildHomeMarkup, mountHomeView } from '../site/js/views/home-view.js';
import { buildBomMarkup, mountBomView } from '../site/js/views/bom-view.js';
import { buildTransitionChecklistMarkup, mountStageView } from '../site/js/views/stage-view.js';
import { initWorkbenchApp } from '../site/js/app.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_DIR = path.join(ROOT_DIR, 'site');

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

function decodeEntities(raw) {
  return String(raw ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function encodeEntities(raw) {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseSimpleCompoundSelector(compound) {
  const req = { tag: null, id: null, classes: [], attrs: [] };
  let rest = compound.trim();
  const attrRe = /\[([a-zA-Z0-9_:-]+)(?:="([^"]*)")?\]/g;
  rest = rest.replace(attrRe, (_m, name, val) => {
    req.attrs.push({ name, val: val === undefined ? null : val });
    return '';
  });
  const idMatch = rest.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    req.id = idMatch[1];
    rest = rest.replace(idMatch[0], '');
  }
  const classMatches = [...rest.matchAll(/\.([a-zA-Z0-9_-]+)/g)];
  for (const cm of classMatches) {
    req.classes.push(cm[1]);
    rest = rest.replace(cm[0], '');
  }
  const tag = rest.trim().toLowerCase();
  if (tag && tag !== '*') {
    req.tag = tag;
  }
  return req;
}

function matchesCompound(el, req) {
  if (!el || el.nodeType !== 1) return false;
  if (req.tag && el.tagName.toLowerCase() !== req.tag) return false;
  if (req.id && el.getAttribute('id') !== req.id) return false;
  for (const cls of req.classes) {
    if (!el.classList.contains(cls)) return false;
  }
  for (const attr of req.attrs) {
    if (!el.hasAttribute(attr.name)) return false;
    if (attr.val !== null && el.getAttribute(attr.name) !== attr.val) return false;
  }
  return true;
}

function matchesSelector(el, selector) {
  const groups = selector.split(',').map((s) => s.trim()).filter(Boolean);
  for (const group of groups) {
    const parts = group.split(/\s+/).filter(Boolean).map(parseSimpleCompoundSelector);
    if (parts.length === 0) continue;
    if (!matchesCompound(el, parts[parts.length - 1])) continue;
    let cur = el.parentElement;
    let idx = parts.length - 2;
    while (idx >= 0 && cur) {
      if (matchesCompound(cur, parts[idx])) {
        idx--;
      }
      cur = cur.parentElement;
    }
    if (idx < 0) return true;
  }
  return false;
}

class MiniTextNode {
  constructor(text) {
    this.nodeType = 3;
    this.data = text;
    this.parentElement = null;
  }
  get textContent() {
    return this.data;
  }
  set textContent(v) {
    this.data = String(v ?? '');
  }
}

class MiniElement {
  constructor(tagName, ownerDocument) {
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument || null;
    this.parentElement = null;
    this.children = [];
    this.childNodes = [];
    this._attrs = new Map();
    this._listeners = new Map();
    this._valueOverride = undefined;
    this._checkedOverride = undefined;
    this.classList = {
      add: (...names) => {
        const set = new Set(this._classTokens());
        for (const n of names) if (n) set.add(n);
        this.setAttribute('class', [...set].join(' '));
      },
      remove: (...names) => {
        const set = new Set(this._classTokens());
        for (const n of names) set.delete(n);
        this.setAttribute('class', [...set].join(' '));
      },
      toggle: (name, force) => {
        const set = new Set(this._classTokens());
        const shouldAdd = force !== undefined ? Boolean(force) : !set.has(name);
        if (shouldAdd) set.add(name);
        else set.delete(name);
        this.setAttribute('class', [...set].join(' '));
        return shouldAdd;
      },
      contains: (name) => this._classTokens().includes(name)
    };
  }

  _classTokens() {
    const raw = this._attrs.get('class') || '';
    return raw.split(/\s+/).filter(Boolean);
  }

  get id() {
    return this._attrs.get('id') || '';
  }

  set id(v) {
    this.setAttribute('id', v);
  }

  get className() {
    return this._attrs.get('class') || '';
  }

  set className(v) {
    this.setAttribute('class', v);
  }

  get hidden() {
    return this._attrs.has('hidden');
  }

  set hidden(v) {
    if (v) this.setAttribute('hidden', '');
    else this.removeAttribute('hidden');
  }

  get disabled() {
    return this._attrs.has('disabled');
  }

  set disabled(v) {
    if (v) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get checked() {
    if (this._checkedOverride !== undefined) return this._checkedOverride;
    return this._attrs.has('checked');
  }

  set checked(v) {
    this._checkedOverride = Boolean(v);
  }

  get value() {
    if (this._valueOverride !== undefined) return this._valueOverride;
    if (this.tagName === 'SELECT') {
      const options = this.querySelectorAll('option');
      const selectedOpt = options.find((opt) => opt.hasAttribute('selected')) || options[0];
      return selectedOpt ? (selectedOpt.getAttribute('value') ?? selectedOpt.textContent) : '';
    }
    if (this.tagName === 'TEXTAREA') {
      return this.textContent;
    }
    return this._attrs.get('value') ?? '';
  }

  set value(v) {
    this._valueOverride = String(v ?? '');
  }

  get width() {
    return Number(this._attrs.get('width') || 0);
  }

  set width(v) {
    this.setAttribute('width', String(v));
  }

  get height() {
    return Number(this._attrs.get('height') || 0);
  }

  set height(v) {
    this.setAttribute('height', String(v));
  }

  getContext(kind) {
    if (this.tagName !== 'CANVAS' || kind !== '2d') return null;
    if (!this._ctx2d) {
      this._ctx2d = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '12px ui-monospace, monospace',
        fillRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        fillText() {},
        setLineDash() {}
      };
    }
    return this._ctx2d;
  }

  getAttribute(name) {
    const key = String(name).toLowerCase();
    return this._attrs.has(key) ? this._attrs.get(key) : null;
  }

  setAttribute(name, value) {
    this._attrs.set(String(name).toLowerCase(), String(value ?? ''));
  }

  removeAttribute(name) {
    this._attrs.delete(String(name).toLowerCase());
  }

  hasAttribute(name) {
    return this._attrs.has(String(name).toLowerCase());
  }

  appendChild(node) {
    node.parentElement = this;
    this.childNodes.push(node);
    if (node.nodeType === 1) {
      this.children.push(node);
    }
    return node;
  }

  get textContent() {
    return this.childNodes.map((n) => n.textContent).join('');
  }

  set textContent(val) {
    this.children = [];
    this.childNodes = [];
    const str = String(val ?? '');
    if (str.length > 0) {
      this.appendChild(new MiniTextNode(str));
    }
  }

  get innerHTML() {
    return this.childNodes.map((node) => serializeNode(node)).join('');
  }

  set innerHTML(html) {
    this.children = [];
    this.childNodes = [];
    parseHtmlInto(this, String(html ?? ''), this.ownerDocument);
  }

  contains(other) {
    let cur = other;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentElement || null;
    }
    return false;
  }

  closest(selector) {
    let cur = this;
    while (cur && cur.nodeType === 1) {
      if (matchesSelector(cur, selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    for (const child of this.children) {
      if (matchesSelector(child, selector)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(selector) {
    const out = [];
    for (const child of this.children) {
      if (matchesSelector(child, selector)) out.push(child);
      out.push(...child.querySelectorAll(selector));
    }
    return out;
  }

  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  }

  removeEventListener(type, fn) {
    this._listeners.get(type)?.delete(fn);
  }

  dispatchEvent(rawEvent) {
    const ev = {
      bubbles: true,
      defaultPrevented: false,
      ...rawEvent,
      target: rawEvent.target || this,
      preventDefault() {
        this.defaultPrevented = true;
      }
    };
    let cur = this;
    while (cur) {
      ev.currentTarget = cur;
      const set = cur._listeners.get(ev.type);
      if (set) {
        for (const handler of [...set]) {
          handler(ev);
        }
      }
      if (!ev.bubbles) break;
      cur = cur.parentElement;
    }
    return !ev.defaultPrevented;
  }

  click() {
    if (this.disabled) return;
    if (this.tagName === 'INPUT' && this.getAttribute('type') === 'checkbox') {
      this.checked = !this.checked;
      this.dispatchEvent({ type: 'change', target: this, bubbles: true });
    }
    this.dispatchEvent({ type: 'click', target: this, bubbles: true });
  }
}

function serializeNode(node) {
  if (node.nodeType === 3) {
    return encodeEntities(node.data);
  }
  const tag = node.tagName.toLowerCase();
  let attrs = '';
  for (const [k, v] of node._attrs.entries()) {
    attrs += v === '' ? ` ${k}` : ` ${k}="${encodeEntities(v)}"`;
  }
  if (VOID_TAGS.has(tag)) {
    return `<${tag}${attrs}>`;
  }
  return `<${tag}${attrs}>${node.innerHTML}</${tag}>`;
}

function findTagEnd(html, startIdx) {
  let quote = null;
  for (let i = startIdx + 1; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return html.length - 1;
}

function parseAttributes(attrText, el) {
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of attrText.matchAll(attrRe)) {
    const name = match[1];
    const rawVal = match[2] ?? match[3] ?? match[4] ?? '';
    el.setAttribute(name, decodeEntities(rawVal));
  }
}

function parseHtmlInto(rootEl, html, ownerDoc) {
  const stack = [rootEl];
  let idx = 0;
  while (idx < html.length) {
    const lt = html.indexOf('<', idx);
    if (lt === -1) {
      const text = decodeEntities(html.slice(idx));
      if (text) stack[stack.length - 1].appendChild(new MiniTextNode(text));
      break;
    }
    if (lt > idx) {
      const text = decodeEntities(html.slice(idx, lt));
      if (text) stack[stack.length - 1].appendChild(new MiniTextNode(text));
    }
    if (html.startsWith('<!--', lt)) {
      const closeComment = html.indexOf('-->', lt + 4);
      idx = closeComment === -1 ? html.length : closeComment + 3;
      continue;
    }
    const gt = findTagEnd(html, lt);
    const inside = html.slice(lt + 1, gt).trim();
    idx = gt + 1;
    if (!inside || inside.startsWith('!')) continue;

    if (inside.startsWith('/')) {
      const closeTag = inside.slice(1).trim().toUpperCase();
      for (let s = stack.length - 1; s >= 1; s--) {
        if (stack[s].tagName === closeTag) {
          stack.length = s;
          break;
        }
      }
      continue;
    }

    const selfClosing = inside.endsWith('/');
    const cleaned = selfClosing ? inside.slice(0, -1).trim() : inside;
    const spaceIdx = cleaned.search(/\s/);
    const tagName = spaceIdx === -1 ? cleaned : cleaned.slice(0, spaceIdx);
    const attrPart = spaceIdx === -1 ? '' : cleaned.slice(spaceIdx + 1);

    const el = new MiniElement(tagName, ownerDoc);
    parseAttributes(attrPart, el);
    stack[stack.length - 1].appendChild(el);

    const lowerTag = tagName.toLowerCase();
    if (lowerTag === 'textarea') {
      const closeRe = /<\/textarea\s*>/gi;
      closeRe.lastIndex = idx;
      const closeMatch = closeRe.exec(html);
      if (closeMatch) {
        const rawBody = decodeEntities(html.slice(idx, closeMatch.index));
        if (rawBody) el.appendChild(new MiniTextNode(rawBody));
        idx = closeMatch.index + closeMatch[0].length;
      }
      continue;
    }

    if (!selfClosing && !VOID_TAGS.has(lowerTag)) {
      stack.push(el);
    }
  }
}

function createMiniEnv(initialHash = '#/') {
  const docListeners = new Map();
  const winListeners = new Map();

  const doc = {
    visibilityState: 'visible',
    documentElement: null,
    body: null,
    createElement(tag) {
      return new MiniElement(tag, doc);
    },
    getElementById(id) {
      return doc.body.querySelector(`#${id}`);
    },
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, new Set());
      docListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      docListeners.get(type)?.delete(fn);
    }
  };
  doc.documentElement = new MiniElement('html', doc);
  doc.documentElement.setAttribute('data-theme', 'dark');
  doc.body = new MiniElement('body', doc);
  doc.documentElement.appendChild(doc.body);

  const appRoot = new MiniElement('div', doc);
  appRoot.setAttribute('id', 'app-root');
  doc.body.appendChild(appRoot);

  let currentHash = initialHash;
  const win = {
    location: {
      get hash() {
        return currentHash;
      },
      set hash(next) {
        currentHash = next;
      }
    },
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, new Set());
      winListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      winListeners.get(type)?.delete(fn);
    },
    dispatchHashChange(nextHash) {
      currentHash = nextHash;
      for (const fn of [...(winListeners.get('hashchange') || [])]) {
        fn();
      }
    },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {}
  };

  const backing = new Map();
  const storage = {
    getItem(k) {
      return backing.has(k) ? backing.get(k) : null;
    },
    setItem(k, v) {
      backing.set(k, String(v));
    }
  };

  return { doc, win, storage, appRoot, docListeners, winListeners };
}

function createMockAudioContextTracker() {
  const tracker = { count: 0, lastProcessor: null };
  class MockAudioContext {
    constructor() {
      tracker.count++;
      this.sampleRate = 48000;
      this.state = 'suspended';
      this.destination = {};
    }
    async resume() {
      this.state = 'running';
    }
    async close() {
      this.state = 'closed';
    }
    createConstantSource() {
      return { offset: { value: 0 }, connect() {}, start() {}, stop() {}, disconnect() {} };
    }
    createGain() {
      return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }
    createScriptProcessor(bufSize) {
      const node = {
        bufferSize: bufSize,
        onaudioprocess: null,
        connect() {},
        disconnect() {}
      };
      tracker.lastProcessor = node;
      return node;
    }
  }
  return { MockAudioContext, tracker };
}

test('home, BOM, and stage transition markup builders render complete accessible views', () => {
  const state = {
    ...createDefaultState(),
    completedStages: ['1', '2'],
    bomOwnedIds: ['semi_mpsa13']
  };

  const homeHtml = buildHomeMarkup({ state });
  assert.match(homeHtml, /Stage 3/);
  assert.match(homeHtml, /2 of 7 stages completed/);
  assert.match(homeHtml, /470nF/);

  const allCompleteHomeHtml = buildHomeMarkup({
    state: {
      ...createDefaultState(),
      completedStages: ['1', '2', '3', '4', '5a', '5b', '6']
    }
  });
  assert.match(allCompleteHomeHtml, /7 of 7 stages completed/);
  assert.match(allCompleteHomeHtml, /href="#\/stage\/1"[^>]*data-role="quick-resume"/);

  const bomHtml = buildBomMarkup({
    state,
    filters: { stageFilter: 'all', category: 'all', hideOwned: false }
  });
  assert.match(bomHtml, /MPSA13/);
  assert.match(bomHtml, /CD4049UBE/);
  assert.match(bomHtml, /Copy Markdown/);

  const s5Transition = getDiffAgainstPrevious('5b');
  const diffHtml = buildTransitionChecklistMarkup(s5Transition);
  assert.match(diffHtml, /Step 1: Pull removed parts/);
  assert.match(diffHtml, /Step 2: Relocate or swap modified parts/);
  assert.match(diffHtml, /Step 3: Insert added parts/);
  assert.match(diffHtml, /VAC_LDR/);
});

test('static server serves completed site assets and repository passes checkRepository with 0 violations', async () => {
  const gate = checkRepository(ROOT_DIR);
  assert.equal(gate.ok, true, `Violations:\n${gate.violations.join('\n')}`);

  const indexHtml = fs.readFileSync(path.join(SITE_DIR, 'index.html'), 'utf8');
  assert.match(indexHtml, /data-theme="dark"/);
  assert.match(indexHtml, /src="\.\/js\/app\.js"/);

  const notFoundHtml = fs.readFileSync(path.join(SITE_DIR, '404.html'), 'utf8');
  assert.match(notFoundHtml, /data-theme="dark"/);
  assert.match(notFoundHtml, /http-equiv="refresh"/i);
  assert.match(notFoundHtml, /Return to Bass Breadboard Lab/);

  const cssContent = fs.readFileSync(path.join(SITE_DIR, 'css', 'workbench.css'), 'utf8');
  assert.match(cssContent, /html\[data-theme="dark"\]/);
  assert.match(cssContent, /html\[data-theme="light"\]/);
  assert.match(cssContent, /--bg-canvas:\s*#0b0d10/i);
  assert.match(cssContent, /--bg-canvas:\s*#f6f8fa/i);

  const server = createStaticServer(SITE_DIR);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    for (const asset of ['/', '/404.html', '/css/workbench.css', '/js/app.js', '/js/data/stages/index.js']) {
      const res = await fetch(`http://127.0.0.1:${port}${asset}`);
      assert.equal(res.status, 200, `expected 200 for ${asset}`);
    }
    const missingRes = await fetch(`http://127.0.0.1:${port}/unknown-subpath`);
    assert.equal(missingRes.status, 404);
    const missingBody = await missingRes.text();
    assert.match(missingBody, /Return to Bass Breadboard Lab/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('mountHomeView handles quick resume, stage navigation, and inline two-click reset while preserving theme', () => {
  const { doc, win, storage, appRoot } = createMiniEnv('#/');
  const store = createStore(storage);
  store.setTheme('light');
  store.toggleStageCompleted('1');
  store.toggleStageCompleted('2');
  store.toggleBomOwned('semi_mpsa13');

  const router = createRouter(win);
  const routed = [];
  router.start((r) => routed.push(r));

  const cleanup = mountHomeView(appRoot, { store, router });

  assert.match(appRoot.innerHTML, /2 of 7 stages completed/);
  let quickResume = appRoot.querySelector('[data-role="quick-resume"]');
  assert.ok(quickResume, 'expected Quick Resume control');
  assert.equal(quickResume.getAttribute('href'), '#/stage/3');

  const reqBtn = appRoot.querySelector('[data-action="request-reset-progress"]');
  assert.ok(reqBtn, 'expected initial Reset all progress button');
  reqBtn.click();

  assert.deepEqual(store.getState().completedStages, ['1', '2'], 'first click must not wipe progress');
  const confirmBtnAfterFirst = appRoot.querySelector('[data-action="confirm-reset-progress"]');
  const cancelBtn = appRoot.querySelector('[data-action="cancel-reset-progress"]');
  assert.ok(confirmBtnAfterFirst, 'expected Confirm reset progress button');
  assert.ok(cancelBtn, 'expected Cancel button');

  cancelBtn.click();
  assert.equal(appRoot.querySelector('[data-action="confirm-reset-progress"]'), null);
  assert.deepEqual(store.getState().completedStages, ['1', '2']);

  appRoot.querySelector('[data-action="request-reset-progress"]').click();
  appRoot.querySelector('[data-action="confirm-reset-progress"]').click();

  assert.deepEqual(store.getState().completedStages, []);
  assert.deepEqual(store.getState().bomOwnedIds, []);
  assert.equal(store.getState().theme, 'light', 'theme must be preserved across resetAllProgress');
  assert.match(appRoot.innerHTML, /0 of 7 stages completed/);
  assert.equal(appRoot.querySelector('[data-role="quick-resume"]').getAttribute('href'), '#/stage/1');

  quickResume = appRoot.querySelector('[data-role="quick-resume"]');
  quickResume.click();
  assert.equal(win.location.hash, '#/stage/1');
  assert.equal(routed[routed.length - 1].slug, '1');

  cleanup();
});

test('mountBomView filters rows, toggles owned parts and category batches, and supports clipboard export with textarea fallback', async () => {
  const { storage, appRoot } = createMiniEnv('#/bom');
  const store = createStore(storage);

  let copiedText = null;
  const mockClipboard = {
    async writeText(txt) {
      copiedText = txt;
    }
  };

  const cleanup = mountBomView(appRoot, { store, clipboard: mockClipboard });

  const initialChecks = appRoot.querySelectorAll('input[data-action="toggle-bom-item"]');
  assert.equal(initialChecks.length, 41);

  const mpsaCheck = appRoot.querySelector('input[data-item-id="semi_mpsa13"]');
  assert.ok(mpsaCheck);
  mpsaCheck.click();
  assert.equal(store.getState().bomOwnedIds.includes('semi_mpsa13'), true);
  assert.match(appRoot.innerHTML, /1 of 41 parts owned/);

  const hideOwnedToggle = appRoot.querySelector('input[data-filter="hideOwned"]');
  assert.ok(hideOwnedToggle);
  hideOwnedToggle.click();
  assert.equal(appRoot.querySelectorAll('input[data-action="toggle-bom-item"]').length, 40);

  const stageSelect = appRoot.querySelector('select[data-filter="stageFilter"]');
  const categorySelect = appRoot.querySelector('select[data-filter="category"]');
  assert.ok(stageSelect && categorySelect);

  stageSelect.value = '4';
  stageSelect.dispatchEvent({ type: 'change', target: stageSelect, bubbles: true });
  categorySelect.value = 'semiconductors';
  categorySelect.dispatchEvent({ type: 'change', target: categorySelect, bubbles: true });

  assert.match(appRoot.innerHTML, /CD4049UBE/);
  assert.doesNotMatch(appRoot.innerHTML, /CD4013BE/);

  const catSelectAll = appRoot.querySelector('[data-action="category-select-all"][data-category="semiconductors"]');
  assert.ok(catSelectAll);
  catSelectAll.click();
  assert.equal(store.getState().bomOwnedIds.includes('semi_cd4049ube'), true);

  const catClear = appRoot.querySelector('[data-action="category-clear"][data-category="semiconductors"]');
  assert.ok(catClear);
  catClear.click();
  assert.equal(store.getState().bomOwnedIds.includes('semi_cd4049ube'), false);

  const copyMdBtn = appRoot.querySelector('[data-action="copy-markdown"]');
  assert.ok(copyMdBtn);
  copyMdBtn.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.match(copiedText || '', /# Bass Breadboard Lab shopping list/);
  assert.match(copiedText || '', /CD4049UBE/);
  assert.match(appRoot.innerHTML, /Copied Markdown/);

  const cd4049Check = appRoot.querySelector('input[data-item-id="semi_cd4049ube"]');
  assert.ok(cd4049Check);
  cd4049Check.click();
  assert.doesNotMatch(appRoot.innerHTML, /Copied Markdown/, 'toggling owned checkbox must clear stale copyStatus');
  cd4049Check.click();

  cleanup();

  const cleanupFallback = mountBomView(appRoot, { store, clipboard: null });
  appRoot.querySelector('[data-action="copy-plain"]').click();
  await new Promise((r) => setTimeout(r, 0));
  let fallbackTextarea = appRoot.querySelector('textarea.bom-export-textarea');
  assert.ok(fallbackTextarea, 'expected fallback textarea when clipboard API is unavailable');
  assert.match(fallbackTextarea.value, /Bass Breadboard Lab shopping list/);
  assert.match(fallbackTextarea.value, /CD4013BE/);
  assert.match(fallbackTextarea.value, /4x 47uF/);

  const fbStageSelect = appRoot.querySelector('select[data-filter="stageFilter"]');
  fbStageSelect.value = '4';
  fbStageSelect.dispatchEvent({ type: 'change', target: fbStageSelect, bubbles: true });
  assert.doesNotMatch(appRoot.innerHTML, /Clipboard unavailable/, 'filter change must clear copyStatus');
  fallbackTextarea = appRoot.querySelector('textarea.bom-export-textarea');
  assert.ok(fallbackTextarea, 'open fallback export drawer must stay open and refresh on filter change');
  assert.match(fallbackTextarea.value, /CD4049UBE/);
  assert.doesNotMatch(fallbackTextarea.value, /CD4013BE/);
  assert.doesNotMatch(fallbackTextarea.value, /4x 47uF/);

  appRoot.querySelector('[data-action="copy-markdown"]').click();
  await new Promise((r) => setTimeout(r, 0));
  fallbackTextarea = appRoot.querySelector('textarea.bom-export-textarea');
  assert.match(fallbackTextarea.value, /# Bass Breadboard Lab shopping list/);
  assert.match(fallbackTextarea.value, /- \[ \] \*\*2x CD4049UBE\*\*/);

  const fbCd4049Check = appRoot.querySelector('input[data-item-id="semi_cd4049ube"]');
  fbCd4049Check.click();
  assert.doesNotMatch(appRoot.innerHTML, /Clipboard unavailable/, 'checkbox change must clear copyStatus');
  fallbackTextarea = appRoot.querySelector('textarea.bom-export-textarea');
  assert.match(
    fallbackTextarea.value,
    /- \[x\] \*\*2x CD4049UBE\*\*/,
    'fallback Markdown export must refresh when owned state changes'
  );

  const fbHideOwned = appRoot.querySelector('input[data-filter="hideOwned"]');
  fbHideOwned.click();
  fallbackTextarea = appRoot.querySelector('textarea.bom-export-textarea');
  assert.doesNotMatch(
    fallbackTextarea.value,
    /CD4049UBE/,
    'fallback export must exclude owned items when hideOwned is enabled'
  );

  cleanupFallback();
});

test('mountStageView updates presets, modes, diff checklist, inspector, knobs, and wiring checks without replacing oscilloscope canvas or sliders', async () => {
  const { doc, win, storage, appRoot } = createMiniEnv('#/stage/1');
  const store = createStore(storage);
  const router = createRouter(win);
  const { MockAudioContext } = createMockAudioContextTracker();
  const audioStudio = createAudioStudio({ AudioContextClass: MockAudioContext, win, doc });

  const cleanupStage1 = mountStageView(appRoot, {
    stage: getStage('1'),
    store,
    audioStudio,
    router
  });

  const s1DiffBtn = appRoot.querySelector('[data-action="toggle-diff"]');
  assert.ok(s1DiffBtn);
  assert.equal(s1DiffBtn.disabled, true);
  assert.match(appRoot.innerHTML, /Stage 1 is the initial baseline layout/);

  const modeBtn = appRoot.querySelector('[data-action="select-mode"][data-mode-id="hard_clip"]');
  assert.ok(modeBtn, 'Stage 1 should render Mode selector buttons');
  modeBtn.click();
  assert.equal(audioStudio.getState().modeId, 'hard_clip');
  assert.match(appRoot.innerHTML, /data-part-id="D_CLIP"/);

  cleanupStage1();

  const cleanupStage5b = mountStageView(appRoot, {
    stage: getStage('5b'),
    store,
    audioStudio,
    router
  });

  const canvasBefore = appRoot.querySelector('canvas[data-role="scope-canvas"]');
  const firstSliderBefore = appRoot.querySelector('input[data-action="studio-knob"]');
  assert.ok(canvasBefore, 'expected oscilloscope canvas');
  assert.ok(firstSliderBefore, 'expected stage knob slider');
  assert.equal(canvasBefore.width, 560);
  assert.equal(canvasBefore.height, 150);

  const vacLdrGroup = appRoot.querySelector('[data-part-id="VAC_LDR"]');
  assert.ok(vacLdrGroup, 'expected VAC_LDR part in Stage 5B SVG');
  vacLdrGroup.dispatchEvent({ type: 'mouseover', target: vacLdrGroup, bubbles: true });

  const inspectorPanel = appRoot.querySelector('[data-region="inspector-panel"]');
  assert.match(inspectorPanel.innerHTML, /VAC_LDR/);
  assert.match(appRoot.querySelector('[data-region="breadboard-canvas"]').innerHTML, /bb-net-strip/);
  assert.equal(appRoot.querySelector('canvas[data-role="scope-canvas"]'), canvasBefore, 'hover must not replace scope canvas');
  assert.equal(appRoot.querySelector('input[data-action="studio-knob"]'), firstSliderBefore, 'hover must not replace range sliders');

  vacLdrGroup.click();
  assert.match(appRoot.querySelector('[data-region="breadboard-canvas"]').innerHTML, /bb-selected-halo/);

  appRoot.querySelector('[data-action="clear-selection"]').click();
  const hdrGndEl = appRoot.querySelector('[data-pin="HDR_GND"]');
  assert.ok(hdrGndEl);
  hdrGndEl.dispatchEvent({ type: 'mouseover', target: hdrGndEl, bubbles: true });
  assert.match(inspectorPanel.innerHTML, /HDR_GND/);
  appRoot.querySelector('[data-region="breadboard-canvas"]').dispatchEvent({
    type: 'mouseleave',
    target: appRoot.querySelector('[data-region="breadboard-canvas"]'),
    bubbles: false
  });
  assert.doesNotMatch(appRoot.querySelector('[data-region="breadboard-canvas"]').innerHTML, /bb-net-strip/);

  const diffToggle = appRoot.querySelector('[data-action="toggle-diff"]');
  assert.equal(diffToggle.disabled, false);
  diffToggle.click();
  const transitionPanel = appRoot.querySelector('[data-region="transition-panel"]');
  assert.equal(transitionPanel.hidden, false);
  assert.match(transitionPanel.innerHTML, /Step 1: Pull removed parts/);
  assert.match(transitionPanel.innerHTML, /VAC_LDR/);
  assert.equal(appRoot.querySelector('canvas[data-role="scope-canvas"]'), canvasBefore, 'diff toggle must not replace scope canvas');

  const slapPresetBtn = appRoot.querySelector('[data-action="select-preset"][data-preset-id="slap_punch"]');
  assert.ok(slapPresetBtn);
  slapPresetBtn.click();
  assert.equal(audioStudio.getState().presetId, 'slap_punch');
  assert.equal(appRoot.querySelector('canvas[data-role="scope-canvas"]'), canvasBefore, 'preset swap must not replace scope canvas');

  firstSliderBefore.value = '0.85';
  firstSliderBefore.dispatchEvent({ type: 'input', target: firstSliderBefore, bubbles: true });
  const knobId = firstSliderBefore.getAttribute('data-knob-id');
  assert.equal(audioStudio.getState().knobs[knobId], 0.85);
  assert.equal(appRoot.querySelector('input[data-action="studio-knob"]'), firstSliderBefore, 'knob drag must not replace slider');

  const riffBtn = appRoot.querySelector('[data-action="studio-riff"][data-riff-id="slap"]');
  assert.ok(riffBtn);
  riffBtn.click();
  assert.equal(audioStudio.getState().riffId, 'slap');
  assert.equal(store.getState().preferredRiffId, 'slap');

  const bypassBtn = appRoot.querySelector('[data-action="studio-bypass"]');
  bypassBtn.click();
  assert.equal(audioStudio.getState().bypass, true);

  const partCheck = appRoot.querySelector('input[data-action="toggle-part-check"][data-part-id="VAC_LDR"]');
  assert.ok(partCheck);
  partCheck.click();
  assert.equal(store.isPartChecked('5b', 'VAC_LDR'), true);
  assert.match(appRoot.querySelector('[data-region="breadboard-canvas"]').innerHTML, /data-checked="true"/);

  appRoot.querySelector('[data-action="reset-stage-checks"]').click();
  assert.equal(store.isPartChecked('5b', 'VAC_LDR'), false);

  appRoot.querySelector('[data-action="toggle-stage-complete"]').click();
  assert.equal(store.isStageCompleted('5b'), true);

  cleanupStage5b();
  audioStudio.destroy();
});

test('initWorkbenchApp manages theme attribute, keeps audio smooth across stage-to-stage routes, and stops audio when leaving stages', async () => {
  const { doc, win, storage } = createMiniEnv('#/stage/1');
  const { MockAudioContext, tracker } = createMockAudioContextTracker();

  const app = initWorkbenchApp({
    win,
    doc,
    storage,
    AudioContextClass: MockAudioContext
  });

  assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(doc.body.querySelectorAll('[data-stage-pill]').length, 7);

  const themeBtn = doc.body.querySelector('[data-action="toggle-theme"]');
  assert.ok(themeBtn);
  assert.match(themeBtn.textContent, /Light Bench/);
  themeBtn.click();
  assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');
  assert.match(doc.body.querySelector('[data-action="toggle-theme"]').textContent, /Dark Bench/);

  const playBtn = doc.body.querySelector('[data-action="studio-toggle-play"]');
  assert.ok(playBtn);
  playBtn.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(app.audioStudio.getState().playing, true);
  assert.equal(tracker.count, 1);
  assert.ok(doc.body.querySelector('[data-action="header-stop-audio"]'), 'header Stop Audio pill must appear when playing');

  app.router.navigate('#/stage/3');
  assert.equal(app.audioStudio.getState().playing, true, 'audio must continue smoothly across #/stage/1 -> #/stage/3');
  assert.equal(app.audioStudio.getState().stageSlug, '3');
  assert.equal(tracker.count, 1, 'singleton AudioContext must be reused across stage transitions');

  const stage3Canvas = doc.body.querySelector('canvas[data-role="scope-canvas"]');
  assert.ok(stage3Canvas);
  let detachedCanvasDraws = 0;
  const stage3Ctx = stage3Canvas.getContext('2d');
  const origFillRect = stage3Ctx.fillRect;
  stage3Ctx.fillRect = (...args) => {
    detachedCanvasDraws++;
    return origFillRect.apply(stage3Ctx, args);
  };

  app.router.navigate('#/bom');
  assert.equal(app.audioStudio.getState().playing, false, 'audio must stop immediately when navigating to #/bom');
  assert.equal(doc.body.querySelector('[data-action="header-stop-audio"]'), null);
  detachedCanvasDraws = 0;
  app.audioStudio.toggleBypass();
  app.audioStudio.stop();
  assert.equal(
    detachedCanvasDraws,
    0,
    'cleanup() must unbind scopeCanvas so detached stage canvas is not retained or redrawn on #/bom'
  );

  app.router.navigate('#/stage/5a');
  const stage5aCanvas = doc.body.querySelector('canvas[data-role="scope-canvas"]');
  let detachedStage5aDraws = 0;
  stage5aCanvas.getContext('2d').fillRect = () => {
    detachedStage5aDraws++;
  };
  doc.body.querySelector('[data-action="studio-toggle-play"]').click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(app.audioStudio.getState().playing, true);

  app.router.navigate('#/');
  assert.equal(app.audioStudio.getState().playing, false, 'audio must stop immediately when navigating to #/');
  detachedStage5aDraws = 0;
  app.audioStudio.toggleBypass();
  app.audioStudio.stop();
  assert.equal(
    detachedStage5aDraws,
    0,
    'cleanup() must unbind scopeCanvas when navigating from #/stage/* to #/'
  );

  app.router.navigate('#/stage/6');
  doc.body.querySelector('[data-action="studio-toggle-play"]').click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(app.audioStudio.getState().playing, true);

  const stopHeaderBtn = doc.body.querySelector('[data-action="header-stop-audio"]');
  assert.ok(stopHeaderBtn);
  stopHeaderBtn.click();
  assert.equal(app.audioStudio.getState().playing, false);
  assert.equal(doc.body.querySelector('[data-action="header-stop-audio"]'), null);

  for (const slug of ['1', '2', '3', '4', '5a', '5b', '6']) {
    app.router.navigate(`#/stage/${slug}`);
    assert.equal(app.audioStudio.getState().stageSlug, slug);
    assert.ok(doc.body.querySelector('svg.bb-svg'), `Stage ${slug} must render breadboard SVG`);
  }

  app.destroy();
});

test('mountStageView handles rejecting AudioContext.resume() on play and pluck clicks without unhandled rejections or wedged buttons', async () => {
  const { doc, win, storage, appRoot } = createMiniEnv('#/stage/1');
  const store = createStore(storage);
  const router = createRouter(win);

  class RejectingAudioContext {
    constructor() {
      this.sampleRate = 48000;
      this.state = 'suspended';
      this.destination = {};
    }
    async resume() {
      throw new Error('Blocked by autoplay policy');
    }
    createConstantSource() {
      return { offset: { value: 0 }, connect() {}, start() {}, disconnect() {} };
    }
    createGain() {
      return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }
    createScriptProcessor(bufSize) {
      return { bufferSize: bufSize, onaudioprocess: null, connect() {}, disconnect() {} };
    }
  }

  const audioStudio = createAudioStudio({ AudioContextClass: RejectingAudioContext, win, doc });
  const cleanup = mountStageView(appRoot, {
    stage: getStage('1'),
    store,
    audioStudio,
    router
  });

  const playBtn = appRoot.querySelector('[data-action="studio-toggle-play"]');
  const pluckBtn = appRoot.querySelector('[data-action="studio-pluck"]');
  assert.ok(playBtn && pluckBtn);

  playBtn.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(audioStudio.getState().playing, false);
  assert.equal(playBtn.textContent, 'Play Riff Loop');
  assert.equal(playBtn.getAttribute('aria-pressed'), 'false');

  pluckBtn.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(audioStudio.getState().playing, false);
  assert.equal(playBtn.textContent, 'Play Riff Loop');

  cleanup();
  audioStudio.destroy();
});
