import { onePoleAlpha } from '../../riffs.js';

const SHARED_VOLTAGES = [
  { pin: 'V_REF Hub (G4)', val: '+4.35V to +4.45V', net: 'Tracker & Schmitt reference' },
  { pin: 'Clean Buffer (B6)', val: '+3.70V to +3.85V', net: 'Full-range passive-bass emitter' },
  { pin: 'Schmitt Out (B10)', val: '~+1.3V or ~+7.5V', net: '4.4V avg AC when playing' },
  { pin: 'CD4013 Q1 Out (I15)', val: '~+4.35V avg playing', net: 'Latches 0V or +8.7V at rest' }
];

const PRESETS = {
  oct1_warm: {
    id: 'oct1_warm',
    label: 'Warm -1 Octave Sub (OC-2 Vibe)',
    badge: 'Recommended',
    trkCap: '10nF Film',
    divMode: 'oct1_warm',
    pitchText: '-1 Octave (f / 2)',
    subFilterText: '225 Hz Warm Sub LPF',
    probePoints: ['G4', 'B6', 'B10', 'I15'],
    bannerTitle: 'Warm Analog -1 Octave Bass Divider + Full-Range Clean Blend',
    bannerText:
      'Q1 (2N5088) buffers your passive bass at ~750k impedance so the Clean Dry leg stays crisp from 31 Hz to 20 kHz. Meanwhile, TL072 Op-Amp A boosts fundamentals by +30 dB while rolling off harmonics above 106 Hz, feeding Op-Amp B Schmitt trigger to clock CD4013BE Flip-Flop 1 (-1 octave) through a 15k + 47nF (225 Hz) warm sub filter.',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'When you stop playing, CD4013 Pin 1 (I15) randomly latches at either 0V or +8.7V - that is normal! C_SUB_AC (220nF) blocks that latched DC so MIX never scratches.'
  },
  oct2_deep: {
    id: 'oct2_deep',
    label: 'Seismic -2 Octave Sub (Dual Flip-Flop)',
    badge: '7th-19th Fret',
    trkCap: '22nF Film',
    divMode: 'oct2_deep',
    pitchText: '-2 Octaves (f / 4)',
    subFilterText: '225 Hz Seismic Sub',
    probePoints: ['G4', 'B6', 'B10', 'I15'],
    bannerTitle: 'Cascaded -2 Octave Sub-Synth Mode (Flip-Flop 1 -> Flip-Flop 2)',
    bannerText:
      'Chains Flip-Flop 1 output (Pin 1 Q1 at G15) into Flip-Flop 2 clock (Pin 11 CLK2 at C18) with !Q2 -> D2 feedback, dividing your bass frequency by 4 (-2 octaves) while deepening C_TRK_LP to 22nF (48 Hz) for rock-solid upper-neck tracking.',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Play on the D and G strings above the 7th fret (e.g. D3 = 147 Hz -> -2 Oct = 36.7 Hz chest-shaking sub!) with MIX around 50%.'
  },
  oct1_synth_sq: {
    id: 'oct1_synth_sq',
    label: 'Raw -1 Octave Square Synth (No LPF)',
    badge: '8-Bit / Fuzz Ready',
    trkCap: '10nF Film',
    divMode: 'oct1_synth_sq',
    pitchText: '-1 Octave Square',
    subFilterText: 'Unfiltered Square Wave',
    probePoints: ['G4', 'B6', 'B10', 'I15'],
    bannerTitle: 'Unfiltered Square-Wave Bass Synth Mode (Remove C_SUB_LPF)',
    bannerText:
      'Lifts C_SUB_LPF (47nF at B21-B23) so the raw 50%-duty-cycle CMOS square wave from CD4013BE Pin 1 feeds straight into MIX, delivering aggressive odd-harmonic Moog / NES synth buzz.',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Turn MIX to 100% Sub (counter-clockwise toward Row 26) for pure monophonic square-wave synth bass!'
  }
};

const MODES = {
  standard: {
    id: 'standard',
    label: 'Standard Dual-IC Layout',
    desc: 'TL072 at Rows 9 to 12 driving 14-pin CD4013BE flip-flop divider at Rows 15 to 21.'
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
      : presetInput) || PRESETS.oct1_warm;

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
      notes: 'Powers bottom ground rail for both ICs.'
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
      notes: 'RC supply hum filter.'
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
      from: 'A4',
      to: 'TOP_PLUS_5',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Upper 10k divider creating +4.4V virtual ground at Row 4.'
    },
    {
      id: 'R_V2',
      stage: 1,
      type: 'resistor',
      name: 'R_V2 (V_REF Dn)',
      value: '10k ohm',
      from: 'B4',
      to: 'TOP_MINUS_5',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Lower 10k divider to GND.'
    },
    {
      id: 'C_VREF',
      stage: 1,
      type: 'ecap',
      name: 'C_VREF',
      value: '47uF Elec',
      from: 'C4',
      to: 'TOP_MINUS_3',
      plusAt: 'C4',
      net: 'V_REF (+4.4V) Hub',
      notes: '(+) in C4, (-) in TOP_MINUS_3.'
    },
    {
      id: 'J_VREF_LINK',
      stage: 1,
      type: 'wire',
      name: 'V_REF Bridge',
      value: 'Teal Jumper',
      from: 'E4',
      to: 'F4',
      color: '#14b8a6',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Links Top Row 4 and Bottom Row 4 as +4.4V hubs (probe at G4).'
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
      notes: 'Routes passive bass signal to Row 5.'
    },
    {
      id: 'R_PD',
      stage: 2,
      type: 'resistor',
      name: 'R_PD',
      value: '1M ohm',
      from: 'A5',
      to: 'TOP_MINUS_6',
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
      net: 'AC Bass Coupling',
      notes: 'Exact 2-row box cap passing 31 Hz passive-bass fundamentals into Q1 Base (Row 7).'
    },
    {
      id: 'R_Q1_BIAS',
      stage: 2,
      type: 'resistor',
      name: 'R_Q1_BIAS',
      value: '1M ohm',
      from: 'B7',
      to: 'D4',
      net: 'Passive Pickup Bias',
      notes: 'Biases Q1 Base from Row 4 V_REF (+4.4V) for ~750k passive-pickup input impedance.'
    },
    {
      id: 'Q1',
      stage: 2,
      type: 'transistor',
      ref: 'Q1',
      tag: 'Q1',
      name: 'Q1 (Clean Buffer)',
      value: '2N5088 (NPN)',
      pins: ['C6', 'C7', 'C8'],
      from: 'C6 (E)',
      to: 'C7 (B) / C8 (C)',
      net: 'Full-Range Clean Buffer',
      notes:
        'TO-92 flat face toward you: C6=Emitter, C7=Base, C8=Collector. Isolates Clean Dry tone from the octave filter.'
    },
    {
      id: 'J_Q1_C',
      stage: 2,
      type: 'wire',
      name: 'Q1 Collector +9V',
      value: 'Red Jumper',
      from: 'A8',
      to: 'TOP_PLUS_8',
      color: '#ef4444',
      net: 'Filtered +8.7V',
      notes: 'Powers Q1 Collector.'
    },
    {
      id: 'R_E1',
      stage: 2,
      type: 'resistor',
      name: 'R_E1',
      value: '10k ohm',
      from: 'A6',
      to: 'TOP_MINUS_7',
      net: 'Emitter Follower Load',
      notes: 'Buffered clean bass appears at Row 6 (probe at B6 ~ +3.75V DC).'
    },
    {
      id: 'J_BUF_LINK',
      stage: 2,
      type: 'wire',
      name: 'Clean Buffer Bridge',
      value: 'Green Jumper',
      from: 'E6',
      to: 'F6',
      color: '#22c55e',
      net: 'Buffered Clean Bass',
      notes: 'Splits buffered clean bass across the ravine to feed both C_DRY_AC and C_TRK_IN.'
    },
    {
      id: 'C_DRY_AC',
      stage: 2,
      type: 'filmcap',
      name: 'C_DRY',
      value: '220nF Film',
      from: 'G6',
      to: 'G8',
      color: '#22c55e',
      net: 'Clean Blend AC Out',
      notes: 'Exact 2-row box cap coupling full-range 31 Hz-20 kHz clean bass to Row 8 Bottom.'
    },
    {
      id: 'C_TRK_IN',
      stage: 2,
      type: 'filmcap',
      name: 'C_TRK',
      value: '220nF Film',
      from: 'I6',
      to: 'I8',
      color: '#38bdf8',
      net: 'Tracker AC Feed',
      notes: 'Exact 2-row box cap coupling buffered bass into Op-Amp A fundamental tracker.'
    },
    {
      id: 'IC1',
      stage: 2,
      type: 'dipN',
      ref: 'IC1',
      tag: 'IC1',
      startCol: 9,
      spanCols: 4,
      chipLabel: 'TL072',
      name: 'IC1 (TL072)',
      value: 'TL072 Dual Op-Amp',
      pins: ['E9', 'E10', 'E11', 'E12', 'F9', 'F10', 'F11', 'F12'],
      from: 'Rows 9-12 Top (8..5)',
      to: 'Rows 9-12 Bot (1..4)',
      net: 'Fundamental Filter + Schmitt Clock',
      notes:
        'Notch faces LEFT at Row 9: F9=Pin1(OUT_A), F10=Pin2(IN_A-), F11=Pin3(IN_A+), F12=Pin4(GND), E12=Pin5(IN_B+), E11=Pin6(IN_B-), E10=Pin7(OUT_B), E9=Pin8(+9V).'
    },
    {
      id: 'J_IC1_VCC',
      stage: 2,
      type: 'wire',
      name: 'TL072 Pin 8 +9V',
      value: 'Red Jumper',
      from: 'A9',
      to: 'TOP_PLUS_9',
      color: '#ef4444',
      net: 'Filtered +8.7V',
      notes: 'Powers TL072 Pin 8.'
    },
    {
      id: 'J_IC1_GND',
      stage: 2,
      type: 'wire',
      name: 'TL072 Pin 4 GND',
      value: 'Black Jumper',
      from: 'J12',
      to: 'BOT_MINUS_12',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Grounds TL072 Pin 4.'
    },
    {
      id: 'J_PIN3_VREF',
      stage: 2,
      type: 'wire',
      name: 'Pin 3 V_REF Bias',
      value: 'Teal Jumper',
      from: 'I4',
      to: 'H11',
      color: '#14b8a6',
      net: 'V_REF (+4.4V) Hub',
      notes: 'References Op-Amp A Pin 3 (F11) to +4.4V V_REF.'
    },
    {
      id: 'R_TRK_G',
      stage: 2,
      type: 'resistor',
      name: 'R_TRK_G',
      value: '4.7k ohm',
      from: 'J8',
      to: 'I10',
      net: 'Tracker Input Gain',
      notes: 'Sets +30 dB fundamental boost (150k / 4.7k = 32x) into Pin 2 (F10).'
    },
    {
      id: 'R_TRK_FB',
      stage: 2,
      type: 'resistor',
      name: 'R_TRK_FB',
      value: '150k ohm',
      from: 'G9',
      to: 'G10',
      net: 'Tracker Feedback',
      notes: 'Feedback resistor across Op-Amp A Pin 1 and Pin 2.'
    },
    {
      id: 'C_TRK_LP',
      stage: 2,
      type: 'filmcap',
      name: 'C_LPF',
      value: preset.trkCap,
      from: 'H9',
      to: 'H10',
      color: '#38bdf8',
      net: 'Harmonic Stripper LPF',
      notes:
        '1-row box cap in parallel with 150k; strips string overtones so only pure fundamental reaches the zero-crossing detector.'
    },
    {
      id: 'J_TO_CMP',
      stage: 2,
      type: 'wire',
      name: 'Tracker -> Comparator',
      value: 'Teal Jumper',
      from: 'I9',
      to: 'D11',
      color: '#14b8a6',
      net: 'Filtered Sine Fundamental',
      notes: 'Feeds boosted fundamental from Pin 1 (I9) into Schmitt Trigger Pin 6 (E11).'
    },
    {
      id: 'J_VREF_SPUR',
      stage: 2,
      type: 'wire',
      name: 'Schmitt V_REF Spur',
      value: 'Teal Jumper',
      from: 'H4',
      to: 'B13',
      color: '#14b8a6',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Brings +4.4V V_REF right next to TL072 at Row 13 Top.'
    },
    {
      id: 'R_HYST_REF',
      stage: 2,
      type: 'resistor',
      name: 'R_HYST_REF',
      value: '10k ohm',
      from: 'D12',
      to: 'D13',
      net: 'Schmitt Hysteresis Window',
      notes: 'Pairs with R_HYST_FB (470k) for a +/-65 mV noise-immune hysteresis window around +4.4V.'
    },
    {
      id: 'R_HYST_FB',
      stage: 2,
      type: 'resistor',
      name: 'R_HYST_FB',
      value: '470k ohm',
      from: 'C10',
      to: 'C12',
      net: 'Positive Hysteresis Feedback',
      notes:
        'Snaps Pin 7 (probe at B10) cleanly high/low with zero double-triggering on decaying strings.'
    },
    {
      id: 'IC2',
      stage: 3,
      type: 'dipN',
      ref: 'IC2',
      tag: 'IC2',
      startCol: 15,
      spanCols: 7,
      chipLabel: 'CD4013BE',
      name: 'IC2 (CD4013BE)',
      value: 'CD4013BE Dual Flip-Flop',
      pins: [
        'E15',
        'E16',
        'E17',
        'E18',
        'E19',
        'E20',
        'E21',
        'F15',
        'F16',
        'F17',
        'F18',
        'F19',
        'F20',
        'F21'
      ],
      from: 'Rows 15-21 Top (14..8)',
      to: 'Rows 15-21 Bot (1..7)',
      net: 'Digital Frequency Divider',
      notes:
        'Notch faces LEFT at Row 15: F15=Q1, F16=!Q1, F17=CLK1, F18=R1, F19=D1, F20=S1, F21=GND(7). Top: E15=+9V(14), E16=Q2, E17=!Q2, E18=CLK2, E19=R2, E20=D2, E21=S2.'
    },
    {
      id: 'J_IC2_VDD',
      stage: 3,
      type: 'wire',
      name: 'CD4013 Pin 14 +9V',
      value: 'Red Jumper',
      from: 'A15',
      to: 'TOP_PLUS_15',
      color: '#ef4444',
      net: 'Filtered +8.7V',
      notes: 'Powers CD4013BE VDD (Pin 14 at E15).'
    },
    {
      id: 'J_IC2_VSS',
      stage: 3,
      type: 'wire',
      name: 'CD4013 Pin 7 GND',
      value: 'Black Jumper',
      from: 'J21',
      to: 'BOT_MINUS_21',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Grounds CD4013BE VSS (Pin 7 at F21).'
    },
    {
      id: 'J_CLK1',
      stage: 3,
      type: 'wire',
      name: 'Schmitt -> CLK1',
      value: 'Cyan Jumper',
      from: 'D10',
      to: 'G17',
      color: '#06b6d4',
      net: 'Fundamental Square Clock',
      notes: 'Clocks Flip-Flop 1 (Pin 3 CLK1 at F17) on every rising zero-crossing.'
    },
    {
      id: 'J_DIV1_FB',
      stage: 3,
      type: 'wire',
      name: '!Q1 -> D1 Loop',
      value: 'Cyan Jumper',
      from: 'G16',
      to: 'G19',
      color: '#06b6d4',
      net: 'Divide-by-2 Toggle (-1 Oct)',
      notes:
        'Loops Pin 2 (!Q1) back to Pin 5 (D1) so Pin 1 (Q1, probe at I15) toggles at half frequency (-1 octave)!'
    },
    {
      id: 'J_R1_GND',
      stage: 3,
      type: 'wire',
      name: 'Pin 4 R1 GND',
      value: 'Black Jumper',
      from: 'I18',
      to: 'BOT_MINUS_18',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Disables Reset 1 (must be grounded).'
    },
    {
      id: 'J_S1_GND',
      stage: 3,
      type: 'wire',
      name: 'Pin 6 S1 GND',
      value: 'Black Jumper',
      from: 'I20',
      to: 'BOT_MINUS_20',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Disables Set 1 (must be grounded).'
    },
    {
      id: 'J_R2_GND',
      stage: 3,
      type: 'wire',
      name: 'Pin 10 R2 GND',
      value: 'Black Jumper',
      from: 'A19',
      to: 'TOP_MINUS_19',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Disables Reset 2.'
    },
    {
      id: 'J_S2_GND',
      stage: 3,
      type: 'wire',
      name: 'Pin 8 S2 GND',
      value: 'Black Jumper',
      from: 'A21',
      to: 'TOP_MINUS_21',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Disables Set 2 and turns Row 21 Top into a convenient ground tie for C_SUB_LPF.'
    }
  ];

  if (preset.divMode === 'oct2_deep') {
    parts.push(
      {
        id: 'J_CLK2',
        stage: 3,
        type: 'wire',
        name: 'Q1 -> CLK2 (-2 Oct)',
        value: 'Cyan Jumper',
        from: 'G15',
        to: 'C18',
        color: '#06b6d4',
        net: '-1 Oct -> Flip-Flop 2 Clock',
        notes: 'Routes -1 octave square wave (Pin 1) into Flip-Flop 2 Clock (Pin 11 at E18).'
      },
      {
        id: 'J_DIV2_FB',
        stage: 3,
        type: 'wire',
        name: '!Q2 -> D2 Loop',
        value: 'Cyan Jumper',
        from: 'C17',
        to: 'C20',
        color: '#06b6d4',
        net: 'Divide-by-4 Toggle (-2 Oct)',
        notes: 'Loops Pin 12 (!Q2) to Pin 9 (D2) so Pin 13 (Q2) outputs -2 octaves!'
      },
      {
        id: 'R_SUB_FEED',
        stage: 4,
        type: 'resistor',
        name: 'R_SUB_FEED',
        value: '15k ohm',
        from: 'C16',
        to: 'C23',
        net: 'Sub Filter Resistor',
        notes: 'Taps -2 Octave output from Pin 13 (C16) into Row 23 Top.'
      }
    );
  } else {
    parts.push(
      {
        id: 'J_CLK2_GND',
        stage: 3,
        type: 'wire',
        name: 'Unused CLK2 GND',
        value: 'Black Jumper',
        from: 'A18',
        to: 'TOP_MINUS_18',
        color: '#3b82f6',
        net: 'Ground (0V)',
        notes: 'Grounds unused Flip-Flop 2 Clock (Pin 11).'
      },
      {
        id: 'J_D2_GND',
        stage: 3,
        type: 'wire',
        name: 'Unused D2 GND',
        value: 'Black Jumper',
        from: 'A20',
        to: 'TOP_MINUS_20',
        color: '#3b82f6',
        net: 'Ground (0V)',
        notes: 'Grounds unused Flip-Flop 2 Data (Pin 9).'
      },
      {
        id: 'R_SUB_FEED',
        stage: 4,
        type: 'resistor',
        name: 'R_SUB_FEED',
        value: '15k ohm',
        from: 'H15',
        to: 'C23',
        net: 'Sub Filter Resistor',
        notes: 'Taps -1 Octave output from Pin 1 (H15) into Row 23 Top.'
      }
    );
  }

  if (preset.divMode !== 'oct1_synth_sq') {
    parts.push({
      id: 'C_SUB_LPF',
      stage: 4,
      type: 'filmcap',
      name: 'C_SUB',
      value: '47nF Film',
      from: 'B21',
      to: 'B23',
      color: '#06b6d4',
      net: '225 Hz Sub Low-Pass',
      notes:
        'Exact 2-row box cap to grounded Row 21 Top; rounds harsh square corners into deep OC-2 style synth sub.'
    });
  }

  parts.push(
    {
      id: 'C_SUB_AC',
      stage: 4,
      type: 'filmcap',
      name: 'C_SUB_AC',
      value: '220nF Film',
      from: 'D23',
      to: 'D25',
      color: '#38bdf8',
      net: 'DC-Blocked Sub Out',
      notes:
        'Exact 2-row box cap blocking the CD4013 latched 0V/+8.7V idle state so MIX never scratches.'
    },
    {
      id: 'J_SUB_MIX',
      stage: 4,
      type: 'wire',
      name: 'Sub -> MIX Feed',
      value: 'Cyan Jumper',
      from: 'E25',
      to: 'B26',
      color: '#06b6d4',
      net: 'Sub Blend Leg',
      notes: 'Feeds Sub-Octave into MIX Lug 3 (Row 26 Top).'
    },
    {
      id: 'R_DRY_FEED',
      stage: 4,
      type: 'resistor',
      name: 'R_DRY_FEED',
      value: '15k ohm',
      from: 'H8',
      to: 'B30',
      net: 'Clean Bass Blend Leg',
      notes: 'Feeds full-range buffered Clean Bass from Row 8 Bottom into MIX Lug 1 (Row 30 Top).'
    },
    {
      id: 'MIX_POT',
      stage: 4,
      type: 'pot',
      ref: 'MIX',
      tag: 'MIX',
      name: 'MIX (100kB)',
      value: '100k Linear Pot',
      pins: ['C26', 'C28', 'C30'],
      from: 'C26 (100% Sub)',
      to: 'C28 (Wiper) / C30 (Clean)',
      net: 'Sub-Octave / Clean Bass Mix',
      notes:
        'Pan toward Row 26 for pure monophonic synth sub, or blend 50/50 for massive octave-doubled bass.'
    },
    {
      id: 'J_MIX_TAP',
      stage: 4,
      type: 'wire',
      name: 'Mix Wiper Out',
      value: 'Amber Jumper',
      from: 'D28',
      to: 'F22',
      color: '#f59e0b',
      net: 'Blended Output',
      notes: 'Routes MIX Wiper across ravine to output coupling cap at Row 22 Bottom.'
    },
    {
      id: 'C_OUT',
      stage: 4,
      type: 'filmcap',
      name: 'C_OUT',
      value: '470nF Film',
      from: 'H22',
      to: 'H24',
      color: '#fb923c',
      net: 'Final AC Output',
      notes:
        'Exact 2-row box cap passing deep 20 Hz -1 octave sub-bass cleanly into Master Volume.'
    },
    {
      id: 'J_VOL_IN',
      stage: 4,
      type: 'wire',
      name: 'Vol Lug 3 Feed',
      value: 'Amber Jumper',
      from: 'J24',
      to: 'F26',
      color: '#f59e0b',
      net: 'Master Volume Input',
      notes: 'Feeds VOL Lug 3 (Row 26 Bottom).'
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
      notes: 'Sends Master Volume wiper to Coppersound OUT header.'
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
      : presetInput) || PRESETS.oct1_warm;

  const step3FlipFlop2Line =
    preset.divMode === 'oct2_deep'
      ? 'Cascade Flip-Flop 1 into Flip-Flop 2 for -2 octaves (f / 4): run J_CLK2 (Cyan Jumper, G15 to C18) and J_DIV2_FB (Cyan Jumper, C17 to C20).'
      : 'Ground unused Flip-Flop 2 inputs so the CMOS chip stays quiet: install J_CLK2_GND (A18 to TOP_MINUS_18) and J_D2_GND (A20 to TOP_MINUS_20).';

  const step4SubTapLine =
    preset.divMode === 'oct2_deep'
      ? 'Tap -2 octave Pin 13 output with R_SUB_FEED (15k ohm) from C16 to C23.'
      : 'Tap -1 octave Pin 1 output with R_SUB_FEED (15k ohm) from H15 to C23.';

  const step4FilterLine =
    preset.divMode === 'oct1_synth_sq'
      ? 'Leave C_SUB_LPF uninstalled so the raw 50%-duty-cycle square wave feeds directly into C_SUB_AC (220nF film, D23 to D25).'
      : 'Install C_SUB_LPF (47nF film, B21 to B23) for 225 Hz OC-2 sub rounding, then block latched CMOS DC with C_SUB_AC (220nF film, D23 to D25).';

  return [
    {
      step: 1,
      title: 'Supply hum filter and compact Row 4 +4.4V V_REF hub',
      goal: 'Place the +4.4V virtual ground up at Row 4 so both the TL072 and 14-pin CD4013BE fit comfortably.',
      instructions: [
        'Keep J_GND_HDR (HDR_GND to TOP_MINUS_1), J_GND_BRIDGE (TOP_MINUS_30 to BOT_MINUS_30), J_9V_HDR (HDR_9V to C2), R_PWR (100 ohm, A2 to TOP_PLUS_2), and C_PWR (100uF, TOP_PLUS_4 to TOP_MINUS_4).',
        'Build the Row 4 divider with R_V1 (10k ohm, A4 to TOP_PLUS_5), R_V2 (10k ohm, B4 to TOP_MINUS_5), C_VREF (47uF electrolytic, + in C4, - in TOP_MINUS_3), and J_VREF_LINK (Teal Jumper, E4 to F4).'
      ],
      check: 'Meter +4.35V to +4.45V DC at probe point G4.'
    },
    {
      step: 2,
      title: `2N5088 dry buffer, TL072 ${preset.trkCap} harmonic stripper, and Schmitt clock`,
      goal: 'Split full-range clean bass from an overtone-free fundamental square clock.',
      instructions: [
        'Wire the 750k clean buffer at Rows 5-8: J_IN (HDR_IN to B5), R_PD (1M, A5 to TOP_MINUS_6), C1 (470nF, D5 to D7), R_Q1_BIAS (1M, B7 to D4), Q1 (2N5088 at C6/C7/C8, flat face toward you), J_Q1_C (A8 to TOP_PLUS_8), R_E1 (10k, A6 to TOP_MINUS_7), J_BUF_LINK (E6 to F6), C_DRY_AC (220nF, G6 to G8), and C_TRK_IN (220nF, I6 to I8).',
        `Seat IC1 (TL072) across E9-E12 and F9-F12 (notch LEFT at Row 9) with J_IC1_VCC (A9 to TOP_PLUS_9), J_IC1_GND (J12 to BOT_MINUS_12), J_PIN3_VREF (I4 to H11), R_TRK_G (4.7k, J8 to I10), R_TRK_FB (150k, G9 to G10), and C_TRK_LP (${preset.trkCap}, H9 to H10).`,
        'Wire the +/-65 mV Schmitt trigger on Op-Amp B: J_TO_CMP (Teal Jumper, I9 to D11), J_VREF_SPUR (Teal Jumper, H4 to B13), R_HYST_REF (10k, D12 to D13), and R_HYST_FB (470k, C10 to C12).'
      ],
      check: 'Probe Clean Buffer at B6 (~+3.75V DC) and Schmitt Out at B10 (snaps cleanly between ~+1.3V and ~+7.5V when playing).'
    },
    {
      step: 3,
      title: `CD4013BE CMOS divider (${preset.pitchText})`,
      goal: 'Clock the dual D flip-flop on rising fundamental zero-crossings with all Set/Reset pins grounded.',
      instructions: [
        'Seat IC2 (CD4013BE) across E15-E21 and F15-F21 with the Pin 1 notch facing LEFT at Row 15; wire J_IC2_VDD (Red Jumper, A15 to TOP_PLUS_15) and J_IC2_VSS (Black Jumper, J21 to BOT_MINUS_21).',
        'Ground all four Set/Reset pins: J_R1_GND (I18 to BOT_MINUS_18), J_S1_GND (I20 to BOT_MINUS_20), J_R2_GND (A19 to TOP_MINUS_19), and J_S2_GND (A21 to TOP_MINUS_21).',
        'Wire Flip-Flop 1 divide-by-2: J_CLK1 (Cyan Jumper, D10 to G17) and J_DIV1_FB (Cyan Jumper, G16 to G19).',
        step3FlipFlop2Line
      ],
      check: 'Probe CD4013 Q1 Out at I15: averages ~+4.35V while playing and latches cleanly at 0V or +8.7V at rest.'
    },
    {
      step: 4,
      title: `${preset.subFilterText}, Sub/Clean MIX, and Master Volume`,
      goal: 'Shape the divided sub-octave wave, block latched CMOS DC, and blend with full-range dry bass.',
      instructions: [
        step4SubTapLine,
        step4FilterLine,
        'Route Sub and Dry into MIX_POT (100kB at C26/C28/C30) via J_SUB_MIX (E25 to B26) and R_DRY_FEED (15k, H8 to B30), then feed VOL_POT (100kA at G26/G28/G30) via J_MIX_TAP (D28 to F22), C_OUT (470nF, H22 to H24), J_VOL_IN (J24 to F26), J_VOL_GND (I30 to BOT_MINUS_28), and J_OUT (F28 to HDR_OUT).'
      ],
      check: 'Play single notes above the 5th fret and sweep MIX from 100% Sub (Row 26) to 50/50 octave-doubled bass.'
    }
  ];
}

function createDSP(sampleRate, getState) {
  const fs2 = sampleRate * 2;
  let hpIn = 0;
  let trkLp1 = 0;
  let trkLp2 = 0;
  let envTrack = 0;
  let schmittHigh = false;
  let prevSchmitt = false;
  let ff1Q = false;
  let prevFf1Q = false;
  let ff2Q = false;
  let subLp1 = 0;
  let subLp2 = 0;
  let subAcHp = 0;
  let hpOut = 0;
  const aHpIn = onePoleAlpha(5, fs2);
  const aSubLp = onePoleAlpha(225, fs2);
  const aSubHp = onePoleAlpha(14, fs2);
  const aHpOut = onePoleAlpha(5, fs2);

  function readState() {
    const raw = (typeof getState === 'function' ? getState() : null) || {};
    const knobs = raw.knobs || {};
    return {
      presetId: raw.presetId || 'oct1_warm',
      mix: knobs.mix ?? 0.35,
      vol: knobs.volume ?? knobs.vol ?? 0.8
    };
  }

  return {
    getTelemetry() {
      const st = readState();
      const subPct = Math.round((1 - st.mix) * 100);
      const divStr = st.presetId === 'oct2_deep' ? 'f / 4 (-2 Oct)' : 'f / 2 (-1 Oct)';
      return `${divStr} | ${subPct}% Sub / ${100 - subPct}% Clean`;
    },
    processSample(x) {
      const st = readState();
      let y = 0;
      const trkCut = st.presetId === 'oct2_deep' ? 68 : 115;
      const aTrk = onePoleAlpha(trkCut, fs2);

      for (let os = 0; os < 2; os++) {
        const clean = x - hpIn;
        hpIn += aHpIn * (x - hpIn);

        const absIn = Math.abs(clean);
        if (absIn > envTrack) envTrack += 0.03 * (absIn - envTrack);
        else envTrack *= 0.9995;

        trkLp1 += aTrk * (clean * 32.0 - trkLp1);
        trkLp2 += aTrk * (trkLp1 - trkLp2);

        const hyst = 0.065;
        if (!schmittHigh && trkLp2 > hyst) schmittHigh = true;
        else if (schmittHigh && trkLp2 < -hyst) schmittHigh = false;

        if (schmittHigh && !prevSchmitt) {
          ff1Q = !ff1Q;
          if (ff1Q && !prevFf1Q) ff2Q = !ff2Q;
          prevFf1Q = ff1Q;
        }
        prevSchmitt = schmittHigh;

        const rawBit = (st.presetId === 'oct2_deep' ? ff2Q : ff1Q) ? 1.0 : -1.0;
        const envGate = Math.min(1, Math.max(0, (envTrack - 0.004) / 0.025));
        let subSig = rawBit * Math.min(0.68, envTrack * 1.55) * envGate;

        if (st.presetId !== 'oct1_synth_sq') {
          subLp1 += aSubLp * (subSig - subLp1);
          subLp2 += aSubLp * (subLp1 - subLp2);
          subSig = subLp2 * 1.65;
        } else {
          subSig *= 0.78;
        }

        const subAc = subSig - subAcHp;
        subAcHp += aSubHp * (subSig - subAcHp);

        const mixed = subAc * (1 - st.mix) * 1.38 + clean * st.mix * 1.25;
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
  slug: '6',
  stageNumber: 'Stage 6',
  title: 'Analog Sub-Octave Synth Divider',
  subtitle:
    '2N5088 dry buffer, TL072 harmonic low-pass and Schmitt trigger, and CD4013BE flip-flop divider',
  previousStageSlug: '5b',
  phaseDegrees: 0,
  summary:
    'Buffer full-range dry bass with a 2N5088 emitter follower while TL072 Op-Amp A strips upper harmonics and Op-Amp B clocks a CD4013BE CMOS flip-flop for -1 octave (f / 2) and -2 octave (f / 4) sub-bass.',
  defaultPresetId: 'oct1_warm',
  defaultModeId: 'standard',
  presets: PRESETS,
  modes: MODES,
  buildComponents,
  buildWiringSteps,
  audioSpec: {
    defaultRiffId: 'upperSynth',
    hint:
      'Defaults to High-Fret Synth so you can clearly hear -1 Octave (OC-2 warm sub), -2 Octaves (cascaded dual flip-flop seismic sub), and Raw Square Synth; switch to P-Bass Groove for low-register octave doubling.',
    knobs: [
      {
        id: 'mix',
        label: 'MIX Sub / Clean (100kB)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.35,
        fmt: 'subMix'
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
      title: 'Harmonic pre-filtering and +/-65 mV Schmitt hysteresis',
      body:
        'Bass strings ring with strong second and third harmonics that cause raw zero-crossing detectors to glitch an octave high. TL072 Op-Amp A rolls off harmonics above 48 to 106 Hz first, and Op-Amp B adds positive hysteresis (10k / 470k) for rock-solid single-note clocking.'
    },
    {
      title: 'CMOS D flip-flop !Q-to-D divide-by-2 and divide-by-4',
      body:
        'Wiring !Q1 back to D1 makes CD4013BE Flip-Flop 1 toggle state only on rising clock edges, halving frequency (f / 2 = -1 octave). Cascading Q1 into CLK2 halves again (f / 4 = -2 octaves).'
    },
    {
      title: '225 Hz reconstruction filter and latched DC blocking',
      body:
        'R_SUB_FEED (15k) and C_SUB_LPF (47nF) round the CMOS square wave into warm sine-like sub weight while C_SUB_AC (220nF) blocks the latched 0V or +8.7V resting state ahead of MIX.'
    }
  ]
};
