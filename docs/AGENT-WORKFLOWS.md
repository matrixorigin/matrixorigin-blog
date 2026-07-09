# Agent Workflows

This document gives AI agents repeatable checklists for common
`matrixorigin-blog` tasks. It complements the human-facing `README.md` and the
executable schema in `schema/frontmatter.ts`.

Use these workflows to keep content edits surgical, verifiable, and scoped to
the correct publishing surface.

## Before Any Change

1. Identify the target project directory:
   - `matrixorigin/` for MatrixOrigin company blog content.
   - `memoria/` for Memoria product blog content.
2. Read the current `README.md` for authoring rules.
3. Check `schema/frontmatter.ts` before adding or changing frontmatter fields.
4. Check `.github/workflows/` before explaining publish or deploy behavior.
5. Run `git status --short` and preserve unrelated user changes.

## New Article

Use this when creating a new blog post.

1. Confirm the target project directory and intended slug.
2. Create `<project>/<slug>/index.md`.
3. Put article-local images under `<project>/<slug>/images/`.
4. Put article-local videos under `<project>/<slug>/videos/` when needed.
5. Start `index.md` with YAML frontmatter at the first byte of the file.
6. Include the required frontmatter fields from `schema/frontmatter.ts`:
   `title`, `date`, and `description`.
7. Set `status: "draft"` unless the user explicitly wants the article ready for
   publishing.
8. Reference local images with `./images/<filename>`.
9. Run `pnpm validate`.
10. Review `git diff --stat` and confirm only the intended article files changed.

PR notes should include:

- Target project directory.
- Article slug.
- Publish status.
- Validation result.

## Edit Existing Article

Use this when changing an existing post's text, metadata, or local assets.

1. Locate the exact article directory before editing.
2. Read the current frontmatter and preserve unrelated fields.
3. Edit only the requested article content or assets.
4. If changing `date`, explain whether this affects list ordering.
5. If changing `status`, state whether the article should become visible or
   hidden after downstream sync.
6. If changing image paths, prefer article-local `./images/<filename>` paths.
7. Run `pnpm validate`.
8. Review `git diff --stat` and `git diff -- <article-path>`.

Do not normalize historical formatting, rewrite unrelated prose, or migrate
assets unless the user explicitly asked for that task.

## Article Not Visible

Use this when a user says a post was added or edited but does not appear on the
target website.

Check in this order:

1. Confirm the article is in the correct project directory.
2. Confirm the article path is `<project>/<slug>/index.md`.
3. Confirm frontmatter starts at the first byte of the file with `---`.
4. Confirm `status` is exactly `published`.
5. Confirm `pnpm validate` passes or record the existing validation failure.
6. Confirm the change reached the branch or commit watched by the downstream
   workflow.
7. Inspect the relevant dispatch workflow:
   - `dispatch-matrixorigin-deploy.yml` for `matrixorigin/**`.
   - `dispatch-memoria-deploy.yml` for `memoria/**`.
8. If the dispatch succeeded, inspect the downstream repository or workflow run
   before blaming content.

Report separately:

- Content validity.
- Dispatch trigger status.
- Downstream build or deploy status.
- Live website observation, if verified.

## Image Or Video Not Visible

Use this when article media is missing or broken.

1. Confirm the media file exists under the article directory.
2. Confirm Markdown uses a supported local path, usually `./images/<file>` or
   `./videos/<file>`.
3. Confirm filename case matches exactly.
4. Confirm the file extension is expected by the target site.
5. Run `pnpm validate`, but do not claim it proves image existence unless the
   validator has been updated to check that.
6. If needed, run a separate filesystem-aware scan for broken media paths.
7. For `matrixorigin/` articles, verify the synced website output in
   `mo-website-redesign` when diagnosing rendering behavior.

Report path problems separately from downstream rendering problems.

## Frontmatter Or Schema Change

Use this only when the task explicitly changes accepted metadata fields or
validation behavior.

1. Read `schema/frontmatter.ts`.
2. Search existing articles for the affected field.
3. Keep compatibility with existing content unless the user asked for a
   migration.
4. Update `scripts/validate.ts` only if schema validation alone cannot express
   the rule.
5. Run `pnpm validate`.
6. If validation fails on pre-existing content, identify the exact file and do
   not hide that failure.
7. Update `README.md` if the public authoring contract changes.

## Publishing Chain Explanation

Use this when explaining what happens after content changes are pushed.

1. Start with the simple role map:
   - This repository stores Markdown content.
   - A dispatch workflow notifies the downstream site repository.
   - The downstream site builds, syncs, or deploys the rendered website.
2. Inspect the active workflow files before giving exact trigger behavior.
3. Keep these statuses separate:
   - Local validation passed.
   - Dispatch workflow ran.
   - Downstream build succeeded.
   - Live website updated.
4. Avoid describing registries, GitOps, or deploy targets unless the user asked
   for that level of detail.

## PR Preparation

Use this before opening a pull request.

1. Run the smallest relevant verification:
   - Documentation-only: `git diff --check`.
   - Content or metadata: `pnpm validate`.
   - Schema or validator: `pnpm validate` plus representative article review.
2. Run `git status --short`.
3. Confirm the diff does not include generated artifacts, lockfile churn, or
   unrelated user changes.
4. Write a PR body with:
   - Summary.
   - Verification.
   - Scope notes.
   - Related issue, if any.
5. If a command fails because of a known pre-existing issue, include the exact
   failing file and reason.

## Review Checklist

Use this when reviewing a blog-content PR.

- Does the PR touch only the intended project directory or docs?
- Does every changed article still start with frontmatter at the first byte?
- Are required fields present according to `schema/frontmatter.ts`?
- Are local images and videos stored under the article directory?
- Are image paths portable and case-correct?
- Does a `status` or `date` change intentionally affect visibility or ordering?
- Did the author run the appropriate verification, or explain why it fails?
- Are downstream deploy claims separated from content validation claims?
