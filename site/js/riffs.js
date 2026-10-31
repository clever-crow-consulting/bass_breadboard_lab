export const RIFF_CATALOG = [
  {
    id: 'groove',
    label: 'Riff 1: Finger Groove',
    shortLabel: '1. P-Bass Groove',
    description: 'Precision Bass fingerstyle pocket from 41.2 Hz E1 up to 82.4 Hz E2.'
  },
  {
    id: 'slap',
    label: 'Riff 2: Slap & Pop',
    shortLabel: '2. Funk Slap & Pop',
    description: 'High-transient thumb slaps and octave pops for envelope and limiter testing.'
  },
  {
    id: 'sustain',
    label: 'Riff 3: Sub Decay (41/31 Hz)',
    shortLabel: '3. Sub Decay (41/31Hz)',
    description: 'Long natural-decay E1 (41.2 Hz) and 5-string B0 (30.87 Hz) sustain tails.'
  },
  {
    id: 'upperSynth',
    label: 'Riff 4: High-Fret Synth',
    shortLabel: '4. High-Fret Synth',
    description: 'Upper-register A2 to G3 riff built for octave tracking and synth filter sweeps.'
  }
];

export function onePoleAlpha(fc, fs) {
  return 1 - Math.exp((-2 * Math.PI * fc) / fs);
}

export function createPassiveBassRiffs(sampleRate) {
  function synthNote(freq, durSec, vel, style, naturalDecay) {
    const len = Math.floor(durSec * sampleRate);
    const out = new Float32Array(len);
    const period = sampleRate / freq;
    const maxDelay = Math.ceil(period) + 8;
    const buf = new Float32Array(maxDelay);

    const beta = style === 'pop' ? 0.13 : style === 'slap' ? 0.27 : 0.21;
    const N = Math.max(8, Math.floor(period));
    const peakIdx = Math.max(1, Math.floor(beta * N));

    let seed = (Math.floor(freq * 100) * 2654435761) >>> 0;
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed / 4294967296) * 2 - 1;
    }

    let noiseLp = 0;
    const noiseMix = style === 'pop' ? 0.42 : style === 'slap' ? 0.3 : 0.16;
    const noiseCut = style === 'pop' ? 0.55 : style === 'slap' ? 0.38 : 0.2;
    for (let i = 0; i < N; i++) {
      const tri = i <= peakIdx ? i / peakIdx : (N - i) / Math.max(1, N - peakIdx);
      noiseLp += noiseCut * (rand() - noiseLp);
      buf[i] = (tri * 0.85 + noiseLp * noiseMix) * vel;
    }
    let mean = 0;
    for (let i = 0; i < N; i++) mean += buf[i];
    mean /= N;
    for (let i = 0; i < N; i++) buf[i] -= mean;

    let writeIdx = N % maxDelay;
    let lpState = 0;
    const damp = style === 'pop' ? 0.14 : style === 'slap' ? 0.2 : 0.3;
    const muteStart = Math.floor(len * (naturalDecay ? 0.94 : 0.86));
    const sustainFb = naturalDecay ? Math.pow(0.015, 1 / (durSec * freq * 0.92)) : 0.9983;

    const w0 = (2 * Math.PI * (style === 'pop' ? 2900 : 2300)) / sampleRate;
    const cosw = Math.cos(w0);
    const sinw = Math.sin(w0);
    const alphaQ = sinw / (2 * 1.4);
    const b0 = (1 - cosw) * 0.5;
    const b1 = 1 - cosw;
    const b2 = (1 - cosw) * 0.5;
    const a0 = 1 + alphaQ;
    const a1 = -2 * cosw;
    const a2 = 1 - alphaQ;
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;

    for (let n = 0; n < len; n++) {
      const pitchBend =
        1 + (style === 'finger' ? 0.0025 : 0.005) * Math.exp(-n / (0.028 * sampleRate));
      const curPeriod = sampleRate / (freq * pitchBend);
      const readPos = writeIdx - curPeriod;
      const rWrap =
        readPos < 0 ? readPos + maxDelay * Math.ceil(-readPos / maxDelay) : readPos;
      const idx0 = Math.floor(rWrap) % maxDelay;
      const frac = rWrap - Math.floor(rWrap);
      const idx1 = (idx0 + 1) % maxDelay;
      const delayed = buf[idx0] * (1 - frac) + buf[idx1] * frac;

      lpState = (1 - damp) * delayed + damp * lpState;
      const fb = n > muteStart ? 0.962 : sustainFb;
      buf[writeIdx] = lpState * fb;

      const puOffset = Math.max(2, Math.floor(curPeriod * 0.19));
      const puIdx = (writeIdx - puOffset + maxDelay) % maxDelay;
      let raw = buf[writeIdx] - 0.58 * buf[puIdx];

      const t = n / sampleRate;
      if (t < 0.012) {
        if (style === 'slap') {
          raw += Math.sin(2 * Math.PI * 155 * t) * Math.exp(-t * 320) * vel * 0.45;
          raw += Math.sin(2 * Math.PI * 1850 * t) * Math.exp(-t * 550) * vel * 0.28;
        } else if (style === 'pop') {
          raw += Math.sin(2 * Math.PI * 2450 * t) * Math.exp(-t * 480) * vel * 0.42;
        } else {
          raw += Math.sin(2 * Math.PI * 130 * t) * Math.exp(-t * 380) * vel * 0.22;
        }
      }

      const yn = (b0 * raw + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1;
      x1 = raw;
      y2 = y1;
      y1 = yn;
      out[n] = yn;
      writeIdx = (writeIdx + 1) % maxDelay;
    }
    return out;
  }

  function renderSequence(events, totalSec, targetPeak, naturalDecay) {
    const buf = new Float32Array(Math.floor(totalSec * sampleRate));
    for (const ev of events) {
      const note = synthNote(ev.f, ev.d, ev.v, ev.s, Boolean(naturalDecay));
      const start = Math.floor(ev.t * sampleRate);
      for (let i = 0; i < note.length && start + i < buf.length; i++) {
        buf[start + i] += note[i];
      }
    }
    let pk = 1e-6;
    for (let i = 0; i < buf.length; i++) {
      const a = Math.abs(buf[i]);
      if (a > pk) pk = a;
    }
    const scale = targetPeak / pk;
    for (let i = 0; i < buf.length; i++) buf[i] *= scale;
    return buf;
  }

  return {
    groove: renderSequence(
      [
        { t: 0.0, f: 41.2, d: 0.46, v: 0.9, s: 'finger' },
        { t: 0.5, f: 41.2, d: 0.22, v: 0.72, s: 'finger' },
        { t: 0.75, f: 49.0, d: 0.22, v: 0.82, s: 'finger' },
        { t: 1.0, f: 55.0, d: 0.45, v: 0.88, s: 'finger' },
        { t: 1.5, f: 58.27, d: 0.22, v: 0.8, s: 'finger' },
        { t: 1.75, f: 61.74, d: 0.45, v: 0.86, s: 'finger' },
        { t: 2.25, f: 82.41, d: 0.22, v: 0.78, s: 'finger' },
        { t: 2.5, f: 73.42, d: 0.35, v: 0.84, s: 'finger' },
        { t: 2.88, f: 61.74, d: 0.32, v: 0.76, s: 'finger' },
        { t: 3.25, f: 41.2, d: 0.72, v: 0.94, s: 'finger' }
      ],
      4.0,
      0.54,
      false
    ),
    slap: renderSequence(
      [
        { t: 0.0, f: 41.2, d: 0.3, v: 0.72, s: 'slap' },
        { t: 0.38, f: 82.41, d: 0.2, v: 1.0, s: 'pop' },
        { t: 0.75, f: 41.2, d: 0.2, v: 0.32, s: 'finger' },
        { t: 1.0, f: 49.0, d: 0.24, v: 0.68, s: 'slap' },
        { t: 1.38, f: 98.0, d: 0.2, v: 0.96, s: 'pop' },
        { t: 1.75, f: 55.0, d: 0.22, v: 0.42, s: 'finger' },
        { t: 2.0, f: 58.27, d: 0.22, v: 0.65, s: 'slap' },
        { t: 2.25, f: 61.74, d: 0.28, v: 0.7, s: 'slap' },
        { t: 2.62, f: 123.47, d: 0.22, v: 1.0, s: 'pop' },
        { t: 3.0, f: 41.2, d: 0.42, v: 0.35, s: 'finger' },
        { t: 3.5, f: 73.42, d: 0.44, v: 0.92, s: 'pop' }
      ],
      4.0,
      0.88,
      false
    ),
    sustain: renderSequence(
      [
        { t: 0.0, f: 41.2, d: 1.92, v: 0.94, s: 'finger' },
        { t: 2.0, f: 30.87, d: 1.92, v: 0.94, s: 'finger' }
      ],
      4.0,
      0.56,
      true
    ),
    upperSynth: renderSequence(
      [
        { t: 0.0, f: 110.0, d: 0.46, v: 0.88, s: 'finger' },
        { t: 0.5, f: 130.81, d: 0.46, v: 0.84, s: 'finger' },
        { t: 1.0, f: 146.83, d: 0.46, v: 0.9, s: 'finger' },
        { t: 1.5, f: 110.0, d: 0.46, v: 0.8, s: 'finger' },
        { t: 2.0, f: 164.81, d: 0.46, v: 0.92, s: 'finger' },
        { t: 2.5, f: 146.83, d: 0.46, v: 0.85, s: 'finger' },
        { t: 3.0, f: 196.0, d: 0.46, v: 0.9, s: 'finger' },
        { t: 3.5, f: 110.0, d: 0.48, v: 0.88, s: 'finger' }
      ],
      4.0,
      0.54,
      false
    ),
    singlePluck: renderSequence(
      [{ t: 0.01, f: 41.2, d: 2.15, v: 0.95, s: 'slap' }],
      2.25,
      0.68,
      true
    )
  };
}
