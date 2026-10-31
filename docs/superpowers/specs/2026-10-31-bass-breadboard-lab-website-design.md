# Bass breadboard lab website design specification

## Purpose and goals

The Bass Breadboard Lab website turns a seven-planner analog bass guitar pedal curriculum into one cohesive browser workbench. A builder sitting at a 400-point Coppersound solderless breadboard uses the site to order parts, wire each circuit pin by pin, inspect which components stay on the board between stages, track build progress across sessions, and audition each circuit in real time with synthesized passive-bass riffs.

The site runs entirely in the browser with native ES2022 modules, custom CSS design tokens, SVG vector graphics, and the Web Audio API. It requires zero third-party runtime dependencies, zero `node_modules` packages, and zero backend servers. The same static `site/` directory serves locally on `http://localhost:$PORT` during development and deploys directly to GitHub Pages via GitHub Actions.

## Non-goals for version 1

Version 1 excludes multi-pedal Web Audio chaining, live `getUserMedia` USB audio-interface input, user accounts, cloud sync, and custom schematic capture. Each stage models its exact breadboard circuit in isolation so the visual layout, netlist checklist, diff overlay, and `96 kHz` DSP stay one-to-one with physical holes `A1` through `J30`.

## Repository layout and automation

The repository lives at `$HOME/Projects/bass_breadboard_lab__worktrees/main` under the standard multi-worktree layout. Feature work happens in sibling worktrees named with `__` delimiters such as `bass_breadboard_lab__worktrees/ui__workbench-shell`.

```text
bass_breadboard_lab__worktrees/main/
	AGENTS.md
	README.md
	.gitignore
	justfile
	.github/
		workflows/
			pages.yml
	docs/
		superpowers/
			specs/
				2026-10-31-bass-breadboard-lab-website-design.md
			plans/
	scripts/
		check_site.mjs
		serve_local.mjs
	site/
		index.html
		404.html
		css/
			workbench.css
		js/
			app.js
			router.js
			store.js
			breadboard-svg.js
			breadboard-diff.js
			audio-studio.js
			riffs.js
			views/
				home-view.js
				bom-view.js
				stage-view.js
			data/
				curriculum.js
				bom.js
				stages/
					stage1-bazz-fuss.js
					stage2-woolly-mammoth.js
					stage3-tl072-clean-blend.js
					stage4-svt-cmos-drive.js
					stage5a-vactrol-filter.js
					stage5b-optical-compressor.js
					stage6-cd4013-sub-octave.js
	tests/
		netlist-and-diff.test.mjs
		audio-dsp.test.mjs
		store-and-bom.test.mjs
```

The `justfile` uses big-endian recipe names prefixed with `site-` so related commands group together in `just --list`:

- `site-serve`: runs `node scripts/serve_local.mjs` bound to `0.0.0.0` on `$PORT`, defaulting to `8765`, and prints `http://localhost:$PORT`.
- `site-test`: runs `node --test tests/*.test.mjs`.
- `site-lint`: runs `node scripts/check_site.mjs` to enforce zero emojis, valid local ES module imports, zero `:root` theme-token overrides, minimum `12px` font sizes, and valid stage metadata.
- `site-check`: runs `site-lint` followed by `site-test`.

## Routing and navigation architecture

`router.js` reads and updates `window.location.hash` so every link works identically on a local server and under a GitHub Pages repository subpath without server rewrite rules. `site/404.html` redirects stray path requests back to `./index.html`.

Supported routes:

- `#/`: Curriculum home view with stage roadmap cards, completion progress bar, passive-pickup impedance and capacitor-cutoff reference notes, and quick-resume navigation.
- `#/bom`: Interactive master bill of materials with stage-range filtering, owned-part checkboxes, category totals, and one-click plain-text or Markdown clipboard export.
- `#/stage/1`: Stage 1 single-transistor Bazz Fuss bass fuzz.
- `#/stage/2`: Stage 2 Woolly Mammoth two-stage gated synth bass fuzz.
- `#/stage/3`: Stage 3 `TL072` parallel clean blend and bi-amp soft-clip drive.
- `#/stage/4`: Stage 4 `CD4049UBE` SVT-style CMOS tube overdrive and active Baxandall EQ.
- `#/stage/5a`: Stage 5A DIY red-LED plus `GL5528` optical vactrol bass envelope filter.
- `#/stage/5b`: Stage 5B feedback optical studio bass compressor.
- `#/stage/6`: Stage 6 `CD4013BE` dual flip-flop `-1` and `-2` analog sub-octave synth.

Unknown hashes normalize to `#/` without throwing errors. A persistent top workbench bar displays the seven stage pills with completion indicators, links to **Overview** and **Parts BOM**, a live audio stop control when audio is playing, and a dark or light bench theme switch.

## Visual design system

Dark mode is the default theme, styled after an anodized aluminum electronics test bench with high-contrast silkscreen typography and warm amber phosphor and cyan oscilloscope traces.

Design constraints in `site/css/workbench.css`:

- Dark mode sets `html[data-theme="dark"]` by default with `#0b0d10` canvas, `#12161c` surface cards, `#232a34` hairline borders, `#eef2f6` primary text, `#9aa5b4` secondary text, `#f59e0b` amber accent, `#38bdf8` cyan trace accent, and `#22c55e` dry-signal reference green.
- Light mode sets `html[data-theme="light"]` when toggled by the user with `#f6f8fa` canvas, `#ffffff` surface cards, `#d0d7de` borders, `#0f172a` primary text, `#475569` secondary text, `#d97706` amber accent, and `#0284c7` cyan accent.
- No purple accents on dark backgrounds, no glowing neon card borders, no gradient headline text, no background grid meshes, no decorative icons stuffed into cards, and zero emojis anywhere in HTML, CSS, SVG, canvas, or documentation.
- Minimum font size is `12px` across all HTML controls and SVG breadboard labels. Typography pairs clean geometric UI text with monospace pin coordinates `A1` through `J30`, component values such as `470nF` and `100kA`, and live audio telemetry such as `GR -10.4 dB` and `Peak 770 Hz`.

## Module interfaces and data contracts

### Stage data contract

Each stage module in `site/js/data/stages/` exports a plain immutable descriptor object with pure functions so Node tests import it without a DOM:

```js
export const stageDescriptor = {
	slug: '2',
	stageNumber: 'Stage 2',
	title: 'Woolly Mammoth Two-Stage Gated Bass Fuzz',
	previousStageSlug: '1',
	phaseDegrees: 0,
	summary: 'Two-stage direct-coupled NPN or PNP fuzz with PINCH bias-starvation gating and passive Tilt EQ.',
	defaultPresetId: 'npn_std',
	defaultModeId: 'max_wool',
	presets: {
		npn_std: { id: 'npn_std', label: '2x 2N3904 Passive Bass' }
	},
	modes: {
		max_wool: { id: 'max_wool', label: 'Max Wool 22uF' }
	},
	buildComponents(preset, mode) {
		return [];
	},
	audioSpec: {
		defaultRiffId: 'groove',
		hint: 'Select Riff 3 Sub Decay and turn PINCH above 70% to hear bias-starved Velcro gating.',
		knobs: [
			{ id: 'pinch', label: 'PINCH Gate 500kB', min: 0, max: 1, step: 0.01, val: 0.45, fmt: 'pct' }
		],
		createDSP(sampleRate, getState) {
			return {
				processSample(x) { return x; },
				getTelemetry() { return 'Pinch 45%'; }
			};
		}
	},
	theoryNotes: [
		{ title: 'Why two stages restore non-inverting phase', body: 'Each common-emitter stage inverts by 180 degrees, summing to 360 degrees.' }
	]
};
```

Every part returned by `buildComponents` uses canonical pin identifiers:

- Breadboard holes: `A1` through `E30` and `F1` through `J30`.
- Power bus rails: `RAIL_POS_L:<row>`, `RAIL_GND_L:<row>`, `RAIL_POS_R:<row>`, and `RAIL_GND_R:<row>`.
- Coppersound header sockets: `HDR_IN`, `HDR_OUT`, `HDR_9V`, `HDR_GND`, and `HDR_P1_1` through `HDR_P3_3`.

Within any single preset and mode combination, no two component leads occupy the same breadboard hole `A1` through `J30`.

### Stage-to-stage breadboard diff engine

Each stage sets `previousStageSlug` to `null` for Stage 1, `'1'` for Stage 2, `'2'` for Stage 3, `'3'` for Stage 4, `'4'` for Stage 5A, `'5a'` for Stage 5B, and `'5b'` for Stage 6. Comparing the default preset of the previous stage against the active preset and mode of the current stage in `site/js/breadboard-diff.js` classifies components deterministically:

1. **`unchanged`**: The same `id` exists in the previous stage with identical `type`, normalized `value`, and identical ordered `pins`. For example, the Row 1 to 4 `100 ohm` plus `100uF` RC hum filter remains unchanged across all seven stages, and Rows 1 to 15 remain unchanged when moving from Stage 5A to Stage 5B.
2. **`modified`**: The same `id` exists in the previous stage, and either `value` or `pins` changed. The diff entry records `fromPins`, `toPins`, `fromValue`, and `toValue`.
3. **`added`**: The `id` exists in the current stage and does not exist in the previous stage.
4. **`removed`**: The `id` exists in the previous stage and does not exist in the current stage.

When you enable **Diff from previous stage** on `stage-view.js`:

- `breadboard-svg.js` renders `unchanged` parts at `0.28` opacity, highlights `added` parts with an emerald outline, and highlights `modified` parts with an amber outline.
- A companion **Transition checklist** panel lists `removed` parts to pull out first, `modified` parts to relocate or swap second, and `added` parts to insert third, preventing accidental hole collisions on the physical breadboard.

### Shared SVG breadboard renderer

`site/js/breadboard-svg.js` draws the 400-point half-size breadboard across `30` rows, columns `A` through `E` and `F` through `J`, left and right `+9V` and `GND` rails, the top Coppersound audio and power header block, and the bottom potentiometer strip. It renders axial resistors, `5mm` box film capacitors, radial electrolytics, diodes, LEDs, `TO-92` transistors, `DIP-8`, `DIP-14`, and `DIP-16` ICs, DIY heat-shrink optical vactrols, and color-coded jumper wires.

Clicking or hovering any component or breadboard row highlights all electrically connected tie-points on that 5-hole strip plus connected rail jumpers, and updates the pin-and-role inspector card.

### Single-instance Web Audio studio

`site/js/riffs.js` synthesizes four loopable passive-bass recordings named `groove`, `slap`, `sustain`, and `upperSynth`, plus a one-shot `singlePluck` at `41.2 Hz` low E1, using fractional-delay Karplus-Strong string synthesis, split-coil pickup comb filtering, and a `2.3 kHz` resonant LC pickup filter.

`site/js/audio-studio.js` manages one singleton `AudioContext` for the lifetime of the browser tab:

- Lazy initialization creates `AudioContext` on the first user gesture, pre-computes the riff `Float32Array` buffers once at `ctx.sampleRate`, connects a zero-offset `ConstantSourceNode` keep-alive into `ScriptProcessorNode(1024, 1, 1)` into a master `GainNode`, and retains strong node references so browser garbage collection never silences playback.
- Switching presets, modes, or stage routes swaps the active `dsp` processor reference atomically and applies a `12 ms` gain crossfade to prevent clicks.
- Navigating away from a stage route to `#/` or `#/bom`, clicking **Stop Audio**, hiding the tab via `visibilitychange`, or unloading via `pagehide` stops playback immediately and cancels the `requestAnimationFrame` scope loop.
- The dual-trace `<canvas>` oscilloscope triggers on a rising zero crossing of the dry passive-bass buffer so the green dry reference wave and amber or cyan pedal output wave remain phase-locked while you adjust knobs.

### Persistent state store

`site/js/store.js` reads and writes one versioned key `bass_breadboard_lab:v1` in `localStorage`:

```json
{
	"version": 1,
	"theme": "dark",
	"preferredRiffId": "groove",
	"bomOwnedIds": ["semi_mpsa13", "cap_470nf"],
	"stagePartChecks": {
		"1": ["R_HUM", "C_HUM", "C1"]
	},
	"completedStages": ["1"]
}
```

Error handling in `store.js`:

- If `localStorage.getItem` returns malformed JSON or an unknown `version`, `store.js` resets cleanly to default state without throwing.
- If `localStorage` access throws `SecurityError` or `QuotaExceededError`, `store.js` switches transparently to an in-memory fallback object for the session.
- **Reset stage checks** clears only the active stage entry in `stagePartChecks`, and **Reset all progress** uses an inline two-click confirmation button rather than `window.confirm` while preserving `theme`.

## Verification, testing, and CI deployment

### Automated test suites

1. **`tests/netlist-and-diff.test.mjs`**:
   - Iterates every stage `1`, `2`, `3`, `4`, `5a`, `5b`, and `6` across every preset and mode combination, asserting valid hole coordinates `A1` through `J30`, valid rail and header tokens, and zero duplicate breadboard holes.
   - Verifies `computeBreadboardDiff` invariants: identical stage configs classify every part as `unchanged`. Between Stage 1 and Stage 2, the Row 1 to 4 power filter stays `unchanged` while `D1` is `removed` and `Q2` is `added`. Between Stage 5A and Stage 5B, the vactrol envelope driver in Rows 1 to 15 stays `unchanged` while the optocoupler output pins relocate into Op-Amp A feedback.
2. **`tests/audio-dsp.test.mjs`**:
   - Runs `createPassiveBassRiffs(48000)` and every stage `96 kHz` `2x`-oversampled `createDSP` across `24000` samples, asserting zero `NaN` or `Infinity` values, bounded peak amplitude between `0.05` and `0.99`, Stage 2 `PINCH` gate silence below `0.001` RMS on decaying tails, Stage 3 `180`-degree phase cancellation exceeding `10 dB` fundamental loss at `50%` blend versus `0`-degree alignment, Stage 5B crest-factor compression on `slap`, and Stage 6 `f / 2` and `f / 4` sub-octave division.
3. **`tests/store-and-bom.test.mjs`**:
   - Tests `store.js` persistence, corrupt-JSON recovery, quota-throw fallback, BOM stage-range filtering, and plain-text and Markdown shopping-list export formatting.

### Static gate

`node scripts/check_site.mjs` scans every tracked text file in the repository and fails with exit code `1` if any file contains:

- Any Unicode emoji character.
- Broken relative `import` specifiers across `site/js/**/*.js`.
- External CDN runtime URLs inside `site/` that could fail offline or violate strict CSP.

### GitHub Pages CI

On push to `main` and manual `workflow_dispatch`, `.github/workflows/pages.yml` runs on `ubuntu-latest` with Node 22:

1. Runs `node scripts/check_site.mjs`.
2. Runs `node --test tests/*.test.mjs`.
3. Uploads `site/` via `actions/upload-pages-artifact@v3` and deploys with `actions/deploy-pages@v4`.
