export const STAGE_ROADMAP = [
  {
    slug: '1',
    stageNumber: 'Stage 1',
    shortLabel: 'Bazz Fuss',
    title: 'Single-Transistor Bass Fuzz (Bazz Fuss)',
    topology: 'Collector-feedback single-stage Darlington or PNP fuzz',
    headlinePart: 'MPSA13 / 2N3906',
    phaseDegrees: 180,
    previousStageSlug: null,
    summary:
      'Wire the Row 1 to 4 9V RC hum filter, AC-couple your passive bass with 470nF box film capacitors, and self-bias one transistor with a collector-to-base diode.',
    bassFocus:
      '470nF input and output capacitors into a 100k load set the high-pass cutoff at 3.4 Hz, keeping 31 Hz low B0 and 41 Hz low E1 fundamentals full while a 3mm red LED increases output headroom.',
    learnings: [
      'AC coupling and sub-bass RC high-pass cutoff math',
      'Collector-to-base diode self-biasing',
      'Asymmetric clipping waveform geometry',
      'Passive pickup input loading',
      'Flipping PNP stages onto standard center-negative 9V power'
    ]
  },
  {
    slug: '2',
    stageNumber: 'Stage 2',
    shortLabel: 'Woolly Mammoth',
    title: 'Two-Stage Gated Synth Bass Fuzz (Woolly Mammoth)',
    topology: 'Direct-coupled two-transistor shunt-series feedback fuzz',
    headlinePart: '2x 2N3904',
    phaseDegrees: 0,
    previousStageSlug: '1',
    summary:
      'Keep Rows 1 to 16 in place, pull D1, direct-couple Q1 Collector into Q2 Base with 100k DC feedback, and wire PINCH, EQ, and VOLUME pots along the bottom strip.',
    bassFocus:
      'Two common-emitter stages invert twice (180 + 180 = 360 degrees) to restore non-inverting 0-degree phase, while PINCH starves Q1 bias for Velcro synth gating.',
    learnings: [
      'Two-transistor cascading and non-inverting phase restoration',
      'DC operating-point stabilization via shunt-series feedback',
      'Pulse-width bias starvation via PINCH',
      'Passive low-pass and high-pass tilt EQ',
      '47k input padding for active bass preamps'
    ]
  },
  {
    slug: '3',
    stageNumber: 'Stage 3',
    shortLabel: 'TL072 Clean Blend',
    title: 'Dual Op-Amp Parallel Clean Blend and Bi-Amp Bass Drive',
    topology: 'Single-supply dual JFET op-amp bi-amp crossover and soft clipper',
    headlinePart: 'TL072',
    phaseDegrees: 0,
    previousStageSlug: '2',
    summary:
      'Straddle a TL072 dual JFET op-amp across the center ravine at Rows 13 to 16, build a +4.5V virtual ground at Row 10, and blend 1M buffered clean lows with +30 dB LED and 1N4148 soft clipping.',
    bassFocus:
      'Separates clean sub-bass below 225 Hz from harmonic grit above 154 Hz, and includes a switchable 180-degree phase-trap preset that demonstrates 41 Hz cancellation at noon on BLEND.',
    learnings: [
      'Single-supply +4.5V virtual-ground biasing',
      'Op-amp negative feedback loops and asymmetric diode clipping',
      'Parallel clean and dirty mixing without low-end loss',
      'Bi-amp frequency splitting for sub clarity',
      'Audible 180-degree phase cancellation on bass fundamentals'
    ]
  },
  {
    slug: '4',
    stageNumber: 'Stage 4',
    shortLabel: 'SVT CMOS Drive',
    title: 'SVT-Style CMOS Tube Overdrive and 2-Band Baxandall EQ',
    topology: 'Emitter-follower buffer into unbuffered CMOS inverters and active Baxandall EQ',
    headlinePart: 'CD4049UBE + 2N5088',
    phaseDegrees: 0,
    previousStageSlug: '3',
    summary:
      'Buffer passive pickups at 500k with a 2N5088 emitter follower, cascade unbuffered CD4049UBE CMOS gates for symmetrical tube-like overdrive, and shape tone with an active Gate 3 Baxandall EQ.',
    bassFocus:
      'Active 80 Hz Bass and 2.2 kHz Treble shelving bands boost or cut lows and clank independently without scooping midrange fundamentals.',
    learnings: [
      'CD4049UBE power pinout (+9V on Pin 1 and GND on Pin 8)',
      'Why unbuffered UBE inverters work linearly while buffered BE chips oscillate',
      'Grounding unused CMOS inputs to stop shoot-through current',
      'Active James/Baxandall two-band shelving tone stack'
    ]
  },
  {
    slug: '5a',
    stageNumber: 'Stage 5A',
    shortLabel: 'Optical Filter',
    title: 'Optical Vactrol Bass Envelope Filter Auto-Wah',
    topology: '1M preamp, 1N4148 peak envelope detector, DIY LED/LDR vactrol, and MFB band-pass filter',
    headlinePart: 'TL072 + GL5528',
    phaseDegrees: 180,
    previousStageSlug: '4',
    summary:
      'Sleeve a 3mm red LED facing a GL5528 photoresistor inside black heat-shrink tubing, drive the LED from a 1N4148 envelope rectifier, and sweep a resonant Multiple-Feedback band-pass filter.',
    bassFocus:
      'Playing harder drives the optical vactrol brighter to sweep vocal funk formants upward while a dedicated Dry Sub MIX knob keeps low fundamentals solid.',
    learnings: [
      'DIY heat-shrink LED and GL5528 optical vactrol assembly',
      'Half-wave peak envelope rectification and RC decay constants',
      'Constant-gain Multiple-Feedback resonant band-pass Q peaking',
      'Blending resonant band-pass sweeps with clean sub-bass'
    ]
  },
  {
    slug: '5b',
    stageNumber: 'Stage 5B',
    shortLabel: 'Optical Compressor',
    title: 'Studio Feedback Optical Bass Compressor',
    topology: 'Non-inverting feedback optical gain cell with shared envelope sidechain',
    headlinePart: 'TL072 + GL5528',
    phaseDegrees: 0,
    previousStageSlug: '5a',
    summary:
      'Keep Rows 1 to 15 from Stage 5A untouched and move the vactrol LDR leads across the center ravine into Op-Amp A feedback for LA-2A and Diamond style studio bass compression.',
    bassFocus:
      'Non-inverting feedback gain reduction maintains 0-degree phase coherence and smooths slap transients and uneven string-to-string volume naturally.',
    learnings: [
      'Reusing an optical sidechain across two circuit topologies',
      'Feedback optical gain reduction math',
      'Program-dependent GL5528 photoresistor release behavior',
      'Zero-phase-inversion studio compression for passive bass'
    ]
  },
  {
    slug: '6',
    stageNumber: 'Stage 6',
    shortLabel: 'CD4013 Sub-Octave',
    title: 'Analog Sub-Octave Synth Divider',
    topology: '2N5088 dry buffer, TL072 harmonic low-pass and Schmitt trigger, and CD4013BE flip-flop divider',
    headlinePart: 'CD4013BE + TL072',
    phaseDegrees: 0,
    previousStageSlug: '5b',
    summary:
      'Buffer full-range dry bass with a 2N5088 emitter follower while TL072 Op-Amp A strips upper harmonics and Op-Amp B clocks a CD4013BE CMOS flip-flop for -1 octave (f / 2) and -2 octave (f / 4) sub-bass.',
    bassFocus:
      'Steep 48 Hz to 106 Hz harmonic pre-filtering and Schmitt hysteresis stop octave glitching on decaying bass notes, followed by 225 Hz square-wave smoothing.',
    learnings: [
      'Harmonic pre-filtering and Schmitt trigger hysteresis for clean tracking',
      'CMOS D flip-flop !Q-to-D divide-by-2 and divide-by-4 frequency division',
      '225 Hz sub-bass square-wave low-pass smoothing',
      'Blocking latched CMOS DC levels before the output MIX pot'
    ]
  }
];

export const PASSIVE_PICKUP_PRIMER = [
  {
    id: 'high_z_loading',
    title: 'High-Z Passive Pickup Loading',
    badge: '500k to 1M Input Z',
    body:
      'Passive Precision and Jazz Bass coils have high inductance and source impedance. Keeping input impedance between 500k and 1M prevents resonant treble loss and lets your bass volume knob clean up overdrive smoothly.'
  },
  {
    id: 'sub_bass_coupling',
    title: 'Sub-Bass Coupling Capacitor Cutoff',
    badge: '470nF into 100k = 3.4 Hz',
    body:
      'Guitar circuits often use 10nF to 47nF coupling caps that roll off bass weight. Using 220nF to 470nF box film capacitors into a 100k load places the high-pass cutoff near 3.4 Hz so 31 Hz low B0 and 41 Hz low E1 fundamentals stay tight.'
  },
  {
    id: 'ground_sleeve_polarity',
    title: 'Coppersound Ground-Sleeve Polarity Rule',
    badge: 'Center-Negative 9V Safe',
    body:
      'Breadboard audio jack sleeves share continuity with power ground. Every layout in this lab keeps GND at 0V and +9V on the positive rail, flipping PNP emitter and collector connections rather than inverting ground.'
  },
  {
    id: 'analog_synth_chain',
    title: 'Three-Block Analog Bass Synth Chain',
    badge: 'Stage 6 -> Stage 2 -> Stage 5A',
    body:
      'Finishing all six stages gives you the three building blocks of a classic analog bass synthesizer: Stage 6 CD4013 sub-octave divider feeding Stage 2 Woolly Mammoth gated fuzz into Stage 5A optical envelope filter.'
  }
];
