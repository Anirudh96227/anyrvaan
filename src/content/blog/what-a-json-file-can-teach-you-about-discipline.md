---
title: "What a JSON File Can Teach You About Discipline"
description: "Defining a schema forces you to decide what actually matters — and that act of naming is a design discipline dressed up as data entry."
date: 2026-01-23
tags: ["systems", "process", "craft"]
heroMotif: "graph"
---

Nobody thinks of a data schema as a creative discipline. It looks like plumbing — a list of fields, some types, a bit of punctuation. But writing one forces a kind of clarity that most creative processes quietly let you avoid: you have to decide, up front, out loud, what a thing actually is and what about it matters. That's design work, wearing a boring costume.

## A schema won't let you stay vague

When you describe a project in prose, you can gesture at it. "It's kind of a moody, atmospheric series about heroes." Lovely, and completely unactionable. A schema won't take that. To store the same thing as structured data, you have to answer real questions — what fields does every entry have, what's required, what's optional, what's the one thing that identifies each item.

Here's the kind of shape that forces:

```json
{
  "title": "required — the one name this is known by",
  "summary": "required — what it is, in one sentence",
  "year": "required",
  "tags": ["optional, but each must earn its place"],
  "video": "optional — present only if there is one"
}
```

Every line there is a decision that prose would've let you skip entirely. Is `year` required? You have to answer. Is a summary one sentence or a paragraph? You have to commit. The schema is a set of questions you can't quietly wave away.

## Naming a field is deciding what matters

The real discipline, I think, is in the field names. To name `summary` and require it in one sentence is to decide that every project must be reducible to one sentence, and to enforce that forever. To leave `video` optional is to decide a project's identity doesn't depend on having one. These are editorial judgments, made permanent by the structure whether you meant them to be or not.

<div class="table-wrap">

| Vague thinking | Schema thinking |
|---|---|
| "It's got a sort of vibe" | "What are the three fields every item must have?" |
| "I'll figure out the details later" | "Required or optional? Decide now." |
| "It's hard to summarize" | "One sentence. What is it?" |
| Different every time, inconsistent | Same shape every time, by force |
| Nothing is really decided | Everything is decided once, and holds |

</div>

## The discipline transfers off the screen

This is part of why building the content structure for this site clarified the work more than any amount of moodboarding ever did. Defining "what every case study must contain" forced decisions I'd been happily putting off. (The broader mindset behind it is in [The Thing That Makes the Thing](/blog/the-thing-that-makes-the-thing/).) You can borrow the discipline without writing a line of code, honestly — for any project, ask what its schema *would* be. What are the required fields? What's the one identifying thing? The questions clarify whether or not you ever store the answer in a file.

## How to Proceed

<ul class="checklist">
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Take your current project and write its "schema" — the fields every version of it must have. Do it even if nothing will ever be stored as data.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Mark each field required or optional. The act of choosing forces you to decide what's essential and what's incidental.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Force a one-sentence summary field. If you can't fill it, you don't yet know what the thing actually is — that's the useful part.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Notice every field you were tempted to leave vague. That vagueness is exactly where your thinking is still unfinished.</span></li>
<li><span class="tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4 4L19 6.5"/></svg></span><span>Keep the schema small. If it needs twenty fields to describe one thing, you haven't found what actually matters yet.</span></li>
</ul>
