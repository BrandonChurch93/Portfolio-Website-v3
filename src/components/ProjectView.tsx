'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ProjectPage } from '../content/projects';
import { projectPage as words } from '../content/site-pages';
import { ALL_WORK, type WorkItem } from '../content/work';
import { MetalButton } from './MetalButton';
import { Plate } from './Plate';
import { SiteFoot } from './SiteFoot';
import styles from './ProjectView.module.css';

// A project's own page (BRIEF.md, Open 33), in ten parts: a head with its links, a plate of facts, the lead picture
// or video on a large plate, what it is, why it was built, how it works, what it proved, what it is built with,
// a gallery that opens, and a foot with the links again and the way on. No stream runs here. A part with nothing
// written for it yet says so with a stand in, so the layout can be judged whole.
const LEAD = 2000 / 1230;

export function ProjectView({ page, item, prev, next }: { page: ProjectPage; item: WorkItem; prev: WorkItem | null; next: WorkItem | null }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const shots = page.gallery;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const step = (by: number) => setOpen((at) => (at === null ? at : (at + by + shots.length) % shots.length));
  const links = item.links.map((l, i) => <MetalButton key={l.label} label={l.label} variant={i === 0 ? 'primary' : 'accent'} href={l.href} />);
  const pill = <span className={styles.pill}>{words.standIn}</span>;
  const way = (to: WorkItem | null, label: string, side: 'prev' | 'next') => to && (
    <a href={to.page} className={styles.way} data-side={side}>
      <span className={styles.wayLabel}>{side === 'prev' ? '← ' : ''}{label}{side === 'next' ? ' →' : ''}</span>
      <span className={styles.wayName}>{to.name}</span>
    </a>
  );

  return (
    <main className={styles.page}>
      <nav className={styles.top} aria-label="Back">
        <Link href={ALL_WORK} className={styles.back}>← {words.back}</Link>
      </nav>

      <header className={styles.head}>
        <p className={styles.kind}><span>{item.kind}</span><span>{item.year}</span></p>
        <h1 className={styles.title}>{item.name}</h1>
        <p className={styles.sub}>{page.sub}</p>
        <p className={styles.intro}>{page.intro}</p>
        <div className={styles.links}>{links}</div>
      </header>

      <div className={styles.show}>
        <figure className={styles.lead}>
          <div className={styles.frame} style={{ aspectRatio: String(LEAD) }}>
            <Plate finish="card" kind="card" card={{ aspect: LEAD, edge: 'deep', plain: true }} tilt={false} className={styles.metal} />
            <div className={styles.window}>
              {page.lead.video
                ? <video src={page.lead.video} poster={page.lead.src} controls playsInline preload="metadata" />
                : <img src={page.lead.src} alt={page.lead.alt} decoding="async" />}
            </div>
          </div>
          {!page.lead.video && <figcaption className={styles.note}>{pill}{words.video}</figcaption>}
        </figure>
        <dl className={styles.facts}>
          {page.facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value === words.standIn ? pill : value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className={styles.part} aria-labelledby="what">
        <h2 id="what" className={styles.label}>{words.parts.what}</h2>
        <div className={styles.prose}>{page.what.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}</div>
      </section>

      <section className={styles.part} aria-labelledby="why">
        <h2 id="why" className={styles.label}>{words.parts.why}</h2>
        <div className={styles.prose}>
          {page.why.length ? page.why.map((p) => <p key={p.slice(0, 24)}>{p}</p>) : <p className={styles.blank}>{pill}{words.why}</p>}
        </div>
      </section>

      <section className={styles.part} aria-labelledby="how">
        <h2 id="how" className={styles.label}>{words.parts.how}</h2>
        <ol className={styles.steps}>
          {page.how.map((s, i) => (
            <li key={s.title}>
              <span className={styles.n} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.part} aria-labelledby="proved">
        <h2 id="proved" className={styles.label}>{words.parts.proved}</h2>
        <ul className={styles.figures}>
          {page.proved.map((f) => (
            <li key={f.label}>
              <span className={styles.value}>{f.value}</span>
              {f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer">{f.label} ↗</a> : <span>{f.label}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.part} aria-labelledby="built">
        <h2 id="built" className={styles.label}>{words.parts.built}</h2>
        <dl className={styles.stack}>
          {page.built.map(([group, items]) => (
            <div key={group}>
              <dt>{group}</dt>
              <dd>{items.map((t) => <span key={t} className={styles.tag}>{t}</span>)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.part} aria-labelledby="gallery">
        <h2 id="gallery" className={styles.label}>{words.parts.gallery}</h2>
        <ul className={styles.gallery}>
          {shots.map((s, i) => (
            <li key={`${s.src}-${i}`}>
              <button type="button" className={styles.shot} onClick={() => setOpen(i)} aria-label={`${words.shot} ${i + 1}`}>
                <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
                {s.standIn && pill}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.end} aria-label={item.name}>
        <div className={styles.links}>{links}</div>
        <nav className={styles.ways} aria-label="More work">
          {way(prev, words.prev, 'prev')}
          <Link href={ALL_WORK} className={styles.all}>{words.all}</Link>
          {way(next, words.next, 'next')}
        </nav>
      </section>

      <SiteFoot />

      <dialog ref={dialog} className={styles.viewer} onClose={() => setOpen(null)} onClick={(e) => { if (e.target === dialog.current) setOpen(null); }}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }}>
        {open !== null && (
          <>
            <img src={shots[open].src} alt={shots[open].alt} />
            <div className={styles.viewerBar}>
              <button type="button" onClick={() => step(-1)} aria-label={words.prev}>←</button>
              <span>{open + 1} / {shots.length}</span>
              <button type="button" onClick={() => step(1)} aria-label={words.next}>→</button>
              <button type="button" onClick={() => setOpen(null)}>{words.close}</button>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
