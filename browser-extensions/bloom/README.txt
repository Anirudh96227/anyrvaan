BLOOM
A browser extension by Anyrvaan — anyrvaan.com

------------------------------------------------------------
WHAT IT DOES
------------------------------------------------------------

One click and the page stops loading. It grows.

Every block — headings, paragraphs, images, cards, buttons —
unfurls upward from its own base, clipped open from the
bottom edge and released on a curve that arrives and stops.
The growth is staggered by how far down the page a block
sits, so it spreads like something rooted rather than
everything appearing at once.

When it settles, the larger blocks keep breathing: about a
pixel of drift, a fraction of a degree, on a slow cycle.
You feel it before you see it.

Click again and the page goes back to being a page.

------------------------------------------------------------
INSTALL (Chrome, Edge, Brave, Opera — any Chromium browser)
------------------------------------------------------------

1. Unzip this folder somewhere you'll keep it. If you delete
   the folder later, the extension stops working.

2. Open your browser and go to:
      Chrome  →  chrome://extensions
      Edge    →  edge://extensions
      Brave   →  brave://extensions

3. Turn on "Developer mode" (top-right toggle in Chrome/Edge,
   left sidebar in Brave).

4. Click "Load unpacked" and select the unzipped folder —
   the one containing manifest.json.

5. Bloom now appears in your extensions list. Pin it to the
   toolbar so the icon is one click away.

------------------------------------------------------------
USE IT
------------------------------------------------------------

Go to any website. Click the Bloom icon and watch the page
grow in.

It reads best on a long article or a card-heavy homepage,
where the wave has room to travel.

Click again to stop it and restore the page exactly.

------------------------------------------------------------
THE FULL STACK (if you have all three)
------------------------------------------------------------

Install Negative Space, Bloom, and Undercurrent, then click
all three toolbar icons within about a second and a half.

Instead of toggling, they perform in order: the page grows
in, gets X-rayed, and then strips to bone. About eight
seconds end to end.

They coordinate through the page itself — each extension
runs in its own sealed world and cannot see the others'
code, so the handshake is written on the document and the
trigger is a plain DOM event.

------------------------------------------------------------
NOTES
------------------------------------------------------------

• If you have "reduce motion" turned on in your operating
  system, Bloom respects it: everything arrives immediately
  and nothing breathes. That's deliberate.

• It animates up to 380 blocks and hands the slow breath to
  at most 90 of them, so a huge page stays smooth.

• Nothing is collected, stored, or sent anywhere. It has no
  network permission at all — it only touches the tab you're
  looking at, only when you click it.

• It can't run on browser-internal pages (chrome://, the
  extensions gallery, the built-in PDF viewer). Browsers
  block all extensions there, not just this one.

------------------------------------------------------------

Built by Anirudh under the name Anyrvaan.
anyrvaan.com/microtools
