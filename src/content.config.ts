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
		draft: z.boolean().default(false),
	}),
});

// A case study on /work. Body is the project's own framing statement.
// `video`/`poster` are for a single-video case study — shown as a hero
// player right under the header when present. `gallery` is for an
// image-plate case study — shown as a grid, last item as a wide finale.
const work = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		year: z.string(),
		tags: z.array(z.string()).default([]),
		video: z.string().optional(),
		poster: z.string().optional(),
		gallery: z
			.array(
				z.object({
					src: z.string(),
					alt: z.string(),
					caption: z.string().optional(),
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
	schema: z.object({
		project: z.string(),
		number: z.number(),
		title: z.string(),
		video: z.string(),
		poster: z.string().optional(),
		draft: z.boolean().default(false),
	}),
});

export const collections = { blog, work, studies };
