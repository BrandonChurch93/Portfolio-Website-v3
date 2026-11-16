// What a page is still waiting for before it can be shown, and how far along each thing is. Whatever takes time
// before the first screen is whole (the hero's world, the fonts) says so here, and the preloader
// (src/components/Preloader.tsx) reads it. Nothing here knows what the things are.

interface Item { share: number; weight: number; done: boolean }

const items = new Map<string, Item>();
const subs = new Set<() => void>();
const tell = (): void => { for (const s of subs) s(); };

export const loading = {
  // Something has begun that the first screen waits for. weight is how much of the whole wait it is, against the
  // others.
  begin(key: string, weight = 1): void {
    if (items.has(key)) return;
    items.set(key, { share: 0, weight, done: false });
    tell();
  },
  // How far along it is, 0 to 1. It never goes back.
  progress(key: string, share: number): void {
    const it = items.get(key);
    if (!it || it.done) return;
    const to = Math.min(0.999, Math.max(it.share, share));
    if (to === it.share) return;
    it.share = to;
    tell();
  },
  // It is ready, or it failed: either way the page no longer waits for it.
  end(key: string): void {
    const it = items.get(key);
    if (!it || it.done) return;
    it.share = 1;
    it.done = true;
    tell();
  },
  // The whole wait: how far along it is, and whether anything is still awaited.
  state(): { share: number; busy: boolean; begun: number } {
    let got = 0, of = 0, busy = false;
    for (const it of items.values()) { got += it.share * it.weight; of += it.weight; if (!it.done) busy = true; }
    return { share: of > 0 ? got / of : 0, busy, begun: items.size };
  },
  subscribe(fn: () => void): () => void {
    subs.add(fn);
    return () => { subs.delete(fn); };
  },
  // A page that is left takes what it was waiting for with it.
  clear(): void {
    items.clear();
    tell();
  },
};
