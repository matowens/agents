# Repository Guidance

This repository is the canonical source for personal AI agent definitions. Edit source files here, never deployed copies under `~/.codex/agents` or `~/.claude/agents`, then use the repository installer and verify source/target hashes.

## Workflow language and boundaries

- Use the official term `Task`; do not use `checkpoint` as the primary workflow term.
- Agent definitions describe who performs work: role, model, permissions, durable behavior, and handoff expectations.
- Keep reusable procedures, orchestration, templates, and integration scripts in the separate skills repository.
- The Codex `Software Engineer` is the only subagent permitted to modify project code and tests.
- The Claude Code `qa-engineer` remains independent and read-only.

## Tooling policy

- Use dependency-light modern JavaScript (`.mjs`) and Node.js for new cross-platform workflow tooling by default.
- Prefer Node built-ins, including `node:test`, before adding npm dependencies.
- Use thin `.cmd`, `.ps1`, or `.sh` launchers only when they materially improve platform ergonomics or integration.
- Do not rewrite working tooling merely to change languages. Migrate existing scripts only as an explicit, behavior-preserving Task with relevant tests.
- Treat tooling owned by external systems, including Python-based validators, as external tooling rather than a required runtime dependency unless the repository explicitly adopts it.

## Change discipline

- Make the smallest approved change and preserve unrelated work.
- Validate modified definitions and installers proportionally to risk.
- Do not commit, push, publish, or alter remote state without Mat's explicit approval.
