COLOURWAY
A browser extension by Anyrvaan — anyrvaan.com

------------------------------------------------------------
WHAT IT DOES
------------------------------------------------------------

The same page, re-issued in a different set of colours — the
way a textile design gets released in several colourways.

It is not an invert. Inverting is why most theme extensions
turn photographs into negatives and careful greys into mud.
Every colour on the page is taken into OKLCH — a space where
lightness, chroma and hue are separable and perceptually even
— and remapped through the scheme you chose.

Three things happen that a filter can't do:

  It maps the page's own lightness axis, not absolute
  numbers. Where a colour sits between *this page's*
  background and *this page's* text is what matters. That one
  idea is why a light page inverts into Ink correctly and a
  page that is already dark doesn't get flipped inside out.

  It tints the neutrals and leaves the colours alone. A page
  is mostly greys, and greys are what carry a scheme. Things
  that already have colour keep their own hue, nudged only
  slightly, so the site's internal colour relationships
  survive. Rotate them any further and a blue link comes out
  violet and the page stops being itself.

  It repairs contrast afterwards. Every text/background pair
  is measured with APCA and, if it falls below your target,
  the text's lightness is walked away from its background
  until it passes. APCA rather than the WCAG 2.1 ratio,
  because 2.1 is known to misjudge pairs on dark backgrounds
  — which is where this spends most of its time.

The readout tells you how many colours it remapped, how many
came through the site's own CSS variables, and how many pairs
it had to repair.

Pigment drifts in from the edges of the screen at intervals
you can't predict, and is gathered up by the cursor.

------------------------------------------------------------
THE FIVE SCHEMES
------------------------------------------------------------

  Ink       near-black ground, warm off-white text
            neutral dark

  Paper     warm white ground, near-black text
            neutral light

  Indigo    deep indigo ground, cool white text
            amber accent — the complement of indigo

  Teal      deep teal ground, warm white text
            coral accent — split-complementary

  Maximum   pure black and white, one accent
            highest contrast, for small text or bright rooms

  Contrast target: Comfortable (Lc 60) · High (Lc 75) ·
  Maximum (Lc 90). Photographs are left alone unless you ask
  otherwise.

------------------------------------------------------------
HONEST LIMITS
------------------------------------------------------------

* Text over a photograph or a gradient has no single colour
  behind it, so those pairs can't be judged properly. The
  contrast repair is good, not perfect.

* Colour baked into images, canvas-rendered apps, and inline
  SVG with hard-coded fills can't all be reached.

* There is a brief flash of the site's own colours before the
  new scheme lands.

* A site that already ships a good dark mode is usually
  better off toggled than re-themed.

------------------------------------------------------------
INSTALL (Chrome, Edge, Brave — any Chromium browser)
------------------------------------------------------------

1. Unzip this folder somewhere you'll keep it. Deleting the
   folder uninstalls the extension.

2. Go to chrome://extensions (or edge://extensions).

3. Turn on "Developer mode".

4. Click "Load unpacked" and select the unzipped folder —
   the one containing manifest.json.

5. Pin the icon. Click it on any page to switch the scheme
   on, click again to switch it off. The new palette spreads
   out from wherever you last clicked.

   Right-click the icon and choose "Options" to pick a scheme
   and a contrast target.

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
  be reached into by any extension, so they keep their own
  colours inside the re-themed page.

------------------------------------------------------------

Built by Anirudh under the name Anyrvaan.
anyrvaan.com/microtools/extensions
