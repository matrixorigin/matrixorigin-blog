---
name: matrixorigin-blog-content-edit
description: Use when editing existing matrixorigin-blog articles, preserving frontmatter, changing dates or status, updating local image paths, keeping edits scoped to one article, and validating the result.
---

# MatrixOrigin Blog Content Edit

Use this skill for edits to existing posts in `matrixorigin-blog`.

## Owner Map

- Target article: `<project>/<slug>/index.md`
- Authoring rules: `README.md`
- Frontmatter contract: `schema/frontmatter.ts`
- Workflow checklist: `docs/AGENT-WORKFLOWS.md`

## Workflow

1. Locate the exact article directory before editing.
2. Read the current frontmatter and preserve unrelated fields.
3. Edit only the requested text, metadata, or local assets.
4. If changing `date`, tell the user it can affect blog list ordering.
5. If changing `status`, state whether visibility should change after downstream
   sync.
6. Prefer article-local media paths such as `./images/<filename>`.
7. Do not normalize historical formatting unless requested.
8. Run `pnpm validate`.
9. Review `git diff --stat` and `git diff -- <article-path>`.

## Common Failure Modes

- Reformatting old articles while making a small content edit.
- Accidentally changing `date` or `status`.
- Treating `pnpm validate` as proof that image files exist.
- Migrating assets as part of a text-only change.

## Verification

- Article edit: `pnpm validate`
- Documentation-only note: `git diff --check`
