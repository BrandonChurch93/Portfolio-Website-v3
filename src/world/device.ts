import { HANDHELD, NET } from '../config/site';
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
  if (new URLSearchParams(location.search).get('plain') === '1' || fallen()) drawn = false;
  else {
    let gl: WebGL2RenderingContext | null = null;
    try { gl = document.createElement('canvas').getContext('webgl2'); } catch { gl = null; }
    drawn = !!gl;
    sweep(gl);
  }
  document.documentElement.toggleAttribute('data-plain', !drawn);
  if (drawn && handheld()) beat();
  return drawn;
}

// What the site keeps on a device, and in a tab. A browser that refuses storage keeps nothing and is never held
// plain.
const kept = (where: 'local' | 'session', key: string, to?: string | null): string | null => {
  try {
    const store = where === 'local' ? localStorage : sessionStorage;
    if (to === undefined) return store.getItem(key);
    if (to === null) store.removeItem(key); else store.setItem(key, to);
    return to;
  } catch { return null; }
};

// The net under a handheld (BRIEF.md, Open 36, his ruling of Nov 21). Safari ends a page that holds more than it
// allows and loads it again: when that has happened while the page was on the screen, the page comes back plain, as
// a browser with no WebGL gets it, and stays plain on that device. It is known by a mark the page keeps fresh in its
// tab while it is on the screen and takes away when it is hidden or left: a mark still fresh at a load was left by a
// page that was ended. ?plain=0, or ?live=1, lets the device go again.
let fell: boolean | null = null;

function fallen(): boolean {
  if (fell !== null) return fell;
  const q = new URLSearchParams(location.search), mark = Number(kept('session', NET.mark));
  kept('session', NET.mark, null);
  if (mark > 0 && Date.now() - mark < NET.fresh) kept('local', NET.plain, '1');
  else if (q.get('plain') === '0' || q.get('live') === '1') kept('local', NET.plain, null);
  fell = kept('local', NET.plain) === '1';
  return fell;
}

let beating = false;

function beat(): void {
  if (beating) return;
  beating = true;
  const on = () => { if (document.visibilityState === 'visible') kept('session', NET.mark, String(Date.now())); };
  const off = () => { kept('session', NET.mark, null); };
  on();
  setInterval(on, NET.every);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') on(); else off(); });
  addEventListener('pagehide', off);
  addEventListener('pageshow', on);
}

// ?live=1, remembered on the device until ?live=0: a handheld is shown every piece live, none as a picture
// (HANDHELD.pictures). For his own iPad. The net above still holds it.
let lively: boolean | null = null;

export function live(): boolean {
  if (lively !== null) return lively;
  if (typeof window === 'undefined') return false;
  const asked = new URLSearchParams(location.search).get('live');
  if (asked === '1') kept('local', NET.live, '1');
  if (asked === '0') kept('local', NET.live, null);
  lively = kept('local', NET.live) === '1';
  return lively;
}

// Whether a piece is shown as a picture where the page is laid out wide: on a handheld, those it is held to
// (HANDHELD.pictures), unless it has been asked for everything live. ?world=picture shows the hero's world as its
// pictures on any device, a desktop too, and ?world=live as the live piece on a handheld.
export function pictured(name: string): boolean {
  if (typeof window === 'undefined' || !webgl()) return false;
  const asked = name === 'world' ? new URLSearchParams(location.search).get('world') : null;
  if (asked === 'picture') return true;
  if (asked === 'live') return false;
  return handheld() && !live() && HANDHELD.pictures.includes(name);
}
