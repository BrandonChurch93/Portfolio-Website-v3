# Your pieces: the CPU, the reflector and the studio light (src/pieces/cpu/, src/pieces/reflector/, src/pieces/studio-light/)

## What you own this round
Only those three folders. Not src/skills/, not the page, not the stream's route, not src/world/. Stills in shots/pass/smalls/ with the prefix r1-. Report: shots/pass/smalls/r1-report.md.
Their kits are in reference/kits/ (README.md is what all three share, and each has its own). Their agreement is BRIEF.md, Settled, "Skills and About, the first build" and "The first build, as built": read what he ruled about each (the CPU's three ways of coming to life, the studio light throwing the stream, the glow that comes out of it, the reflector).
Alone each is at /lab/piece/<name> (?size=220&label=0&ui=0 draws it at the page's size, a Strike button strikes it). In place: /lab/skills?ui=0 and /lab/whole?ui=0.

## Do not touch
The studio light at three times, which the critic called strongest: keep its form. Each piece's Anchor (where the stream meets it): the page places its host by it. The CPU's setLife and each piece's setStream as contracts. Each piece draws on a clear ground and only when something changed.

## What to make, most important first (each from reference/pass/findings.md, Skills and About, "Can be made now")
1. THE STUDIO LIGHT AND THE REFLECTOR UNDER THE CURSOR. Now: they look almost the same with the cursor far and near, and the studio light's lower barn doors are flat brown boards. "The cursor is a light. It falls on things across the whole site" (his words, Nov 10). Wanted: a tighter, stronger glint that plainly slides on the barrel, the yoke and the doors' edges as the pointer moves, edge light and a bevel on the doors, and light that moves across the reflector's arm and rim. No bloom, no soft spot: a glint on metal. Prove it with real frames of the pointer crossing each (npm run live).
2. THE CPU IN THE FIRST ROW (src/pieces/cpu/shading.ts, art.ts). Now: a broad highlight washes out the lid's etch, and the board's edge that faces the stream is unlit. Wanted: a tighter highlight (or a clear coat over the etch) so the etch is read, and a thin rim of the stream's light on the near edge while the stream is on it (setStream tells it).
3. Anything on these three that fails QUALITY.md's six tests at three times and that you can put right inside their folders without changing their form: say what it was and show it.

## How to look
Before anything: stills of each at the page's size and at three times, with the lamp at three places (--lamp 0.2,0.3 and so on), and real frames of the pointer crossing. Measure npm run perf -- "/lab/skills?ui=0" --scroll 560 before and after.
