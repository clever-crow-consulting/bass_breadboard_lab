# Bass Breadboard Lab Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the zero-dependency Bass Breadboard Lab static web application in `site/` with automated Node 22 verification suites, local static serving, and GitHub Pages deployment for the 6-stage (7-planner) passive-bass analog effects curriculum.

**Architecture:** Native ES2022 browser modules in `site/js/` render three hash-routed views (`#/`, `#/bom`, and `#/stage/<slug>`) backed by pure stage data modules, a deterministic breadboard netlist validator and stage-to-stage diff engine, a shared 400-point Coppersound SVG renderer, a singleton `96 kHz` (`2x` oversampled) Web Audio audition studio with a phase-locked dual-trace oscilloscope, and a versioned `localStorage` state store. All pure modules run directly under Node 22 `node:test` without DOM shims or `node_modules`.

**Tech Stack:** HTML5, CSS3 custom design tokens (`html[data-theme="dark"]` default and `html[data-theme="light"]`), ES2022 modules, inline SVG, HTML5 `<canvas>`, Web Audio API, Node.js 22 (`node:test`, `node:assert/strict`, `node:http`), `just`, and GitHub Actions (`actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`).

**Spec:** `docs/superpowers/specs/2026-10-31-bass-breadboard-lab-website-design.md`

## Global Constraints

- Zero third-party runtime dependencies, zero `package.json` `dependencies` or `devDependencies`, and zero `node_modules` directories.
- Node 22 (`node --test`) and standard library modules (`node:fs`, `node:path`, `node:http`, `node:url`, `node:test`, `node:assert/strict`) only for scripts and tests.
- NEVER use emojis anywhere in HTML, CSS, SVG, canvas text, JavaScript strings, comments, Markdown docs, or Git commit messages (`0` matches for `/\p{Extended_Pictographic}/u`).
- Use straight quotes, sentence-case headings, and active voice in documentation and UI copy; do not use em dashes or en dashes in prose or UI strings.
- Dark mode is the default theme via `html[data-theme="dark"]` (`#0b0d10` canvas, `#12161c` surface cards, `#232a34` hairline borders, `#eef2f6` primary text, `#9aa5b4` secondary text, `#f59e0b` amber accent, `#38bdf8` cyan trace accent, `#22c55e` dry reference green) with light mode via `html[data-theme="light"]` (`#f6f8fa` canvas, `#ffffff` surface cards, `#d0d7de` borders, `#0f172a` primary text, `#475569` secondary text, `#d97706` amber accent, `#0284c7` cyan accent).
- Never define theme color tokens on `:root`; scope theme variables strictly to `html[data-theme="dark"]` and `html[data-theme="light"]`.
- No purple accents on dark backgrounds, no glowing neon card borders, no gradient headline text, and no background grid meshes.
- Minimum font size is `12px` across all CSS rules, inline styles, canvas text, and SVG `font-size` attributes.
- No external CDN runtime URLs (`http://` or `https://`) in `site/` files (W3C XML/SVG namespace URIs such as `http://www.w3.org/2000/svg` are allowed).
- In shell commands and documentation examples, define environment variables first (for example `PORT="8765"`) and then reference them as `$PORT`.
- In `justfile`, use big-endian recipe names prefixed with `site-`: `site-serve`, `site-test`, `site-lint`, `site-check`.
- NEVER run `git add .`, `git add -A`, or `git add --all`; always check `git status` and stage explicit file paths (`git add <file1> <file2>`).
- Read-only reference planners live at `docs/reference-planners/` (`bazz_fuss_breadboard_layout.html`, `stage2_woolly_mammoth_bass_fuzz.html`, `stage3_tl072_bass_clean_blend.html`, `stage4_svt_cmos_baxandall_drive.html`, `stage5a_vactrol_bass_envelope_filter.html`, `stage5b_optical_bass_compressor.html`, `stage6_cd4013_bass_sub_octave.html`, and `bass_effects_curriculum_and_bom.md`). Never modify those reference files or any file outside this Git worktree.

---

### Task 1: Repository Tooling, Static Gate, Local Server, and GitHub Pages CI

**Files:**
- Create: `.gitignore`
- Create: `AGENTS.md`
- Create: `README.md`
- Create: `justfile`
- Create: `.github/workflows/pages.yml`
- Create: `scripts/check_site.mjs`
- Create: `scripts/serve_local.mjs`
- Test: `tests/check-site.test.mjs`

**Interfaces:**
- Consumes: Node 22 built-ins (`node:fs`, `node:path`, `node:http`, `node:url`, `node:child_process`).
- Produces:
  - `scripts/check_site.mjs`:
    - `export function scanTextForViolations(relPath, content)` returning `string[]` of human-readable violation messages (checks Unicode emojis across all text files; checks `.css` files for `:root` selectors and `font-size` `< 12px`; checks `site/` `.html`/`.js`/`.css` files for `font-size` `< 12px` in attributes/styles and external `https?://` URLs except `http://www.w3.org/2000/svg` and `http://www.w3.org/1999/xhtml`).
    - `export function checkModuleImports(siteJsDir)` returning `string[]` of unresolved relative ES module specifiers across `site/js/**/*.js` (returns `[]` if `siteJsDir` does not exist yet).
    - `export function checkRepository(rootDir)` returning `{ ok: boolean, violations: string[] }` scanning all non-ignored files under `rootDir` (skipping `.git/` and `.superpowers/`).
  - `scripts/serve_local.mjs`:
    - `export function createStaticServer(siteDir)` returning an `http.Server` serving static files from `siteDir` with MIME types (`text/html; charset=utf-8`, `text/css; charset=utf-8`, `text/javascript; charset=utf-8`, `image/svg+xml`, `application/json; charset=utf-8`), mapping `/` to `index.html`, rejecting `..` path traversal outside `siteDir` with `403`, and serving `404.html` (if present) with HTTP `404` on missing paths.

- [ ] **Step 1: Write the failing test in `tests/check-site.test.mjs`**

Create `tests/check-site.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanTextForViolations, checkModuleImports, checkRepository } from '../scripts/check_site.mjs';
import { createStaticServer } from '../scripts/serve_local.mjs';

test('scanTextForViolations flags emojis, :root CSS, sub-12px fonts, and external CDN URLs', () => {
  const emojiChar = String.fromCodePoint(0x1F525);
  const emojiHits = scanTextForViolations('site/index.html', `<p>Hot fuzz ${emojiChar}</p>`);
  assert.equal(emojiHits.some((v) => v.includes('emoji')), true);

  const rootHits = scanTextForViolations('site/css/workbench.css', ':root { --bg: #000; }\nbody { font-size: 11px; }');
  assert.equal(rootHits.some((v) => v.includes(':root')), true);
  assert.equal(rootHits.some((v) => v.includes('12px')), true);

  const svgFontHits = scanTextForViolations('site/js/breadboard-svg.js', '<text font-size="10">A1</text>');
  assert.equal(svgFontHits.some((v) => v.includes('12px')), true);

  const svgNsClean = scanTextForViolations('site/js/breadboard-svg.js', '<svg xmlns="http://www.w3.org/2000/svg" font-size="12"></svg>');
  assert.deepEqual(svgNsClean, []);

  const cdnHits = scanTextForViolations('site/index.html', '<script src="https://cdn.example.com/lib.js"></script>');
  assert.equal(cdnHits.some((v) => v.includes('external URL')), true);
});

test('checkModuleImports detects missing relative imports and passes valid ones', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbl-check-'));
  try {
    const jsDir = path.join(tmp, 'site', 'js');
    fs.mkdirSync(jsDir, { recursive: true });
    fs.writeFileSync(path.join(jsDir, 'a.js'), "import { x } from './b.js';\nimport { y } from './missing.js';\nexport const z = x + y;\n");
    fs.writeFileSync(path.join(jsDir, 'b.js'), 'export const x = 1;\n');

    const errs = checkModuleImports(jsDir);
    assert.equal(errs.length, 1);
    assert.match(errs[0], /missing\.js/);

    const repoResult = checkRepository(tmp);
    assert.equal(repoResult.ok, false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('createStaticServer serves index.html, blocks traversal, and returns 404 for unknown files', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbl-srv-'));
  fs.writeFileSync(path.join(tmp, 'index.html'), '<!doctype html><title>Lab</title>');
  fs.writeFileSync(path.join(tmp, '404.html'), '<!doctype html><title>Not Found</title>');
  const server = createStaticServer(tmp);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const okRes = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(okRes.status, 200);
    assert.match(okRes.headers.get('content-type') || '', /text\/html/);
    assert.match(await okRes.text(), /Lab/);

    const missRes = await fetch(`http://127.0.0.1:${port}/nope.html`);
    assert.equal(missRes.status, 404);
    assert.match(await missRes.text(), /Not Found/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run `node --test tests/check-site.test.mjs` to verify RED failure**

Run:
```bash
node --test tests/check-site.test.mjs
```
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../scripts/check_site.mjs`.

- [ ] **Step 3: Create `.gitignore`, `AGENTS.md`, `README.md`, `justfile`, `.github/workflows/pages.yml`, `scripts/check_site.mjs`, and `scripts/serve_local.mjs`**

Create `.gitignore`:
```gitignore
.superpowers/
node_modules/
.DS_Store
*.log
coverage/
```

Create `justfile`:
```just
set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

site-serve port="8765":
    PORT="{{port}}" node scripts/serve_local.mjs

site-test:
    node --test tests/*.test.mjs

site-lint:
    node scripts/check_site.mjs

site-check: site-lint site-test
```

Create `.github/workflows/pages.yml`:
```yaml
name: Deploy Bass Breadboard Lab to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Run static site verification gate
        run: node scripts/check_site.mjs

      - name: Run automated test suites
        run: node --test tests/*.test.mjs

      - name: Configure GitHub Pages
        uses: actions/configure-pages@v5

      - name: Upload static site artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./site

  deploy:
    needs: build-and-verify
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Create `scripts/check_site.mjs`:
```js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_EXTENSIONS = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.svg', '.txt'
]);
const IGNORED_DIRS = new Set(['.git', '.superpowers', 'node_modules']);
const ALLOWED_EXTERNAL_URLS = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xhtml'
]);

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const ROOT_SELECTOR_RE = /(?:^|[\s,}])\:root(?=[\s,{])/m;
const CSS_FONT_SIZE_RE = /font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)px/gi;
const ATTR_FONT_SIZE_RE = /font-size\s*=\s*["']([0-9]+(?:\.[0-9]+)?)(?:px)?["']/gi;
const CANVAS_FONT_RE = /\b([0-9]+(?:\.[0-9]+)?)px\s+(?:ui-monospace|monospace|system-ui|sans-serif|Inter|JetBrains)/gi;
const URL_RE = /https?:\/\/[^\s"'`)<>]+/g;
const IMPORT_RE = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;

export function scanTextForViolations(relPath, content) {
  const violations = [];
  const normPath = relPath.replace(/\\/g, '/');

  if (EMOJI_RE.test(content)) {
    const match = content.match(EMOJI_RE);
    const codePoint = match ? match[0].codePointAt(0).toString(16).toUpperCase() : 'UNKNOWN';
    violations.push(`${normPath}: contains forbidden Unicode emoji U+${codePoint}`);
  }

  if (normPath.endsWith('.css') && ROOT_SELECTOR_RE.test(content)) {
    violations.push(`${normPath}: contains forbidden :root selector; scope tokens to html[data-theme="dark"] and html[data-theme="light"]`);
  }

  if (normPath.startsWith('site/') || normPath.endsWith('.css')) {
    for (const match of content.matchAll(CSS_FONT_SIZE_RE)) {
      if (Number(match[1]) < 12) {
        violations.push(`${normPath}: CSS font-size ${match[1]}px is below the 12px minimum`);
      }
    }
    for (const match of content.matchAll(ATTR_FONT_SIZE_RE)) {
      if (Number(match[1]) < 12) {
        violations.push(`${normPath}: attribute font-size ${match[1]} is below the 12px minimum`);
      }
    }
    for (const match of content.matchAll(CANVAS_FONT_RE)) {
      if (Number(match[1]) < 12) {
        violations.push(`${normPath}: canvas font ${match[1]}px is below the 12px minimum`);
      }
    }
  }

  if (normPath.startsWith('site/')) {
    for (const match of content.matchAll(URL_RE)) {
      const cleaned = match[0].replace(/[.;,]+$/, '');
      if (!ALLOWED_EXTERNAL_URLS.has(cleaned)) {
        violations.push(`${normPath}: contains forbidden external URL ${cleaned} inside site/`);
      }
    }
  }

  return violations;
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

export function checkModuleImports(siteJsDir) {
  const errors = [];
  if (!fs.existsSync(siteJsDir)) return errors;
  const files = walkFiles(siteJsDir).filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(IMPORT_RE)) {
      const spec = match[1];
      const resolved = path.resolve(path.dirname(file), spec);
      if (!fs.existsSync(resolved)) {
        errors.push(`${file}: unresolved relative import '${spec}' -> ${resolved}`);
      }
    }
  }
  return errors;
}

export function checkRepository(rootDir) {
  const violations = [];
  const files = walkFiles(rootDir);
  for (const file of files) {
    const base = path.basename(file);
    const ext = path.extname(file);
    if (!TEXT_EXTENSIONS.has(ext) && base !== 'justfile' && base !== '.gitignore') {
      continue;
    }
    const rel = path.relative(rootDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    violations.push(...scanTextForViolations(rel, content));
  }
  violations.push(...checkModuleImports(path.join(rootDir, 'site', 'js')));
  return { ok: violations.length === 0, violations };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = checkRepository(rootDir);
  if (!result.ok) {
    console.error('Static site check failed:');
    for (const v of result.violations) {
      console.error(`  - ${v}`);
    }
    process.exit(1);
  }
  console.log('Static site check passed: 0 violations.');
}
```

Create `scripts/serve_local.mjs`:
```js
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

export function createStaticServer(siteDir) {
  const resolvedRoot = path.resolve(siteDir);

  return http.createServer((req, res) => {
    const rawUrl = req.url || '/';
    const pathname = decodeURIComponent(rawUrl.split('?')[0]);
    const relTarget = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const candidate = path.resolve(resolvedRoot, relTarget);

    if (candidate !== resolvedRoot && !candidate.startsWith(resolvedRoot + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    let finalPath = candidate;
    if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
      finalPath = path.join(finalPath, 'index.html');
    }

    if (fs.existsSync(finalPath) && fs.statSync(finalPath).isFile()) {
      const ext = path.extname(finalPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(finalPath).pipe(res);
      return;
    }

    const notFoundPage = path.join(resolvedRoot, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    if (fs.existsSync(notFoundPage)) {
      fs.createReadStream(notFoundPage).pipe(res);
    } else {
      res.end('<!doctype html><title>404 Not Found</title><p>Not Found</p>');
    }
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT || 8765);
  const host = process.env.HOST || '0.0.0.0';
  const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
  const server = createStaticServer(siteDir);
  server.listen(port, host, () => {
    console.log(`Bass Breadboard Lab listening on http://localhost:${port} (bound ${host}:${port})`);
  });
}
```

Create `AGENTS.md` and `README.md` documenting:
- Worktree layout (`bass_breadboard_lab__worktrees/main` and sibling `<category>__<description>` worktrees, never `/` in branch names, never `feat` prefix).
- Explicit file staging rule (`git add <file1> <file2>`; never `git add .`, `-A`, or `--all`).
- Zero-emoji and dark-mode-default (`html[data-theme="dark"]`) rules.
- Environment variable convention (`PORT="8765"` defined first, then `$PORT`) and `just site-serve`, `just site-test`, `just site-lint`, `just site-check`.

- [ ] **Step 4: Run `just site-check` to verify GREEN**

Run:
```bash
just site-check
```
Expected: `Static site check passed: 0 violations.` and all 3 tests in `tests/check-site.test.mjs` PASS.

- [ ] **Step 5: Commit Task 1**

Run:
```bash
git status
git add .gitignore AGENTS.md README.md justfile .github/workflows/pages.yml scripts/check_site.mjs scripts/serve_local.mjs tests/check-site.test.mjs
git commit -m "Add repository tooling, static check gate, local server, and Pages workflow"
```

---

### Task 2: Persistent Store, Hash Router, Curriculum Metadata, and Master BOM Module

**Files:**
- Create: `site/js/store.js`
- Create: `site/js/router.js`
- Create: `site/js/data/curriculum.js`
- Create: `site/js/data/bom.js`
- Test: `tests/store-and-bom.test.mjs`

**Interfaces:**
- Consumes: `docs/reference-planners/bass_effects_curriculum_and_bom.md` (read-only source for the 41 master BOM items across 5 categories and syllabus metadata).
- Produces:
  - `site/js/store.js`:
    - `export const STORAGE_KEY = 'bass_breadboard_lab:v1';`
    - `export function createDefaultState()` -> `{ version: 1, theme: 'dark', preferredRiffId: 'groove', bomOwnedIds: [], stagePartChecks: {}, completedStages: [] }`
    - `export function createStore(storageBackend)` -> `{ getState(), subscribe(listener), setTheme(theme), setPreferredRiffId(riffId), toggleBomOwned(itemId), setBomOwnedBatch(itemIds, owned), isPartChecked(stageSlug, partId), togglePartChecked(stageSlug, partId), resetStageChecks(stageSlug), toggleStageCompleted(stageSlug), isStageCompleted(stageSlug), resetAllProgress(), isUsingMemoryFallback() }`
  - `site/js/router.js`:
    - `export const STAGE_SLUGS = ['1', '2', '3', '4', '5a', '5b', '6'];`
    - `export function parseHash(hashString)` -> `{ view: 'home', slug: null, invalid: boolean } | { view: 'bom', slug: null, invalid: false } | { view: 'stage', slug: string, invalid: false }`
    - `export function formatStageHash(slug)` -> `'#/stage/' + slug`
    - `export function createRouter(win)` -> `{ currentRoute(), navigate(hash), start(onRouteChange), stop() }`
  - `site/js/data/curriculum.js`:
    - `export const STAGE_ROADMAP` (7 ordered entries matching `STAGE_SLUGS` with `{ slug, stageNumber, shortLabel, title, topology, headlinePart, phaseDegrees, previousStageSlug, summary, bassFocus, learnings }`)
    - `export const PASSIVE_PICKUP_PRIMER` (array of 4 reference cards: `High-Z Passive Pickup Loading`, `Sub-Bass Coupling Capacitor Cutoff`, `Coppersound Ground-Sleeve Polarity Rule`, and `Three-Block Analog Bass Synth Chain`)
  - `site/js/data/bom.js`:
    - `export const BOM_CATEGORIES` (`semiconductors`, `pots_optical`, `film_caps`, `electrolytic_ceramic`, `resistors`)
    - `export const BOM_ITEMS` (all 41 rows from `bass_effects_curriculum_and_bom.md` lines 63-127 with `{ id, category, part, qty, packageOrTaper, stages, role }`)
    - `export function filterBomItems(items, { stageFilter = 'all', category = 'all', hideOwned = false, ownedIds = [] } = {})`
    - `export function formatBomPlainText(items, ownedIds = [])`
    - `export function formatBomMarkdown(items, ownedIds = [])`

- [ ] **Step 1: Write the failing test in `tests/store-and-bom.test.mjs`**

Create `tests/store-and-bom.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, createStore } from '../site/js/store.js';
import { STAGE_SLUGS, parseHash, formatStageHash } from '../site/js/router.js';
import { STAGE_ROADMAP, PASSIVE_PICKUP_PRIMER } from '../site/js/data/curriculum.js';
import { BOM_CATEGORIES, BOM_ITEMS, filterBomItems, formatBomPlainText, formatBomMarkdown } from '../site/js/data/bom.js';

function makeMockStorage(initial = {}, throwOnWrite = false) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) {
      if (throwOnWrite) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      map.set(k, String(v));
    }
  };
}

test('store persists versioned state, recovers from corrupt JSON, and falls back to memory on quota throw', () => {
  const backing = makeMockStorage();
  const store = createStore(backing);
  assert.equal(store.getState().theme, 'dark');

  store.setTheme('light');
  store.toggleBomOwned('semi_mpsa13');
  store.togglePartChecked('1', 'R_PWR');
  store.togglePartChecked('1', 'C1');
  store.toggleStageCompleted('1');

  const reloaded = createStore(backing);
  assert.equal(reloaded.getState().theme, 'light');
  assert.deepEqual(reloaded.getState().bomOwnedIds, ['semi_mpsa13']);
  assert.equal(reloaded.isPartChecked('1', 'R_PWR'), true);
  assert.equal(reloaded.isStageCompleted('1'), true);

  reloaded.resetStageChecks('1');
  assert.equal(reloaded.isPartChecked('1', 'R_PWR'), false);
  assert.equal(reloaded.isStageCompleted('1'), true);

  reloaded.resetAllProgress();
  assert.equal(reloaded.getState().theme, 'light');
  assert.deepEqual(reloaded.getState().bomOwnedIds, []);
  assert.deepEqual(reloaded.getState().completedStages, []);

  const corruptBacking = makeMockStorage({ [STORAGE_KEY]: '{not-json' });
  const recovered = createStore(corruptBacking);
  assert.equal(recovered.getState().version, 1);
  assert.equal(recovered.getState().theme, 'dark');

  const quotaStore = createStore(makeMockStorage({}, true));
  quotaStore.toggleBomOwned('cap_470nf');
  assert.equal(quotaStore.isUsingMemoryFallback(), true);
  assert.deepEqual(quotaStore.getState().bomOwnedIds, ['cap_470nf']);
});

test('router parses all valid routes and normalizes unknown hashes to home', () => {
  assert.deepEqual(parseHash(''), { view: 'home', slug: null, invalid: false });
  assert.deepEqual(parseHash('#/'), { view: 'home', slug: null, invalid: false });
  assert.deepEqual(parseHash('#/bom'), { view: 'bom', slug: null, invalid: false });
  for (const slug of STAGE_SLUGS) {
    assert.deepEqual(parseHash(formatStageHash(slug)), { view: 'stage', slug, invalid: false });
  }
  assert.deepEqual(parseHash('#/stage/99'), { view: 'home', slug: null, invalid: true });
  assert.deepEqual(parseHash('#/unknown/route'), { view: 'home', slug: null, invalid: true });
});

test('curriculum roadmap and 41-item BOM filter and export cleanly', () => {
  assert.equal(STAGE_ROADMAP.length, 7);
  assert.equal(PASSIVE_PICKUP_PRIMER.length, 4);
  assert.equal(BOM_CATEGORIES.length, 5);
  assert.equal(BOM_ITEMS.length, 41);

  const stage4Only = filterBomItems(BOM_ITEMS, { stageFilter: '4' });
  assert.equal(stage4Only.some((item) => item.part.includes('CD4049UBE')), true);
  assert.equal(stage4Only.some((item) => item.part.includes('CD4013BE')), false);

  const unownedStage1 = filterBomItems(BOM_ITEMS, {
    stageFilter: '1',
    hideOwned: true,
    ownedIds: [BOM_ITEMS[0].id]
  });
  assert.equal(unownedStage1.some((item) => item.id === BOM_ITEMS[0].id), false);

  const plain = formatBomPlainText(stage4Only.slice(0, 3), [stage4Only[0].id]);
  assert.match(plain, /\[x\]/);
  assert.match(plain, /\[ \]/);

  const md = formatBomMarkdown(stage4Only.slice(0, 3), [stage4Only[0].id]);
  assert.match(md, /- \[x\]/);
  assert.match(md, /- \[ \]/);
});
```

- [ ] **Step 2: Run `node --test tests/store-and-bom.test.mjs` to verify RED failure**

Run:
```bash
node --test tests/store-and-bom.test.mjs
```
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../site/js/store.js`.

- [ ] **Step 3: Implement `site/js/store.js`, `site/js/router.js`, `site/js/data/curriculum.js`, and `site/js/data/bom.js`**

Implement each file matching the exact interfaces above:
- In `site/js/store.js`, validate `parsed && typeof parsed === 'object' && parsed.version === 1`, sanitize arrays (`bomOwnedIds`, `completedStages`), sanitize `theme` (`'dark'` or `'light'`), sanitize `preferredRiffId` (`'groove'`, `'slap'`, `'sustain'`, `'upperSynth'`), and wrap `getItem`/`setItem` in `try/catch` setting `memoryFallback = true` on storage errors.
- In `site/js/router.js`, normalize `#/stage/5A` case-insensitively to `'5a'` and `'5b'`, treat `''`, `'#'`, and `'#/'` as `{ view: 'home', slug: null, invalid: false }`, and on `start(onRouteChange)` normalize `invalid: true` hashes to `'#/'` without throwing.
- In `site/js/data/curriculum.js`, encode the 7 stages (`'1'`, `'2'`, `'3'`, `'4'`, `'5a'`, `'5b'`, `'6'`) with `previousStageSlug` chain (`null`, `'1'`, `'2'`, `'3'`, `'4'`, `'5a'`, `'5b'`) and `phaseDegrees` (`180`, `0`, `0`, `0`, `180`, `0`, `0`), plus the 4 passive-pickup primer cards.
- In `site/js/data/bom.js`, transcribe all 41 items from `docs/reference-planners/bass_effects_curriculum_and_bom.md` (`10` semiconductors/ICs, `6` potentiometers/optical parts, `7` `5mm` box film capacitors, `5` radial electrolytic/ceramic capacitors, and `13` `1/4W` `1%` metal film resistors) with explicit `stages` arrays (using `'1'`, `'2'`, `'3'`, `'4'`, `'5a'`, `'5b'`, `'6'`) so `stageFilter` matches accurately.

- [ ] **Step 4: Run `just site-check` to verify GREEN**

Run:
```bash
just site-check
```
Expected: `0` static violations and all tests in `tests/check-site.test.mjs` and `tests/store-and-bom.test.mjs` PASS.

- [ ] **Step 5: Commit Task 2**

Run:
```bash
git status
git add site/js/store.js site/js/router.js site/js/data/curriculum.js site/js/data/bom.js tests/store-and-bom.test.mjs
git commit -m "Add persistent localStorage store, hash router, curriculum roadmap, and BOM data"
```

---

### Task 3: Passive-Bass Riff Synth, Breadboard Validator and Diff Engine, and Stages 1-3 Modules

**Files:**
- Create: `site/js/riffs.js`
- Create: `site/js/breadboard-diff.js`
- Create: `site/js/data/stages/stage1-bazz-fuss.js`
- Create: `site/js/data/stages/stage2-woolly-mammoth.js`
- Create: `site/js/data/stages/stage3-tl072-clean-blend.js`
- Test: `tests/stages-1-to-3.test.mjs`

**Interfaces:**
- Consumes: Read-only reference netlists and `createStageDSP` implementations in:
  - `docs/reference-planners/bazz_fuss_breadboard_layout.html` (lines 206-760 and 1230-1325)
  - `docs/reference-planners/stage2_woolly_mammoth_bass_fuzz.html` (lines 209-870 and 1147-1385)
  - `docs/reference-planners/stage3_tl072_bass_clean_blend.html` (lines 200-910 and 1363-1455)
- Produces:
  - `site/js/riffs.js`:
    - `export const RIFF_CATALOG` (`[{ id: 'groove', label: 'Riff 1: Finger Groove', ... }, { id: 'slap', ... }, { id: 'sustain', ... }, { id: 'upperSynth', ... }]`)
    - `export function onePoleAlpha(fc, fs)`
    - `export function createPassiveBassRiffs(sampleRate)` -> `{ groove, slap, sustain, upperSynth, singlePluck }` (`Float32Array` buffers)
  - `site/js/breadboard-diff.js`:
    - `export const VALID_HEADERS = new Set(['HDR_IN', 'HDR_OUT', 'HDR_9V', 'HDR_GND']);`
    - `export function getPartPins(part)` -> `string[]` (`Array.isArray(part.pins) ? [...part.pins] : [part.from, part.to].filter(Boolean)`)
    - `export function classifyPinToken(pin)` -> `{ kind: 'hole', col, row, strip } | { kind: 'rail', rail, row, strip } | { kind: 'header', id, strip } | { kind: 'invalid', raw }`
      - Holes match `/^([A-J])([1-9]|[12][0-9]|30)$/` (`A..E` -> strip `'TOP_ROW_' + row`, `F..J` -> strip `'BOT_ROW_' + row`).
      - Rails match `/^(TOP|BOT)_(PLUS|MINUS)_([1-9]|[12][0-9]|30)$/` (`strip` -> `'TOP_PLUS'`, `'TOP_MINUS'`, `'BOT_PLUS'`, `'BOT_MINUS'`).
      - Headers match `VALID_HEADERS` (`strip` -> `pin`).
    - `export function getStripKeyForPin(pin)` -> `string | null`
    - `export function validateStageParts(parts)` -> `{ valid: boolean, errors: string[], holeOwners: Map<string, string> }`
    - `export function traceConnectedNet(parts, seed)` -> `{ strips: Set<string>, pins: Set<string>, partIds: Set<string> }` where `seed` is a pin token or `part.id`; propagates electrical continuity through `part.type === 'wire'` jumpers across strips and rails, and lists every `part.id` with at least one pin on the connected strips.
    - `export function computeBreadboardDiff(previousParts, currentParts)` -> `{ unchanged: object[], modified: Array<{ id: string, part: object, previousPart: object, fromPins: string[], toPins: string[], fromValue: string, toValue: string }>, added: object[], removed: object[], statusById: Map<string, string> }`
  - `site/js/data/stages/stage1-bazz-fuss.js`, `stage2-woolly-mammoth.js`, `stage3-tl072-clean-blend.js`:
    - Each exports `stageDescriptor` conforming to the Spec Stage Data Contract:
      - `{ slug, stageNumber, title, subtitle, previousStageSlug, phaseDegrees, summary, defaultPresetId, defaultModeId, presets, modes, buildComponents(preset, mode), audioSpec: { defaultRiffId, hint, knobs, createDSP(sampleRate, getState) }, theoryNotes }`
      - Note on `createDSP(sampleRate, getState)`: `getState()` returns `{ presetId, modeId, knobs }` dynamically so live knob movements and preset/mode switches immediately update DSP parameters without recreating buffers.
      - Normalize Stage 3 `IC1` (`dip8`) to `{ id: 'IC1', type: 'dipN', ref: 'IC1', tag: 'IC1', chipLabel: 'TL072', startCol: 13, spanCols: 4, value: 'TL072 Dual JFET Op-Amp', pins: ['E13', 'E14', 'E15', 'E16', 'F16', 'F15', 'F14', 'F13'], role: ... }` so `breadboard-svg.js` renders all DIP packages (`8`, `14`, `16`) uniformly, and ensure every `transistor` and `pot` carries `tag` (`p.tag || p.ref || p.id`).

- [ ] **Step 1: Write the failing test in `tests/stages-1-to-3.test.mjs`**

Create `tests/stages-1-to-3.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPassiveBassRiffs } from '../site/js/riffs.js';
import { validateStageParts, computeBreadboardDiff, traceConnectedNet } from '../site/js/breadboard-diff.js';
import { stageDescriptor as stage1 } from '../site/js/data/stages/stage1-bazz-fuss.js';
import { stageDescriptor as stage2 } from '../site/js/data/stages/stage2-woolly-mammoth.js';
import { stageDescriptor as stage3 } from '../site/js/data/stages/stage3-tl072-clean-blend.js';

test('createPassiveBassRiffs synthesizes finite bounded Float32Arrays', () => {
  const riffs = createPassiveBassRiffs(48000);
  for (const key of ['groove', 'slap', 'sustain', 'upperSynth', 'singlePluck']) {
    const buf = riffs[key];
    assert.equal(buf instanceof Float32Array, true);
    assert.equal(buf.length > 48000, true);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) {
      assert.equal(Number.isFinite(buf[i]), true);
      peak = Math.max(peak, Math.abs(buf[i]));
    }
    assert.equal(peak > 0.4 && peak < 0.99, true);
  }
});

test('Stages 1, 2, and 3 pass pin validation with zero hole collisions across all presets and modes', () => {
  for (const stage of [stage1, stage2, stage3]) {
    for (const preset of Object.values(stage.presets)) {
      for (const mode of Object.values(stage.modes)) {
        const parts = stage.buildComponents(preset, mode);
        const check = validateStageParts(parts);
        assert.equal(check.valid, true, `${stage.stageNumber} ${preset.id}/${mode.id}: ${check.errors.join('; ')}`);
      }
    }
  }
});

test('Stage 1 to Stage 2 diff keeps Row 1-4 power filter unchanged, removes D1, and adds Q2', () => {
  const s1Parts = stage1.buildComponents(stage1.presets[stage1.defaultPresetId], stage1.modes[stage1.defaultModeId]);
  const s2Parts = stage2.buildComponents(stage2.presets[stage2.defaultPresetId], stage2.modes[stage2.defaultModeId]);

  const selfDiff = computeBreadboardDiff(s1Parts, s1Parts);
  assert.equal(selfDiff.unchanged.length, s1Parts.length);
  assert.equal(selfDiff.modified.length, 0);
  assert.equal(selfDiff.added.length, 0);
  assert.equal(selfDiff.removed.length, 0);

  const s1ToS2 = computeBreadboardDiff(s1Parts, s2Parts);
  const unchangedIds = new Set(s1ToS2.unchanged.map((p) => p.id));
  for (const pwrId of ['J_GND_HDR', 'J_GND_BRIDGE', 'J_9V_HDR', 'R_PWR', 'C_PWR']) {
    assert.equal(unchangedIds.has(pwrId), true, `expected ${pwrId} unchanged`);
  }
  assert.equal(s1ToS2.removed.some((p) => p.id === 'D1'), true);
  assert.equal(s1ToS2.added.some((p) => p.id === 'Q2'), true);

  const gndNet = traceConnectedNet(s2Parts, 'HDR_GND');
  assert.equal(gndNet.strips.has('TOP_MINUS'), true);
  assert.equal(gndNet.strips.has('BOT_MINUS'), true);
});
```

- [ ] **Step 2: Run `node --test tests/stages-1-to-3.test.mjs` to verify RED failure**

Run:
```bash
node --test tests/stages-1-to-3.test.mjs
```
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../site/js/riffs.js`.

- [ ] **Step 3: Implement `site/js/riffs.js`, `site/js/breadboard-diff.js`, and Stage 1, 2, and 3 data modules**

Port the verified synthesis, netlist, and `96 kHz` (`2x`-oversampled) DSP math from the three read-only HTML artifacts:
- `site/js/riffs.js`: port `createPassiveBassRiffs(sampleRate)` and `onePoleAlpha(fc, fs)` from `stage2_woolly_mammoth_bass_fuzz.html:1147-1296`. Replace any bullet characters if needed with plain ASCII separators (`|`), and ensure zero emojis.
- `site/js/breadboard-diff.js`: implement `getPartPins`, `classifyPinToken`, `getStripKeyForPin`, `validateStageParts`, `traceConnectedNet` (BFS across `part.type === 'wire'` jumper bridges), and `computeBreadboardDiff` (`unchanged`, `modified`, `added`, `removed`, `statusById`).
- `site/js/data/stages/stage1-bazz-fuss.js`: port all 3 presets (`npn_mpsa13` as `defaultPresetId` since passive bass is primary, `pnp_2n3906`, `pnp_ac128`) and 3 modes (`stock` as `defaultModeId`, `treble_cut`, `hard_clip`), exact `buildComponents(preset, mode)`, `audioSpec` (`knobs`, `createDSP(sampleRate, getState)`), and 3 concise `theoryNotes`.
- `site/js/data/stages/stage2-woolly-mammoth.js`: port all 3 presets (`npn_passive` as `defaultPresetId`, `npn_active`, `pnp_flip`) and 2 modes (`max_wool` as `defaultModeId`, `tamed_wool`), exact `buildComponents(preset, mode)`, `audioSpec`, and `theoryNotes`.
- `site/js/data/stages/stage3-tl072-clean-blend.js`: port all 3 presets (`full_blend`, `biamp_crossover` as `defaultPresetId`, `phase_trap`) and `modes: { standard: { id: 'standard', label: 'Standard TL072 Layout' } }`, normalizing `IC1` to `type: 'dipN', startCol: 13, spanCols: 4, chipLabel: 'TL072'`, exact `audioSpec`, and `theoryNotes`.

- [ ] **Step 4: Run `just site-check` to verify GREEN**

Run:
```bash
just site-check
```
Expected: `0` static violations and all tests in `check-site`, `store-and-bom`, and `stages-1-to-3` PASS.

- [ ] **Step 5: Commit Task 3**

Run:
```bash
git status
git add site/js/riffs.js site/js/breadboard-diff.js site/js/data/stages/stage1-bazz-fuss.js site/js/data/stages/stage2-woolly-mammoth.js site/js/data/stages/stage3-tl072-clean-blend.js tests/stages-1-to-3.test.mjs
git commit -m "Add passive-bass riff synthesizer, breadboard diff engine, and Stages 1-3 modules"
```

---

### Task 4: Stages 4, 5A, 5B, and 6 Modules, Stage Registry, and Full Netlist and DSP Verification Suites

**Files:**
- Create: `site/js/data/stages/stage4-svt-cmos-drive.js`
- Create: `site/js/data/stages/stage5a-vactrol-filter.js`
- Create: `site/js/data/stages/stage5b-optical-compressor.js`
- Create: `site/js/data/stages/stage6-cd4013-sub-octave.js`
- Create: `site/js/data/stages/index.js`
- Create: `tests/netlist-and-diff.test.mjs`
- Create: `tests/audio-dsp.test.mjs`

**Interfaces:**
- Consumes:
  - `onePoleAlpha` from `site/js/riffs.js`
  - Read-only reference planners:
    - `docs/reference-planners/stage4_svt_cmos_baxandall_drive.html` (lines 192-628 and 1004-1095)
    - `docs/reference-planners/stage5a_vactrol_bass_envelope_filter.html` (lines 189-580 and 971-1065)
    - `docs/reference-planners/stage5b_optical_bass_compressor.html` (lines 189-554 and 945-1035)
    - `docs/reference-planners/stage6_cd4013_bass_sub_octave.html` (lines 189-653 and 1028-1120)
- Produces:
  - `site/js/data/stages/stage4-svt-cmos-drive.js`, `stage5a-vactrol-filter.js`, `stage5b-optical-compressor.js`, `stage6-cd4013-sub-octave.js` (each exporting `stageDescriptor`)
  - `site/js/data/stages/index.js`:
    - `export const ORDERED_STAGES = [stage1, stage2, stage3, stage4, stage5a, stage5b, stage6];`
    - `export const STAGES_BY_SLUG = Object.fromEntries(ORDERED_STAGES.map((s) => [s.slug, s]));`
    - `export function getStage(slug)` -> `stageDescriptor | null`
    - `export function getStageParts(slug, presetId, modeId)` -> `object[]`
    - `export function getStageDefaultParts(slug)` -> `object[]`
    - `export function getDiffAgainstPrevious(slug, presetId, modeId)` -> `null | { previousStage: object, diff: object }`

- [ ] **Step 1: Write the failing full-curriculum tests in `tests/netlist-and-diff.test.mjs` and `tests/audio-dsp.test.mjs`**

Create `tests/netlist-and-diff.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDERED_STAGES, getStageParts, getDiffAgainstPrevious } from '../site/js/data/stages/index.js';
import { validateStageParts } from '../site/js/breadboard-diff.js';

test('all 7 stages validate cleanly with zero breadboard hole collisions across every preset and mode', () => {
  assert.deepEqual(ORDERED_STAGES.map((s) => s.slug), ['1', '2', '3', '4', '5a', '5b', '6']);
  for (const stage of ORDERED_STAGES) {
    for (const preset of Object.values(stage.presets)) {
      for (const mode of Object.values(stage.modes)) {
        const parts = getStageParts(stage.slug, preset.id, mode.id);
        const res = validateStageParts(parts);
        assert.equal(res.valid, true, `Stage ${stage.slug} (${preset.id}/${mode.id}): ${res.errors.join(', ')}`);
      }
    }
  }
});

test('stage-to-stage transition diffs preserve shared power and Stage 5A->5B Rows 1-15 backbone', () => {
  assert.equal(getDiffAgainstPrevious('1'), null);

  for (const slug of ['2', '3', '4', '5a', '5b', '6']) {
    const transition = getDiffAgainstPrevious(slug);
    assert.ok(transition, `expected transition for stage ${slug}`);
    const unchangedIds = new Set(transition.diff.unchanged.map((p) => p.id));
    for (const pwrId of ['J_GND_HDR', 'J_GND_BRIDGE', 'J_9V_HDR', 'R_PWR', 'C_PWR']) {
      assert.equal(unchangedIds.has(pwrId), true, `stage ${slug} must keep ${pwrId} unchanged`);
    }
  }

  const s5Transition = getDiffAgainstPrevious('5b');
  const s5Unchanged = new Set(s5Transition.diff.unchanged.map((p) => p.id));
  for (const backboneId of ['R_V1', 'R_V2', 'C_VREF', 'J_VREF_LINK', 'IC1', 'J_IC_VCC', 'J_IC_GND', 'J_IN', 'R_PD', 'C1', 'J_IN_PIN3', 'R_BIAS']) {
    assert.equal(s5Unchanged.has(backboneId), true, `Stage 5A->5B must keep ${backboneId} unchanged`);
  }
  const modifiedIds = new Set(s5Transition.diff.modified.map((m) => m.id));
  assert.equal(modifiedIds.has('VAC_LDR'), true, 'Stage 5A->5B must relocate VAC_LDR into Op-Amp A feedback');
});
```

Create `tests/audio-dsp.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPassiveBassRiffs } from '../site/js/riffs.js';
import { ORDERED_STAGES, STAGES_BY_SLUG } from '../site/js/data/stages/index.js';

function defaultKnobs(stage) {
  return Object.fromEntries(stage.audioSpec.knobs.map((k) => [k.id, k.val]));
}

function rms(arr, start = 0, end = arr.length) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += arr[i] * arr[i];
  return Math.sqrt(sum / Math.max(1, end - start));
}

function countRisingZeroCrossings(arr, start, end) {
  let crossings = 0;
  for (let i = start + 1; i < end; i++) {
    if (arr[i - 1] <= 0 && arr[i] > 0) crossings++;
  }
  return crossings;
}

test('all 7 stage DSP processors produce finite bounded audio and non-empty telemetry at 48 kHz', () => {
  const fs = 48000;
  const riffs = createPassiveBassRiffs(fs);
  const input = riffs.groove;

  for (const stage of ORDERED_STAGES) {
    const knobs = defaultKnobs(stage);
    const state = {
      presetId: stage.defaultPresetId,
      modeId: stage.defaultModeId,
      knobs
    };
    const dsp = stage.audioSpec.createDSP(fs, () => state);
    let peak = 0;
    for (let i = 0; i < 24000; i++) {
      const y = dsp.processSample(input[i]);
      assert.equal(Number.isFinite(y), true, `Stage ${stage.slug} NaN/Inf at sample ${i}`);
      peak = Math.max(peak, Math.abs(y));
    }
    assert.equal(peak >= 0.05 && peak <= 0.99, true, `Stage ${stage.slug} peak=${peak} out of [0.05, 0.99]`);
    const tel = dsp.getTelemetry();
    assert.equal(typeof tel === 'string' && tel.length > 0, true);
  }
});

test('Stage 2 PINCH gate silences decaying tail below 0.001 RMS at high pinch setting', () => {
  const fs = 48000;
  const stage2 = STAGES_BY_SLUG['2'];
  const state = {
    presetId: stage2.defaultPresetId,
    modeId: stage2.defaultModeId,
    knobs: { ...defaultKnobs(stage2), pinch: 0.92, volume: 0.7 }
  };
  const dsp = stage2.audioSpec.createDSP(fs, () => state);
  const out = new Float32Array(fs);
  for (let i = 0; i < fs; i++) {
    const env = i < 8000 ? 0.5 : 0.0004;
    const x = Math.sin((2 * Math.PI * 41.2 * i) / fs) * env;
    out[i] = dsp.processSample(x);
  }
  const tailRms = rms(out, 36000, 48000);
  assert.equal(tailRms < 0.001, true, `expected gated tail < 0.001 RMS, got ${tailRms}`);
});

test('Stage 3 phase_trap cancels low E1 fundamental by > 10 dB relative to full_blend at 50% blend', () => {
  const fs = 48000;
  const stage3 = STAGES_BY_SLUG['3'];
  const runLowSine = (presetId) => {
    const state = {
      presetId,
      modeId: stage3.defaultModeId,
      knobs: { ...defaultKnobs(stage3), drive: 0.0, blend: 0.5, volume: 0.8 }
    };
    const dsp = stage3.audioSpec.createDSP(fs, () => state);
    const out = new Float32Array(24000);
    for (let i = 0; i < out.length; i++) {
      out[i] = dsp.processSample(0.12 * Math.sin((2 * Math.PI * 41.2 * i) / fs));
    }
    return rms(out, 6000, 24000);
  };

  const inPhaseRms = runLowSine('full_blend');
  const outOfPhaseRms = runLowSine('phase_trap');
  const lossDb = 20 * Math.log10(inPhaseRms / Math.max(1e-9, outOfPhaseRms));
  assert.equal(lossDb > 10, true, `expected > 10 dB cancellation, got ${lossDb.toFixed(2)} dB`);
});

test('Stage 5B optical compressor reduces slap riff crest factor under high compression', () => {
  const fs = 48000;
  const riffs = createPassiveBassRiffs(fs);
  const slap = riffs.slap.subarray(0, 48000);
  const stage5b = STAGES_BY_SLUG['5b'];

  const runComp = (compVal) => {
    const state = {
      presetId: stage5b.defaultPresetId,
      modeId: stage5b.defaultModeId,
      knobs: { ...defaultKnobs(stage5b), comp: compVal, volume: 0.75 }
    };
    const dsp = stage5b.audioSpec.createDSP(fs, () => state);
    let pk = 0;
    const out = new Float32Array(slap.length);
    for (let i = 0; i < slap.length; i++) {
      out[i] = dsp.processSample(slap[i]);
      if (i > 2000) pk = Math.max(pk, Math.abs(out[i]));
    }
    return pk / Math.max(1e-6, rms(out, 2000, out.length));
  };

  const lightCrest = runComp(0.05);
  const heavyCrest = runComp(0.95);
  assert.equal(heavyCrest < lightCrest, true, `expected compressed crest ${heavyCrest} < ${lightCrest}`);
});

test('Stage 6 CD4013 divider halves frequency for -1 octave and quarters frequency for -2 octave', () => {
  const fs = 48000;
  const stage6 = STAGES_BY_SLUG['6'];
  const f0 = 82.41;

  const measureCrossings = (presetId) => {
    const state = {
      presetId,
      modeId: stage6.defaultModeId,
      knobs: { ...defaultKnobs(stage6), mix: 0.0, volume: 0.85 }
    };
    const dsp = stage6.audioSpec.createDSP(fs, () => state);
    const out = new Float32Array(fs);
    for (let i = 0; i < fs; i++) {
      out[i] = dsp.processSample(0.45 * Math.sin((2 * Math.PI * f0 * i) / fs));
    }
    return countRisingZeroCrossings(out, 12000, 48000);
  };

  const expectedInputCrossings = f0 * 0.75; // ~61.8 crossings in 0.75s
  const oct1Crossings = measureCrossings('oct1_warm');
  const oct2Crossings = measureCrossings('oct2_deep');

  assert.equal(Math.abs(oct1Crossings - expectedInputCrossings / 2) <= 3, true, `oct1 crossings=${oct1Crossings}`);
  assert.equal(Math.abs(oct2Crossings - expectedInputCrossings / 4) <= 3, true, `oct2 crossings=${oct2Crossings}`);
});
```

- [ ] **Step 2: Run `node --test tests/netlist-and-diff.test.mjs tests/audio-dsp.test.mjs` to verify RED failure**

Run:
```bash
node --test tests/netlist-and-diff.test.mjs tests/audio-dsp.test.mjs
```
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../site/js/data/stages/index.js`.

- [ ] **Step 3: Implement Stages 4, 5A, 5B, and 6 modules and `site/js/data/stages/index.js`**

Port the remaining 4 verified netlists and `96 kHz` DSP implementations:
- `site/js/data/stages/stage4-svt-cmos-drive.js`: port presets `svt_warm` (`defaultPresetId`), `doom_stack`, `red_llama_raw`, `previousStageSlug: '3'`, `phaseDegrees: 0`, exact `CD4049UBE` DIP-16 + `2N5088` buffer + Baxandall EQ netlist and `createDSP`.
- `site/js/data/stages/stage5a-vactrol-filter.js`: port presets `sub_quack` (`defaultPresetId`), `slap_funk`, `slow_swell`, `previousStageSlug: '4'`, `phaseDegrees: 180`, exact `TL072` + `VAC_LED` + `VAC_LDR` netlist and `createDSP`. Note: check knob `mix` convention carefully so telemetry and dry/wet mix match the HTML artifact verbatim.
- `site/js/data/stages/stage5b-optical-compressor.js`: port presets `studio_glue` (`defaultPresetId`), `slap_punch`, `sustain_wall`, `previousStageSlug: '5a'`, `phaseDegrees: 0`, exact `TL072` + relocated `VAC_LDR` feedback compressor netlist and `createDSP`.
- `site/js/data/stages/stage6-cd4013-sub-octave.js`: port presets `oct1_warm` (`defaultPresetId`), `oct2_deep`, `oct1_synth_sq`, `previousStageSlug: '5b'`, `phaseDegrees: 0`, exact `2N5088` + `TL072` + `CD4013BE` DIP-14 netlist and `createDSP` (check `mix` knob direction in `stage6_cd4013_bass_sub_octave.html:1040-1105`: `mix = 0` is `100% Sub` or check exact knob definition in `stage6_cd4013_bass_sub_octave.html` so `measureCrossings` with pure sub matches; if `stage6` uses `sub` / `clean` or `mix = 1.0` for `100% Sub`, inspect lines 900-1110 of `stage6_cd4013_bass_sub_octave.html` and match both the module and test knob key/direction accurately; similarly verify `stage3` `phase_trap` wet/dry cancellation ratio at low drive so `phase_trap` models the exact `180`-degree inverting path vs clean path cancellation).
- `site/js/data/stages/index.js`: export `ORDERED_STAGES`, `STAGES_BY_SLUG`, `getStage`, `getStageParts`, `getStageDefaultParts`, and `getDiffAgainstPrevious`.

- [ ] **Step 4: Run `just site-check` to verify GREEN**

Run:
```bash
just site-check
```
Expected: `0` static violations and all tests across `check-site`, `store-and-bom`, `stages-1-to-3`, `netlist-and-diff`, and `audio-dsp` PASS.

- [ ] **Step 5: Commit Task 4**

Run:
```bash
git status
git add site/js/data/stages/stage4-svt-cmos-drive.js site/js/data/stages/stage5a-vactrol-filter.js site/js/data/stages/stage5b-optical-compressor.js site/js/data/stages/stage6-cd4013-sub-octave.js site/js/data/stages/index.js tests/netlist-and-diff.test.mjs tests/audio-dsp.test.mjs
git commit -m "Add Stages 4-6 modules, stage registry, and full netlist and DSP test suites"
```

---

### Task 5: Shared 400-Point SVG Breadboard Renderer and Singleton Web Audio Studio

**Files:**
- Create: `site/js/breadboard-svg.js`
- Create: `site/js/audio-studio.js`
- Test: `tests/render-and-audio-studio.test.mjs`

**Interfaces:**
- Consumes:
  - `getPartPins`, `classifyPinToken`, `getStripKeyForPin`, `traceConnectedNet` from `site/js/breadboard-diff.js`
  - `createPassiveBassRiffs` from `site/js/riffs.js`
  - Reference SVG drawing geometry in:
    - `docs/reference-planners/stage6_cd4013_bass_sub_octave.html` (lines 655-875)
    - `docs/reference-planners/stage5a_vactrol_bass_envelope_filter.html` (lines 582-818 for `diode`, `vactrol_led`, `vactrol_ldr` heat-shrink bridge)
- Produces:
  - `site/js/breadboard-svg.js`:
    - `export function resolvePinCoord(pin)` -> `{ x: number, y: number } | null`
    - `export function renderBreadboardSvg({ preset, parts, selectedPartId = null, highlightedNet = null, diffResult = null, diffEnabled = false, checkedPartIds = new Set(), theme = 'dark' })` -> `string` (complete `<svg viewBox="0 0 1060 540" ...>` markup string)
      - Renders 30 numbered columns (`1`..`30`), row letters (`A`..`E`, center DIP ravine, `F`..`J`), top and bottom `+9V` and `GND` bus rails, top Coppersound header sockets (`HDR_IN`, `HDR_9V`, `HDR_GND`, `HDR_OUT`), and all component types (`wire`, `resistor`, `diode`, `vactrol_led`, `vactrol_ldr`, `filmcap`, `ecap`, `transistor`, `dipN`, `dip8`, `pot`) plus optional `preset.probePoints`.
      - Every rendered component `<g class="bb-part" data-part-id="...">` wraps its leads and body:
        - When `diffEnabled && diffResult` is active:
          - `unchanged` parts carry `data-diff-status="unchanged"` and `opacity="0.28"`.
          - `added` parts carry `data-diff-status="added"` and an emerald `#10b981` highlight halo/outline.
          - `modified` parts carry `data-diff-status="modified"` and an amber `#f59e0b` highlight halo/outline.
        - When `highlightedNet` (`{ strips, partIds }`) is active, matching 5-hole tie strips and rail buses render a translucent cyan highlight bar (`class="bb-net-strip"`) and non-connected parts dim gently unless selected.
      - Every `<text>` element in the SVG uses `font-size="12"` or larger (`>= 12`).
    - `export function bindBreadboardInteractions(svgContainer, { parts, onSelectPart, onHoverNet })` attaching delegated `click`, `mouseover`, and `mouseleave` handlers on `[data-part-id]` and `[data-pin]`.
  - `site/js/audio-studio.js`:
    - `export function findRisingZeroCrossing(buffer, maxSearch = 512)` -> `number`
    - `export function drawOscilloscope(canvas, { dryBuffer, wetBuffer, bypass = false, theme = 'dark' })`
    - `export function createAudioStudio({ AudioContextClass, win = globalThis.window, doc = globalThis.document, onChange } = {})` -> `{ attachStage(stageDescriptor, { presetId, modeId, preferredRiffId }), updateVariant({ presetId, modeId }), setKnob(knobId, value), setRiff(riffId), play(), togglePlay(), triggerPluck(), stop(), setBypass(bypass), toggleBypass(), bindScopeCanvas(canvasEl), getState(), destroy() }`
      - Lazily creates a single `AudioContext` on the first `play()` or `triggerPluck()` call, caches `createPassiveBassRiffs(ctx.sampleRate)` once, wires `ConstantSourceNode` (`offset = 0`) -> `ScriptProcessorNode(1024, 1, 1)` -> `GainNode` -> `ctx.destination`, and keeps strong references on the studio instance.
      - Sets `playing = true` synchronously before awaiting `ctx.resume()` so immediate audio callbacks process samples cleanly.
      - Applies a `12 ms` soft gain crossfade (`fadeTotalSamples = Math.max(16, Math.round(sampleRate * 0.012))`) whenever `attachStage` or `updateVariant` swaps the active `dsp` processor while playing, eliminating clicks.
      - Registers `visibilitychange` (stops when `doc.visibilityState === 'hidden'`) and `pagehide` listeners once, removable via `destroy()`.

- [ ] **Step 1: Write the failing test in `tests/render-and-audio-studio.test.mjs`**

Create `tests/render-and-audio-studio.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDERED_STAGES, getStageParts, getDiffAgainstPrevious } from '../site/js/data/stages/index.js';
import { traceConnectedNet } from '../site/js/breadboard-diff.js';
import { renderBreadboardSvg } from '../site/js/breadboard-svg.js';
import { findRisingZeroCrossing, createAudioStudio } from '../site/js/audio-studio.js';

test('renderBreadboardSvg renders all 7 stages, enforces >=12px SVG fonts, and applies diff opacities and outlines', () => {
  for (const stage of ORDERED_STAGES) {
    const preset = stage.presets[stage.defaultPresetId];
    const parts = getStageParts(stage.slug, preset.id, stage.defaultModeId);
    const svg = renderBreadboardSvg({ preset, parts });
    assert.match(svg, /^<svg\b/);
    assert.match(svg, /HDR_IN|IN/);

    for (const m of svg.matchAll(/font-size="([0-9.]+)"/g)) {
      assert.equal(Number(m[1]) >= 12, true, `Stage ${stage.slug} has font-size=${m[1]} < 12`);
    }
    for (const part of parts) {
      assert.equal(svg.includes(`data-part-id="${part.id}"`), true, `missing SVG group for ${part.id}`);
    }
  }

  const s2 = ORDERED_STAGES[1];
  const s2Preset = s2.presets[s2.defaultPresetId];
  const s2Parts = getStageParts('2');
  const transition = getDiffAgainstPrevious('2');
  const diffSvg = renderBreadboardSvg({
    preset: s2Preset,
    parts: s2Parts,
    diffResult: transition.diff,
    diffEnabled: true,
    highlightedNet: traceConnectedNet(s2Parts, 'HDR_GND')
  });
  assert.match(diffSvg, /data-diff-status="unchanged"[^>]*opacity="0\.28"/);
  assert.match(diffSvg, /data-diff-status="added"/);
  assert.match(diffSvg, /#10b981/);
  assert.match(diffSvg, /bb-net-strip/);
});

test('findRisingZeroCrossing locates rising zero crossing deterministically', () => {
  const buf = new Float32Array(256);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.sin((2 * Math.PI * (i - 17)) / 64);
  }
  const idx = findRisingZeroCrossing(buf, 128);
  assert.equal(buf[idx - 1] <= 0 && buf[idx] > 0, true);
});

test('createAudioStudio runs singleton DSP loop, crossfades stage swaps, supports bypass, and stops cleanly', async () => {
  let onaudioprocess = null;
  class MockAudioContext {
    constructor() {
      this.sampleRate = 48000;
      this.state = 'suspended';
      this.destination = {};
    }
    async resume() { this.state = 'running'; }
    createConstantSource() {
      return { offset: { value: 0 }, connect() {}, start() {} };
    }
    createGain() {
      return { gain: { value: 1 }, connect() {} };
    }
    createScriptProcessor(bufSize) {
      const node = {
        bufferSize: bufSize,
        connect() {},
        set onaudioprocess(fn) { onaudioprocess = fn; },
        get onaudioprocess() { return onaudioprocess; }
      };
      return node;
    }
  }

  const studio = createAudioStudio({
    AudioContextClass: MockAudioContext,
    win: { addEventListener() {}, removeEventListener() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {} },
    doc: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }
  });

  studio.attachStage(ORDERED_STAGES[0], {});
  await studio.play();
  assert.equal(studio.getState().playing, true);

  const outBuf = new Float32Array(1024);
  onaudioprocess({ outputBuffer: { getChannelData: () => outBuf } });
  let energy = 0;
  for (const s of outBuf) energy += s * s;
  assert.equal(energy > 0.001, true, 'expected non-silent wet output');

  studio.attachStage(ORDERED_STAGES[2], {});
  const swapBuf = new Float32Array(1024);
  onaudioprocess({ outputBuffer: { getChannelData: () => swapBuf } });
  assert.equal(swapBuf.every((v) => Number.isFinite(v)), true);

  studio.setBypass(true);
  assert.equal(studio.getState().bypass, true);

  studio.stop();
  assert.equal(studio.getState().playing, false);
  const silentBuf = new Float32Array(1024).fill(1);
  onaudioprocess({ outputBuffer: { getChannelData: () => silentBuf } });
  assert.equal(silentBuf.every((v) => v === 0), true);
  studio.destroy();
});
```

- [ ] **Step 2: Run `node --test tests/render-and-audio-studio.test.mjs` to verify RED failure**

Run:
```bash
node --test tests/render-and-audio-studio.test.mjs
```
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../site/js/breadboard-svg.js`.

- [ ] **Step 3: Implement `site/js/breadboard-svg.js` and `site/js/audio-studio.js`**

- In `site/js/breadboard-svg.js`:
  - Unify the 400-point Coppersound SVG renderer from `stage6_cd4013_bass_sub_octave.html:655-875` and `stage5a_vactrol_bass_envelope_filter.html:670-705` (covering `wire`, `resistor`, `diode`, `vactrol_led`, `vactrol_ldr` + optical heat-shrink sleeve, `filmcap`, `ecap`, `transistor`, `dipN`/`dip8`, `pot`, `HDR_PINS`, and `preset.probePoints`).
  - Wrap each component in `<g class="bb-part" data-part-id="${escapeAttr(p.id)}" data-diff-status="${diffStatus}"${opacityAttr}>...</g>` with emerald (`#10b981`) dashed/solid halo on `added` parts and amber (`#f59e0b`) halo on `modified` parts when `diffEnabled` is true.
  - Render `<rect class="bb-net-strip" ...>` strip/rail overlays for all strips in `highlightedNet.strips` and `data-pin` hit targets on breadboard holes and header sockets.
  - Keep every SVG `font-size` at `12` or larger (`12`, `13`, `14`) and adapt board frame colors cleanly for `theme === 'dark'` vs `theme === 'light'`.
- In `site/js/audio-studio.js`:
  - Implement `findRisingZeroCrossing`, `drawOscilloscope` (green `#22c55e` dry input trace, amber `#f59e0b` or cyan `#38bdf8` wet output trace, zero-volt center line, `12px` monospace legend), and `createAudioStudio` with `12 ms` crossfade between previous DSP and next DSP during live preset/mode/stage transitions.

- [ ] **Step 4: Run `just site-check` to verify GREEN**

Run:
```bash
just site-check
```
Expected: `0` static violations and all tests in `tests/*.test.mjs` PASS.

- [ ] **Step 5: Commit Task 5**

Run:
```bash
git status
git add site/js/breadboard-svg.js site/js/audio-studio.js tests/render-and-audio-studio.test.mjs
git commit -m "Add shared 400-point SVG breadboard renderer and singleton Web Audio studio"
```

---

### Task 6: Dark-Bench CSS Design System, Workbench Views, App Controller, and End-to-End Integration

**Files:**
- Create: `site/css/workbench.css`
- Create: `site/index.html`
- Create: `site/404.html`
- Create: `site/js/views/home-view.js`
- Create: `site/js/views/bom-view.js`
- Create: `site/js/views/stage-view.js`
- Create: `site/js/app.js`
- Test: `tests/workbench-integration.test.mjs`

**Interfaces:**
- Consumes:
  - `createStore` from `site/js/store.js`
  - `STAGE_SLUGS`, `createRouter`, `formatStageHash` from `site/js/router.js`
  - `STAGE_ROADMAP`, `PASSIVE_PICKUP_PRIMER` from `site/js/data/curriculum.js`
  - `BOM_CATEGORIES`, `BOM_ITEMS`, `filterBomItems`, `formatBomPlainText`, `formatBomMarkdown` from `site/js/data/bom.js`
  - `RIFF_CATALOG` from `site/js/riffs.js`
  - `ORDERED_STAGES`, `getStage`, `getStageParts`, `getDiffAgainstPrevious` from `site/js/data/stages/index.js`
  - `getPartPins`, `traceConnectedNet` from `site/js/breadboard-diff.js`
  - `renderBreadboardSvg`, `bindBreadboardInteractions` from `site/js/breadboard-svg.js`
  - `createAudioStudio` from `site/js/audio-studio.js`
- Produces:
  - `site/css/workbench.css`: complete dark/light hardware-bench design system obeying all Global Constraints.
  - `site/index.html` & `site/404.html`: static entrypoints ready for local serving and GitHub Pages.
  - `site/js/views/home-view.js`: `export function buildHomeMarkup({ state })` and `export function mountHomeView(container, { store, router })`.
  - `site/js/views/bom-view.js`: `export function buildBomMarkup({ state, filters })` and `export function mountBomView(container, { store, clipboard })`.
  - `site/js/views/stage-view.js`: `export function buildTransitionChecklistMarkup(transition)` and `export function mountStageView(container, { stage, store, audioStudio, router })`.
  - `site/js/app.js`: `export function initWorkbenchApp({ win, doc, storage, AudioContextClass } = {})` plus automatic browser bootstrap when `typeof document !== 'undefined' && document.getElementById('app-root')`.

- [ ] **Step 1: Write the failing integration test in `tests/workbench-integration.test.mjs`**

Create `tests/workbench-integration.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRepository } from '../scripts/check_site.mjs';
import { createStaticServer } from '../scripts/serve_local.mjs';
import { createDefaultState } from '../site/js/store.js';
import { getDiffAgainstPrevious } from '../site/js/data/stages/index.js';
import { buildHomeMarkup } from '../site/js/views/home-view.js';
import { buildBomMarkup } from '../site/js/views/bom-view.js';
import { buildTransitionChecklistMarkup } from '../site/js/views/stage-view.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_DIR = path.join(ROOT_DIR, 'site');

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

  const server = createStaticServer(SITE_DIR);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    for (const asset of ['/', '/404.html', '/css/workbench.css', '/js/app.js', '/js/data/stages/index.js']) {
      const res = await fetch(`http://127.0.0.1:${port}${asset}`);
      assert.equal(res.status, 200, `expected 200 for ${asset}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
```

- [ ] **Step 2: Run `node --test tests/workbench-integration.test.mjs` to verify RED failure**

Run:
```bash
node --test tests/workbench-integration.test.mjs
```
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `../site/js/views/home-view.js`.

- [ ] **Step 3: Implement `site/css/workbench.css`, `site/index.html`, `site/404.html`, `home-view.js`, `bom-view.js`, `stage-view.js`, and `app.js`**

Implement each file cleanly:
- `site/css/workbench.css`:
  - Define tokens strictly under `html[data-theme="dark"]` (`--bg-canvas: #0b0d10; --bg-surface: #12161c; --bg-elevated: #181e27; --border-hairline: #232a34; --text-primary: #eef2f6; --text-secondary: #9aa5b4; --accent-amber: #f59e0b; --accent-cyan: #38bdf8; --accent-green: #22c55e; --accent-danger: #ef4444;`) and `html[data-theme="light"]` (`--bg-canvas: #f6f8fa; --bg-surface: #ffffff; --bg-elevated: #eef2f6; --border-hairline: #d0d7de; --text-primary: #0f172a; --text-secondary: #475569; --accent-amber: #d97706; --accent-cyan: #0284c7; --accent-green: #16a34a; --accent-danger: #dc2626;`).
  - Zero `:root` blocks, zero purple accents, zero glowing neon borders, zero gradient text, zero grid background, and all `font-size` rules `>= 12px` (`0.75rem` / `12px` minimum).
  - Style the top persistent workbench header (`Overview`, `Parts BOM`, 7 stage pills with completion status dots, active `Stop Audio` pill when playing, and `Light Bench` / `Dark Bench` toggle), responsive stage workbench grid (full-width SVG breadboard canvas + right-hand inspector/transition panel + audition studio + persistent component wiring checklist + theory cards), home roadmap cards, and BOM table.
- `site/index.html` and `site/404.html`:
  - `site/index.html` starts with `<html lang="en" data-theme="dark">`, links `./css/workbench.css`, renders `<div id="app-root"></div>`, and loads `<script type="module" src="./js/app.js"></script>`.
  - `site/404.html` starts with `<html lang="en" data-theme="dark">`, links `./css/workbench.css`, includes `<meta http-equiv="refresh" content="0; url=./index.html">`, and provides a direct `<a href="./index.html">Return to Bass Breadboard Lab</a>` fallback.
- `site/js/views/home-view.js`:
  - Renders completion progress bar (`X of 7 stages completed`), `Quick Resume` button pointing to the first incomplete stage (or `#/stage/1` when all complete), 7 stage cards linking to `#/stage/<slug>` with phase polarity (`0 deg` vs `180 deg`), active IC/transistor badge, and `PASSIVE_PICKUP_PRIMER` reference section, plus inline two-click `Reset all progress` button (`Reset all progress` -> `Confirm reset progress` with `Cancel`).
- `site/js/views/bom-view.js`:
  - Renders stage filter (`All stages`, `Stage 1`..`Stage 6`), category filter, `Hide owned parts` checkbox, owned count progress, 41-row BOM table with `localStorage`-backed checkboxes, category select-all/clear helpers, and `Copy Plain Text` / `Copy Markdown` clipboard export buttons with a copy-confirmation status pill (falling back to a selectable `<textarea>` modal/drawer if `navigator.clipboard` is unavailable).
- `site/js/views/stage-view.js`:
  - Renders stage header (title, summary, phase badge, `Mark stage complete` button, Prev/Next stage links), Preset selector buttons, Mode selector buttons (when `Object.keys(stage.modes).length > 1`), **Diff from previous stage** toggle (disabled on Stage 1 with note `Stage 1 is the initial baseline layout`), 3-step **Transition checklist** (`Step 1: Pull removed parts`, `Step 2: Relocate or swap modified parts`, `Step 3: Insert added parts`) when diff mode is active, interactive 400-point SVG breadboard (`renderBreadboardSvg` + `bindBreadboardInteractions`), Pin-and-Role Inspector card showing selected/hovered part pins, value, role, and connected tie-strips, **Web Audio Circuit Audition Studio** (`Play Riff Loop` / `Stop`, 4 Riff buttons, `Pluck Low E1 (41.2 Hz)`, `True Bypass A/B`, live stage range sliders with formatted readouts, live DSP telemetry badge, and phase-locked dual-trace `<canvas width="560" height="150">` oscilloscope), persistent **Component Wiring Checklist** with per-part checkboxes and `Reset stage checks`, and `theoryNotes` cards.
- `site/js/app.js`:
  - Connects `store`, `router`, and `audioStudio`; updates `doc.documentElement.setAttribute('data-theme', state.theme)`; stops `audioStudio` immediately whenever navigating away from `#/stage/*` to `#/` or `#/bom`; swaps audio stage smoothly when navigating between `#/stage/<a>` and `#/stage/<b>`; renders top header bar and mounts the active view.

- [ ] **Step 4: Run `just site-check` to verify GREEN**

Run:
```bash
just site-check
```
Expected: `Static site check passed: 0 violations.` and all 6 test suites (`check-site`, `store-and-bom`, `stages-1-to-3`, `netlist-and-diff`, `audio-dsp`, `workbench-integration`) PASS with `0` failures.

- [ ] **Step 5: Commit Task 6**

Run:
```bash
git status
git add site/css/workbench.css site/index.html site/404.html site/js/views/home-view.js site/js/views/bom-view.js site/js/views/stage-view.js site/js/app.js tests/workbench-integration.test.mjs
git commit -m "Add workbench CSS design system, views, app controller, and integration tests"
```
