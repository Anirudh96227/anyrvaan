NEGATIVE SPACE
A browser extension by Anyrvaan — anyrvaan.com

------------------------------------------------------------
WHAT IT DOES
------------------------------------------------------------

One click strips the page you're on down to its skeleton.

Colour, imagery, shadow, and rounded corners come off. What's
left is the structure underneath: type, whitespace, and thin
hairline frames where every image used to sit.

The counter in the corner tells you how many things were
removed. On most sites the number is larger than you expect.

Click again and the real page fades back.

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

5. Negative Space now appears in your extensions list. Pin it
   to the toolbar so the icon is one click away.

------------------------------------------------------------
USE IT
------------------------------------------------------------

Go to any website. Click the Negative Space icon.

Click it again to bring the page back.

Reloading the page also resets it — the real site is always
the default. This is a lens you hold up, not a setting you
leave on.

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

• It can't run on browser-internal pages (chrome://, the
  extensions gallery, the built-in PDF viewer). Browsers
  block all extensions there, not just this one.

• Nothing is collected, stored, or sent anywhere. It has no
  network permission at all — it only touches the tab you're
  looking at, only when you click it.

• Some sites lay themselves out with background images
  rather than <img> tags. Those disappear rather than
  leaving a frame, because there's no element to frame.

------------------------------------------------------------

Built by Anirudh under the name Anyrvaan.
anyrvaan.com/microtools
