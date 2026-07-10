# Verification Matrix Template

Use this template to choose checks for `matrixorigin-blog` changes.

| Change type | Required check | Extra check when needed | Notes |
|---|---|---|---|
| Agent docs only | `git diff --check` | Read rendered Markdown diff | Do not run content validation unless content/schema changed. |
| README or repo docs | `git diff --check` | Compare against current schema/workflows | Keep human docs separate from Agent governance when possible. |
| Article text only | `pnpm validate` | Local website sync/preview | Keep validation and downstream deploy status separate. |
| Frontmatter change | `pnpm validate` | Inspect target article rendering | Check `status`, `date`, `description`, and language fields carefully. |
| Image or video path change | `pnpm validate` | Filesystem-aware media scan | `pnpm validate` does not prove media files exist unless validator changes. |
| Schema or validator change | `pnpm validate` | Search representative existing fields | Update README if author-facing contract changes. |
| Dispatch workflow change | `git diff --check` | Inspect downstream run behavior | Explain which downstream repo is affected. |
