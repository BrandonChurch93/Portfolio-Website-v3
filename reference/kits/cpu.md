# Kit · the CPU in its socket

Read `reference/kits/README.md` first. This is `src/pieces/cpu/`.

## What it is

- A desktop processor seated in its socket, on a square of motherboard cut out round it. It stands at the left of the first row of skills, AI Product Engineering, and is what the stream strikes to wake that row.
- Brandon picked it from a rough derby: `reference/studies/48-skill-things-the-six.jpg`, bottom left, "The CPU, in its socket". That still is the idea and the floor. Its form is boxes. Yours is the real thing.
- His words: "some super hyper realistic CPU". "The CPU is hyper detailed, at the standard of my PC Builder's parts, in our colors only." He builds PCs. He will know a socket that is wrong.
- It is a chip running a model: the stream's light pulses in it and runs out along its traces.

## What is on it

Model each of these as a real part, at real sizes in millimetres. A real socket is about 45 mm square and the board square here is about 110 mm.

- **The board.** A square of PCB with a dark warm solder mask, its cut edge showing the layers, plated mounting holes, fine silkscreen marks and reference codes, and copper traces under the mask that fan out from the socket to the board's edges in bundles, with vias. The traces are what light runs along.
- **The socket.** A land grid socket: the plastic body, the steel load plate hinged at one side with its window, the lever arm with its hook and its latch, the hinge pins, the four screws. Round the processor's edge the socket's contacts show in the gap.
- **The processor.** The package with its heat spreader: a stepped lid with a flat top, a chamfered rim and wings under the load plate, the green of the substrate replaced by the site's dark, small capacitors on the substrate's rim, a corner mark. The top is etched with made up codes, a serial, and a small data matrix. Sharp at three times zoom.
- **Round it.** A row of power chokes, solid capacitors with marked tops, MOSFETs, small resistors and capacitors in rows, one or two larger chips, a four or eight pin power header, and a fan header. Enough that there is something to find everywhere, placed as on a real board and not scattered.
- **Its metals.** The heat spreader is brushed copper or bronze, where a real one is nickel. The load plate and lever are dark steel with bronze wear on the edges, or bronze. Traces and pads are copper. Component bodies are dark, with copper and bronze ends and marks. Nothing silver, nothing green.

## How it is seen

- From above and the front left, about 50 degrees up and about 28 degrees round, with a narrow field of view (20 degrees or less), so it reads as a square lying on a table, as in the derby still.
- The board's silhouette is 0.73 of the host's height across at its widest, and centered on the host's middle. On the page the host is 220 units tall, so the board is about 160 units across. A unit is about a CSS pixel on a 1440 wide screen.
- It sits: a soft contact shadow under the board that fades out well inside the host.
- It turns a little toward the cursor, about 5 degrees each way, eased, with weight.
- It is lit by the cursor's light. The heat spreader's brushing and the etch must answer it as the cursor moves.

## The stream in it

- The stream meets it at the board's left most point in the picture, at the middle of the host's height. Export that as `CPU.strike`.
- `setStream(on, since)`: with the stream on it, light pulses out of the seam round the processor and runs out along the traces to the board's edges, wave after wave, in ember to flame to hot, pale only at the crest. The pulse is the chip working. It never looks like a loading bar or a marquee: uneven bundles, uneven timing, each wave dying as it goes.
- The light is physical: it colors the socket's wall, the sides of the chokes and capacitors beside a lit trace, and the underside of the lever.
- With `on` at 0 and the thing alive, the traces are dark copper under the mask and it is a still object.

## Three ways of coming to life

He is on the fence about the first, which is why all three are built for him to compare in motion: "I'm worried they won't look good." Each has to be a finished piece of motion in its own right.

`setLife(way, age)`. Age is the seconds since the strike. At 0 or less nothing of the thing is drawn at all: not a shadow, not a glow. Past the way's length it is whole. It is worked out from age alone, so running age back takes the thing away again, and a held age is a still. Export each way's length in `LIFE`.

- **`shards`.** The strike throws shards. Some of them fly in from the strike point, become the thing's parts and lock together, and its lights come on last. A shard is a small jagged facet with needle points, lit hot, as the stream's are: open `reference/studies/08-stream-facets.jpg`, right hand panel. Each part starts as one at the strike point, flies an arc with weight, tumbling, and as it comes to its seat it becomes the part and seats with a small hard stop. The board first, then the socket, the processor, the lever closing, then the parts round it in a quick run, then the lights. A viewer must be able to follow one shard from the strike to the part it becomes. Never a cloud of confetti, never parts that fade in. About 1.2 seconds.
- **`band`.** A band of light crosses it from the strike point and uncovers it, as a card in Work is woken: nothing ahead of the band, the whole thing behind it, a bright line between with its light falling on what it has just uncovered. The band is bowed a little, bright where it starts and spent by the far side. `src/metal/wake.ts` describes the card's band. About 0.6 seconds, then the lights.
- **`flash`.** The strike's flash lights it: it is there in the first frame, seen by the flash alone, with its parts standing a short way off their seats (the processor above the socket, the load plate open, the lever up, the parts round it lifted). They drop the last short way into place with weight, the plate closes, the lever latches, and the lights come on. No shard becomes a part. About 0.7 seconds.

In all three the lights come on last, and the thing is never left half made at the end of its length.

## What to hand back

- `src/pieces/cpu/index.ts` exporting `createCpu`, `CPU` (with `strike`) and `LIFE`, and `model.ts`.
- Stills: at rest, at three times zoom on the processor's etch and on the lever, lit by the stream, with the cursor's light left and right, at the page's size.
- A filmstrip of each of the three ways, eight or more frames each, and one of the pulse.

```
npm run strip -- /lab/piece/cpu --times 0.02,0.1,0.2,0.35,0.5,0.7,0.9,1.3 --eval "window.__site.piece('cpu').setLife('shards', \$t)" --out shots/cpu/shards.jpg
```
