import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.coerce.date(),
		tags: z.array(z.string()).default([]),
		// A code-generated hero motif rendered above the title. Each value maps
		// to a generative canvas renderer (see initPostHero in Layout.astro),
		// picked to fit the post's theme. Omit for no hero visual.
		heroMotif: z.enum(['funnel', 'ripple', 'graph']).optional(),
		// An interactive code-generated demo rendered above the article, in
		// place of a hero motif, for posts that embed a live component.
		demo: z.enum(['sheet-to-dashboard']).optional(),
		// A single video (YouTube URL or local /path) shown as a framed hero
		// player under the header — for posts whose subject is one film. The
		// chapter films live in the Journal; each post embeds the relevant one.
		youtube: z.string().optional(),
		draft: z.boolean().default(false),
	}),
});

// A case study on /work. Body is the project's own framing statement.
// `video`/`poster` are for a single-video case study — shown as a hero
// player right under the header when present. `gallery` is for an
// image-plate case study — shown as a grid, last item as a wide finale.
// Gallery images are colocated under each project's folder (not public/) so
// the `image()` helper can run them through Astro's build-time pipeline
// (WebP output, responsive srcset, intrinsic width/height for CLS).
const work = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			summary: z.string(),
			year: z.string(),
			// Explicit position in the /work list and homepage featured set —
			// lower comes first; entries without one sort after, by year.
			order: z.number().optional(),
			tags: z.array(z.string()).default([]),
			// The project's face: one still shown on the /work index card and the
			// homepage preview. Runs through Astro's image pipeline. Entries
			// without one render as compact text rows (reference works).
			cover: image().optional(),
			coverAlt: z.string().optional(),
			// 16:9 stills pulled from the films — shown as a "Stills" strip under
			// the narrative so a case study about screen work actually shows the
			// screens, not just describes them. Run through the image pipeline.
			frames: z
				.array(
					z.object({
						src: image(),
						alt: z.string(),
						caption: z.string().optional(),
					})
				)
				.optional(),
			video: z.string().optional(),
			poster: z.string().optional(),
			// A single-piece case study can lead with an embedded Behance project
			// instead of a video — same centered hero treatment, sized to
			// Behance's own embed ratio rather than 16:9.
			behanceId: z.string().optional(),
			// The single line naming the connecting idea across the piece — shown as
			// a large pull-quote right under the header, swept in the site's heading
			// light-sweep treatment. What used to live buried in the closing
			// paragraph of the body now leads the page.
			thesis: z.string().optional(),
			// Overrides for the multi-video "studies" grid section — different
			// projects hold different kinds of pieces, so the section copy
			// shouldn't be hardcoded to any one project's theme.
			studiesEyebrow: z.string().optional(),
			studiesHeading: z.string().optional(),
			studiesIntro: z.string().optional(),
			gallery: z
				.array(
					z.object({
						src: image(),
						alt: z.string(),
						caption: z.string().optional(),
						// Reader-facing prose for this plate, shown beside it in the
						// alternating layout — distinct from `alt`, which stays a plain
						// accessibility description of the image itself.
						note: z.string().optional(),
					})
				)
				.optional(),
			draft: z.boolean().default(false),
		}),
});

// One video-driven "study" belonging to a work entry (`project` matches that
// entry's id). Body is the study's own long-form brief.
const studies = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/studies' }),
	schema: ({ image }) =>
		z.object({
			project: z.string(),
			number: z.number(),
			title: z.string(),
			creator: z.string().optional(),
			// A short (few-word) phrase naming this study's own angle on the
			// project's connecting thread — shown on the grid tile beneath the
			// title, so the grid reads as chapters of one idea, not a video wall.
			thread: z.string().optional(),
			// A study is either a video (local file or YouTube URL) or an embedded
			// Behance project — exactly one of `video` / `behanceId` is set.
			video: z.string().optional(),
			behanceId: z.string().optional(),
			poster: z.string().optional(),
			// A second, graphite-style AI-generated illustration of the same
			// subject — an alternate rendering shown alongside the video, not
			// concept art and not claimed to precede it (see companionLabel).
			companion: image().optional(),
			companionLabel: z.string().optional(),
			// The generation workflow for this piece: an ordered list of steps,
			// each a short label + one line of detail. Rendered as an interactive,
			// step-by-step disclosure rather than a wall of prose.
			toolChain: z
				.array(
					z.object({
						step: z.string(),
						detail: z.string(),
					})
				)
				.optional(),
			draft: z.boolean().default(false),
		}),
});

export const collections = { blog, work, studies };
