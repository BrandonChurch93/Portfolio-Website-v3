// What the make script (scripts/world/parts/debris/make.mjs) writes for the page about what broke away, and how the
// page reads it. This file imports nothing, so the script can read it as it is.

// The columns of the table of pieces, one row a piece. big is a piece's largest half extent, in units.
export const COLUMNS = 'model x y z qx qy qz qw sx sy sz kind family phase ax ay az spin core br bg bb extra shut moon look big';
// How a piece is drawn: from its rock model, as one of the stream's shards in stone, or as one of the stream's own
// shards, which the stream carries.
export const LOOK = { rock: 0, stone: 1, shard: 2 } as const;
// The spare place of a vertex's stored light holds whether it is the planet's outer surface (a half) and how much of
// the moon reaches it past the planet, as this share.
export const MOON_SHARE = 0.49;
