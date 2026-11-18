'use client';

import { useEffect, useRef, useState } from 'react';
import { BOARD } from '../../hero/board';
import { createHub, type Hub } from '../../whole/hub';
import { SiteNav } from '../SiteNav';
import { ContactLab } from './ContactLab';
import { HeroLab } from './HeroLab';
import { SkillsLab } from './SkillsLab';
import { WorkLab } from './WorkLab';
import styles from './WholeLab.module.css';

// The whole page so far (BRIEF.md, Settled, "The whole page so far"): Work, Skills and About, and Contact with its
// plain footer, in that order, each as it is on its own page, with one stream from the top of Work to the stone.
// Each section lays itself out and runs its own stage, and the hub mounts the one stream (src/whole/hub.ts).
// The hero is on top of it, with the stream running from the city's main fall into Work, and the navigation over
// all of it (BRIEF.md, Open 34). The opening and the footer's design are missing on purpose. ?ui=0 hides the
// navigation, for a still of the page alone.
export function WholeLab() {
  const page = useRef<HTMLElement>(null);
  // Made with the page and not after it, so the sections are in the page's own HTML: made in an effect, the page
  // was sent with no words in it at all.
  const [hub] = useState<Hub>(() => createHub(() => page.current, () => ({ hero: matchMedia(`(min-width: ${BOARD.least}px)`).matches })));
  const [ui, setUi] = useState(true);

  useEffect(() => {
    setUi(new URLSearchParams(location.search).get('ui') !== '0');
    hub.wake();
    return () => hub.dispose();
  }, [hub]);

  return (
    <>
    {ui && <SiteNav here="home" />}
    <main ref={page} className={styles.page}>
      <HeroLab hub={hub} />
      <WorkLab hub={hub} under />
      <SkillsLab hub={hub} />
      <ContactLab hub={hub} />
    </main>
    </>
  );
}
