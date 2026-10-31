import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { scanTextForViolations, checkModuleImports, checkRepository } from '../scripts/check_site.mjs';
import { createStaticServer } from '../scripts/serve_local.mjs';

function rawGet(port, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: requestPath, method: 'GET' },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8')
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('scanTextForViolations flags emojis, :root CSS, sub-12px fonts, and external CDN URLs', () => {
  const emojiChar = String.fromCodePoint(0x1F525);
  const emojiHits = scanTextForViolations('site/index.html', `<p>Hot fuzz ${emojiChar}</p>`);
  assert.equal(emojiHits.some((v) => v.includes('emoji')), true);

  const rootHits = scanTextForViolations('site/css/workbench.css', ':root { --bg: #000; }\nbody { font-size: 11px; }');
  assert.equal(rootHits.some((v) => v.includes(':root')), true);
  assert.equal(rootHits.some((v) => v.includes('12px')), true);

  const svgFontHits = scanTextForViolations('site/js/breadboard-svg.js', '<text font-size="10">A1</text>');
  assert.equal(svgFontHits.some((v) => v.includes('12px')), true);

  const canvasFontHits = scanTextForViolations('site/js/audio-studio.js', "ctx.font = '10px monospace';");
  assert.equal(canvasFontHits.some((v) => v.includes('12px')), true);

  const svgNsClean = scanTextForViolations(
    'site/js/breadboard-svg.js',
    '<svg xmlns="http://www.w3.org/2000/svg" data-xhtml="http://www.w3.org/1999/xhtml" font-size="12"></svg>'
  );
  assert.deepEqual(svgNsClean, []);

  const cdnHits = scanTextForViolations('site/index.html', '<script src="https://cdn.example.com/lib.js"></script>');
  assert.equal(cdnHits.some((v) => v.includes('external URL')), true);
});

test('checkModuleImports detects missing relative imports and passes valid ones', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbl-check-'));
  try {
    assert.deepEqual(checkModuleImports(path.join(tmp, 'nonexistent')), []);

    const jsDir = path.join(tmp, 'site', 'js');
    fs.mkdirSync(jsDir, { recursive: true });
    fs.writeFileSync(path.join(jsDir, 'a.js'), "import { x } from './b.js';\nimport { y } from './missing.js';\nexport const z = x + y;\n");
    fs.writeFileSync(path.join(jsDir, 'b.js'), 'export const x = 1;\n');

    const errs = checkModuleImports(jsDir);
    assert.equal(errs.length, 1);
    assert.match(errs[0], /missing\.js/);

    const repoResult = checkRepository(tmp);
    assert.equal(repoResult.ok, false);

    const ignoredDir = path.join(tmp, '.superpowers');
    fs.mkdirSync(ignoredDir, { recursive: true });
    fs.writeFileSync(path.join(ignoredDir, 'note.md'), `Ignored ${String.fromCodePoint(0x1F525)}`);
    fs.writeFileSync(path.join(jsDir, 'a.js'), "import { x } from './b.js';\nexport const z = x;\n");

    const cleanRepoResult = checkRepository(tmp);
    assert.equal(cleanRepoResult.ok, true);
    assert.deepEqual(cleanRepoResult.violations, []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('createStaticServer serves index.html, blocks traversal, and returns 404 for unknown files', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbl-srv-'));
  const siteDir = path.join(tmp, 'site');
  fs.mkdirSync(siteDir, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'AGENTS.md'), '# Secret parent file\n');
  fs.writeFileSync(path.join(siteDir, 'index.html'), '<!doctype html><title>Lab</title>');
  fs.writeFileSync(path.join(siteDir, '404.html'), '<!doctype html><title>Not Found</title>');
  fs.writeFileSync(path.join(siteDir, 'workbench.css'), 'html[data-theme="dark"] { color: #eef2f6; }');
  fs.writeFileSync(path.join(siteDir, 'app.js'), 'export const ready = true;');
  fs.writeFileSync(path.join(siteDir, 'board.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  fs.writeFileSync(path.join(siteDir, 'data.json'), '{"ok":true}');
  const server = createStaticServer(siteDir);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const okRes = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(okRes.status, 200);
    assert.equal(okRes.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.match(await okRes.text(), /Lab/);

    const cssRes = await fetch(`http://127.0.0.1:${port}/workbench.css`);
    assert.equal(cssRes.headers.get('content-type'), 'text/css; charset=utf-8');

    const jsRes = await fetch(`http://127.0.0.1:${port}/app.js`);
    assert.equal(jsRes.headers.get('content-type'), 'text/javascript; charset=utf-8');

    const svgRes = await fetch(`http://127.0.0.1:${port}/board.svg`);
    assert.equal(svgRes.headers.get('content-type'), 'image/svg+xml');

    const jsonRes = await fetch(`http://127.0.0.1:${port}/data.json`);
    assert.equal(jsonRes.headers.get('content-type'), 'application/json; charset=utf-8');

    const rawTraversalRes = await rawGet(port, '/../AGENTS.md');
    assert.equal(rawTraversalRes.status, 403);
    assert.match(rawTraversalRes.body, /Forbidden/);

    const encodedTraversalRes = await rawGet(port, '/%2e%2e/AGENTS.md');
    assert.equal(encodedTraversalRes.status, 403);
    assert.match(encodedTraversalRes.body, /Forbidden/);

    const missRes = await fetch(`http://127.0.0.1:${port}/nope.html`);
    assert.equal(missRes.status, 404);
    assert.match(await missRes.text(), /Not Found/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
