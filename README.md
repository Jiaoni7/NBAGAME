# NBAGAME

NBA-themed browser game project with PWA support and optional Android packaging via Capacitor.

This repository is intended to stay public and runnable. Local development aids such as project-specific skills, research notes, private prompts, and personal helper scripts should stay on each contributor's machine and must not be committed.

## Status

- Current app shape: single-page web game
- Packaging target: web / PWA / Android (Capacitor)
- Primary collaboration model: small team, developer-led, product-supported

## Quick Start

### Requirements

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Build web assets for Capacitor

```bash
npm run www
```

### Local preview

```bash
npm run serve
```

Then open `http://localhost:8123`.

## Android Packaging

```bash
npm run android:add
npm run sync
npm run open:android
```

For a debug APK:

```bash
npm run build:apk
```

## Repository Layout

```text
.
|-- CONTRIBUTING.md
|-- DEVELOPMENT.md
|-- README.md
|-- assets/
|   `-- icons/
|-- docs/
|   |-- release-checklist.md
|   `-- superpowers/specs/
|-- scripts/
|   `-- copy-www.js
|-- game.js
|-- index.html
|-- manifest.webmanifest
|-- package.json
`-- sw.js
```

## Public vs Local-Only Content

Committed:

- game source and assets required to run the project
- packaging scripts and config
- public contributor-facing documentation

Ignored and kept local:

- `skills/`
- `.codex/`
- `.claude/`
- `notes-private/`
- `research-private/`
- personal helper scripts, private prompts, local research, temporary logs

If a workflow note or project-specific skill is useful for local development, store it inside an ignored local-only directory rather than the repository root.

## Team Docs

- [DEVELOPMENT.md](DEVELOPMENT.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/README.zh-CN.md](docs/README.zh-CN.md)
- [docs/project-status.zh-CN.md](docs/project-status.zh-CN.md)
- [docs/changelog.zh-CN.md](docs/changelog.zh-CN.md)
- [docs/release-checklist.md](docs/release-checklist.md)
- [docs/git-workflow.zh-CN.md](docs/git-workflow.zh-CN.md)
- [docs/platforms/android-packaging.zh-CN.md](docs/platforms/android-packaging.zh-CN.md)

## Notes

- Android packaging notes now live at `docs/platforms/android-packaging.zh-CN.md`.
- This repository should always be usable without any private local-only files.
- For current project state, planning, and audit records, start from `docs/README.zh-CN.md`.
