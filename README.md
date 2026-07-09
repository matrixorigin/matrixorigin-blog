# MatrixOrigin Blog

This repository is the **shared content source** for blog posts across MatrixOrigin projects.

Each project has its own top-level directory. Publishing automation is scoped by
that top-level directory.

```
memoria/          ← Memoria articles → synced to thememoria.ai/blog.html
  introducing-memoria/
    index.md
    images/
    videos/
matrixorigin/     ← Main company blog → matrixorigin.cn/blog & matrixorigin.io/blog
  matrixone-v2-release/
    index.md
    images/
```

## Tooling

- **Frontmatter schema** — all articles validated against [`schema/frontmatter.ts`](./schema/frontmatter.ts) (Zod). Backward-compatible with existing Memoria articles.
- **Local validation** — `pnpm validate` (runs in CI for content, schema, and script changes).
- **Migration** — `pnpm migrate:dry ../mo-website-redesign` to preview pulling historical articles into `matrixorigin/`.

See [`docs/DESIGN.md`](./docs/DESIGN.md) for the broader blog system design
background. For current publishing automation, check `.github/workflows/`.

---

## Publishing targets

- `matrixorigin/` content is dispatched to
  [`matrixorigin/mo-website-redesign`](https://github.com/matrixorigin/mo-website-redesign)
  when pushed to `main`, then rendered by the website build.
- `memoria/` content is dispatched to
  [`matrixorigin/memoria-website`](https://github.com/matrixorigin/memoria-website)
  when a published Memoria article changes on `main`.

Validation and downstream deployment are separate steps: `pnpm validate` proves
the content shape is valid, but it does not prove the downstream website deploy
has completed.

---

## How to publish a new article

### 1. Choose the project directory

Use the target project's top-level directory:

- `matrixorigin/` for MatrixOrigin company blog articles.
- `memoria/` for Memoria product blog articles.

### 2. Create an article directory

```
<project>/
  your-article-slug/       ← directory name becomes the URL slug
    index.md               ← article content (required)
    images/                ← optional: images referenced in the article
      cover.png
    videos/                ← optional: videos referenced in the article
      demo.mp4
```

**Slug naming rules** (strictly enforced — invalid slugs are ignored):
- Only lowercase ASCII letters (`a–z`), digits (`0–9`), and hyphens (`-`)
- Must start and end with a letter or digit (no leading/trailing hyphens)
- Maximum 120 characters
- ✅ `introducing-memoria`, `release-v2-0`, `how-to-use-mcp`
- ❌ `Introducing_Memoria` (uppercase + underscore), `-draft` (leading hyphen), `my article` (space)

### 3. Write `index.md` with front matter

Every `index.md` must start with a YAML front matter block:

```markdown
---
title: "Your Article Title in English"
title_zh: "中文标题"
date: "2026-04-01"
tag: "Announcement"
tag_zh: "公告"
status: "draft"
description: "One-sentence summary in English, shown on the blog list page."
description_zh: "中文摘要，显示在博客列表页。"
---

Your Markdown content starts here...
```

#### Front matter fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | **Yes** | English title (max 200 chars) |
| `date` | **Yes** | ISO date `YYYY-MM-DD` or full ISO timestamp — used for chronological sorting |
| `description` | **Yes** | English summary shown on article list and SEO metadata (10-500 chars) |
| `status` | No | `draft` = not visible · `published` = live on website · `archived` = retained but not actively published. Defaults to `published` if omitted. |
| `title_zh` | No | Chinese title (shown when user switches to 中文) |
| `tag` | No | English tag label, e.g. `Announcement`, `Tutorial`, `Case Study` |
| `tag_zh` | No | Chinese tag label |
| `description_zh` | No | Chinese summary (10-500 chars) |
| `lang` | No | Body language, either `en` or `zh` |
| `cover` | No | Cover image path |
| `translations` | No | Counterpart slugs, e.g. `{ zh: "slug-zh", en: "slug" }` |

> **Important:** `status` is case-sensitive. `published` works; `Published` or
> `PUBLISHED` fails validation.

### 4. Add images (optional)

Place images in the `images/` subdirectory and reference them with a relative path:

```markdown
![A descriptive alt text](./images/cover.png)
```

Supported formats: **PNG, JPEG, GIF, WebP, SVG**

When the article is published, the downstream site pipeline processes local
assets for its own runtime. Keep image references local and portable in this
repository.

> **Note:** Always use the `./images/` prefix (with `./`). Paths like `images/cover.png` (without `./`) are not recognized.

### 5. Add videos (optional)

Place video files in the `videos/` subdirectory and reference them using Markdown image syntax:

```markdown
![Product demo video](./videos/demo.mp4)
```

Supported formats: **MP4, WebM, MOV, OGG**

The downstream site must support the referenced video format and rendering
behavior. Validate the target site when adding or changing local videos.

**For large videos (> 50 MB), prefer embedding from an external platform:**

```html
<!-- YouTube embed -->
<iframe width="100%" height="400"
  src="https://www.youtube.com/embed/VIDEO_ID"
  frameborder="0" allowfullscreen></iframe>

<!-- Bilibili embed -->
<iframe width="100%" height="400"
  src="https://player.bilibili.com/player.html?bvid=BVID"
  frameborder="0" allowfullscreen></iframe>
```

### 6. Validate and publish

Change `status: "draft"` to `status: "published"`, validate, and push:

```bash
pnpm validate
git add .
git commit -m "publish: your-article-slug"
git push
```

After merge or push to `main`, the corresponding dispatch workflow triggers the
downstream website pipeline for the changed project directory.

To **unpublish**, change `status` back to `"draft"` and push.

---

## Editing an existing article

Edit `index.md`, run `pnpm validate`, and push. After the change reaches
`main`, the relevant downstream workflow is responsible for reprocessing the
article.

---

## Deleting an article

Remove the entire article directory and push. On the next downstream sync, the
site should remove the article from the published listing.

```bash
git rm -r <project>/your-article-slug/
git commit -m "remove: your-article-slug"
git push
```

---

## Directory structure example

```
memoria/
  introducing-memoria/
    index.md
    images/
      hero.png
      architecture.svg
  how-to-use-mcp/
    index.md
    images/
      screenshot.png
    videos/
      setup-demo.mp4
```

---

## Writing tips

- **Bilingual content**: Write both English and Chinese fields in the front matter. The website has a language toggle; the article body is single-language.
- **Markdown support**: Full CommonMark + GFM — tables, code blocks with syntax highlighting, blockquotes, task lists, etc.
- **Image size**: Keep individual images under 10 MB unless a target site has a documented reason to allow larger files.
- **Video size**: Keep local videos under 50 MB. For larger videos, use an external platform (YouTube / Bilibili) and embed via `<iframe>`.
- **Preview locally**: Use any Markdown editor (VS Code, Typora, Obsidian) to preview before publishing. Front matter is displayed as a table in most editors.
- **Slug naming**: Use descriptive, URL-friendly slugs: `memoria-v2-release`, `cursor-memory-tutorial`, `mcp-quick-start`.
- **Date matters**: Articles are sorted by `date` (newest first). Make sure the date reflects the intended publication order.

---

## Frequently asked questions

**Q: I pushed but the article didn't appear on the website.**
- Check that `status` is exactly `"published"` (lowercase)
- Check that the directory slug is valid (lowercase, no spaces, no underscores)
- Check that `pnpm validate` passes
- Check the relevant downstream dispatch workflow for the project directory

**Q: My image isn't showing.**
- Make sure the file is in the `images/` subdirectory (not in the root of the article directory)
- Make sure the reference uses `./images/filename` (with `./`)
- Check that the file extension is one of: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`

**Q: Can I rename an article directory?**
- Yes, but the old slug will be marked as deleted and a new slug will be created. Any external links to the old URL (`blog.html#old-slug`) will break.
