import { hex, type PaletteName } from '../config/palette';
import { CARD, TITLE } from './route';

export type GL = WebGL2RenderingContext;

export const MAX_RATIO = 2;

const lin = (name: PaletteName): [number, number, number] => {
  const v = hex(name);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => Math.pow(c / 255, 2.2)) as [number, number, number];
};

const COLORS: [string, PaletteName][] = [
  ['uBg', 'bg'], ['uBg3', 'bg-3'], ['uEmber', 'ember'], ['uFlame', 'flame'], ['uHot', 'hot'], ['uPale', 'pale'],
  ['uCopper', 'copper-light'], ['uCopperDeep', 'copper'], ['uBronze', 'bronze'],
];

export const GROUND = lin('bg').map((c) => Math.pow(c, 1 / 2.2));

// A compiled program with the palette, the title and the card already set on it.
export function program(gl: GL, vs: string, fs: string, attribs: string[] = ['a']) {
  const p = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as [number, string][]) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(`stream shader: ${gl.getShaderInfoLog(sh)}`);
    gl.attachShader(p, sh);
  }
  attribs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`stream program: ${gl.getProgramInfoLog(p)}`);
  const found = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => { if (!found.has(name)) found.set(name, gl.getUniformLocation(p, name)); return found.get(name)!; };
  gl.useProgram(p);
  for (const [name, color] of COLORS) gl.uniform3fv(u(name), lin(color));
  gl.uniform4f(u('uTitle'), TITLE.x, TITLE.y, TITLE.hw, TITLE.hh);
  gl.uniform4f(u('uCard'), CARD.x, CARD.y, CARD.hw, CARD.hh);
  return { p, u };
}

export type Program = ReturnType<typeof program>;
