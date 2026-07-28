---
name: auto-commit
description: >
  Stage the current working-tree changes and create a git commit with an
  auto-drafted message matching this repo's commit style. Unlike a
  message-only generator, this actually runs `git commit`. Use when the user
  says "auto commit", "커밋해줘", "지금까지 변경사항 커밋", "자동 커밋", or
  invokes /auto-commit. Also self-invoke this skill's checkpoint step
  (propose only, see below) right after finishing a task/feature in this
  repo — do not run the commit itself without the user saying yes. Always
  reviews git status/diff first, and refuses to commit straight to
  main/master without explicit confirmation.
---

Stage and commit the current working-tree changes in one step, on behalf of
the user — but only once the user has said yes.

## Checkpoint trigger (proactive, ask-first)

Right after finishing a task/feature/bugfix in this repo — build passes,
verification done — ask once: "지금까지 변경사항 커밋할까?" (or similar).
Do not run any git command before the user answers. A plain "응"/"ㅇㅇ"/"해"
counts as yes; anything else, or silence in the same turn, is not consent.
If yes, continue with the Steps below. If no, drop it — don't ask again
until the next natural checkpoint.

This trigger exists because committing without being asked first is against
a hard rule (never assume consent from a past instance of this same
conversation, and never treat "ask" as optional). The checkpoint only
proposes; it never substitutes for the user's answer.

## Steps

1. Run in parallel: `git status --porcelain=v1` (never `-uall`), `git diff`
   (unstaged) + `git diff --staged`, `git log --oneline -8`,
   `git branch --show-current`.
2. Nothing changed (no staged/unstaged/untracked files) → say so and stop.
   Never create an empty commit.
3. Current branch is `main` or `master` → stop and ask the user to confirm
   or switch to a feature branch first. Do not commit to main silently —
   this repo's workflow keeps feature work off main.
4. Scan the status output for anything that looks like a secret/credential
   file (`.env`, `*.pem`, `credentials*`, `*.key`, etc.) or build output
   (`dist/`, `node_modules/`). Exclude those from staging; if unsure, ask.
5. Stage the remaining relevant files by explicit name — never
   `git add -A` / `git add .`.
6. Draft a commit message matching this repo's existing convention: Korean,
   imperative, no trailing period, occasionally prefixed with a Conventional
   Commits type (`feat:`, `fix:`, `refactor:`) when it clarifies intent —
   check `git log --oneline` for the exact tone to match. Lead with *why*,
   not a restatement of the diff.
7. Run `git commit -m "$(cat <<'EOF' ... EOF)"` with the drafted message.
   Never `--no-verify`, never `--amend` unless the user explicitly asked.
8. Run `git status` after to confirm success. Report the resulting commit
   hash and message back to the user.

## Boundaries

- Never push, never force-push — committing only, unless separately asked.
- Never amend an existing commit.
- Never skip hooks. If a pre-commit hook fails, fix the underlying issue
  and create a *new* commit — do not bypass with `--no-verify`.
- One commit per invocation. If the changes clearly span unrelated
  concerns, ask whether to split before committing rather than bundling.
