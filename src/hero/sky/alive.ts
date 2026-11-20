import { palette } from '../../config/palette';
import { registry } from '../../hooks/registry';
import { METEORS, SPARKS, TILT, meteorAt, type Meteor } from './field';

// The sky kept as a picture (HANDHELD.sky) is not left dead: meteors cross it and a few of its bright stars twinkle,
// each a plain element the browser animates on its own, with no canvas and no script in any frame. The meteors are
// the live sky's own first few, at their own times, places, lengths and brightness, and then the same ones again.

// How many of the live sky's meteors are played before they come round again, and how many bright stars twinkle,
// how far, and over how many seconds a breath.
const ALIVE = { meteors: 8, stars: 6, twinkle: [0.18, 0.62], breath: [3.4, 6.2] } as const;
// A meteor's trail is this share of its path, as the live sky draws it, and is this many CSS pixels thick, with a
// glow this wide round it.
const TRAIL = 0.42, CORE = 1.4, GLOW = 6;

const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16} ${(n >> 8) & 255} ${n & 255} / ${a})`; };

export function liven(host: HTMLElement, falls: Meteor[], stars: { x: number; y: number; big: boolean }[], u: number): () => void {
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', mixBlendMode: 'plus-lighter' });
  const played: Animation[] = [];
  const shown = falls.slice(0, ALIVE.meteors);
  const round = (falls[ALIVE.meteors]?.at ?? (shown[shown.length - 1]?.at ?? 0) + METEORS.every[1]) * 1000;
  for (const m of shown) {
    const dx = m.x1 - m.x0, dy = m.y1 - m.y0, len = Math.hypot(dx, dy), trail = TRAIL * len;
    const path = document.createElement('div');
    Object.assign(path.style, { position: 'absolute', left: `${m.x0}px`, top: `${m.y0 - GLOW / 2}px`, width: `${len}px`, height: `${GLOW}px`, overflow: 'hidden', transformOrigin: `0 ${GLOW / 2}px`, rotate: `${Math.atan2(dy, dx)}rad` });
    const streak = document.createElement('div');
    Object.assign(streak.style, {
      position: 'absolute', left: '0', top: '0', width: `${trail}px`, height: '100%', opacity: '0',
      background: [
        `linear-gradient(90deg, transparent, ${rgba(palette.flame, 0.5)} 45%, ${rgba(palette.hot, 0.9)} 85%, ${palette.pale}) center / 100% ${CORE}px no-repeat`,
        `linear-gradient(90deg, transparent, ${rgba(palette.flame, 0.1)} 60%, ${rgba(palette.hot, 0.28)}) center / 100% ${GLOW}px no-repeat`,
        `radial-gradient(circle at 100% 50%, ${palette.pale} 0, ${rgba(palette.pale, 0.5)} 1.2px, transparent ${GLOW / 2}px)`,
      ].join(', '),
    });
    path.appendChild(streak);
    layer.appendChild(path);
    // The live sky's own light curve and head, sampled, as shares of the whole round.
    const end = m.dur + METEORS.after, frames: Keyframe[] = [{ offset: 0, opacity: 0, translate: `${-trail}px 0` }];
    for (let i = 0; i <= 16; i++) {
      const t = m.at + (end * i) / 16, at = meteorAt(m, t);
      const head = at ? at.head : 1, light = at ? at.light : 0, tail = at ? at.tail : 1;
      frames.push({ offset: (t * 1000) / round, opacity: Math.min(1, light * m.bright), translate: `${head < 1 ? head * len - trail : tail * len}px 0` });
    }
    frames.push({ offset: 1, opacity: 0, translate: `${len}px 0` });
    played.push(streak.animate(frames, { duration: round, iterations: Infinity, easing: 'linear' }));
  }
  const bright = [...stars].sort((a, b) => Number(b.big) - Number(a.big)).slice(0, ALIVE.stars);
  bright.forEach((s, i) => {
    const reach = (s.big ? SPARKS.bigLen[1] : SPARKS.len[1]) * u, star = document.createElement('div');
    const ray = (deg: number) => `linear-gradient(${deg}rad, transparent calc(50% - 0.6px), ${rgba(palette.pale, 0.55)} 50%, transparent calc(50% + 0.6px))`;
    Object.assign(star.style, {
      position: 'absolute', left: `${s.x - reach}px`, top: `${s.y - reach}px`, width: `${2 * reach}px`, height: `${2 * reach}px`, opacity: '0', borderRadius: '50%',
      background: `radial-gradient(circle, ${palette.pale} 0, ${rgba(palette.pale, 0.55)} 1.5px, ${rgba(palette.hot, 0.16)} 4px, transparent 9px), ${ray(TILT)}, ${ray(TILT + Math.PI / 2)}`,
      maskImage: 'radial-gradient(circle, #000 20%, transparent 70%)',
      webkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 70%)',
    });
    layer.appendChild(star);
    const breath = (ALIVE.breath[0] + ((ALIVE.breath[1] - ALIVE.breath[0]) * ((i * 0.618) % 1))) * 1000;
    played.push(star.animate([{ opacity: ALIVE.twinkle[0] }, { opacity: ALIVE.twinkle[1] }], { duration: breath, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', delay: -breath * ((i * 0.37) % 1) }));
  });
  host.appendChild(layer);
  // A frozen clock holds them where that moment has them, so a still is always the same picture.
  const off = registry.onFreeze((t) => { for (const a of played) { if (t === null) a.play(); else { a.pause(); a.currentTime = t * 1000; } } });
  return () => { off(); for (const a of played) a.cancel(); layer.remove(); };
}
