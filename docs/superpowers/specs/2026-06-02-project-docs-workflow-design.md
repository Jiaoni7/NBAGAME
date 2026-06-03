# Project Documentation Workflow Design

Date: 2026-06-02

## Objective

Add a lightweight but durable documentation workflow so the project always has:

- a readable current-state summary
- a changelog for major steps
- archived audit records
- plan documents before non-trivial work

## Why

The repository already has baseline hygiene and collaboration docs, but it still lacks a reliable way to answer:

- what is the project state right now
- what changed recently
- what risks are currently known
- where the next work plan lives

Without these documents, future development can drift into unclear status, duplicated work, and low-confidence release preparation.

## Decisions

1. Add a public docs index under `docs/README.zh-CN.md`.
2. Add `docs/project-status.zh-CN.md` as the canonical current-state summary.
3. Add `docs/changelog.zh-CN.md` for major project changes.
4. Add `docs/audits/` for archived audit documents.
5. Add `docs/superpowers/plans/` for implementation plans and templates.
6. Keep private project-specific skills and prompts local-only and out of git.

## Update Rules

### Before non-trivial work

Create one of:

- a design spec in `docs/superpowers/specs/`
- an implementation plan in `docs/superpowers/plans/`

### After significant work

Update:

- `docs/project-status.zh-CN.md`
- `docs/changelog.zh-CN.md`

### After formal audits

Add a new dated file to `docs/audits/` and sync the high-level result into project status.

## Non-Goals

- This workflow does not replace git history.
- This workflow does not expose private internal prompts or local-only skill files.
- This workflow does not require heavyweight process for tiny edits.

## Immediate Implementation

- add docs index
- add project status file
- add changelog
- add first audit record
- add plan directory and template
- wire the workflow into README and DEVELOPMENT guidance
