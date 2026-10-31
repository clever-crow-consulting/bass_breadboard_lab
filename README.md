# Bass Breadboard Lab

Bass Breadboard Lab is a browser-based electronics workbench for building and auditioning six passive-bass analog pedal stages across seven breadboard planners on a 400-point Coppersound solderless breadboard. It runs entirely from static HTML, CSS, SVG, and ES2022 modules in `site/` with zero runtime dependencies and zero build steps.

## Curriculum stages

- `#/`: Curriculum roadmap, build progress tracker, and passive-pickup impedance and coupling-capacitor reference notes.
- `#/bom`: Consolidated master bill of materials with stage-range filtering, owned-part tracking, and plain-text or Markdown export.
- `#/stage/1`: Stage 1 single-transistor Bazz Fuss bass fuzz.
- `#/stage/2`: Stage 2 Woolly Mammoth two-stage gated bass fuzz with passive Tilt EQ.
- `#/stage/3`: Stage 3 `TL072` parallel clean blend and bi-amp soft-clip drive.
- `#/stage/4`: Stage 4 `CD4049UBE` SVT-style CMOS tube overdrive and active Baxandall EQ.
- `#/stage/5a`: Stage 5A DIY red-LED and `GL5528` optical vactrol bass envelope filter.
- `#/stage/5b`: Stage 5B feedback optical studio bass compressor.
- `#/stage/6`: Stage 6 `CD4013BE` dual flip-flop `-1` and `-2` analog sub-octave synth.

## Local development and verification

Requirements: Node.js 22 and `just`. No package installation is needed.

Start the local static server and open `http://localhost:$PORT` in your browser:

```bash
PORT="8765"
just site-serve "$PORT"
```

Run the static verification gate and automated Node test suites:

```bash
just site-lint
just site-test
just site-check
```

You can also start the server directly with environment variables defined first:

```bash
PORT="8765"
PORT="$PORT" node scripts/serve_local.mjs
```

## Repository conventions

- Worktree structure: keep the primary clone at `bass_breadboard_lab__worktrees/main` and create sibling worktrees named `bass_breadboard_lab__worktrees/<category>__<description>`. Never use `/` in branch names and never use `feat` as a branch prefix.
- Explicit Git staging: check `git status` first and stage named paths with `git add <file1> <file2>`. Never run `git add .`, `git add -A`, or `git add --all`.
- Visual and content rules: dark mode (`html[data-theme="dark"]`) is the default theme with light mode on `html[data-theme="light"]`, never on `:root`. Keep all text at `12px` or above, include zero external runtime URLs in `site/`, and never use emojis, em dashes, or en dashes anywhere in code or docs.

## Deployment

Pushes to `main` run `.github/workflows/pages.yml` on GitHub Actions with Node.js 22. The workflow executes `node scripts/check_site.mjs` and `node --test tests/*.test.mjs` before uploading `./site` and deploying to GitHub Pages.
