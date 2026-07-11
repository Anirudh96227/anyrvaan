# Anyrvaan

Design × Technology × Experiences.

Anyrvaan is a creative technology studio. This repository is the studio's
website — not a portfolio template, a first case study in itself.

See [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) for the full vision,
[BRAND_MANIFESTO.md](./BRAND_MANIFESTO.md) for voice and philosophy,
[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for visual/motion rules, and
[DECISIONS.md](./DECISIONS.md) for the log of why things are built the way
they are.

## Stack

- [Astro](https://astro.build) — static-first frontend framework
- [Tailwind CSS](https://tailwindcss.com) (v4) — utility-first styling
- TypeScript — where it earns its keep
- GSAP + Lenis — animation and smooth scroll (added in a later milestone)
- Hosted on Cloudflare Pages, version-controlled on GitHub

## Local development

```sh
npm install       # install dependencies (only needed after cloning, or after package.json changes)
npm run dev       # start local dev server at http://localhost:4321
npm run build     # production build, output to ./dist/
npm run preview   # preview the production build locally
```

## Project structure

```text
/
├── public/            static assets served as-is (favicons, fonts, images)
├── src/
│   ├── components/     reusable pieces (Nav, PageHeader, …)
│   ├── layouts/        shared page shells (html/head/body wrappers)
│   ├── pages/          one file = one route (Astro's file-based routing)
│   └── styles/         global CSS, Tailwind entry point
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

This structure grows milestone by milestone — see [TODO.md](./TODO.md) for
what's next.
