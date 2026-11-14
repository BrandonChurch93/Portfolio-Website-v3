import { APRON, type Desk as DeskPlan } from '../../skills-about/plan';
import type { Pt } from '../../page-sketch/plan';
import styles from './DeskOutline.module.css';

const quad = (pts: Pt[]) => pts.map((q) => `${q[0]},${q[1]}`).join(' ');

// The desk as proposed: longer, its front edge running down to the left, the PC under its near end. An outline at the
// size and angle it would have. The desk itself is designed and made as its own piece of work.
export function Desk({ desk, shown, on, lively }: { desk: DeskPlan; shown: boolean; on: boolean; lively?: boolean }) {
  const [bl, br, fr, fl] = desk.top, a = APRON, f = desk.pc, [px, py] = f[0], h = f[3][1] - py;
  const at = (x: number, y: number): Pt => [px + x, py + y - x * 0.146];
  return (
    <g className={styles.obj} data-shown={shown} data-on={on} data-lively={lively ?? false}>
      <polygon pathLength={1} points={quad([[br[0] - 8, br[1] + a], [br[0] + 12, br[1] + a], [br[0] + 12, br[1] + 200], [br[0] - 8, br[1] + 204]])} className={styles.solid} />
      <polygon pathLength={1} points={quad([[190, 533], [206, 531], [206, 636], [190, 640]])} className={styles.solid} />
      <polygon pathLength={1} points={quad([f[1], [f[1][0] + 20, f[1][1] - 12], [f[2][0] + 20, f[2][1] - 14], f[2]])} className={styles.solid} />
      <polygon pathLength={1} points={quad(f)} className={styles.solid} />
      <polygon pathLength={1} points={quad([at(10, 12), [f[1][0] - 10, f[1][1] + 13], [f[2][0] - 10, f[2][1] - 10], [f[3][0] + 10, f[3][1] - 12]])} className={`${styles.dim} ${styles.lit}`} />
      {[0.25, 0.51, 0.77].map((t) => <circle pathLength={1} key={t} cx={at(27, h * t)[0]} cy={at(27, h * t)[1]} r={h * 0.088} className={`${styles.ring} ${styles.lit}`} />)}
      <circle pathLength={1} cx={at(84, h * 0.25)[0]} cy={at(84, h * 0.25)[1]} r={h * 0.082} className={`${styles.ring} ${styles.lit}`} />
      <polygon pathLength={1} points={quad([at(52, h * 0.47), at(112, h * 0.47), at(112, h * 0.59), at(52, h * 0.59)])} className={styles.ink} />
      <polygon pathLength={1} points={quad([br, fr, [fr[0], fr[1] + a], [br[0], br[1] + a]])} className={styles.solid} />
      <polygon pathLength={1} points={quad([fr, fl, [fl[0], fl[1] + a], [fr[0], fr[1] + a]])} className={styles.solid} />
      <polygon pathLength={1} points={quad([[158, 538], [184, 534], [184, 748], [158, 748]])} className={styles.solid} />
      <polygon pathLength={1} points={quad([[fr[0] - 24, fr[1] + a + 4], [fr[0], fr[1] + a], [fr[0], fr[1] + 210 - (desk.long ? 26 : 0)], [fr[0] - 24, fr[1] + 214 - (desk.long ? 26 : 0)]])} className={styles.solid} />
      <polygon pathLength={1} points={quad([bl, br, fr, fl])} className={styles.solid} />
      <polygon pathLength={1} points={quad([[600, 246], [684, 254], [706, 420], [540, 416]])} className={`${styles.cone} ${styles.lit}`} />
      <polygon pathLength={1} points={quad([[440, 340], [464, 338], [466, 386], [442, 388]])} className={styles.solid} />
      <ellipse pathLength={1} cx={454} cy={392} rx={62} ry={12} className={styles.solid} />
      <polygon pathLength={1} points={quad([[292, 172], [604, 148], [608, 336], [298, 362]])} className={styles.solid} />
      <polygon pathLength={1} points={quad([[304, 184], [594, 162], [597, 326], [309, 350]])} className={`${styles.glass} ${styles.lit}`} />
      <polygon pathLength={1} points={quad([[204, 440], [326, 424], [338, 474], [210, 492]])} className={styles.solid} />
      <polygon pathLength={1} points={quad([[214, 448], [318, 434], [327, 468], [219, 483]])} className={`${styles.glass} ${styles.lit}`} />
      <polygon pathLength={1} points={quad([[372, 440], [566, 416], [580, 446], [382, 472]])} className={styles.solid} />
      <ellipse pathLength={1} cx={600} cy={432} rx={15} ry={10} className={styles.solid} />
      <ellipse pathLength={1} cx={640} cy={392} rx={28} ry={7} className={styles.solid} />
      <line pathLength={1} x1={640} y1={390} x2={628} y2={236} className={styles.leg} />
      <polygon pathLength={1} points={quad([[598, 206], [670, 216], [688, 256], [594, 246]])} className={styles.solid} />
      {desk.long && (
        <>
          <polygon pathLength={1} points={quad([[850, 352], [1010, 334], [1026, 372], [862, 392]])} className={styles.solid} />
          <line pathLength={1} x1={938} y1={343} x2={946} y2={382} className={styles.ink} />
          <ellipse pathLength={1} cx={1120} cy={338} rx={20} ry={9} className={styles.solid} />
          <path pathLength={1} d="M1100 338 v-30 h40 v30" className={styles.solid} />
        </>
      )}
    </g>
  );
}

// A pair of over ear headphones hanging from a hook, of the site's own design.
export function Phones({ at, shown, lively }: { at: { x: number; y: number }; shown: boolean; lively?: boolean }) {
  return (
    <g className={styles.obj} data-shown={shown} data-on={shown} data-lively={lively ?? false} transform={`translate(${at.x} ${at.y})`}>
      <line pathLength={1} x1={0} y1={-16} x2={0} y2={4} className={styles.leg} />
      <circle pathLength={1} cx={0} cy={4} r={5} className={styles.solid} />
      <path pathLength={1} d="M-46 92 C-46 30 -26 8 0 8 C26 8 46 30 46 92" className={styles.ink} />
      <path pathLength={1} d="M-37 92 C-37 38 -21 17 0 17 C21 17 37 38 37 92" className={styles.ink} />
      <rect pathLength={1} x={-62} y={78} width={32} height={62} rx={13} className={styles.solid} />
      <rect pathLength={1} x={30} y={78} width={32} height={62} rx={13} className={styles.solid} />
      <rect pathLength={1} x={-36} y={88} width={8} height={42} rx={4} className={styles.ink} />
      <rect pathLength={1} x={28} y={88} width={8} height={42} rx={4} className={styles.ink} />
    </g>
  );
}
