export const BOM_CATEGORIES = [
  {
    id: 'semiconductors',
    label: 'Semiconductors and ICs',
    description: 'Transistors, dual JFET op-amps, unbuffered CMOS inverters, flip-flops, diodes, and 3mm red LEDs.'
  },
  {
    id: 'pots_optical',
    label: 'Potentiometers and optical sensors',
    description: '16mm PCB-pin or 9mm vertical snap-in breadboard pots plus GL5528 LDRs and 6mm heat-shrink tubing.'
  },
  {
    id: 'film_caps',
    label: '5mm pitch box film capacitors',
    description: 'Non-polarized 50V or 63V box film capacitors preserving bass response down to 31 Hz.'
  },
  {
    id: 'electrolytic_ceramic',
    label: 'Radial electrolytic and small ceramic capacitors',
    description: '25V to 50V radial electrolytics for 9V filtering and V_REF reservoirs plus 100pF stability caps.'
  },
  {
    id: 'resistors',
    label: '1/4W 1% metal film resistors',
    description: 'Thirteen core resistor values covering biasing, feedback, EQ, and power filtering across all stages.'
  }
];

export const BOM_ITEMS = [
  // Semiconductors and ICs (10)
  {
    id: 'semi_mpsa13',
    category: 'semiconductors',
    part: 'MPSA13',
    qty: 3,
    packageOrTaper: 'TO-92 (E-B-C)',
    stages: ['1'],
    role: 'Stage 1 high-gain NPN Darlington fuzz'
  },
  {
    id: 'semi_2n3904',
    category: 'semiconductors',
    part: '2N3904',
    qty: 6,
    packageOrTaper: 'TO-92 (E-B-C)',
    stages: ['1', '2'],
    role: 'Stage 2 Woolly Mammoth pair, general NPN stages'
  },
  {
    id: 'semi_2n5088',
    category: 'semiconductors',
    part: '2N5088',
    qty: 4,
    packageOrTaper: 'TO-92 (E-B-C)',
    stages: ['1', '2', '4', '6'],
    role: 'High-gain low-noise NPN swaps for Stages 1 and 2, plus emitter-follower buffer in Stages 4 and 6'
  },
  {
    id: 'semi_2n3906',
    category: 'semiconductors',
    part: '2N3906',
    qty: 4,
    packageOrTaper: 'TO-92 (E-B-C)',
    stages: ['1', '2'],
    role: 'Negative-ground PNP layouts in Stages 1 and 2'
  },
  {
    id: 'semi_tl072',
    category: 'semiconductors',
    part: 'TL072CP or TL072IP',
    qty: 4,
    packageOrTaper: 'DIP-8',
    stages: ['3', '5a', '5b', '6'],
    role: 'Stages 3, 5A, 5B, and 6 dual JFET-input op-amp'
  },
  {
    id: 'semi_cd4049ube',
    category: 'semiconductors',
    part: 'CD4049UBE',
    qty: 2,
    packageOrTaper: 'DIP-16',
    stages: ['4'],
    role: 'Stage 4 SVT-style CMOS tube overdrive (must be UBE unbuffered, not BE)'
  },
  {
    id: 'semi_cd4013be',
    category: 'semiconductors',
    part: 'CD4013BE',
    qty: 2,
    packageOrTaper: 'DIP-14',
    stages: ['6'],
    role: 'Stage 6 divide-by-two -1 and -2 octave flip-flop'
  },
  {
    id: 'semi_1n4148',
    category: 'semiconductors',
    part: '1N4148',
    qty: 10,
    packageOrTaper: 'DO-35',
    stages: ['1', '3', '5a', '5b'],
    role: 'Clipping, Bazz Fuss feedback, and Stage 5 envelope rectifier'
  },
  {
    id: 'semi_1n5817',
    category: 'semiconductors',
    part: '1N5817',
    qty: 5,
    packageOrTaper: 'DO-41',
    stages: ['1', '3'],
    role: 'Low-threshold Schottky clipping and polarity protection'
  },
  {
    id: 'semi_led_red_3mm',
    category: 'semiconductors',
    part: '3mm Red Diffused LED',
    qty: 10,
    packageOrTaper: '3mm radial',
    stages: ['1', '3', '5a', '5b'],
    role: 'High-headroom bass clipping (1.8V drop) and Stage 5 optical vactrol emitter'
  },

  // Potentiometers and optical sensors (6)
  {
    id: 'pot_100ka',
    category: 'pots_optical',
    part: '100kA (100k Audio / Log)',
    qty: 2,
    packageOrTaper: 'Audio (A)',
    stages: ['1', '2', '3', '4', '5a', '5b', '6'],
    role: 'Master VOLUME across Stages 1 to 6'
  },
  {
    id: 'pot_100kb',
    category: 'pots_optical',
    part: '100kB (100k Linear)',
    qty: 3,
    packageOrTaper: 'Linear (B)',
    stages: ['2', '3', '4', '5a', '5b', '6'],
    role: 'Stage 2 EQ, Stage 3 BLEND, Stage 4 Bass/Treble, Stage 5 Sensitivity, Stage 6 MIX'
  },
  {
    id: 'pot_500kb',
    category: 'pots_optical',
    part: '500kB (500k Linear)',
    qty: 1,
    packageOrTaper: 'Linear (B)',
    stages: ['2', '4'],
    role: 'Stage 2 PINCH synth gate, Stage 4 CMOS DRIVE'
  },
  {
    id: 'pot_10kb',
    category: 'pots_optical',
    part: '10kB (10k Linear)',
    qty: 1,
    packageOrTaper: 'Linear (B)',
    stages: ['2', '5a'],
    role: 'Optional stock low-Z EQ or WOOL / Decay control'
  },
  {
    id: 'opt_gl5528',
    category: 'pots_optical',
    part: 'GL5528 LDR Photoresistor',
    qty: 4,
    packageOrTaper: '5mm radial',
    stages: ['5a', '5b'],
    role: 'Stage 5A envelope filter and Stage 5B optical compressor (10k to 20k light, 1M dark)'
  },
  {
    id: 'opt_heatshrink_6mm',
    category: 'pots_optical',
    part: '6mm Black Heat-Shrink',
    qty: 1,
    packageOrTaper: '1 ft tubing',
    stages: ['5a', '5b'],
    role: 'Sleeves one 3mm red LED nose-to-nose with one GL5528 LDR for Stage 5'
  },

  // 5mm pitch box film capacitors (7)
  {
    id: 'cap_470nf',
    category: 'film_caps',
    part: '470nF (0.47uF)',
    qty: 6,
    packageOrTaper: '5mm box film (474)',
    stages: ['1', '2', '3', '4', '5a', '5b', '6'],
    role: 'Full-range 31 Hz bass input/output coupling across Stages 1 to 6'
  },
  {
    id: 'cap_220nf',
    category: 'film_caps',
    part: '220nF (0.22uF)',
    qty: 6,
    packageOrTaper: '5mm box film (224)',
    stages: ['2', '3', '4', '5a', '5b', '6'],
    role: 'Stage 2 coupling, Stage 3 154 Hz grit high-pass, Stages 4 to 6 coupling'
  },
  {
    id: 'cap_100nf',
    category: 'film_caps',
    part: '100nF (0.1uF)',
    qty: 6,
    packageOrTaper: '5mm box film (104)',
    stages: ['1', '4', '6'],
    role: 'Power rail ceramic/film decoupling, Stage 4 and 6 filters'
  },
  {
    id: 'cap_47nf',
    category: 'film_caps',
    part: '47nF (0.047uF)',
    qty: 4,
    packageOrTaper: '5mm box film (473)',
    stages: ['3', '4', '6'],
    role: 'Stage 3 225 Hz bi-amp clean sub low-pass, Stage 4 Baxandall, Stage 6 filter'
  },
  {
    id: 'cap_22nf',
    category: 'film_caps',
    part: '22nF (0.022uF)',
    qty: 4,
    packageOrTaper: '5mm box film (223)',
    stages: ['2', '5a', '6'],
    role: 'Stage 2 bass tilt EQ leg, Stage 5A resonant filter, Stage 6 tracking filter'
  },
  {
    id: 'cap_10nf',
    category: 'film_caps',
    part: '10nF (0.01uF)',
    qty: 4,
    packageOrTaper: '5mm box film (103)',
    stages: ['1', '5a', '6'],
    role: 'Stage 1 treble tamer, Stage 5A sweep filter, Stage 6 tracking filter'
  },
  {
    id: 'cap_4n7',
    category: 'film_caps',
    part: '4.7nF (0.0047uF)',
    qty: 4,
    packageOrTaper: '5mm box film (472)',
    stages: ['2', '4', '5a'],
    role: 'Stage 2 treble bite EQ leg, Stage 4 treble shelf, Stage 5A high sweep'
  },

  // Radial electrolytic and small ceramic capacitors (5)
  {
    id: 'cap_100uf',
    category: 'electrolytic_ceramic',
    part: '100uF',
    qty: 4,
    packageOrTaper: 'Radial Electrolytic',
    stages: ['1', '2', '3', '4', '5a', '5b', '6'],
    role: 'Row 2 main 9V RC power hum filter'
  },
  {
    id: 'cap_47uf',
    category: 'electrolytic_ceramic',
    part: '47uF',
    qty: 4,
    packageOrTaper: 'Radial Electrolytic',
    stages: ['3', '4', '5a', '5b', '6'],
    role: 'Stage 3 to 6 +4.5V virtual-ground (V_REF) reservoir'
  },
  {
    id: 'cap_22uf',
    category: 'electrolytic_ceramic',
    part: '22uF',
    qty: 4,
    packageOrTaper: 'Radial Electrolytic',
    stages: ['2', '5a', '5b'],
    role: 'Stage 2 Q2 emitter bypass (WOOL), Stage 5 envelope decay'
  },
  {
    id: 'cap_1uf',
    category: 'electrolytic_ceramic',
    part: '1uF',
    qty: 4,
    packageOrTaper: 'Radial Electrolytic or Film',
    stages: ['5a', '5b'],
    role: 'Stage 5 envelope attack/release smoothing'
  },
  {
    id: 'cap_100pf',
    category: 'electrolytic_ceramic',
    part: '100pF',
    qty: 4,
    packageOrTaper: 'Ceramic / MLCC',
    stages: ['3', '4', '5a', '5b', '6'],
    role: 'Op-amp feedback ultrasonic stability cap (tames breadboard radio pickup)'
  },

  // 1/4W 1% metal film resistors (13)
  {
    id: 'res_100r',
    category: 'resistors',
    part: '100 ohm',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['1', '2', '3', '4', '5a', '5b', '6'],
    role: 'Row 2 9V power hum filter, Stage 2 Q2 max-wool emitter stopper'
  },
  {
    id: 'res_1k',
    category: 'resistors',
    part: '1k',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['1', '2', '5a', '5b'],
    role: 'Stage 1 clipping mod, Stage 2 tamed-wool mod, LED current limiters'
  },
  {
    id: 'res_2k2',
    category: 'resistors',
    part: '2.2k',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['2', '5a', '5b'],
    role: 'Stage 2 Q2 emitter bias, Stage 5 LED driver'
  },
  {
    id: 'res_4k7',
    category: 'resistors',
    part: '4.7k',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['1', '2', '3', '5a', '5b', '6'],
    role: 'Stage 2 Q2 collector load, Stage 3 grit high-pass leg, Stage 5 and 6 biasing'
  },
  {
    id: 'res_10k',
    category: 'resistors',
    part: '10k',
    qty: 20,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['1', '3', '4', '5a', '5b', '6'],
    role: '+4.5V V_REF voltage dividers (2x 10k per op-amp build), Stage 1 R1'
  },
  {
    id: 'res_15k',
    category: 'resistors',
    part: '15k',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['2', '3', '4', '5a', '6'],
    role: 'Stage 2 PINCH minimum gate stopper, Stage 3 clean/wet blend feeds'
  },
  {
    id: 'res_33k',
    category: 'resistors',
    part: '33k',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['2', '4', '5a', '5b'],
    role: 'Stage 2 bass/treble tilt EQ branches, Stage 4 Baxandall, Stage 5 filter'
  },
  {
    id: 'res_47k',
    category: 'resistors',
    part: '47k',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['2', '3', '4', '5a'],
    role: 'Stage 2 Q1 collector load and active-bass input pad, Stage 3 phase-trap demo'
  },
  {
    id: 'res_100k',
    category: 'resistors',
    part: '100k',
    qty: 20,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['1', '2', '3', '4', '5a', '5b', '6'],
    role: 'Stage 1 MPSA13 load, Stage 2 R_FB feedback, op-amp bias and mixing'
  },
  {
    id: 'res_150k',
    category: 'resistors',
    part: '150k',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['3', '5b', '6'],
    role: 'Stage 3 +30 dB soft-clipping feedback gain, Stage 5B and Stage 6 gain'
  },
  {
    id: 'res_220k',
    category: 'resistors',
    part: '220k',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['1', '4', '5a'],
    role: 'Stage 1 AC128 leakage bleed, Stage 4 soft CMOS preset, Stage 5 envelope sensitivity'
  },
  {
    id: 'res_470k',
    category: 'resistors',
    part: '470k',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['4', '6'],
    role: 'Stage 4 CMOS inverter feedback, Stage 6 Schmitt trigger hysteresis'
  },
  {
    id: 'res_1m',
    category: 'resistors',
    part: '1M',
    qty: 10,
    packageOrTaper: '1/4W 1% metal film',
    stages: ['1', '2', '3', '4', '5a', '5b', '6'],
    role: 'Row 7 anti-pop input pulldown and high-Z op-amp input bias across all stages'
  }
];

function matchesStageFilter(itemStages, stageFilter) {
  if (!stageFilter || stageFilter === 'all') return true;
  const norm = String(stageFilter).trim().toLowerCase();
  if (norm === '5') {
    return itemStages.includes('5a') || itemStages.includes('5b');
  }
  return itemStages.includes(norm);
}

export function filterBomItems(
  items,
  { stageFilter = 'all', category = 'all', hideOwned = false, ownedIds = [] } = {}
) {
  if (!Array.isArray(items)) return [];
  const ownedSet = new Set(ownedIds || []);
  return items.filter((item) => {
    if (category && category !== 'all' && item.category !== category) {
      return false;
    }
    if (!matchesStageFilter(item.stages || [], stageFilter)) {
      return false;
    }
    if (hideOwned && ownedSet.has(item.id)) {
      return false;
    }
    return true;
  });
}

export function formatBomPlainText(items, ownedIds = []) {
  const list = Array.isArray(items) ? items : [];
  const ownedSet = new Set(ownedIds || []);
  const lines = [`Bass Breadboard Lab shopping list (${list.length} items)`];
  for (const item of list) {
    const mark = ownedSet.has(item.id) ? '[x]' : '[ ]';
    const stagesLabel = Array.isArray(item.stages) ? item.stages.join(', ') : '';
    lines.push(
      `${mark} ${item.qty}x ${item.part} (${item.packageOrTaper}) | Stages: ${stagesLabel} | ${item.role}`
    );
  }
  return lines.join('\n');
}

export function formatBomMarkdown(items, ownedIds = []) {
  const list = Array.isArray(items) ? items : [];
  const ownedSet = new Set(ownedIds || []);
  const lines = ['# Bass Breadboard Lab shopping list', ''];
  for (const item of list) {
    const mark = ownedSet.has(item.id) ? '[x]' : '[ ]';
    const stagesLabel = Array.isArray(item.stages) ? item.stages.join(', ') : '';
    lines.push(
      `- ${mark} **${item.qty}x ${item.part}** (${item.packageOrTaper}) - Stages: ${stagesLabel} - ${item.role}`
    );
  }
  return lines.join('\n');
}
