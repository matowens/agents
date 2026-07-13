# Codex Agents

This repository contains personal Codex agent definitions used in an AI-assisted development workflow. Each agent has a narrow role, an explicit model configuration, and clear boundaries around whether it may modify code.

Reusable skills and domain-specific workflows are maintained in a separate skills repository. The files here define **who performs a task**; skills define **how a specialized task is performed**.

## Workflow

The agents are intended to be coordinated by a lead agent:

1. The lead defines a bounded checkpoint with acceptance criteria.
2. The Software Engineer implements and tests that checkpoint.
3. The QA Engineer independently reviews the completed work.
4. If corrections are required, the lead sends a focused checkpoint back to the Software Engineer and requests another QA review afterward.
5. The lead remains responsible for scope, acceptance, commits, releases, and communication with the user.

Keeping implementation and review separate provides a deliberate second pass while avoiding multiple agents editing the same working tree.

## Available agents

### Software Engineer

File: [`software-engineer.toml`](software-engineer.toml)

The Software Engineer is the repository's implementation agent. It works on one approved checkpoint at a time and is the only subagent permitted to modify project files.

Its responsibilities include:

- inspecting existing code and repository guidance before editing;
- implementing complete, production-quality changes without expanding scope;
- writing or updating meaningful tests;
- running relevant verification and reporting exact results; and
- returning changed files, decisions, and unresolved concerns to the lead.

It does not create worktrees, start additional checkpoints, commit, release, or accept its own work.

Configured model: `gpt-5.4` with `medium` reasoning effort.

### QA Engineer

File: [`qa-engineer.toml`](qa-engineer.toml)

The QA Engineer is an independent, read-only reviewer for a completed checkpoint. It evaluates the implementation against its acceptance criteria and reports evidence-based findings to the lead.

Its review covers:

- correctness, edge cases, and regressions;
- test coverage and test quality;
- readability, naming, and unnecessary complexity;
- scope compliance; and
- documentation when relevant.

It distinguishes blocking findings from optional observations and finishes with `ACCEPT`, `CORRECTIONS REQUIRED`, or `BLOCKED`. It does not modify files or implement fixes.

Configured model: `gpt-5.6-luna` with `medium` reasoning effort.

## Agent definition format

Each TOML file is a standalone Codex custom-agent definition containing:

- `name`: the role Codex uses to identify the agent;
- `description`: guidance for when the agent should be selected;
- `model` and `model_reasoning_effort`: role-specific model settings; and
- `developer_instructions`: the role's responsibilities, constraints, and expected handoff.

Personal agents are loaded from `~/.codex/agents/`. Project-specific agents can instead be stored in `.codex/agents/` within a trusted project.

## Using the agents

Ask Codex to delegate a bounded task to the named agent. For example:

> Have the Software Engineer implement this checkpoint, then have the QA Engineer review the completed changes. Wait for both and summarize the result.

The checkpoint should state its scope, acceptance criteria, relevant constraints, and expected verification. Agent definitions complement the target repository's `AGENTS.md`; they do not replace its project-specific conventions.

## Adding an agent

Add a standalone TOML file with a narrow role and explicit boundaries. Prefer agents that own one distinct responsibility, describe when they should be used, define whether they may write files, and return a predictable handoff to the lead. Keep reusable procedural knowledge in the skills repository rather than duplicating it across agent prompts.
