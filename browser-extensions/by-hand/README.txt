BY HAND
A browser extension by Anyrvaan — anyrvaan.com

------------------------------------------------------------
WHAT IT DOES
------------------------------------------------------------

The page gets drawn.

Not filtered — drawn. Pen strokes travel along every box on
the page in reading order, top-left to bottom-right, at
drawing speed, the way someone sketching a layout would go
about it. Rectangles get a second pass, because nobody draws
a rectangle right the first time. Headings get underlined,
twice.

Brush an element with your cursor once it has landed and it
re-strokes with a new seed. The wobble is never the same
twice — nothing here is a fixed image.

The paper is real: grain, an off-white that isn't #fff, and
the whole sheet set down a fraction of a degree off-square.

Graphite flecks drift in from the edges at intervals you
can't predict and are gathered up by the cursor.

------------------------------------------------------------
OPTIONS
------------------------------------------------------------

  Medium — each has its own physics

    Pencil       graphite grain, pressure variation
    Ballpoint    thin, even, the occasional skip
    Marker       fat, bleeding, translucent overlaps
    Ink brush    tapered, pressure-driven
    Charcoal     soft, three passes, smudging
    Blueprint    white on blue, a technical hand

  Paper      White · Cream · Graph · Dot grid ·
             Blueprint · Kraft

  Images     Watercolour wash · Line art · Leave alone
  Messiness  How far the hand wanders off the line
  Draw it on Whether you watch it being drawn
  Handwriting Whether the type changes too

------------------------------------------------------------
ONE HONEST LIMIT
------------------------------------------------------------

Photographs are wobbled with SVG filters — turbulence and
displacement — rather than repainted brush stroke by brush
stroke. Repainting would mean reading the image's pixels, and
any image from another origin taints the canvas and throws,
which is most images on the web. Filters never touch the
bytes, so they work everywhere.

The handwriting is a real handwriting face with the site's
own layout, not glyph outlines re-stroked by a pen. That is
beyond what's affordable on an arbitrary page.

------------------------------------------------------------
INSTALL (Chrome, Edge, Brave — any Chromium browser)
------------------------------------------------------------

1. Unzip this folder somewhere you'll keep it. Deleting the
   folder uninstalls the extension.

2. Go to chrome://extensions (or edge://extensions).

3. Turn on "Developer mode".

4. Click "Load unpacked" and select the unzipped folder —
   the one containing manifest.json.

5. Pin the icon to your toolbar. Click it on any page to
   switch the effect on, click again to switch it off.

   Right-click the icon and choose "Options" to change the
   settings described above.

------------------------------------------------------------
NOTES
------------------------------------------------------------

* Nothing is collected, stored, or sent anywhere. There is no
  network permission — it only touches the tab you're looking
  at, only when you click it.

* Settings are kept in your browser's synced storage, so they
  follow you between machines signed into the same profile.

* It can't run on browser-internal pages (chrome://, the
  extensions gallery, the built-in PDF viewer). Browsers block
  every extension there, not just this one.

* Cross-origin iframes — ads, embeds, YouTube players — can't
  be reached into by any extension, so they sit untouched
  inside the effect. The same goes for canvas-rendered apps
  like Google Docs or Figma, which have no page to work on.

------------------------------------------------------------

Built by Anirudh under the name Anyrvaan.
anyrvaan.com/microtools
