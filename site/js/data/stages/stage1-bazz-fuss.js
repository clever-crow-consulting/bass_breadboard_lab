import { onePoleAlpha } from '../../riffs.js';

const PRESETS = {
  npn_mpsa13: {
    id: 'npn_mpsa13',
    label: 'NPN Darlington (MPSA13 / 2N5088)',
    badge: 'Passive Bass Default',
    polarity: 'Standard NPN',
    q1Name: 'MPSA13 (or 2N5088)',
    q1Pinout:
      'TO-92 flat face toward you, left-to-right: Pin 1 Emitter (C12), Pin 2 Base (C14), Pin 3 Collector (C16).',
    r1Value: '100k ohm',
    d1Dir: 'Cathode stripe at D14 (Base), Anode at D16 (Collector)',
    d1StripeAt: 'D14',
    emitRail: 'TOP_MINUS_12',
    emitRailDesc: 'Top Blue (GND) Rail',
    r1Rail: 'TOP_PLUS_16',
    r1RailDesc: 'Top Red (+9V) Rail',
    needsLeakBleed: false,
    probePoints: ['B12', 'B14', 'B16'],
    bannerTitle: 'Standard NPN Darlington Mode (MPSA13 or 2N5088)',
    bannerText:
      'Every row coordinate stays identical to the PNP layout. Emitter (A12) ties to GND, R1 (100k at A16) ties to +9V, and D1 points so its cathode stripe faces Base (D14). With 470nF coupling caps into 100k, low E1 (41.2 Hz) and B0 (30.87 Hz) pass without roll-off.',
    voltages: [
      { pin: 'Emitter (B12)', val: '0.00V', net: 'Tied to GND' },
      { pin: 'Base (B14)', val: '+1.20V (+0.65V 2N5088)', net: 'Darlington 2x Vbe' },
      { pin: 'Collector (B16)', val: '+1.75V to +2.90V', net: 'Vbe + D1 drop' }
    ],
    voltageNote:
      'MPSA13 with a 100k R1 load keeps input impedance high so passive bass pickups retain top-end snap and clean up smoothly when rolling back instrument volume.'
  },
  pnp_2n3906: {
    id: 'pnp_2n3906',
    label: 'PNP Silicon (2N3906)',
    badge: 'Negative-GND Flip',
    polarity: 'PNP (Negative-Ground Flip)',
    q1Name: '2N3906 (PNP)',
    q1Pinout:
      'TO-92 flat face toward you, left-to-right: Pin 1 Emitter (C12), Pin 2 Base (C14), Pin 3 Collector (C16).',
    r1Value: '10k ohm',
    d1Dir: 'Anode at D14 (Base), Cathode stripe at D16 (Collector)',
    d1StripeAt: 'D16',
    emitRail: 'TOP_PLUS_12',
    emitRailDesc: 'Top Red (+9V) Rail',
    r1Rail: 'TOP_MINUS_16',
    r1RailDesc: 'Top Blue (GND) Rail',
    needsLeakBleed: false,
    probePoints: ['B12', 'B14', 'B16'],
    bannerTitle: 'Negative-Ground PNP Silicon Mode (2N3906)',
    bannerText:
      'Standard center-negative 9V power stays normal: GND is 0V and +9V is +9V. To run a PNP transistor without inverting jack ground sleeves, Emitter (Row 12) ties to the filtered +9V rail, R1 (10k) ties from Collector (Row 16) to GND, and D1 points from Base (D14) toward Collector (D16).',
    voltages: [
      { pin: 'Emitter (B12)', val: '+8.8V to +9.0V', net: 'Filtered +9V' },
      { pin: 'Base (B14)', val: '+8.2V to +8.4V', net: '1 Veb drop below +9V' },
      { pin: 'Collector (B16)', val: '+7.6V to +7.8V', net: '1 diode drop below Base' }
    ],
    voltageNote:
      'Using a 3mm Red LED for D1 instead of 1N4148 lowers Collector to roughly +6.6V and increases bass output headroom.'
  },
  pnp_ac128: {
    id: 'pnp_ac128',
    label: 'PNP Germanium (AC128)',
    badge: 'Vintage Ge',
    polarity: 'PNP (Negative-Ground Flip)',
    q1Name: 'AC128 (Ge PNP)',
    q1Pinout:
      'TO-1 metal can: red dot or tab marks Collector (C16), middle lead is Base (C14), opposite lead is Emitter (C12).',
    r1Value: '4.7k ohm',
    d1Dir: 'Anode at D14 (Base), Cathode stripe at D16 (Collector)',
    d1StripeAt: 'D16',
    emitRail: 'TOP_PLUS_12',
    emitRailDesc: 'Top Red (+9V) Rail',
    r1Rail: 'TOP_MINUS_16',
    r1RailDesc: 'Top Blue (GND) Rail',
    needsLeakBleed: true,
    probePoints: ['B12', 'B14', 'B16'],
    bannerTitle: 'Negative-Ground Germanium PNP Mode (AC128)',
    bannerText:
      'Keep R_PWR (100 ohm) + C_PWR (100uF) installed at Rows 2 to 4 because PNP emitter-referenced stages amplify 9V ripple without filtering. Adds R_LEAK (220k from A14 to +9V) to bleed Germanium leakage current.',
    voltages: [
      { pin: 'Emitter (B12)', val: '+8.8V to +9.0V', net: 'Filtered +9V' },
      { pin: 'Base (B14)', val: '+8.6V to +8.75V', net: 'Ge Veb (~0.2V)' },
      { pin: 'Collector (B16)', val: '+7.9V to +8.3V', net: 'Target < +8.4V' }
    ],
    voltageNote:
      'If Collector (B16) reads above +8.6V and sounds gated or silent, keep R_LEAK (220k from A14 to Top +9V rail) installed and use 4.7k for R1.'
  }
};

const MODES = {
  stock: {
    id: 'stock',
    label: 'Stock Jumper',
    desc: 'Direct jumper D18 to D24 across the Mod Zone.'
  },
  treble_cut: {
    id: 'treble_cut',
    label: 'Treble Tamer Cap',
    desc: 'Adds 10nF film cap from A18 to GND to smooth fizzy upper harmonics.'
  },
  hard_clip: {
    id: 'hard_clip',
    label: 'Extra Diode Clip',
    desc: 'Adds 1k resistor (D18-D21) + 1N4148 to GND (A21) for denser compression.'
  }
};

function withPartMeta(part) {
  return {
    ref: part.ref || part.id,
    role: part.role || part.notes,
    ...part
  };
}

function buildComponents(presetInput, modeInput) {
  const preset =
    (typeof presetInput === 'string' ? PRESETS[presetInput] : presetInput) || PRESETS.npn_mpsa13;
  const mode = (typeof modeInput === 'string' ? MODES[modeInput] : modeInput) || MODES.stock;
  const modId = mode.id;

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
      notes: 'Connects Coppersound onboard GND header to Top Blue (-) rail.'
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
      notes: 'Ties bottom ground rail to top ground rail for multi-stage expansion.'
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
      net: 'Raw +9V Input',
      notes: 'Routes onboard +9V header into Row 2 before the hum-filter resistor.'
    },
    {
      id: 'R_PWR',
      stage: 1,
      type: 'resistor',
      name: 'R_PWR',
      value: '100 ohm',
      from: 'A2',
      to: 'TOP_PLUS_2',
      net: 'Power Filter',
      notes:
        'Forms a 16 Hz RC low-pass filter with C_PWR to strip supply ripple before the +9V rail.'
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
      net: 'Power Filter',
      notes: 'Electrolytic reservoir cap: long (+) lead in Top Red (+), stripe (-) lead in Top Blue (-).'
    },
    {
      id: 'J_IN',
      stage: 2,
      type: 'wire',
      name: 'Audio IN Feed',
      value: 'Green Jumper',
      from: 'HDR_IN',
      to: 'B7',
      color: '#22c55e',
      net: 'Bass Input',
      notes: 'Brings switched passive-bass input from Coppersound IN header into Row 7.'
    },
    {
      id: 'R_PD',
      stage: 2,
      type: 'resistor',
      name: 'R_PD',
      value: '1M ohm',
      from: 'A7',
      to: 'TOP_MINUS_7',
      net: 'Bass Input',
      notes: '1M anti-pop pulldown resistor to GND so engaging bypass stays silent without loading pickups.'
    },
    {
      id: 'C1',
      stage: 2,
      type: 'filmcap',
      name: 'C1 (Input Cap)',
      value: '470nF Film',
      from: 'D7',
      to: 'D9',
      color: '#38bdf8',
      net: 'AC Coupled Input',
      notes: '5mm box film cap spans 2 rows cleanly; 470nF preserves full 31 Hz to 41 Hz sub-bass weight.'
    },
    {
      id: 'J_BASE',
      stage: 2,
      type: 'wire',
      name: 'Base Jumper',
      value: 'Cyan Jumper',
      from: 'E9',
      to: 'E14',
      color: '#06b6d4',
      net: 'Q1 Base Node',
      notes:
        'Keeps Row 7 input physically separated from Q1 Collector (Row 16) to eliminate parasitic squeal.'
    },
    {
      id: 'Q1',
      stage: 3,
      type: 'transistor',
      ref: 'Q1',
      tag: 'Q1',
      name: 'Q1',
      value: preset.q1Name,
      pins: ['C12', 'C14', 'C16'],
      from: 'C12 (E)',
      to: 'C14 (B) / C16 (C)',
      net: 'Transistor Gain Core',
      notes: preset.q1Pinout
    },
    {
      id: 'J_EMIT',
      stage: 3,
      type: 'wire',
      name: 'Emitter Tie',
      value: preset.emitRail.startsWith('TOP_PLUS') ? 'Red Jumper' : 'Black Jumper',
      from: 'A12',
      to: preset.emitRail,
      color: preset.emitRail.startsWith('TOP_PLUS') ? '#ef4444' : '#3b82f6',
      net: `Q1 Emitter -> ${preset.emitRailDesc}`,
      notes: `Connects Q1 Emitter (Row 12) to ${preset.emitRailDesc}.`
    }
  ];

  if (preset.needsLeakBleed) {
    parts.push({
      id: 'R_LEAK',
      stage: 3,
      type: 'resistor',
      name: 'R_LEAK (Opt)',
      value: '220k ohm',
      from: 'A14',
      to: 'TOP_PLUS_14',
      net: 'Ge Leakage Bleed',
      notes: 'Bleeds excess AC128 Icbo leakage to +9V if Collector reads above +8.5V.'
    });
  }

  parts.push(
    {
      id: 'D1',
      stage: 4,
      type: 'diode',
      name: 'D1 (Bias/Clip)',
      value: '1N4148 or Red LED',
      from: 'D14',
      to: 'D16',
      stripeAt: preset.d1StripeAt,
      net: 'Self-Bias & Asymmetrical Clip',
      notes: `${preset.d1Dir}. Swap 1N4148 with a 3mm Red LED for higher headroom and louder bass crunch.`
    },
    {
      id: 'R1',
      stage: 4,
      type: 'resistor',
      name: 'R1 (Load)',
      value: preset.r1Value,
      from: 'A16',
      to: preset.r1Rail,
      net: `Q1 Collector -> ${preset.r1RailDesc}`,
      notes: `Collector bias and load resistor to ${preset.r1RailDesc}.`
    },
    {
      id: 'C2',
      stage: 5,
      type: 'filmcap',
      name: 'C2 (Output Cap)',
      value: '470nF Film',
      from: 'E16',
      to: 'E18',
      color: '#fb923c',
      net: 'DC-Blocked Audio Out',
      notes:
        'Blocks Collector DC voltage at a 3.4 Hz high-pass cutoff so turning the 100kA Volume pot never crackles.'
    }
  );

  if (modId === 'stock') {
    parts.push({
      id: 'J_MOD',
      stage: 5,
      type: 'wire',
      name: 'Mod Zone Link',
      value: 'Amber Jumper',
      from: 'D18',
      to: 'D24',
      color: '#f59e0b',
      net: 'Pre-Volume Signal',
      notes: 'Bridges across empty Rows 19-23 into Volume Lug 3 (Row 24).'
    });
  } else if (modId === 'treble_cut') {
    parts.push(
      {
        id: 'C_TONE',
        stage: 5,
        type: 'filmcap',
        name: 'C_TONE (Mod)',
        value: '10nF Film',
        from: 'A18',
        to: 'TOP_MINUS_18',
        color: '#38bdf8',
        net: 'Treble Tamer Filter',
        notes: 'Rolls off sharp top harmonic fizz to GND while preserving sub-bass weight.'
      },
      {
        id: 'J_MOD',
        stage: 5,
        type: 'wire',
        name: 'Mod Zone Link',
        value: 'Amber Jumper',
        from: 'D18',
        to: 'D24',
        color: '#f59e0b',
        net: 'Pre-Volume Signal',
        notes: 'Routes filtered output into Volume Lug 3 (Row 24).'
      }
    );
  } else if (modId === 'hard_clip') {
    parts.push(
      {
        id: 'R_CLIP',
        stage: 5,
        type: 'resistor',
        name: 'R_CLIP (Mod)',
        value: '1k ohm',
        from: 'D18',
        to: 'D21',
        net: 'Post-Stage Clipper',
        notes: 'Series current-limiting resistor feeding the shunt clipping diode at Row 21.'
      },
      {
        id: 'D_CLIP',
        stage: 5,
        type: 'diode',
        name: 'D_CLIP (Mod)',
        value: '1N4148',
        from: 'A21',
        to: 'TOP_MINUS_21',
        stripeAt: 'TOP_MINUS_21',
        net: 'Post-Stage Clipper',
        notes: 'Clips positive output peaks to GND for denser sustain.'
      },
      {
        id: 'J_MOD2',
        stage: 5,
        type: 'wire',
        name: 'Clipper Out',
        value: 'Amber Jumper',
        from: 'E21',
        to: 'D24',
        color: '#f59e0b',
        net: 'Pre-Volume Signal',
        notes: 'Routes clipped signal into Volume Lug 3 (Row 24).'
      }
    );
  }

  parts.push(
    {
      id: 'VOL_POT',
      stage: 5,
      type: 'pot',
      ref: 'VOL',
      tag: 'VOL',
      name: 'VOL (100kA)',
      value: '100k Audio Pot',
      pins: ['C24', 'C26', 'C28'],
      from: 'C24 (Lug 3)',
      to: 'C26 (Wiper) / C28 (Lug 1)',
      net: 'Master Volume',
      notes: 'Lug 3 (CW) at C24, Lug 2 (Wiper) at C26, Lug 1 (CCW) at C28.'
    },
    {
      id: 'J_VOL_GND',
      stage: 5,
      type: 'wire',
      name: 'Vol Lug 1 GND',
      value: 'Black Jumper',
      from: 'A28',
      to: 'TOP_MINUS_28',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Grounds Volume Lug 1 so full counter-clockwise mutes cleanly.'
    },
    {
      id: 'J_OUT',
      stage: 5,
      type: 'wire',
      name: 'Audio OUT Feed',
      value: 'Amber Jumper',
      from: 'B26',
      to: 'HDR_OUT',
      color: '#f59e0b',
      net: 'Pedal Output',
      notes: 'Sends Volume Wiper (Row 26) back to Coppersound OUT header.'
    }
  );

  return parts.map(withPartMeta);
}

function createDSP(sampleRate, getState) {
  const fs2 = sampleRate * 2;
  let hpIn = 0;
  let envShift = 0;
  let lpLoad = 0;
  let lpMod = 0;
  let hpOut = 0;
  const aHpIn = onePoleAlpha(16, fs2);
  const aHpOut = onePoleAlpha(8, fs2);
  const aTamer = onePoleAlpha(1550, fs2);

  function readState() {
    const raw = (typeof getState === 'function' ? getState() : null) || {};
    const knobs = raw.knobs || {};
    return {
      presetId: raw.presetId || 'npn_mpsa13',
      modeId: raw.modeId || 'stock',
      guitarVol: knobs.guitarVol ?? 1.0,
      ledMod: knobs.ledMod ?? 1,
      vol: knobs.volume ?? knobs.vol ?? 0.78
    };
  }

  return {
    getTelemetry() {
      const st = readState();
      return st.ledMod >= 0.5 ? 'D1: 3mm Red LED (1.75V)' : 'D1: 1N4148 Si (0.65V)';
    },
    processSample(x) {
      const st = readState();
      let y = 0;
      const pickupCut =
        st.presetId === 'npn_mpsa13' ? 2800 : st.presetId === 'pnp_ac128' ? 1900 : 2100;
      const aLoad = onePoleAlpha(pickupCut, fs2);
      const gain = st.presetId === 'npn_mpsa13' ? 42 : st.presetId === 'pnp_ac128' ? 19 : 26;
      const useLed = st.ledMod >= 0.5;
      const vPos = useLed ? 1.75 : st.presetId === 'pnp_ac128' ? 0.48 : 0.68;
      const vNeg = st.presetId === 'pnp_ac128' ? 1.15 : 1.55;
      const knee = st.presetId === 'pnp_ac128' ? 0.55 : 1.0;

      for (let os = 0; os < 2; os++) {
        const xin = x * st.guitarVol;
        lpLoad += aLoad * (xin - lpLoad);
        const ac = lpLoad - hpIn;
        hpIn += aHpIn * (lpLoad - hpIn);
        if (ac > 0.08) envShift += 0.004 * (ac - envShift);
        else envShift *= 0.9992;

        const u = (ac - 0.28 * envShift) * gain;
        let v =
          u >= 0
            ? -vPos * Math.tanh((u * knee) / vPos)
            : -vNeg * Math.tanh((u * 0.72 * knee) / vNeg);

        if (st.modeId === 'treble_cut') {
          lpMod += aTamer * (v - lpMod);
          v = lpMod;
        } else if (st.modeId === 'hard_clip') {
          v = 0.62 * Math.tanh((v * 1.45) / 0.62);
        }

        const outAc = v - hpOut;
        hpOut += aHpOut * (v - hpOut);
        y = outAc;
      }
      const volTaper = Math.pow(st.vol, 1.6);
      return Math.tanh(y * volTaper * 0.82) * 0.85;
    }
  };
}

export const stageDescriptor = {
  slug: '1',
  stageNumber: 'Stage 1',
  title: 'Single-Transistor Bass Fuzz (Bazz Fuss)',
  subtitle: 'Collector-feedback Darlington or negative-ground PNP fuzz with 470nF sub-bass coupling',
  previousStageSlug: null,
  phaseDegrees: 180,
  summary:
    'Wire the Row 1 to 4 9V RC hum filter, AC-couple your passive bass with 470nF box film capacitors, and self-bias one transistor with a collector-to-base diode.',
  defaultPresetId: 'npn_mpsa13',
  defaultModeId: 'stock',
  presets: PRESETS,
  modes: MODES,
  buildComponents,
  audioSpec: {
    defaultRiffId: 'groove',
    hint:
      'Toggle D1 between 1N4148 Silicon (0.65V) and 3mm Red LED (1.75V) while rolling back Bass Pickup Vol to hear high-headroom passive cleanup.',
    knobs: [
      {
        id: 'guitarVol',
        label: 'Bass Pickup Vol',
        min: 0.12,
        max: 1.0,
        step: 0.01,
        val: 1.0,
        fmt: 'pct'
      },
      {
        id: 'ledMod',
        label: 'D1 Feedback Diode',
        min: 0,
        max: 1,
        step: 1,
        val: 1,
        fmt: 'ledToggle'
      },
      {
        id: 'volume',
        label: 'Output Vol (100kA)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.78,
        fmt: 'pct'
      }
    ],
    createDSP
  },
  theoryNotes: [
    {
      title: 'Why 470nF coupling caps matter on bass',
      body:
        'Into a 100k load, 470nF sets the -3 dB high-pass corner at 3.4 Hz (fc = 1 / (2 * pi * R * C)), keeping 30.87 Hz B0 and 41.2 Hz E1 fundamentals tight and unattenuated.'
    },
    {
      title: 'Collector-to-base diode self-biasing and asymmetric crunch',
      body:
        'D1 locks idle Collector voltage one forward diode drop above Vbe while asymmetrically soft-clipping positive input swings, generating warm second-harmonic octave overtones.'
    },
    {
      title: 'Negative-ground PNP wiring on Coppersound boards',
      body:
        'Because onboard audio jack sleeves share continuity with GND, PNP transistors (2N3906, AC128) flip Emitter to the filtered +9V rail and R1 to GND so standard center-negative supplies stay safe.'
    }
  ]
};
