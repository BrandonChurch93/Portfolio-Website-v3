'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Look, Quiet } from '../atmosphere/atmosphere';
import { useRoom } from '../atmosphere/useRoom';
import type { GalleryPage, ProjectPage, StudyPage } from '../content/projects';
import { projectPage as words } from '../content/site-pages';
import { ALL_WORK, type WorkItem } from '../content/work';
import { Framed } from './Framed';
import { MetalButton } from './MetalButton';
import { SiteFoot } from './SiteFoot';
import { MAIN, SiteNav } from './SiteNav';
import { Viewer } from './Viewer';
import styles from './ProjectView.module.css';

// A project's own page (BRIEF.md, Open 33), in two kinds.
// A case study, for software and games: its first screen is a product page's. The viewer at the left, with the
// video and every picture and the links under them, and at the right the name, one line, and the figures that
// prove it as a ruled list that fills the rest of the column, so the two sides start and end level whatever is in
// them. On a narrower screen it is one column: the name, the viewer as wide as the column, the figures in a row. Under
// that, in one column a person reads down, each part under its own heading: why he built it, what it is, how it
// works, what it is built with.
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
  return (
    <>
      <SiteNav here="project" />
      <main ref={page} id={MAIN} className={styles.page} data-room={room.look ?? undefined}>{children}</main>
      <SiteFoot />
    </>
  );
}

// A link's last word keeps its arrow: an arrow alone on a line is a lone word.
const lead = (label: string) => label.slice(0, label.lastIndexOf(' ') + 1);
const last = (label: string) => label.slice(label.lastIndexOf(' ') + 1);

// A project that has no page of its own on this site yet is reached from the page of all his work.
const reach = (to: WorkItem) => (to.page.startsWith('/') || to.page.startsWith('http') ? to.page : ALL_WORK);

function Ways({ prev, next }: { prev: WorkItem | null; next: WorkItem | null }) {
  const way = (to: WorkItem | null, label: string, side: 'prev' | 'next') => to && (
    <a href={reach(to)} className={styles.way} data-side={side}>
      <Framed aspect={16 / 10} className={styles.wayPicture}><img src={to.picture.src} alt="" decoding="async" /></Framed>
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

// Names in a row with a point between them. A name is never broken across two lines.
function Items({ items }: { items: string[] }) {
  return <span className={styles.items}>{items.map((name, i) => <span key={name}>{i > 0 && ' · '}<span className={styles.keep}>{name}</span></span>)}</span>;
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
      <div className={styles.first}>
        <header className={styles.head}>
          <p className={styles.kind}><span>{item.kind}</span><span>{item.year}</span></p>
          <h1 className={styles.title} data-casts="">{item.name}</h1>
          <p className={styles.sub}>{page.sub}</p>
        </header>
        <div className={styles.media}>
          <Viewer
            shots={page.shots}
            aspect={STUDY_ASPECT}
            label={`${item.name}, video and pictures`}
            under={<div className={styles.links}>{item.links.map((l, i) => <MetalButton key={l.label} label={l.label} variant={i === 0 ? 'primary' : 'accent'} href={l.href} />)}</div>}
          />
        </div>
        <ul className={styles.figures}>
          {page.proved.map((f) => (
            <li key={f.label}>
              <span className={styles.value}>{f.value}</span>
              {f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer">{lead(f.label)}<span className={styles.keep}>{last(f.label)} ↗</span></a> : <span>{f.label}</span>}
            </li>
          ))}
        </ul>
      </div>

      <Words id="why" name={words.parts.why} text={page.why} blank={words.why} />
      <Words id="what" name={words.parts.what} text={page.what} blank="" />

      <section className={styles.part} aria-labelledby="how">
        <h2 id="how" className={styles.heading}>{words.parts.how}</h2>
        <ol className={styles.steps}>
          {page.how.map((s, i) => (
            <li key={s.title} hidden={!all && i >= SHOWN}>
              <span className={styles.n} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
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
          {page.built.map(([group, items]) => <li key={group}><span className={styles.group}>{group}</span><Items items={items} /></li>)}
        </ul>
      </section>

      <Ways prev={prev} next={next} />
    </Page>
  );
}

function Gallery({ page, item, prev, next }: Found & { page: GalleryPage }) {
  return (
    <Page>
      <header className={styles.name}>
        <p className={styles.kind}><span>{item.kind}</span><span>{item.year}</span></p>
        <h1 className={styles.title}>{item.name}</h1>
        <p className={styles.sub}>{page.sub}</p>
      </header>
      <div className={styles.wide} style={{ '--shape': page.aspect } as CSSProperties}>
        <Viewer shots={page.shots} aspect={page.aspect} rail="under" label={`${item.name}, pictures`} />
      </div>
      <Words id="note" name={words.parts.note} text={page.note} blank={words.note} />
      {page.built && (
        <section className={styles.part} aria-labelledby="built">
          <h2 id="built" className={styles.heading}>{words.parts.built}</h2>
          <ul className={styles.stack}>
            <li data-plain="">{page.built.standIn && <span className={styles.pill}>{words.standIn}</span>}<Items items={page.built.items} /></li>
          </ul>
        </section>
      )}
      <Ways prev={prev} next={next} />
    </Page>
  );
}

export function ProjectView(found: Found) {
  return found.page.kind === 'study' ? <Study {...found} page={found.page} /> : <Gallery {...found} page={found.page} />;
}
