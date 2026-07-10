# MatrixOrigin Blog Agent Guide

## Project Overview

This repository is the shared Markdown content source for MatrixOrigin blog
properties. It is not the MatrixOrigin website frontend application.

Top-level project directories are content ownership boundaries:

- `matrixorigin/`: MatrixOrigin company blog content for `matrixorigin.cn/blog`
  and `matrixorigin.io/blog`.
- `memoria/`: Memoria product blog content for the Memoria website.

Each article lives in its own slug directory with an `index.md` file and optional
local assets such as `images/` and `videos/`.

## Agent Native Model

For the repository-level Agent governance model, read
`docs/AGENT-NATIVE.md`. Keep this file focused on stable project facts and
guardrails. Put task checklists, templates, and skills in follow-up documents.

## Source Of Truth

- Content authoring rules: `README.md`.
- Frontmatter validation schema: `schema/frontmatter.ts`.
- Local validation entry point: `scripts/validate.ts`.
- Blog system background: `docs/DESIGN.md`.
- Downstream dispatch behavior: `.github/workflows/dispatch-*.yml`.
- PR validation behavior: `.github/workflows/validate.yml`.

When these files disagree, verify the active workflow and scripts before
answering. Do not rely on old deployment notes without checking the current
implementation.

## Editing Rules

- Treat `matrixorigin/` and `memoria/` as separate publishing surfaces.
- Use the existing article directory pattern: `<project>/<slug>/index.md`.
- Keep slugs lowercase, ASCII, hyphen-separated, and URL-safe.
- Keep article assets inside the article directory, usually under `images/` or
  `videos/`.
- Reference local images with the `./images/<file>` form unless the existing
  article uses a different validated pattern.
- Do not rewrite unrelated historical articles while editing one article.
- Do not change frontmatter fields speculatively; validate against
  `schema/frontmatter.ts`.
- Do not treat `status: draft` as published content.

## Verification

Use the smallest check that proves the change:

- Documentation-only Agent guidance change: `git diff --check`.
- Blog content, frontmatter, slug, or asset-path change: `pnpm validate`.
- Schema or validator change: `pnpm validate`, and inspect affected articles.
- Dispatch workflow change: inspect the relevant `.github/workflows/dispatch-*.yml`
  caller behavior and document any publishing-chain change.

Before opening a PR, run `git status --short` and make sure the diff only
contains files needed for the task.

## Prohibited Changes

- Do not edit the website frontend in this repository; that belongs in
  `matrixorigin/mo-website-redesign`.
- Do not modify CI, dispatch workflows, schema, or migration scripts as part of
  ordinary content edits unless explicitly requested.
- Do not commit generated website output or local preview artifacts.
- Do not bypass `pnpm validate` for content or schema changes.
- Do not revert unrelated user changes in the working tree.
