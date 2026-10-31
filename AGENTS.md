# Agent guidelines for Bass Breadboard Lab

Bass Breadboard Lab is a standalone zero-dependency static web workbench for a six-stage, seven-planner passive-bass analog effects curriculum on a 400-point Coppersound solderless breadboard. The application runs directly from `site/` with native ES2022 modules, inline SVG, custom CSS tokens, and the Web Audio API.

## Worktree layout and branch naming

The repository uses the multi-worktree layout rooted at `$HOME/Projects/bass_breadboard_lab__worktrees/`:

- Primary clone: `bass_breadboard_lab__worktrees/main` holds `.git/` and tracks `main`.
- Linked worktrees: sibling directories follow `bass_breadboard_lab__worktrees/<category>__<description>` such as `bass_breadboard_lab__worktrees/site__workbench-v1`.
- Branch naming: use `__` as the delimiter, for example `site__workbench-v1` or `audio__dsp-tuning`. Never put `/` in branch names and never use `feat` as a branch prefix.

Create a new worktree from `main` with explicit variables defined first:

```bash
MAIN_DIR="$HOME/Projects/bass_breadboard_lab__worktrees/main"
BRANCH_NAME="ui__breadboard-inspector"
WORKTREE_DIR="$HOME/Projects/bass_breadboard_lab__worktrees/$BRANCH_NAME"
git -C "$MAIN_DIR" worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" main
```

## Task runner and shell conventions

Run `just --list` to inspect available recipes. All recipes use big-endian `site-` prefixes:

- `just site-serve`: serves `site/` locally on `0.0.0.0` at `$PORT` (defaults to `8765`) and prints `http://localhost:$PORT`.
- `just site-lint`: runs `node scripts/check_site.mjs` across tracked text files and `site/js/` module imports.
- `just site-test`: runs `node --test tests/*.test.mjs`.
- `just site-check`: runs `site-lint` followed by `site-test`. Run this gate before every commit.

In shell commands and documentation examples, always define environment variables before referencing them:

```bash
PORT="8765"
just site-serve "$PORT"
```

To invoke the local static server directly:

```bash
HOST="0.0.0.0"
PORT="8765"
HOST="$HOST" PORT="$PORT" node scripts/serve_local.mjs
```

Debian Node 22 note: Debian's `/usr/bin/node` omits `internal/deps/brace-expansion`, which breaks `node --test` in non-interactive shells. The `justfile` prepends `$HOME/.nvm/versions/node/v22.16.0/bin` automatically when present. If you invoke `node --test` directly outside `just` in a non-interactive shell, prepend the upstream `nvm` binary path first:

```bash
NVM_BIN="$HOME/.nvm/versions/node/v22.16.0/bin"
PATH="$NVM_BIN:$PATH" node --test tests/check-site.test.mjs
```

## Static site and UI guardrails

`scripts/check_site.mjs` enforces repository invariants in CI and local checks:

1. Zero dependencies: do not add `node_modules`, third-party runtime packages, or external `http://` or `https://` runtime URLs inside `site/`. Only W3C XML and SVG namespace URIs (`http://www.w3.org/2000/svg` and `http://www.w3.org/1999/xhtml`) are allowed.
2. Zero emojis: never place Unicode emojis anywhere in HTML, CSS, SVG, canvas text, JavaScript, tests, Markdown documentation, or commit messages.
3. Dark mode default: set `html[data-theme="dark"]` by default and `html[data-theme="light"]` when toggled. Never define theme color tokens on `:root`.
4. Readable typography: keep every CSS `font-size`, SVG `font-size` attribute, and canvas font declaration at `12px` or larger. Avoid purple accents on dark surfaces, neon glow borders, gradient headlines, and background grid meshes.
5. Writing style: use straight quotes, sentence-case headings, and active voice. Do not use em dashes or en dashes in prose or UI strings.

## Git staging and commit discipline

Always inspect `git status` before staging files and stage explicit file paths only:

```bash
git status
git add scripts/check_site.mjs tests/check-site.test.mjs
git commit -m "Tighten CSS root selector check in static site gate"
```

Never run `git add .`, `git add -A`, or `git add --all`, and never commit `.env` files, credentials, or `.superpowers/` scratch artifacts.
