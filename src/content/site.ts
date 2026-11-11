// Words drawn onto the 3D pieces (screens, keys, engraved parts) and the few interface words the piece host needs.
// Carried from the second build with the pieces. No real names, brands or facts.

export const site = {
  ui: {
    making: 'How this is made',
    makingOn: 'Showing how it is made',
    stats: { triangles: 'triangles', calls: 'draw calls', frame: 'ms a frame' },
  },

  pieces: {
    workbench: {
      tabs: ['city.ts', 'water.ts', 'stage.ts'],
      code: [
        '// the hero: a city that builds itself',
        "import { Stage } from '../world/stage';",
        '',
        'export function buildCity(stage: Stage) {',
        '  const disc = terraces({ radius: 456, levels: 4 });',
        '  const spire = tower({ height: 520, fins: 5 });',
        '  const water = lightWater(CANALS, { speed: 50 });',
        '',
        '  for (const lot of disc.lots) {',
        '    lot.raise(facade(lot, { rooms: true }));',
        '  }',
        '',
        '  stage.clock.onFrame((t) => {',
        '    water.flow(t);',
        '    spire.beacon(t);',
        '  });',
        '',
        '  return { disc, spire, water };',
        '}',
      ],
      frameUnit: 'ms',
      layersTitle: 'Layers',
      layers: ['Plate', 'Engraving', 'Screws', 'Light', 'Shadow'],
      note: 'shine follows the light',
      keys: {
        f: ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Del'],
        mods: { back: 'Back', home: 'Home', tab: 'Tab', pgup: 'PgUp', caps: 'Caps', enter: 'Enter', pgdn: 'PgDn', shift: 'Shift', end: 'End', ctrl: 'Ctrl', alt: 'Alt', fn: 'Fn', up: '↑', left: '←', down: '↓', right: '→' },
      },
    },
    handheld: {
      title: 'Lantern',
      boot: 'made in code',
      power: 'power',
      select: 'select',
      start: 'start',
      a: 'A',
      b: 'B',
      unit: 'm',
    },
    camera: {
      speeds: ['B', '1', '2', '4', '8', '15', '30', '60', '125', '250', '500', '1000'],
      apertures: ['1.4', '2', '2.8', '4', '5.6', '8', '11', '16'],
      distances: ['0.7', '1', '1.5', '2', '3', '5', '10', '∞'],
      unit: 'm',
      lens: '1:1.4   f = 50 mm',
      isos: ['25', '50', '100', '200', '400', '800', '1600'],
      counter: ['S', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '36'],
    },
    rocket: {
      name: 'Lumen',
      stages: ['1', '2'],
    },
  },
} as const;
