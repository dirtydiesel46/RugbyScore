# RugbyScore

RugbyScore is a small rugby scoreboard built with HTML, CSS and JavaScript as a Scrimba learning project, with Springbok-inspired green and gold colours.

## Features

- Separate Home and Guest scores, starting at zero.
- Add a conversion (+2), penalty goal (+3), or try (+5) to either team.
- For a converted try, click Try and then Conversion: 5 + 2 = 7.
- Fixed 575 × 385px board with named scoring buttons.
- Digital-style numbers using the Cursed Timer font.
- Scores reset when the page is refreshed.

## Run locally

Open `index.html` in your browser, or use VS Code’s Live Server extension. No installation or build step is needed.

## Project files

- `index.html` — scoreboard structure and buttons.
- `index.css` — layout, colours and typography.
- `index.js` — score values and display updates.
- `fonts/` — custom font and its accompanying information.

## What I practised

Translating Figma measurements into CSS, using Flexbox, loading a custom font, and keeping score values in JavaScript while updating the HTML display.

## Rugby scoring

These buttons cover tries, conversions and penalty goals. A drop goal also earns 3 points, and a penalty try earns 7; neither has a dedicated button in this simple version. See [World Rugby’s scoring rules](https://passport.world.rugby/laws-of-the-game/laws-by-number/8-scoring).
