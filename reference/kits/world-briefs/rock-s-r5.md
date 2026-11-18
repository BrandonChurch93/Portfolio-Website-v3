# Your part: the torn rock round the core, sculpt S. Round 5: finish round 4, whose builder was cut off

## What you own
scripts/world/parts/rock-s/, public/world/rock-s.bin, shown with ?rock=s. src/pieces/world/parts/rock.ts and src/pieces/world/parts/rock/ (the stone and its curve), with the same hard rule: the page without ?rock=s, and the debris, draw exactly what they draw now, proved at the end with a PNG difference. Stills in shots/world/rock-s/ with the prefix s5-. Report: shots/world/rock-s/s5-report.md.
Read first: reference/kits/world-briefs/rock-s.md (Brandon's words and the bar), rock-s-r2.md (the socket) and rock-s-r4.md (sheets, the measured colors, the light's places, the budget, "sound enough to go live": all of round 4's brief still stands and its tables are yours to hit).

## Where it stands
Round 4's builder lost its login after its last make and before it wrote a report, and no reviewer saw it. Its work is whole and is in git as a0c21c6: the files in your folder are its last. Its stills are shots/world/rock-s/s4-*: open s4-final-beside.jpg, s4-final-hollow.png, s4-final-join.png, s4-curve-strips.png, s4-d1-close.jpg and the drafts in order (d1, d2, d3, f1, f2, final) to see where it was going. Round 3 is f054e21 and round 2 is c4ee0b5, for anything it lost. There is no report: read its code (field.mjs, masses.mjs, make.mjs, curve.mjs, fit.mjs, rings.mjs, probe.mjs, stone.ts, curve.ts) and write down in your report what it did, since nobody else will.

## Fable's judgement of round 4 as it was left (picture 9 at the left of s4-final-beside.jpg)
WON: the rock is made of sheets now, and for the first time it has the picture's kind of detail: stacked, leaning, broken along its bedding. The socket and the black frame hold. Keep all of it.
WRONG, in this order:
1. EVERY SURFACE IS A COMB. Each mass is thirty hairline pages at one even spacing, so the hollow reads as corrugated card and the edges of books, and the roof's front is ruled with level lines from end to end. The picture's masses have THREE TO SEVEN sheets you can count, 8 to 25 units thick, and each sheet shows a BROAD, nearly smooth face. Fine pages show only where a sheet is broken across: on its end, and as two or three faint partings on a face. So: a face turned to the viewer or to the ball is one broad sheet's top with the stepped, pointed ends of the sheets under it showing beyond its edge. Only a mass seen edge on is a comb, and even there the lips differ in thickness and reach. Make it so that at the page's size a person counts sheets, and at three times finds the fine pages on the broken ends.
2. IT IS DARK AND BROWN. The lit oval has shrunk and nothing in it is gold. The picture's back wall behind and beside the ball is broad faces at luma 160 to 215, gold to cream, its mids a deep red orange. Open s4-curve-strips.png: if the measured curve is right and the rock still comes out brown, then too little light is reaching the faces (the pages shade each other, and broad faces fix that) or the curve is applied to the wrong amount. Find which, with the numbers, and hit round 4's tables: the rings' lit shares and the luma at the named places.
3. THE FLOOR is still a pale lit ledge under the ball. Round 4's brief says what it is to be.
4. THE ROOF'S FRONT: dark, in chunky broken blocks, with a few thick beds. Not ruled lines.
5. The join at the top left (s4-final-join.png): say whether the skin's grey crust is covered now, and show it.

## Budget
6.5 MB, 600,000 triangles, one draw call, one program, one small texture for the curve.

## How to look
As the first brief has it, judging at the page's size first. The first image of your report is picture 9's hollow at the left and yours at the right, the second the real page with the live rock and with S (npm run shot -- "/lab/hero?ui=0&rock=s" --scroll 700 --t 6 --wait 12000 beside the same without rock=s). Answer harshly: can you count the sheets of a mass? Are the brights gold and the mids red orange? What is the first thing that gives it away as not the picture?
