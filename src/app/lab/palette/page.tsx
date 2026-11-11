import type { Metadata } from 'next';
import { palette, type PaletteName } from '../../../config/palette';
import { LitPortrait } from '../../../components/lab/LitPortrait';
import { PieceView } from '../../../components/PieceView';
import styles from '../../../components/lab/Palette.module.css';

export const metadata: Metadata = { title: 'Study 01 · color and light' };

const SAMPLES: { hex: string; where: string }[] = [
  { hex: '#5b2f00', where: 'The light behind him, at its brightest' },
  { hex: '#3b1b00', where: 'The same light, falling off' },
  { hex: '#1a0700', where: 'Its edge, just before black' },
  { hex: '#160e0d', where: 'The shirt' },
  { hex: '#bb6555', where: 'Skin' },
  { hex: '#633b1a', where: 'Hair' },
];

const FAMILIES: { name: string; note: string; chips: { token: PaletteName; use: string }[] }[] = [
  {
    name: 'Ground',
    note: 'The photo fades to black at its edges. The page starts there.',
    chips: [
      { token: 'bg', use: 'The page' },
      { token: 'bg-2', use: 'A raised surface' },
      { token: 'bg-3', use: 'A surface under the cursor' },
    ],
  },
  {
    name: 'Light',
    note: 'The glow in the photo, carried up to the brightest thing on the page. The hottest point is pale gold, never white.',
    chips: [
      { token: 'ember-deep', use: 'Where light dies away' },
      { token: 'ember', use: 'Soft light on the page. The photo’s own glow' },
      { token: 'flame', use: 'The stream, focus rings, live accents' },
      { token: 'hot', use: 'Bright parts of the stream' },
      { token: 'pale', use: 'Its hottest core' },
    ],
  },
  {
    name: 'Metal',
    note: 'Bronze and copper at the photo’s hue, in place of yellow brass.',
    chips: [
      { token: 'bronze-deep', use: 'Metal in shadow' },
      { token: 'bronze', use: 'Aged metal' },
      { token: 'copper', use: 'Lit metal' },
      { token: 'copper-light', use: 'Highlights, labels, hairlines' },
    ],
  },
  {
    name: 'Text',
    note: 'Warm off white, in three strengths.',
    chips: [
      { token: 'text', use: 'Headings' },
      { token: 'text-2', use: 'Body' },
      { token: 'text-3', use: 'Notes' },
    ],
  },
];

export default function PaletteStudy() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.label}>Study 01 · color and light</p>
          <h1 className={styles.title}>One light, taken from the portrait</h1>
          <p className={styles.lede}>
            The light behind Brandon in his portrait is a deep burnt orange: hue 31, fully saturated, and dark. Every warm color here sits within a few
            degrees of that hue, so the photo, the metal and the light read as one.
          </p>
        </div>
        <div className={styles.sampled}>
          <h2 className={styles.kicker}>Sampled from the photo</h2>
          <ul className={styles.samples}>
            {SAMPLES.map((s) => (
              <li key={s.hex}>
                <span className={styles.dot} style={{ background: s.hex }} aria-hidden="true" />
                <span className={styles.where}>{s.where}</span>
                <span className={styles.hex}>{s.hex}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.photo}>
          <img
            src="/media/portrait-1600.webp"
            srcSet="/media/portrait-960.webp 960w, /media/portrait-1600.webp 1600w"
            sizes="(max-width: 900px) 100vw, 52vw"
            width={1600}
            height={1552}
            alt="Brandon Church in a black shirt, looking to his right, lit against a deep orange glow that fades to black."
          />
          <p className={styles.caption}>The photograph as it is, set straight on the page. Nothing is drawn around it.</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="palette">
        <h2 id="palette" className={styles.kicker}>The palette</h2>
        <div className={styles.families}>
          {FAMILIES.map((f) => (
            <div key={f.name} className={styles.family}>
              <div className={styles.familyHead}>
                <h3 className={styles.familyName}>{f.name}</h3>
                <p className={styles.note}>{f.note}</p>
              </div>
              <ul className={styles.chips}>
                {f.chips.map((c) => (
                  <li key={c.token} className={styles.chip}>
                    <span className={styles.swatch} style={{ background: palette[c.token] }} aria-hidden="true" />
                    <span className={styles.token}>{c.token}</span>
                    <span className={styles.hex}>{palette[c.token]}</span>
                    <span className={styles.use}>{c.use}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="light">
        <h2 id="light" className={styles.kicker}>One light</h2>
        <p className={styles.note}>Move the cursor, or touch the screen. The same light shifts behind the portrait and crosses the metal.</p>
        <div className={styles.pair}>
          <LitPortrait />
          <PieceView name="handheld" className={styles.piece} />
        </div>
        <figure className={styles.before}>
          <img src="/lab/handheld-brass.jpg" width={960} height={600} alt="The same handheld in the second build’s yellow brass." loading="lazy" />
          <figcaption className={styles.note}>Before. The second build’s brass, which did not sit with the photo.</figcaption>
        </figure>
      </section>

      <section className={styles.section} aria-labelledby="type">
        <h2 id="type" className={styles.kicker}>Type in the palette</h2>
        <div className={styles.type}>
          <p className={styles.specLabel}>Sora · display</p>
          <p className={styles.display}>AI Product Engineer</p>
          <p className={styles.specLabel}>Sora · heading</p>
          <p className={styles.heading}>Selected Work</p>
          <p className={styles.specLabel}>Inter · body</p>
          <p className={styles.body}>
            I believe the next decade will bring an explosion of scientific discovery and new human prosperity. I’m making my contribution: AI products,
            end to end, solving problems at every scale.
          </p>
          <p className={styles.specLabel}>JetBrains Mono · labels</p>
          <p className={styles.mono}>Three.js · MCP Server · Public Evals · 2026</p>
          <p className={styles.small}>The words are from the live site and are here only as a specimen.</p>
        </div>
      </section>
    </main>
  );
}
