UNDERCURRENT
A browser extension by Anyrvaan — anyrvaan.com

------------------------------------------------------------
WHAT IT DOES
------------------------------------------------------------

The page stays exactly where it is — readable, clickable,
working. Over the top goes the layer you don't normally get
to see:

  • Everything that exists to sell you something is boxed in
    amber and labelled. Ad slots, sponsored units, tracking
    iframes.

  • Every link that leaves the site gets tagged with where
    it actually goes — and a mark if it's carrying tracking
    parameters.

  • Content blocks are outlined in hairlines whose weight
    grows with how deep they're buried in the markup.

  • A slow current runs down the spine of the content,
    following where the page's actual weight sits.

The readout in the corner counts it up: how much of what
you're reading is the article, and how much of it is the
business model.

Click again and the layer lifts.

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

5. Undercurrent now appears in your extensions list. Pin it
   to the toolbar so the icon is one click away.

------------------------------------------------------------
USE IT
------------------------------------------------------------

Go to a news site, a recipe site, or anything with a
comments section. Click the Undercurrent icon.

Scroll while it's on — the layer follows the page and
re-measures as things load in.

Click again to lift it.

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

• Ad detection is honest guesswork: it reads class names,
  IDs, and iframe sources against a list of known ad-network
  signatures. It will miss cleverly-named slots and will
  occasionally flag something innocent. It's an X-ray, not
  an audit.

• The overlay never intercepts clicks. The site underneath
  behaves exactly as it did.

• Nothing is collected, stored, or sent anywhere. It has no
  network permission at all — it only touches the tab you're
  looking at, only when you click it. The link destinations
  it reads never leave your machine.

• It can't run on browser-internal pages (chrome://, the
  extensions gallery, the built-in PDF viewer). Browsers
  block all extensions there, not just this one.

------------------------------------------------------------

Built by Anirudh under the name Anyrvaan.
anyrvaan.com/microtools
