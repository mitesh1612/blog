# Mitesh Shah's Blog

My personal developer blog — posts on Software Development, Testing, Cloud, Machine Learning and more.

🔗 **Live at**: [mitesh1612.github.io/blog](https://mitesh1612.github.io/blog/)

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Astro](https://astro.build/) |
| **Theme** | [AstroPaper v5](https://github.com/satnaing/astro-paper) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Search** | [Pagefind](https://pagefind.app/) (static, built at compile time) |
| **Math/LaTeX** | [KaTeX](https://katex.org/) via `remark-math` + `rehype-katex` |
| **Syntax Highlighting** | [Shiki](https://shiki.style/) with notation transformers |
| **Callouts** | `remark-directive` with custom callout plugin |
| **OG Images** | Auto-generated via [Satori](https://github.com/vercel/satori) + [resvg](https://github.com/nicolo-ribaudo/resvg-js) |
| **Deployment** | GitHub Pages (via GitHub Actions) |
| **Type Checking** | [TypeScript](https://www.typescriptlang.org/) |
| **Linting** | [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/) |

## 🚀 Running Locally

**Prerequisites**: [Node.js](https://nodejs.org/) v20+

```bash
# Install dependencies
npm install

# Start the dev server (available at http://localhost:4321/blog/)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

### Other useful commands

```bash
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without modifying
npm run lint          # Lint with ESLint
npm run sync          # Regenerate Astro TypeScript types
```

## 📝 Adding a New Post

1. Create a new `.md` file in `src/data/blog/` (the filename becomes the URL slug):

   ```
   src/data/blog/my-new-post.md  →  /blog/posts/my-new-post
   ```

2. Add the required frontmatter at the top:

   ```yaml
   ---
   title: "Your Post Title"
   description: "A brief description for SEO and post excerpts"
   pubDatetime: 2026-04-22T00:00:00Z
   author: Mitesh Shah
   tags:
     - your-tag
     - another-tag
   featured: false
   draft: false
   ---

   Your markdown content goes here...
   ```

### Frontmatter fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | ✅ | Post title (h1) |
| `description` | ✅ | Used in excerpts and meta tags |
| `pubDatetime` | ✅ | Publish date in ISO 8601 format |
| `author` | ❌ | Defaults to `Mitesh Shah` |
| `tags` | ❌ | Array of tags; defaults to `["others"]` |
| `featured` | ❌ | Show on homepage featured section (`false` by default) |
| `draft` | ❌ | Set `true` to hide from production (`false` by default) |
| `modDatetime` | ❌ | Last modified date (add when updating a post) |
| `ogImage` | ❌ | Custom OG image (auto-generated if omitted) |
| `canonicalURL` | ❌ | Canonical URL if cross-posted elsewhere |

### Adding images

- **Recommended**: Place images in `public/images/` and reference with absolute paths:

  ```markdown
  ![Alt text](/images/my-post/screenshot.png)
  ```

- For Astro-optimized images, place them in `src/assets/images/` and use relative paths:

  ```markdown
  ![Alt text](../../assets/images/screenshot.png)
  ```

### Using LaTeX equations

Inline math with single dollar signs: `$E = mc^2$`

Block equations with double dollar signs:

```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```
## Writing Guide

See [`docs/writing-guide.md`](docs/writing-guide.md) for a complete showcase of all components and features.

## 📁 Project Structure

```
/
├── public/
│   └── images/           # Static images (served as-is)
├── src/
│   ├── assets/           # Optimized assets (icons, images)
│   ├── components/       # Astro/React components
│   ├── data/blog/        # Blog posts (markdown)
│   ├── layouts/          # Page layouts
│   ├── pages/            # Route pages (index, about, tags, etc.)
│   ├── styles/           # Global CSS (Tailwind + typography)
│   ├── utils/            # Utility functions
│   ├── config.ts         # Site configuration
│   ├── constants.ts      # Social links and share links
│   └── content.config.ts # Content collection schema
├── astro.config.ts       # Astro configuration
├── package.json
└── tsconfig.json
```

## 🔄 Updating the Theme

AstroPaper is a starter template, not an npm package — updates are applied manually. See the [AstroPaper update guide](https://astro-paper.pages.dev/posts/how-to-update-dependencies/) and the [changelog](https://github.com/satnaing/astro-paper/blob/main/CHANGELOG.md) for details.

## 📜 License

Licensed under the [MIT License](LICENSE).
