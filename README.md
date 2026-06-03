# NBAGAME

NBA-themed browser game project with PWA support and optional Android packaging via Capacitor.

This repository is kept public and runnable. Team-private skills, prompts, research notes, and local helper assets stay on each contributor's machine and are not part of the open-source repository.

## Project Shape

- Current app model: single-page web game built with native HTML, CSS, and JavaScript
- Packaging targets: web / PWA / Android (Capacitor)
- Collaboration model: small-team delivery, developer-led implementation, product-supported iteration
- Git model: develop on branch in a personal fork, sync to the upstream repository through PR when needed

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
|   |-- architecture/
|   |-- platforms/
|   |-- release-checklist.md
|   `-- superpowers/
|-- scripts/
|   `-- copy-www.js
|-- capacitor.config.json
|-- game.js
|-- index.html
|-- manifest.webmanifest
|-- package.json
`-- sw.js
```

## Public vs Local-Only Content

Committed:

- runtime source files and assets required to run the project
- packaging scripts and public config
- public team workflow docs and release docs

Ignored and kept local:

- `skills/`
- `skills.md`
- `.codex/`
- `.claude/`
- `notes-private/`
- `research-private/`
- private prompts, local-only research, helper scripts, temporary logs

If a local workflow note or project-specific `SKILL.md` is useful during development, keep it under an ignored directory instead of the public repository root.

## Team Docs

- [DEVELOPMENT.md](DEVELOPMENT.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/README.zh-CN.md](docs/README.zh-CN.md)
- [docs/architecture/current-architecture.zh-CN.md](docs/architecture/current-architecture.zh-CN.md)
- [docs/project-status.zh-CN.md](docs/project-status.zh-CN.md)
- [docs/changelog.zh-CN.md](docs/changelog.zh-CN.md)
- [docs/release-checklist.md](docs/release-checklist.md)
- [docs/git-workflow.zh-CN.md](docs/git-workflow.zh-CN.md)
- [docs/platforms/android-packaging.zh-CN.md](docs/platforms/android-packaging.zh-CN.md)

## Notes

- Start from [docs/README.zh-CN.md](docs/README.zh-CN.md) for current project state, workflow routing, and planning records.
- Use [docs/architecture/current-architecture.zh-CN.md](docs/architecture/current-architecture.zh-CN.md) when deciding where new public files or structural changes should go.
- This repository should remain usable without any private local-only files.
