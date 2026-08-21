# Contributing

Issues and pull requests are welcome. This is a small, zero-dependency library;
keep changes in that spirit.

## Setup

Node 18 or newer. No install step.

```bash
npm test
npm run playground    # http://localhost:5173
```

## What belongs where

| Path | Role |
| --- | --- |
| `src/` | The library. Must run in the browser, Node, and a worker. No `document`, `window`, or `process`. |
| `src/features/` | One file per facial feature. Pure `(layout, rng) -> shapes`. |
| `src/hand.js` | The only place the hand-drawn look is applied. |
| `src/genome.js` | Gene names. Append only; never reorder. |
| `playground/` | Demo UI. Not shipped on npm. |
| `test/` | `node --test`. No extra test runners. |

A new feature is a new file under `src/features/`, a line in `src/render.js`, and
any new genes appended to `GENES` in `src/genome.js`. Adding a gene in the middle
reshuffles existing faces.

If you add a gene, also add it to exactly one group in `playground/app.js`.

## Pull requests

1. Branch from `main`.
2. Keep the library free of runtime dependencies.
3. Stay inside the size budgets (`npm run size`). Raise a budget in
   `tools/size.js` only when the extra bytes earn it, and say so in the PR.
4. Do not bump `package.json` version. Releases are tagged separately.
5. No em dashes in copy.

### If you change how a face looks

`npm test` cannot see that a nose looks like a hat. After visual changes:

```bash
npm run grid
```

Open `out/grid.html` and look at a hundred faces, not one lucky seed. Include a
before/after note in the PR (a screenshot of the grid is enough).

Pin `inkSeed` when you are judging a single gene, otherwise every slider change
re-inks the whole drawing.

### If you change the public API

`face`, `breed`, `mutate`, `encode`, `decode`, `genomeFromSeed`, and `strokes`
are the contract. Additive changes are fine. Renames and removals need a major
version, so flag them instead of landing them quietly.

Same seed must still produce a byte-identical SVG unless the PR is explicitly
about changing the look.

## Tests

```bash
npm test
npm run size
npm run site
```

CI runs those three. A PR that fails any of them will not merge.

## Reviews

Say what you changed and why. Point at the gene, the feature file, or the test.
Do not paste the whole SVG.

## Releases

Maintainers cut releases. Version in `package.json` must match the git tag
(`v0.1.0` for `0.1.0`). See the Publishing section in [README.md](README.md).
