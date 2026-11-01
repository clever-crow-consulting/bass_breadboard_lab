import { onePoleAlpha } from '../../riffs.js';

const PRESETS = {
  biamp_crossover: {
    id: 'biamp_crossover',
    label: 'Bi-Amp Crossover (<225 Hz Sub + >154 Hz Grit)',
    badge: 'Darkglass Style',
    biAmpSub: true,
    phaseTrap: false,
    probePoints: ['G10', 'I13', 'B14'],
    bannerTitle: 'Studio Bi-Amp Crossover Mode (Low-Passed Sub + High-Passed Grit)',
    bannerText:
      'Adds one 47nF capacitor (C_SUB at I20 to GND) on the clean branch, forming a 225 Hz low-pass filter with R_CLEAN (15k). Now the clean path carries pure deep sub-fundamental without clanky string noise while the grit path handles upper-mid harmonic bite above 154 Hz.',
    phaseLabel: '0 deg Crossover Aligned',
    cleanCutoff: '< 225 Hz Clean Sub LPF',
    gritCutoff: '> 154 Hz Grit HPF',
    voltages: [
      { pin: 'V_REF Hub (G10)', val: '+4.35V to +4.50V', net: '50/50 10k divider' },
      { pin: 'Clean Out Pin 1 (I13)', val: '+4.35V to +4.50V', net: 'Unity 1M JFET buffer' },
      { pin: 'Grit Out Pin 7 (B14)', val: '+4.35V to +4.50V', net: 'Asymmetric soft clipper' }
    ],
    voltageNote: 'C_SUB blocks DC so all TL072 op-amp pins stay locked at +4.4V V_REF.'
  },
  full_blend: {
    id: 'full_blend',
    label: 'Full-Range Clean + Grit Blend (0 deg)',
    badge: 'Recommended',
    biAmpSub: false,
    phaseTrap: false,
    probePoints: ['G10', 'I13', 'B14'],
    bannerTitle: 'In-Phase Parallel Bass Clean Blend + Soft-Clip Drive',
    bannerText:
      'Op-Amp A (Pins 1-3) buffers your full-range clean bass at 0 degrees. Op-Amp B (Pins 5-7) runs non-inverting (+30 dB above 154 Hz) with asymmetric Red LED + 1N4148 feedback diodes, also at 0 degrees. Sweeping BLEND mixes uncompressed attack and 31 Hz sub weight under tube-like upper-mid grind.',
    phaseLabel: '0 deg + 0 deg (Reinforced)',
    cleanCutoff: 'Full Range (3.4 Hz to 20 kHz)',
    gritCutoff: '> 154 Hz (+30.3 dB)',
    voltages: [
      { pin: 'V_REF Hub (G10)', val: '+4.35V to +4.50V', net: '50/50 10k divider' },
      { pin: 'Clean Out Pin 1 (I13)', val: '+4.35V to +4.50V', net: 'Unity 1M JFET buffer' },
      { pin: 'Grit Out Pin 7 (B14)', val: '+4.35V to +4.50V', net: 'Asymmetric soft clipper' }
    ],
    voltageNote:
      'If Pin 1 or Pin 7 sits stuck near 0V or +8V instead of +4.4V, check your Row 10 V_REF divider (two 10k resistors) and R_BIAS (1M at I10-I15).'
  },
  phase_trap: {
    id: 'phase_trap',
    label: '180-Degree Phase Trap Demo (Hear 41 Hz Cancel)',
    badge: 'Ear Training Lab',
    biAmpSub: false,
    phaseTrap: true,
    probePoints: ['G10', 'I13', 'B14'],
    bannerTitle: '180-Degree Phase Cancellation Experiment (Inverting Wet Stage)',
    bannerText:
      'Rewires Op-Amp B as an inverting stage (-3.1x gain, 180 degrees out of phase with clean Op-Amp A). Pluck your open E string and set BLEND near 50%: you will hear the 41.2 Hz bass fundamental vanish into a thin, hollow nasal tone as +Dry and -Wet cancel out.',
    phaseLabel: '0 deg + 180 deg (Cancels)',
    cleanCutoff: 'Full Range (0 deg)',
    gritCutoff: 'Inverted (180 deg)',
    voltages: [
      { pin: 'V_REF Hub (G10)', val: '+4.35V to +4.50V', net: '50/50 10k divider' },
      { pin: 'Clean Out Pin 1 (I13)', val: '+4.35V to +4.50V', net: 'Unity 0-deg dry buffer' },
      { pin: 'Inverted Out Pin 7 (B14)', val: '+4.35V to +4.50V', net: '180-deg inverting stage' }
    ],
    voltageNote:
      'Even in inverting mode, DC bias on Pin 7 stays +4.4V because Pin 5 ties to V_REF (D10-D16) and Pin 1 already sits at V_REF.'
  }
};

const MODES = {
  standard: {
    id: 'standard',
    label: 'Standard TL072 Layout',
    desc: 'Dual JFET op-amp straddling center ravine across Rows 13 to 16.'
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
      : presetInput) || PRESETS.biamp_crossover;

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
      notes: 'Unchanged from Stages 1 and 2.'
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
      notes: 'Connects bottom ground rail for TL072 Pin 4 and pots.'
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
      notes: 'Unchanged from Stages 1 and 2.'
    },
    {
      id: 'R_PWR',
      stage: 1,
      type: 'resistor',
      name: 'R_PWR',
      value: '100 ohm',
      from: 'A2',
      to: 'TOP_PLUS_2',
      net: 'Filtered +8.7V Supply',
      notes: 'RC supply filter with C_PWR.'
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
      net: 'Filtered +8.7V Supply',
      notes: '(+) lead in Top Red (+), (-) lead in Top Blue (-).'
    },
    {
      id: 'R_V1',
      stage: 1,
      type: 'resistor',
      name: 'R_V1 (V_REF Up)',
      value: '10k ohm',
      from: 'A10',
      to: 'TOP_PLUS_10',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Upper half of 50/50 voltage divider creating +4.4V virtual ground at Row 10.'
    },
    {
      id: 'R_V2',
      stage: 1,
      type: 'resistor',
      name: 'R_V2 (V_REF Dn)',
      value: '10k ohm',
      from: 'B10',
      to: 'TOP_MINUS_10',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Lower half of 50/50 voltage divider to GND.'
    },
    {
      id: 'C_VREF',
      stage: 1,
      type: 'ecap',
      name: 'C_VREF',
      value: '47uF Elec',
      from: 'C10',
      to: 'TOP_MINUS_9',
      plusAt: 'C10',
      net: 'V_REF (+4.4V) Hub',
      notes:
        '(+) lead in C10 (+4.4V), (-) stripe lead in TOP_MINUS_9 (GND). Stabilizes virtual ground.'
    },
    {
      id: 'J_VREF_LINK',
      stage: 1,
      type: 'wire',
      name: 'V_REF Bridge',
      value: 'Teal Jumper',
      from: 'E10',
      to: 'F10',
      color: '#14b8a6',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Makes both Top Row 10 and Bottom Row 10 +4.4V V_REF hubs (probe at G10).'
    },
    {
      id: 'IC1',
      stage: 2,
      type: 'dipN',
      ref: 'IC1',
      tag: 'IC1',
      chipLabel: 'TL072',
      startCol: 13,
      spanCols: 4,
      name: 'IC1 (TL072)',
      value: 'TL072 Dual JFET Op-Amp',
      pins: ['E13', 'E14', 'E15', 'E16', 'F16', 'F15', 'F14', 'F13'],
      from: 'Rows 13-16 Top (8..5)',
      to: 'Rows 13-16 Bot (1..4)',
      net: 'Dual JFET Op-Amp',
      notes:
        'Notch/dot MUST face LEFT at Row 13: F13=Pin1(OUT_A), F14=Pin2(IN_A-), F15=Pin3(IN_A+), F16=Pin4(GND), E16=Pin5(IN_B+), E15=Pin6(IN_B-), E14=Pin7(OUT_B), E13=Pin8(+9V).'
    },
    {
      id: 'J_IC_VCC',
      stage: 2,
      type: 'wire',
      name: 'Pin 8 +9V',
      value: 'Red Jumper',
      from: 'A13',
      to: 'TOP_PLUS_13',
      color: '#ef4444',
      net: 'Filtered +8.7V Supply',
      notes: 'Powers TL072 Pin 8 (Row 13 Top).'
    },
    {
      id: 'J_IC_GND',
      stage: 2,
      type: 'wire',
      name: 'Pin 4 GND',
      value: 'Black Jumper',
      from: 'J16',
      to: 'BOT_MINUS_16',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Grounds TL072 Pin 4 (Row 16 Bottom).'
    },
    {
      id: 'J_IN',
      stage: 2,
      type: 'wire',
      name: 'Audio IN Feed',
      value: 'Green Jumper',
      from: 'HDR_IN',
      to: 'B6',
      color: '#22c55e',
      net: 'Bass Input',
      notes: 'Brings bass guitar input into Row 6.'
    },
    {
      id: 'R_PD',
      stage: 2,
      type: 'resistor',
      name: 'R_PD',
      value: '1M ohm',
      from: 'A6',
      to: 'TOP_MINUS_6',
      net: 'Input Anti-Pop',
      notes: 'Prevents true-bypass switch pop.'
    },
    {
      id: 'C1',
      stage: 2,
      type: 'filmcap',
      name: 'C1 (Input Cap)',
      value: '470nF Film',
      from: 'D6',
      to: 'D8',
      color: '#38bdf8',
      net: 'AC Bass Input',
      notes: 'Passes full 31 Hz low-B fundamental into Op-Amp A.'
    },
    {
      id: 'J_IN_PIN3',
      stage: 2,
      type: 'wire',
      name: 'Pin 3 Input',
      value: 'Green Jumper',
      from: 'E8',
      to: 'H15',
      color: '#22c55e',
      net: 'Op-Amp A IN+ (Pin 3)',
      notes: 'Feeds AC-coupled bass into TL072 Pin 3 (Row 15 Bottom).'
    },
    {
      id: 'R_BIAS',
      stage: 2,
      type: 'resistor',
      name: 'R_BIAS',
      value: '1M ohm',
      from: 'I10',
      to: 'I15',
      net: 'Op-Amp A Bias (+4.4V)',
      notes: 'Biases Pin 3 to +4.4V V_REF while keeping a studio-grade 1 Megaohm input impedance.'
    },
    {
      id: 'J_BUF_FB',
      stage: 2,
      type: 'wire',
      name: 'Buffer Loop',
      value: 'Green Jumper',
      from: 'G13',
      to: 'G14',
      color: '#22c55e',
      net: 'Unity Follower (Pin 1-2)',
      notes: 'Ties Pin 1 (OUT_A) to Pin 2 (IN_A-) for 1.0x clean buffering at 0-degree phase.'
    }
  ];

  if (!preset.phaseTrap) {
    parts.push(
      {
        id: 'J_SPLIT_B',
        stage: 3,
        type: 'wire',
        name: 'Grit Split',
        value: 'Amber Jumper',
        from: 'H13',
        to: 'D16',
        color: '#f59e0b',
        net: 'Op-Amp B IN+ (Pin 5)',
        notes: 'Sends buffered clean bass from Pin 1 (H13) into non-inverting Pin 5 (D16) at 0 degrees.'
      },
      {
        id: 'J_FB_OUT',
        stage: 3,
        type: 'wire',
        name: 'Pin 7 Spur',
        value: 'Amber Jumper',
        from: 'C14',
        to: 'B17',
        color: '#f59e0b',
        net: 'Op-Amp B Output (Pin 7)',
        notes:
          'Breaks Pin 7 out to Row 17 so clipping diodes have spacious 2-row (5mm) finger clearance.'
      },
      {
        id: 'J_FB_IN',
        stage: 3,
        type: 'wire',
        name: 'Pin 6 Spur',
        value: 'Cyan Jumper',
        from: 'D15',
        to: 'B19',
        color: '#06b6d4',
        net: 'Op-Amp B IN- (Pin 6)',
        notes: 'Breaks Pin 6 summing node out to Row 19.'
      },
      {
        id: 'R_DRIVE',
        stage: 3,
        type: 'resistor',
        name: 'R_DRIVE',
        value: '150k ohm',
        from: 'A17',
        to: 'A19',
        net: 'Soft-Clip Gain (+30 dB)',
        notes: 'Sets passband gain to 33x (1 + 150k/4.7k) above 154 Hz.'
      },
      {
        id: 'D1_LED',
        stage: 3,
        type: 'diode',
        name: 'D1 (Red LED)',
        value: '3mm Red LED',
        from: 'C17',
        to: 'C19',
        stripeAt: 'C19',
        net: 'Asymmetric Soft Clip',
        notes:
          'Long (+) anode at C17, short (-) cathode at C19. Gives warm 1.8V tube-style headroom on one half-wave.'
      },
      {
        id: 'D2_SI',
        stage: 3,
        type: 'diode',
        name: 'D2 (1N4148)',
        value: '1N4148 Silicon',
        from: 'D17',
        to: 'D19',
        stripeAt: 'D17',
        net: 'Asymmetric Soft Clip',
        notes:
          'Cathode stripe at D17, Anode at D19 (anti-parallel with D1 LED for rich even-order bass harmonics).'
      },
      {
        id: 'R_G',
        stage: 3,
        type: 'resistor',
        name: 'R_G (Grit HPF)',
        value: '4.7k ohm',
        from: 'E19',
        to: 'E21',
        net: '154 Hz Grit High-Pass',
        notes:
          'Pairs with C_G (220nF) so frequencies below 154 Hz stay clean (1x gain) instead of muddying the diodes.'
      },
      {
        id: 'C_G',
        stage: 3,
        type: 'filmcap',
        name: 'C_G',
        value: '220nF Film',
        from: 'D21',
        to: 'D23',
        color: '#fb923c',
        net: '154 Hz Grit High-Pass',
        notes: 'Blocks DC gain so Op-Amp B idles at exact +4.4V V_REF.'
      },
      {
        id: 'J_CG_VREF',
        stage: 3,
        type: 'wire',
        name: 'HPF V_REF Tie',
        value: 'Teal Jumper',
        from: 'D10',
        to: 'B23',
        color: '#14b8a6',
        net: 'V_REF (+4.4V) Hub',
        notes: 'Anchors grit high-pass leg to virtual ground.'
      }
    );
  } else {
    parts.push(
      {
        id: 'J_VREF_PIN5',
        stage: 3,
        type: 'wire',
        name: 'Pin 5 V_REF',
        value: 'Teal Jumper',
        from: 'D10',
        to: 'D16',
        color: '#14b8a6',
        net: 'V_REF (+4.4V) Hub',
        notes:
          'Grounds non-inverting Pin 5 to AC virtual ground so Op-Amp B runs in 180-degree inverting mode.'
      },
      {
        id: 'J_FB_OUT',
        stage: 3,
        type: 'wire',
        name: 'Pin 7 Spur',
        value: 'Amber Jumper',
        from: 'C14',
        to: 'B17',
        color: '#f59e0b',
        net: 'Inverted Wet Out (180 deg)',
        notes: 'Breaks Pin 7 out to Row 17.'
      },
      {
        id: 'J_FB_IN',
        stage: 3,
        type: 'wire',
        name: 'Pin 6 Spur',
        value: 'Cyan Jumper',
        from: 'D15',
        to: 'B19',
        color: '#06b6d4',
        net: 'Inverting Sum (Pin 6)',
        notes: 'Breaks Pin 6 out to Row 19.'
      },
      {
        id: 'R_INV_IN',
        stage: 3,
        type: 'resistor',
        name: 'R_INV_IN',
        value: '15k ohm',
        from: 'H13',
        to: 'E19',
        net: 'Inverting Input Feed',
        notes: 'Feeds buffered bass into inverting input Row 19 (-47k/15k = -3.1x inverted gain).'
      },
      {
        id: 'R_DRIVE',
        stage: 3,
        type: 'resistor',
        name: 'R_DRIVE',
        value: '47k ohm',
        from: 'A17',
        to: 'A19',
        net: 'Inverting Gain (-3.1x)',
        notes:
          'Inverts wet signal 180 degrees so sweeping BLEND cancels the 41.2 Hz clean fundamental.'
      },
      {
        id: 'D1_LED',
        stage: 3,
        type: 'diode',
        name: 'D1 (Red LED)',
        value: '3mm Red LED',
        from: 'C17',
        to: 'C19',
        stripeAt: 'C19',
        net: 'Asymmetric Soft Clip',
        notes: 'Anode at C17, Cathode at C19.'
      },
      {
        id: 'D2_SI',
        stage: 3,
        type: 'diode',
        name: 'D2 (1N4148)',
        value: '1N4148 Silicon',
        from: 'D17',
        to: 'D19',
        stripeAt: 'D17',
        net: 'Asymmetric Soft Clip',
        notes: 'Cathode stripe at D17, Anode at D19.'
      }
    );
  }

  parts.push({
    id: 'R_CLEAN',
    stage: 4,
    type: 'resistor',
    name: 'R_CLEAN',
    value: '15k ohm',
    from: 'J13',
    to: 'F20',
    net: 'Clean Blend Leg',
    notes: 'Feeds buffered clean bass from Pin 1 (J13) into BLEND Lug 1 (Row 20 Bottom).'
  });

  if (preset.biAmpSub) {
    parts.push({
      id: 'C_SUB',
      stage: 4,
      type: 'filmcap',
      name: 'C_SUB (Bi-Amp)',
      value: '47nF Film',
      from: 'I20',
      to: 'BOT_MINUS_20',
      color: '#22c55e',
      net: '225 Hz Sub Low-Pass',
      notes: 'Low-passes the clean path at 225 Hz with R_CLEAN (15k) for pure studio sub-bass weight.'
    });
  }

  parts.push(
    {
      id: 'R_WET',
      stage: 4,
      type: 'resistor',
      name: 'R_WET',
      value: '15k ohm',
      from: 'E17',
      to: 'F24',
      net: 'Wet Grit Leg',
      notes: 'Feeds soft-clipped bass drive from Row 17 into BLEND Lug 3 (Row 24 Bottom).'
    },
    {
      id: 'BLEND_POT',
      stage: 4,
      type: 'pot',
      ref: 'BLEND',
      tag: 'BLEND',
      name: 'BLEND (100kB)',
      value: '100k Linear Pot',
      pins: ['G20', 'G22', 'G24'],
      from: 'G20 (Clean)',
      to: 'G22 (Mix) / G24 (Grit)',
      net: 'Parallel Dry/Wet Pan',
      notes: 'CCW (G20) = 100% Clean Sub, Noon = Parallel Blend, CW (G24) = 100% Overdrive.'
    },
    {
      id: 'J_BLEND_TAP',
      stage: 4,
      type: 'wire',
      name: 'Blend Wiper Out',
      value: 'Amber Jumper',
      from: 'H22',
      to: 'C24',
      color: '#f59e0b',
      net: 'Blended Signal (+4.4V DC)',
      notes: 'Carries mixed signal across ravine to C_OUT DC-blocking capacitor.'
    },
    {
      id: 'C_OUT',
      stage: 4,
      type: 'filmcap',
      name: 'C_OUT',
      value: '470nF Film',
      from: 'D24',
      to: 'D26',
      color: '#fb923c',
      net: 'DC-Blocked Audio Out',
      notes: 'Strips +4.4V V_REF DC offset while setting output cutoff at 3.4 Hz (zero sub loss).'
    },
    {
      id: 'J_VOL_IN',
      stage: 4,
      type: 'wire',
      name: 'Vol Lug 3 Feed',
      value: 'Amber Jumper',
      from: 'E26',
      to: 'F26',
      color: '#f59e0b',
      net: 'Master Volume Input',
      notes: 'Connects post-cap output into Volume Lug 3 (Row 26 Bottom).'
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
      notes: 'Same ergonomic bottom-right master volume slot as Stage 2.'
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
      notes: 'Sends Volume Wiper (F28) to Coppersound OUT header.'
    }
  );

  return parts.map(withPartMeta);
}

function buildWiringSteps(presetInput) {
  const preset =
    (typeof presetInput === 'string'
      ? Object.hasOwn(PRESETS, presetInput)
        ? PRESETS[presetInput]
        : null
      : presetInput) || PRESETS.biamp_crossover;

  const step3Instructions = preset.phaseTrap
    ? [
        'Tie non-inverting Pin 5 to V_REF with J_VREF_PIN5 (Teal Jumper, D10 to D16), and break out Pin 7 (J_FB_OUT, C14 to B17) and Pin 6 (J_FB_IN, D15 to B19).',
        'Feed buffered bass into inverting Row 19 through R_INV_IN (15k ohm, H13 to E19) and set -3.1x inverted gain with R_DRIVE (47k ohm, A17 to A19).',
        'Place anti-parallel soft clippers across Rows 17 and 19: D1_LED (3mm Red LED, anode C17, cathode C19) and D2_SI (1N4148, cathode stripe D17, anode D19).'
      ]
    : [
        'Feed non-inverting Pin 5 from clean Pin 1 with J_SPLIT_B (Amber Jumper, H13 to D16), and break out Pin 7 (J_FB_OUT, C14 to B17) and Pin 6 (J_FB_IN, D15 to B19).',
        'Install R_DRIVE (150k ohm, A17 to A19) in parallel with D1_LED (3mm Red LED, anode C17, cathode C19) and D2_SI (1N4148, cathode stripe D17, anode D19).',
        'Set the 154 Hz grit high-pass leg with R_G (4.7k ohm, E19 to E21), C_G (220nF film, D21 to D23), and J_CG_VREF (Teal Jumper, D10 to B23).'
      ];

  const step4CleanLine = preset.biAmpSub
    ? 'Run R_CLEAN (15k ohm) from J13 to F20 and add C_SUB (47nF film) from I20 to BOT_MINUS_20 to low-pass the clean sub path below 225 Hz.'
    : 'Run R_CLEAN (15k ohm) from J13 to F20 to carry full-range 0-degree clean bass into BLEND Lug 1.';

  return [
    {
      step: 1,
      title: 'Supply hum filter and Row 10 +4.4V V_REF hub',
      goal: 'Create a quiet half-supply virtual ground so the TL072 swings symmetrically on a single 9V rail.',
      instructions: [
        'Keep J_GND_HDR (HDR_GND to TOP_MINUS_1), J_GND_BRIDGE (TOP_MINUS_30 to BOT_MINUS_30), J_9V_HDR (HDR_9V to C2), R_PWR (100 ohm, A2 to TOP_PLUS_2), and C_PWR (100uF, TOP_PLUS_4 to TOP_MINUS_4).',
        'Build the 50/50 divider at Row 10 with R_V1 (10k ohm, A10 to TOP_PLUS_10) and R_V2 (10k ohm, B10 to TOP_MINUS_10).',
        'Stabilize Row 10 with C_VREF (47uF electrolytic, + in C10, - in TOP_MINUS_9) and bridge J_VREF_LINK (Teal Jumper) from E10 to F10.'
      ],
      check: 'Meter +4.35V to +4.50V DC at probe point G10 before inserting the TL072.'
    },
    {
      step: 2,
      title: 'TL072 placement and 1M unity clean buffer (Op-Amp A)',
      goal: 'Seat the dual JFET op-amp across the center ravine and buffer passive pickups at 1 Megaohm.',
      instructions: [
        'Straddle IC1 (TL072) across E13-E16 and F13-F16 with the Pin 1 notch/dot facing LEFT at Row 13; wire J_IC_VCC (A13 to TOP_PLUS_13) and J_IC_GND (J16 to BOT_MINUS_16).',
        'Bring bass input in via J_IN (HDR_IN to B6), R_PD (1M ohm, A6 to TOP_MINUS_6), C1 (470nF film, D6 to D8), and J_IN_PIN3 (Green Jumper, E8 to H15).',
        'Bias Pin 3 with R_BIAS (1M ohm, I10 to I15) and close the unity follower loop with J_BUF_FB (Green Jumper, G13 to G14).'
      ],
      check: 'Verify Clean Out Pin 1 at I13 idles right at +4.4V DC.'
    },
    {
      step: 3,
      title: preset.phaseTrap
        ? 'Op-Amp B 180-degree inverting phase-trap loop'
        : 'Op-Amp B +30 dB asymmetric soft-clip drive loop',
      goal: preset.phaseTrap
        ? 'Configure Op-Amp B in inverting mode to hear 41.2 Hz phase cancellation against the 0-degree dry buffer.'
        : 'Amplify mids and highs above 154 Hz into asymmetric Red LED + 1N4148 feedback clipping at 0 degrees.',
      instructions: step3Instructions,
      check: 'Probe Op-Amp B Output Pin 7 at B14 to confirm +4.35V to +4.50V DC idle bias.'
    },
    {
      step: 4,
      title: 'Parallel BLEND mixer, DC block, and Master Volume',
      goal: 'Sum the clean and grit branches across BLEND_POT and strip +4.4V DC ahead of VOL_POT.',
      instructions: [
        step4CleanLine,
        'Run R_WET (15k ohm) from E17 to F24, seat BLEND_POT (100kB) at G20/G22/G24, and route wiper H22 to C24 via J_BLEND_TAP (Amber Jumper).',
        'Couple through C_OUT (470nF film, D24 to D26) and J_VOL_IN (E26 to F26) into VOL_POT (100kA at G26/G28/G30), with J_VOL_GND (I30 to BOT_MINUS_28) and J_OUT (F28 to HDR_OUT).'
      ],
      check: preset.phaseTrap
        ? 'Set BLEND to 50% noon and pluck open E1: listen for the hollow 41 Hz fundamental drop.'
        : 'Sweep BLEND from counter-clockwise (clean sub) through noon (bi-amp punch) to clockwise (full drive).'
    }
  ];
}

function createDSP(sampleRate, getState) {
  const fs2 = sampleRate * 2;
  let hpIn = 0;
  let cleanSubLp = 0;
  let gritHp = 0;
  let gritLp = 0;
  let hpOut = 0;
  const aHpIn = onePoleAlpha(4.0, fs2);
  const aSubLp = onePoleAlpha(225, fs2);
  const aGritHp = onePoleAlpha(154, fs2);
  const aGritLp = onePoleAlpha(4600, fs2);
  const aHpOut = onePoleAlpha(4.0, fs2);

  function readState() {
    const raw = (typeof getState === 'function' ? getState() : null) || {};
    const knobs = raw.knobs || {};
    return {
      presetId: raw.presetId || 'biamp_crossover',
      blend: knobs.blend ?? 0.5,
      drive: knobs.drive ?? 0.5,
      vol: knobs.volume ?? knobs.vol ?? 0.8
    };
  }

  return {
    getTelemetry() {
      const st = readState();
      const b = Math.round(st.blend * 100);
      return st.presetId === 'phase_trap'
        ? `180-Deg Phase Trap | ${100 - b}% Dry / ${b}% -Wet`
        : `0-Deg Aligned | ${100 - b}% Sub / ${b}% Grit`;
    },
    processSample(x) {
      const st = readState();
      const drivePush = 0.5 + st.drive * 1.1;
      let y = 0;

      for (let os = 0; os < 2; os++) {
        const ac = x - hpIn;
        hpIn += aHpIn * (x - hpIn);

        let clean = ac;
        if (st.presetId === 'biamp_crossover') {
          cleanSubLp += aSubLp * (clean - cleanSubLp);
          clean = cleanSubLp * 1.28;
        }

        let wet;
        if (st.presetId === 'phase_trap') {
          const u = -ac * 3.13 * drivePush;
          const clipped = u >= 0 ? 0.55 * Math.tanh(u / 0.55) : 0.38 * Math.tanh(u / 0.38);
          wet = clipped * 0.66;
        } else {
          const hp = ac - gritHp;
          gritHp += aGritHp * (ac - gritHp);
          const u = hp * 24.0 * drivePush;
          const clip = u >= 0 ? 1.55 * Math.tanh(u / 1.55) : 0.68 * Math.tanh(u / 0.68);
          gritLp += aGritLp * (clip - gritLp);
          wet = ac * 0.42 + gritLp * 0.58;
        }

        const blended = clean * (1 - st.blend) + wet * st.blend;
        const outAc = blended - hpOut;
        hpOut += aHpOut * (blended - hpOut);
        y = outAc;
      }

      const volTaper = Math.pow(st.vol, 1.6);
      return Math.tanh(y * volTaper * 1.55) * 0.85;
    }
  };
}

export const stageDescriptor = {
  slug: '3',
  stageNumber: 'Stage 3',
  title: 'Dual Op-Amp Parallel Clean Blend and Bi-Amp Bass Drive',
  subtitle: 'Single-supply TL072 +4.4V virtual ground, bi-amp crossover, and asymmetric soft clipper',
  previousStageSlug: '2',
  phaseDegrees: 0,
  summary:
    'Straddle a TL072 dual JFET op-amp across the center ravine at Rows 13 to 16, build a +4.5V virtual ground at Row 10, and blend 1M buffered clean lows with +30 dB LED and 1N4148 soft clipping.',
  defaultPresetId: 'biamp_crossover',
  defaultModeId: 'standard',
  presets: PRESETS,
  modes: MODES,
  buildComponents,
  buildWiringSteps,
  audioSpec: {
    defaultRiffId: 'groove',
    hint:
      'Switch to 180-Degree Phase Trap Demo and set BLEND near 50% on Riff 3 Sub Decay to hear the 41.2 Hz E1 fundamental cancel out.',
    knobs: [
      {
        id: 'blend',
        label: 'BLEND Clean/Grit (100kB)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.5,
        fmt: 'pct'
      },
      {
        id: 'drive',
        label: 'Grit Drive Push',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.5,
        fmt: 'pct'
      },
      {
        id: 'volume',
        label: 'VOLUME (100kA)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.8,
        fmt: 'pct'
      }
    ],
    createDSP
  },
  theoryNotes: [
    {
      title: 'Single-supply +4.4V virtual-ground biasing',
      body:
        'Two 10k resistors (R_V1, R_V2) and a 47uF reservoir cap (C_VREF) hold Row 10 at half-supply (+4.4V) so the TL072 swings symmetrically on a standard 9V pedal supply without a negative rail.'
    },
    {
      title: 'Bi-amp frequency splitting for sub clarity',
      body:
        'High-passing Op-Amp B grit above 154 Hz prevents low fundamentals from saturating the LED/1N4148 feedback loop, while C_SUB (47nF) low-passes clean sub weight below 225 Hz.'
    },
    {
      title: 'Why 180-degree wet stages hollow out bass blend',
      body:
        'When an inverting drive stage sums 50/50 with a 0-degree clean buffer, equal-amplitude 41.2 Hz fundamentals add out of phase (+Dry + -Wet = 0), carving away sub-bass weight.'
    }
  ]
};
