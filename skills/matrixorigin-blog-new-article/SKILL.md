---
name: matrixorigin-blog-new-article
description: Use when creating a new article in matrixorigin-blog, choosing matrixorigin or memoria, creating the slug directory, setting frontmatter, adding local images or videos, validating content, and preparing a scoped PR.
---

# MatrixOrigin Blog New Article

Use this skill for new posts in `matrixorigin-blog`.

## Owner Map

- Authoring rules: `README.md`
- Frontmatter contract: `schema/frontmatter.ts`
- Workflow checklist: `docs/AGENT-WORKFLOWS.md`
- PR template: `docs/agent-templates/pr-body.md`

## Workflow

1. Confirm the target project directory:
   - `matrixorigin/` for MatrixOrigin company blog content.
   - `memoria/` for Memoria product blog content.
2. Confirm the slug is lowercase, ASCII, hyphen-separated, and URL-safe.
3. Create `<project>/<slug>/index.md`.
4. Put article-local images under `<project>/<slug>/images/`.
5. Put article-local videos under `<project>/<slug>/videos/` if needed.
6. Start `index.md` with YAML frontmatter at the first byte.
7. Include required fields from `schema/frontmatter.ts`: `title`, `date`, and
   `description`.
8. Default to `status: "draft"` unless the user explicitly wants a published
   article.
9. Use `./images/<filename>` for local image references.
10. Run `pnpm validate`.
11. Check `git diff --stat` and ensure only intended article files changed.

## Common Failure Modes

- Creating content in the wrong top-level project directory.
- Leaving a blank line before frontmatter.
- Omitting `description`.
- Marking content as `published` when the user only asked for a draft.
- Referencing images outside the article directory.

## Verification

- Content creation: `pnpm validate`
- PR body: use `docs/agent-templates/pr-body.md`
