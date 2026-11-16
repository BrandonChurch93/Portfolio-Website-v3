# Your piece: the desk in Skills (src/pieces/desk/)

## What you own this round
Only src/pieces/desk/ (each thing on it is a part in parts/). Not src/skills/, not the page, not the stream, not src/world/. Stills in shots/pass/desk/ with the prefix r1-. Report: shots/pass/desk/r1-report.md.
Its kit is reference/kits/desk.md (which gives each part a budget). Its agreement is BRIEF.md, Settled, items 27 to 30 of Skills, "Skills and About, the first build" and "The first build, as built": read them, above all item 8 (the desk's shadow across the word on the floor), item 10 (the desk comes out of the dark as the stream nears, and its lights come on one after another from the lamp) and what he said of each thing on the desk.
Alone it is at /lab/piece/desk (?only=<part>, ?lights=0 for the desk before the stream reaches it). In place: /lab/skills?ui=0 and /lab/whole?ui=0 scrolled to it.

## Do not touch
The desk at the page's size, which the critic called strongest. The lights coming on after the strike, one after another, and their order. SKILLS on the floor with the desk's shadow crossing it. And what keeps the desk at the screen's rate, none of which may be undone (CLAUDE.md says so): its two shadow maps drawn only when a light or the headphones move (CAST), the room's two wide lights as part of the reflected room (ROOM), the one pass at the end of its chain (finish), its turns with the small pieces on a fast screen. Measure frame times before and after (npm run perf -- "/lab/skills?ui=0" --scroll 560).

## What to make, most important first (each from reference/pass/findings.md, Skills, "Can be made now")
1. THE FLOOR (FLOOR in index.ts). Now: the lit floor is plainly lighter than the page's ground and ends in a nearly straight edge low in its host. On an iPad it reads as a rounded grey patch. Wanted: the floor fades out radially from under the desk, well inside the host, so its outer level meets the page's ground with no boundary a visitor can find. Keep the legs' shadows, the PC's glow and the cursor's light on it, and the desk's shadow across the word (item 8).
2. BEFORE AND AFTER THE LAMP'S STRIKE (how the desk answers setLights, and the lamp's light on the mat). Now: the desk is already an even mid grey before the strike, and no pool of the lamp's light can be read after it, so the strike barely changes anything. Wanted: before the strike a low, rim lit silhouette, plainly a desk in the dark. At the strike a warm pool from the lamp that comes up over about 150 ms across the tablet, the mat and the timber, before the other lights follow in their order. It still comes "out of the dark" (item 10). The page tells you each light's level: change only how the desk shows them.
3. THE PC'S GLASS EDGES (parts/pc/case.ts). Now: the glass corner and the base edge draw as near white lines, the brightest thing on the PC. Wanted: the edge highlight tinted to the palette's warm pale and a step dimmer.
4. THE KEYBOARD (parts/keyboard.ts). Now: grey keys, a faint copper line, one orange key, and the light under the caps barely reads. Wanted: a steady ember glow under every cap and along the case's lip, and a wider lift near the cursor. Only copper is orange and it is an accent.
5. THE MAT (parts/mat.ts). Now: one flat matte grey plane. Wanted: a cloth sheen that slides with the cursor and the lamp's pool, and darker contact shadows under the keyboard, the mouse and the tablet. Do NOT roll its edge: its stitched edge already shimmered once.
6. THE HEADPHONES' BAND. Now: the band's top is lost on the dark. Wanted: a faint rim from the monitor keeps its outline. (How far they swing is the page's, not yours.)

## How to look
Before anything: stills of all six as they are, and real frames (npm run live) of the stream striking the lamp on /lab/skills?ui=0 (CLAUDE.md's Commands has the example). Then at the page's size, at three times, and on an iPad held sideways.
