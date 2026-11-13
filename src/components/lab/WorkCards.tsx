'use client';

import { useEffect, useState } from 'react';
import { software } from '../../content/work';
import { CARD_LOOK, WorkCard, type CardLook } from '../WorkCard';
import styles from './WorkCards.module.css';

type Choice<K extends keyof CardLook> = { value: CardLook[K]; name: string };
const REVEALS: Choice<'reveal'>[] = [
  { value: 'fade', name: 'A · Fade' },
  { value: 'push', name: 'B · Fade, coming closer' },
  { value: 'sweep', name: 'C · Sweep' },
  { value: 'lights', name: 'D · Lights first' },
];
const TURNS: Choice<'turn'>[] = [
  { value: 0, name: 'None' },
  { value: 3, name: '3°' },
  { value: 6, name: '6°' },
  { value: 10, name: '10°' },
];
const LEANS: Choice<'lean'>[] = [
  { value: 'away', name: 'Away from the cursor' },
  { value: 'toward', name: 'Toward the cursor' },
];
const GROWS: Choice<'grow'>[] = [
  { value: 0.015, name: '1.5%' },
  { value: 0.03, name: '3%' },
  { value: 0.05, name: '5%' },
];
const EDGES: Choice<'edge'>[] = [
  { value: 'thin', name: 'Thin' },
  { value: 'deep', name: 'Deep' },
];

function Switch<K extends keyof CardLook>({ label, choices, look, field, set }: { label: string; choices: Choice<K>[]; look: CardLook; field: K; set: (l: CardLook) => void }) {
  return (
    <div className={styles.choice}>
      <p className={styles.choiceName}>{label}</p>
      <div className={styles.switch} role="group" aria-label={label}>
        {choices.map((c) => (
          <button key={c.name} type="button" aria-pressed={look[field] === c.value} onClick={() => set({ ...look, [field]: c.value })}>{c.name}</button>
        ))}
      </div>
    </div>
  );
}

export function WorkCards() {
  const [look, setLook] = useState<CardLook>(CARD_LOOK);

  // ?reveal=sweep&turn=10&lean=toward&grow=0.05&edge=deep opens the page on those choices, for stills.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const pick = <K extends keyof CardLook>(field: K, choices: Choice<K>[]): CardLook[K] | undefined => {
      const v = q.get(field);
      return v === null ? undefined : choices.find((c) => String(c.value) === v)?.value;
    };
    setLook((l) => ({
      reveal: pick('reveal', REVEALS) ?? l.reveal,
      turn: pick('turn', TURNS) ?? l.turn,
      lean: pick('lean', LEANS) ?? l.lean,
      grow: pick('grow', GROWS) ?? l.grow,
      edge: pick('edge', EDGES) ?? l.edge,
    }));
  }, []);

  const held = typeof location !== 'undefined' && new URLSearchParams(location.search).get('held');
  const at = held ? (held.split(',').map(Number) as [number, number]) : undefined;
  const key = `${look.reveal}-${look.turn}-${look.lean}-${look.grow}-${look.edge}`;

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 14 · the card · third round</p>
      <h1 className={styles.title}>The card</h1>
      <p className={styles.lede}>
        One card to try things on. Put the cursor on it and move it about: the card turns, and the light on its edge turns with it.
        Each switch changes one thing. The four cards below follow the same switches. On a touch screen nothing turns, so try this with
        a mouse or a trackpad.
      </p>

      <div id="try" className={styles.bench}>
        <div className={styles.stand}>
          <WorkCard key={key} item={software[0]} look={look} held={at} />
        </div>
        <div className={styles.choices}>
          <Switch label="How the picture's colors come back" choices={REVEALS} look={look} field="reveal" set={setLook} />
          <Switch label="How far the card turns" choices={TURNS} look={look} field="turn" set={setLook} />
          <Switch label="Which way it leans" choices={LEANS} look={look} field="lean" set={setLook} />
          <Switch label="How much it grows" choices={GROWS} look={look} field="grow" set={setLook} />
          <Switch label="The edge" choices={EDGES} look={look} field="edge" set={setLook} />
        </div>
      </div>

      <h2 id="grid" className={styles.group}>In the grid · at the size on the page</h2>
      <p className={styles.hint}>Four real projects, laid out as the Work section lays them out, with the choices above.</p>
      <div className={styles.grid}>
        {software.map((item) => <WorkCard key={`${item.slug}-${key}`} item={item} look={look} />)}
      </div>
    </main>
  );
}
