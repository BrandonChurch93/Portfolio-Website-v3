'use client';

import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { BLANK, DRAWN_STILLS, STILLS, STILLS_UNDER, type StillName } from '../config/stills';
import { isDrawn } from '../pieces/world/layout';
import { webgl } from '../world/device';

// What puts the other picture in the first one's place while the page is still being read: the server cannot know
// what the address asked for, so the page arrives holding the first, and these few words run before anything is
// drawn. They say what isDrawn says. They sit inside the picture, after its source and before its image, so that
// they run before there is an image at all: an image that exists can be painted holding the first picture while
// they wait for a stylesheet, and one that holds a picture keeps showing it until the next has arrived. The image
// is made after them and has only ever known the other picture. A browser reads ahead of them and may still fetch
// the first and throw it away: that is the cost of the look being behind a switch, and it ends when it is not.
// They are written as the words of a hidden span, which a picture is not meant to hold: React told to make a
// script in the browser complains that it will never run, and an image looks only at the sources beside it.
// A page made in the browser never runs them, and needs none: there the component knows before anything is drawn.
const swap = (file: string): string =>
  `(function(s){try{if(new URLSearchParams(location.search).get('look')!=='d')return;var p=s.parentNode.parentNode;p.parentNode.setAttribute('data-look','d');p.querySelector('source').srcset='${file}'}catch(e){}})(document.currentScript)`;

// A picture of a 3D piece, in the page for a screen too narrow for the live one. A wide screen matches no source
// and never fetches it. The page's own stylesheet shows it only when it is narrow, or where the browser has no
// WebGL (data-plain), when it is fetched at every width.
// A piece that has a picture of itself as ?look=d has the world (DRAWN_STILLS) shows that one where the page is
// asked for with that look, and is marked data-look="d" for its stylesheet. Its name stays the piece's own.
export function Still({ name, className, style }: { name: StillName; className?: string; style?: CSSProperties }) {
  const other = DRAWN_STILLS[name];
  const [drawn, setDrawn] = useState(false);
  const [plain, setPlain] = useState(false);
  useLayoutEffect(() => { if (other) setDrawn(isDrawn(new URLSearchParams(location.search))); }, [other]);
  useEffect(() => setPlain(!webgl()), []);
  const s = STILLS[drawn && other ? other : name];
  return (
    <div className={className} style={style} data-part="still" data-still={name} data-look={drawn ? 'd' : undefined} aria-hidden="true" suppressHydrationWarning={!!other}>
      <picture>
        <source media={`(max-width: ${STILLS_UNDER - 0.02}px)`} srcSet={s.file} suppressHydrationWarning={!!other} />
        {other && <span hidden dangerouslySetInnerHTML={{ __html: `<script>${swap(STILLS[other].file)}</script>` }} />}
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
