# AI Agents

This repository contains personal AI agent definitions used in an AI-assisted development workflow. It is the canonical source for agents used by Codex, Claude Code, and potentially other tools in the future.

Reusable skills and domain-specific workflows live in a separate skills repository. The files here define **who performs a task**; skills define **how a specialized task is performed**.

## Architecture

Codex Desktop is the lead orchestrator. It defines bounded implementation Tasks, delegates code changes to the Codex Software Engineer, invokes the Claude QA Engineer for independent review, evaluates the findings, and directs any correction cycle.

```text
User
  -> Codex Desktop (lead and orchestrator)
      -> Codex Software Engineer (implementation)
      -> Claude QA Engineer (independent review)
      -> Codex Desktop (acceptance or correction cycle)
```

Only the Software Engineer modifies project code. The QA Engineer remains read-only and reports findings back to Codex.

## Repository layout

```text
agents/
|-- codex/
|   `-- software-engineer.toml
|-- claude/
|   `-- qa-engineer.md
|-- install.cmd
|-- scripts/
|   `-- install_agents.mjs
|-- tests/
|   `-- installer.test.mjs
`-- README.md
```

Agent definitions remain in their provider-native formats. The Windows installer creates individual file links in the locations expected by each tool:

- Codex: `~/.codex/agents/`
- Claude Code: `~/.claude/agents/`

## Installation

From Command Prompt in the repository root, run:

```batch
install.cmd
```

The command invokes a dependency-free Node installer that creates live symbolic links for the two approved agents. Windows Developer Mode must be enabled, or Command Prompt must run as Administrator when the links are first created.

Verify the links without changing anything:

```batch
install.cmd --check
```

Installation is idempotent: correct links are left unchanged, missing links are created, and a same-name file or incorrect link is reported as a conflict without being overwritten. Unrelated agents in either provider directory are preserved.

Edits to an existing source definition are immediately visible through its live link, so pulls and source changes do not require another installation. Codex or Claude may still require a new session or application restart to reload a changed definition.

## Available agents

### Codex Software Engineer

Source: [`codex/software-engineer.toml`](codex/software-engineer.toml)

The Software Engineer implements exactly one approved Task at a time. It inspects the existing code, makes production-quality changes, writes or updates meaningful tests, runs relevant verification, and reports its decisions and unresolved concerns to the lead.

It is the only subagent permitted to modify project files. It does not expand scope, create worktrees, commit, release, or accept its own work.

Configured model: `gpt-5.4` with `medium` reasoning effort.

### Claude QA Engineer

Source: [`claude/qa-engineer.md`](claude/qa-engineer.md)

The QA Engineer independently reviews one bounded formal Task or one bounded one-off change set. It validates the supplied Acceptance Criteria or review objective, correctness, edge cases, regressions, test quality, maintainability, scope, and relevant documentation. It reports evidence-based blocking findings separately from optional observations and never modifies files.

Configured model: Claude Sonnet with `high` effort. Its permission mode is `plan`, and edit/write tools are explicitly disabled.

Every review ends with one recommendation:

- `ACCEPT`
- `CORRECTIONS REQUIRED`
- `BLOCKED`

## Intended workflow

1. Codex defines a bounded Task with acceptance criteria.
2. The Software Engineer implements and tests that Task.
3. Codex invokes the Claude QA Engineer with the Task, acceptance criteria, review boundary, changed files, and implementation handoff.
4. Claude independently reviews the work and returns evidence-based findings.
5. Codex either accepts the Task or assigns focused corrections to the Software Engineer.
6. Corrected work returns to Claude for another independent review.

Codex remains responsible for orchestration, scope, final acceptance, commits, releases, and communication with the user.

For an on-demand review, Codex supplies a concrete change boundary and objective instead of a Task Specification. The QA Engineer applies the same evidence standards and remains read-only.

## Adding an agent

Adding an agent is a deliberate repository change. Add its provider-native source definition, add its explicit source-to-destination mapping to the installer, update the installer tests, and run `install.cmd` once to create the new link. Existing agent links never need to be recreated after source edits.

Keep each role narrow and opinionated, describe when it should be used, define whether it may write files, and require a predictable handoff. Keep reusable procedural knowledge in the skills repository rather than duplicating it across agent prompts.

## Development and validation

Run all repository tests from the repository root:

```text
node --test tests/*.test.mjs
```
