// The towers' three layers, one for each of their materials (src/pieces/world/parts/towers/materials.ts), and what
// each vertex of them carries for its material to read. Every design builds into a Kit of these.
//
//   const kit = layers()
//   kit.patch('stone', a, b, c, d, { tag: { lay: 1, tone: 0.5 } })
//   kit.patch('bay', a, b, c, d, { tag: field })      // a field of windows (Windows.take), or PLAIN, or COPPER
//   kit.patch('gold', a, b, c, d, { tag: { flute: 1.3, o, T } })
import { WINDOW, styleOf } from '../../../../src/pieces/world/parts/towers/windows.ts';
import { Kit } from './kit.mjs';

// A plain face of the bay's bronze, and one of polished copper.
export const PLAIN = { plain: true, copper: 0 };
export const COPPER = { plain: true, copper: 1 };
export const FIELD = 4096;

export function layers() {
  return new Kit({
    // Where a joint of the stone falls: across the face, up it, how it is laid (under a half ashlar, over it the
    // base's channels) with the building's own coursing as the share of that half (tag.vary: how tall its courses
    // and how long its blocks), and which stone it is (a tone, STONES in sixths).
    stone: {
      width: 4, attr: (p, n, tag) => {
        const kind = 0.5 * (tag?.lay ?? 0) + 0.49 * (tag?.vary ?? 0.5);
        if (Math.abs(n[1]) > 0.7) return [p[0], p[2], kind, tag?.tone ?? 0];
        const tx = n[2], tz = -n[0], l = Math.hypot(tx, tz) || 1;
        return [(p[0] * tx + p[2] * tz) / l, p[1], kind, tag?.tone ?? 0];
      },
    },
    // Where a place is in its field of windows, in windows (the whole part is the window, as the map has it), and
    // how large one is in units. A plain face has no size, and 1 in its second place if it is copper; a door or a
    // slot of a grille has its leaf's width as less than 0. Every field carries its building's stone in
    // its width (styleOf in windows.ts), and whether its windows are let into it. The fifth is not shipped: which field of windows the
    // place is in, by the texel the field begins at, for the light the make bakes from it.
    bay: {
      width: 5, attr: (p, n, tag) => {
        if (!tag || tag.plain) return [0, tag?.copper ?? 0, 0, 0, -1];
        const s = (p[0] - tag.o[0]) * tag.T[0] + (p[2] - tag.o[2]) * tag.T[2], t = p[1] - tag.y0;
        if (tag.door) return [s / tag.door, t / tag.ch, -tag.door, tag.ch, -1];
        return [tag.c0 + s / tag.cw, tag.r0 + t / tag.ch, tag.cw + WINDOW.style * styleOf(tag), tag.ch, tag.r0 * FIELD + tag.c0];
      },
    },
    // Where a place is across a panel of flutes, in flutes, 1 there (0 on plain gold, 2 on the carving inside a sun
    // disc's rim, which gives way to a plain field far off, with how far out from the disc's middle it is, a share of
    // its radius, in place of the flute), and what the first is over.
    // On a face that narrows as it rises (tag.taper: its width at its foot and its head, y0 and y1, and how many
    // flutes), the flutes narrow with it, from its middle line (tag.o): the place is stored over the width there,
    // which the shader divides, since each is even across a face and their share is not.
    gold: {
      width: 3, attr: (p, n, tag) => {
        if (tag?.disc) return [Math.hypot(p[0] - tag.x, p[1] - tag.cy) / tag.R, 2, 1];
        if (!tag?.flute) return [0, 0, 1];
        const s = (p[0] - tag.o[0]) * tag.T[0] + (p[2] - tag.o[2]) * tag.T[2];
        if (!tag.taper) return [s / tag.flute, 1, 1];
        const [w0, w1, y0, y1] = tag.taper, wide = w0 + ((w1 - w0) * (p[1] - y0)) / (y1 - y0);
        return [tag.flute * (s + 0.5 * wide), 1, wide];
      },
    },
  });
}
