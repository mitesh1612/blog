---
title: "Blog Update 2"
description: "The blog gets a fresh new look, powered by Astro and the AstroPaper theme"
pubDatetime: 2026-04-22T00:00:00Z
author: Mitesh Shah
featured: true
draft: false
tags:
  - astro
  - blog
  - about
---

Hey there. It's been a *really* long time since I wrote anything on this blog (or tbh did anything with it). But today I wanted to share a pretty significant update - I've completely overhauled the tech stack for this blog. Again.

If you've been a reader previously (which is still highly unlikely, but hey, a man can dream), you may notice the blog looks completely different now. That's because I've moved from Fastpages to **Astro**, using the **AstroPaper** theme. Let me share why, and what's next.

## Why Move Away from Fastpages?

If you read my [Blog Update 1](/blog/posts/blog-update-1), you might remember that I had some issues with Fastpages — the Jekyll developer experience wasn't great, theme customization was limited, and a few things felt clunky. Well, turns out those issues only aged worse. Fastpages has been **officially deprecated** by fastai, and the project is no longer maintained.

So I was left with a blog running on a deprecated framework, with no updates, and the lingering fear that something would break one day and I'd have no way to fix it. Not ideal. It was time to move.

## Choosing the Right Tech Stack (Again)

I know, I know. This is the third time I'm changing the tech stack for this blog. Gatsby, then Fastpages, and now Astro. In my defense, each move was for a good reason! And this time, I've put more thought into it.

Here were my requirements:
- **Fast and modern** — I wanted something that felt snappy, both in development and on the final site
- **Markdown-first** — my posts are all in Markdown and I don't want to fight my framework to write blog posts
- **Easy to customize** — I wanted full control over the look and feel, without needing to learn a whole new ecosystem
- **Good developer experience** — a simple `npm run dev` and I'm off. No Docker, no Ruby, no weird setups
- **Static site generation** — still hosting on GitHub Pages, so static output is a must

I looked at a few options — Hugo (again), Next.js, Eleventy — but [Astro](https://astro.build/) stood out for several reasons:

1. **Built for content sites.** Astro is literally designed for blogs and content-heavy sites. It ships zero JavaScript by default and renders everything to static HTML. The performance is insane.
2. **Markdown is a first-class citizen.** Content collections, frontmatter validation with TypeScript schemas, remark/rehype plugin support — it's all built in.
3. **The ecosystem is great.** Tailwind CSS, sitemap generation, RSS feeds, syntax highlighting with Shiki — all available as simple integrations.
4. **It just works.** `npm install`, `npm run dev`, and you have a blog running. No Docker containers, no Ruby gems, no mysterious build failures.
5. **React and MDX support.** This is the one I'm most excited about. Astro has first-class support for [MDX](https://mdxjs.com/), which lets you use React (or any other framework's) components right inside your Markdown posts. Imagine interactive code demos, custom callout boxes, embedded charts — all as reusable components that I can drop into any post. I haven't set this up yet, but the fact that I *can* build custom React components to truly make this blog my own is a huge draw. It's aspirational for now, but worth a shot!

## Why AstroPaper?

Once I decided on Astro, I needed a theme. I could have built one from scratch, but let's be honest — I wanted to start writing, not spend weeks tweaking CSS.

[AstroPaper](https://github.com/satnaing/astro-paper) caught my eye because:

- It's **minimal and clean** — I like blogs that let the content breathe, not ones with animations and widgets everywhere
- It has **everything I need out of the box** — dark mode, search (powered by Pagefind), tags, pagination, RSS, SEO, dynamic OG image generation
- It's a **template, not a package** — meaning I own all the code. Every component, layout, and style is in my repo. If I want to change something, I just edit the file. No "ejecting" or fighting with theme APIs. Maximum customizability.
- The **TypeScript support** is solid — frontmatter is validated against a Zod schema, so I can't accidentally forget a required field in my posts

That last point about owning the code is actually the main reason. With Fastpages (and even Gatsby before that), I always felt like I was at the mercy of the theme. Want to change the header? Good luck figuring out the theme's override system. With AstroPaper, I just open `Header.astro` and edit it. Simple.

## The Migration

The migration itself was fairly smooth. All my existing posts were already in Markdown, so the main work was:

1. Converting the Jekyll frontmatter format to Astro Paper's format (different field names, dates in ISO format, categories became tags)
2. Moving images around and fixing their paths
3. Setting up the GitHub Actions workflow for Astro builds
4. Adding KaTeX support for my one post that uses LaTeX equations (yes, I set up a whole math rendering pipeline for one equation in one post, don't judge me 😄)

All 16 existing posts made it through, images and all.

## What's Next?

Right now, I've migrated with minimal changes to the default AstroPaper theme. It looks nice enough, but I want to make this blog truly *mine*. Here's what I'm planning:

- **Custom color scheme and styling** — the default theme is clean, but I want to give it a bit more personality
- **Better about page** — the current one is pretty bare bones
- **More posts!** — this is the real goal. I've been terrible at writing consistently and I want to change that. I have a bunch of topics I want to write about, ranging from system design patterns to random tech deep dives

The beauty of AstroPaper being a template is that I can make these improvements incrementally. No big bang rewrites, just steady improvements over time.

If you've been reading this blog (all three of you), thanks for sticking around. And if you're new here, welcome! Hopefully the new look makes things a bit more pleasant to read.

Until next time. 😊
