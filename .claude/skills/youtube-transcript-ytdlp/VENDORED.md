# Vendored skill — not tracked by skills-lock.json

Source: https://github.com/langbaseinc/agent-skills — `skills/youtube-transcript/SKILL.md`
Vendored on: 2026-10-04

## Why it is vendored instead of CLI-installed

Upstream declares `name: youtube-transcript`, which collides with the skill of the
same name from `intellectronica/agent-skills`. The `skills` CLI installs by declared
name into `.claude/skills/<name>/` and overwrites a colliding directory **silently** —
no warning, no prompt. Installing both through the CLI leaves only whichever ran last.

So this copy is maintained by hand, with two local edits to the frontmatter:

- `name:` changed to `youtube-transcript-ytdlp`
- `description:` rewritten to say when to reach for this one over the lighter
  `youtube-transcript`, since the upstream descriptions were near-identical and gave
  the agent nothing to choose on

The body of the skill is unmodified.

## Consequences

- `npx skills update` does not update this skill. Re-vendor by hand to pick up
  upstream changes, re-applying the two frontmatter edits.
- Do not `npx skills add langbaseinc/agent-skills --skill youtube-transcript` in this
  repo: it would recreate `.claude/skills/youtube-transcript/` and clobber the
  intellectronica skill again.

## Note on behaviour

This skill installs `yt-dlp` if missing and may use `sudo apt install`, and can
offer to install Whisper (~1-3 GB of models). The sibling `youtube-transcript`
skill needs neither.
