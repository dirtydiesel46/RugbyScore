# RugbyScore

RugbyScore is a small rugby scoreboard built with HTML, CSS and JavaScript as a Scrimba learning project, with Springbok-inspired green and gold colours.

You will find it deployed via Netlify @ https://rugbyscore.netlify.app/ - enjoy :)

## Features

- Separate Home and Guest scores, starting at zero.
- Add a conversion (+2), penalty goal (+3), try (+5), drop goal (+3), or penalty try (+7).
- For a converted try, click Try and then Conversion: 5 + 2 = 7.
- Responsive layout with a maximum desktop width of 575px.
- Undo the latest scoring action across either team.
- Start a new game, with confirmation before clearing an active game.
- Hover, pressed and keyboard-focus feedback on buttons.
- Digital-style numbers using the Cursed Timer font.
- Scores and undo history survive refresh using browser local storage. If storage is unavailable, scoring still works for the current visit.

## Run locally

Open `index.html` in your browser, or use VS Code’s Live Server extension. No installation or build step is needed.

## Testing & CI

Unit tests use Node.js's built-in test runner (`node:test` and `node:assert`):

```bash
npm test
```

Mutation testing can be run with StrykerJS to verify test suite quality:

```bash
npm run test:mutate
```

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs these tests automatically on pushes and pull requests targeting `main` to serve as merge checks.

## Project files

- `index.html` — scoreboard structure and buttons.
- `index.css` — layout, colours and typography.
- `index.js` — score values, state management, and display updates.
- `test/scoreboard.test.js` — unit tests for scoring rules, validation, undo logic, and storage persistence.
- `.github/workflows/ci.yml` — GitHub Actions automated merge checks workflow.
- `fonts/` — custom font and its accompanying information.

## What I practised

Translating Figma measurements into CSS, using Flexbox, loading a custom font, and keeping score values in JavaScript while updating the HTML display.

## Rugby scoring

A converted try is a try (+5) followed by a successful conversion (+2). A penalty try is worth 7 points with no conversion; its button adds all seven at once. See [World Rugby’s scoring rules](https://passport.world.rugby/laws-of-the-game/laws-by-number/8-scoring).
