import { onePoleAlpha } from '../../riffs.js';

const SHARED_VOLTAGES = [
  { pin: 'Q1 Buffer Out (B6)', val: '+3.7V to +3.9V', net: 'Emitter follower (~Vb - 0.65V)' },
  { pin: 'Gate 1 Out Pin 2 (J11)', val: '+4.2V to +4.5V', net: 'CMOS self-biased midpoint' },
  { pin: 'EQ Out Pin 6 (J15)', val: '+4.2V to +4.5V', net: 'Active Baxandall midpoint' },
  { pin: 'Pin 1 VDD / Pin 8 VSS', val: '+8.7V / 0.0V', net: 'F10 = +9V, F17 = GND' }
];

const PRESETS = {
  svt_warm: {
    id: 'svt_warm',
    label: 'Warm SVT Push (220k Stage 2)',
    badge: 'Recommended',
    rFb2: '220k ohm',
    bypassGate2: false,
    probePoints: ['B6', 'J11', 'J15'],
    bannerTitle: 'Warm SVT Tube-Amp Emulation + Active 2-Band Baxandall EQ',
    bannerText:
      'Q1 (2N5088 emitter follower) presents a 500k load to your passive bass pickups so string snap stays open. Gates 1 and 2 of the unbuffered CD4049UBE run as cascaded complementary MOSFET amplifiers that soft-clip symmetrically like push-pull 6550 power tubes, feeding Gate 3 wired as an active Baxandall Bass and Treble shelving EQ with zero mid scoop.',
    gainText: '2-Stage Soft MOSFET',
    eqText: '80 Hz Bass / 2.2 kHz Clank',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Make sure your chip says CD4049UBE (Unbuffered). A buffered CD4049BE has 3 internal logic stages per gate and will squeal when biased linearly.'
  },
  doom_stack: {
    id: 'doom_stack',
    label: 'Cranked Fridge Stack (470k Stage 2)',
    badge: 'Heavy Grind',
    rFb2: '470k ohm',
    bypassGate2: false,
    probePoints: ['B6', 'J11', 'J15'],
    bannerTitle: 'High-Gain Cranked 8x10 Stack Mode (R_FB2 = 470k)',
    bannerText:
      'More than doubles Stage 2 CMOS voltage gain (+6.6 dB) by swapping R_FB2 at G13-G14 from 220k to 470k. Delivers thick, chewy low-mid saturation while the active Baxandall Bass control still lets you dial in clean sub-80 Hz chest thump.',
    gainText: '+6.6 dB Extra Saturation',
    eqText: '80 Hz Bass / 2.2 kHz Clank',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'If high gain picks up breadboard radio whine, keep jumper leads short around Rows 11-16.'
  },
  red_llama_raw: {
    id: 'red_llama_raw',
    label: 'Single-Stage Raw CMOS (Bypass Gate 2)',
    badge: 'Touch Dynamic',
    rFb2: '220k ohm',
    bypassGate2: true,
    probePoints: ['B6', 'J11', 'J15'],
    bannerTitle: 'Single-Stage Raw Red Llama Mode (Gate 1 Direct to Baxandall EQ)',
    bannerText:
      'Couples Gate 1 output directly into the Gate 3 Baxandall EQ while grounding unused Gate 2 input (Pin 5 at H14). Gives wide-open, touch-dynamic B-15 fliptop breakup that cleans up completely with lighter fingerstyle plucking.',
    gainText: '1-Stage Touch Dynamic',
    eqText: '80 Hz Bass / 2.2 kHz Clank',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Notice how Gate 2 Pin 5 (H14) gets grounded to BOT_MINUS_14 whenever Gate 2 is bypassed.'
  }
};

const MODES = {
  standard: {
    id: 'standard',
    label: 'Standard CD4049UBE Layout',
    desc: '16-pin unbuffered CMOS hex inverter straddling Rows 10 to 17 with Pin 1 (+9V) at F10.'
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
      : presetInput) || PRESETS.svt_warm;

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
      notes: 'Links top and bottom ground rails.'
    },
    {
      id: 'J_PLUS_BRIDGE',
      stage: 1,
      type: 'wire',
      name: '+9V Rail Bridge',
      value: 'Red Jumper',
      from: 'TOP_PLUS_29',
      to: 'BOT_PLUS_29',
      color: '#ef4444',
      net: 'Filtered +8.7V',
      notes: 'Brings filtered +9V down to bottom Red (+) rail for CD4049UBE Pin 1.'
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
      id: 'IC1',
      stage: 1,
      type: 'dipN',
      ref: 'IC1',
      tag: 'IC1',
      startCol: 10,
      spanCols: 8,
      chipLabel: 'CD4049UBE',
      name: 'IC1 (CD4049UBE)',
      value: 'CD4049UBE DIP-16',
      pins: [
        'E10',
        'E11',
        'E12',
        'E13',
        'E14',
        'E15',
        'E16',
        'E17',
        'F10',
        'F11',
        'F12',
        'F13',
        'F14',
        'F15',
        'F16',
        'F17'
      ],
      from: 'Rows 10-17 Top (16..9)',
      to: 'Rows 10-17 Bot (1..8)',
      net: 'Unbuffered CMOS Tube Core',
      notes:
        'CRITICAL PINOUT: Notch faces LEFT at Row 10! F10=Pin1(+9V VDD), F11=Out1, F12=In1, F13=Out2, F14=In2, F15=Out3, F16=In3, F17=Pin8(GND). Top E10..E17=Pins 16..9.'
    },
    {
      id: 'J_IC_VDD',
      stage: 1,
      type: 'wire',
      name: 'Pin 1 VDD (+9V)',
      value: 'Red Jumper',
      from: 'J10',
      to: 'BOT_PLUS_10',
      color: '#ef4444',
      net: 'CD4049UBE VDD',
      notes: 'Unusual CMOS power pin: Pin 1 (F10) connects to +9V!'
    },
    {
      id: 'J_IC_VSS',
      stage: 1,
      type: 'wire',
      name: 'Pin 8 VSS (GND)',
      value: 'Black Jumper',
      from: 'J17',
      to: 'BOT_MINUS_17',
      color: '#3b82f6',
      net: 'CD4049UBE VSS',
      notes: 'Pin 8 (F17) connects to GND.'
    },
    {
      id: 'J_UNUSED_14',
      stage: 1,
      type: 'wire',
      name: 'Ground Gate 6A',
      value: 'Black Jumper',
      from: 'A12',
      to: 'TOP_MINUS_12',
      color: '#3b82f6',
      net: 'Unused CMOS Ground',
      notes: 'Grounds unused Gate 6 input (Pin 14 at E12) so it never floats or oscillates.'
    },
    {
      id: 'J_UNUSED_11',
      stage: 1,
      type: 'wire',
      name: 'Ground Gate 5A',
      value: 'Black Jumper',
      from: 'A15',
      to: 'TOP_MINUS_15',
      color: '#3b82f6',
      net: 'Unused CMOS Ground',
      notes: 'Grounds unused Gate 5 input (Pin 11 at E15).'
    },
    {
      id: 'J_UNUSED_9',
      stage: 1,
      type: 'wire',
      name: 'Ground Gate 4A',
      value: 'Black Jumper',
      from: 'A17',
      to: 'TOP_MINUS_17',
      color: '#3b82f6',
      net: 'Unused CMOS Ground',
      notes: 'Grounds unused Gate 4 input (Pin 9 at E17).'
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
      id: 'C1',
      stage: 2,
      type: 'filmcap',
      name: 'C1 (Input Cap)',
      value: '470nF Film',
      from: 'D5',
      to: 'D7',
      color: '#38bdf8',
      net: 'AC Bass Coupling',
      notes: 'Full-range 31 Hz bass coupling into Q1 Base (Row 7).'
    },
    {
      id: 'R_B1',
      stage: 2,
      type: 'resistor',
      name: 'R_B1 (Bias Up)',
      value: '1M ohm',
      from: 'A7',
      to: 'TOP_PLUS_7',
      net: 'Q1 Base Bias (+4.4V)',
      notes: 'Pairs with R_B2 (1M) for 500k input impedance so passive P/J pickups stay crisp.'
    },
    {
      id: 'R_B2',
      stage: 2,
      type: 'resistor',
      name: 'R_B2 (Bias Dn)',
      value: '1M ohm',
      from: 'E7',
      to: 'TOP_MINUS_6',
      net: 'Q1 Base Bias (+4.4V)',
      notes: 'Lower half of Q1 base bias divider.'
    },
    {
      id: 'Q1',
      stage: 2,
      type: 'transistor',
      ref: 'Q1',
      tag: 'Q1',
      name: 'Q1 (Buffer)',
      value: '2N5088 (NPN)',
      pins: ['C6', 'C7', 'C8'],
      from: 'C6 (E)',
      to: 'C7 (B) / C8 (C)',
      net: '500k Emitter Follower',
      notes: 'TO-92 flat face toward you: C6=Emitter, C7=Base, C8=Collector.'
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
      notes: 'Ties emitter-follower Collector directly to +9V.'
    },
    {
      id: 'R_E1',
      stage: 2,
      type: 'resistor',
      name: 'R_E1',
      value: '10k ohm',
      from: 'A6',
      to: 'TOP_MINUS_5',
      net: 'Buffer Emitter Load',
      notes: 'Buffered bass output appears at Row 6 (probe at B6 ~ +3.8V DC).'
    },
    {
      id: 'C_DRV_IN',
      stage: 3,
      type: 'filmcap',
      name: 'C2 (To Gate 1)',
      value: '220nF Film',
      from: 'E6',
      to: 'E4',
      color: '#38bdf8',
      net: 'Drive Coupling',
      notes: 'Exact 2-row box cap coupling buffered bass out of Q1 Emitter into Row 4 Top.'
    },
    {
      id: 'R_IN1',
      stage: 3,
      type: 'resistor',
      name: 'R_IN1',
      value: '33k ohm',
      from: 'D4',
      to: 'H12',
      net: 'Gate 1 Input (Pin 3)',
      notes:
        'Feeds Gate 1 Input (Row 12 Bottom) from Row 4 Top, setting max gain to ~16x with 500k DRIVE pot.'
    },
    {
      id: 'C_HF1',
      stage: 3,
      type: 'filmcap',
      name: 'C_HF1',
      value: '100pF Ceramic',
      from: 'G11',
      to: 'G12',
      color: '#94a3b8',
      net: 'Ultrasonic Tamer',
      notes: 'Smooths harsh ultrasonic fizz above 5 kHz across Gate 1.'
    },
    {
      id: 'J_DRV_OUT',
      stage: 3,
      type: 'wire',
      name: 'Gate 1 FB Out',
      value: 'Teal Jumper',
      from: 'H11',
      to: 'D19',
      color: '#14b8a6',
      net: 'Gate 1 Out (Pin 2)',
      notes: 'Routes Gate 1 Output (probe at J11) to DRIVE Lug 3 (Row 19 Top).'
    },
    {
      id: 'R_DRV_MIN',
      stage: 3,
      type: 'resistor',
      name: 'R_DRV_MIN',
      value: '47k ohm',
      from: 'I12',
      to: 'D21',
      net: 'Minimum Drive Floor',
      notes: 'Connects Gate 1 Input (Pin 3) to DRIVE Wiper (Row 21 Top) for warm clean minimum gain.'
    },
    {
      id: 'DRIVE_POT',
      stage: 3,
      type: 'pot',
      ref: 'DRIVE',
      tag: 'DRIVE',
      name: 'DRIVE (500kB)',
      value: '500k Linear Pot',
      pins: ['C19', 'C21', 'C23'],
      from: 'C19 (Lug 3)',
      to: 'C21 (Wiper) / C23 (Open)',
      net: 'Tube Saturation Control',
      notes: 'Sweeps Gate 1 from edge-of-breakup SVT push to dense MOSFET saturation.'
    }
  ];

  if (!preset.bypassGate2) {
    parts.push(
      {
        id: 'C_INTER',
        stage: 3,
        type: 'filmcap',
        name: 'C3 (Interstage)',
        value: '220nF Film',
        from: 'I11',
        to: 'I9',
        color: '#38bdf8',
        net: 'Stage 1-to-2 Link',
        notes: 'Couples Gate 1 Output into Row 9 Bottom.'
      },
      {
        id: 'R_IN2',
        stage: 3,
        type: 'resistor',
        name: 'R_IN2',
        value: '100k ohm',
        from: 'G9',
        to: 'H14',
        net: 'Gate 2 Input (Pin 5)',
        notes: 'Feeds Gate 2 Input (Row 14 Bottom).'
      },
      {
        id: 'R_FB2',
        stage: 3,
        type: 'resistor',
        name: 'R_FB2',
        value: preset.rFb2,
        from: 'G13',
        to: 'G14',
        net: 'Gate 2 Tube Gain',
        notes: `Sets second CMOS stage gain (${preset.rFb2} / 100k).`
      },
      {
        id: 'J_TO_EQ',
        stage: 3,
        type: 'wire',
        name: 'Gate 2 Out Spur',
        value: 'Teal Jumper',
        from: 'I13',
        to: 'F20',
        color: '#14b8a6',
        net: 'Gate 2 Output (Pin 4)',
        notes:
          'Routes Gate 2 Output (Row 13) to Row 20 Bottom so C4 sits at exact 2-row box-cap spacing.'
      },
      {
        id: 'C_TO_EQ',
        stage: 3,
        type: 'filmcap',
        name: 'C4 (To EQ)',
        value: '220nF Film',
        from: 'H20',
        to: 'H18',
        color: '#fb923c',
        net: 'EQ Input Hub (Row 18)',
        notes: 'Exact 2-row box cap coupling Gate 2 into Baxandall EQ hub (Row 18 Bottom).'
      }
    );
  } else {
    parts.push(
      {
        id: 'J_UNUSED_5',
        stage: 3,
        type: 'wire',
        name: 'Ground Gate 2A',
        value: 'Black Jumper',
        from: 'H14',
        to: 'BOT_MINUS_14',
        color: '#3b82f6',
        net: 'Unused CMOS Ground',
        notes: 'Grounds bypassed Gate 2 input (Pin 5).'
      },
      {
        id: 'J_TO_EQ',
        stage: 3,
        type: 'wire',
        name: 'Gate 1 Out Spur',
        value: 'Teal Jumper',
        from: 'I11',
        to: 'F20',
        color: '#14b8a6',
        net: 'Gate 1 Output (Pin 2)',
        notes:
          'Routes Gate 1 Output (Row 11) to Row 20 Bottom so C4 sits at exact 2-row box-cap spacing.'
      },
      {
        id: 'C_TO_EQ',
        stage: 3,
        type: 'filmcap',
        name: 'C4 (To EQ)',
        value: '220nF Film',
        from: 'H20',
        to: 'H18',
        color: '#fb923c',
        net: 'EQ Input Hub (Row 18)',
        notes: 'Exact 2-row box cap coupling Gate 1 directly into Baxandall EQ hub (Row 18 Bottom).'
      }
    );
  }

  parts.push(
    {
      id: 'R_BASS_IN',
      stage: 4,
      type: 'resistor',
      name: 'R_BASS_IN',
      value: '15k ohm',
      from: 'G18',
      to: 'F19',
      net: 'Baxandall Bass Boost Leg',
      notes: 'Feeds EQ Input (Row 18) into BASS Lug 3 (Row 19 Bottom).'
    },
    {
      id: 'R_BASS_OUT',
      stage: 4,
      type: 'resistor',
      name: 'R_BASS_OUT',
      value: '15k ohm',
      from: 'F23',
      to: 'H15',
      net: 'Baxandall Bass Cut Leg',
      notes: 'Connects BASS Lug 1 (Row 23) to Gate 3 Output (Pin 6 at H15, probe at J15).'
    },
    {
      id: 'BASS_POT',
      stage: 4,
      type: 'pot',
      ref: 'BASS',
      tag: 'BASS',
      name: 'BASS (100kB)',
      value: '100k Linear Pot',
      pins: ['G19', 'G21', 'G23'],
      from: 'G19 (Boost)',
      to: 'G21 (Wiper) / G23 (Cut)',
      net: '80 Hz Low-Shelf EQ',
      notes: 'Noon is flat; turning toward G19 boosts sub-200 Hz SVT chest thump without muddying mids.'
    },
    {
      id: 'C_BASS1',
      stage: 4,
      type: 'filmcap',
      name: 'C_B1',
      value: '47nF Film',
      from: 'I19',
      to: 'I21',
      color: '#38bdf8',
      net: 'Bass Shelf Cap 1',
      notes: 'Shunts highs past BASS boost half (exact 2-row 5mm box cap fit).'
    },
    {
      id: 'C_BASS2',
      stage: 4,
      type: 'filmcap',
      name: 'C_B2',
      value: '47nF Film',
      from: 'J21',
      to: 'J23',
      color: '#38bdf8',
      net: 'Bass Shelf Cap 2',
      notes: 'Shunts highs past BASS cut half.'
    },
    {
      id: 'R_BASS_SUM',
      stage: 4,
      type: 'resistor',
      name: 'R_BASS_SUM',
      value: '33k ohm',
      from: 'F21',
      to: 'H16',
      net: 'Gate 3 Summing Node',
      notes: 'Feeds BASS Wiper into active Gate 3 Input (Pin 7 at H16).'
    },
    {
      id: 'J_TREB_IN',
      stage: 4,
      type: 'wire',
      name: 'Treble Boost Feed',
      value: 'Amber Jumper',
      from: 'I18',
      to: 'B24',
      color: '#f59e0b',
      net: 'Treble Boost Leg',
      notes: 'Routes EQ Input across ravine to TREBLE Lug 3 (Row 24 Top).'
    },
    {
      id: 'J_TREB_FB',
      stage: 4,
      type: 'wire',
      name: 'Treble Cut Return',
      value: 'Cyan Jumper',
      from: 'G15',
      to: 'B28',
      color: '#06b6d4',
      net: 'Treble Cut Leg',
      notes: 'Connects Gate 3 Output (G15) to TREBLE Lug 1 (Row 28 Top).'
    },
    {
      id: 'TREB_POT',
      stage: 4,
      type: 'pot',
      ref: 'TREBLE',
      tag: 'TREBLE',
      name: 'TREBLE (100kB)',
      value: '100k Linear Pot',
      pins: ['C24', 'C26', 'C28'],
      from: 'C24 (Boost)',
      to: 'C26 (Wiper) / C28 (Cut)',
      net: '2.2 kHz Clank Shelf',
      notes: 'Controls 2.2 kHz pick and fret attack independently of Bass.'
    },
    {
      id: 'J_TREB_TAP',
      stage: 4,
      type: 'wire',
      name: 'Treble Wiper Link',
      value: 'Amber Jumper',
      from: 'B26',
      to: 'B22',
      color: '#f59e0b',
      net: 'Treble Wiper',
      notes: 'Brings TREBLE Wiper to Row 22 Top for 2-row box cap C_TREB.'
    },
    {
      id: 'C_TREB',
      stage: 4,
      type: 'filmcap',
      name: 'C_TRB',
      value: '4.7nF Film',
      from: 'A22',
      to: 'A20',
      color: '#38bdf8',
      net: '2.2 kHz High-Shelf',
      notes: 'Passes only >2.2 kHz treble energy into Gate 3 summing node.'
    },
    {
      id: 'J_TREB_SUM',
      stage: 4,
      type: 'wire',
      name: 'Treble Sum Tie',
      value: 'Cyan Jumper',
      from: 'B20',
      to: 'G16',
      color: '#06b6d4',
      net: 'Gate 3 Summing Node',
      notes: 'Connects C_TREB into Gate 3 Input (Pin 7 at G16).'
    },
    {
      id: 'J_EQ_OUT',
      stage: 4,
      type: 'wire',
      name: 'EQ Out Link',
      value: 'Amber Jumper',
      from: 'I15',
      to: 'F25',
      color: '#f59e0b',
      net: 'Active EQ Output',
      notes: 'Routes Gate 3 Output (I15) to output coupling cap at Row 25 Bottom.'
    },
    {
      id: 'C_OUT',
      stage: 4,
      type: 'filmcap',
      name: 'C_OUT',
      value: '470nF Film',
      from: 'H25',
      to: 'H27',
      color: '#fb923c',
      net: 'DC-Blocked Audio Out',
      notes: 'Strips ~+4.3V CMOS self-bias DC offset while passing down to 3.4 Hz.'
    },
    {
      id: 'J_VOL_IN',
      stage: 4,
      type: 'wire',
      name: 'Vol Lug 3 Feed',
      value: 'Amber Jumper',
      from: 'J27',
      to: 'F26',
      color: '#f59e0b',
      net: 'Master Volume Input',
      notes: 'Feeds Volume Lug 3 (Row 26 Bottom).'
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
      notes: 'Routes Volume Wiper to Coppersound OUT header.'
    }
  );

  return parts.map(withPartMeta);
}

function createDSP(sampleRate, getState) {
  const fs2 = sampleRate * 2;
  let hpIn = 0;
  let lpHf1 = 0;
  let hpInter = 0;
  let lpHf2 = 0;
  let bassLp = 0;
  let trebHp = 0;
  let hpOut = 0;
  const aHpIn = onePoleAlpha(14, fs2);
  const aHf1 = onePoleAlpha(5200, fs2);
  const aHpInter = onePoleAlpha(18, fs2);
  const aBass = onePoleAlpha(88, fs2);
  const aTreb = onePoleAlpha(2200, fs2);
  const aHpOut = onePoleAlpha(6, fs2);

  function cmosInverter(v, gain) {
    const u = -v * gain;
    return Math.tanh(u + 0.08 * u * u) * 0.92;
  }

  function readState() {
    const raw = (typeof getState === 'function' ? getState() : null) || {};
    const knobs = raw.knobs || {};
    return {
      presetId: raw.presetId || 'svt_warm',
      drive: knobs.drive ?? 0.58,
      bass: knobs.bass ?? 0.64,
      treble: knobs.treble ?? 0.6,
      vol: knobs.volume ?? knobs.vol ?? 0.76
    };
  }

  return {
    getTelemetry() {
      const st = readState();
      const bDb = ((st.bass - 0.5) * 22).toFixed(1);
      const tDb = ((st.treble - 0.5) * 22).toFixed(1);
      return `80Hz ${bDb >= 0 ? '+' : ''}${bDb}dB | 2.2k ${tDb >= 0 ? '+' : ''}${tDb}dB`;
    },
    processSample(x) {
      const st = readState();
      let y = 0;
      const g1 = 1.4 + Math.pow(st.drive, 1.8) * 15.0;
      const g2 = st.presetId === 'doom_stack' ? 4.7 : 2.2;

      for (let os = 0; os < 2; os++) {
        const ac = x - hpIn;
        hpIn += aHpIn * (x - hpIn);

        let s1 = cmosInverter(ac, g1);
        lpHf1 += aHf1 * (s1 - lpHf1);
        s1 = lpHf1;

        let driveOut;
        if (st.presetId === 'red_llama_raw') {
          driveOut = s1;
        } else {
          const inter = s1 - hpInter;
          hpInter += aHpInter * (s1 - hpInter);
          const s2 = cmosInverter(inter, g2);
          lpHf2 += aHf1 * (s2 - lpHf2);
          driveOut = lpHf2;
        }

        bassLp += aBass * (driveOut - bassLp);
        const highBand = driveOut - trebHp;
        trebHp += aTreb * (driveOut - trebHp);

        const bassGain = Math.pow(10, ((st.bass - 0.5) * 22) / 20);
        const trebGain = Math.pow(10, ((st.treble - 0.5) * 22) / 20);
        const midBand = driveOut - bassLp - highBand;
        const eqOut = -(bassLp * bassGain + midBand + highBand * trebGain);

        const outAc = eqOut - hpOut;
        hpOut += aHpOut * (eqOut - hpOut);
        y = outAc;
      }

      const volTaper = Math.pow(st.vol, 1.6);
      return Math.tanh(y * volTaper * 0.85) * 0.85;
    }
  };
}

export const stageDescriptor = {
  slug: '4',
  stageNumber: 'Stage 4',
  title: 'SVT-Style CMOS Tube Overdrive and 2-Band Baxandall EQ',
  subtitle: '2N5088 emitter-follower buffer, unbuffered CD4049UBE CMOS stages, and active Baxandall EQ',
  previousStageSlug: '3',
  phaseDegrees: 0,
  summary:
    'Buffer passive pickups at 500k with a 2N5088 emitter follower, cascade unbuffered CD4049UBE CMOS gates for symmetrical tube-like overdrive, and shape tone with an active Gate 3 Baxandall EQ.',
  defaultPresetId: 'svt_warm',
  defaultModeId: 'standard',
  presets: PRESETS,
  modes: MODES,
  buildComponents,
  audioSpec: {
    defaultRiffId: 'groove',
    hint:
      'Compare Warm SVT Push, Cranked 470k Fridge Stack, and Single-Stage Raw CMOS while sweeping the active Baxandall 80 Hz BASS and 2.2 kHz TREBLE shelves around flat 50% noon.',
    knobs: [
      {
        id: 'drive',
        label: 'DRIVE (500kB)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.58,
        fmt: 'pct'
      },
      {
        id: 'bass',
        label: 'BASS 80Hz',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.64,
        fmt: 'dbShelf'
      },
      {
        id: 'treble',
        label: 'TREBLE 2.2k',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.6,
        fmt: 'dbShelf'
      },
      {
        id: 'volume',
        label: 'VOLUME (100kA)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.76,
        fmt: 'pct'
      }
    ],
    createDSP
  },
  theoryNotes: [
    {
      title: 'CD4049UBE power pinout and unbuffered linear biasing',
      body:
        'Unlike standard 16-pin chips, CD4049UBE places +9V VDD on Pin 1 (F10) and GND on Pin 8 (F17). Each unbuffered complementary MOSFET pair self-biases near +4.3V when wrapped in resistive feedback, soft-clipping like push-pull tubes without buffered BE oscillation.'
    },
    {
      title: 'Grounding unused CMOS inputs',
      body:
        'Floating CMOS gate inputs drift into the linear threshold zone and draw shoot-through current or oscillate, so unused Gates 4, 5, and 6 on the top strip (and Gate 2 in Red Llama mode) tie directly to GND.'
    },
    {
      title: 'Active James/Baxandall 80 Hz and 2.2 kHz shelving EQ',
      body:
        'Placing dual 47nF bass caps and a 4.7nF treble cap inside the Gate 3 feedback loop gives independent boost and cut at 80 Hz chest thump and 2.2 kHz string clank while keeping midrange fundamentals flat at noon.'
    }
  ]
};
