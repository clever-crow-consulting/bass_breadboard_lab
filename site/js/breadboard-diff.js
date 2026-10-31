export const VALID_HEADERS = new Set(['HDR_IN', 'HDR_OUT', 'HDR_9V', 'HDR_GND']);

const HOLE_RE = /^([A-J])([1-9]|[12][0-9]|30)$/;
const RAIL_RE = /^(TOP|BOT)_(PLUS|MINUS)_([1-9]|[12][0-9]|30)$/;
const STRIP_KEY_RE = /^(?:(?:TOP|BOT)_ROW_(?:[1-9]|[12][0-9]|30)|(?:TOP|BOT)_(?:PLUS|MINUS))$/;

export function getPartPins(part) {
  if (!part || typeof part !== 'object') return [];
  if (Array.isArray(part.pins)) {
    return [...part.pins];
  }
  return [part.from, part.to].filter(Boolean);
}

export function classifyPinToken(pin) {
  if (typeof pin !== 'string') {
    return { kind: 'invalid', raw: String(pin ?? '') };
  }
  const token = pin.trim();
  const holeMatch = token.match(HOLE_RE);
  if (holeMatch) {
    const col = holeMatch[1];
    const row = Number(holeMatch[2]);
    const half = 'ABCDE'.includes(col) ? 'TOP_ROW_' : 'BOT_ROW_';
    return {
      kind: 'hole',
      col,
      row,
      strip: `${half}${row}`
    };
  }

  const railMatch = token.match(RAIL_RE);
  if (railMatch) {
    const rail = `${railMatch[1]}_${railMatch[2]}`;
    const row = Number(railMatch[3]);
    return {
      kind: 'rail',
      rail,
      row,
      strip: rail
    };
  }

  if (VALID_HEADERS.has(token)) {
    return {
      kind: 'header',
      id: token,
      strip: token
    };
  }

  return { kind: 'invalid', raw: pin };
}

export function getStripKeyForPin(pin) {
  const info = classifyPinToken(pin);
  return info.kind === 'invalid' ? null : info.strip;
}

export function validateStageParts(parts) {
  const errors = [];
  const holeOwners = new Map();
  const seenIds = new Set();

  if (!Array.isArray(parts)) {
    return {
      valid: false,
      errors: ['parts must be an array'],
      holeOwners
    };
  }

  for (const part of parts) {
    if (!part || typeof part !== 'object' || typeof part.id !== 'string' || !part.id.trim()) {
      errors.push('part missing valid string id');
      continue;
    }

    if (seenIds.has(part.id)) {
      errors.push(`duplicate part id '${part.id}'`);
    }
    seenIds.add(part.id);

    const pins = getPartPins(part);
    if (pins.length < 2) {
      errors.push(`${part.id}: expected at least 2 pins, found ${pins.length}`);
      continue;
    }

    for (const pin of pins) {
      const classified = classifyPinToken(pin);
      if (classified.kind === 'invalid') {
        errors.push(`${part.id}: invalid pin token '${pin}'`);
        continue;
      }

      const key =
        classified.kind === 'hole'
          ? `${classified.col}${classified.row}`
          : classified.kind === 'rail'
            ? `${classified.rail}_${classified.row}`
            : classified.id;

      if (holeOwners.has(key)) {
        errors.push(`pin collision at ${key}: shared by ${holeOwners.get(key)} and ${part.id}`);
      } else {
        holeOwners.set(key, part.id);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    holeOwners
  };
}

export function traceConnectedNet(parts, seed) {
  const strips = new Set();
  const pins = new Set();
  const partIds = new Set();

  if (!Array.isArray(parts) || typeof seed !== 'string' || !seed.trim()) {
    return { strips, pins, partIds };
  }

  const trimmedSeed = seed.trim();
  const wireAdjacency = new Map();

  function addEdge(stripA, stripB) {
    if (!wireAdjacency.has(stripA)) wireAdjacency.set(stripA, new Set());
    if (!wireAdjacency.has(stripB)) wireAdjacency.set(stripB, new Set());
    wireAdjacency.get(stripA).add(stripB);
    wireAdjacency.get(stripB).add(stripA);
  }

  for (const part of parts) {
    if (part && part.type === 'wire') {
      const wireStrips = getPartPins(part)
        .map((p) => getStripKeyForPin(p))
        .filter(Boolean);
      for (let i = 0; i < wireStrips.length; i++) {
        for (let j = i + 1; j < wireStrips.length; j++) {
          addEdge(wireStrips[i], wireStrips[j]);
        }
      }
    }
  }

  const queue = [];
  const seedPart = parts.find((p) => p && p.id === trimmedSeed);
  if (seedPart) {
    partIds.add(seedPart.id);
    for (const pin of getPartPins(seedPart)) {
      const strip = getStripKeyForPin(pin);
      if (strip) {
        queue.push(strip);
        pins.add(pin);
      }
    }
  } else {
    const seedStrip = getStripKeyForPin(trimmedSeed);
    if (seedStrip) {
      queue.push(seedStrip);
      pins.add(trimmedSeed);
    } else if (STRIP_KEY_RE.test(trimmedSeed) || VALID_HEADERS.has(trimmedSeed)) {
      queue.push(trimmedSeed);
    }
  }

  for (const initialStrip of queue) {
    strips.add(initialStrip);
  }

  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const neighbors = wireAdjacency.get(cur);
    if (!neighbors) continue;
    for (const next of neighbors) {
      if (!strips.has(next)) {
        strips.add(next);
        queue.push(next);
      }
    }
  }

  for (const part of parts) {
    if (!part || !part.id) continue;
    const partPins = getPartPins(part);
    let touchesNet = false;
    for (const pin of partPins) {
      const strip = getStripKeyForPin(pin);
      if (strip && strips.has(strip)) {
        touchesNet = true;
        pins.add(pin);
      }
    }
    if (touchesNet) {
      partIds.add(part.id);
    }
  }

  return { strips, pins, partIds };
}

function normalizePartValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function computeBreadboardDiff(previousParts = [], currentParts = []) {
  const prevList = Array.isArray(previousParts) ? previousParts : [];
  const currList = Array.isArray(currentParts) ? currentParts : [];

  const prevById = new Map(prevList.map((p) => [p.id, p]));
  const currById = new Map(currList.map((p) => [p.id, p]));

  const unchanged = [];
  const modified = [];
  const added = [];
  const removed = [];
  const statusById = new Map();

  for (const part of currList) {
    const previousPart = prevById.get(part.id);
    if (!previousPart) {
      added.push(part);
      statusById.set(part.id, 'added');
      continue;
    }

    const fromPins = getPartPins(previousPart);
    const toPins = getPartPins(part);
    const sameType = previousPart.type === part.type;
    const sameValue = normalizePartValue(previousPart.value) === normalizePartValue(part.value);
    const samePins =
      fromPins.length === toPins.length && fromPins.every((pin, idx) => pin === toPins[idx]);

    if (sameType && sameValue && samePins) {
      unchanged.push(part);
      statusById.set(part.id, 'unchanged');
    } else {
      modified.push({
        id: part.id,
        part,
        previousPart,
        fromPins,
        toPins,
        fromValue: previousPart.value,
        toValue: part.value
      });
      statusById.set(part.id, 'modified');
    }
  }

  for (const prevPart of prevList) {
    if (!currById.has(prevPart.id)) {
      removed.push(prevPart);
      statusById.set(prevPart.id, 'removed');
    }
  }

  return {
    unchanged,
    modified,
    added,
    removed,
    statusById
  };
}
