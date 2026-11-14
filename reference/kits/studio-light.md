# Kit · the studio light

Read `reference/kits/README.md` first. This is `src/pieces/studio-light/`.

## What it is

- A studio spotlight on a yoke, with barn doors, in the site's bronze and dark metal. It stands up and to the right of Brandon's portrait in About. The stream strikes it, its lens lights, and it throws the stream down and to the left, in behind his shoulder. The warm glow behind him reads as thrown by this light.
- His words: "I noticed that the object looks like studio light. That's actually kind of brilliant."
- The draft drew it as an outline: `reference/studies/46-skills-about-draft-6.jpg`, at the right over his portrait, and `reference/studies/45-his-line-for-the-stream-behind-him.jpg`, where he circled it and drew the line it throws along.

## What is on it

A Fresnel spotlight of the kind used on a film set, at real sizes: a head about 260 mm long and 190 mm across.

- **The head.** A barrel in dark metal with cooling fins or louvres you could count, a rear cap with a focus knob, a hinged door or band at the front in bronze, rivets and screws, a made up type plate.
- **The lens.** A Fresnel lens: concentric stepped rings in thick glass, in a bronze bezel. Unlit it is dark glass that catches the cursor's light on its rings. Lit, the rings glow from the middle out.
- **The barn doors.** Four leaves on a rotating ring at the front, two large and two small, each hinged, in dark metal with worn bronze edges, opened wide. Their inner faces take the lens's light when it is lit.
- **The yoke.** A U of flat bar that holds the head at both sides, with a tilt lock at each side: a knurled knob and a toothed disc.
- **The mount.** It is fixed to the page's own ground, as to a wall, above the head: a plate with screws seen face on, a short arm standing out from it, and a spigot the yoke hangs from. It has to read as carried, with its weight on the mount.
- **A cable** from the rear of the head up to the mount, hanging in a curve, held by a clip.

## How it is seen

- The page's ground is a wall and the visitor looks straight at it. The head stands out from the wall toward the visitor.
- **Its aim on the screen is fixed and exact:** the line from the back of the head through the middle of the lens runs down and to the left at 52 degrees under level. That is the line Brandon drew. Measure it from two projected points and get it within half a degree.
- The lens is turned partly toward the visitor, enough that its lit face is seen as a wide ellipse, about 30 degrees.
- The head, from its rear cap to the tips of the barn doors, is 0.45 of the host's height long. On the page the host is 300 units tall, so the head is about 135 units long. A unit is about a CSS pixel on a 1440 wide screen. The mount is above it and inside the host.
- Narrow field of view, 20 degrees or less.
- It throws a soft shadow on the wall behind it from the cursor's light, which fades before the host's edge.
- It does not turn with the cursor. The cursor's light crosses it.

## The stream in it

- The stream comes to it from the left, running to the right and falling 4 degrees, and strikes the barrel's flank on its upper left side. Export that point as `STUDIO.strike`.
- It leaves from the middle of the lens, along the aim. Export the middle of the lens as `STUDIO.lens`.
- `setStream(on, since)`: at the strike the flank flashes where it is struck, and the lamp inside catches: light shows through the fins and round the rear cap first, then the lens comes up from its middle outward over about a third of a second. Lit, the lens is hot at its middle and flame at its rim, pale only at the very core, with each ring of the Fresnel holding its own line of light. The barn doors' inner faces and the bezel are lit by it.
- It is a lamp, so it breathes a little once lit, as a filament does. Never a flicker, never a loop that can be seen.
- Do not draw the beam. The page draws the light it throws. Keep your glow close to the lens, so the page's light can take over from it without a seam.
- With `on` at 0 the lens is dark glass, and the light is a finished object hanging on the page.

## What to hand back

- `src/pieces/studio-light/index.ts` exporting `createStudioLight` and `STUDIO` (with `strike` and `lens`), and `model.ts`.
- Stills: unlit, lit, at three times zoom on the lens and on a tilt lock, with the cursor's light left and right, at the page's size.
- A filmstrip of the strike.
- The aim as measured, in degrees.
