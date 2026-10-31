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
const PURPLE_HEX_RE = /#(?:a855f7|c084fc|9333ea|7e22ce|8b5cf6|a78bfa)(?:[0-9a-f]{2})?\b/gi;
const URL_RE = /https?:\/\/[^\s"'`)<>]+/g;
const IMPORT_RE = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;

export function scanTextForViolations(relPath, content) {
  const violations = [];
  const normPath = relPath.replace(/\\/g, '/');

  if (EMOJI_RE.test(content)) {
    const match = content.match(EMOJI_RE);
    const codePoint = match ? match[0].codePointAt(0).toString(16).toUpperCase() : 'UNKNOWN';
    violations.push(`${normPath}: contains forbidden Unicode emoji U+${codePoint}`);
  }

  if (normPath.endsWith('.css')) {
    const cssWithoutComments = content.replace(/\/\*[\s\S]*?\*\//g, '');
    if (ROOT_SELECTOR_RE.test(cssWithoutComments)) {
      violations.push(`${normPath}: contains forbidden :root selector; scope tokens to html[data-theme="dark"] and html[data-theme="light"]`);
    }
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
    for (const match of content.matchAll(PURPLE_HEX_RE)) {
      violations.push(`${normPath}: contains forbidden purple hex accent ${match[0]}`);
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
