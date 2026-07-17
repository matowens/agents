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
|-- install.ps1
`-- README.md
```

The repository is platform-neutral. Agent definitions are installed into the locations expected by each tool:

- Codex: `~/.codex/agents/`
- Claude Code: `~/.claude/agents/`

## Installation

From Command Prompt in the repository root, run:

```batch
install.cmd
```

The command wrapper invokes the PowerShell installer, so the deployment logic remains in one place. Alternatively, from PowerShell, run:

```powershell
.\install.ps1
```

The installer creates the destination directories, copies the current definitions, and removes stale files that it previously installed. It tracks only repository-managed files and leaves unrelated agents alone.

Run the installer after pulling changes or editing an agent definition.

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

Add the source definition beneath the directory for its runtime, then run `install.cmd` from Command Prompt or `install.ps1` from PowerShell. Keep each role narrow and opinionated, describe when it should be used, define whether it may write files, and require a predictable handoff. Keep reusable procedural knowledge in the skills repository rather than duplicating it across agent prompts.
