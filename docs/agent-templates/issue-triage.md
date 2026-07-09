# Issue Triage Template

Use this template when summarizing or creating a `matrixorigin-blog` issue.

## Problem

- What is wrong or missing?
- Which project directory is involved: `matrixorigin/`, `memoria/`, or repo docs?
- Is this about content, frontmatter/schema, assets, validation, or downstream
  publishing?

## Evidence

- Relevant article path(s):
- Relevant frontmatter field(s):
- Relevant local command output:
- Relevant workflow or downstream run:

## Likely Owner

- Content source: `matrixorigin-blog`
- Website rendering: downstream site repository
- Publish trigger: `.github/workflows/dispatch-*.yml`
- Validation contract: `schema/frontmatter.ts` / `scripts/validate.ts`

## Proposed Next Step

- Minimal change needed:
- Verification command:
- Risk or open question:
