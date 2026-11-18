'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Fact, GalleryPage, ProjectPage, StudyPage } from '../content/projects';
import { projectPage as words } from '../content/site-pages';
import { ALL_WORK, type WorkItem } from '../content/work';
import { MetalButton } from './MetalButton';
import { SiteFoot } from './SiteFoot';
import { Viewer } from './Viewer';
import styles from './ProjectView.module.css';

// A project's own page (BRIEF.md, Open 33), in two kinds.
// A case study, for software and games: its first screen is a product page's. The viewer at the left, with the
// video and every picture, and at the right the name, one line, the figures that prove it, the links and a few
// facts. Under that, for whoever reads on: the problem, what was built, the decisions as rows, what it is built
// with, and the way on. What matters is up front and nothing is said twice.
// A gallery, for a shoot and for a 3D piece: the pictures are the content, so the viewer is as wide as the page,
// with a short note and a few facts under it.
// No stream runs here. A part with nothing written for it says so with a stand in.
const SHOWN = 4;
const STUDY_ASPECT = 2000 / 1230;

type Found = { page: ProjectPage; item: WorkItem; prev: WorkItem | null; next: WorkItem | null };

const Pill = () => <span className={styles.pill}>{words.standIn}</span>;

function Facts({ facts }: { facts: Fact[] }) {
  return (
    <dl className={styles.facts}>
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value === words.standIn ? <Pill /> : value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Top() {
  return (
    <nav className={styles.top} aria-label="Back">
      <Link href={ALL_WORK} className={styles.back}>← {words.back}</Link>
    </nav>
  );
}

function Ways({ prev, next }: { prev: WorkItem | null; next: WorkItem | null }) {
  const way = (to: WorkItem | null, label: string, side: 'prev' | 'next') => to && (
    <a href={to.page} className={styles.way} data-side={side}>
      <span className={styles.wayLabel}>{side === 'prev' ? '← ' : ''}{label}{side === 'next' ? ' →' : ''}</span>
      <span className={styles.wayName}>{to.name}</span>
    </a>
  );
  return (
    <nav className={styles.ways} aria-label="More work">
      {way(prev, words.prev, 'prev')}
      <Link href={ALL_WORK} className={styles.all}>{words.all}</Link>
      {way(next, words.next, 'next')}
    </nav>
  );
}

function Study({ page, item, prev, next }: Found & { page: StudyPage }) {
  const [all, setAll] = useState(false);
  const links = item.links.map((l, i) => <MetalButton key={l.label} label={l.label} variant={i === 0 ? 'primary' : 'accent'} href={l.href} />);
  return (
    <main className={styles.page}>
      <Top />
      <div className={styles.first}>
        <Viewer shots={page.shots} aspect={STUDY_ASPECT} label={`${item.name}, video and pictures`} />
        <header className={styles.summary}>
          <p className={styles.kind}><span>{item.kind}</span><span>{item.year}</span></p>
          <h1 className={styles.title}>{item.name}</h1>
          <p className={styles.sub}>{page.sub}</p>
          <ul className={styles.figures}>
            {page.proved.map((f) => (
              <li key={f.label}>
                <span className={styles.value}>{f.value}</span>
                {f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer">{f.label} ↗</a> : <span>{f.label}</span>}
              </li>
            ))}
          </ul>
          <div className={styles.links}>{links}</div>
          <Facts facts={[['Type', item.kind], ['Year', item.year], ...page.facts]} />
        </header>
      </div>

      <section className={styles.part} aria-labelledby="why">
        <h2 id="why" className={styles.label}>{words.parts.why}</h2>
        <div className={styles.prose}>
          {page.why.length ? page.why.map((p) => <p key={p.slice(0, 24)}>{p}</p>) : <p className={styles.blank}><Pill />{words.why}</p>}
        </div>
      </section>

      <section className={styles.part} aria-labelledby="what">
        <h2 id="what" className={styles.label}>{words.parts.what}</h2>
        <div className={styles.prose}>{page.what.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}</div>
      </section>

      <section className={styles.part} aria-labelledby="how">
        <h2 id="how" className={styles.label}>{words.parts.how}</h2>
        <div>
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
        </div>
      </section>

      <section className={styles.part} aria-labelledby="built">
        <h2 id="built" className={styles.label}>{words.parts.built}</h2>
        <dl className={styles.stack}>
          {page.built.map(([group, items]) => (
            <div key={group}>
              <dt>{group}</dt>
              <dd>{items.join(' · ')}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.end} aria-label={item.name}>
        <div className={styles.links}>{links}</div>
        <Ways prev={prev} next={next} />
      </section>
      <SiteFoot />
    </main>
  );
}

function Gallery({ page, item }: Found & { page: GalleryPage }) {
  return (
    <main className={styles.page}>
      <Top />
      <header className={styles.name}>
        <p className={styles.kind}><span>{item.kind}</span><span>{item.year}</span></p>
        <h1 className={styles.title}>{item.name}</h1>
        <p className={styles.sub}>{page.sub}</p>
      </header>
      <div className={styles.wide}>
        <Viewer shots={page.shots} aspect={page.aspect} rail="under" label={`${item.name}, pictures`} />
      </div>
      <section className={styles.part} aria-labelledby="note">
        <h2 id="note" className={styles.label}>{words.parts.note}</h2>
        <div className={styles.about}>
          <div className={styles.prose}>
            {page.note.length ? page.note.map((p) => <p key={p.slice(0, 24)}>{p}</p>) : <p className={styles.blank}><Pill />{words.note}</p>}
          </div>
          <Facts facts={page.facts} />
        </div>
      </section>
      <section className={styles.end} aria-label={item.name}>
        <Ways prev={null} next={null} />
      </section>
      <SiteFoot />
    </main>
  );
}

export function ProjectView(found: Found) {
  return found.page.kind === 'study' ? <Study {...found} page={found.page} /> : <Gallery {...found} page={found.page} />;
}
