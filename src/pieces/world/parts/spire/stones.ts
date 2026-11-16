// The spire's stones as the make script bakes them and the material wears them, so the two are one: each is a
// palette color eased toward a second by so much, times how bright. This file imports nothing, so the make script
// can read it as it is.
// The granite is the warm dark brown of the city round it (towers/windows.ts, STONES), darker, so the spire leads by
// its form and not by a color of its own; the trim a pale limestone; the court's paving the granite, darker still.
export const STONES = {
  granite: ['text-3', 'bronze', 0.88, 0.7],
  trim: ['text-2', 'copper-light', 0.42, 0.42],
  court: ['text-3', 'bronze', 0.85, 0.45],
} as const;
