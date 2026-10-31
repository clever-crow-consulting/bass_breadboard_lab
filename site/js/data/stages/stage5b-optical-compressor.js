import { onePoleAlpha } from '../../riffs.js';

const SHARED_VOLTAGES = [
  { pin: 'V_REF Hub (G9)', val: '+4.35V to +4.45V', net: 'Zero-thump optical reference' },
  { pin: 'Gain Cell Out (I12)', val: '+4.4V DC idle', net: '+11.5 dB dark -> +0.6 dB peak' },
  { pin: 'Sidechain Out (B13)', val: '+4.4V DC idle', net: 'Boosts compressed bass up to 33x' },
  { pin: 'Release Cap (B16)', val: '+4.4V rest -> +7.0V pluck', net: 'Drives Red LED gain reduction' }
];

const PRESETS = {
  studio_glue: {
    id: 'studio_glue',
    label: 'Studio Optical Glue (22uF / 2.2k)',
    badge: 'Recommended',
    relCap: '22uF Elec',
    rLed: '2.2k ohm',
    ratioText: 'Soft ~3:1 Optical Knee',
    releaseText: '48 ms + LDR Memory',
    probePoints: ['G9', 'I12', 'B13'],
    bannerTitle: 'Diamond / LA-2A Style Feedback Optical Leveler (C_REL = 22uF)',
    bannerText:
      'Op-Amp A amplifies your passive bass by 1 + (100k || R_LDR) / 33k (+11.5 dB dark makeup gain). Op-Amp B taps that compressed output (feedback topology) and boosts it up to 33x via COMP to illuminate the 3mm Red LED across the ravine, gently pulling loud notes down toward +0.6 dB unity.',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Because C_SHUNT_A (220nF at H11-H9) blocks DC in the gain leg, rapid LDR changes never shift Op-Amp A DC bias, meaning zero low-frequency optical thump on bass!'
  },
  slap_punch: {
    id: 'slap_punch',
    label: 'Fast Slap Peak Tamer (1uF / 1k)',
    badge: 'Thumb Snap',
    relCap: '1uF Elec',
    rLed: '1k ohm',
    ratioText: 'Firm ~5:1 Peak Catch',
    releaseText: 'Fast Photocell Recovery',
    probePoints: ['G9', 'I12', 'B13'],
    bannerTitle: 'Fast-Recovery Slap & Pop Limiter Mode (C_REL = 1uF, R_LED = 1k)',
    bannerText:
      'Drops C_REL to 1uF and lowers R_LED to 1k so popped G-string transients fire the vactrol LED harder and release immediately via the GL5528 natural ~35 ms decay, keeping thumb attack punchy while catching amp-clipping spikes.',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Even with C_REL = 1uF, the GL5528 CdS cell naturally smooths 41 Hz E-string cycles so low notes stay clean rather than distorting.'
  },
  sustain_wall: {
    id: 'sustain_wall',
    label: 'Deep Sustain Glue (47uF / 2.2k)',
    badge: 'Fretless / Dub',
    relCap: '47uF Elec',
    rLed: '2.2k ohm',
    ratioText: 'Smooth ~3.5:1 Leveler',
    releaseText: '103 ms Singing Tail',
    probePoints: ['G9', 'I12', 'B13'],
    bannerTitle: 'Long-Release Studio Sustain Mode (C_REL = 47uF)',
    bannerText:
      'Doubles C_REL at B16-B20 to 47uF, holding the optical gain cell steady across whole phrases and bringing decaying bass notes smoothly up to the front of the mix.',
    voltages: SHARED_VOLTAGES,
    voltageNote:
      'Keep the black heat-shrink sleeve pinched shut over E18-G20; ambient desk lamps lower dark LDR resistance and reduce your +11.5 dB makeup range.'
  }
};

const MODES = {
  standard: {
    id: 'standard',
    label: 'Standard Ravine Vactrol Layout',
    desc: 'TL072 at Rows 12 to 15 with Red LED (E18-E20) facing GL5528 LDR (G18-G20) across the center ravine.'
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
    (typeof presetInput === 'string' ? PRESETS[presetInput] : presetInput) || PRESETS.studio_glue;

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
      value: 'Purple Jumper',
      from: 'E9',
      to: 'F9',
      color: '#a855f7',
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
      net: 'Optical Gain Cell + Sidechain',
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
      notes: 'Passes full 31 Hz passive-bass fundamental.'
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
      notes: 'Feeds AC bass signal into non-inverting Pin 3 (Row 14 Bottom).'
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
      id: 'J_A_OUT_SPUR',
      stage: 2,
      type: 'wire',
      name: 'Pin 1 Audio Spur',
      value: 'Green Jumper',
      from: 'G12',
      to: 'F18',
      color: '#22c55e',
      net: 'Compressed Out (Pin 1)',
      notes: 'Extends Pin 1 (probe at I12) to Row 18 Bottom right below the ravine.'
    },
    {
      id: 'J_A_IN_SPUR',
      stage: 2,
      type: 'wire',
      name: 'Pin 2 Feedback Spur',
      value: 'Cyan Jumper',
      from: 'G13',
      to: 'F20',
      color: '#06b6d4',
      net: 'Op-Amp A IN- (Pin 2)',
      notes: 'Extends Pin 2 to Row 20 Bottom so the LDR + 100k sit cleanly across Rows 18-20.'
    },
    {
      id: 'R_MAX_GAIN',
      stage: 2,
      type: 'resistor',
      name: 'R_MAX_GAIN',
      value: '100k ohm',
      from: 'I18',
      to: 'I20',
      net: 'Dark Makeup Ceiling',
      notes: 'Caps Op-Amp A dark makeup gain at 1 + (100k || 1M)/33k = +11.5 dB when LED is off.'
    },
    {
      id: 'VAC_LDR',
      stage: 2,
      type: 'vactrol_ldr',
      name: 'VACTROL LDR',
      value: 'GL5528 Photoresistor',
      from: 'G18',
      to: 'G20',
      net: 'Optical Attenuator Cell',
      notes:
        'Non-polarized photoresistor across Op-Amp A feedback loop (G18-G20). Bend face north across ravine to touch VAC_LED inside black heat-shrink!'
    },
    {
      id: 'R_SHUNT_A',
      stage: 2,
      type: 'resistor',
      name: 'R_SHUNT_A',
      value: '33k ohm',
      from: 'H20',
      to: 'J11',
      net: 'Gain Reference Leg',
      notes: 'Sets gain denominator (33k) from Pin 2 spur (H20) to C_SHUNT_A (Row 11 Bottom).'
    },
    {
      id: 'C_SHUNT_A',
      stage: 2,
      type: 'filmcap',
      name: 'C_SHUNT',
      value: '220nF Film',
      from: 'H11',
      to: 'H9',
      color: '#22c55e',
      net: 'Zero-Thump DC Block',
      notes:
        '2-row box cap to Row 9 V_REF; locks DC gain at 1.0x so LDR sweeps never cause DC thump.'
    },
    {
      id: 'J_SIDE_IN',
      stage: 3,
      type: 'wire',
      name: 'Feedback Sidechain Tap',
      value: 'Red Jumper',
      from: 'H12',
      to: 'D15',
      color: '#ef4444',
      net: 'Sidechain Input (Pin 5)',
      notes:
        'Taps compressed Pin 1 output (H12) into Op-Amp B Pin 5 (Row 15 Top) for true LA-2A feedback leveling.'
    },
    {
      id: 'R_SIDE_FB',
      stage: 3,
      type: 'resistor',
      name: 'R_SIDE_FB',
      value: '150k ohm',
      from: 'C13',
      to: 'C14',
      net: 'Sidechain Feedback',
      notes: 'Feedback resistor across Op-Amp B Pin 7 (probe at B13) and Pin 6.'
    },
    {
      id: 'R_COMP_MIN',
      stage: 3,
      type: 'resistor',
      name: 'R_COMP_MIN',
      value: '4.7k ohm',
      from: 'B14',
      to: 'B21',
      net: 'Compression Ceiling',
      notes:
        'Connects Pin 6 (Row 14 Top) to COMP Wiper (Row 21 Top), boosting sidechain up to 33x (+30 dB).'
    },
    {
      id: 'COMP_POT',
      stage: 3,
      type: 'pot',
      ref: 'COMP',
      tag: 'COMP',
      name: 'COMP (100kB)',
      value: '100k Linear Pot',
      pins: ['C19', 'C21', 'C23'],
      from: 'C19 (Max Comp)',
      to: 'C21 (Wiper) / C23 (Open)',
      net: 'Compression Threshold / Amount',
      notes:
        'Turning toward Row 19 raises sidechain gain from 2.4x to 33x, lighting the LED earlier on gentle plucks.'
    },
    {
      id: 'C_SIDE_DC',
      stage: 3,
      type: 'filmcap',
      name: 'C_SIDE',
      value: '220nF Film',
      from: 'D19',
      to: 'D17',
      color: '#f87171',
      net: 'Sidechain DC Block',
      notes: 'Exact 2-row box cap keeping Op-Amp B DC gain at unity (+4.4V idle).'
    },
    {
      id: 'J_SIDE_VREF',
      stage: 3,
      type: 'wire',
      name: 'Sidechain V_REF Tie',
      value: 'Purple Jumper',
      from: 'A17',
      to: 'D9',
      color: '#a855f7',
      net: 'V_REF (+4.4V) Hub',
      notes: 'References C_SIDE_DC to +4.4V V_REF.'
    },
    {
      id: 'D_RECT',
      stage: 3,
      type: 'diode',
      name: 'D_RECT (Peak)',
      value: '1N4148 Silicon',
      from: 'D13',
      to: 'E16',
      stripeAt: 'E16',
      net: 'Sidechain Envelope Rectifier',
      notes: 'Anode at Pin 7 (D13), Cathode stripe at E16. Rectifies bass peaks into C_REL.'
    },
    {
      id: 'C_REL',
      stage: 3,
      type: 'ecap',
      name: 'C_REL (Release)',
      value: preset.relCap,
      from: 'B16',
      to: 'B20',
      plusAt: 'B16',
      net: 'Optical Release Timing',
      notes: `(+) lead in B16, (-) lead in B20 (+4.4V V_REF). Sets ${preset.releaseText}.`
    },
    {
      id: 'R_LED',
      stage: 3,
      type: 'resistor',
      name: 'R_LED',
      value: preset.rLed,
      from: 'C16',
      to: 'C18',
      net: 'Vactrol LED Drive',
      notes: `Feeds smoothed envelope current into VAC_LED anode at Row 18 Top (${preset.rLed}).`
    },
    {
      id: 'VAC_LED',
      stage: 3,
      type: 'vactrol_led',
      name: 'VACTROL LED',
      value: '3mm Red LED',
      from: 'E18',
      to: 'E20',
      stripeAt: 'E20',
      net: 'Optical Compressor Emitter',
      notes:
        'Long (+) anode in E18, short (-) cathode in E20. Bend lens south across the ravine against VAC_LDR inside black heat-shrink!'
    },
    {
      id: 'J_LED_VREF',
      stage: 3,
      type: 'wire',
      name: 'LED V_REF Return',
      value: 'Purple Jumper',
      from: 'A20',
      to: 'J9',
      color: '#a855f7',
      net: 'V_REF (+4.4V) Hub',
      notes: 'Returns Row 20 Top (VAC_LED cathode & C_REL negative) to +4.4V V_REF.'
    },
    {
      id: 'J_AUDIO_TAP',
      stage: 4,
      type: 'wire',
      name: 'Compressed Audio Out',
      value: 'Amber Jumper',
      from: 'H18',
      to: 'F23',
      color: '#f59e0b',
      net: 'Compressed Bass (+4.4V DC)',
      notes: 'Routes compressed non-inverting bass from Row 18 Bottom to output coupling cap.'
    },
    {
      id: 'C_OUT',
      stage: 4,
      type: 'filmcap',
      name: 'C_OUT',
      value: '470nF Film',
      from: 'H23',
      to: 'H25',
      color: '#38bdf8',
      net: 'DC-Blocked Audio Out',
      notes: 'Exact 2-row box cap stripping +4.4V DC while passing sub-bass down to 3.4 Hz.'
    },
    {
      id: 'J_VOL_IN',
      stage: 4,
      type: 'wire',
      name: 'Vol Lug 3 Feed',
      value: 'Amber Jumper',
      from: 'J25',
      to: 'F26',
      color: '#f59e0b',
      net: 'Makeup Volume Input',
      notes: 'Feeds VOL (Makeup Level) Lug 3.'
    },
    {
      id: 'VOL_POT',
      stage: 4,
      type: 'pot',
      ref: 'LEVEL',
      tag: 'LEVEL',
      name: 'VOL / LEVEL (100kA)',
      value: '100k Audio Pot',
      pins: ['G26', 'G28', 'G30'],
      from: 'G26 (Lug 3)',
      to: 'G28 (Wiper) / G30 (Lug 1)',
      net: 'Makeup Output Level',
      notes: 'Balances your +11.5 dB compressed signal against bypassed unity volume.'
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
      notes: 'Sends Makeup Level wiper to Coppersound OUT header.'
    }
  ];

  return parts.map(withPartMeta);
}

function createDSP(sampleRate, getState) {
  const fs2 = sampleRate * 2;
  let hpIn = 0;
  let envCap = 0;
  let ldrCond = 0;
  let prevOut = 0;
  let hpOut = 0;
  let lastGrDb = 0;
  let lastLed = 0;
  const aHpIn = onePoleAlpha(5, fs2);
  const aLdrAtk = onePoleAlpha(900, fs2);
  const aLdrDec = onePoleAlpha(12, fs2);
  const aHpOut = onePoleAlpha(5, fs2);

  function readState() {
    const raw = (typeof getState === 'function' ? getState() : null) || {};
    const knobs = raw.knobs || {};
    return {
      presetId: raw.presetId || 'studio_glue',
      comp: knobs.comp ?? 0.72,
      vol: knobs.volume ?? knobs.vol ?? 0.84
    };
  }

  return {
    getTelemetry() {
      return `GR ${lastGrDb.toFixed(1)} dB | Vactrol LED ${Math.round(lastLed * 100)}%`;
    },
    processSample(x) {
      const st = readState();
      let y = 0;
      const sideGain = 2.4 + Math.pow(st.comp, 1.4) * 10.4;
      const elecRelTau =
        st.presetId === 'slap_punch' ? 0.018 : st.presetId === 'sustain_wall' ? 0.16 : 0.065;
      const relMul = Math.exp(-1 / (elecRelTau * fs2));
      const ledDriveScale = st.presetId === 'slap_punch' ? 1.65 : 1.0;

      for (let os = 0; os < 2; os++) {
        const xin = (x - hpIn) * 0.22;
        hpIn += aHpIn * (x - hpIn);

        const sideOut = prevOut * sideGain;
        const rect = Math.max(0, Math.abs(sideOut) - 2.35) * ledDriveScale;
        if (rect > envCap) envCap += 0.78 * (rect - envCap);
        else envCap *= relMul;

        if (envCap > ldrCond) ldrCond += aLdrAtk * (envCap - ldrCond);
        else ldrCond += aLdrDec * (envCap - ldrCond);

        const rLdr = Math.max(2.2, 900 / (1 + 65 * ldrCond));
        const rParallel = (100 * rLdr) / (100 + rLdr);
        const gainCell = 1 + rParallel / 33.0;
        const darkGain = 3.727;

        lastGrDb = 20 * Math.log10(gainCell / darkGain);
        lastLed = Math.min(1, ldrCond / 0.55);

        const rawCell = xin * gainCell;
        const compOut = 3.2 * Math.tanh(rawCell / 3.2);
        prevOut = compOut;

        const outAc = compOut - hpOut;
        hpOut += aHpOut * (compOut - hpOut);
        y = outAc;
      }

      const volTaper = Math.pow(st.vol, 1.6);
      const makeup = 1 + 0.38 * st.comp;
      return Math.tanh(y * volTaper * makeup * 1.45) * 0.90;
    }
  };
}

export const stageDescriptor = {
  slug: '5b',
  stageNumber: 'Stage 5B',
  title: 'Studio Feedback Optical Bass Compressor',
  subtitle: 'Non-inverting feedback optical gain cell reusing the Stage 5A Row 1 to 15 backbone',
  previousStageSlug: '5a',
  phaseDegrees: 0,
  summary:
    'Keep Rows 1 to 15 from Stage 5A untouched and move the vactrol LDR leads across the center ravine into Op-Amp A feedback for LA-2A and Diamond style studio bass compression.',
  defaultPresetId: 'studio_glue',
  defaultModeId: 'standard',
  presets: PRESETS,
  modes: MODES,
  buildComponents,
  audioSpec: {
    defaultRiffId: 'slap',
    hint:
      'Toggle Effect Engaged vs True Bypass on Funk Slap and Pop: notice how quiet fingerstyle ghost notes step forward while loud popped octaves tuck smoothly into the pocket with live Gain Reduction dB readout.',
    knobs: [
      {
        id: 'comp',
        label: 'COMP Threshold (100kB)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.72,
        fmt: 'pct'
      },
      {
        id: 'volume',
        label: 'LEVEL Makeup (100kA)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.84,
        fmt: 'pct'
      }
    ],
    createDSP
  },
  theoryNotes: [
    {
      title: 'Reusing the Stage 5A backbone for feedback compression',
      body:
        'Rows 1 to 15 (power filter, Row 9 V_REF hub, 1M passive input network, and TL072) stay untouched while VAC_LDR moves into Op-Amp A feedback (G18-G20) and Op-Amp B becomes the feedback sidechain driver.'
    },
    {
      title: 'Feedback optical gain reduction math without DC thump',
      body:
        'Op-Amp A passband gain follows 1 + (100k || R_LDR) / 33k, sliding smoothly from +11.5 dB dark makeup gain down toward +0.6 dB on peaks while C_SHUNT_A (220nF) holds DC gain at unity.'
    },
    {
      title: 'Non-inverting 0-degree phase coherence',
      body:
        'Because audio enters non-inverting Pin 3 and exits Pin 1 without phase inversion, compressed bass retains natural pluck transient polarity and blends cleanly in studio parallel chains.'
    }
  ]
};
