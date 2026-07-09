---
name: matrixorigin-blog-review-pr
description: Use for matrixorigin-blog PR preparation, PR body drafting, review output, issue association wording, scope checks, generated-file checks, and choosing verification for content, docs, schema, or workflow changes.
---

# MatrixOrigin Blog Review and PR

Use this skill when preparing or reviewing a `matrixorigin-blog` PR.

## Owner Map

- Workflow checklist: `docs/AGENT-WORKFLOWS.md`
- PR template: `docs/agent-templates/pr-body.md`
- Review template: `docs/agent-templates/review-output.md`
- Verification matrix: `docs/agent-templates/verification-matrix.md`

## PR Preparation Workflow

1. Run `git status --short --branch`.
2. Confirm the branch contains only the requested scope.
3. Keep generated artifacts, lockfile churn, and unrelated user changes out.
4. Choose verification from `docs/agent-templates/verification-matrix.md`.
5. Use `docs/agent-templates/pr-body.md` for the PR body.
6. Use `Refs #...` for broad tracking issues unless merge should close the
   issue.
7. If verification fails due to a pre-existing issue, name the exact file and
   failure.

## Review Workflow

1. Review for content validity, visibility changes, ordering impact, missing
   verification, and scope creep.
2. Lead with findings, ordered by severity, with file references.
3. If there are no findings, say so directly.
4. Mention remaining validation or downstream deploy risk.
5. Use `docs/agent-templates/review-output.md` for final structure.

## Common Failure Modes

- Closing a broad governance issue with `Closes` instead of `Refs`.
- Mixing Agent governance files with README or content fixes in one PR.
- Claiming downstream deploy verification when only content validation ran.
- Including pnpm lockfile churn from a validation run.

## Verification

- Documentation-only PR: `git diff --check`
- Staged PR check: `git diff --cached --check`
- Content/schema PR: use `pnpm validate`, and report known pre-existing failures.
