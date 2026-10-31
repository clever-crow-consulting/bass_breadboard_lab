import {
  getPartPins,
  classifyPinToken,
  getStripKeyForPin,
  traceConnectedNet
} from './breadboard-diff.js';

const VIEW_WIDTH = 1060;
const VIEW_HEIGHT = 540;
const BOARD_X = 60;
const BOARD_W = 940;
const LEFT_X = 116;
const COL_PITCH = 29;

const ROW_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const RAIL_KEYS = ['TOP_PLUS', 'TOP_MINUS', 'BOT_PLUS', 'BOT_MINUS'];

const Y_MAP = {
  HDR: 36,
  TOP_PLUS: 102,
  TOP_MINUS: 126,
  A: 170,
  B: 194,
  C: 218,
  D: 242,
  E: 266,
  RAVINE: 292,
  F: 318,
  G: 342,
  H: 366,
  I: 390,
  J: 414,
  BOT_PLUS: 456,
  BOT_MINUS: 480
};

function colX(colNum) {
  return LEFT_X + (colNum - 1) * COL_PITCH;
}

const HDR_PINS = {
  HDR_GND: {
    boxX: colX(2) - 28,
    pinX: colX(2) - 14,
    labelX: colX(2) + 12,
    y: Y_MAP.HDR,
    label: 'GND',
    color: '#3b82f6'
  },
  HDR_9V: {
    boxX: colX(5) - 28,
    pinX: colX(5) - 14,
    labelX: colX(5) + 12,
    y: Y_MAP.HDR,
    label: '+9V',
    color: '#ef4444'
  },
  HDR_IN: {
    boxX: colX(8) - 28,
    pinX: colX(8) - 14,
    labelX: colX(8) + 12,
    y: Y_MAP.HDR,
    label: 'IN',
    color: '#22c55e'
  },
  HDR_OUT: {
    boxX: colX(27) - 28,
    pinX: colX(27) - 14,
    labelX: colX(27) + 12,
    y: Y_MAP.HDR,
    label: 'OUT',
    color: '#f59e0b'
  }
};

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function resolvePinCoord(pin) {
  const info = classifyPinToken(pin);
  if (info.kind === 'hole') {
    const y = Y_MAP[info.col];
    if (y === undefined) return null;
    return { x: colX(info.row), y };
  }
  if (info.kind === 'rail') {
    const y = Y_MAP[info.rail];
    if (y === undefined) return null;
    return { x: colX(info.row), y };
  }
  if (info.kind === 'header') {
    const hdr = HDR_PINS[info.id];
    if (!hdr) return null;
    return { x: hdr.pinX, y: hdr.y };
  }
  return null;
}

function resolveDiffStatus(diffResult, partId) {
  if (!diffResult) return 'normal';
  if (diffResult.statusById instanceof Map && diffResult.statusById.has(partId)) {
    return diffResult.statusById.get(partId);
  }
  if (Array.isArray(diffResult.added) && diffResult.added.some((p) => p.id === partId)) {
    return 'added';
  }
  if (Array.isArray(diffResult.modified) && diffResult.modified.some((m) => m.id === partId)) {
    return 'modified';
  }
  if (Array.isArray(diffResult.unchanged) && diffResult.unchanged.some((p) => p.id === partId)) {
    return 'unchanged';
  }
  return 'normal';
}

function getDipGeometry(part) {
  const pins = getPartPins(part);
  const spanCols =
    part.spanCols ||
    (part.type === 'dip8' ? 4 : Math.max(2, Math.floor(pins.length / 2)));
  let startCol = part.startCol;
  if (!Number.isFinite(startCol)) {
    const cols = pins
      .map((pin) => classifyPinToken(pin))
      .filter((t) => t.kind === 'hole')
      .map((t) => t.row);
    startCol = cols.length > 0 ? Math.min(...cols) : 10;
  }
  const xLeft = colX(startCol) - 11;
  const width = (spanCols - 1) * COL_PITCH + 22;
  const yTop = Y_MAP.E - 4;
  const height = Y_MAP.F - Y_MAP.E + 8;
  return { startCol, spanCols, xLeft, width, yTop, height };
}

function renderPartHalo(
  part,
  { className, stroke, strokeWidth = 2, dashArray = '', fill = 'none', extraPad = 0 }
) {
  const dashAttr = dashArray ? ` stroke-dasharray="${dashArray}"` : '';

  if (part.type === 'wire') {
    const p1 = resolvePinCoord(part.from);
    const p2 = resolvePinCoord(part.to);
    if (!p1 || !p2) return '';
    const lineWidth = 10 + extraPad * 2;
    return `<line class="${className}" pointer-events="none" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" fill="none" stroke="${stroke}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-opacity="0.72"${dashAttr}/>`;
  }

  if (
    part.type === 'resistor' ||
    part.type === 'diode' ||
    part.type === 'filmcap' ||
    part.type === 'ecap' ||
    part.type === 'vactrol_led' ||
    part.type === 'vactrol_ldr'
  ) {
    const p1 = resolvePinCoord(part.from);
    const p2 = resolvePinCoord(part.to);
    if (!p1 || !p2) return '';
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    if (part.type === 'filmcap') {
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
    }

    const leadWidth = 7.5 + extraPad * 2;
    let out = `<line class="${className}" pointer-events="none" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" fill="none" stroke="${stroke}" stroke-width="${leadWidth}" stroke-linecap="round" stroke-opacity="0.65"${dashAttr}/>`;

    if (part.type === 'resistor' || part.type === 'diode' || part.type === 'filmcap') {
      const halfW = (part.type === 'filmcap' ? 23 : part.type === 'resistor' ? 18 : 17) + extraPad;
      const halfH = (part.type === 'filmcap' ? 12.5 : 9.5) + extraPad;
      out += `<g transform="translate(${mx},${my}) rotate(${angle.toFixed(2)})" pointer-events="none">`;
      out += `<rect class="${className}" pointer-events="none" x="${-halfW}" y="${-halfH}" width="${halfW * 2}" height="${halfH * 2}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
      out += `</g>`;
      return out;
    }

    if (part.type === 'ecap' || part.type === 'vactrol_led') {
      const r = (part.type === 'ecap' ? 16.5 : 15) + extraPad;
      out += `<circle class="${className}" pointer-events="none" cx="${mx}" cy="${my}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
      return out;
    }

    out += `<ellipse class="${className}" pointer-events="none" cx="${mx}" cy="${my}" rx="${20 + extraPad}" ry="${15 + extraPad}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
    return out;
  }

  if (part.type === 'dipN' || part.type === 'dip8') {
    const dip = getDipGeometry(part);
    const x = dip.xLeft - 5 - extraPad;
    const y = dip.yTop - 6 - extraPad;
    const width = dip.width + 10 + extraPad * 2;
    const height = dip.height + 12 + extraPad * 2;
    return `<rect class="${className}" pointer-events="none" x="${x}" y="${y}" width="${width}" height="${height}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
  }

  const coords = getPartPins(part)
    .map((pin) => resolvePinCoord(pin))
    .filter(Boolean);
  if (coords.length === 0) return '';

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const pt of coords) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const padX = 18 + extraPad;
  const padTop = (part.type === 'pot' ? 16 : 12) + extraPad;
  const padBottom = (part.type === 'pot' ? 26 : 12) + extraPad;
  const width = Math.max(24, maxX - minX + padX * 2);
  const height = Math.max(24, maxY - minY + padTop + padBottom);
  return `<rect class="${className}" pointer-events="none" x="${minX - padX}" y="${minY - padTop}" width="${width}" height="${height}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr}/>`;
}

function shortCapLabel(part) {
  const raw = String(part.name || part.ref || part.id || 'C').split(' ')[0];
  return raw.length > 7 ? raw.slice(0, 7) : raw;
}

function renderPartBody(part, palette) {
  const { ravineBg } = palette;
  let out = '';

  if (part.type === 'wire') {
    const p1 = resolvePinCoord(part.from);
    const p2 = resolvePinCoord(part.to);
    if (!p1 || !p2) return out;
    const wireColor = escapeXml(part.color || '#38bdf8');
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#09090b" stroke-width="5.5" stroke-linecap="round" opacity="0.45"/>`;
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${wireColor}" stroke-width="3.4" stroke-linecap="round"/>`;
    out += `<circle cx="${p1.x}" cy="${p1.y}" r="3" fill="#e2e8f0"/>`;
    out += `<circle cx="${p2.x}" cy="${p2.y}" r="3" fill="#e2e8f0"/>`;
    return out;
  }

  if (part.type === 'resistor') {
    const p1 = resolvePinCoord(part.from);
    const p2 = resolvePinCoord(part.to);
    if (!p1 || !p2) return out;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#cbd5e1" stroke-width="2.4" stroke-linecap="round"/>`;
    out += `<circle cx="${p1.x}" cy="${p1.y}" r="2.8" fill="#94a3b8"/>`;
    out += `<circle cx="${p2.x}" cy="${p2.y}" r="2.8" fill="#94a3b8"/>`;
    out += `<g transform="translate(${mx},${my}) rotate(${angle.toFixed(2)})">`;
    out += `<rect x="-14" y="-5.5" width="28" height="11" rx="4" fill="#60a5fa" stroke="#1e3a8a" stroke-width="1.3"/>`;
    out += `<rect x="-7" y="-5.5" width="3" height="11" fill="#7c2d12"/>`;
    out += `<rect x="0" y="-5.5" width="3" height="11" fill="#09090b"/>`;
    out += `<rect x="6" y="-5.5" width="3" height="11" fill="#dc2626"/>`;
    out += `</g>`;
    return out;
  }

  if (part.type === 'diode') {
    const p1 = resolvePinCoord(part.from);
    const p2 = resolvePinCoord(part.to);
    if (!p1 || !p2) return out;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    const stripeOnP2 = !part.stripeAt || part.stripeAt === part.to;
    const bodyFill = String(part.id || '').includes('LED') ? '#ef4444' : '#f97316';
    const sx = stripeOnP2 ? 5 : -9;
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#cbd5e1" stroke-width="2.4" stroke-linecap="round"/>`;
    out += `<circle cx="${p1.x}" cy="${p1.y}" r="2.8" fill="#94a3b8"/>`;
    out += `<circle cx="${p2.x}" cy="${p2.y}" r="2.8" fill="#94a3b8"/>`;
    out += `<g transform="translate(${mx},${my}) rotate(${angle.toFixed(2)})">`;
    out += `<rect x="-13" y="-5.5" width="26" height="11" rx="3" fill="${bodyFill}" stroke="#7c2d12" stroke-width="1.3"/>`;
    out += `<rect x="${sx}" y="-5.5" width="4" height="11" fill="#09090b"/>`;
    out += `</g>`;
    return out;
  }

  if (part.type === 'vactrol_led') {
    const p1 = resolvePinCoord(part.from);
    const p2 = resolvePinCoord(part.to);
    if (!p1 || !p2) return out;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>`;
    out += `<circle cx="${mx}" cy="${my}" r="11" fill="#dc2626" stroke="#fca5a5" stroke-width="1.8"/>`;
    out += `<text x="${mx}" y="${my + 4}" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="700">LED</text>`;
    return out;
  }

  if (part.type === 'vactrol_ldr') {
    const p1 = resolvePinCoord(part.from);
    const p2 = resolvePinCoord(part.to);
    if (!p1 || !p2) return out;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/>`;
    out += `<ellipse cx="${mx}" cy="${my}" rx="16" ry="11" fill="#0e7490" stroke="#67e8f9" stroke-width="1.8"/>`;
    out += `<text x="${mx}" y="${my + 4}" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="700">LDR</text>`;
    return out;
  }

  if (part.type === 'filmcap') {
    const p1 = resolvePinCoord(part.from);
    const p2 = resolvePinCoord(part.to);
    if (!p1 || !p2) return out;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    const capColor = escapeXml(part.color || '#38bdf8');
    const capText = escapeXml(shortCapLabel(part));
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#cbd5e1" stroke-width="2.4" stroke-linecap="round"/>`;
    out += `<g transform="translate(${mx},${my}) rotate(${angle.toFixed(2)})">`;
    out += `<rect x="-19" y="-8.5" width="38" height="17" rx="3" fill="${capColor}" stroke="#0f172a" stroke-width="1.3"/>`;
    out += `<text x="0" y="4" text-anchor="middle" fill="#09090b" font-size="12" font-weight="700">${capText}</text>`;
    out += `</g>`;
    return out;
  }

  if (part.type === 'ecap') {
    const p1 = resolvePinCoord(part.from);
    const p2 = resolvePinCoord(part.to);
    if (!p1 || !p2) return out;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const plusCoord = part.plusAt ? resolvePinCoord(part.plusAt) : p1;
    const dx = plusCoord ? Math.sign(plusCoord.x - mx) * 2.5 : 0;
    const dy = plusCoord ? Math.sign(plusCoord.y - my) * 2.5 : 0;
    out += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#cbd5e1" stroke-width="2.4" stroke-linecap="round"/>`;
    out += `<circle cx="${mx}" cy="${my}" r="12.5" fill="#1e293b" stroke="#94a3b8" stroke-width="1.6"/>`;
    out += `<text x="${mx + dx}" y="${my + dy + 4}" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="700">+</text>`;
    return out;
  }

  if (part.type === 'transistor') {
    const pins = getPartPins(part);
    const pE = resolvePinCoord(pins[0]);
    const pB = resolvePinCoord(pins[1]);
    const pC = resolvePinCoord(pins[2]);
    if (!pE || !pB || !pC) return out;
    const tag = escapeXml(part.tag || part.ref || part.name || 'Q1');
    out += `<line x1="${pE.x}" y1="${pE.y}" x2="${pB.x - 9}" y2="${pB.y}" stroke="#cbd5e1" stroke-width="2.2"/>`;
    out += `<line x1="${pC.x}" y1="${pC.y}" x2="${pB.x + 9}" y2="${pB.y}" stroke="#cbd5e1" stroke-width="2.2"/>`;
    out += `<circle cx="${pE.x}" cy="${pE.y}" r="3" fill="#e2e8f0"/>`;
    out += `<circle cx="${pB.x}" cy="${pB.y}" r="3" fill="#e2e8f0"/>`;
    out += `<circle cx="${pC.x}" cy="${pC.y}" r="3" fill="#e2e8f0"/>`;
    out += `<path d="M ${pB.x - 20} ${pB.y + 9} A 20 17 0 0 1 ${pB.x + 20} ${pB.y + 9} Z" fill="#27272a" stroke="#e4e4e7" stroke-width="1.6"/>`;
    out += `<text x="${pB.x}" y="${pB.y + 6}" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="700">${tag}</text>`;
    return out;
  }

  if (part.type === 'dipN' || part.type === 'dip8') {
    const { startCol, spanCols, xLeft, width, yTop, height } = getDipGeometry(part);
    const chipLabel = escapeXml(part.chipLabel || part.tag || part.ref || part.id);
    for (let offset = 0; offset < spanCols; offset++) {
      const px = colX(startCol + offset);
      out += `<rect x="${px - 3}" y="${Y_MAP.E - 3}" width="6" height="6" fill="#e2e8f0"/>`;
      out += `<rect x="${px - 3}" y="${Y_MAP.F - 3}" width="6" height="6" fill="#e2e8f0"/>`;
    }
    out += `<rect x="${xLeft}" y="${yTop}" width="${width}" height="${height}" rx="4" fill="#18181b" stroke="#e4e4e7" stroke-width="1.8"/>`;
    out += `<path d="M ${xLeft} ${Y_MAP.RAVINE - 7} A 7 7 0 0 1 ${xLeft} ${Y_MAP.RAVINE + 7}" fill="${ravineBg}" stroke="#e4e4e7" stroke-width="1.5"/>`;
    out += `<circle cx="${colX(startCol)}" cy="${Y_MAP.F - 11}" r="3" fill="#38bdf8"/>`;
    out += `<text x="${xLeft + width / 2 + 4}" y="${Y_MAP.RAVINE + 4}" text-anchor="middle" fill="#f8fafc" font-size="13" font-weight="700">${chipLabel}</text>`;
    return out;
  }

  if (part.type === 'pot') {
    const pins = getPartPins(part);
    const p3 = resolvePinCoord(pins[0]);
    const p2 = resolvePinCoord(pins[1]);
    const p1 = resolvePinCoord(pins[2]);
    if (!p3 || !p2 || !p1) return out;
    const xMin = Math.min(p3.x, p2.x, p1.x);
    const xMax = Math.max(p3.x, p2.x, p1.x);
    const tag = escapeXml(part.tag || part.ref || part.id);
    out += `<rect x="${xMin - 13}" y="${p2.y - 12}" width="${xMax - xMin + 26}" height="24" rx="6" fill="#334155" stroke="#f8fafc" stroke-width="1.4"/>`;
    out += `<circle cx="${p2.x}" cy="${p2.y}" r="8.5" fill="#0f172a" stroke="#f59e0b" stroke-width="1.7"/>`;
    out += `<line x1="${p2.x}" y1="${p2.y}" x2="${p2.x + 5}" y2="${p2.y - 5}" stroke="#f59e0b" stroke-width="1.8"/>`;
    out += `<text x="${p2.x}" y="${p2.y + 24}" text-anchor="middle" fill="#f59e0b" font-size="12" font-weight="700">${tag}</text>`;
    return out;
  }

  return out;
}

function renderVactrolSleeve(parts) {
  const vactrolParts = parts.filter(
    (p) => p && (p.type === 'vactrol_led' || p.type === 'vactrol_ldr')
  );
  if (vactrolParts.length < 2) return '';

  const coords = [];
  for (const part of vactrolParts) {
    for (const pin of getPartPins(part)) {
      const pt = resolvePinCoord(pin);
      if (pt) coords.push(pt);
    }
  }
  if (coords.length < 2) return '';

  const minX = Math.min(...coords.map((c) => c.x)) - 15;
  const maxX = Math.max(...coords.map((c) => c.x)) + 15;
  const minY = Math.min(...coords.map((c) => c.y)) - 16;
  const maxY = Math.max(...coords.map((c) => c.y)) + 16;

  return `<rect class="bb-vactrol-sleeve" pointer-events="none" x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" rx="8" fill="rgba(34,211,238,0.09)" stroke="#22d3ee" stroke-dasharray="4 3" stroke-width="1.6"/>`;
}

export function renderBreadboardSvg({
  preset = null,
  parts = [],
  selectedPartId = null,
  highlightedNet = null,
  diffResult = null,
  diffEnabled = false,
  checkedPartIds = new Set(),
  theme = 'dark'
} = {}) {
  const safeParts = Array.isArray(parts) ? parts : [];
  const checkedSet =
    checkedPartIds instanceof Set
      ? checkedPartIds
      : new Set(Array.isArray(checkedPartIds) ? checkedPartIds : []);

  const isLight = theme === 'light';
  const palette = {
    boardBg: isLight ? '#f1f5f9' : '#18181b',
    boardStroke: isLight ? '#cbd5e1' : '#3f3f46',
    ravineBg: isLight ? '#e2e8f0' : '#0b0d10',
    holeFill: isLight ? '#334155' : '#09090b',
    holeStroke: isLight ? '#94a3b8' : '#52525b',
    labelColor: isLight ? '#475569' : '#a1a1aa',
    hdrBg: isLight ? '#1e293b' : '#12161c'
  };

  const activeNet =
    highlightedNet ||
    (selectedPartId ? traceConnectedNet(safeParts, selectedPartId) : null);
  const netStrips = activeNet?.strips instanceof Set ? activeNet.strips : new Set();
  const netPartIds = activeNet?.partIds instanceof Set ? activeNet.partIds : new Set();

  const occupiedCols = new Set();
  for (const part of safeParts) {
    for (const pin of getPartPins(part)) {
      const info = classifyPinToken(pin);
      if (info.kind === 'hole') occupiedCols.add(info.row);
    }
  }

  let out = `<svg viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" xmlns="http://www.w3.org/2000/svg" class="bb-svg" role="img" aria-label="400-point solderless breadboard layout">`;

  out += `<rect x="${BOARD_X}" y="14" width="${BOARD_W}" height="44" rx="8" fill="${palette.hdrBg}" stroke="${palette.boardStroke}" stroke-width="1.5"/>`;
  out += `<text x="596" y="41" text-anchor="middle" fill="#cbd5e1" font-size="12" font-weight="600">COPPERSOUND I/O HEADER</text>`;

  for (const [key, hdr] of Object.entries(HDR_PINS)) {
    const isHi = netStrips.has(key);
    if (isHi) {
      out += `<rect class="bb-net-strip" pointer-events="none" data-strip="${key}" x="${hdr.boxX - 3}" y="18" width="70" height="36" rx="7" fill="rgba(56,189,248,0.22)" stroke="#38bdf8" stroke-width="1.5"/>`;
    }
    out += `<g class="bb-header-socket" data-pin="${key}">`;
    out += `<rect x="${hdr.boxX}" y="21" width="64" height="30" rx="5" fill="#1e293b" stroke="${isHi ? '#38bdf8' : hdr.color}" stroke-width="${isHi ? 2.4 : 1.5}"/>`;
    out += `<circle cx="${hdr.pinX}" cy="${hdr.y}" r="4.5" fill="#020617" stroke="${hdr.color}" stroke-width="2"/>`;
    out += `<text x="${hdr.labelX}" y="${hdr.y + 4}" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="700">${hdr.label}</text>`;
    out += `</g>`;
  }

  out += `<rect x="${BOARD_X}" y="72" width="${BOARD_W}" height="436" rx="12" fill="${palette.boardBg}" stroke="${palette.boardStroke}" stroke-width="2"/>`;

  out += `<line x1="${colX(1) - 8}" y1="88" x2="${colX(30) + 8}" y2="88" stroke="#ef4444" stroke-width="2" opacity="0.85"/>`;
  out += `<line x1="${colX(1) - 8}" y1="138" x2="${colX(30) + 8}" y2="138" stroke="#3b82f6" stroke-width="2" opacity="0.85"/>`;
  out += `<line x1="${colX(1) - 8}" y1="442" x2="${colX(30) + 8}" y2="442" stroke="#ef4444" stroke-width="1.5" opacity="0.6"/>`;
  out += `<line x1="${colX(1) - 8}" y1="492" x2="${colX(30) + 8}" y2="492" stroke="#3b82f6" stroke-width="2" opacity="0.85"/>`;

  out += `<text x="82" y="${Y_MAP.TOP_PLUS + 4}" text-anchor="middle" fill="#ef4444" font-size="13" font-weight="700">+</text>`;
  out += `<text x="82" y="${Y_MAP.TOP_MINUS + 4}" text-anchor="middle" fill="#3b82f6" font-size="14" font-weight="700">-</text>`;
  out += `<text x="82" y="${Y_MAP.BOT_PLUS + 4}" text-anchor="middle" fill="#ef4444" font-size="13" font-weight="700">+</text>`;
  out += `<text x="82" y="${Y_MAP.BOT_MINUS + 4}" text-anchor="middle" fill="#3b82f6" font-size="14" font-weight="700">-</text>`;

  out += `<rect x="${BOARD_X + 10}" y="280" width="${BOARD_W - 20}" height="24" rx="4" fill="${palette.ravineBg}" stroke="${palette.boardStroke}" stroke-width="1"/>`;

  for (const rail of RAIL_KEYS) {
    if (netStrips.has(rail)) {
      const ry = Y_MAP[rail];
      const railFill = rail.includes('PLUS')
        ? 'rgba(239,68,68,0.20)'
        : 'rgba(56,189,248,0.22)';
      out += `<rect class="bb-net-strip" pointer-events="none" data-strip="${rail}" x="${colX(1) - 10}" y="${ry - 9}" width="${29 * COL_PITCH + 20}" height="18" rx="5" fill="${railFill}" stroke="#38bdf8" stroke-width="1.5"/>`;
    }
  }

  for (let c = 1; c <= 30; c++) {
    const x = colX(c);
    if (netStrips.has(`TOP_ROW_${c}`)) {
      out += `<rect class="bb-net-strip" pointer-events="none" data-strip="TOP_ROW_${c}" x="${x - 9}" y="${Y_MAP.A - 9}" width="18" height="${Y_MAP.E - Y_MAP.A + 18}" rx="5" fill="rgba(56,189,248,0.22)" stroke="#38bdf8" stroke-width="1.5"/>`;
    }
    if (netStrips.has(`BOT_ROW_${c}`)) {
      out += `<rect class="bb-net-strip" pointer-events="none" data-strip="BOT_ROW_${c}" x="${x - 9}" y="${Y_MAP.F - 9}" width="18" height="${Y_MAP.J - Y_MAP.F + 18}" rx="5" fill="rgba(56,189,248,0.22)" stroke="#38bdf8" stroke-width="1.5"/>`;
    }
  }

  out += renderVactrolSleeve(safeParts);

  for (const letter of ROW_LETTERS) {
    out += `<text x="86" y="${Y_MAP[letter] + 4}" text-anchor="middle" fill="${palette.labelColor}" font-size="12" font-weight="600">${letter}</text>`;
    out += `<text x="982" y="${Y_MAP[letter] + 4}" text-anchor="middle" fill="${palette.labelColor}" font-size="12" font-weight="600">${letter}</text>`;
  }

  for (let c = 1; c <= 30; c++) {
    const x = colX(c);
    const isMajor = c === 1 || c % 5 === 0;
    const isUsed = occupiedCols.has(c);
    const colColor = isMajor
      ? isLight
        ? '#0284c7'
        : '#38bdf8'
      : isUsed
        ? palette.labelColor
        : isLight
          ? '#94a3b8'
          : '#71717a';
    const colWeight = isMajor ? '700' : '500';

    out += `<text x="${x}" y="155" text-anchor="middle" fill="${colColor}" font-size="12" font-weight="${colWeight}">${c}</text>`;
    out += `<text x="${x}" y="434" text-anchor="middle" fill="${colColor}" font-size="12" font-weight="${colWeight}">${c}</text>`;

    for (const rail of RAIL_KEYS) {
      out += `<rect class="bb-hole" data-pin="${rail}_${c}" x="${x - 3.6}" y="${Y_MAP[rail] - 3.6}" width="7.2" height="7.2" rx="1.5" fill="${palette.holeFill}" stroke="${palette.holeStroke}" stroke-width="1"/>`;
    }
    for (const letter of ROW_LETTERS) {
      out += `<rect class="bb-hole" data-pin="${letter}${c}" x="${x - 3.8}" y="${Y_MAP[letter] - 3.8}" width="7.6" height="7.6" rx="1.5" fill="${palette.holeFill}" stroke="${palette.holeStroke}" stroke-width="1"/>`;
    }
  }

  const probePoints = Array.isArray(preset?.probePoints) ? preset.probePoints : [];
  for (const probe of probePoints) {
    const pinCode = typeof probe === 'string' ? probe : probe?.code;
    const pt = pinCode ? resolvePinCoord(pinCode) : null;
    if (pt) {
      out += `<circle class="bb-probe-point" data-pin="${escapeXml(pinCode)}" cx="${pt.x}" cy="${pt.y}" r="7.5" fill="none" stroke="#22d3ee" stroke-dasharray="2.5 2" stroke-width="1.7"/>`;
    }
  }

  for (const part of safeParts) {
    if (!part || !part.id) continue;
    const isSelected = part.id === selectedPartId;
    const isChecked = checkedSet.has(part.id);
    const diffActive = Boolean(diffEnabled && diffResult);
    const diffStatus = diffActive ? resolveDiffStatus(diffResult, part.id) : 'normal';

    let opacityAttr = '';
    if (diffActive) {
      if (diffStatus === 'unchanged' && !isSelected) {
        opacityAttr = ' opacity="0.28"';
      }
    } else if (
      highlightedNet &&
      netPartIds.size > 0 &&
      !netPartIds.has(part.id) &&
      !isSelected
    ) {
      opacityAttr = ' opacity="0.38"';
    }

    const classes = ['bb-part'];
    if (isSelected) classes.push('is-selected');
    if (isChecked) classes.push('is-checked');
    if (diffActive) classes.push(`diff-${diffStatus}`);

    const checkedAttr = isChecked ? ' data-checked="true"' : '';
    out += `<g class="${classes.join(' ')}" data-part-id="${escapeXml(part.id)}" data-diff-status="${escapeXml(diffStatus)}"${opacityAttr}${checkedAttr}>`;

    if (diffActive && diffStatus === 'added') {
      out += renderPartHalo(part, {
        className: 'bb-diff-halo',
        stroke: '#10b981',
        strokeWidth: 2,
        fill: 'rgba(16,185,129,0.12)',
        extraPad: 0
      });
    } else if (diffActive && diffStatus === 'modified') {
      out += renderPartHalo(part, {
        className: 'bb-diff-halo',
        stroke: '#f59e0b',
        strokeWidth: 2,
        dashArray: '5 3',
        fill: 'rgba(245,158,11,0.12)',
        extraPad: 0
      });
    }
    if (isSelected) {
      out += renderPartHalo(part, {
        className: 'bb-selected-halo',
        stroke: '#38bdf8',
        strokeWidth: 2.2,
        fill: 'none',
        extraPad: 2.5
      });
    }

    out += renderPartBody(part, palette);
    out += `</g>`;
  }

  out += `</svg>`;
  return out;
}

const activeBindings = new WeakMap();

function readAttr(el, attrName) {
  if (!el || typeof el !== 'object') return null;
  if (typeof el.getAttribute === 'function') {
    const val = el.getAttribute(attrName);
    if (val) return val;
  }
  return null;
}

function findNearestAttr(target, root, attrName) {
  if (!target || typeof target !== 'object') return null;
  if (typeof target.closest === 'function') {
    const found = target.closest(`[${attrName}]`);
    if (found && (!root?.contains || root.contains(found) || found === root)) {
      return readAttr(found, attrName);
    }
  }
  let cur = target;
  while (cur && cur !== root) {
    const val = readAttr(cur, attrName);
    if (val) return val;
    cur = cur.parentElement || cur.parentNode || null;
  }
  return null;
}

export function bindBreadboardInteractions(
  svgContainer,
  { parts = [], onSelectPart, onHoverNet } = {}
) {
  if (!svgContainer || typeof svgContainer.addEventListener !== 'function') {
    return () => {};
  }

  const prevCleanup = activeBindings.get(svgContainer);
  if (typeof prevCleanup === 'function') {
    prevCleanup();
  }

  const safeParts = Array.isArray(parts) ? parts : [];
  let lastHoverKey = null;

  const onClick = (ev) => {
    const partId = findNearestAttr(ev?.target, svgContainer, 'data-part-id');
    if (partId) {
      if (typeof onSelectPart === 'function') {
        onSelectPart(partId);
      }
      return;
    }

    const pin = findNearestAttr(ev?.target, svgContainer, 'data-pin');
    if (pin) {
      const owner = safeParts.find((p) => getPartPins(p).includes(pin));
      if (typeof onSelectPart === 'function') {
        onSelectPart(owner ? owner.id : null);
      }
      if (!owner && typeof onHoverNet === 'function') {
        onHoverNet(traceConnectedNet(safeParts, pin), {
          partId: null,
          pin,
          strip: getStripKeyForPin(pin)
        });
      }
      return;
    }

    if (typeof onSelectPart === 'function') {
      onSelectPart(null);
    }
  };

  const onMouseOver = (ev) => {
    if (typeof onHoverNet !== 'function') return;
    const partId = findNearestAttr(ev?.target, svgContainer, 'data-part-id');
    if (partId) {
      const key = `part:${partId}`;
      if (lastHoverKey === key) return;
      lastHoverKey = key;
      onHoverNet(traceConnectedNet(safeParts, partId), {
        partId,
        pin: null,
        strip: null
      });
      return;
    }

    const pin = findNearestAttr(ev?.target, svgContainer, 'data-pin');
    if (pin) {
      const key = `pin:${pin}`;
      if (lastHoverKey === key) return;
      lastHoverKey = key;
      onHoverNet(traceConnectedNet(safeParts, pin), {
        partId: null,
        pin,
        strip: getStripKeyForPin(pin)
      });
      return;
    }

    if (lastHoverKey !== null) {
      lastHoverKey = null;
      onHoverNet(null, { partId: null, pin: null, strip: null });
    }
  };

  const onMouseLeave = () => {
    lastHoverKey = null;
    if (typeof onHoverNet === 'function') {
      onHoverNet(null, { partId: null, pin: null, strip: null });
    }
  };

  svgContainer.addEventListener('click', onClick);
  svgContainer.addEventListener('mouseover', onMouseOver);
  svgContainer.addEventListener('mouseleave', onMouseLeave);

  const cleanup = () => {
    if (typeof svgContainer.removeEventListener === 'function') {
      svgContainer.removeEventListener('click', onClick);
      svgContainer.removeEventListener('mouseover', onMouseOver);
      svgContainer.removeEventListener('mouseleave', onMouseLeave);
    }
    if (activeBindings.get(svgContainer) === cleanup) {
      activeBindings.delete(svgContainer);
    }
  };

  activeBindings.set(svgContainer, cleanup);
  return cleanup;
}
