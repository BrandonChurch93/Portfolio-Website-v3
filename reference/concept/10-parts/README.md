# Picture 10, cut for the page

These two files are what `scripts/world/drawn.mjs` reads to make the pictures the page lights under `?look=d`
(`public/world/d-*`). Picture 10 itself is one folder up. Nothing here is drawn by the page as it is.

## sheet.png

The torn planet under the land, and the dunes, of picture 10, on a clear ground. 3680 by 1541.

- Picture 10 is 1672 by 941. That is too coarse for a page that is zoomed, so three parts of it were drawn again
  larger by an image model (nano_banana_pro), each from a crop of picture 10 as its only reference and asked to
  change nothing:
  - the hollow, crop 284, 202, 1104 by 621, drawn at 2752 by 1536, with the lightning at the ball's foot and the
    small streams taken out
  - the cratered right side with the dunes, crop 1045, 202, 585 by 585, drawn at 2048 by 2048, with the falling sand
    and its dust taken out: the page makes the sand that falls
  - the cracked left side, crop 50, 226, 585 by 585, drawn at 2048 by 2048
- Each part was straightened back onto picture 10 by its own smooth drift from it (mean 1.21, 0.46 and 0.35 of
  picture 10's pixels) and the three were joined along the seams where they differ least. The join is picture 10
  at 2752 / 1104 times its size.
- The body was cut from its ground by hand: an outline for the dark left side, where rock and sky are one black,
  and the picture's own brightness for the rest. The city, the pyramid, the trees and everything in the sky are
  left out. The page has its own.
- The ball is painted out. The page's core stands there.
- sheet.png is that join less 249 pixels at its left and 668 at its top.

## depth.png

How near each place of sheet.png looks, brighter for nearer, sixteen bits, 1876 by 784 over the same frame. It
was estimated from the join by Depth Anything V2 Small
(https://huggingface.co/onnx-community/depth-anything-v2-small). The page uses it for the turn of each place
under a light and for nothing else: the depth the page sorts by is worked out in the script.

## How it lies on the page

One scale about the core, measured: the picture's ball has its middle at 834.5, 544.4 of picture 10's pixels and
a radius of 113.1, and each of those pixels is 0.907 units, which makes the ball 102.6 units against the page's
102. The planet's outline then lies within 5 units of the page's on the right and 8 on the left. These numbers,
the small lift near where the sand begins and the sand's front edge are at the top of the script.
