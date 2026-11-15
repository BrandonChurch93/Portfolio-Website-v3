'use client';

import { useEffect, useRef, useState } from 'react';
import { createHub, type Hub } from '../../whole/hub';
import { ContactLab } from './ContactLab';
import { SkillsLab } from './SkillsLab';
import { WorkLab } from './WorkLab';
import styles from './WholeLab.module.css';

// The whole page so far (BRIEF.md, Settled, "The whole page so far"): Work, Skills and About, and Contact with its
// plain footer, in that order, each as it is on its own page, with one stream from the top of Work to the stone.
// Each section lays itself out and runs its own stage, and the hub mounts the one stream (src/whole/hub.ts).
// The hero, the navigation and the footer's design are missing on purpose, and the label says so. ?ui=0 hides it.
export function WholeLab() {
  const page = useRef<HTMLElement>(null);
  const [hub, setHub] = useState<Hub | null>(null);
  const [ui, setUi] = useState(true);

  useEffect(() => {
    setUi(new URLSearchParams(location.search).get('ui') !== '0');
    const made = createHub(() => page.current);
    setHub(made);
    return () => made.dispose();
  }, []);

  return (
    <main ref={page} className={styles.page}>
      {ui && (
        <header className={styles.head}>
          <p className={styles.label}>Study 29 · the whole page so far</p>
          <p className={styles.note}>Work, Skills, About and Contact with one stream. Not here yet, on purpose: the hero, the navigation and the footer&rsquo;s design. The words are stand ins.</p>
        </header>
      )}
      {hub && (
        <>
          <WorkLab hub={hub} />
          <SkillsLab hub={hub} />
          <ContactLab hub={hub} />
        </>
      )}
    </main>
  );
}
