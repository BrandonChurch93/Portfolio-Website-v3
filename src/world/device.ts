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
