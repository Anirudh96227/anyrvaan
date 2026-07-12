// The Interaction Lab gallery's 24 prototypes. Shared between the gallery
// grid (src/pages/experiments.astro) and each detail page
// (src/pages/experiments/[slug].astro). ExperimentCard.astro and [slug].astro
// key their hover/ambient CSS patterns off `slug` directly.
export interface Experiment {
	slug: string;
	order: number;
	codename: string;
	classification: string;
	description: string;
	fullDescription: string;
	tags: string[];
}

export const experiments: Experiment[] = [
	{
		slug: 'residual',
		order: 1,
		codename: 'Residual',
		classification: 'Temporal · Motion',
		description:
			'Your previous cursor positions become physical entities that continue interacting with the interface, creating multiple overlapping timelines.',
		fullDescription:
			'Your previous cursor positions become physical entities that continue interacting with the interface, creating multiple overlapping timelines.',
		tags: ['Canvas', 'Pointer events'],
	},
	{
		slug: 'fold',
		order: 2,
		codename: 'Fold',
		classification: 'Geometry · Physics',
		description:
			'Grab any page corner and physically fold the webpage. Layout, text and images bend naturally around the crease.',
		fullDescription:
			'Users can grab any page corner and physically fold the webpage. Layout, text and images bend naturally around the fold.',
		tags: ['CSS transforms', 'Clip-path'],
	},
	{
		slug: 'flux-ink',
		order: 3,
		codename: 'Flux Ink',
		classification: 'Fluid Simulation',
		description:
			'Interactions generate liquid ink governed by gravity, viscosity, momentum and surface tension.',
		fullDescription:
			'Interactions generate liquid ink governed by gravity, viscosity, momentum and surface tension.',
		tags: ['Canvas', 'Fluid dynamics'],
	},
	{
		slug: 'pulse-type',
		order: 4,
		codename: 'Pulse Type',
		classification: 'Living Typography',
		description:
			'Every glyph behaves independently — blinking, stretching, and subtly reacting to nearby interaction while staying readable.',
		fullDescription:
			'Every glyph behaves independently, blinking, stretching and subtly reacting to nearby interaction while remaining readable.',
		tags: ['Variable fonts', 'CSS'],
	},
	{
		slug: 'mesh',
		order: 5,
		codename: 'Mesh',
		classification: 'Adaptive Layout',
		description:
			'The layout behaves like stretched fabric — moving one section deforms the grid around it.',
		fullDescription:
			'The layout behaves like stretched fabric where moving one section deforms the surrounding grid.',
		tags: ['CSS Grid', 'Transforms'],
	},
	{
		slug: 'lumen',
		order: 6,
		codename: 'Lumen',
		classification: 'Dynamic Lighting',
		description:
			'A virtual light source follows the cursor, casting physically accurate soft shadows across the interface.',
		fullDescription:
			'A virtual light source follows the cursor, producing physically accurate soft shadows across the interface.',
		tags: ['CSS', 'Box-shadow'],
	},
	{
		slug: 'lag',
		order: 7,
		codename: 'Lag',
		classification: 'Temporal Navigation',
		description:
			'Previous scroll positions continue existing as delayed timelines before eventually merging back together.',
		fullDescription:
			'Previous scroll positions continue existing as delayed timelines before eventually merging back together.',
		tags: ['Scroll', 'Canvas'],
	},
	{
		slug: 'swarm',
		order: 8,
		codename: 'Swarm',
		classification: 'Emergent Systems',
		description:
			'Thousands of particles evolve their own communication system, forming patterns and collective behaviors.',
		fullDescription:
			'Thousands of particles evolve their own communication system by forming patterns, structures and collective behaviors.',
		tags: ['Canvas', 'Particle systems'],
	},
	{
		slug: 'drift',
		order: 9,
		codename: 'Drift',
		classification: 'Controlled Chaos',
		description:
			'The interface continuously mutates while preserving usability, creating a dream-like evolving layout.',
		fullDescription:
			'The interface continuously mutates while preserving usability, creating a dream-like evolving layout.',
		tags: ['CSS', 'Layout'],
	},
	{
		slug: 'mass',
		order: 10,
		codename: 'Mass',
		classification: 'Force Simulation',
		description:
			'Cursor mass changes dynamically, affecting UI components and particles through simulated force.',
		fullDescription:
			'Cursor mass changes dynamically, affecting UI components, particles and interactions through simulated force.',
		tags: ['Physics', 'Easing'],
	},
	{
		slug: 'field',
		order: 11,
		codename: 'Field',
		classification: 'Procedural Fields',
		description:
			'Procedural fields behave like magnetic landscapes that continuously reshape around user interaction.',
		fullDescription:
			'Procedural fields behave like magnetic landscapes that continuously reshape around user interaction.',
		tags: ['Canvas', 'Noise fields'],
	},
	{
		slug: 'residue',
		order: 12,
		codename: 'Residue',
		classification: 'Persistent Systems',
		description:
			'Every interaction permanently leaves dust behind, gradually building a unique visual history of activity.',
		fullDescription:
			'Every interaction permanently leaves dust behind, gradually building a unique visual history of user activity.',
		tags: ['LocalStorage', 'Canvas'],
	},
	{
		slug: 'paradox',
		order: 13,
		codename: 'Paradox',
		classification: 'Optical Systems',
		description:
			'Reflective surfaces predict future movement rather than mirroring the present, producing impossible visuals.',
		fullDescription:
			'Reflective surfaces predict future movement rather than mirroring the present, producing impossible visual behavior.',
		tags: ['CSS', 'Prediction'],
	},
	{
		slug: 'drag',
		order: 14,
		codename: 'Drag',
		classification: 'Material Physics',
		description:
			'Every UI component has different friction, momentum and inertia, as if built from different materials.',
		fullDescription:
			'Every UI component has different friction, momentum and inertia, making the interface feel constructed from different materials.',
		tags: ['Spring physics', 'CSS'],
	},
	{
		slug: 'spectrum',
		order: 15,
		codename: 'Spectrum',
		classification: 'Spectral Motion',
		description:
			'Individual RGB channels respond independently to simulated gravity, creating dynamic chromatic distortions.',
		fullDescription:
			'Individual RGB channels respond independently to simulated gravity, creating dynamic chromatic distortions.',
		tags: ['Blend modes', 'Filters'],
	},
	{
		slug: 'membrane',
		order: 16,
		codename: 'Membrane',
		classification: 'Surface Simulation',
		description:
			'The viewport becomes a living membrane, reacting to cursor movement, clicks, scrolling and touch.',
		fullDescription:
			'The viewport becomes a living membrane reacting to cursor movement, clicks, scrolling and touch.',
		tags: ['Canvas', 'WebGL'],
	},
	{
		slug: 'twin',
		order: 17,
		codename: 'Twin',
		classification: 'Multi-Agent Interaction',
		description:
			'Multiple autonomous cursors emerge with different personalities — assisting, resisting, or predicting your movement.',
		fullDescription:
			'Multiple autonomous cursors emerge with different personalities, assisting, resisting or predicting user movement.',
		tags: ['Canvas', 'Agents'],
	},
	{
		slug: 'mirage',
		order: 18,
		codename: 'Mirage',
		classification: 'Visual Perception',
		description:
			'Optical illusions create convincing depth and motion using perception rather than actual movement.',
		fullDescription:
			'Optical illusions create convincing depth and motion using perception rather than actual movement.',
		tags: ['CSS', 'Perception'],
	},
	{
		slug: 'morph',
		order: 19,
		codename: 'Morph',
		classification: 'Organic Shapes',
		description:
			'Rectangles continuously reshape into soft, clay-like forms while preserving layout and usability.',
		fullDescription:
			'Rectangles continuously reshape into soft clay-like forms while preserving layout and usability.',
		tags: ['Border-radius', 'CSS'],
	},
	{
		slug: 'chrono',
		order: 20,
		codename: 'Chrono',
		classification: 'Temporal Physics',
		description:
			'Different regions of the page operate at different time scales, allowing localized time manipulation.',
		fullDescription:
			'Different regions of the page operate at different time scales, allowing localized time manipulation.',
		tags: ['Animation timing', 'CSS'],
	},
	{
		slug: 'growth',
		order: 21,
		codename: 'Growth',
		classification: 'Organic Growth',
		description:
			'Borders evolve into roots, vines or crystal formations that keep growing based on interaction history.',
		fullDescription:
			'Borders evolve into roots, vines or crystal formations that continue growing based on interaction history.',
		tags: ['SVG', 'Procedural'],
	},
	{
		slug: 'cadence',
		order: 22,
		codename: 'Cadence',
		classification: 'Motion Choreography',
		description:
			'Every interaction contributes to an invisible composition — synchronized motion standing in for sound.',
		fullDescription:
			'Every interaction contributes to an invisible composition where synchronized motion replaces sound to create a living choreography.',
		tags: ['CSS', 'Choreography'],
	},
	{
		slug: 'collapse',
		order: 23,
		codename: 'Collapse',
		classification: 'Quantum Interaction',
		description:
			'UI components exist in multiple simultaneous states until interaction collapses them into one outcome.',
		fullDescription:
			'UI components exist in multiple simultaneous states until user interaction collapses them into a single outcome.',
		tags: ['CSS', 'State'],
	},
	{
		slug: 'infinite',
		order: 24,
		codename: 'Infinite',
		classification: 'Spatial Perspective',
		description:
			'The interface transforms into an infinite landscape with dynamic horizons, atmospheric fog and large-scale parallax.',
		fullDescription:
			'The interface transforms into an infinite landscape with dynamic horizons, atmospheric perspective, depth fog and large-scale parallax, creating the illusion of endless space.',
		tags: ['WebGL', 'Parallax'],
	},
];
