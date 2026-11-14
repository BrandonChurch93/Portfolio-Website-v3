// The blank a sleeping card is: a plate engine turned as a watchmaker turns a dial, with a knob from a piece of
// antique furniture at its dead center. Fine rays cut round the card's middle, the knob standing off them on a stem,
// and a polished step inside the card's own edge.
//
// This is its shape, worked out per pixel, for the card's own plate (./shaders.ts), which shows it the room, the
// lamp, the stream's leading end and the band that wakes it.
//
// Everything is in the card's own units (460 across) from the card's middle, with y down the page.

export const DIAL = {
  // How many rays are cut round the middle. Each is a shallow V: two flanks that face a little apart.
  rays: 300,
  // The knob. It is seen from straight in front, so what shows is its head: how wide the head is, from its middle
  // to its rim. It is never smaller than the study's handle, which was 30.
  knob: 46,
  // How far the head stands off the dial, on its stem. Nothing of that shows head on except by what it does: the
  // shadow the head throws lands this far up the light's slope from the head, and the head moves this far against
  // the dial for each unit the card leans. He ruled it has to poke out of the card and never be a slight raise.
  stand: 44,
  // The stem under the head, where it is thinnest. Only its shadow is ever seen.
  stem: 12,
  // How many beads ring the head.
  beads: 30,
  // How far the head is domed: how much higher its middle is than its rim, where the head is 42 from middle to rim.
  // It is what lets the light fall across the head. Flat, the head is a medal.
  dome: 18,
  // The polished step inside the card's edge: where its groove is, and where the rays begin.
  step: 9.4,
};

export const DIAL_SHAPE = `
const float DIAL_RAYS = ${DIAL.rays.toFixed(1)};
const float KNOB_R = ${DIAL.knob.toFixed(1)};
// The head is drawn 42 across from middle to rim, and scaled to the size it is.
const float KNOB_SIZE = ${(DIAL.knob / 42).toFixed(4)};
const float KNOB_STAND = ${DIAL.stand.toFixed(1)};
const float KNOB_STEM = ${DIAL.stem.toFixed(1)};
const float KNOB_BEADS = ${DIAL.beads.toFixed(1)};
// How much higher the middle of the head is than its rim, in the units the head is drawn in.
const float KNOB_DOME = ${DIAL.dome.toFixed(1)};
const float DIAL_STEP = ${DIAL.step.toFixed(1)};

// Which flank of its ray a point is on, 0 to 1, taken over the pixel it is in: a ray finer than a pixel is its two
// flanks in equal parts, so the rays never crawl or beat against the screen. foot is how many units a pixel
// covers. cut is how much of the pixel is the foot of a V, and which is the ray's own number.
float dialRays(vec2 q, float foot, out float cut, out float which){
  float rho = max(length(q), 1e-3);
  float x = atan(q.y, q.x) / 6.2831853 * DIAL_RAYS;
  float w = max(1.3 * foot * DIAL_RAYS / (6.2831853 * rho), 1e-3);
  float a = x - 0.5 * w, b = x + 0.5 * w;
  float flank = ((floor(b) * 0.5 + min(fract(b), 0.5)) - (floor(a) * 0.5 + min(fract(a), 0.5))) / w;
  const float d = 0.16;
  float line = ((floor(b) * d + min(fract(b), d)) - (floor(a) * d + min(fract(a), d))) / w;
  float seen = 1.0 - smoothstep(0.22, 0.5, w);
  cut = mix(d, line, seen);
  which = floor(x);
  return mix(0.5, flank, seen);
}

// One ring of petals in relief: n of them round the middle, the ring turned by turn. Each lies along a line from
// the middle, from u0 out to u1, w wide at its widest, which is further toward its tip the larger fat is. It
// returns how high the petal stands at the point, 0 to 1, rounded from side to side. across is how far over the
// point is from the petal's middle line to its edge, and along how far it is from the petal's root to its tip.
float knobPetals(vec2 q, float n, float turn, float u0, float u1, float w, float fat, out float across, out float along){
  float seg = 6.2831853 / n;
  float a = mod(atan(q.y, q.x) + turn + 0.5 * seg, seg) - 0.5 * seg;
  float r = length(q), u = r * cos(a), v = r * sin(a);
  along = clamp((u - u0) / (u1 - u0), 0.0, 1.0);
  // Where its neighbours are closer than it is wide, it runs up against them, and a crease is left between the two.
  float wide = min(w * pow(sin(3.14159 * pow(along, fat)), 0.8), r * sin(0.5 * seg) * 1.04);
  across = v / max(wide, 1e-3);
  float inside = 1.0 - across * across;
  return inside > 0.0 && u > u0 && u < u1 ? sqrt(inside) : 0.0;
}

// How high the knob's head stands at a point from its middle, above the plane its rim lies in. From the rim in:
// the rim, rolled over to the head's side. A channel set with a ring of beads, large enough to hold as beads on
// an ordinary screen. A half round moulding. Then the face, with a rosette cut in relief on it: eight long
// pointed leaves, each with a rib, and over the gaps between them eight broad petals, each with a crease down its
// middle, round a plain boss in a collar.
// The rosette is this site's own. It is in the family of the knobs he showed and copies neither.
// relief is how far the point stands above the ground of the part it is in: the face under the rosette, the floor
// of the beads' channel. Old bronze is rubbed bright where that is high and has gone dark where it is nothing.
float knobHead(vec2 at, out float relief){
  vec2 q = at / KNOB_SIZE;
  float r = length(q), z, ground;
  if (r < 28.6){
    ground = 1.2 + 4.4 * (1.0 - r * r / 818.0);
    // The rosette turns a little as it goes out, as one cut by hand does. Dead straight, it is a seal.
    float sw = 0.2 * r / 28.6, cs = cos(sw), sn = sin(sw);
    vec2 qt = vec2(cs * q.x + sn * q.y, cs * q.y - sn * q.x);
    float across, along;
    float leaf = knobPetals(qt, 8.0, 0.3927, 10.0, 28.2, 5.8, 1.3, across, along);
    float leaves = leaf * (1.9 + 0.8 * exp(-across * across * 14.0));
    // The petals are broad enough to fill the face between them, so the flower is the face and little of the
    // ground under it shows: a flower lying in a dark field is a stamp on a dish.
    float petal = knobPetals(qt, 8.0, 0.0, 3.5, 25.2, 10.5, 1.05, across, along);
    float crease = 0.9 * exp(-across * across * 34.0) * smoothstep(0.1, 0.4, along) * (1.0 - smoothstep(0.72, 0.98, along));
    float petals = petal * (3.9 - 0.8 * along) - crease * step(0.001, petal);
    z = ground + max(leaves, petals);
    if (r < 7.9) z = max(z, ground + 1.4 + 1.5 * sqrt(max(1.0 - (r - 6.9) * (r - 6.9) / 0.9, 0.0)));
    if (r < 6.0) z = max(z, ground + 1.2 + 5.0 * sqrt(1.0 - r * r / 36.0));
  } else if (r < 30.4){
    ground = 1.5;
    z = 1.5 + 2.2 * sqrt(max(1.0 - (r - 29.5) * (r - 29.5) / 0.81, 0.0));
  } else {
    ground = 1.6;
    z = 1.6;
    float turn = 6.2831853 / KNOB_BEADS, ang = (floor(atan(q.y, q.x) / turn) + 0.5) * turn;
    float d = length(q - 33.5 * vec2(cos(ang), sin(ang)));
    if (d < 3.05) z = 1.6 + 1.0 * sqrt(9.3025 - d * d);
    float x = (r - 39.1) / 2.9;
    if (abs(x) < 1.0) z = max(z, 1.0 + 2.9 * sqrt(1.0 - x * x));
  }
  relief = (z - ground) * KNOB_SIZE;
  // The whole head is domed, as a turned knob is, so the light falls across it from one side and its far side
  // goes dark. Flat, it is a medal.
  return (z + KNOB_DOME * (1.0 - min(r * r / 1764.0, 1.0))) * KNOB_SIZE;
}

// The way the head faces at a point (x right, y down, z toward the viewer). relief is as above, and hollow how
// much lower the point is than what is round it: more than nothing in a groove, less on a ridge.
vec3 knobFace(vec2 q, out float relief, out float hollow){
  const float e = 0.3;
  float none;
  float high = knobHead(q, relief);
  float x0 = knobHead(q - vec2(e, 0.0), none), x1 = knobHead(q + vec2(e, 0.0), none);
  float y0 = knobHead(q - vec2(0.0, e), none), y1 = knobHead(q + vec2(0.0, e), none);
  hollow = (x0 + x1 + y0 + y1 - 4.0 * high) / (e * e);
  return normalize(vec3(-(x1 - x0) / (2.0 * e), -(y1 - y0) / (2.0 * e), 1.0));
}

// The way the head's dome faces at a point, with nothing cut on it (x right, y down, z toward the viewer). A whole
// side of the head is turned to the light or away from it by this, whatever is in relief there.
vec3 knobDome(vec2 at){
  return normalize(vec3(at / KNOB_SIZE * (2.0 * KNOB_DOME / 1764.0), 1.0));
}

// The mottle of old bronze: a soft cloud a few units across, 0 to 1.
float knobAge(vec2 q){
  vec2 i = floor(q), f = fract(q);
  f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453), b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453), d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;
