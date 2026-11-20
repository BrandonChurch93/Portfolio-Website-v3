import { sweep } from './contexts';

// A handheld: a touch screen held in the hand, an iPad or a phone. HANDHELD in config/site.ts is what one is held to.
// ?handheld=1 or 0 says which a page is opened as, for measuring.
let known: boolean | null = null;

export function handheld(): boolean {
  if (known !== null) return known;
  if (typeof window === 'undefined') return false;
  const asked = new URLSearchParams(location.search).get('handheld');
  // An iPad with a trackpad says its pointer is fine. It still says it is a Mac with a touch screen, which no Mac is.
  known = asked !== null ? asked === '1' : matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 1 && /Mac|iP(ad|hone|od)/.test(navigator.platform));
  return known;
}

// Whether the browser can draw WebGL2 at all. Some visitors are on locked down or remote desktops with no graphics
// card, and there nothing tries to make a renderer: the page is plain, with pictures in place of the 3D pieces, and
// marks itself data-plain on <html> for its stylesheets. Asked once, with a context that is let go at once.
// ?plain=1 opens a page as such a browser gets it.
let drawn: boolean | null = null;

export function webgl(): boolean {
  if (drawn !== null) return drawn;
  if (typeof document === 'undefined') return true;
  if (new URLSearchParams(location.search).get('plain') === '1') drawn = false;
  else {
    let gl: WebGL2RenderingContext | null = null;
    try { gl = document.createElement('canvas').getContext('webgl2'); } catch { gl = null; }
    drawn = !!gl;
    sweep(gl);
  }
  document.documentElement.toggleAttribute('data-plain', !drawn);
  return drawn;
}
