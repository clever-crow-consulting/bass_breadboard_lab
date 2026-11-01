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
      'Learn how a single transistor amplifies and clips a passive bass signal using collector-to-base diode feedback, and why coupling capacitor values govern sub-bass extension.',
    bassFocus:
      '470nF coupling into a 100k load sets the high-pass corner at 3.4 Hz, keeping 31 Hz low-B and 41 Hz low-E fundamentals full while a higher-threshold red LED widens output headroom.',
    learnings: [
      'RC high-pass cutoff math for preserving sub-bass fundamentals',
      'Collector-to-base diode self-biasing and DC operating point',
      'Asymmetric soft-clipping waveform geometry and second-harmonic warmth',
      'High-impedance passive pickup loading and instrument volume cleanup',
      'Negative-ground PNP polarity inversion on standard 9V pedal supplies'
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
      'Explore how cascading two direct-coupled common-emitter stages multiplies gain into synth-wall square waves, stabilizes DC bias through shunt-series feedback, and gates decaying notes.',
    bassFocus:
      'Two 180-degree transistor inversions sum to 0-degree phase coherence, while variable base bias starvation narrows waveform duty cycle into tight Velcro synth gating.',
    learnings: [
      'Direct-coupled two-transistor cascading and 0-degree phase restoration',
      'Thermal bias stabilization through DC shunt-series feedback',
      'Pulse-width duty-cycle modulation and gated fuzz via bias starvation',
      'Passive low-pass and high-pass tilt EQ crossfading',
      'Series source-impedance padding for active onboard bass preamps'
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
      'Master single-supply op-amp biasing and parallel signal routing so overdriven upper harmonics never bury the clean low-frequency punch of a passive bass.',
    bassFocus:
      'Splits clean sub-bass weight below 225 Hz from soft-clipped harmonic grit above 154 Hz, and contrasts in-phase summing against audible 180-degree phase cancellation at 41 Hz.',
    learnings: [
      'Half-supply +4.5V virtual-ground biasing on a single 9V rail',
      'Non-inverting op-amp gain loops with asymmetric LED and silicon clipping',
      'Parallel dry and wet summing for studio bass articulation',
      'Complementary bi-amp frequency splitting between sub lows and midrange grit',
      'Recognizing and diagnosing 180-degree phase cancellation in parallel blends'
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
      'Discover how unbuffered CMOS logic inverters behave as linear push-pull MOSFET tube stages when biased with negative feedback, paired with an active two-band shelving tone stack.',
    bassFocus:
      'Symmetrical complementary MOSFET saturation emulates pushed bass amp power tubes, while active 80 Hz Bass and 2.2 kHz Treble shelves boost or cut without scooping midrange.',
    learnings: [
      'High-impedance emitter-follower input buffering for passive pickups',
      'Linear self-biasing in unbuffered CMOS inverters versus buffered logic oscillation',
      'Preventing CMOS shoot-through current and parasitic oscillation on unused gates',
      'Active James/Baxandall two-band feedback shelving tone stack'
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
      'Study envelope detection and optoelectronics by turning pluck amplitude into LED brightness to sweep a resonant band-pass filter across vocal funk formants.',
    bassFocus:
      'Harder fingerstyle or thumb-slap attacks drive the photoresistor lower in resistance to sweep resonant peaks upward while a parallel dry mix anchors low fundamentals.',
    learnings: [
      'Optoelectronic resistance control using coupled LED and CdS photoresistor cells',
      'Half-wave peak envelope rectification and RC attack-release time constants',
      'Constant-gain Multiple-Feedback resonant band-pass Q peaking',
      'Parallel dry sub-bass blending beneath high-Q resonant filter sweeps'
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
      'Repurpose the same optical envelope sidechain into a studio feedback gain cell, seeing firsthand how topology turns an auto-wah circuit into smooth dynamic leveling.',
    bassFocus:
      'Non-inverting feedback gain reduction maintains 0-degree phase coherence while taming slap spikes and lifting quiet ghost notes with zero low-frequency DC thump.',
    learnings: [
      'How circuit topology transforms one optical sidechain from filter to compressor',
      'Feedback versus feedforward optical gain-reduction ratios and knee behavior',
      'Program-dependent CdS photocell release memory on sustained bass notes',
      'AC-coupled shunt legs for thump-free single-supply gain reduction'
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
      'Bridge analog signal conditioning and digital CMOS logic by extracting the pure fundamental pitch to clock flip-flop frequency dividers one and two octaves below.',
    bassFocus:
      'Steep 48 Hz to 106 Hz harmonic pre-filtering and Schmitt trigger hysteresis prevent octave glitching on decaying strings before 225 Hz low-pass filtering rounds square sub-harmonics.',
    learnings: [
      'Overtone stripping and Schmitt trigger hysteresis for glitch-free pitch tracking',
      'CMOS D flip-flop divide-by-2 (-1 octave) and divide-by-4 (-2 octave) clocking',
      'Low-pass harmonic shaping from raw square waves into warm synth sub-bass',
      'AC coupling latched digital CMOS outputs into an analog clean/sub mixer'
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
