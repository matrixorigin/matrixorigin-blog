# CLAUDE.md

Read the shared project instructions first:

@AGENTS.md

## Claude-specific Notes

- Keep `AGENTS.md` as the primary source of stable repository rules.
- Use `docs/AGENT-NATIVE.md` to understand how Agent guidance should be
  organized in this content repository.
- Before editing blog content, identify whether the task belongs under
  `matrixorigin/` or `memoria/`.
- Before changing frontmatter, check `schema/frontmatter.ts` instead of guessing
  accepted fields.
- Before explaining publishing behavior, inspect `.github/workflows/` and keep
  content validation separate from downstream site deployment.
- Keep changes surgical: touch only files needed for the requested task.
