import { SCREEN } from '../../layout';

// The ultrawide's own sizes, in millimetres. The panel's middle is the origin of everything here: x along the panel
// before it is bent round the curve, y up, z toward the viewer, with the glass's face near z = 0.
export const PANEL = {
  R: SCREEN.curve,
  W: SCREEN.w,
  H: SCREEN.h,
  // The body behind the glass, from its back to its face, and how round its edges are.
  back: -10.5,
  face: -1.7,
  edge: 4,
  // The glass: how far in from the body's edge it stops, and its two faces.
  lip: 1.4,
  glassBack: -1.35,
  glassFront: -0.35,
  // The chin under the glass, and the black border printed round the inside of the glass.
  chin: 11,
  frit: 7,
} as const;

// The glass, as a box on the panel.
export const GLASS = { x0: -PANEL.W / 2 + PANEL.lip, x1: PANEL.W / 2 - PANEL.lip, y0: -PANEL.H / 2 + PANEL.chin, y1: PANEL.H / 2 - PANEL.lip } as const;
// What lights, inside the border: its lower left corner on the panel and its size. Everything drawn on the screen is
// placed in millimetres from that corner, y up.
export const ACTIVE = { x0: GLASS.x0 + PANEL.frit, y0: GLASS.y0 + PANEL.frit, w: GLASS.x1 - GLASS.x0 - 2 * PANEL.frit, h: GLASS.y1 - GLASS.y0 - 2 * PANEL.frit } as const;

// Where the panel's middle stands on the desk.
export const MID: [number, number, number] = [SCREEN.x, SCREEN.low + SCREEN.h / 2, SCREEN.z];

export type Rect = [x0: number, y0: number, x1: number, y1: number];

// The windows on the screen, in millimetres on the active area, and how deep each stands behind the glass. The editor
// is the widest thing and the running page stands over its right edge; the small panel floats over both; the pointer
// is nearest the glass. The depths are made larger than a real panel's so the layers can be seen to stand apart.
export const LAYERS = {
  wall: { depth: 14 },
  editor: { rect: [14, 15, 506, 340] as Rect, depth: 8.5, round: 4.5 },
  page: { rect: [474, 34, 870, 330] as Rect, depth: 5, round: 4.5 },
  panel: { rect: [372, 20, 560, 116] as Rect, depth: 2.2, round: 4 },
  pointer: { at: [690, 196] as [number, number], size: 10.5, depth: 0.8 },
} as const;

// How much of the line of sight's own slant the layers keep. The rest is taken off as the slant at the panel's middle,
// so the picture stands where it was laid out from the page's view and still slides under the border toward the
// edges and as the pointer moves.
export const SLANT = 0.3;

// The editor's own rows, in millimetres down from its top.
export const EDITOR = { title: 9, tree: 88, tabs: 9, crumbs: 6.5, line: 7.4, code: 30, terminal: 82, status: 6.5 } as const;
// The running page's bar along its top.
export const PAGE = { bar: 11 } as const;
