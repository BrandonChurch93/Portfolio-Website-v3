# Kit · the reflector

Read `reference/kits/README.md` first. This is `src/pieces/reflector/`.

## What it is

- A round reflector on an arm, of the kind that bounces light onto a sitter on a portrait set, made in the site's metals. It stands at the left of the page between Skills and About. The stream comes straight down onto its face and is bounced to the right, across the whole top of About, to the studio light.
- It is the first thing the stream strikes in About. Brandon: "The reflector as the first thing the stream strikes in About is fine as well. I'll have to see it in action."
- The draft drew it as an outline: `reference/studies/46-skills-about-draft-6.jpg`, at the left under the rows of skills.

## What is on it

- **The dish.** A shallow spun dish about 420 mm across, in copper: a rolled rim, fine spinning rings on its face, and a face that is beaten or pebbled so it scatters light and does not mirror it. Its back is dark metal with a bronze boss at the middle. It is the largest and brightest thing in the object.
- **The arm.** An articulated arm from the back of the dish to the mount: two bars with a knuckle between them, each joint a toothed disc with a knurled locking knob or a wing nut, a ball head behind the dish.
- **The mount.** It is fixed to the page's own ground, as to a wall: a plate with screws seen face on, and a socket the arm stands out from. It has to read as carried.
- Fine things to find: slotted screw heads, a made up maker's plate on the mount, knurling, a split ring, a safety chain or a short lanyard from the dish to the arm.

## How it is seen

- The page's ground is a wall and the visitor looks straight at it. The arm stands out from the wall toward the visitor.
- **How the dish faces is fixed.** On the screen its face looks up and to the right: the line square to its face, drawn on the screen, is 43 degrees above level, to the right. That is what turns a stream falling straight down into one running right and falling 4 degrees. It is also turned toward the visitor by about 25 degrees, so its face is seen as an ellipse a little under half as deep as it is wide, and its copper is seen.
- The dish's long way across is 0.4 of the host's height. On the page the host is 260 units tall, so the dish is about 104 units across. A unit is about a CSS pixel on a 1440 wide screen.
- The middle of the dish's face is drawn at the host's middle. The arm and the mount go down and to the left from it, behind the dish, and stay inside the host.
- Narrow field of view, 20 degrees or less.
- It throws a soft shadow on the wall behind it from the cursor's light, which fades before the host's edge.
- It does not turn with the cursor. The cursor's light crosses it, and the dish's face must answer it across its whole width: this is the thing on the page that most shows the light moving.

## The stream in it

- The stream strikes the middle of the dish's face. Export that point as `REFLECTOR.strike`.
- `setStream(on, since)`: at the strike the face flashes at its middle. With the stream on it the face holds a pool of the stream's light, hot at the middle and falling off toward the rim along the spinning rings, and the rim's inner lip catches it. The back of the dish, the arm and the mount take a little of it from that side.
- With `on` at 0 it is a finished object on the page, its copper lit by the room and the cursor.

## What to hand back

- `src/pieces/reflector/index.ts` exporting `createReflector` and `REFLECTOR` (with `strike`), and `model.ts`.
- Stills: unlit, lit, at three times zoom on the face and on a joint, with the cursor's light left and right, at the page's size.
- A filmstrip of the strike.
- The way the face looks on the screen as measured, in degrees.
