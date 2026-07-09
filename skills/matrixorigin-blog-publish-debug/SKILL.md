---
name: matrixorigin-blog-publish-debug
description: Use when diagnosing why a matrixorigin-blog article is missing, not published, sorted unexpectedly, has broken media, or did not update on the downstream MatrixOrigin or Memoria website.
---

# MatrixOrigin Blog Publish Debug

Use this skill for publication, visibility, ordering, and media triage.

## Owner Map

- Content source: `matrixorigin/` or `memoria/`
- Validation: `pnpm validate`
- MatrixOrigin dispatch: `.github/workflows/dispatch-matrixorigin-deploy.yml`
- Memoria dispatch: `.github/workflows/dispatch-memoria-deploy.yml`
- Website rendering for MatrixOrigin content: `matrixorigin/mo-website-redesign`

## Workflow

1. Confirm the target website and project directory.
2. Confirm the article path is `<project>/<slug>/index.md`.
3. Confirm frontmatter starts at the first byte with `---`.
4. Confirm `status` is exactly `published` for visible posts.
5. Confirm `date` parses and, if needed, explain ordering impact.
6. Run `pnpm validate`, or record the existing validation failure.
7. For missing media, confirm files exist and paths are case-correct.
8. Inspect the relevant dispatch workflow before explaining downstream behavior.
9. Separate findings into content validity, dispatch status, downstream build or
   deploy status, and live-site observation.

## Common Failure Modes

- Blaming routing before checking frontmatter parsing.
- Ignoring a blank line before frontmatter.
- Claiming local validation proves downstream deploy success.
- Mixing MatrixOrigin website sync behavior with Memoria website behavior.
- Treating image existence checks as covered by `pnpm validate`.

## Verification

- Content validity: `pnpm validate`
- Media existence: run a separate filesystem-aware scan when needed.
- Dispatch behavior: inspect the relevant `.github/workflows/dispatch-*.yml`.
