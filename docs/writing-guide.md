# Blog Components & Features Showcase

> A reference guide for all the fancy components and features available in this blog.
> Copy-paste these snippets into your `.md` posts.

---

## Table of Contents

- [Callout Boxes](#callout-boxes)
- [Code Blocks](#code-blocks)
- [Math (KaTeX)](#math-katex)
- [Collapsible Table of Contents](#collapsible-table-of-contents)
- [Markdown Essentials](#markdown-essentials)
- [Frontmatter Reference](#frontmatter-reference)

---

## Callout Boxes

Four variants available via the `:::variant` syntax (powered by `remark-directive`).
By default, callouts show **no title** — just the icon and content. Add a custom title with `:::variant[Your Title]`.

### Info

```markdown
:::info
This is an informational callout. Use it for tips, notes, or "FYI" content.
:::
```

### Warning

```markdown
:::warning
Watch out! This highlights potential pitfalls or gotchas.
:::
```

### Success

```markdown
:::success
This approach works great — use it to highlight recommended patterns.
:::
```

### Quote

```markdown
:::quote
"Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler
:::
```

### With Custom Titles

Provide an explicit title using square brackets — otherwise no title is shown:

```markdown
:::info[Did you know?]
Astro ships zero JavaScript by default.
:::

:::warning[Breaking Change]
This API was deprecated in v3.0.
:::
```

---

## Code Blocks

### Basic Syntax Highlighting

Use triple backticks with a language identifier:

````markdown
```python
def hello(name: str) -> str:
    return f"Hello, {name}!"
```
````

Supported languages: all [Shiki languages](https://shiki.style/languages) — JavaScript, TypeScript, Python, C#, Go, Rust, CSS, HTML, JSON, YAML, Bash, SQL, and many more.

### File Name Labels

Add a `file="filename"` attribute to show a filename tab above the code block:

````markdown
```ts file="src/utils/helper.ts"
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US");
}
```
````

### Line Highlighting

Highlight specific lines using the `// [!code highlight]` comment:

````markdown
```ts
function greet(name: string) {
  console.log(`Hello, ${name}!`); // [!code highlight]
  return true;
}
```
````

### Word Highlighting

Highlight specific words with `// [!code word:yourWord]`:

````markdown
```ts
// [!code word:config]
const config = loadConfig();
applyConfig(config);
```
````

### Diff Notation

Show added/removed lines with `// [!code ++]` and `// [!code --]`:

````markdown
```ts
function processData(data) {
  const result = data.filter(Boolean); // [!code --]
  const result = data.filter(item => item != null); // [!code ++]
  return result;
}
```
````

### Copy Button

All code blocks automatically get a **Copy** button in the top-right corner. No setup needed — it's built into the post layout.

### Heading Anchor Links

All headings (h2–h6) automatically get a `#` anchor link on hover, making it easy for readers to link to specific sections.

---

## Math (KaTeX)

Write math expressions using LaTeX syntax (powered by `remark-math` + `rehype-katex`).

### Inline Math

```markdown
The formula $E = mc^2$ changed physics forever.

The probability is given by $P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}$.
```

### Block Math (Display Mode)

```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

$$
\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}
$$
```

---

## Collapsible Table of Contents

Any post with a heading called `Table of contents` will automatically get a collapsible TOC (powered by `remark-toc` + `remark-collapse`).

Just add this heading anywhere in your post (usually near the top):

```markdown
## Table of contents
```

The plugin will auto-generate the TOC from your h2/h3/h4 headings and wrap it in a collapsible `<details>` element.

---

## Markdown Essentials

### Text Formatting

```markdown
**Bold text** and *italic text* and ***bold italic***.

~~Strikethrough text~~

> This is a blockquote. It gets a colored left border
> with your accent color.
```

### Links

```markdown
[External link](https://astro.build)

[Internal link to another post](/blog/posts/blog-update-2)
```

### Images

```markdown
![Alt text describing the image](./path-to-image.png)

![Remote image](https://example.com/image.jpg)
```

Images are automatically centered with a subtle border.

### Lists

```markdown
Unordered:
- First item
- Second item
  - Nested item

Ordered:
1. Step one
2. Step two
3. Step three
```

List markers are colored with your accent color.

### Tables

```markdown
| Feature      | Status |
|-------------|--------|
| Dark mode   | ✅     |
| RSS feed    | ✅     |
| Search      | ✅     |
| Callouts    | ✅     |
```

### Horizontal Rule

```markdown
---
```

---

## Frontmatter Reference

Every post needs a YAML frontmatter block at the top:

```yaml
---
title: "Your Post Title"
description: "A brief description for SEO and social cards"
pubDatetime: 2026-04-22T00:00:00Z
author: Mitesh Shah          # optional, defaults to SITE.author
modDatetime:                 # optional, set when you update a post
featured: false              # optional, pins to homepage
draft: false                 # optional, hides from production
tags:
  - javascript
  - tutorial
ogImage: ./path-to-og.png    # optional, auto-generated if not set
canonicalURL:                # optional, for cross-posted content
hideEditPost: false          # optional, hides the "Edit" link
timezone: Asia/Kolkata       # optional, overrides global timezone
---
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Post title |
| `description` | string | Short description (SEO + social cards) |
| `pubDatetime` | ISO date | Publication date |
| `tags` | string[] | At least one tag (defaults to `["others"]`) |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `author` | string | `SITE.author` | Post author name |
| `featured` | boolean | `false` | Show in featured section on homepage |
| `draft` | boolean | `false` | Hide from production build |
| `modDatetime` | ISO date | — | Last modified date |
| `ogImage` | string/image | Auto-generated | Custom OG image |
| `canonicalURL` | string | — | Canonical URL for cross-posts |

---

## Color Tokens Available

For any custom HTML in posts, these CSS variables are available:

### Base Colors
| Variable | Light | Dark | Use for |
|----------|-------|------|---------|
| `--background` | `#fdfdfd` | `#212737` | Page background |
| `--foreground` | `#282728` | `#eaedf3` | Body text |
| `--accent` | `#006cac` | `#ff6b01` | Links, highlights |
| `--muted` | `#e6e6e6` | `#343f60` | Subtle backgrounds |
| `--border` | `#ece9e9` | `#ab4b08` | Borders |

### Gray Scale
`--gray-100` through `--gray-700` (5 steps, light & dark)

### Semantic Colors
Each has `-bg`, `-border`, `-text` variants:
- `--info-*` (blue) — informational
- `--warning-*` (amber) — caution
- `--success-*` (green) — positive
- `--quote-*` (purple) — quotations

### Code
| Variable | Light | Dark | Use for |
|----------|-------|------|---------|
| `--code-bg` | `#e8f1fc` | `#1a2332` | Inline code background |
| `--code-block-bg` | `#f8fafc` | `#1a2332` | Code block background |

---

## Typography

- **Body font**: Nunito Sans (sans-serif) at 18px
- **Code font**: Google Sans Code (monospace)
- **Headings**: use `text-wrap: balance` (h1) and `text-wrap: pretty` (h2–h6)
- **Theme transition**: Smooth 350ms animation when toggling light/dark

---

*Last updated: April 2026*
