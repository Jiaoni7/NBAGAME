# Repository Hygiene Design

Date: 2026-06-02

## Objective

Prepare the project for ongoing development and eventual release by defining a lightweight but durable repository standard.

## Decisions

1. Keep the public repository runnable without any private local-only assets.
2. Treat project-specific skills, prompts, research, and internal workflow notes as local private assets.
3. Ignore private working directories in git rather than banning their local use.
4. Use a lightweight documentation set:
   - `README.md`
   - `DEVELOPMENT.md`
   - `CONTRIBUTING.md`
   - `docs/release-checklist.md`
5. Use `main` as the stable branch and short-lived feature branches for daily work.

## Public Repository Scope

- source code and assets required to run the game
- build and packaging scripts
- public contributor documentation

## Local-Only Scope

- `skills/`
- `.codex/`
- `.claude/`
- private prompts
- local audit notes
- research documents
- personal helper scripts and logs

## Immediate Implementation

- add `.gitignore`
- add baseline contributor documents
- move the web asset copy script into `scripts/`
- remove obviously machine-specific helper artifacts from the public root

## Follow-Up

- lightly reorganize the repository structure where needed
- fix or confirm text encoding consistency
- add a simple review routine before release
