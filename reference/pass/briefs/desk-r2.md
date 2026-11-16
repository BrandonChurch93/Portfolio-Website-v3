# Your piece: the desk in Skills (src/pieces/desk/). Round 2

## What you own this round
Only src/pieces/desk/. Stills in shots/pass/desk/ with the prefix r2-. Report: shots/pass/desk/r2-report.md. Read first: desk-r1.md (which still holds: what may not be touched, and what keeps the desk at the screen's rate), shots/pass/desk/r1-report.md and its two reviews (r1-report-review-1.md and -2.md, with their stills in shots/pass/desk/rv2/).

## Where it stands
Round 1 scored 6.5 and 6.5, and it BROKE two things. This is a piece Brandon has already seen and built on: it may not be left worse anywhere than it was. So the order of this round is fixed.

## FIRST: put right what broke
1. THE FRONT LEFT LEG'S SHADOW IS GONE. At 1440 wide its foot now stands on the page's black (7, 4, 3), where before it stood on lit floor and threw a shadow. The brief said "Keep the legs' shadows". And the desk's shadow beside the word SKILLS on the floor is flattened: with the cursor in the middle of the screen no shadow crosses the word, where item 8 of his agreement has the desk's shadow lying across it. Bring both back, by shaping the floor's falloff (its reach toward the visitor and to the left), not by lightening the whole pool: under each foot there is lit floor for the foot to shade, and the floor round the word is lit enough for the shadow to read on it.
2. A NEAR WHITE SOFT SPOT ON THE KEYBOARD. In WebKit at an iPad's size (touch, no pointer) a pale soft spot sits on the keyboard's front left corner and spills onto the mat, up to (251, 220, 185): "soft round spots of light" and "any white" both fail on sight. The builder's own r1-pair-sheen.png shows the same halo with the cursor on the keys. Find what makes it (the reviewer suspects TRAIL.reach or GLOW.lip and cut in the keyboard) and remove it. Check it in WebKit yourself: playwright's webkit is installed (see scripts/mem.mjs for how it is opened at an iPad's size).
3. A NEW LIGHT IN EVERY SHADER. The rim light added for the dark desk is a directional light in every material's shader for the whole life of the page. Measure what it costs (npm run perf -- "/lab/skills?ui=0" --scroll 560, and the same with --cpu 4, and with &handheld=1), before and after, against the files as they are in git (git stash is NOT allowed: read the old numbers from r1's report, or measure on the production build served at http://127.0.0.1:5331 with --url, which is the desk as it was). If it costs a frame anywhere, get the rim another way (in the materials that need it only, or from the room).

## THEN: what round 1 left short
4. THE FLOOR still reads as a soft grey oval under the desk, lighter than the page (about 40 against 5), most of all on an iPad: an outline can be traced in real frames. Its level away from the desk comes to within a few levels of the page's ground, and what is lit is what the desk's own lights light: under and just before the desk.
5. BEFORE THE STRIKE the desk is still a readable mid dark desk (the mat mid grey under the cursor's light, the timber's figure showing). It is a silhouette: cut the fill and the cursor's light on it much further, and let a rim from behind pick out the top's back edge, the monitor and the lamp, so that it reads at the page's size as a desk in the dark.
6. THE LAMP'S POOL has a hard arc edge across the timber that runs through the lamp's own base, and barely reaches the mat. A wide soft penumbra, aimed onto the tablet and the mat.
7. THE KEYBOARD UNDER THE CURSOR goes gold orange all over, its lip glows and a bright patch spreads onto the mat. The lift stays on the caps and the plate: copper is an accent.
8. THE MAT is still a flat grey plane at the page's size. Either its sheen is seen to move under the cursor's light at the page's size, and its contact shadows under the keyboard, the mouse and the tablet read there, or say plainly it is not done.

## Check, all of it, before you report
The desk in place on /lab/skills?ui=0 and /lab/whole?ui=0, at 1440, 1920 and an iPad held sideways, in Chromium and in WebKit, with the stream striking the lamp in real frames, and its frame times. Side by side with the desk as it was (http://127.0.0.1:5331 serves it).
