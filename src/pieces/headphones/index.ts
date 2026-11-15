import type { Piece, PieceOptions } from '../../world/piece';
import type { Anchor } from '../../world/struck';

// A place holder until the piece is made from reference/kits/headphones.md. The names it exports are kept.
export const HEADPHONES: { hook: Anchor } = { hook: [0, -0.3] };

export interface Swing {
  // The angle the pair hangs at, in radians from straight down, about the point where the band bears on the hook.
  setSwing(angle: number): void;
}
export type HeadphonesPiece = Piece & Swing;

export function createHeadphones(): HeadphonesPiece {
  return {
    async mount(_host: HTMLElement, opts: PieceOptions) { opts.onReady?.(); },
    setLamp() {},
    setProgress() {},
    setWaterLight() {},
    setMaking() {},
    setTier() {},
    freeze() {},
    view() {},
    setSwing() {},
    dispose() {},
  };
}
