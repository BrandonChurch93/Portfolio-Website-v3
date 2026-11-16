// What sculpt R of the rock takes from picture 9 by hand, in the picture's own pixels
// (reference/concept/09-parts/09-the-whole-picture-at-1376.jpg, 1376 by 768), read off ruled enlargements. Only
// what the picture's pixels cannot say by themselves is here: where the planet's own surface is torn, the loose
// boulders in front of the rock (another part's), and where the streams are. Everything else is measured from the
// picture by see.mjs: the land's edge comes from the plan, and the lowest outline is where the open air begins.

// Where the planet's own surface is torn, top to bottom. Left of the first and right of the second the planet is
// whole out to its outer surface (the skin).
export const TORN = {
  left: [[250, 309], [255, 326], [266, 342], [276, 352], [271, 371], [279, 391], [270, 410], [265, 431], [272, 451], [269, 470], [276, 490], [266, 512], [261, 531], [268, 549], [262, 571], [255, 598], [250, 622], [248, 648], [256, 676], [270, 704], [282, 728]],
  right: [[1062, 305], [1056, 328], [1063, 350], [1053, 379], [1049, 409], [1045, 440], [1051, 470], [1041, 500], [1046, 530], [1037, 558], [1030, 586], [1038, 612], [1046, 640], [1050, 664], [1044, 688], [1036, 712], [1030, 728]],
};
// The lowest the rock is looked for: under it everything is air or the planet's outline.
export const FLOOR = 728;
// Under this line, across the picture, is not the rock: at each end the lowest rock is in deep shadow over air of
// the same dark, which the picture's pixels cannot tell apart, so it is traced. Between, the air is measured.
export const LOWEST = [[240, 650], [252, 668], [262, 688], [276, 704], [294, 716], [318, 722], [338, 717], [352, 709], [360, 700], [372, 712], [400, 728], [1000, 728], [1012, 712], [1026, 706], [1036, 706], [1060, 700]];
// Rock that is in shadow as dark as the air beside it, traced: the lowest mass at the left and the right side's
// point.
export const KEEP = [
  [[246, 596], [300, 600], [330, 640], [352, 700], [338, 716], [318, 721], [294, 715], [276, 703], [262, 687], [252, 667], [246, 646]],
  [[1046, 648], [1050, 664], [1044, 688], [1036, 704], [1026, 704], [1016, 690], [1010, 670], [1022, 660], [1040, 650]],
];

// The two loose boulders in front of the rock and over the air, which belong to what broke away. They are painted
// out of the reading, and what they cover is taken as air.
export const BOULDERS = [
  [[372, 600], [396, 584], [432, 586], [462, 594], [488, 612], [504, 640], [500, 668], [478, 690], [440, 700], [404, 690], [380, 664], [370, 630]],
  [[836, 622], [858, 600], [890, 590], [930, 592], [958, 606], [966, 640], [958, 676], [930, 698], [890, 702], [856, 688], [838, 660]],
];

// The streams in front of the rock: the stream from the core and the five small ones, each as where it is across
// at its top, its top and its foot, in the picture's pixels. Their light is found along them and painted out.
export const STREAMS = [
  { x: 688, from: 520, to: 768, main: true },
  { x: 385, from: 636, to: 768 },
  { x: 500, from: 560, to: 768 },
  { x: 620, from: 574, to: 740 },
  { x: 748, from: 548, to: 712 },
  { x: 812, from: 503, to: 740 },
  { x: 1010, from: 650, to: 768 },
];
// The core: its middle and the radius that covers it and its rim of light.
export const CORE = { at: [688, 437], r: 97 };
