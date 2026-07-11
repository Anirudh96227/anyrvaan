import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
	const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
		(a, b) => b.data.date.valueOf() - a.data.date.valueOf()
	);

	return rss({
		title: 'Anyrvaan — Journal',
		description: 'Field notes on design, technology, and process.',
		site: context.site ?? 'https://anyrvaan.com',
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.date,
			link: `/blog/${post.id}/`,
			categories: post.data.tags,
		})),
	});
}
