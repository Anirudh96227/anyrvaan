TYPESET
A browser extension by Anyrvaan — anyrvaan.com

------------------------------------------------------------
WHAT IT DOES
------------------------------------------------------------

Re-sets any page in a typographic pairing you chose, and does
it as a wave: the page dims from the top down, the type
changes underneath, and each line comes back with its leading
and its measure corrected.

Before it touches anything it reads the site and tells you
what it found, in one line:

    Set in system-ui, 17px/1.5, ~92 characters.
    Given Editorial, leading 1.62, measure capped at 68.

Hold the ` key at any time to see the site's own type again —
the only honest way to judge whether you improved it.

Every face used is one already installed on your machine.
Nothing is downloaded. That means it works offline, needs no
network permission, and no site is ever told which font you
picked.

Icon fonts are detected and left alone. This is the thing most
font extensions get wrong: icon sets draw their glyphs from
the Private Use Area or by ligature, so overriding them turns
every icon on the page into a stray letter. Code and <pre>
stay monospaced.

Letterforms drift in from the edges of the screen now and
then and merge into the cursor.

------------------------------------------------------------
OPTIONS — five pairings, each one a decision
------------------------------------------------------------

  Editorial    Iowan Old Style / Charter
               long reading, essays

  Technical    Segoe UI / Plex Mono
               documentation, dashboards, code

  Quiet        Optima / Candara
               news, and anything shouting at you

  Display      Didot / system sans
               portfolios, landing pages

  Typewriter   Cascadia Mono throughout
               when you want everything flat

  Plus type scale, leading correction on/off, measure cap
  on/off, and the drifting letterforms on/off.

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
