'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Look, Quiet } from '../atmosphere/atmosphere';
import { useRoom } from '../atmosphere/useRoom';
import type { GalleryPage, ProjectPage, StudyPage } from '../content/projects';
import { projectPage as words } from '../content/site-pages';
import { ALL_WORK, type WorkItem } from '../content/work';
import { MetalButton } from './MetalButton';
import { SiteFoot } from './SiteFoot';
import { Viewer } from './Viewer';
import styles from './ProjectView.module.css';

// A project's own page (BRIEF.md, Open 33), in two kinds.
// A case study, for software and games: its first screen is a product page's. The viewer at the left, with the
// video and every picture, and at the right the name, one line, the figures that prove it and the links. Under
// that, in one column a person reads down, each part under its own heading: why he built it, what it is, the
// decisions, what it is built with.
// A gallery, for a shoot and for a 3D piece: the pictures are the content, so the viewer is as wide as the page,
// with his words about it under it.
// Both end on the project before and the project after, each with its picture. No stream runs here. A part with
// nothing written for it yet says so in its own place.
const SHOWN = 4;
const STUDY_ASPECT = 2000 / 1230;

type Found = { page: ProjectPage; item: WorkItem; prev: WorkItem | null; next: WorkItem | null };

// The room behind a project's page: the wall of the page of all his work, quieter. Its raking light is on the
// viewer and has died away a screen and a half down, so his words are read on a wall that is nearly dark, and it
// takes less than half of the cursor's light. ?room=wall is the wall as All work has it and ?room=none is no room,
// for telling the three apart.
const QUIET: Quiet = { fall: 1.5, lamp: 0.45 };

function Page({ children }: { children: ReactNode }) {
  const page = useRef<HTMLElement>(null);
  const [room, setRoom] = useState<{ look: Look | null; quiet: Quiet | null }>({ look: 'wall', quiet: QUIET });
  useEffect(() => {
    const asked = new URLSearchParams(location.search).get('room');
    if (asked === 'none') setRoom({ look: null, quiet: null });
    if (asked === 'wall') setRoom({ look: 'wall', quiet: null });
  }, []);
  useRoom(page, room.look, room.quiet);
  return <main ref={page} className={styles.page} data-room={room.look ?? undefined}>{children}</main>;
}

function Top() {
  return (
    <nav className={styles.top} aria-label="Back">
      <Link href={ALL_WORK} className={styles.back}>← {words.back}</Link>
    </nav>
  );
}

// A project that has no page of its own on this site yet is reached from the page of all his work.
const reach = (to: WorkItem) => (to.page.startsWith('/') || to.page.startsWith('http') ? to.page : ALL_WORK);

function Ways({ prev, next }: { prev: WorkItem | null; next: WorkItem | null }) {
  const way = (to: WorkItem | null, label: string, side: 'prev' | 'next') => to && (
    <a href={reach(to)} className={styles.way} data-side={side}>
      <span className={styles.wayPicture} data-stands=""><img src={to.picture.src} alt="" decoding="async" /></span>
      <span className={styles.wayLabel}>{side === 'prev' ? '← ' : ''}{label}{side === 'next' ? ' →' : ''}</span>
      <span className={styles.wayName}>{to.name}</span>
    </a>
  );
  if (!prev && !next) return null;
  return (
    <nav className={styles.ways} aria-label="More work">
      {way(prev, words.prev, 'prev')}
      {way(next, words.next, 'next')}
    </nav>
  );
}

function Words({ id, name, text, blank }: { id: string; name: string; text: string[]; blank: string }) {
  return (
    <section className={styles.part} aria-labelledby={id}>
      <h2 id={id} className={styles.heading}>{name}</h2>
      <div className={styles.prose}>
        {text.length ? text.map((p) => <p key={p.slice(0, 24)}>{p}</p>) : <p className={styles.blank}>{blank}</p>}
      </div>
    </section>
  );
}

function Study({ page, item, prev, next }: Found & { page: StudyPage }) {
  const [all, setAll] = useState(false);
  return (
    <Page>
      <Top />
      <div className={styles.first}>
        <Viewer
          shots={page.shots}
          aspect={STUDY_ASPECT}
          label={`${item.name}, video and pictures`}
          under={<div className={styles.links}>{item.links.map((l, i) => <MetalButton key={l.label} label={l.label} variant={i === 0 ? 'primary' : 'accent'} href={l.href} />)}</div>}
        />
        <header className={styles.summary}>
          <p className={styles.kind}><span>{item.kind}</span><span>{item.year}</span></p>
          <h1 className={styles.title} data-casts="">{item.name}</h1>
          <p className={styles.sub}>{page.sub}</p>
          <ul className={styles.figures}>
            {page.proved.map((f) => (
              <li key={f.label}>
                <span className={styles.value}>{f.value}</span>
                {f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer">{f.label} ↗</a> : <span>{f.label}</span>}
              </li>
            ))}
          </ul>
        </header>
      </div>

      <Words id="why" name={words.parts.why} text={page.why} blank={words.why} />
      <Words id="what" name={words.parts.what} text={page.what} blank="" />

      <section className={styles.part} aria-labelledby="how">
        <h2 id="how" className={styles.heading}>{words.parts.how}</h2>
        <ol className={styles.steps}>
          {page.how.map((s, i) => (
            <li key={s.title} hidden={!all && i >= SHOWN}>
              <h3><span className={styles.n} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        {page.how.length > SHOWN && (
          <button type="button" className={styles.more} aria-expanded={all} onClick={() => setAll((v) => !v)}>{all ? words.fewer : words.more(page.how.length)}</button>
        )}
      </section>

      <section className={styles.part} aria-labelledby="built">
        <h2 id="built" className={styles.heading}>{words.parts.built}</h2>
        <ul className={styles.stack}>
          {page.built.map(([group, items]) => <li key={group}><span>{group}</span>{items.join(' · ')}</li>)}
        </ul>
      </section>

      <Ways prev={prev} next={next} />
      <SiteFoot />
    </Page>
  );
}

function Gallery({ page, item, prev, next }: Found & { page: GalleryPage }) {
  return (
    <Page>
      <Top />
      <header className={styles.name}>
        <p className={styles.kind}><span>{item.kind}</span><span>{item.year}</span></p>
        <h1 className={styles.title}>{item.name}</h1>
        <p className={styles.sub}>{page.sub}</p>
      </header>
      <div className={styles.wide}>
        <Viewer shots={page.shots} aspect={page.aspect} rail="under" label={`${item.name}, pictures`} />
      </div>
      <Words id="note" name={words.parts.note} text={page.note} blank={words.note} />
      {page.built && (
        <section className={styles.part} aria-labelledby="built">
          <h2 id="built" className={styles.heading}>{words.parts.built}</h2>
          <ul className={styles.stack}>
            <li>{page.built.standIn && <span className={styles.pill}>{words.standIn}</span>}{page.built.items.join(' · ')}</li>
          </ul>
        </section>
      )}
      <Ways prev={prev} next={next} />
      <SiteFoot />
    </Page>
  );
}

export function ProjectView(found: Found) {
  return found.page.kind === 'study' ? <Study {...found} page={found.page} /> : <Gallery {...found} page={found.page} />;
}
