import { onePoleAlpha } from '../../riffs.js';

const SHARED_VOLTAGES = [
  { pin: 'V_REF Hub (G9)', val: '+4.35V to +4.45V', net: 'Idle reference for LED & Filter' },
  { pin: 'Preamp Out (G17)', val: '+4.4V DC idle', net: 'Swings to +7.8V peak on plucks' },
  { pin: 'Filter Out Pin 7 (B13)', val: '+4.4V DC idle', net: 'Resonant band-pass output' },
  { pin: 'Envelope Cap (B16)', val: '+4.4V rest -> +7.2V pluck', net: 'Watch DC jump when you pluck!' }
];

const PRESETS = {
  sub_quack: {
    id: 'sub_quack',
    label: 'Deep Synth Sub-Quack (2x 10nF)',
    badge: 'Thundercat Vibe',
    filterCap: '10nF Film',
    envCap: '22uF Elec',
    sweepRange: '140 Hz to 770 Hz',
    decayTime: '103 ms Vocal',
    probePoints: ['G9', 'G17', 'B13'],
    bannerTitle: 'Deep Bass Formant Envelope Filter (140 Hz to 770 Hz Sweep)',
    bannerText:
      'Op-Amp A boosts your passive bass up to 22x (set by SENS) to drive the 1N4148 peak rectifier and vactrol LED. As the GL5528 photoresistor drops from ~150k down to ~2k, Op-Amp B sweeps a constant-gain Multiple-Feedback Band-Pass Filter across 140 Hz to 770 Hz while MIX blends your solid 41 Hz dry sub underneath.',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Room light hitting an uncovered LDR pre-shifts the filter upward. Slip a 15mm piece of black heat-shrink tubing (pinched shut at the top) over the LED + LDR pair for full deep-bass range.'
  },
  slap_funk: {
    id: 'slap_funk',
    label: 'Bootsy Slap Quack (2x 4.7nF)',
    badge: 'Classic Funk',
    filterCap: '4.7nF Film',
    envCap: '22uF Elec',
    sweepRange: '295 Hz to 1.63 kHz',
    decayTime: '103 ms Vocal',
    probePoints: ['G9', 'G17', 'B13'],
    bannerTitle: 'High-Snap Funk Auto-Wah Mode (295 Hz to 1.63 kHz Sweep)',
    bannerText:
      'Swaps filter capacitors C_F1 and C_F2 from 10nF to 4.7nF, shifting the resonant peak up an octave into the classic 300 Hz to 1.6 kHz vocal quack zone for thumb slap and popped octaves.',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Because MFB peak gain equals R_Q / (2 * R_MFB_IN) = 2.3x regardless of LDR resistance, loud popped notes never rail-clip Op-Amp B.'
  },
  slow_swell: {
    id: 'slow_swell',
    label: 'Slow Synth Swell (47uF Envelope)',
    badge: 'Syrupy Decay',
    filterCap: '10nF Film',
    envCap: '47uF Elec',
    sweepRange: '140 Hz to 770 Hz',
    decayTime: '220 ms Slow',
    probePoints: ['G9', 'G17', 'B13'],
    bannerTitle: 'Long-Decay Analog Synth Filter Mode (C_ENV = 47uF)',
    bannerText:
      'Doubles C_ENV at B16-C15 from 22uF to 47uF, stretching the LED discharge time constant to 220 ms for slow, liquid synth-bass sweeps on sustained notes.',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Watch C_ENV polarity: (+) lead goes in B16 (rectified peak up to +7.8V), (-) lead goes in C15 (+4.4V V_REF).'
  }
};

const MODES = {
  standard: {
    id: 'standard',
    label: 'Standard Vactrol Filter Layout',
    desc: 'TL072 at Rows 12 to 15 with DIY heat-shrink Red LED + GL5528 LDR on the top strip.'
  }
};

function withPartMeta(part) {
  return {
    ref: part.ref || part.id,
    role: part.role || part.notes,
    ...part
  };
}

function buildComponents(presetInput) {
  const preset =
    (typeof presetInput === 'string'
      ? Object.hasOwn(PRESETS, presetInput)
        ? PRESETS[presetInput]
        : null
      : presetInput) || PRESETS.sub_quack;

  const parts = [
    {
      id: 'J_GND_HDR',
      stage: 1,
      type: 'wire',
      name: 'GND Feed',
      value: 'Black Jumper',
      from: 'HDR_GND',
      to: 'TOP_MINUS_1',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Unchanged Row 1 ground feed.'
    },
    {
      id: 'J_GND_BRIDGE',
      stage: 1,
      type: 'wire',
      name: 'GND Rail Bridge',
      value: 'Black Jumper',
      from: 'TOP_MINUS_30',
      to: 'BOT_MINUS_30',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Powers bottom ground bus.'
    },
    {
      id: 'J_9V_HDR',
      stage: 1,
      type: 'wire',
      name: '+9V Feed',
      value: 'Red Jumper',
      from: 'HDR_9V',
      to: 'C2',
      color: '#ef4444',
      net: 'Raw +9V',
      notes: 'Unchanged Row 2 supply feed.'
    },
    {
      id: 'R_PWR',
      stage: 1,
      type: 'resistor',
      name: 'R_PWR',
      value: '100 ohm',
      from: 'A2',
      to: 'TOP_PLUS_2',
      net: 'Filtered +8.7V',
      notes: 'RC supply filter.'
    },
    {
      id: 'C_PWR',
      stage: 1,
      type: 'ecap',
      name: 'C_PWR',
      value: '100uF Elec',
      from: 'TOP_PLUS_4',
      to: 'TOP_MINUS_4',
      plusAt: 'TOP_PLUS_4',
      net: 'Filtered +8.7V',
      notes: '(+) in Top Red (+), (-) in Top Blue (-).'
    },
    {
      id: 'R_V1',
      stage: 1,
      type: 'resistor',
      name: 'R_V1 (V_REF Up)',
      value: '10k ohm',
      from: 'A9',
      to: 'TOP_PLUS_9',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Upper 10k divider creating +4.4V virtual ground at Row 9.'
    },
    {
      id: 'R_V2',
      stage: 1,
      type: 'resistor',
      name: 'R_V2 (V_REF Dn)',
      value: '10k ohm',
      from: 'B9',
      to: 'TOP_MINUS_9',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Lower 10k divider to GND.'
    },
    {
      id: 'C_VREF',
      stage: 1,
      type: 'ecap',
      name: 'C_VREF',
      value: '47uF Elec',
      from: 'C9',
      to: 'TOP_MINUS_8',
      plusAt: 'C9',
      net: 'V_REF (+4.4V) Hub',
      notes: '(+) in C9, (-) in TOP_MINUS_8.'
    },
    {
      id: 'J_VREF_LINK',
      stage: 1,
      type: 'wire',
      name: 'V_REF Bridge',
      value: 'Teal Jumper',
      from: 'E9',
      to: 'F9',
      color: '#14b8a6',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Links Top Row 9 and Bottom Row 9 as +4.4V hubs (probe at G9).'
    },
    {
      id: 'IC1',
      stage: 2,
      type: 'dipN',
      ref: 'IC1',
      tag: 'IC1',
      startCol: 12,
      spanCols: 4,
      chipLabel: 'TL072',
      name: 'IC1 (TL072)',
      value: 'TL072 Dual Op-Amp',
      pins: ['E12', 'E13', 'E14', 'E15', 'F12', 'F13', 'F14', 'F15'],
      from: 'Rows 12-15 Top (8..5)',
      to: 'Rows 12-15 Bot (1..4)',
      net: 'Preamp + Resonant Filter',
      notes:
        'Notch faces LEFT at Row 12: F12=Pin1(OUT_A), F13=Pin2(IN_A-), F14=Pin3(IN_A+), F15=Pin4(GND), E15=Pin5(IN_B+), E14=Pin6(IN_B-), E13=Pin7(OUT_B), E12=Pin8(+9V).'
    },
    {
      id: 'J_IC_VCC',
      stage: 2,
      type: 'wire',
      name: 'Pin 8 +9V',
      value: 'Red Jumper',
      from: 'A12',
      to: 'TOP_PLUS_12',
      color: '#ef4444',
      net: 'Filtered +8.7V',
      notes: 'Powers TL072 Pin 8.'
    },
    {
      id: 'J_IC_GND',
      stage: 2,
      type: 'wire',
      name: 'Pin 4 GND',
      value: 'Black Jumper',
      from: 'J15',
      to: 'BOT_MINUS_15',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Grounds TL072 Pin 4.'
    },
    {
      id: 'J_IN',
      stage: 2,
      type: 'wire',
      name: 'Audio IN Feed',
      value: 'Green Jumper',
      from: 'HDR_IN',
      to: 'B5',
      color: '#22c55e',
      net: 'Passive Bass In',
      notes: 'Brings passive bass input into Row 5.'
    },
    {
      id: 'R_PD',
      stage: 2,
      type: 'resistor',
      name: 'R_PD',
      value: '1M ohm',
      from: 'A5',
      to: 'TOP_MINUS_5',
      net: 'Input Anti-Pop',
      notes: 'Eliminates footswitch pop.'
    },
    {
      id: 'C1',
      stage: 2,
      type: 'filmcap',
      name: 'C1 (Input Cap)',
      value: '470nF Film',
      from: 'D5',
      to: 'D7',
      color: '#38bdf8',
      net: 'AC Bass Input',
      notes: 'Passes full 31 Hz passive bass fundamental.'
    },
    {
      id: 'J_IN_PIN3',
      stage: 2,
      type: 'wire',
      name: 'Pin 3 Feed',
      value: 'Green Jumper',
      from: 'E7',
      to: 'H14',
      color: '#22c55e',
      net: 'Op-Amp A IN+ (Pin 3)',
      notes: 'Connects input cap to Pin 3 (Row 14 Bottom).'
    },
    {
      id: 'R_BIAS',
      stage: 2,
      type: 'resistor',
      name: 'R_BIAS',
      value: '1M ohm',
      from: 'I9',
      to: 'I14',
      net: '1M Passive Pickup Bias',
      notes: 'Biases Pin 3 to +4.4V V_REF at 1 Megaohm input impedance.'
    },
    {
      id: 'R_PRE_FB',
      stage: 2,
      type: 'resistor',
      name: 'R_PRE_FB',
      value: '100k ohm',
      from: 'G12',
      to: 'G13',
      net: 'Preamp Gain Loop',
      notes: 'Feedback resistor between Pin 1 (OUT_A) and Pin 2 (IN_A-).'
    },
    {
      id: 'J_PIN1_HUB',
      stage: 2,
      type: 'wire',
      name: 'Preamp Out Spur',
      value: 'Green Jumper',
      from: 'I12',
      to: 'F17',
      color: '#22c55e',
      net: 'Boosted Dry Bass (Pin 1)',
      notes: 'Extends Pin 1 output to Row 17 Bottom (probe at G17).'
    },
    {
      id: 'R_SENS_MIN',
      stage: 2,
      type: 'resistor',
      name: 'R_SENS_MIN',
      value: '4.7k ohm',
      from: 'H13',
      to: 'F6',
      net: 'Sensitivity Range',
      notes: 'Connects Pin 2 to SENS Wiper (Row 6 Bottom), allowing up to 22x boost for passive pickups.'
    },
    {
      id: 'SENS_POT',
      stage: 2,
      type: 'pot',
      ref: 'SENS',
      tag: 'SENS',
      name: 'SENS (100kB)',
      value: '100k Linear Pot',
      pins: ['G4', 'G6', 'G8'],
      from: 'G4 (Open)',
      to: 'G6 (Wiper) / G8 (CW)',
      net: 'Pluck Sensitivity',
      notes: 'Turning clockwise lowers resistance toward 4.7k so gentler plucks fire the vactrol LED.'
    },
    {
      id: 'C_SENS',
      stage: 2,
      type: 'filmcap',
      name: 'C_SENS',
      value: '220nF Film',
      from: 'I8',
      to: 'I10',
      color: '#22c55e',
      net: 'Preamp DC Block',
      notes: 'Keeps Op-Amp A DC gain at 1.0x so Pin 1 idles at +4.4V.'
    },
    {
      id: 'J_SENS_VREF',
      stage: 2,
      type: 'wire',
      name: 'Sens V_REF Tie',
      value: 'Teal Jumper',
      from: 'H9',
      to: 'H10',
      color: '#14b8a6',
      net: 'V_REF (+4.4V) Hub',
      notes: 'References C_SENS to +4.4V virtual ground.'
    },
    {
      id: 'J_PIN5_VREF',
      stage: 3,
      type: 'wire',
      name: 'Pin 5 V_REF Spur',
      value: 'Teal Jumper',
      from: 'D9',
      to: 'D15',
      color: '#14b8a6',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Biases Op-Amp B Pin 5 (E15) to +4.4V and brings V_REF next to the vactrol.'
    },
    {
      id: 'J_VACTROL_VREF',
      stage: 3,
      type: 'wire',
      name: 'Vactrol V_REF Return',
      value: 'Teal Jumper',
      from: 'B15',
      to: 'B18',
      color: '#14b8a6',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Makes Row 18 Top the shared +4.4V return for both Vactrol LED cathode and LDR.'
    },
    {
      id: 'D_RECT',
      stage: 3,
      type: 'diode',
      name: 'D_RECT (Peak)',
      value: '1N4148 Silicon',
      from: 'H12',
      to: 'E16',
      stripeAt: 'E16',
      net: 'Half-Wave Envelope Rectifier',
      notes: 'Anode at Pin 1 (H12), Cathode stripe at E16. Charges C_ENV on positive bass plucks.'
    },
    {
      id: 'C_ENV',
      stage: 3,
      type: 'ecap',
      name: 'C_ENV (Decay)',
      value: preset.envCap,
      from: 'B16',
      to: 'C15',
      plusAt: 'B16',
      net: 'Envelope Smoothing Cap',
      notes: `(+) lead in B16, (-) lead in C15 (+4.4V V_REF). Sets ${preset.decayTime} filter release.`
    },
    {
      id: 'R_LED',
      stage: 3,
      type: 'resistor',
      name: 'R_LED',
      value: '4.7k ohm',
      from: 'A16',
      to: 'A17',
      net: 'LED Current & Release',
      notes: 'Delivers envelope current into VACTROL LED anode at Row 17.'
    },
    {
      id: 'VAC_LED',
      stage: 3,
      type: 'vactrol_led',
      name: 'VACTROL LED',
      value: '3mm Red LED',
      from: 'C17',
      to: 'C18',
      stripeAt: 'C18',
      net: 'Optical Emitter',
      notes:
        'Long (+) anode in C17, short (-) cathode in C18. Bend lens right to touch VAC_LDR inside black heat-shrink!'
    },
    {
      id: 'VAC_LDR',
      stage: 3,
      type: 'vactrol_ldr',
      name: 'VACTROL LDR',
      value: 'GL5528 Photoresistor',
      from: 'D18',
      to: 'C21',
      net: 'Optical Sweep Resistor',
      notes:
        'Non-polarized photoresistor from D18 (V_REF) to C21 (Filter Node X). Sleeve snugly against VAC_LED!'
    },
    {
      id: 'J_OUTB_SPUR',
      stage: 4,
      type: 'wire',
      name: 'Pin 7 Filter Out',
      value: 'Amber Jumper',
      from: 'C13',
      to: 'B19',
      color: '#f59e0b',
      net: 'Resonant Peak Out (Pin 7)',
      notes: 'Breaks Pin 7 (probe at B13) out to Row 19 Top.'
    },
    {
      id: 'J_INB_SPUR',
      stage: 4,
      type: 'wire',
      name: 'Pin 6 Filter Sum',
      value: 'Cyan Jumper',
      from: 'D14',
      to: 'B23',
      color: '#06b6d4',
      net: 'Op-Amp B IN- (Pin 6)',
      notes: 'Breaks Pin 6 out to Row 23 Top so C_F1 and C_F2 sit at exact 2-row box-cap spacing.'
    },
    {
      id: 'R_MFB_IN',
      stage: 4,
      type: 'resistor',
      name: 'R_MFB_IN',
      value: '47k ohm',
      from: 'J12',
      to: 'B21',
      net: 'Filter Input Node X',
      notes: 'Feeds boosted bass from Pin 1 (J12) into Filter Node X (Row 21 Top).'
    },
    {
      id: 'C_F2',
      stage: 4,
      type: 'filmcap',
      name: 'C_F2',
      value: preset.filterCap,
      from: 'D19',
      to: 'D21',
      color: '#fb923c',
      net: 'Band-Pass Feedback Cap',
      notes: `Exact 2-row box cap from Filter Out (D19) to Node X (D21). Sets ${preset.sweepRange} range.`
    },
    {
      id: 'C_F1',
      stage: 4,
      type: 'filmcap',
      name: 'C_F1',
      value: preset.filterCap,
      from: 'E21',
      to: 'E23',
      color: '#fb923c',
      net: 'Band-Pass Summing Cap',
      notes: 'Matched value to C_F2 from Node X (E21) to Pin 6 Spur (E23).'
    },
    {
      id: 'R_Q',
      stage: 4,
      type: 'resistor',
      name: 'R_Q (Resonance)',
      value: '220k ohm',
      from: 'A19',
      to: 'A23',
      net: 'Resonant Q Feedback',
      notes: 'Sets vocal filter resonance (up to Q = 5.3 on hard plucks).'
    },
    {
      id: 'R_DRY_MIX',
      stage: 4,
      type: 'resistor',
      name: 'R_DRY_MIX',
      value: '33k ohm',
      from: 'J17',
      to: 'F19',
      net: 'Dry Sub Blend Leg',
      notes: 'Feeds solid 41 Hz dry bass from Row 17 Hub into MIX Lug 1 (Row 19 Bottom).'
    },
    {
      id: 'R_WET_MIX',
      stage: 4,
      type: 'resistor',
      name: 'R_WET_MIX',
      value: '15k ohm',
      from: 'E19',
      to: 'F23',
      net: 'Funk Peak Blend Leg',
      notes: 'Feeds resonant auto-wah output from Row 19 Top into MIX Lug 3 (Row 23 Bottom).'
    },
    {
      id: 'MIX_POT',
      stage: 4,
      type: 'pot',
      ref: 'MIX',
      tag: 'MIX',
      name: 'MIX (100kB)',
      value: '100k Linear Pot',
      pins: ['G19', 'G21', 'G23'],
      from: 'G19 (Dry Sub)',
      to: 'G21 (Wiper) / G23 (Funk)',
      net: 'Dry Sub / Auto-Wah Blend',
      notes: 'Keeps punchy low-E fundamental anchored under high resonant quack.'
    },
    {
      id: 'J_MIX_TAP',
      stage: 4,
      type: 'wire',
      name: 'Mix Wiper Out',
      value: 'Amber Jumper',
      from: 'H21',
      to: 'C25',
      color: '#f59e0b',
      net: 'Blended Output (+4.4V DC)',
      notes: 'Routes MIX Wiper to DC-blocking output cap at Row 25 Top.'
    },
    {
      id: 'C_OUT',
      stage: 4,
      type: 'filmcap',
      name: 'C_OUT',
      value: '470nF Film',
      from: 'D25',
      to: 'D27',
      color: '#38bdf8',
      net: 'DC-Blocked Audio Out',
      notes: 'Strips +4.4V V_REF offset while preserving sub-bass down to 3.4 Hz.'
    },
    {
      id: 'J_VOL_IN',
      stage: 4,
      type: 'wire',
      name: 'Vol Lug 3 Feed',
      value: 'Amber Jumper',
      from: 'E27',
      to: 'F26',
      color: '#f59e0b',
      net: 'Master Volume Input',
      notes: 'Feeds Volume Lug 3.'
    },
    {
      id: 'VOL_POT',
      stage: 4,
      type: 'pot',
      ref: 'VOL',
      tag: 'VOL',
      name: 'VOL (100kA)',
      value: '100k Audio Pot',
      pins: ['G26', 'G28', 'G30'],
      from: 'G26 (Lug 3)',
      to: 'G28 (Wiper) / G30 (Lug 1)',
      net: 'Master Output Level',
      notes: 'Master output volume.'
    },
    {
      id: 'J_VOL_GND',
      stage: 4,
      type: 'wire',
      name: 'Vol Lug 1 GND',
      value: 'Black Jumper',
      from: 'I30',
      to: 'BOT_MINUS_28',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Grounds Volume Lug 1.'
    },
    {
      id: 'J_OUT',
      stage: 4,
      type: 'wire',
      name: 'Audio OUT Feed',
      value: 'Amber Jumper',
      from: 'F28',
      to: 'HDR_OUT',
      color: '#f59e0b',
      net: 'Pedal Output',
      notes: 'Sends Volume Wiper to Coppersound OUT header.'
    }
  ];

  return parts.map(withPartMeta);
}

function buildWiringSteps(presetInput) {
  const preset =
    (typeof presetInput === 'string'
      ? Object.hasOwn(PRESETS, presetInput)
        ? PRESETS[presetInput]
        : null
      : presetInput) || PRESETS.sub_quack;

  return [
    {
      step: 1,
      title: 'Supply hum filter and Row 9 +4.4V V_REF hub',
      goal: 'Establish quiet single-supply rails and a half-supply reference shared with Stage 5B.',
      instructions: [
        'Keep J_GND_HDR (HDR_GND to TOP_MINUS_1), J_GND_BRIDGE (TOP_MINUS_30 to BOT_MINUS_30), J_9V_HDR (HDR_9V to C2), R_PWR (100 ohm, A2 to TOP_PLUS_2), and C_PWR (100uF, TOP_PLUS_4 to TOP_MINUS_4).',
        'Build the Row 9 virtual ground with R_V1 (10k ohm, A9 to TOP_PLUS_9), R_V2 (10k ohm, B9 to TOP_MINUS_9), C_VREF (47uF electrolytic, + in C9, - in TOP_MINUS_8), and J_VREF_LINK (Teal Jumper, E9 to F9).'
      ],
      check: 'Meter +4.35V to +4.45V DC at probe point G9.'
    },
    {
      step: 2,
      title: 'TL072 placement, 1M passive preamp, and SENS control',
      goal: 'Boost passive bass plucks up to 22x so gentle fingerstyle attacks still fire the envelope LED.',
      instructions: [
        'Seat IC1 (TL072) across E12-E15 and F12-F15 with the Pin 1 notch facing LEFT at Row 12; wire J_IC_VCC (A12 to TOP_PLUS_12) and J_IC_GND (J15 to BOT_MINUS_15).',
        'Wire the passive input network: J_IN (HDR_IN to B5), R_PD (1M ohm, A5 to TOP_MINUS_5), C1 (470nF film, D5 to D7), J_IN_PIN3 (E7 to H14), and R_BIAS (1M ohm, I9 to I14).',
        'Close Op-Amp A preamp gain with R_PRE_FB (100k ohm, G12 to G13), J_PIN1_HUB (I12 to F17), R_SENS_MIN (4.7k ohm, H13 to F6), SENS_POT (100kB at G4/G6/G8), C_SENS (220nF, I8 to I10), and J_SENS_VREF (H9 to H10).'
      ],
      check: 'Probe Preamp Out at G17: idle sits at +4.4V DC and jumps toward +7.8V on hard plucks.'
    },
    {
      step: 3,
      title: `1N4148 peak rectifier, ${preset.envCap} decay cap, and DIY heat-shrink vactrol`,
      goal: `Convert pluck peaks into optical resistance sweeps (${preset.decayTime} release).`,
      instructions: [
        'Route V_REF to the vactrol zone with J_PIN5_VREF (Teal Jumper, D9 to D15) and J_VACTROL_VREF (Teal Jumper, B15 to B18).',
        `Install D_RECT (1N4148, anode H12, cathode stripe E16), C_ENV (${preset.envCap}, + lead in B16, - lead in C15), and R_LED (4.7k ohm, A16 to A17).`,
        'Insert VAC_LED (3mm Red LED, long + anode in C17, short - cathode in C18) facing VAC_LDR (GL5528 photoresistor, D18 to C21), and slip a 15mm sleeve of black heat-shrink tubing (pinched shut on top) over both.'
      ],
      check: 'Pluck a bass note while metering B16: DC voltage should jump from +4.4V toward +7.2V and glide smoothly back down.'
    },
    {
      step: 4,
      title: `MFB band-pass filter (2x ${preset.filterCap}), Dry Sub MIX, and Master Volume`,
      goal: `Sweep resonant funk formants across ${preset.sweepRange} while keeping 41 Hz clean sub weight underneath.`,
      instructions: [
        `Wire Op-Amp B filter spurs and loop: J_OUTB_SPUR (C13 to B19), J_INB_SPUR (D14 to B23), R_MFB_IN (47k, J12 to B21), C_F2 (${preset.filterCap}, D19 to D21), C_F1 (${preset.filterCap}, E21 to E23), and R_Q (220k, A19 to A23).`,
        'Blend clean sub and resonant quack with R_DRY_MIX (33k, J17 to F19), R_WET_MIX (15k, E19 to F23), MIX_POT (100kB at G19/G21/G23), and J_MIX_TAP (H21 to C25).',
        'Couple out through C_OUT (470nF, D25 to D27) and J_VOL_IN (E27 to F26) into VOL_POT (100kA at G26/G28/G30) with J_VOL_GND (I30 to BOT_MINUS_28) and J_OUT (F28 to HDR_OUT).'
      ],
      check: 'Probe Filter Out Pin 7 at B13 for +4.4V DC idle and sweep SENS and MIX while slapping open E1.'
    }
  ];
}

function createDSP(sampleRate, getState) {
  const fs2 = sampleRate * 2;
  let hpIn = 0;
  let envCap = 0;
  let ldrSmooth = 0;
  let bp = 0;
  let lp = 0;
  let hpOut = 0;
  let lastCutoff = 140;
  let lastLed = 0;
  const aHpIn = onePoleAlpha(6, fs2);
  const aAtk = onePoleAlpha(35, fs2);
  const aHpOut = onePoleAlpha(6, fs2);

  function readState() {
    const raw = (typeof getState === 'function' ? getState() : null) || {};
    const knobs = raw.knobs || {};
    return {
      presetId: raw.presetId || 'sub_quack',
      sens: knobs.sens ?? 0.76,
      mix: knobs.mix ?? 0.68,
      vol: knobs.volume ?? knobs.vol ?? 0.82
    };
  }

  return {
    getTelemetry() {
      return `Vactrol LED ${Math.round(lastLed * 100)}% | Peak ${Math.round(lastCutoff)} Hz`;
    },
    processSample(x) {
      const st = readState();
      let y = 0;
      const preGain = 1.5 + Math.pow(st.sens, 1.6) * 20.5;
      const relTau = st.presetId === 'slow_swell' ? 0.22 : 0.103;
      const relMul = Math.exp(-1 / (relTau * fs2));
      const fMin = st.presetId === 'slap_funk' ? 295 : 140;
      const fMax = st.presetId === 'slap_funk' ? 1630 : 770;

      for (let os = 0; os < 2; os++) {
        const dry = x - hpIn;
        hpIn += aHpIn * (x - hpIn);

        const boosted = dry * preGain;
        const rect = Math.max(0, boosted - 0.25);
        if (rect > envCap) envCap += 0.08 * (rect - envCap);
        else envCap *= relMul;

        const ledDrive = Math.min(1, envCap / 2.6);
        ldrSmooth += aAtk * (ledDrive - ldrSmooth);
        lastLed = ldrSmooth;

        const fc = fMin + (fMax - fMin) * Math.pow(ldrSmooth, 0.82);
        lastCutoff = fc;

        const fCoeff = Math.min(0.42, 2 * Math.sin((Math.PI * fc) / fs2));
        const qVal = 2.4 + 2.8 * ldrSmooth;
        const qDamp = 1 / qVal;
        const hp = dry - lp - qDamp * bp;
        bp += fCoeff * hp;
        lp += fCoeff * bp;
        const funkOut = (bp / qVal) * 4.6;

        const mixed = dry * (1 - st.mix) * 1.65 + funkOut * st.mix * 1.75;
        const outAc = mixed - hpOut;
        hpOut += aHpOut * (mixed - hpOut);
        y = outAc;
      }

      const volTaper = Math.pow(st.vol, 1.6);
      return Math.tanh(y * volTaper * 1.35) * 0.85;
    }
  };
}

export const stageDescriptor = {
  slug: '5a',
  stageNumber: 'Stage 5A',
  title: 'Optical Vactrol Bass Envelope Filter Auto-Wah',
  subtitle: '1M preamp, 1N4148 peak detector, DIY heat-shrink LED/GL5528 vactrol, and MFB band-pass filter',
  previousStageSlug: '4',
  phaseDegrees: 180,
  summary:
    'Sleeve a 3mm red LED facing a GL5528 photoresistor inside black heat-shrink tubing, drive the LED from a 1N4148 envelope rectifier, and sweep a resonant Multiple-Feedback band-pass filter.',
  defaultPresetId: 'sub_quack',
  defaultModeId: 'standard',
  presets: PRESETS,
  modes: MODES,
  buildComponents,
  buildWiringSteps,
  audioSpec: {
    defaultRiffId: 'slap',
    hint:
      'Defaults to Funk Slap and Pop: watch the live Peak Hz readout jump as each thumb slap lights the DIY Red LED + GL5528 LDR vactrol, and switch between Deep Sub-Quack (10nF) and Bootsy Slap Quack (4.7nF).',
    knobs: [
      {
        id: 'sens',
        label: 'SENS Pluck Drive (100kB)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.76,
        fmt: 'pct'
      },
      {
        id: 'mix',
        label: 'MIX Sub / Funk (100kB)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.68,
        fmt: 'pct'
      },
      {
        id: 'volume',
        label: 'VOLUME (100kA)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.82,
        fmt: 'pct'
      }
    ],
    createDSP
  },
  theoryNotes: [
    {
      title: 'DIY heat-shrink LED and GL5528 optical vactrol',
      body:
        'Facing a 3mm red LED directly against a GL5528 CdS photoresistor inside pinched black heat-shrink creates a zero-distortion variable resistor that sweeps from >150k in the dark down to ~2k on hard plucks.'
    },
    {
      title: 'Half-wave peak envelope rectification and RC decay',
      body:
        'Op-Amp A boosts passive bass plucks up to 22x so D_RECT (1N4148) charges C_ENV rapidly on attack and discharges smoothly through R_LED (4.7k) + VAC_LED over 103 ms (22uF) or 220 ms (47uF).'
    },
    {
      title: 'Constant-gain Multiple-Feedback band-pass filter with Dry Sub MIX',
      body:
        'In an MFB band-pass filter, peak passband gain stays locked at R_Q / (2 * R_MFB_IN) = 2.3x even as VAC_LDR sweeps center frequency, while the MIX pot anchors 41 Hz clean sub weight underneath.'
    }
  ]
};
