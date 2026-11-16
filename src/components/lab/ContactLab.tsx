'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { BOARD, CONTACT, PAD } from '../../contact/board';
import { send } from '../../contact/send';
import type { ContactStage } from '../../contact/stage';
import { contact } from '../../content/contact';
import type { PadPiece } from '../../pieces/pad/index';
import type { Piece } from '../../world/piece';
import { MetalButton } from '../MetalButton';
import { PieceView } from '../PieceView';
import { Plate } from '../Plate';
import type { Hub } from '../../whole/hub';
import { Shell } from './Shell';
import styles from './ContactLab.module.css';

// The pad is mounted from this many screens away, so it is not being built as the stream reaches it.
const REACH = 5;
const u = (n: number) => `calc(var(--u) * ${Number(n.toFixed(2))})`;
const P = CONTACT.plate;

// Contact, built for real (BRIEF.md, Settled, "Contact, the first build"). The page only lays things out: the
// title, the one plate that holds everything, the launch pad (src/pieces/pad) and a plain footer. The stream plans
// its route from where they are (src/stream/route-contact.ts), and what its landing sets going is in
// src/contact/stage.ts: the plate woken by its band, the stone lit from its rim in, the rocket launched.
// The plate is one of the cards' family, asleep as the same blank. Its words and its form are in the page, over it,
// so they are always there for a screen reader. The words are stand ins and his to write.
// ?wake=0.45 holds the plate's band that far across, and ?ui=0 hides the label.
// On a page with more sections than this one (hub), it hands the hub its plan and the hub mounts the one stream.
export function ContactLab({ hub }: { hub?: Hub }) {
  const id = useId().replace(/:/g, '');
  const page = useRef<HTMLElement>(null), board = useRef<HTMLDivElement>(null), section = useRef<HTMLElement>(null), form = useRef<HTMLFormElement>(null);
  const pad = useRef<PadPiece | null>(null);
  const [ui, setUi] = useState(true);
  // Whether the screen is wide enough for the layout. Narrower, the page is a plain stand in with no stream and no pad.
  const [wide, setWide] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  useEffect(() => {
    setUi(new URLSearchParams(location.search).get('ui') !== '0' && !hub);
    const fits = matchMedia(`(min-width: ${BOARD.least}px)`), read = () => setWide(fits.matches);
    read();
    fits.addEventListener('change', read);
    return () => fits.removeEventListener('change', read);
  }, []);

  useEffect(() => {
    if (!wide || !page.current || !board.current || !section.current) return;
    let made: ContactStage | null = null, gone = false;
    void import('../../contact/stage').then(({ mountContact }) => {
      if (gone) return;
      made = mountContact({ page: hub?.page() ?? page.current!, board: board.current!, contact: section.current!, pad: () => pad.current }, hub?.contact(section.current!));
    });
    return () => { gone = true; made?.dispose(); };
  }, [wide, hub]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email.address);
    } catch {
      const t = document.createElement('textarea');
      t.value = contact.email.address;
      t.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    const ok = await send(e.currentTarget);
    if (ok) form.current?.reset();
    setState(ok ? 'sent' : 'failed');
  };

  const F = contact.form;
  return (
    <Shell ref={page} className={styles.page} data-wide={wide ?? undefined} data-embed={hub ? '' : undefined}>
      {ui && (
        <div className={styles.head}>
          <p className={styles.label}>Study 28 · Contact</p>
          <p className={styles.note}>Scroll. The stream falls to the stone, the plate wakes, the stone lights from its rim in, and the rocket goes. The hero, the navigation and the footer&rsquo;s design are not here yet, and the words are stand ins.</p>
        </div>
      )}
      <div ref={board} className={styles.board}>
        <section ref={section} id="contact" className={styles.contact} aria-labelledby={`${id}-title`} style={{ height: u(CONTACT.h) }}>
          <div className={styles.pad} data-part="pad" style={{ left: u(PAD.l), width: u(PAD.w), '--foot': PAD.b } as CSSProperties}>
            {wide && <PieceView name="pad" reach={REACH} className={styles.piece} onPiece={(p: Piece | null) => { pad.current = p as PadPiece | null; }} />}
          </div>
          <h2 id={`${id}-title`} className={styles.title} data-part="title" style={{ left: u(CONTACT.title.l), top: u(CONTACT.title.t), fontSize: u(CONTACT.title.size) }}>{contact.title}</h2>
          <div className={styles.plate} data-part="plate" data-plate-area="" style={{ left: u(P.l), top: u(P.t), width: u(P.w), height: u(P.h) }}>
            {wide && <Plate finish="card" kind="card" card={{ aspect: P.w / P.h, edge: 'deep', plain: true }} tilt={false} className={styles.metal} />}
            <div className={styles.content} data-part="content" style={{ padding: u(P.pad) }}>
              <div className={styles.actions}>
                <MetalButton label={contact.calendly.label} href={contact.calendly.href} className={styles.book} />
                <MetalButton label={copied ? contact.email.copied : contact.email.label} variant="accent" onClick={copy} className={styles.copy} />
                <span className="visually-hidden" role="status">{copied ? 'Email address copied' : ''}</span>
              </div>
              <p className={styles.rule}><span>{contact.rule}</span></p>
              {state === 'sent' ? (
                <div className={styles.sent} role="status">
                  <p className={styles.sentHead}>{F.sent[0]}</p>
                  <p className={styles.sentBody}>{F.sent[1]}</p>
                  <button type="button" className={styles.again} onClick={() => setState('idle')}>{F.again}</button>
                </div>
              ) : (
                <form ref={form} className={styles.form} onSubmit={submit} aria-busy={state === 'sending'}>
                  <input type="text" name="_honey" className={styles.honey} tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  <div className={styles.pair}>
                    <label className={styles.field}>
                      <span>{F.name}</span>
                      <input name="name" type="text" required autoComplete="name" />
                    </label>
                    <label className={styles.field}>
                      <span>{F.email}</span>
                      <input name="email" type="email" required autoComplete="email" />
                    </label>
                  </div>
                  <label className={`${styles.field} ${styles.message}`}>
                    <span>{F.message}</span>
                    <textarea name="message" required rows={4} />
                  </label>
                  <button type="submit" className={styles.send} disabled={state === 'sending'}>
                    <span>{state === 'sending' ? F.sending : F.send}</span>
                    <span aria-hidden="true" className={styles.arrow}>{state === 'sending' ? '…' : '→'}</span>
                  </button>
                  <p className={styles.failed} role="alert">{state === 'failed' ? F.failed : ''}</p>
                </form>
              )}
              <p className={styles.based}>{contact.based}</p>
            </div>
          </div>
        </section>
        <footer className={styles.foot} style={{ height: u(CONTACT.foot) }}>
          <p>{contact.foot.line} · © {new Date().getFullYear()}</p>
          <ul>
            {contact.foot.links.map((l) => <li key={l.label}><a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}>{l.label}</a></li>)}
          </ul>
        </footer>
      </div>
    </Shell>
  );
}
