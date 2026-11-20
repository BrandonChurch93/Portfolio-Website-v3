import { useEffect, type RefObject } from 'react';
import { webgl } from '../world/device';
import type { Look, Quiet } from './atmosphere';

// Puts a room behind a page (./atmosphere.ts) for as long as the page is there. Whatever on the page is marked
// data-stands, and every card, stands off the wall and throws a shadow. Whatever is marked data-casts is type
// that does.
export function useRoom(page: RefObject<HTMLElement | null>, look: Look | null, quiet: Quiet | null = null): void {
  const fall = quiet?.fall, lamp = quiet?.lamp;
  useEffect(() => {
    const host = page.current;
    if (!look || !host || !webgl()) return;
    let made: { dispose(): void } | null = null, gone = false;
    void import('./atmosphere').then(({ mountAtmosphere }) => {
      if (gone) return;
      made = mountAtmosphere(host, look, () => [...host.querySelectorAll('article, [data-stands]')], 14, () => [...host.querySelectorAll<HTMLElement>('[data-casts]')], fall === undefined || lamp === undefined ? null : { fall, lamp });
    });
    return () => { gone = true; made?.dispose(); };
  }, [page, look, fall, lamp]);
}
