# MatrixOrigin Blog

This repository is the **source of truth** for all blog posts published on [thememoria.ai/blog](https://thememoria.ai/blog.html).

The website backend watches this repository via GitHub Webhook and a periodic poller. When you push a change, the article is automatically synced to the site within seconds (Webhook) or within 5 minutes (poller fallback).

---

## How to publish a new article

### 1. Create a directory for your article

```
blogs/
  your-article-slug/       ← directory name becomes the URL slug
    index.md               ← article content (required)
    images/                ← optional, for images referenced in the article
      cover.png
      screenshot.png
```

The **directory name** is the article slug. It will appear in the URL hash, e.g. `thememoria.ai/blog.html#your-article-slug`.

Use lowercase letters, numbers, and hyphens only. No spaces.

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
| `title` | ✅ | English title |
| `title_zh` | ✅ | Chinese title |
| `date` | ✅ | ISO date `YYYY-MM-DD` — used for sorting and display |
| `tag` | ✅ | English tag label (e.g. `Announcement`, `Tutorial`, `Case Study`) |
| `tag_zh` | ✅ | Chinese tag label |
| `status` | ✅ | `draft` = not visible on website, `published` = live on website |
| `description` | ✅ | English summary (shown on article list, ~100 chars) |
| `description_zh` | ✅ | Chinese summary |

### 3. Add images (optional)

Place images in the `images/` subdirectory and reference them in Markdown using relative paths:

```markdown
![A descriptive alt text](./images/cover.png)
```

When the article is published, the backend automatically:
1. Downloads the images from this repository
2. Uploads them to Aliyun OSS for fast loading
3. Replaces the `./images/...` paths with permanent CDN URLs

### 4. Publish

To publish the article, change `status: "draft"` to `status: "published"` and push:

```bash
git add .
git commit -m "publish: your-article-slug"
git push
```

The website updates within a few seconds (via GitHub Webhook).

To **unpublish** an article, change `status: "published"` back to `status: "draft"` and push.

---

## Editing an existing article

Edit `index.md` and push. The backend detects the change (via GitHub file SHA comparison) and re-syncs the article automatically.

---

## Directory structure example

```
blogs/
  introducing-memoria/
    index.md
    images/
      (no images for this article)
  second-article/
    index.md
    images/
      cover.png
      diagram.png
```

---

## Tips

- **Bilingual content**: Write both English and Chinese. The website has a language toggle.
- **Markdown support**: Full CommonMark + GFM (tables, code blocks, blockquotes, etc.).
- **Preview locally**: Use any Markdown editor (VS Code, Typora, Obsidian) to preview before publishing.
- **Images**: PNG and JPEG are recommended. Keep images under 2 MB each (GitHub Contents API limit).
- **Slug naming**: Use descriptive, URL-friendly slugs. Example: `memoria-v2-release`, `cursor-memory-tutorial`.
