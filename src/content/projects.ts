import { catalog, type WorkItem } from './work';

// A project's own page (BRIEF.md, Open 33). Two kinds. A case study, for software and games: a viewer with the
// video and the pictures at the top beside a summary, then the problem, what was built, the decisions, and what
// it is built with. A gallery, for a shoot and for a 3D piece: the pictures first, a short note, and a few facts.
// The words are the live site's own wherever it has them. Where it has none, the page says so with a stand in,
// and never with words made up in his voice. All of it is his to rewrite.

// One thing in a viewer. slot 'video' is a video's place: it plays `video` when there is one, and until then
// shows `src` as its picture and says it is a stand in.
export interface Shot { src: string; alt: string; caption: string; slot?: 'video'; video?: string; standIn?: boolean }
export interface ProjectFigure { value: string; label: string; href?: string }
export interface ProjectStep { title: string; text: string }
interface Base {
  slug: string;
  // One line under the name.
  sub: string;
  shots: Shot[];
}

export interface StudyPage extends Base {
  kind: 'study';
  proved: ProjectFigure[];
  // Empty until he has written it: the page shows a stand in.
  why: string[];
  what: string[];
  how: ProjectStep[];
  built: [group: string, items: string[]][];
}

export interface GalleryPage extends Base {
  kind: 'gallery';
  // How wide the pictures are to how tall.
  aspect: number;
  note: string[];
  // What it was made with, where that is worth saying, as a 3D piece's tools are. standIn: the names are a guess.
  built?: { items: string[]; standIn?: boolean };
}

export type ProjectPage = StudyPage | GalleryPage;

const STAND_IN = 'Stand in';
const still = (set: string, n: number, caption: string): Shot => ({ src: `/media/work/stand-in-${set}-${((n - 1) % 4) + 1}.webp`, alt: 'A plain picture standing in for a real one', caption, standIn: true });
const video = (src: string, alt: string): Shot => ({ src, alt, caption: 'A video of the project plays here once there is one.', slot: 'video', standIn: true });

// The other seven are the live site's pages (brandonchurchportfolio.com/projects/<slug>) in its own words: the line
// under the name, its overview split into paragraphs, its key features each split at its lead phrase into a title and
// its text, its stack grouped here, and its figures. The opening paragraph above an overview is kept only where the
// overview does not already say it.
export const projects: ProjectPage[] = [
  // From its own repository, Nov 24: README.md, kit/02A-PRODUCT.md, kit/02B-WORLD.md and config/showcase.json, each
  // figure from there. A draft of his to rewrite. The film is the cut without the prompt, which opened on a tool's
  // prompt box (BRIEF.md, Open 33: no project says an AI agent built it).
  {
    kind: 'study',
    slug: 'kestrel',
    sub: 'Fleet control for warehouse robots: a live 3D floor, the platform around it and the site that sells it.',
    shots: [
      { src: '/media/work/kestrel-poster.webp', alt: 'A film of the product cut to music: the robots on the floor, the fleet overview, a fault dispatched to a technician, an aisle closed on the map, the analytics, the site and the phone, ending on the Kestrel name over the floor.', caption: 'The product film, cut bar by bar to its music.', slot: 'video', video: '/media/work/kestrel-video.mp4' },
      { src: '/media/work/kestrel-1.webp', alt: 'The Kestrel home page: the headline “Keep every robot moving.” beside a 3D warehouse floor with an obstruction flagged in aisle 05, and a row of customer marks under it.', caption: 'The site that sells it, with the live floor as its hero.' },
      { src: '/media/work/kestrel-2.webp', alt: 'The fleet overview: figures for robots online, tasks per hour, on-time delivery and battery across the top, the 3D floor in the middle, a queue of what needs attention and the fleet list at the right.', caption: 'The overview: the floor, the queue and the fleet.' },
      { src: '/media/work/kestrel-3.webp', alt: 'The page of one robot, T-09, at 13 percent battery: a close view of it on the floor, its status, charts of its battery, speed and tasks over the shift, its task history and event log.', caption: 'One robot’s page, from its status to its event log.' },
      { src: '/media/work/kestrel-4.webp', alt: 'The map with aisle 05 south closed by an obstruction: the closed aisle hatched in red on the floor, and a table of every aisle with its traffic, its robots and a control to close it.', caption: 'An aisle closed on the map. Robots route round it.' },
      { src: '/media/work/kestrel-5.webp', alt: 'The analytics screen: tasks per hour, battery levels now, the share of the fleet in each state, alerts by kind, on-time delivery against its target and the five busiest aisles.', caption: 'Analytics for the shift, all from the simulation.' },
    ],
    proved: [
      { value: '38', label: 'robots on one simulated floor' },
      { value: '15', label: 'pages, seven of the site and eight of the platform' },
      { value: '106', label: 'cues placed on the music' },
      { value: '3,255', label: 'frames of film, drawn by the product’s own code' },
    ],
    why: [
      'A warehouse that runs robots needs one place that shows the whole floor and says plainly what needs a person. The bar was a product that reads as a real company’s: the platform and the site that sells it, on one design system and one simulated fleet, finished down to type, spacing, motion, empty states and small screens.',
      'Kestrel is a portfolio concept. The company, its customers and every figure it shows are made up, and the site says so in its footer.',
    ],
    what: [
      'The platform is a live 3D floor of a warehouse at night, with 38 robots at work on it: 28 tote carriers and 10 pallet movers, between racks, charging docks, dock doors and pack-out stations. Beside it are a queue of what needs attention and screens for robots, tasks, alerts, maps, analytics and settings. A fault can be sent to a technician, an aisle closed so that robots take another route, and a robot followed from the queue to its own page.',
      'The site sells it, with pages for the product, customers, pricing, a changelog, a live demo and its design system. Its hero is the same live floor.',
      'The fleet is simulated in the browser from a fixed seed, so nothing talks to a server and every number on screen comes from the simulation. The product film and the card’s loop are drawn by the product’s own code, frame by frame at 3840 x 2160, and the loop’s frame after its last is its first frame exactly.',
    ],
    how: [
      { title: 'One world, drawn everywhere', text: 'One class draws the floor in the site’s hero, in the platform, in the film and in the loop, so all four show the same warehouse, lit the same way.' },
      { title: 'A fleet from a fixed seed', text: 'The simulation runs from one seed with no server behind it. The film and the loop come out the same picture on every capture, and any frame can be drawn alone.' },
      { title: 'Color means the robot’s state', text: 'The accent means working, selected or the main action. Amber and red appear only when something needs a person. No state is shown by color alone: each has its own icon and a label.' },
      { title: 'Hover set in code, not in CSS', text: 'Hover and pressed styles come from state the components set from pointer events, so the cursor in the film gets the same answer a visitor’s does.' },
      { title: 'Cut to the music by numbers', text: 'The track is mapped to bars and beats, and every cut, press and camera move is a cue on that map. A check fails on any cue that names a hit the music does not have there.' },
    ],
    built: [
      ['3D', ['three.js', 'WebGL', 'Maps and textures generated for it']],
      ['Interface', ['React 19', 'TypeScript', 'GSAP', 'One design system in dark and light']],
      ['Build and hosting', ['Vite', 'Static files on Vercel']],
      ['Film and loop', ['Playwright', 'Headless Chromium', 'ffmpeg']],
      ['Testing', ['Vitest', 'axe-core']],
    ],
  },
  // From the project's own session (portfolio/SUNFLOWER-ENTRY.md in its repository, Nov 23), each figure with its
  // source there. A draft of his to rewrite. The video is to be switched for a newer one before the site is launched.
  {
    kind: 'study',
    slug: 'sunflower',
    sub: 'One sunflower and fifteen days of sky, drawn frame by frame to one piece of music.',
    shots: [
      { src: '/media/work/sunflower-poster.webp', alt: 'A film of 2 minutes 7 seconds in which one sunflower grows from bare soil to an open flower, through frost and a storm, and ends above a field at sunset, with music.', caption: 'The whole film with its music, from soil to field.', slot: 'video', video: '/media/work/sunflower-video.mp4' },
      { src: '/media/work/sunflower-1.webp', alt: 'A sunflower seedling with two seed leaves stands beside its split seed husk on dark, crumbly soil under a low sun.', caption: 'The seedling at sunrise, beside the husk it left behind.' },
      { src: '/media/work/sunflower-2.webp', alt: 'Frost crystals cover the tip and the leaves of the young plant, seen close against a pale sun in the mist.', caption: 'The frost hold: ice on the growing tip, sun behind.' },
      { src: '/media/work/sunflower-3.webp', alt: 'The young sunflower stands in a puddle on wet soil while heavy rain falls from a dark sky, lit for a moment by lightning.', caption: 'The storm hold: the plant stands still in the rain.' },
      { src: '/media/work/sunflower-4.webp', alt: 'The sunflower is fully open and faces the camera, its petals lit from behind by a low sun, with a field of sunflowers out of focus behind it.', caption: 'The flower fully open in the light of the evening.' },
      { src: '/media/work/sunflower-5.webp', alt: 'Seen from above, a field of sunflowers runs to a ridge on the horizon where the sun is setting, with the film’s own plant in front.', caption: 'The field at sunset as the camera rises over it.' },
    ],
    proved: [
      { value: '3,810', label: 'frames, each computed from its number' },
      { value: '15', label: 'days of sky over one plant' },
      { value: '47', label: 'cues placed on the music' },
      { value: '1,500', label: 'disc florets in the flower head' },
    ],
    why: [
      'A time lapse and a piece of music keep different time. A sunflower needs a season and the film has two minutes, yet the picture only works when its events land where the music does: a sunrise on a bar line, the bud opening on the loudest bar. No camera in a field can be asked for that.',
      'The film also has to stop. When the frost comes and when the storm breaks, the time lapse gives way to real time and the plant must not grow at all, then carry on as if nothing had paused. All of it has to hold without a cut between the days, without nights long enough to lose the picture, and with each frame coming out the same every time it is drawn.',
    ],
    what: [
      'Sunflower is a film of 2 minutes 7 seconds at 1920 x 1080 and 30 frames a second. One sunflower grows from bare soil to an open flower while the sky runs through fifteen days. Twice the time lapse stops and the plant stands still in real time, once under frost and once in a storm, and the film ends above a field at sunset.',
      'None of it is footage. A web scene draws every frame: a plant grown along a skeleton, with its stem, 24 leaves, hairs, a bud, 34 ray florets and 1,500 disc florets set out by the golden angle; soil, a field of sunflowers and the far land; a sky whose sun, moon, stars and clouds all follow one clock; rain, mist and frost; and a lens with focus, glare and a grade. Apart from one soil scan, everything in the picture is drawn by the code or read from maps made for the film.',
      'The music sets the time. The track is mapped to bars and beats, and each event of the film is written as a bar and a beat in a cue sheet that is compiled against that map. The plant has a clock of its own, which stands still in the two holds while the sky runs on. The frames are drawn one by one in a browser without a window, joined into the film and set to the track. The same scene also plays live on a web page, where the camera can be swung round the plant.',
    ],
    how: [
      { title: 'Bars and beats, not seconds', text: 'Every event is placed as a bar and a beat of the track, at 140 beats a minute, and compiled to frames. All 15 sunrises cross the horizon on a bar line, and the bud begins to open on bar 57, the loudest bar of the track.' },
      { title: 'Growth stops in the weather', text: 'In the frost and in the storm, 8 bars each, the plant’s clock stands still to the frame. Frost and rain arrive and leave inside their holds, so the time lapse never shows them.' },
      { title: 'One camera move, four cuts', text: 'The film cuts four times, on the downbeats of bars 19, 21, 23 and 25, to three close shots of the frozen seedling and back. Everywhere else the camera is one unbroken move, from the soil to above the field.' },
      { title: 'Nights shorter than a second', text: 'Each of the 14 nights lasts 0.86 to 0.96 seconds and the sun goes no deeper than 14 degrees, so a glow always stays on the horizon.' },
      { title: 'A frame is a function of its number', text: 'Any frame can be drawn alone and gives the same pixels, so the film was drawn in parts on 12 machines side by side and joined. Nothing is made after loading: every program, texture and buffer exists before frame 0.' },
      { title: 'Rules as commands', text: 'Each rule of the film is a command that measures the film and fails when the rule is broken: nothing grows in a hold, no night runs long, every sunrise sits on its bar line, the film cuts only on its four frames.' },
    ],
    built: [
      ['Scene', ['TypeScript', 'three.js', 'WebGL 2', 'GLSL shaders']],
      ['Time and music', ['A map of the track in bars and beats', 'A cue sheet compiled against it', 'Python with NumPy and SciPy']],
      ['Drawing the frames', ['Node.js', 'Playwright', 'Chromium without a window', 'A software renderer in place of a graphics card']],
      ['Film and pictures', ['ffmpeg', 'H.264', 'AAC', 'WebP']],
      ['Site', ['Vite', 'Plain HTML and CSS']],
      ['Checks', ['Vitest', 'The film’s own rule checks']],
    ],
  },
  // From its repository, Nov 26: README.md, kit/ and kit/PROGRESS.md, each figure from there. A draft of his to rewrite.
  // The film is the cut with no opening, which began on a tool's prompt box (BRIEF.md, Open 33).
  {
    kind: 'study',
    slug: 'halation-v2',
    sub: 'The same game, rule for rule, drawn as a real 3D world.',
    shots: [
      { src: '/media/work/halation-v2-poster.webp', alt: 'The ship, ringed in blue light on the wet deck, in the middle of a crowd of orange box machines and purple chevrons, with sparks flying off the far wall.', caption: 'The film: one run of the game, cut on the beats of its music.', slot: 'video', video: '/media/work/halation-v2-video.mp4' },
      { src: '/media/work/halation-v2-1.webp', alt: 'Close beside the ship as it skims the deck, firing yellow shots past a round grey machine, its plumes and hull reflected in the wet metal.', caption: 'The ship as a machine, with a dormant well beside it.' },
      { src: '/media/work/halation-v2-2.webp', alt: 'The game from its own tilted camera, with the score and the multiplier at the top: the ship fires into purple chevrons as two bursts of purple and green sparks go off.', caption: 'The game as it is played, from its own camera.' },
      { src: '/media/work/halation-v2-3.webp', alt: 'A swarm of orange box machines bursting into sparks around the ship, which fans yellow shots into them, the multiplier at x120.', caption: 'A crowd of drifters coming apart.' },
      { src: '/media/work/halation-v2-4.webp', alt: 'Low on the deck, a green serpent’s armoured head and the links of its tail beside a purple burst, as the ship flies past firing.', caption: 'A serpent, seen from the deck.' },
      { src: '/media/work/halation-v2-5.webp', alt: 'The game on a tablet, held sideways, with a thumb stick at each lower corner and a pause button at the top right.', caption: 'On a tablet, with its touch controls.' },
    ],
    proved: [
      { value: '48 of 48', label: 'test runs play exactly as the first version' },
      { value: '993', label: 'tests, all passing' },
      { value: '584,589', label: 'spawns checked for fairness, 0 breaches' },
      { value: '10', label: 'kinds of enemy, each a machine of its own' },
    ],
    why: [],
    what: [
      'Halation is a twin-stick arena shooter for the browser. One ship, a walled arena, and enemies that warp in without end, alone at first and then in surges. Shards raise the multiplier and the weapon through its five tiers, and a bomb clears the arena but scores nothing. It plays with a mouse and keyboard, a keyboard alone, a gamepad or touch.',
      'Version two keeps every rule and every number of the first and changes the picture. The flat neon lines became a real 3D world: dark machined plates under a film of water, channels of light in the seams, a wall of light at the far edge, and every enemy a solid machine that hovers over its own reflection. The camera is tilted, so the fight still reads like a map and now shows height.',
      'The film is made from the real game. One run of the game’s own simulation from a fixed seed is drawn frame by frame by the game’s renderer, at 1920 by 1080 and 60 frames a second, and cut on the beats of a music track.',
    ],
    how: [
      { title: 'The same game, proven', text: 'The rules are frozen. Recorded runs of the first version, 3 pilots on 4 seeds, are played through the new code and compared at 8,688 points over 145 minutes of play. All 48 runs match.' },
      { title: 'A picture that is a function of the state', text: 'The renderer reads a state and writes pixels and keeps nothing between frames. Motion blur is drawn from several states inside one frame, never from the frame before, so any frame can be drawn again on any machine and match.' },
      { title: 'Solid machines, not outlines', text: 'Each enemy keeps the silhouette and the color it had from above, now as a hull with beveled edges, seams of light in its own hue and a glass core, throwing its light onto the wet deck.' },
      { title: 'A deck that moves', text: 'The grid of the first version became the seams between the plates. A woken well drags the deck down into a funnel, and a burst sends a ring rolling outward.' },
      { title: 'A loop that closes', text: 'The card’s loop is the game’s own state running in a circle: the frame after the last is the first again, measured at 82.1 dB.' },
    ],
    built: [
      ['Game', ['TypeScript', 'three.js on WebGL2', 'GSAP for interface easing', 'Web Audio API']],
      ['Build', ['Vite']],
      ['Films', ['Playwright', 'ffmpeg', 'mediabunny for the in-browser export page']],
      ['Testing', ['Vitest', 'Replays against the first version', 'Determinism checks between Node and the browser']],
    ],
  },
  // From the project's own session (HALATION-ENTRY.md, Nov 23), each figure with its source there. A draft of his
  // to rewrite. Nothing on it says an agent or a tool built it, by his word of Nov 23 (BRIEF.md, Open 33).
  {
    kind: 'study',
    slug: 'halation',
    sub: 'A neon twin-stick shooter for the browser, with films made from the real game.',
    shots: [
      { src: '/media/work/halation-poster.webp', alt: 'The title draws itself over the grid, then the ship fights growing swarms, fires a bomb, loses its last ship and reaches a new best score.', caption: 'One unbroken run, flown by the game’s own bot pilot.', slot: 'video', video: '/media/work/halation-video.mp4' },
      { src: '/media/work/halation-1.webp', alt: 'The Halation title in blue line type over a dimmed arena, with “Click or press any key to start” beneath it.', caption: 'The title screen, with a bot playing behind it.' },
      { src: '/media/work/halation-2.webp', alt: 'A pink burst flares at the center of the grid as purple chevrons circle and the ship fires from the right.', caption: 'A well wakes and drags the field toward it.' },
      { src: '/media/work/halation-3.webp', alt: 'Hundreds of orange squares and purple chevrons close in on the ship as it fans yellow shots into them.', caption: 'The surge before the bomb, multiplier at x291.' },
      { src: '/media/work/halation-4.webp', alt: 'A cyan shockwave ring leaves the ship in the middle of a dense crowd of orange and purple enemies.', caption: 'The bomb’s shockwave leaves the ship.' },
      { src: '/media/work/halation-5.webp', alt: 'The game over screen: 16,153,995 points, marked new best, 2:08 survived, 1,630 kills, best multiplier x500.', caption: 'The run ends on a new best score.' },
    ],
    proved: [
      { value: '10', label: 'enemy kinds, each with its own behavior' },
      { value: '584,589', label: 'spawns checked for fairness, 0 breaches' },
      { value: '473', label: 'unit tests, all passing' },
      { value: '30,000', label: 'sparks on screen at once' },
    ],
    why: [
      'The bar was a twin-stick shooter as good to look at and to play as the best released games of the genre, but entirely original: every name, shape, sound and screen made from scratch. Alongside the game the same codebase had to produce two videos: a showcase film and a silent loop for the portfolio card.',
    ],
    what: [
      'The game: one ship in a walled arena whose floor is a grid of light that bends under every blast. Ten kinds of enemy warp in without end, alone at first and then in surges of seven formations. The weapon climbs five tiers, power cores give four timed overdrives, and every shard collected raises the multiplier. The game makes its shapes, its letters and its sound in code, with no image or audio files. It plays with keyboard and mouse, keyboard only, gamepad or touch, and steps its own quality down to hold 60 fps.',
      'The films: both are recordings of the real game. The expert bot pilot plays from a fixed seed, and a headless browser draws each frame with the game’s own renderer. The loop closes exactly: the game’s state repeats, so frame 480 is identical to frame 0. An export page renders the same films at full speed on a computer with a GPU.',
      'The harness: 46 scripts that run the game in Node, render stills and films, measure the pictures and sound, and gate each of the eight build phases. Three bot pilots tune the balance.',
    ],
    how: [
      { title: 'Everything in code', text: 'No sprite, font or sound file ships with the game. Shapes, line type, music and effects are generated live, so the look can be tuned from numbers in one config file.' },
      { title: 'A deterministic sim, separate from drawing', text: 'The rules run on a fixed step with no browser in them, so a seed and the input of each tick replay the same game. 61 state snapshots match between Node and the browser.' },
      { title: 'Films made from the real game', text: 'Nothing is screen-captured or faked: a bot plays, and each frame is rendered from the sim’s state. That is what lets the loop end on its own first frame.' },
      { title: 'Tune the game to the bots, not the bots to the game', text: 'Three pilots were frozen early, then the config was tuned until each pilot’s median survival sat in its band: novice 56.7 s, average 295.3 s, expert 600 s.' },
      { title: 'Fairness checked by machine', text: 'Six rules (no spawn near the ship, no hit before a warp completes, a warning line before every lancer charge, and so on) are checked across 50 seeds of 5 minutes each.' },
      { title: 'Match the look by measuring it', text: 'The approved concept image was measured (line profiles, glow rings, saturation) and those numbers became checks. Enemies blend with max, not addition, so crossing lines never burn to white.' },
    ],
    built: [
      ['Game', ['TypeScript', 'three.js (WebGL) with custom line and glow shaders', 'GSAP for interface easing', 'Web Audio API for live sound and music']],
      ['Build', ['Vite']],
      ['Films', ['Playwright driving headless Chromium', 'ffmpeg', 'WebCodecs for the in-browser export page']],
      ['Testing', ['Vitest', 'Node against browser determinism checks', 'Bot pilots for balance and fairness']],
    ],
  },
  // From the project's own session (pc-builder-entry.md, Nov 23), each fact with its source there. A draft of his
  // to rewrite. No tool is named as its maker, by his word of Nov 23.
  {
    kind: 'study',
    slug: 'desktop-pc-builder',
    sub: 'Build a gaming PC in 3D, part by part, in the browser. No AI, no accounts.',
    shots: [
      { src: '/media/work/pc-builder-poster.webp', alt: 'A tour of the app. A white PC lights up and the lighting panel recolors it live. Single parts turn in the Inspector, and a graphics card is refused for being too thick. Then come the cable colors, the exploded view with labels, airflow at load with the spec sheet, and the cases in turn, ending on the title.', caption: 'A tour: lighting, parts, fit checks, cables, exploded view and airflow.', slot: 'video', video: '/media/work/pc-builder-video.mp4' },
      { src: '/media/work/pc-builder-1.webp', alt: 'The Prism build in Build mode, a black case with rainbow lighting, with the lighting panel on the left, the spec sheet on the right and the builds tray below.', caption: 'The whole bench: lighting, spec sheet and the builds tray.' },
      { src: '/media/work/pc-builder-2.webp', alt: 'The Prism build in exploded view, its radiator, glass and fans pulled away from the case, with a label naming each part.', caption: 'Exploded view, every part pulled out and labeled.' },
      { src: '/media/work/pc-builder-3.webp', alt: 'The Foundry build in an amber-lit case with the airflow view on, streams of air running from the intake fans to the exhaust at 80 percent load.', caption: 'Airflow at 80 percent load, with simulated temperatures.' },
      { src: '/media/work/pc-builder-4.webp', alt: 'A close view inside the case of a liquid cooler pump with a green ring, beside four blue memory sticks and a yellow fan.', caption: 'Up close on the pump, memory and fans.' },
      { src: '/media/work/pc-builder-5.webp', alt: 'A white three-fan graphics card on a purple turntable in the Inspector, with a panel listing its length, thickness, power and draw.', caption: 'A single part on the Inspector turntable, with its specs.' },
    ],
    proved: [
      { value: '43', label: 'parts, each modeled in code' },
      { value: '6', label: 'cases in twelve finishes' },
      { value: '400', label: 'automated tests' },
      { value: '360', label: 'screenshots, each with a recorded verdict' },
    ],
    why: [
      'A PC configurator usually means a list of parts with a compatibility checker beside it. You never see the machine take shape, and when a part is refused you rarely learn why. The project set out to make building a PC physical: pick up a part, see where it can go, watch it seat, and be told the real reason when it does not fit.',
      'It is also a portfolio piece. It exists to show design engineering, cinematic web animation, interaction craft and systems thinking. The bar was a top-tier real-time product configurator, with every part modeled with real geometry and physically based materials.',
    ],
    what: [
      'A static web app. You choose a case and drag parts into it by mouse, touch or keyboard. Sockets appear where each part can really go, and every install has its own motion: memory latches close, card bracket screws turn, fans drop onto their mounts. A rules engine knows what fits. It says why in one sentence with the numbers, for example “Too long. This card is 322 mm and the case has 310 mm free.” When a part is removed, the parts that depend on it go with it, and undo brings everything back.',
      'The lighting system works per LED, with eight effects, a gradient editor, per-part overrides and nine presets. A power-on sequence spins the fans up and brings the light up part by part. A load control drives simulated temperatures, and an airflow view draws air from intake to exhaust. Showcase mode adds a camera tour, and an exploded view separates the build with labels. Builds are kept as share links that rebuild exactly, saved in the browser, or exported as posters. The app has desktop, tablet and phone layouts, three quality tiers, and screen reader support.',
      'It runs entirely in the browser from static files, with no server, database, account or API key. Every brand and part in it is invented.',
    ],
    how: [
      { title: 'Every part is generated in code', text: 'There are no downloaded models. Each board, card, cooler and fan is built from geometry with physically based materials, so all 43 parts and 6 cases share one look and one level of detail.' },
      { title: 'The rules engine is separate from the 3D', text: 'It is pure TypeScript with no Three.js and no DOM, and it reproduces a fixed set of known inputs and outputs exactly. The same engine drives the socket highlights, the refusal messages and the spec sheet.' },
      { title: 'Glass that reads as glass', text: 'A reflected environment map made the side panel look either open or milky in early reviews. The glass shader now ray-traces soft studio light cards at real distances, the way product photographers light glass.' },
      { title: 'No stutter after loading', text: 'The app warms every shader program up front and keeps the light count fixed with dark spare lights, so changing builds never compiles anything. It measured 530 programs at the end of the warm-up and 530 after cycling through every preset and part.' },
      { title: 'Demo reels inside the app', text: 'The marketing video is not edited footage. The app plays scripted reels with hard cuts, and anything it needs is generated before play. That cut the pause at each cut from 270–590 ms to 50–80 ms.' },
    ],
    built: [
      ['3D', ['Three.js', 'WebGL 2', 'Custom shaders for glass, perforated metal and LEDs', 'Ambient occlusion, bloom and outline passes']],
      ['Interface', ['React 19', 'CSS Modules', 'Zustand', 'GSAP']],
      ['Language and build', ['TypeScript (strict)', 'Vite']],
      ['Testing', ['Vitest', 'Playwright', 'A screenshot harness with a verdict ledger']],
      ['Hosting', ['Static files on Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'proactive-ui-for-ai-glasses',
    sub: 'A UX study in when an assistant should speak, and when it should stay quiet',
    shots: [
      video('/media/work/glasses.webp', 'A still from a video of Proactive UI for AI Glasses'),
      { src: '/media/work/glasses.webp', alt: 'The view through the glasses on a city street: a card for the Grace Theater pinned at its storefront, with a label for Trattoria da Lia beside it', caption: 'A theater’s card and a restaurant’s label on a city street.' },
      still('photo', 1, 'A screenshot goes here: the inspector, a decision with its reason.'),
      still('art', 2, 'A screenshot goes here: a crossing, with the glass stepped back.'),
      still('game', 3, 'A screenshot goes here: the eval report.'),
    ],
    proved: [
      { value: '13', label: 'walking rules' },
      { value: '0', label: 'LLM calls, same decisions every run' },
      { value: '1,000+', label: 'eval checks across 44 suites' },
      { value: 'Live', label: 'walk the block yourself', href: 'https://proactive-ui-for-ai-glasses.vercel.app' },
    ],
    why: [],
    what: [
      'An assistant on a screen waits to be asked. Glasses have to decide when to speak at all, to someone who is walking, watching for traffic and can’t afford to read. This project is a study of that decision.',
      'One looping city block renders in real time in Three.js. The wearer walks it on rails and looks where they like, with a viewfinder standing in for eye tracking. Ten times a second a rules engine reads a snapshot of the walk (pace, gaze and dwell, the crossing and its signal, nearby cars and people, messages and the goal) and returns decisions, each with a level, a timing, a placement and a reason. Gates beat everything: in a crossing the glass steps back and the safety text shows. A settled view lights the labels of the places in sight, a held look grows one into its card and then its expanded view, and turning away plays it back down a level at a time.',
      'The brain is a rules policy, not a model: no LLM, no keys, no server, and a seeded simulation, so the same inputs make the same decisions every run. That is what keeps the proof exact. The inspector replays every decision with its reason, and the eval suite runs two recorded walks and 41 focused cases through the engine headless, scoring them against hand-written expectations.',
    ],
    how: [
      { title: 'Thirteen walking rules', text: 'The clear center of view grows with pace, unread labels fold themselves in 2.5 seconds at a walk, and a brisk pace gets one captioned line in place of a pane.' },
      { title: 'Deterministic decision engine', text: 'A 10 Hz tick in a fixed order of pace band, gates, scored candidates and the attention ladder, with no Math.random and no wall clock.' },
      { title: 'Attention climbs with the look', text: 'A held look grows a label to its card in half a second and to its expanded view two seconds later, pinned where the look landed. Turn away and it plays back down.' },
      { title: 'The world has right of way', text: 'Crossings and nearby vehicles step the glass back, content yields to a head check at the curb, and a pane over a person or car dims and moves aside. A face is never covered.' },
      { title: 'The pocket and the budget', text: 'A pinch while walking opens nothing, it saves the place for the next red light. Seven proactive shows per walk, earned back by 40 seconds of quiet.' },
      { title: 'An inspector as proof', text: 'Every decision with its reason, a scrubbable timeline, live signals, overrides, the eval report and an export that replays through a fresh engine and must match exactly.' },
      { title: 'Evals as the real test suite', text: '44 suites and over 1,000 checks, with invariants on every run. Every crossing decision is a hold, no reason cites the wearer’s body or habits, and two runs produce identical logs.' },
      { title: 'Measured in a real browser', text: 'Scripted laps aim with real drags and judge every landing for jumps, every one of fourteen doors is walked and chosen, and thirteen screens from a 390 px phone to 4K are rendered.' },
    ],
    built: [
      ['Front end', ['TypeScript', 'GSAP', 'CSS Modules', 'Vite']],
      ['3D', ['Three.js', 'WebGL 2']],
      ['Delivery', ['Vitest', 'Playwright', 'Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'ask-the-claude-docs',
    sub: 'An evaluated RAG chatbot with honest refusals',
    shots: [
      { src: '/media/work/claude-docs-full.webp', alt: 'A still from a video of Ask the Claude Docs', caption: 'A video of the project plays here once there is one.', slot: 'video', standIn: true },
      { src: '/media/work/claude-docs-full.webp', alt: 'The Ask the Claude Docs type specimen: an answer set in a serif with a citation, a question set in a sans, and a receipt set in a mono', caption: 'The design language: one typeface for the answer, one for the interface, one for the receipt.' },
      still('art', 1, 'A screenshot goes here: an answer with its citations.'),
      still('art', 3, 'A screenshot goes here: a refusal, with its receipt.'),
      still('photo', 2, 'A screenshot goes here: the public eval scoreboard.'),
    ],
    proved: [
      { value: '0', label: 'LLM calls when it refuses' },
      { value: '26 s', label: 'to re-sync an unchanged corpus' },
      { value: '30x', label: 'less for a decline than an answer' },
      { value: 'Live', label: 'CI-scored eval scoreboard', href: 'https://ask-the-claude-docs.vercel.app/evals' },
    ],
    why: [],
    what: [
      'A production RAG pipeline end to end: a nightly GitHub Action ingests the live Claude Code docs, chunks them along heading boundaries, and embeds only what changed (an unchanged corpus re-syncs in 26 seconds with zero embedding calls). Questions are answered by Claude Haiku from retrieved passages only, streamed with the sources arriving before the first token, with real cost printed on every receipt.',
      'The distinctive part is what happens when it can’t answer: a server-side gate calibrated from measured score distributions refuses before the model is ever called, and a public /evals page shows retrieval accuracy, LLM-judged answer quality with a noise margin, and the refusal tests, all re-run by CI so a regression cannot merge.',
      'Hand-built editorial design system in three typefaces, no UI framework, with accessibility gated in CI.',
    ],
    how: [
      { title: 'A refusal gate on the server', text: 'Below the calibrated similarity threshold the model is never called; a decline costs 30x less than an answer and says so on its receipt.' },
      { title: 'Citations to the passage', text: 'Passage-level citations streamed sources-first over SSE; every [n] marker deep-links to the exact heading on code.claude.com.' },
      { title: 'A public eval scoreboard', text: 'Retrieval hit@5 and MRR plus a four-check LLM judge with a measured noise margin, re-run by CI on every change; regressions cannot merge.' },
      { title: 'A corpus that keeps itself', text: 'A daily Action hash-diffs the live docs and embeds only deltas; first ingest 8 minutes, unchanged re-sync 26 seconds.' },
      { title: 'Spend defenses', text: 'Asymmetric failure postures: per-IP rate limiting fails open, the global daily spend cap fails closed; every receipt computes cost from real API usage.' },
      { title: 'A hand-built design system', text: 'Three typefaces as three voices, token palette with measured WCAG contrast, no UI framework.' },
      { title: 'Hardened CI', text: 'Playwright e2e with axe, Lighthouse budgets, payload assertions, secret greps and CVE gates that caught three real advisories mid-build.' },
    ],
    built: [
      ['Front end', ['Next.js 16', 'React 19', 'TypeScript']],
      ['Data', ['PostgreSQL + pgvector', 'Upstash Redis']],
      ['AI', ['Anthropic API', 'OpenAI Embeddings']],
      ['Delivery', ['GitHub Actions', 'Playwright', 'Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'design-system-extractor',
    sub: 'A website’s design system, extracted as measured data',
    shots: [
      video('/media/work/dse.webp', 'A still from a video of the Design System Extractor'),
      { src: '/media/work/dse.webp', alt: 'A Design System Extractor run: the counts of colors, type styles and components it found, the palette it extracted, and three of the components', caption: 'A run’s counts, its palette and three of its components.' },
      still('art', 4, 'A screenshot goes here: a component in every state, with its pixel check.'),
      still('photo', 3, 'A screenshot goes here: the drift report.'),
      still('game', 1, 'A screenshot goes here: the MCP server answering in an editor.'),
    ],
    proved: [
      { value: 'Under 1¢', label: 'model cost per run' },
      { value: '0', label: 'scripts run in any preview' },
      { value: '801', label: 'tests on every release' },
      { value: '72–83%', label: 'live preview rate, from near 30%' },
    ],
    why: [],
    what: [
      'A product that treats a website’s design system as data. Paste a URL and a headless crawler visits its key pages, captures every component in every state it can reach, clusters raw values into tokens, runs five measured checks per component and reports where the system is drifting. It’s free to try, with paid plans through Stripe, and everything exports to Tailwind, W3C tokens and an MCP server.',
      'Reading stylesheets isn’t enough, so this watches the page. A Playwright crawler picks the pages that matter, walks the real Tab order for focus, holds the mouse down for active states and reads motion from the running page, including GSAP. Values cluster into tokens in OKLCH, and components are grouped by structure, not selectors. Every preview is rebuilt as sanitized HTML and CSS, then pixel-diffed against the real page before it’s shown live. Real sites fought back. stripe.com first took 773 seconds against a six-minute limit, and live preview rates started near 30%. Four measured rounds of cause-by-cause fixes brought them to between 72% and 83%.',
      'The model only names and narrates. Every call has a deterministic fallback, and every number in a narrative is checked against the facts. Free runs sit behind a daily budget that fails closed, per-visitor caps and a worst-case reservation. Paid plans through Stripe lift those limits, and a typical run costs under a cent in model spend.',
    ],
    how: [
      { title: 'Previews checked by pixels', text: 'Each component is rebuilt as sanitized HTML and CSS and pixel-diffed against the real page. Within 2.5% it renders live; otherwise the crop shows with the measured reason.' },
      { title: 'Every state, replayed without scripts', text: 'Hover, focus through a real Tab walk, active, open and disabled are captured with their timing and replayed inside a scriptless sandbox.' },
      { title: 'Motion read from the running page', text: 'Web Animations, CSS and an inline-style sampler that catches GSAP, classified into entrances, scroll reveals and loops, with every easing drawn on its real curve.' },
      { title: 'Components, not selectors', text: 'Clustered by structure and merged across pages into named variants, keeping the site’s own variable names, with a source crop that scrolls to every element.' },
      { title: 'Measured checks and a safe drift fix', text: 'Five checks per component, counted as measured, never claimed. The drift report proposes a smaller token set that keeps every passing contrast pair passing.' },
      { title: 'Built for AI reuse', text: 'Exports to CSS, JSON, Tailwind and W3C tokens, a prompt for any model, an MCP server with seven tools, and a CLI that can reach logged-in pages.' },
      { title: 'Free and paid tiers', text: 'Free runs are protected by a daily budget that fails closed, per-visitor caps and a worst-case reservation. Paid plans bill through Stripe and lift the caps.' },
    ],
    built: [
      ['Front end', ['Next.js 16', 'React 19', 'TypeScript']],
      ['Crawling', ['Playwright', 'BullMQ']],
      ['Data', ['Redis', 'PostgreSQL', 'Drizzle']],
      ['AI', ['Anthropic API', 'Model Context Protocol']],
      ['Billing', ['Stripe']],
      ['Delivery', ['Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'generative-ui-github',
    sub: 'An agent that composes interfaces from GitHub repo data',
    shots: [
      video('/media/work/genui.webp', 'A still from a video of Generative UI for GitHub'),
      { src: '/media/work/genui.webp', alt: 'A composed answer about a GitHub repo: a sentence that sums it up, then open pull requests, pull requests awaiting review, failing checks, a list of the longest waiting and a chart of CI duration', caption: 'An answer composed for a repo: counts, a list and a chart.' },
      still('photo', 4, 'A screenshot goes here: the screen rewriting itself after a click.'),
      still('art', 1, 'A screenshot goes here: one component in its five states.'),
      still('game', 2, 'A screenshot goes here: the public eval results.'),
    ],
    proved: [
      { value: '41', label: 'components, five states each' },
      { value: '$0.002', label: 'per composed answer' },
      { value: '99', label: 'eval cases, run three times each' },
      { value: 'Live', label: 'eval results', href: 'https://generative-ui-github.vercel.app/evals' },
    ],
    why: [],
    what: [
      'Paste any public GitHub repo and ask it a question. A model classifies the question, picks from a hand-built catalog of 41 components, and the renderer streams the screen in. Click any card, row or chart point and the screen rewrites itself around it. Every number the model writes is checked against the data it cites, and a public eval harness scores the whole pipeline on every change.',
      'Most generative UI demos let a model write the page. This one doesn’t. The model emits a small JSON description, chosen from a Zod-validated registry, and never touches HTML, CSS or a pixel value; the system decides what everything looks like. Haiku classifies each question into one of fifteen layout templates and fills the slots; Sonnet composes only when no template fits, which keeps a typical answer around a fifth of a cent. Screens arrive as a stream of ops against stable component ids, so a follow-up click doesn’t reload anything: the pieces that no longer apply exit in reverse of how they entered, the survivors morph into their new positions, and the new ones draw in.',
      'Underneath is a design system I built in Claude Design and then audited to the number: 41 components, each with default, skeleton, empty, error and warming states at three densities, two tokens per status color so text and fills both pass contrast, and six motion moves with Motion owning presence and GSAP owning what happens inside a card.',
      'The eval harness runs 99 cases three times each on three model configurations and publishes everything, including the finding that Haiku alone matches production on routing and numbers at a third of the cost.',
    ],
    how: [
      { title: 'Model decides, code renders', text: 'The composer emits JSON against a Zod registry and never HTML, class names or colors. Unknown or malformed output renders the component’s error state instead of throwing.' },
      { title: 'Rewrites in place', text: 'Stable ids and a diff engine turn a follow-up click into exits, morphs and entrances rather than a page load. Exit is the strict reverse of enter.' },
      { title: 'Two-model routing', text: 'Haiku classifies into fifteen templates and fills them; Sonnet composes only off-template. Production answers cost about $0.002 and arrive in about six seconds.' },
      { title: 'Numbers are verified', text: 'Any figure the model writes into a sentence, delta or chart finding is checked against the data it cites. A mismatch is replaced by a system sentence, never rendered.' },
      { title: 'Five states, three densities, every component', text: 'Error is never styled as critical, a zero is data not empty, and the frame always renders so you can see what’s loading, missing or failed.' },
      { title: 'Cost controls that show on screen', text: 'Fifteen live compositions per visitor per day, precomputed answers for five sample repos, and a global daily cap that flips the site to cached-only mode and says so.' },
      { title: 'Public evals with the failures left in', text: '99 cases, three runs, three model configurations, scored on template, bindings, numbers, rules, latency and cost, with a regression gate before any composer change can land.' },
      { title: 'A design system built to be audited', text: 'Tokens generated from one JSON file, CSS modules with no framework, measured contrast on every status color, and Motion plus GSAP split so neither touches the other’s element.' },
    ],
    built: [
      ['Front end', ['Next.js', 'React', 'TypeScript', 'CSS Modules']],
      ['Motion', ['Motion', 'GSAP']],
      ['AI', ['Anthropic API', 'Zod']],
      ['Data', ['GitHub GraphQL + REST', 'Upstash Redis']],
      ['Delivery', ['Playwright', 'Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'modern-softworks',
    sub: 'A full marketing site for my studio, Modern Softworks',
    shots: [
      video('/media/work/softworks.webp', 'A still from a video of the Modern Softworks site'),
      { src: '/media/work/softworks.webp', alt: 'The Modern Softworks mark, a green hexagon, over the studio’s name and the words Development Studio on a dark ground', caption: 'The studio’s mark and name on a dark ground.' },
      still('art', 3, 'A screenshot goes here: a service page with its consultation form.'),
      still('photo', 1, 'A screenshot goes here: a guide from the MDX pipeline.'),
      still('game', 4, 'A screenshot goes here: a case study page.'),
    ],
    proved: [
      { value: '48', label: 'hand-built components' },
      { value: '22', label: 'pages' },
      { value: '90%', label: 'accessibility floor in CI/CD' },
    ],
    why: [],
    what: [
      'The website for my development studio, Modern Softworks. A full marketing site with lead generation, blog, case studies, and service pages built for private-sector and federal clients.',
      'The entire design system is hand-built on CSS custom properties. No Tailwind, no UI framework. 48 components, a semantic color system, typography scale, and spacing tokens all from scratch. Lighthouse CI fails the build if accessibility drops below 90%. Enterprise-grade security headers and AVIF/WebP images.',
    ],
    how: [
      { title: 'Custom design system', text: '48 components, 10 section modules, full token system with no framework dependency.' },
      { title: 'MDX content pipeline', text: '8 blog posts, 6 guides, 3 case studies, reading time, table of contents, and RSS feeds.' },
      { title: 'Dynamic OG image generation per page', text: 'Using Next.js ImageResponse API.' },
      { title: 'Context-aware consultation modal', text: 'Pre-fills based on which service page the user is on.' },
      { title: 'Canvas 2D and GSAP', text: 'Canvas 2D particle field and GSAP scroll-triggered animations.' },
      { title: 'Lighthouse CI', text: 'Enforces accessibility and SEO as hard build failures on every push.' },
      { title: 'Enterprise security headers', text: 'Full CSP, HSTS with preload, X-Frame-Options DENY.' },
      { title: 'No tracking', text: 'No tracking pixels, no chat widgets.' },
    ],
    built: [
      ['Front end', ['Next.js 15', 'React 19', 'TypeScript']],
      ['Motion', ['GSAP']],
      ['Content', ['MDX']],
      ['Email', ['Resend']],
      ['Delivery', ['Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'hero-animation-builder',
    sub: 'Design a hero animation, watch it ship itself',
    shots: [
      video('/media/work/hero-builder.webp', 'A still from a video of the Hero Animation Builder'),
      { src: '/media/work/hero-builder.webp', alt: 'The builder: a glowing violet arc under a headline, beside its panel of presets and sliders for the line', caption: 'A glowing arc beside the builder’s panel of controls.' },
      still('game', 1, 'A screenshot goes here: the staged fintech site, lit by a design.'),
      still('art', 2, 'A screenshot goes here: the five glow layers in the panel.'),
    ],
    proved: [
      { value: '36', label: 'live animation controls' },
      { value: '5', label: 'independent glow layers' },
      { value: '0', label: 'animation libraries' },
    ],
    why: [],
    what: [
      'A two-sided piece: a builder and a stage. The builder exposes the full anatomy of a hero arc animation (line thickness and brightness falloff, five named glow layers from Upper Far to Lower Far each with its own color, width, blur, opacity, and offset, a choreographed entrance draw, and a breathing loop) with five tuned presets and a randomizer. The stage is /live, a deliberately fictional fintech brand whose hero, feature grid, and CTA are all lit by whatever the user designed: the config travels as base64 JSON in the URL and is decoded during server-side rendering, no storage anywhere.',
      'Two craft decisions do the heavy lifting. The arc is imperatively built SVG, constructed once with attribute-only updates afterward, which is why 36 controls feel instant. And color legibility is guaranteed by an inline implementation of APCA-W3 (the SA98G algorithm): it picks button text color against any user accent and progressively lightens accent-colored text until it clears perceptual contrast thresholds, solving the saturated-hue-on-dark-UI problem that WCAG 2.x luminance math gets wrong.',
    ],
    how: [
      { title: 'Imperatively built SVG arc', text: 'Constructed once, then attribute-only updates, so every slider responds instantly with no re-render of the graphic.' },
      { title: 'Inline APCA-W3 (SA98G) contrast engine', text: 'Picks button text color for any accent and lightens accent text in 5% steps until perceptual legibility thresholds pass.' },
      { title: 'Every design is a URL', text: 'The full config encodes as base64 JSON into a query param and decodes during SSR on the staged site, no storage, instantly shareable.' },
      { title: 'Five independent glow layers', text: 'Upper Far, Upper Near, Inner, Lower Near, Lower Far, each with its own color, width, blur, opacity, and vertical offset.' },
      { title: 'Choreographed motion', text: 'A timed entrance draw with staged glow fade-in, then a continuous breathing loop with speed, intensity, and drift controls.' },
      { title: 'CSS-3D showcase card', text: 'Driven by a hand-written requestAnimationFrame lerp loop, perspective and preserve-3d only, no Three.js.' },
      { title: 'A deliberately fictional fintech brand stages the work', text: 'The user’s design lights the hero, the ambient card lighting, and the closing CTA.' },
      { title: 'Deliberately few runtime dependencies', text: 'The animation system, the contrast engine, and the 3D interaction are all hand-built.' },
    ],
    built: [
      ['Front end', ['Next.js 16', 'React 19', 'TypeScript']],
      ['Graphics', ['SVG', 'CSS 3D Transforms']],
      ['Color', ['react-colorful']],
      ['Delivery', ['Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'meridian',
    sub: 'A working watch movement, built entirely in code',
    shots: [
      { src: '/media/work/meridian-poster.webp', alt: 'The Meridian watch at night in its rose finish, its open movement and tourbillon under a violet sky crossed by ribbons of gold light, a clockwork moth perched on the case', caption: 'The film: the movement is built, runs down, is wound by hand and runs through the night to noon, cut to its music.', slot: 'video', video: '/media/work/meridian-video.mp4' },
      { src: '/media/work/meridian.webp', alt: 'The Meridian movement in its gold case, with its gears, bridges and blue screws, a clockwork moth perched on it, beside a card about how it runs', caption: 'The movement in its case, with the clockwork moth on it.' },
      { src: '/media/work/meridian-1.webp', alt: 'The Dissected view at night: the movement taken apart into a rising stack of parts, each one labelled, beside the card that explains how the watch runs', caption: 'The Dissected view, with its labelled parts.' },
      { src: '/media/work/meridian-2.webp', alt: 'A low view across the movement at night, its chapter ring glowing in a spectrum of lume and a clockwork moth perched on the rim', caption: 'The movement at night.' },
      { src: '/media/work/meridian-3.webp', alt: 'A close view of the movement in its rose finish beside the card for the mainspring barrel, which stores the power; here one wind lasts forty seconds', caption: 'A part’s card, from the guided tour.' },
    ],
    proved: [
      { value: '0', label: 'imported models or textures' },
      { value: '60:1', label: 'gear train, centre wheel to cage' },
      { value: '555', label: 'instances across 27 parts' },
      { value: 'Live', label: 'wind it yourself', href: 'https://meridian-calibre.vercel.app/' },
    ],
    why: [],
    what: [
      'A browser-native 3D specimen of a fictional hand-wound tourbillon, framed as a plate from a watchmaker’s reference folio. Nothing is imported. Every gear, jewel and texture, and the clockwork moth that lives on the bench, is generated in code. The mechanism runs on its own logic: real tooth counts, driven from a single beat counter. Visitors can wind it, take it apart, tour it part by part, and watch it run down.',
      'A deterministic kinematic model, not an animation. The escapement, tourbillon and gear train all derive from one integer beat counter at 8 beats per second, and the train is solved backward from the cage by real tooth counts: 60:1 from the centre wheel to the cage, 12:1 between the hands.',
      'The whole scene is procedural: 27 parts, 555 instances and 51 PBR material families, with perlage, Geneva stripes and engravings baked to canvas at load, at about a million triangles per frame. Material changes happen per fragment in custom shaders. A re-plating wave sweeps a new finish across the movement from the crown, and a terminator dissolve turns day into night.',
      'The build was spec-driven. I wrote fifteen specification documents with a 41-item acceptance list, an eight-step review ritual that gated each of twelve phases, and an override order for when rules collide. I then added a hidden menu of 23 scripted camera takes, so the page can film its own commercials.',
    ],
    how: [
      { title: 'Mechanics from one beat counter', text: 'The escapement, tourbillon and gear train all follow an integer beat counter solved by real tooth counts, with no keyframes anywhere in the mechanism.' },
      { title: 'Wind it, watch it stop', text: 'Hold the crown or press W and the ratchet and click turn. The reserve drains with every beat, and at zero the balance winds down to a stop until it’s wound again.' },
      { title: 'Fully procedural', text: 'No imported models or texture images. Gears are generated from module and tooth count, and surface finishes and engravings are baked to canvas at load.' },
      { title: 'Shader-level transitions', text: 'A re-plating wave swaps Ice, Rhodium and Rose finishes per fragment across the whole movement, and day to night runs as a reversible terminator dissolve into a procedural night sky.' },
      { title: 'Take it apart', text: 'The Dissected view fans the movement out by layer with labelled leaders. Click any of 27 parts for its card, or take a six-stop guided tour.' },
      { title: 'A living companion', text: 'A procedurally modelled clockwork moth that perches on moving parts, flies, and reacts to the movement’s state, starring in a 12-second opening film where the watch assembles around it.' },
      { title: 'A page that films itself', text: 'A hidden reel menu of 23 scripted takes with a camera director, focus pulls and an on-page pointer that clicks the real controls, all frame-repeatable.' },
    ],
    built: [
      ['3D', ['three.js', 'Custom GLSL Shaders']],
      ['Front end', ['JavaScript ES Modules', 'GSAP']],
      ['Delivery', ['Vercel']],
    ],
  },
  {
    kind: 'study',
    slug: 'micro-interactions-library',
    sub: '15 components, zero animation libraries, built in a weekend',
    shots: [
      video('/media/work/stand-in-art-2.webp', 'A plain picture standing in for a video of the Micro-Interactions Library'),
      still('photo', 3, 'A screenshot goes here: the library’s fifteen components.'),
      still('game', 2, 'A screenshot goes here: a demo beside its code, ready to copy.'),
      still('photo', 1, 'A screenshot goes here: the command palette search.'),
    ],
    proved: [
      { value: '15', label: 'components' },
      { value: '0', label: 'animation libraries' },
      { value: '6', label: 'total dependencies' },
    ],
    why: [],
    what: [
      'A collection of 15 production-ready micro-interaction components built as a copy-paste resource for frontend developers. Every animation runs on CSS transitions or the native Web Animations API. No Framer Motion, no GSAP, no animation libraries.',
      'Animations use predominantly transform and opacity for GPU-only rendering. The entire site is statically generated with only 6 production dependencies.',
    ],
    how: [
      { title: '15 interactive demos', text: 'Live preview, syntax-highlighted code, and one-click copy.' },
      { title: 'Command palette search (Cmd+K)', text: 'Fuzzy matching across all components.' },
      { title: 'Accessibility-first', text: 'WCAG 2.1 AA, prefers-reduced-motion respected globally, built on react-aria-components.' },
      { title: 'Hydration-safe dark/light theme toggle', text: 'No flash of wrong theme.' },
    ],
    built: [
      ['Front end', ['Next.js 14', 'TypeScript', 'CSS Modules']],
      ['Motion', ['Web Animations API']],
      ['Accessibility', ['react-aria-components']],
      ['Highlighting', ['Shiki']],
      ['Delivery', ['Vercel']],
    ],
  },
  // A shoot and a 3D piece, both stand ins, so the gallery page can be judged with one of each.
  {
    kind: 'gallery',
    slug: 'photo-stand-in-1',
    sub: 'A stand in for a shoot',
    aspect: 2,
    note: [],
    shots: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => still('photo', n, `Picture ${n} of the shoot, with a line about it.`)),
  },
  {
    kind: 'gallery',
    slug: 'art-stand-in-1',
    sub: 'A stand in for a 3D piece',
    aspect: 2,
    note: [],
    built: { items: ['Blender', 'Nomad Sculpt'], standIn: true },
    shots: [
      { ...still('art', 1, 'A turntable of the piece plays here once there is one.'), slot: 'video' },
      ...[2, 3, 4, 5, 6].map((n) => still('art', n, `View ${n - 1} of the piece, with a line about it.`)),
    ],
  },
];

export const STAND_IN_WORD = STAND_IN;

// Whether a page belongs to a category that is all stand ins: such a page is for judging the layout, and is kept
// out of the sitemap and away from search engines.
export const standsIn = (slug: string): boolean => !!catalog.flatMap((c) => c.items).find((i) => i.slug === slug)?.standIn;

// A project's page with the card it belongs to, and the projects before and after it in its own category.
export function projectOf(slug: string): { page: ProjectPage; item: WorkItem; prev: WorkItem | null; next: WorkItem | null } | null {
  const page = projects.find((p) => p.slug === slug);
  const among = catalog.find((c) => c.items.some((i) => i.slug === slug))?.items ?? [], at = among.findIndex((i) => i.slug === slug);
  if (!page || at < 0) return null;
  // The way on goes round, so a category of three or more always has a project before and one after.
  const round = among.length > 2, n = among.length;
  return { page, item: among[at], prev: among[at - 1] ?? (round ? among[n - 1] : null), next: among[at + 1] ?? (round ? among[0] : null) };
}
