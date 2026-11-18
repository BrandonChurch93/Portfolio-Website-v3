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
import { Still } from '../Still';
import styles from './ContactLab.module.css';

// The pad is mounted from this many screens away, so it is not being built as the stream reaches it.
const REACH = 5;
const u = (n: number) => `calc(var(--u) * ${Number(n.toFixed(2))})`;
const P = CONTACT.plate;
const FIELDS = ['name', 'email', 'message'] as const;
type Field = (typeof FIELDS)[number];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [ui, setUi] = useState(!hub);
  // Whether the screen is wide enough for the layout. Narrower, the page is one column: the plate in plain paint,
  // and the pad under it, live, with the stream falling beside the plate onto its stone.
  const [wide, setWide] = useState<boolean | null>(null);
  const [live, setLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  // The fields the form was sent with empty or wrong. The plate says so itself, in place of the browser's bubble.
  const [wrong, setWrong] = useState<Partial<Record<Field, boolean>>>({});
  const sentAt = useRef<HTMLDivElement>(null), was = useRef(state);

  useEffect(() => {
    setUi(new URLSearchParams(location.search).get('ui') !== '0' && !hub);
    const fits = matchMedia(`(min-width: ${BOARD.least}px)`), read = () => setWide(fits.matches);
    read();
    fits.addEventListener('change', read);
    return () => fits.removeEventListener('change', read);
  }, []);

  useEffect(() => {
    if (wide === null || !page.current || !board.current || !section.current) return;
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

  // Focus goes with what replaced the thing it was on: to the confirmation when the form has gone, and back to the
  // first field when the form is asked for again.
  useEffect(() => {
    if (state === 'sent') sentAt.current?.focus({ preventScroll: true });
    else if (was.current === 'sent') form.current?.querySelector<HTMLElement>('[name="name"]')?.focus({ preventScroll: true });
    was.current = state;
  }, [state]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === 'sending') return;
    const el = e.currentTarget, data = new FormData(el), said = (k: Field) => String(data.get(k) ?? '').trim();
    const bad = { name: !said('name'), email: !EMAIL.test(said('email')), message: !said('message') };
    setWrong(bad);
    const first = FIELDS.find((k) => bad[k]);
    if (first) { el.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); return; }
    setState('sending');
    const ok = await send(el);
    if (ok) form.current?.reset();
    setState(ok ? 'sent' : 'failed');
  };
  const typed = (e: FormEvent<HTMLFormElement>) => {
    const k = (e.target as HTMLInputElement).name as Field;
    if (wrong[k]) setWrong((w) => ({ ...w, [k]: false }));
  };

  const F = contact.form;
  const cap = (k: Field) => <span className={styles.cap}><span>{F[k]}</span><em>{wrong[k] ? F.wrong[k] : ''}</em></span>;
  return (
    <Shell ref={page} className={styles.page} data-wide={wide ?? undefined} data-embed={hub ? '' : undefined}>
      {ui && (
        <div className={styles.head}>
          <p className={styles.label}>Study 28 · Contact</p>
          <p className={styles.note}>Scroll. The stream falls to the stone, the plate wakes, the stone lights from its rim in, and the rocket goes. The hero, the navigation and the footer&rsquo;s design are not here yet, and the words are stand ins.</p>
        </div>
      )}
      <div ref={board} className={styles.board} data-live={live || undefined}>
        <section ref={section} id="contact" className={styles.contact} aria-labelledby={`${id}-title`} style={{ height: u(CONTACT.h) }}>
          <div className={styles.pad} data-part="pad" style={{ left: u(PAD.l), width: u(PAD.w), '--foot': PAD.b } as CSSProperties}>
            {wide !== null && <PieceView name="pad" reach={REACH} early className={styles.piece} onPiece={(p: Piece | null) => { pad.current = p as PadPiece | null; setLive(!!p); }} />}
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
              {state !== 'sent' && <p className={styles.rule}><span>{contact.rule}</span></p>}
              {state === 'sent' ? (
                <div ref={sentAt} tabIndex={-1} className={styles.sent} role="status">
                  <p className={styles.sentHead}>{F.sent[0]}</p>
                  <p className={styles.sentBody}>{F.sent[1]}</p>
                  <button type="button" className={styles.again} onClick={() => setState('idle')}>{F.again}</button>
                </div>
              ) : (
                <form ref={form} className={styles.form} onSubmit={submit} onInput={typed} noValidate aria-busy={state === 'sending'}>
                  <input type="text" name="_honey" className={styles.honey} tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  <div className={styles.pair}>
                    <label className={styles.field}>
                      {cap('name')}
                      <input name="name" type="text" required maxLength={100} autoComplete="name" aria-invalid={wrong.name || undefined} />
                    </label>
                    <label className={styles.field}>
                      {cap('email')}
                      <input name="email" type="email" required maxLength={254} autoComplete="email" aria-invalid={wrong.email || undefined} />
                    </label>
                  </div>
                  <label className={`${styles.field} ${styles.message}`}>
                    {cap('message')}
                    <textarea name="message" required rows={4} maxLength={5000} aria-invalid={wrong.message || undefined} />
                  </label>
                  <MetalButton label={state === 'sending' ? F.sending : F.send} variant="accent" submit disabled={state === 'sending'} className={styles.send} />
                  <span className="visually-hidden" role="alert">{state === 'failed' ? F.failed : ''}</span>
                </form>
              )}
              {/* A message that did not send says so where his city stands, so nothing on the plate moves. */}
              <p className={styles.based} data-failed={state === 'failed' || undefined} aria-hidden={state === 'failed' || undefined}>{state === 'failed' ? F.failed : contact.based}</p>
            </div>
          </div>
          <Still name="pad" className={styles.still} />
        </section>
        {/* On the whole page the site's own foot stands under the page (SiteFoot). Alone, this page keeps a plain one. */}
        {!hub && (
          <footer className={styles.foot} style={{ height: u(CONTACT.foot) }}>
            <p>{contact.foot.line} · © {new Date().getFullYear()}</p>
            <ul>
              {contact.foot.links.filter((l) => !('held' in l)).map((l) => <li key={l.label}><a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}>{l.label}</a></li>)}
            </ul>
          </footer>
        )}
      </div>
    </Shell>
  );
}
