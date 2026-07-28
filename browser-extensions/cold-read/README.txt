COLD READ
A browser extension by Anyrvaan — anyrvaan.com

------------------------------------------------------------
WHAT IT DOES
------------------------------------------------------------

Quizzes you on an article before you've read it.

Click the icon on any article. The page goes behind a blur,
and you get a handful of questions built from its own
sentences. You answer them cold — that's the point — and say
how sure you were about each one.

Then the blur lifts, and every sentence a question came from
is marked in the page, coloured by how you did:

    Worth a read   you were sure, and wrong
    New to you     you guessed, and wrong
    Lucky          you guessed, and right
    Knew it        you were sure, and right

There is no score, and there never will be. A cross isn't a
failure — it's a bookmark. The whole thing is a map of your
own blind spots laid over the source, so the article you're
about to read already knows which parts matter to you.

The one that does the work is "worth a read": being
confidently wrong is invisible to a normal quiz, because a
score out of ten puts you next to someone who guessed right.

A thin rail down the right edge shows where every marked
sentence sits in the page. Click a tick to jump to it.

------------------------------------------------------------
HOW IT BUILDS THE QUESTIONS
------------------------------------------------------------

Every question comes from one real sentence in the article,
which is what lets it point back at that sentence afterwards.
Nothing is invented, and nothing is written by a model.

It finds the sentences worth asking about — ones carrying a
measurement, a date, a name, a comparison — spreads its picks
across the whole piece rather than clustering in one good
paragraph, then blanks out the specific thing being asked.

Wrong answers are built to be plausible. A number is
perturbed by magnitude and re-formatted to match the real one
exactly, down to the decimal places and the unit. A name is
borrowed from elsewhere in the same article.

If it can't build three convincing wrong answers, it throws
the question away. Four good questions beat seven with one
broken one — a single obviously-silly option tells you the
whole thing was guessed.

If a page hasn't got enough to work with, it says so and
stops rather than asking you filler. It's at its best on
explainers, documentation and technical writing, and weakest
on opinion and narrative, where there are few facts to anchor
to.

------------------------------------------------------------
OPTIONS
------------------------------------------------------------

  Questions            4 to 8. Six is the sweet spot.

  Ask how sure         One extra tap per question. It's what
                       separates "wrong" from "confidently
                       wrong", and that distinction is the
                       reason this exists.

  Cover the page       On by default. Off means you can
                       scroll away and find the answers,
                       which rather defeats it.

  Mark what you knew   Off by default, so the page shows only
                       what's worth your time.

  Questions in the air Question marks drift in from the edges
                       of the screen now and then and merge
                       into the cursor.

------------------------------------------------------------
INSTALL (Chrome, Edge, Brave — any Chromium browser)
------------------------------------------------------------

1. Unzip this folder somewhere you'll keep it. Deleting the
   folder uninstalls the extension.

2. Go to chrome://extensions (or edge://extensions).

3. Turn on "Developer mode".

4. Click "Load unpacked" and select the unzipped folder —
   the one containing manifest.json.

5. Pin the icon to your toolbar. Click it on an article to
   start; click it again, or press Esc, to put it away.

   Right-click the icon and choose "Options" to change the
   settings described above.

------------------------------------------------------------
NOTES
------------------------------------------------------------

* Nothing is collected, stored, or sent anywhere. There is no
  network permission — it only touches the tab you're looking
  at, only when you click it. Everything, including building
  the questions, happens on your machine.

* Settings are kept in your browser's synced storage, so they
  follow you between machines signed into the same profile.
  Your answers are not stored at all; close the page and
  they're gone.

* It never edits the article. Marks are painted as an overlay
  on top of the page rather than wrapped around its text, so
  nothing on the site is changed and a reload clears
  everything.

* It can't run on browser-internal pages (chrome://, the
  extensions gallery, the built-in PDF viewer). Browsers block
  every extension there, not just this one.

* Cross-origin iframes — ads, embeds, YouTube players — can't
  be reached into by any extension. The same goes for
  canvas-rendered apps like Google Docs or Figma, which have
  no page text to read.

* On pages that rebuild themselves as you scroll, marks may
  drift if the article changes underneath them. Re-run it and
  they'll be right again.

------------------------------------------------------------

Built by Anirudh under the name Anyrvaan.
anyrvaan.com/microtools
