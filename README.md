# MatrixOrigin Blog

This repository is the **shared content source** for blog posts across MatrixOrigin projects.

Each project has its own top-level directory. Each project's backend only watches its own directory and ignores the rest.

```
memoria/          ← Memoria articles → synced to thememoria.ai/blog.html
  introducing-memoria/
    index.md
    images/
    videos/
project-b/        ← Future projects get their own directory
  their-article/
    index.md
```

---

## Memoria Blog

Articles in `memoria/` are automatically published to [thememoria.ai/blog.html](https://thememoria.ai/blog.html).

The Memoria backend watches this directory via GitHub Webhook and a periodic poller (every 5 minutes as fallback). Push a change → article updates within seconds.

---

## How to publish a new Memoria article

### 1. Create a directory under `memoria/`

```
memoria/
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

### 2. Write `index.md` with front matter

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
| `title` | **Yes** | English title (max 500 chars) |
| `date` | **Yes** | ISO date `YYYY-MM-DD` — used for chronological sorting |
| `status` | **Yes** | `draft` = not visible · `published` = live on website |
| `title_zh` | No | Chinese title (shown when user switches to 中文) |
| `tag` | No | English tag label, e.g. `Announcement`, `Tutorial`, `Case Study` |
| `tag_zh` | No | Chinese tag label |
| `description` | No | English summary shown on article list (~150 chars) |
| `description_zh` | No | Chinese summary |

> **Important:** `status` is case-sensitive. `published` works; `Published` or `PUBLISHED` will be treated as `draft`.

### 3. Add images (optional)

Place images in the `images/` subdirectory and reference them with a relative path:

```markdown
![A descriptive alt text](./images/cover.png)
```

Supported formats: **PNG, JPEG, GIF, WebP, SVG**

When the article is published, the backend automatically:
1. Downloads the image from this repository
2. Uploads it to Aliyun OSS for fast CDN delivery
3. Replaces `./images/<filename>` with the permanent OSS URL in the stored content

> **Note:** Always use the `./images/` prefix (with `./`). Paths like `images/cover.png` (without `./`) are not recognized.

### 4. Add videos (optional)

Place video files in the `videos/` subdirectory and reference them using Markdown image syntax:

```markdown
![Product demo video](./videos/demo.mp4)
```

Supported formats: **MP4, WebM, MOV, OGG**

The backend uploads the video to OSS (same as images), and the frontend automatically renders it as an HTML5 `<video controls>` player instead of an `<img>` tag.

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

### 5. Publish

Change `status: "draft"` to `status: "published"` and push:

```bash
git add .
git commit -m "publish: your-article-slug"
git push
```

The website updates within a few seconds via GitHub Webhook.

To **unpublish**, change `status` back to `"draft"` and push.

---

## Editing an existing article

Edit `index.md` and push. The backend detects the file SHA change and re-syncs automatically. Only modified articles are re-processed; unchanged ones are skipped.

---

## Deleting an article

Remove the entire article directory and push. On the next sync, the backend marks the article as deleted and it disappears from the website.

```bash
git rm -r memoria/your-article-slug/
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
- **Image size**: Keep individual images under 10 MB. The backend handles files of any size (GitHub's 1 MB inline limit is bypassed via `download_url`).
- **Video size**: Keep local videos under 50 MB. For larger videos, use an external platform (YouTube / Bilibili) and embed via `<iframe>`.
- **Preview locally**: Use any Markdown editor (VS Code, Typora, Obsidian) to preview before publishing. Front matter is displayed as a table in most editors.
- **Slug naming**: Use descriptive, URL-friendly slugs: `memoria-v2-release`, `cursor-memory-tutorial`, `mcp-quick-start`.
- **Date matters**: Articles are sorted by `date` (newest first). Make sure the date reflects the intended publication order.

---

## Frequently asked questions

**Q: I pushed but the article didn't appear on the website.**
- Check that `status` is exactly `"published"` (lowercase)
- Check that the directory slug is valid (lowercase, no spaces, no underscores)
- Wait up to 5 minutes for the periodic poller to run

**Q: My image isn't showing.**
- Make sure the file is in the `images/` subdirectory (not in the root of the article directory)
- Make sure the reference uses `./images/filename` (with `./`)
- Check that the file extension is one of: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`

**Q: Can I rename an article directory?**
- Yes, but the old slug will be marked as deleted and a new slug will be created. Any external links to the old URL (`blog.html#old-slug`) will break.
