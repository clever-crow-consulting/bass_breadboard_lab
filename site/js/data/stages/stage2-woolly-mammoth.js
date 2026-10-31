import { onePoleAlpha } from '../../riffs.js';

const PRESETS = {
  npn_passive: {
    id: 'npn_passive',
    label: 'NPN Passive Bass (2x 2N3904)',
    badge: 'Classic',
    isPNP: false,
    useActivePad: false,
    qName: '2N3904 (NPN)',
    qPinout:
      'TO-92 flat face toward you, left-to-right: E-B-C. Q1 at C12/C14/C16, Q2 at C18/C20/C22.',
    probePoints: ['B12', 'B14', 'B16', 'B18', 'B20', 'B22'],
    bannerTitle: 'Classic 2x 2N3904 Silicon Mode (Passive P/J Bass)',
    bannerText:
      'Direct-couples Q1 Collector (Row 16) into Q2 Base (Row 20) with a 100k DC feedback loop (D18 to A14). Turning Pinch clockwise bleeds Q1 base current toward GND through R_PINCH_STOP (15k), shifting Q2 Collector from +7.1V through +4.4V into narrow pulse-width Velcro gating.',
    voltages: [
      { pin: 'Q1 Base (B14)', val: '+0.65V', net: '1 Vbe above GND' },
      { pin: 'Q1 Col / Q2 Base (B16)', val: '+1.5V open / +2.8V mid', net: 'Rises as Pinch turns up' },
      { pin: 'Q2 Emitter (B18)', val: '+0.86V open / +2.1V mid', net: 'Supplies 100k R_FB bias' },
      { pin: 'Q2 Collector (B22)', val: '+7.1V open / +4.4V mid', net: 'Drops to ~3.8V at max gate' }
    ],
    voltageNote:
      'At full Pinch (clockwise), Q2 Collector settles near +3.8V so note tails cut off abruptly with zero hum between notes.'
  },
  npn_active: {
    id: 'npn_active',
    label: 'NPN Active Bass (47k Input Pad)',
    badge: 'Mastotron Fix',
    isPNP: false,
    useActivePad: true,
    qName: '2N3904 (NPN)',
    qPinout:
      'TO-92 flat face toward you, left-to-right: E-B-C. Adds R_PAD (47k) between Row 5 and Row 7.',
    probePoints: ['B12', 'B14', 'B16', 'B18', 'B20', 'B22'],
    bannerTitle: 'Active Bass "Relax" Input Pad Mode (Mastotron Mod)',
    bannerText:
      'Stock Fuzz Face and Woolly Mammoth circuits interact directly with passive pickup impedance, so low-impedance active 9V/18V bass preamps can overwhelm Q1 and defeat the Pinch gate. Inserting R_PAD (47k) between Row 5 and Row 7 simulates passive pickup impedance so Pinch tracks cleanly.',
    voltages: [
      { pin: 'Q1 Base (B14)', val: '+0.65V', net: 'Unchanged DC bias' },
      { pin: 'Q1 Col / Q2 Base (B16)', val: '+1.5V open / +2.8V mid', net: 'Direct coupled' },
      { pin: 'Q2 Emitter (B18)', val: '+0.86V open / +2.1V mid', net: 'DC feedback source' },
      { pin: 'Q2 Collector (B22)', val: '+7.1V open / +4.4V mid', net: 'Clean active-bass gating' }
    ],
    voltageNote:
      'Try 22k to 100k for R_PAD depending on how hot your onboard active bass preamp runs.'
  },
  pnp_flip: {
    id: 'pnp_flip',
    label: 'PNP Flip (2x 2N3906)',
    badge: 'Negative-GND PNP',
    isPNP: true,
    useActivePad: false,
    qName: '2N3906 (PNP)',
    qPinout:
      'TO-92 flat face toward you, left-to-right: E-B-C. Emitters tie to +9V, Collector loads tie to GND.',
    probePoints: ['B12', 'B14', 'B16', 'B18', 'B20', 'B22'],
    bannerTitle: 'Negative-Ground PNP Mode (2x 2N3906)',
    bannerText:
      'Uses standard center-negative 9V power by referencing Q1 and Q2 Emitters to the filtered +9V rail and collector loads to GND. Watch C_WOOL (22uF at E18-F18): for PNP, the (+) leg goes in F18 (+9V side) and (-) leg in E18 (Q2 Emitter).',
    voltages: [
      { pin: 'Q1 Base (B14)', val: '+8.25V', net: '1 Veb below +8.9V rail' },
      { pin: 'Q1 Col / Q2 Base (B16)', val: '+7.4V open / +6.1V mid', net: 'Drops as Pinch turns up' },
      { pin: 'Q2 Emitter (B18)', val: '+8.05V open / +6.8V mid', net: '2.2k R_E2 to +9V rail' },
      { pin: 'Q2 Collector (B22)', val: '+1.8V open / +4.5V mid', net: '4.7k R_C2 to GND rail' }
    ],
    voltageNote:
      'Keep the Row 2 RC hum filter (100 ohm + 100uF) in place because PNP emitters sit directly on the +9V rail.'
  }
};

const MODES = {
  max_wool: {
    id: 'max_wool',
    label: 'Max Wool (100 ohm)',
    rVal: '100 ohm',
    desc: 'Maximum AC emitter bypass gain for massive synth-wall sustain.'
  },
  tamed_wool: {
    id: 'tamed_wool',
    label: 'Vintage Wool (1k)',
    rVal: '1k ohm',
    desc: 'Lowers Q2 AC gain by ~14 dB for tighter, touch-sensitive bass grit.'
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
    (typeof presetInput === 'string'
      ? Object.hasOwn(PRESETS, presetInput)
        ? PRESETS[presetInput]
        : null
      : presetInput) || PRESETS.npn_passive;
  const woolMode =
    (typeof modeInput === 'string'
      ? Object.hasOwn(MODES, modeInput)
        ? MODES[modeInput]
        : null
      : modeInput) || MODES.max_wool;
  const pnp = preset.isPNP;

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
      notes: 'Carries over unchanged from Stage 1.'
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
      notes: 'Powers bottom ground bus for Pinch, Tilt EQ, and Volume pots.'
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
      net: 'Filtered +9V',
      notes: 'Links filtered +9V to bottom positive bus.'
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
      notes: 'Carries over unchanged from Stage 1.'
    },
    {
      id: 'R_PWR',
      stage: 1,
      type: 'resistor',
      name: 'R_PWR',
      value: '100 ohm',
      from: 'A2',
      to: 'TOP_PLUS_2',
      net: 'RC Hum Filter',
      notes: 'Carries over unchanged from Stage 1.'
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
      net: 'RC Hum Filter',
      notes: 'Long (+) lead in Top Red (+), stripe (-) lead in Top Blue (-).'
    }
  ];

  if (preset.useActivePad) {
    parts.push(
      {
        id: 'J_IN',
        stage: 2,
        type: 'wire',
        name: 'Audio IN Feed',
        value: 'Green Jumper',
        from: 'HDR_IN',
        to: 'B5',
        color: '#22c55e',
        net: 'Active Bass Input',
        notes: 'Lands at Row 5 ahead of the 47k Mastotron-style input pad.'
      },
      {
        id: 'R_PAD',
        stage: 2,
        type: 'resistor',
        name: 'R_PAD (Relax)',
        value: '47k ohm',
        from: 'D5',
        to: 'B7',
        net: 'Impedance Pad',
        notes: 'Simulates passive pickup source impedance so active basses gate cleanly with Pinch.'
      }
    );
  } else {
    parts.push({
      id: 'J_IN',
      stage: 2,
      type: 'wire',
      name: 'Audio IN Feed',
      value: 'Green Jumper',
      from: 'HDR_IN',
      to: 'B7',
      color: '#22c55e',
      net: 'Passive Bass Input',
      notes: 'Direct input into Row 7 for passive P-Bass or J-Bass pickups.'
    });
  }

  parts.push(
    {
      id: 'R_PD',
      stage: 2,
      type: 'resistor',
      name: 'R_PD',
      value: '1M ohm',
      from: 'A7',
      to: 'TOP_MINUS_7',
      net: 'Input Anti-Pop',
      notes: 'Prevents bypass footswitch pop.'
    },
    {
      id: 'C1',
      stage: 2,
      type: 'filmcap',
      name: 'C1 (Bass In)',
      value: '470nF Film',
      from: 'D7',
      to: 'D9',
      color: '#38bdf8',
      net: 'AC Bass Coupling',
      notes: '220nF or 470nF 5mm box cap preserves full 31 Hz low-B weight.'
    },
    {
      id: 'J_BASE1',
      stage: 2,
      type: 'wire',
      name: 'Q1 Base Feed',
      value: 'Cyan Jumper',
      from: 'E9',
      to: 'E14',
      color: '#06b6d4',
      net: 'Q1 Base Node',
      notes: 'Routes AC-coupled bass signal from Row 9 into Q1 Base (Row 14).'
    },
    {
      id: 'Q1',
      stage: 3,
      type: 'transistor',
      ref: 'Q1',
      tag: 'Q1',
      name: 'Q1',
      value: preset.qName,
      pins: ['C12', 'C14', 'C16'],
      from: 'C12 (E)',
      to: 'C14 (B) / C16 (C)',
      net: 'Stage 1 Inverter (180 deg)',
      notes: preset.qPinout
    },
    {
      id: 'J_E1',
      stage: 3,
      type: 'wire',
      name: 'Q1 Emitter Tie',
      value: pnp ? 'Red Jumper' : 'Black Jumper',
      from: 'A12',
      to: pnp ? 'TOP_PLUS_12' : 'TOP_MINUS_12',
      color: pnp ? '#ef4444' : '#3b82f6',
      net: pnp ? 'Filtered +9V' : 'Ground (0V)',
      notes: pnp ? 'PNP Q1 Emitter ties to +9V.' : 'NPN Q1 Emitter ties to GND.'
    },
    {
      id: 'R_C1',
      stage: 3,
      type: 'resistor',
      name: 'R_C1',
      value: '47k ohm',
      from: 'A16',
      to: pnp ? 'TOP_MINUS_16' : 'TOP_PLUS_16',
      net: 'Q1 Collector Load',
      notes: 'Sets Q1 collector current feeding directly into Q2 Base.'
    },
    {
      id: 'J_PINCH_TAP',
      stage: 3,
      type: 'wire',
      name: 'Pinch Tap',
      value: 'Teal Jumper',
      from: 'D14',
      to: 'F10',
      color: '#14b8a6',
      net: 'Pinch Bias Starve',
      notes: 'Routes Q1 Base across the ravine to Pinch Lug 3 (Row 10 Bottom).'
    },
    {
      id: 'PINCH_POT',
      stage: 3,
      type: 'pot',
      ref: 'PINCH',
      tag: 'PINCH',
      name: 'PINCH (500kB)',
      value: '500k Linear Pot',
      pins: ['G10', 'G12', 'G14'],
      from: 'G10 (Lug 3)',
      to: 'G12 (Wiper) / G14 (Lug 1)',
      net: 'Pulse-Width Synth Gate',
      notes:
        'Lug 3 at G10, Wiper at G12, Lug 1 at G14 (left open as 2-terminal variable resistor).'
    },
    {
      id: 'R_PINCH_STOP',
      stage: 3,
      type: 'resistor',
      name: 'R_PINCH_STOP',
      value: '15k ohm',
      from: 'I12',
      to: pnp ? 'BOT_PLUS_12' : 'BOT_MINUS_12',
      net: 'Minimum Gate Floor',
      notes:
        'Prevents max Pinch from dead-shorting Q1 Base so extreme settings still spit synth notes.'
    },
    {
      id: 'J_COUPLE',
      stage: 4,
      type: 'wire',
      name: 'Q1-to-Q2 Direct',
      value: 'Amber Jumper',
      from: 'D16',
      to: 'D20',
      color: '#f59e0b',
      net: 'Direct Interstage Link',
      notes: 'DC-couples Q1 Collector (Row 16) straight into Q2 Base (Row 20) with zero bass roll-off.'
    },
    {
      id: 'Q2',
      stage: 4,
      type: 'transistor',
      ref: 'Q2',
      tag: 'Q2',
      name: 'Q2',
      value: preset.qName,
      pins: ['C18', 'C20', 'C22'],
      from: 'C18 (E)',
      to: 'C20 (B) / C22 (C)',
      net: 'Stage 2 Inverter (360/0 deg)',
      notes: 'Second 180-degree inversion restores 0-degree phase so dry bass blends reinforce.'
    },
    {
      id: 'R_E2',
      stage: 4,
      type: 'resistor',
      name: 'R_E2',
      value: '2.2k ohm',
      from: 'A18',
      to: pnp ? 'TOP_PLUS_18' : 'TOP_MINUS_18',
      net: 'Q2 DC Emitter Load',
      notes: 'Establishes stable DC emitter voltage (+0.86V to +2.1V in NPN) to bias Q1 via R_FB.'
    },
    {
      id: 'R_FB',
      stage: 4,
      type: 'resistor',
      name: 'R_FB (Feedback)',
      value: '100k ohm',
      from: 'D18',
      to: 'A14',
      net: 'DC Shunt-Series Bias',
      notes:
        'Negative DC feedback from Q2 Emitter (D18) back to Q1 Base (A14) locks bias against temperature shifts.'
    },
    {
      id: 'C_WOOL',
      stage: 4,
      type: 'ecap',
      name: 'C_WOOL',
      value: '22uF Elec',
      from: 'E18',
      to: 'F18',
      plusAt: pnp ? 'F18' : 'E18',
      net: 'AC Fuzz Bypass',
      notes: pnp
        ? 'PNP polarity: (+) lead in F18, (-) stripe lead in E18 across the ravine.'
        : 'NPN polarity: (+) lead in E18 (Q2 Emitter), (-) stripe lead in F18 across the ravine.'
    },
    {
      id: 'R_WOOL',
      stage: 4,
      type: 'resistor',
      name: 'R_WOOL',
      value: woolMode.rVal,
      from: 'H18',
      to: pnp ? 'BOT_PLUS_18' : 'BOT_MINUS_18',
      net: 'AC Gain Floor',
      notes: woolMode.desc
    },
    {
      id: 'R_C2',
      stage: 4,
      type: 'resistor',
      name: 'R_C2',
      value: '4.7k ohm',
      from: 'A22',
      to: pnp ? 'TOP_MINUS_22' : 'TOP_PLUS_22',
      net: 'Q2 Collector Load',
      notes: 'Develops full rail-to-rail squared bass fuzz output at Row 22.'
    },
    {
      id: 'C2',
      stage: 5,
      type: 'filmcap',
      name: 'C2 (Out Block)',
      value: '220nF Film',
      from: 'D22',
      to: 'D24',
      color: '#fb923c',
      net: 'AC Fuzz Out',
      notes: 'Blocks Q2 Collector DC voltage ahead of the passive Tilt EQ.'
    },
    {
      id: 'R_LP',
      stage: 5,
      type: 'resistor',
      name: 'R_LP (Bass Leg)',
      value: '33k ohm',
      from: 'E24',
      to: 'F19',
      net: '219 Hz Bass Low-Pass',
      notes: 'Feeds Row 19 Bottom (EQ Lug 1) and pairs with C_LP (22nF) for massive sub thunder.'
    },
    {
      id: 'C_LP',
      stage: 5,
      type: 'filmcap',
      name: 'C_LP',
      value: '22nF Film',
      from: 'I19',
      to: 'BOT_MINUS_19',
      color: '#38bdf8',
      net: '219 Hz Bass Low-Pass',
      notes: 'Shunts highs to GND on EQ Lug 1 so turning EQ counter-clockwise boosts sub weight.'
    },
    {
      id: 'C_HP',
      stage: 5,
      type: 'filmcap',
      name: 'C_HP (Bite Leg)',
      value: '4.7nF Film',
      from: 'C24',
      to: 'C26',
      color: '#38bdf8',
      net: '1 kHz Treble High-Pass',
      notes: 'Passes upper-mid synth snarl into Row 26 Top.'
    },
    {
      id: 'J_HP',
      stage: 5,
      type: 'wire',
      name: 'EQ Bite Link',
      value: 'Amber Jumper',
      from: 'E26',
      to: 'F23',
      color: '#f59e0b',
      net: '1 kHz Treble High-Pass',
      notes: 'Routes high-passed bite across the ravine into EQ Lug 3 (Row 23 Bottom).'
    },
    {
      id: 'R_HP',
      stage: 5,
      type: 'resistor',
      name: 'R_HP',
      value: '33k ohm',
      from: 'I23',
      to: 'BOT_MINUS_23',
      net: '1 kHz Treble High-Pass',
      notes: 'Sets 1.03 kHz high-pass corner with C_HP on EQ Lug 3.'
    },
    {
      id: 'EQ_POT',
      stage: 5,
      type: 'pot',
      ref: 'EQ',
      tag: 'EQ',
      name: 'EQ (100kB)',
      value: '100k Linear Pot',
      pins: ['G19', 'G21', 'G23'],
      from: 'G19 (Bass)',
      to: 'G21 (Wiper) / G23 (Bite)',
      net: 'Tilt Tone Crossfader',
      notes:
        'Pans smoothly from deep dub sub-bass (G19 CCW) to aggressive synth buzzsaw (G23 CW).'
    },
    {
      id: 'J_EQ_TO_VOL',
      stage: 5,
      type: 'wire',
      name: 'EQ-to-Vol',
      value: 'Amber Jumper',
      from: 'H21',
      to: 'F26',
      color: '#f59e0b',
      net: 'Shaped Fuzz Signal',
      notes: 'Sends EQ Wiper (H21) into Master Volume Lug 3 (F26).'
    },
    {
      id: 'VOL_POT',
      stage: 5,
      type: 'pot',
      ref: 'VOL',
      tag: 'VOL',
      name: 'VOL (100kA)',
      value: '100k Audio Pot',
      pins: ['G26', 'G28', 'G30'],
      from: 'G26 (Lug 3)',
      to: 'G28 (Wiper) / G30 (Lug 1)',
      net: 'Master Output Level',
      notes: 'Lug 3 at G26, Wiper at G28, Lug 1 grounded via I30.'
    },
    {
      id: 'J_VOL_GND',
      stage: 5,
      type: 'wire',
      name: 'Vol Lug 1 GND',
      value: 'Black Jumper',
      from: 'I30',
      to: 'BOT_MINUS_28',
      color: '#3b82f6',
      net: 'Ground (0V)',
      notes: 'Grounds Volume Lug 1 to bottom ground rail.'
    },
    {
      id: 'J_OUT',
      stage: 5,
      type: 'wire',
      name: 'Audio OUT Feed',
      value: 'Amber Jumper',
      from: 'F28',
      to: 'HDR_OUT',
      color: '#f59e0b',
      net: 'Pedal Output',
      notes: 'Routes Volume Wiper (F28) to Coppersound OUT header.'
    }
  );

  return parts.map(withPartMeta);
}

function createDSP(sampleRate, getState) {
  const fs2 = sampleRate * 2;
  let hpIn = 0;
  let env = 0;
  let lpBass = 0;
  let hpTreb = 0;
  let hpOut = 0;
  let lastGate = 1;
  const aHpIn = onePoleAlpha(12, fs2);
  const aBass = onePoleAlpha(220, fs2);
  const aTreb = onePoleAlpha(1025, fs2);
  const aHpOut = onePoleAlpha(10, fs2);

  function readState() {
    const raw = (typeof getState === 'function' ? getState() : null) || {};
    const knobs = raw.knobs || {};
    return {
      presetId: raw.presetId || 'npn_passive',
      modeId: raw.modeId || 'max_wool',
      pinch: knobs.pinch ?? 0.45,
      eq: knobs.eq ?? 0.48,
      vol: knobs.volume ?? knobs.vol ?? 0.78
    };
  }

  return {
    getTelemetry() {
      const st = readState();
      const p = Math.round(st.pinch * 100);
      return p < 8 ? 'Gate: Open Fuzz' : `Pinch ${p}% | Gate ${lastGate > 0.05 ? 'OPEN' : 'MUTED'}`;
    },
    processSample(x) {
      const st = readState();
      let y = 0;
      const pad = st.presetId === 'npn_active' ? 0.55 : 1.0;
      const q2Gain = st.modeId === 'max_wool' ? 20.0 : 5.5;
      const pol = st.presetId === 'pnp_flip' ? -1 : 1;

      for (let os = 0; os < 2; os++) {
        const xin = x * pad;
        const ac = xin - hpIn;
        hpIn += aHpIn * (xin - hpIn);

        const absAc = Math.abs(ac);
        if (absAc > env) env += 0.05 * (absAc - env);
        else env *= 0.9991;

        const pinch = st.pinch;
        const cutoffBias = Math.pow(pinch, 1.55) * 0.16;
        const driveIn = ac * pol;
        let q1Conduct;
        if (pinch < 0.04) {
          q1Conduct = driveIn;
        } else {
          const overPos = Math.max(0, driveIn - cutoffBias);
          const overNeg = Math.min(0, driveIn + cutoffBias * 2.4);
          q1Conduct = overPos * 1.45 + overNeg * 0.65;
        }

        const gateEnv =
          pinch < 0.04
            ? 1.0
            : Math.min(
                1,
                Math.max(0, (env - cutoffBias * 0.65) / Math.max(0.008, cutoffBias * 0.45))
              );
        lastGate = gateEnv;
        const s1 = -Math.tanh(q1Conduct * 12.0) * pol;
        const s2 = -Math.tanh(s1 * q2Gain) * gateEnv;

        lpBass += aBass * (s2 - lpBass);
        const trebHp = s2 - hpTreb;
        hpTreb += aTreb * (s2 - hpTreb);

        const eq = st.eq;
        const tilted = lpBass * (1 - eq) * 1.35 + trebHp * eq * 1.45 + s2 * 0.25;
        const outAc = tilted - hpOut;
        hpOut += aHpOut * (tilted - hpOut);
        y = outAc;
      }
      const volTaper = Math.pow(st.vol, 1.6);
      return Math.tanh(y * volTaper * 0.78) * 0.85;
    }
  };
}

export const stageDescriptor = {
  slug: '2',
  stageNumber: 'Stage 2',
  title: 'Two-Stage Gated Synth Bass Fuzz (Woolly Mammoth)',
  subtitle: 'Direct-coupled two-transistor shunt-series feedback fuzz with PINCH bias gate and Tilt EQ',
  previousStageSlug: '1',
  phaseDegrees: 0,
  summary:
    'Keep Rows 1 to 16 in place, pull D1, direct-couple Q1 Collector into Q2 Base with 100k DC feedback, and wire PINCH, EQ, and VOLUME pots along the bottom strip.',
  defaultPresetId: 'npn_passive',
  defaultModeId: 'max_wool',
  presets: PRESETS,
  modes: MODES,
  buildComponents,
  audioSpec: {
    defaultRiffId: 'groove',
    hint:
      'Select Riff 3 Sub Decay and turn PINCH above 70% to hear bias-starved Velcro gating silence note tails cleanly.',
    knobs: [
      {
        id: 'pinch',
        label: 'PINCH Gate (500kB)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.45,
        fmt: 'pct'
      },
      {
        id: 'eq',
        label: 'Tilt EQ (Sub / Bite)',
        min: 0.0,
        max: 1.0,
        step: 0.01,
        val: 0.48,
        fmt: 'pct'
      },
      {
        id: 'volume',
        label: 'VOLUME (100kA)',
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
      title: 'Why two common-emitter stages restore 0-degree phase',
      body:
        'Each common-emitter transistor stage inverts polarity by 180 degrees. Cascading Q1 into Q2 sums to 360 degrees (0 degrees), so parallel clean bass blends reinforce rather than cancel.'
    },
    {
      title: 'Shunt-series DC feedback and PINCH duty-cycle starvation',
      body:
        'R_FB (100k) feeds Q2 Emitter DC voltage back to Q1 Base for thermal stability, while PINCH bleeds Q1 Base toward GND to narrow waveform duty cycle into gated pulse-width synth fuzz.'
    },
    {
      title: 'Passive 219 Hz / 1 kHz Tilt EQ crossfader',
      body:
        'EQ Lug 1 low-passes sub thunder below 219 Hz (33k + 22nF) while Lug 3 high-passes harmonic bite above 1.03 kHz (4.7nF + 33k), letting one 100kB pot sweep from dub sub to buzzsaw snarl.'
    }
  ]
};
