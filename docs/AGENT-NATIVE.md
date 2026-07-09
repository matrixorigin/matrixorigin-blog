# Agent Native Repository Guide

This repository is organized so AI agents can edit blog content, reason about
publishing boundaries, and verify work without guessing.

## Goals

- Make the content ownership boundary easy to find.
- Keep blog authoring rules close to the files that enforce them.
- Separate content validation from downstream website deployment.
- Reduce repeated mistakes around frontmatter, slugs, status, dates, and asset
  paths.
- Keep Agent guidance incremental so follow-up workflow docs and skills can be
  added without bloating the root prompt files.

## Information Layers

Use these files in order:

1. `AGENTS.md`: stable project facts, boundaries, guardrails, and verification
   expectations.
2. `CLAUDE.md`: Claude-specific entry point that imports `AGENTS.md`.
3. `README.md`: human-facing article creation and publishing rules.
4. `schema/frontmatter.ts`: executable frontmatter contract.
5. `scripts/validate.ts`: local validation behavior.
6. `.github/workflows/`: CI validation and downstream dispatch behavior.
7. `docs/AGENT-WORKFLOWS.md`: repeatable task checklists.
8. `docs/agent-templates/`: reusable issue, PR, review, and verification
   output shapes.
9. `docs/DESIGN.md`: system design background and longer-term blog architecture
   notes.

## Repository Boundaries

- `matrixorigin/` content is the source for the MatrixOrigin company blog.
- `memoria/` content is the source for the Memoria blog.
- Website rendering, page UI, and synced blog frontend behavior belong in
  `matrixorigin/mo-website-redesign`, not this repository.
- This repository can trigger downstream work, but a successful local validation
  does not prove that a downstream website deploy completed.

## What Belongs Where

- Put stable Agent rules in `AGENTS.md`.
- Put tool-specific entry notes in `CLAUDE.md`.
- Put task checklists in future workflow documents such as
  `docs/AGENT-WORKFLOWS.md`.
- Put reusable output shapes in `docs/agent-templates/`.
- Put high-frequency Agent procedures in future skills under `skills/`.
- Do not duplicate the full README or schema in Agent prompt files; link to the
  source of truth instead.

## First-pass Task Triage

Before editing, classify the request:

- Content edit: locate the article under `matrixorigin/` or `memoria/`, edit the
  article, then run `pnpm validate`.
- New article: create `<project>/<slug>/index.md`, add local assets under that
  slug directory, then run `pnpm validate`.
- Article not visible: check slug validity, `status`, frontmatter validation,
  target project directory, and downstream dispatch status separately.
- Image or video not visible: check local asset location, Markdown path format,
  supported extension, and whether the downstream site has reprocessed the
  article.
- Publishing-chain question: inspect `.github/workflows/dispatch-*.yml` and the
  downstream repository involved before answering.

## Verification Policy

Use the smallest check that matches the change:

- Agent documentation only: `git diff --check`.
- Article content or metadata: `pnpm validate`.
- Validation schema or script: `pnpm validate` and inspect representative
  failures if any.
- Workflow dispatch behavior: inspect the workflow diff and explain which
  downstream repository is affected.

## Maintenance Rules

- Keep root Agent files short and durable.
- Add workflow documents or skills only when a workflow is repeated and easy to
  get wrong.
- Remove stale Agent guidance when the owning script, schema, or workflow
  changes.
- Prefer current scripts and workflows over historical design notes when
  diagnosing live behavior.
