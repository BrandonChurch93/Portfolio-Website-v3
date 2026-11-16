// What sculpt R of the rock takes from picture 9 by hand, in the picture's own pixels
// (reference/concept/09-parts/09-the-whole-picture-at-1376.jpg, 1376 by 768), read off ruled enlargements. Only
// what the picture's pixels cannot say by themselves is here: where the planet's own surface is torn, the loose
// boulders in front of the rock (another part's), and where the streams are. Everything else is measured from the
// picture by see.mjs: the land's edge comes from the plan, and the lowest outline is where the open air begins.

// Where the planet's own surface is torn, top to bottom. Left of the first and right of the second the planet is
// whole out to its outer surface (the skin).
export const TORN = {
  left: [[250, 309], [256, 322], [268, 328], [270, 342], [278, 352], [272, 366], [262, 372], [268, 388], [281, 394], [276, 410], [264, 416], [262, 432], [273, 438], [270, 456], [259, 462], [263, 478], [276, 484], [272, 502], [262, 508], [258, 528], [268, 534], [265, 552], [255, 560], [257, 578], [250, 598], [252, 616], [246, 634], [249, 652], [256, 676], [270, 704], [282, 728]],
  right: [[1062, 305], [1060, 318], [1065, 330], [1051, 335], [1048, 352], [1060, 357], [1058, 377], [1043, 383], [1045, 402], [1057, 407], [1053, 428], [1037, 433], [1040, 452], [1053, 457], [1049, 476], [1036, 481], [1042, 500], [1055, 505], [1048, 526], [1032, 531], [1035, 551], [1046, 557], [1038, 574], [1030, 588], [1037, 606], [1046, 626], [1043, 642], [1051, 664], [1044, 688], [1036, 712], [1030, 728]],
};
// The lowest the rock is looked for: under it everything is air or the planet's outline.
export const FLOOR = 728;
// Under this line, across the picture, is not the rock: at each end the lowest rock is in deep shadow over air of
// the same dark, which the picture's pixels cannot tell apart, so it is traced. Between, the air is measured.
export const LOWEST = [[240, 650], [250, 662], [258, 664], [262, 680], [272, 688], [278, 702], [292, 706], [300, 716], [318, 720], [326, 714], [340, 716], [352, 709], [360, 700], [372, 712], [400, 728], [1000, 728], [1012, 712], [1026, 706], [1036, 706], [1060, 700]];
// Rock that is in shadow as dark as the air beside it, traced: the lowest mass at the left and the right side's
// point.
export const KEEP = [
  [[246, 596], [300, 600], [312, 607], [317, 620], [331, 625], [335, 642], [347, 648], [350, 667], [357, 683], [349, 700], [338, 715], [326, 713], [318, 719], [300, 715], [292, 705], [278, 701], [272, 687], [262, 679], [258, 663], [250, 661], [246, 646]],
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
