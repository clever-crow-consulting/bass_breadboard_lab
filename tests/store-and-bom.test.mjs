import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, createDefaultState, createStore } from '../site/js/store.js';
import { STAGE_SLUGS, parseHash, formatStageHash, createRouter } from '../site/js/router.js';
import { STAGE_ROADMAP, PASSIVE_PICKUP_PRIMER } from '../site/js/data/curriculum.js';
import { BOM_CATEGORIES, BOM_ITEMS, filterBomItems, formatBomPlainText, formatBomMarkdown } from '../site/js/data/bom.js';

function makeMockStorage(initial = {}, { throwOnRead = false, throwOnWrite = false } = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(k) {
      if (throwOnRead) {
        const err = new Error('SecurityError');
        err.name = 'SecurityError';
        throw err;
      }
      return map.has(k) ? map.get(k) : null;
    },
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
  assert.deepEqual(createDefaultState(), {
    version: 1,
    theme: 'dark',
    preferredRiffId: 'groove',
    bomOwnedIds: [],
    stagePartChecks: {},
    completedStages: []
  });

  const backing = makeMockStorage();
  const store = createStore(backing);
  assert.equal(store.getState().theme, 'dark');
  assert.equal(store.isUsingMemoryFallback(), false);

  const notifications = [];
  const unsubscribe = store.subscribe((nextState) => {
    notifications.push(nextState.theme);
  });

  store.setTheme('light');
  store.setPreferredRiffId('slap');
  store.setPreferredRiffId('invalid_riff');
  store.toggleBomOwned('semi_mpsa13');
  store.togglePartChecked('1', 'R_PWR');
  store.togglePartChecked('1', 'C1');
  store.toggleStageCompleted('1');

  assert.equal(notifications.length, 6);
  unsubscribe();
  store.setTheme('dark');
  store.setTheme('light');
  assert.equal(notifications.length, 6);

  const reloaded = createStore(backing);
  assert.equal(reloaded.getState().theme, 'light');
  assert.equal(reloaded.getState().preferredRiffId, 'slap');
  assert.deepEqual(reloaded.getState().bomOwnedIds, ['semi_mpsa13']);
  assert.equal(reloaded.isPartChecked('1', 'R_PWR'), true);
  assert.equal(reloaded.isStageCompleted('1'), true);

  reloaded.setBomOwnedBatch(['cap_470nf', 'res_100k'], true);
  assert.deepEqual(reloaded.getState().bomOwnedIds, ['semi_mpsa13', 'cap_470nf', 'res_100k']);
  reloaded.setBomOwnedBatch(['semi_mpsa13', 'res_100k'], false);
  assert.deepEqual(reloaded.getState().bomOwnedIds, ['cap_470nf']);

  reloaded.resetStageChecks('1');
  assert.equal(reloaded.isPartChecked('1', 'R_PWR'), false);
  assert.equal(reloaded.isStageCompleted('1'), true);

  reloaded.resetAllProgress();
  assert.equal(reloaded.getState().theme, 'light');
  assert.deepEqual(reloaded.getState().bomOwnedIds, []);
  assert.deepEqual(reloaded.getState().completedStages, []);
  assert.deepEqual(reloaded.getState().stagePartChecks, {});

  const corruptBacking = makeMockStorage({ [STORAGE_KEY]: '{not-json' });
  const recovered = createStore(corruptBacking);
  assert.equal(recovered.getState().version, 1);
  assert.equal(recovered.getState().theme, 'dark');

  const unknownVersionBacking = makeMockStorage({
    [STORAGE_KEY]: JSON.stringify({ version: 99, theme: 'light', bomOwnedIds: ['x'] })
  });
  const resetFromVersion = createStore(unknownVersionBacking);
  assert.equal(resetFromVersion.getState().version, 1);
  assert.equal(resetFromVersion.getState().theme, 'dark');
  assert.deepEqual(resetFromVersion.getState().bomOwnedIds, []);

  const readDeniedStore = createStore(makeMockStorage({}, { throwOnRead: true }));
  assert.equal(readDeniedStore.isUsingMemoryFallback(), true);
  assert.equal(readDeniedStore.getState().theme, 'dark');

  const quotaStore = createStore(makeMockStorage({}, { throwOnWrite: true }));
  quotaStore.toggleBomOwned('cap_470nf');
  assert.equal(quotaStore.isUsingMemoryFallback(), true);
  assert.deepEqual(quotaStore.getState().bomOwnedIds, ['cap_470nf']);

  const protoKeyStore = createStore(makeMockStorage());
  assert.equal(protoKeyStore.isPartChecked('toString', 'R1'), false);
  assert.equal(protoKeyStore.isPartChecked('valueOf', 'R1'), false);
  assert.doesNotThrow(() => protoKeyStore.resetStageChecks('valueOf'));
  assert.doesNotThrow(() => protoKeyStore.togglePartChecked('toString', 'R1'));
  assert.equal(protoKeyStore.isPartChecked('toString', 'R1'), true);
  assert.doesNotThrow(() => protoKeyStore.togglePartChecked('toString', 'R1'));
  assert.equal(protoKeyStore.isPartChecked('toString', 'R1'), false);
  assert.deepEqual(protoKeyStore.getState().stagePartChecks, {});
  assert.doesNotThrow(() => protoKeyStore.togglePartChecked('valueOf', 'C1'));
  assert.equal(protoKeyStore.isPartChecked('valueOf', 'C1'), true);
  assert.doesNotThrow(() => protoKeyStore.resetStageChecks('valueOf'));
  assert.equal(protoKeyStore.isPartChecked('valueOf', 'C1'), false);
});

test('router parses all valid routes, handles case-insensitive slugs, and normalizes unknown hashes on start', () => {
  assert.deepEqual(parseHash(''), { view: 'home', slug: null, invalid: false });
  assert.deepEqual(parseHash('#'), { view: 'home', slug: null, invalid: false });
  assert.deepEqual(parseHash('#/'), { view: 'home', slug: null, invalid: false });
  assert.deepEqual(parseHash('#/bom'), { view: 'bom', slug: null, invalid: false });
  for (const slug of STAGE_SLUGS) {
    assert.deepEqual(parseHash(formatStageHash(slug)), { view: 'stage', slug, invalid: false });
  }
  assert.deepEqual(parseHash('#/stage/5A'), { view: 'stage', slug: '5a', invalid: false });
  assert.deepEqual(parseHash('#/stage/5B'), { view: 'stage', slug: '5b', invalid: false });
  assert.deepEqual(parseHash('#/stage/99'), { view: 'home', slug: null, invalid: true });
  assert.deepEqual(parseHash('#/unknown/route'), { view: 'home', slug: null, invalid: true });

  const listeners = new Map();
  const mockWin = {
    location: { hash: '#/stage/99' },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    }
  };
  const seenRoutes = [];
  const router = createRouter(mockWin);
  router.start((route) => seenRoutes.push(route));

  assert.equal(mockWin.location.hash, '#/');
  assert.deepEqual(seenRoutes[0], { view: 'home', slug: null, invalid: false });

  router.navigate('#/stage/5A');
  assert.equal(mockWin.location.hash, '#/stage/5a');
  assert.deepEqual(router.currentRoute(), { view: 'stage', slug: '5a', invalid: false });
  assert.deepEqual(seenRoutes.at(-1), { view: 'stage', slug: '5a', invalid: false });

  mockWin.location.hash = '#/bom';
  listeners.get('hashchange')();
  assert.deepEqual(seenRoutes.at(-1), { view: 'bom', slug: null, invalid: false });

  router.stop();
  assert.equal(listeners.has('hashchange'), false);
});

test('curriculum roadmap and 41-item BOM filter and export cleanly', () => {
  assert.equal(STAGE_ROADMAP.length, 7);
  assert.deepEqual(STAGE_ROADMAP.map((s) => s.slug), STAGE_SLUGS);
  assert.deepEqual(STAGE_ROADMAP.map((s) => s.previousStageSlug), [null, '1', '2', '3', '4', '5a', '5b']);
  assert.deepEqual(STAGE_ROADMAP.map((s) => s.phaseDegrees), [180, 0, 0, 0, 180, 0, 0]);
  for (const entry of STAGE_ROADMAP) {
    for (const key of ['slug', 'stageNumber', 'shortLabel', 'title', 'topology', 'headlinePart', 'summary', 'bassFocus']) {
      assert.equal(typeof entry[key] === 'string' && entry[key].length > 0, true, `missing ${key} on stage ${entry.slug}`);
    }
    assert.equal(Array.isArray(entry.learnings) && entry.learnings.length >= 4, true);
  }

  assert.equal(PASSIVE_PICKUP_PRIMER.length, 4);
  assert.deepEqual(
    PASSIVE_PICKUP_PRIMER.map((c) => c.title),
    [
      'High-Z Passive Pickup Loading',
      'Sub-Bass Coupling Capacitor Cutoff',
      'Coppersound Ground-Sleeve Polarity Rule',
      'Three-Block Analog Bass Synth Chain'
    ]
  );

  assert.equal(BOM_CATEGORIES.length, 5);
  assert.deepEqual(
    BOM_CATEGORIES.map((c) => c.id),
    ['semiconductors', 'pots_optical', 'film_caps', 'electrolytic_ceramic', 'resistors']
  );
  assert.equal(BOM_ITEMS.length, 41);

  const expectedCounts = {
    semiconductors: 10,
    pots_optical: 6,
    film_caps: 7,
    electrolytic_ceramic: 5,
    resistors: 13
  };
  const seenIds = new Set();
  const validStageSet = new Set(STAGE_SLUGS);
  for (const [catId, count] of Object.entries(expectedCounts)) {
    assert.equal(filterBomItems(BOM_ITEMS, { category: catId }).length, count, `category count mismatch for ${catId}`);
  }
  for (const item of BOM_ITEMS) {
    assert.equal(seenIds.has(item.id), false, `duplicate BOM id ${item.id}`);
    seenIds.add(item.id);
    assert.equal(typeof item.qty === 'number' && item.qty > 0, true, `invalid qty on ${item.id}`);
    assert.equal(Array.isArray(item.stages) && item.stages.length > 0, true, `empty stages on ${item.id}`);
    for (const st of item.stages) {
      assert.equal(validStageSet.has(st), true, `invalid stage '${st}' on ${item.id}`);
    }
  }

  assert.equal(BOM_ITEMS[0].id, 'semi_mpsa13');
  assert.equal(BOM_ITEMS.some((item) => item.id === 'cap_470nf'), true);

  const stage1All = filterBomItems(BOM_ITEMS, { stageFilter: '1' });
  assert.equal(stage1All.some((item) => item.id === BOM_ITEMS[0].id), true);

  const stage4Only = filterBomItems(BOM_ITEMS, { stageFilter: '4' });
  assert.equal(stage4Only.some((item) => item.part.includes('CD4049UBE')), true);
  assert.equal(stage4Only.some((item) => item.part.includes('CD4013BE')), false);
  assert.equal(stage4Only.some((item) => item.id === 'cap_47uf'), false, 'Stage 4 self-biased CMOS must not list 47uF V_REF cap');

  const cap47 = BOM_ITEMS.find((item) => item.id === 'cap_47uf');
  assert.ok(cap47);
  assert.deepEqual(cap47.stages, ['3', '5a', '5b', '6']);
  for (const vrefStage of ['3', '5a', '5b', '6']) {
    assert.equal(
      filterBomItems(BOM_ITEMS, { stageFilter: vrefStage }).some((item) => item.id === 'cap_47uf'),
      true,
      `expected cap_47uf in stage ${vrefStage}`
    );
  }

  const stage4Semis = filterBomItems(BOM_ITEMS, { stageFilter: '4', category: 'semiconductors' });
  assert.equal(stage4Semis.every((item) => item.category === 'semiconductors'), true);

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
