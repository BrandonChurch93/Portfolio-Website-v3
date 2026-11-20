'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { BLANK, STILLS, STILLS_UNDER, type StillName } from '../config/stills';
import { webgl } from '../world/device';

// A picture of a 3D piece, in the page for a screen too narrow for the live one. A wide screen matches no source
// and never fetches it. The page's own stylesheet shows it only when it is narrow, or where the browser has no
// WebGL (data-plain), when it is fetched at every width.
export function Still({ name, className, style }: { name: StillName; className?: string; style?: CSSProperties }) {
  const s = STILLS[name];
  const [plain, setPlain] = useState(false);
  useEffect(() => setPlain(!webgl()), []);
  return (
    <div className={className} style={style} data-part="still" data-still={name} aria-hidden="true">
      <picture>
        <source media={`(max-width: ${STILLS_UNDER - 0.02}px)`} srcSet={s.file} />
        <img src={plain ? s.file : BLANK} alt="" width={s.keep.w} height={s.keep.h} decoding="async" style={{ minWidth: s.least }} />
      </picture>
    </div>
  );
}

// Where what a still of one piece alone keeps lies against that piece's host, in its pixels: across from the host's
// middle, and down from its top. /lab/piece puts the host, ?size tall, in the middle of the screen the still is
// taken on. A page with no WebGL shows the picture where the live piece would be. tall is the host's height.
export function kept(name: 'desk' | 'pad'): { x: number; y: number; w: number; tall: number } {
  const s = STILLS[name], tall = Number(new URLSearchParams(s.route.split('?')[1]).get('size'));
  return { x: s.keep.x - s.screen[0] / 2, y: s.keep.y - (s.screen[1] - tall) / 2, w: s.keep.w, tall };
}
