# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Monorepo of example applications for the [Hyperlocal Web SDK](https://www.npmjs.com/package/@bindimaps/hyperlocal-web-sdk) (`@bindimaps/hyperlocal-web-sdk`) and [Hyperlocal React](https://www.npmjs.com/package/@bindimaps/hyperlocal-react) (`@bindimaps/hyperlocal-react`). Each subdirectory is a standalone example app. All examples use **mock mode** — no API keys or camera access needed.

SDK roles:

- `@bindimaps/hyperlocal-react`: React hooks for stream and capture flow
- `@bindimaps/hyperlocal-web-sdk`: core localisation APIs (for example `estimatePosition`)

## Commands

Each example is independent. Commands run from within the example directory (e.g. `basic-react/`):

```bash
npm install       # install deps
npm run start     # dev server (basic-react: port 5913)
npm run build     # production build via vite
```

No linter or test runner is configured.

Deploy / build commands (from repo root):

```bash
./scripts/deploy.sh          # local build: ci + audit + build all examples → _site/
# GH Actions deploys automatically on push to main (.github/workflows/deploy.yml)
```

Keep command and onboarding details in sync with the human-facing docs in `README.md` and `basic-react/README.md`.

## Architecture

- **Monorepo of examples** — each top-level directory is a self-contained app with its own `package.json`
- **basic-react/** — Vite 7 + React 19 + TypeScript. Single-component app (`App.tsx`) demonstrating camera capture → frame selection → position estimation pipeline
- SDK hooks used: `useCameraStream` (video feed), `useFrameCapture` (frame capture state machine)
- SDK function: `estimatePosition` (sends frames to localisation API; mocked in examples)
- Phase state machine in App: `idle → capturing → estimating → done | error`

## Conventions

- TypeScript strict mode
- 4-space indentation (no semicolons in TSX, semicolons in CSS)
- No ESLint/Prettier configured — match existing formatting
