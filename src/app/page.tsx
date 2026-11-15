import Link from 'next/link';
import { PIECES } from '../config/site';
import styles from './index.module.css';

// Not the home page. A plain index of the work in progress, so each study can be opened on its own.
// The real home page is built in Phase 3 (PLAN.md).
export default function Index() {
  return (
    <main className={styles.main}>
      <p className={styles.label}>Brandon Church · portfolio · third build</p>
      <h1 className={styles.title}>Work in progress</h1>
      <p className={styles.note}>Nothing on this page is designed yet. It lists what can be opened and checked.</p>
      <h2 className={styles.group}>Studies</h2>
      <ul className={styles.list}>
        <li>
          <Link href="/lab/contact">Contact and the footer, a wireframe</Link>
          <span className={styles.minor}>Phase 3 · the first round, turned down: the rocket in the middle with the content either side of it. The second round has one block of content and a pool the rocket launches from</span>
        </li>
        <li>
          <Link href="/lab/desk">The desk, a rough draft</Link>
          <span className={styles.minor}>Phase 3 · the desk for Skills, made new: your pick, the bench, with a mat, an ultrawide, a gaming keyboard and mouse and a PC like your PC Builder&rsquo;s roughed in. Drag to look round it</span>
        </li>
        <li>
          <Link href="/lab/skill-things">The things in the rows of skills, a derby</Link>
          <span className={styles.minor}>Phase 3 · six rough 3D things, two for each row of skills, each struck by the stream and put together from the strike. Press one to strike it again</span>
        </li>
        <li>
          <Link href="/lab/skills-about-draft">Skills and About, a fuller draft</Link>
          <span className={styles.minor}>Phase 3 · the pair with your words and the motion roughed in, seventh round: the stream strikes each row of skills, the headphones hang on a hook, and your portrait is the ground of About</span>
        </li>
        <li>
          <Link href="/lab/skills-about">Skills and About, as a pair</Link>
          <span className={styles.minor}>Phase 3 · a rough draft of the two sections: the desk with the PC under it, the headphones by the title, the rail behind his portrait, and each section dark until the stream reaches it</span>
        </li>
        <li>
          <Link href="/lab/accomplishments">Accomplishments, a derby in three parts</Link>
          <span className={styles.minor}>Phase 3 · three layouts for the section, the cards each is made of, and five ways to show the companies, in bronze relief. Set aside: not what he pictured</span>
        </li>
        <li>
          <Link href="/lab/home">The whole page, sketched</Link>
          <span className={styles.minor}>Phase 3 · a wireframe from the hero to the footer, with the stream&rsquo;s route and the 3D pieces as outlines</span>
        </li>
        <li>
          <Link href="/lab/work-blanks">Four blanks</Link>
          <span className={styles.minor}>Phase 3 · the sleeping card in mirror bronze, four ways. He picked the engine turned dial</span>
        </li>
        <li>
          <Link href="/lab/palette">Color and light</Link>
          <span className={styles.minor}>Phase 1 · the palette from the portrait</span>
        </li>
        <li>
          <Link href="/lab/buttons">Buttons</Link>
          <span className={styles.minor}>Phase 1 · primary and accent in lit metal</span>
        </li>
        <li>
          <Link href="/lab/pour">The pour</Link>
          <span className={styles.minor}>Phase 2 · the test shot</span>
        </li>
        <li>
          <Link href="/lab/pour-looks">The pour&rsquo;s look</Link>
          <span className={styles.minor}>Phase 2 · three ways to draw the metal</span>
        </li>
        <li>
          <Link href="/lab/stream-ideas">Ideas for the stream</Link>
          <span className={styles.minor}>Phase 2 · threads, copper leaf and ink, as rough sketches</span>
        </li>
        <li>
          <Link href="/lab/stream-core">A core of light, two ways</Link>
          <span className={styles.minor}>Phase 2 · shards riding a wave of light, and the same on an arc</span>
        </li>
        <li>
          <Link href="/lab/stream-facets">Two looks for the facets</Link>
          <span className={styles.minor}>Phase 2 · the shards as cut pieces, and as jagged splinters</span>
        </li>
        <li>
          <Link href="/lab/stream">The stream</Link>
          <span className={styles.minor}>Phase 2 · the test shot, second round · facets, following the scroll</span>
        </li>
        <li>
          <Link href="/lab/work-cards">The card</Link>
          <span className={styles.minor}>Phase 3 · the project card with the real words and pictures · three layouts, three ways for the picture to rest</span>
        </li>
        <li>
          <Link href="/lab/work-pairing">Blade or Steps</Link>
          <span className={styles.minor}>Phase 3 · the sun stone beside the rail with each finial</span>
        </li>
        <li>
          <Link href="/lab/work-finials">Three finials</Link>
          <span className={styles.minor}>Phase 3 · what finishes the ends of the rail</span>
        </li>
        <li>
          <Link href="/lab/work-guardians">Three guardians</Link>
          <span className={styles.minor}>Phase 3 · statues in place of the posts and the rail&rsquo;s end pieces</span>
        </li>
        <li>
          <Link href="/lab/work-objects">Three posts, three rails</Link>
          <span className={styles.minor}>Phase 3 · designs for the things the stream meets in Work</span>
        </li>
        <li>
          <Link href="/lab/work-draft">Work, three ways</Link>
          <span className={styles.minor}>Phase 3 · a wireframe of the Work section round the stream, three layouts</span>
        </li>
        <li>
          <Link href="/lab/stream?hold">The stream, held</Link>
          <span className={styles.minor}>Phase 2 · a paused frame, only the cursor&rsquo;s light moves</span>
        </li>
        <li>
          <Link href="/lab/stream?shards=first">The stream, with the first round&rsquo;s shards</Link>
          <span className={styles.minor}>Phase 2 · copper leaf and glass, to compare. The switch on the page swaps the two</span>
        </li>
        <li>
          <Link href="/lab/work-blank">The blank</Link>
          <span className={styles.minor}>Phase 3 · the engine turned blank a sleeping card is, alone, with the band of light that wakes it</span>
        </li>
        <li>
          <Link href="/lab/work">The stream through Work</Link>
          <span className={styles.minor}>Phase 3 · the real stream on its route through the Work section: the cards, the stones, the rail and a working category bar</span>
        </li>
      </ul>
      <h2 className={styles.group}>Pieces carried from the second build</h2>
      <ul className={styles.list}>
        {PIECES.map((name) => (
          <li key={name}>
            <Link href={`/lab/piece/${name}`}>{name}</Link>
            <Link href={`/lab/piece/${name}?entrance=1`} className={styles.minor}>with its entrance</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
