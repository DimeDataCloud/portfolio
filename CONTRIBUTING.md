# Contributing

This is a single-owner portfolio. Outside changes are welcome as issues and pull requests, but the content and the design are set by the owner.

## Setup

Use Node 22 (see `.nvmrc`).

```bash
npm ci
npm run dev
```

## Before you open a pull request

```bash
npm run verify                  # content guardrails, then the production build
node tools/check-bundle.mjs     # gzipped JS must stay under 160 KB
```

CI runs the same three checks on every push and pull request. The pull request template lists them as a checklist. Also look at the change at phone width and at desktop width.

## Ground rules

- Edit content in `src/data/`. Do not hard-code copy in components.
- Every number in the copy must trace to the data files or to a measurement you can reproduce.
- No em dashes, phone numbers, credentials, eyebrow labels, scroll cues or live clocks. The guardrail catches some of these. Review catches the rest.
- Do not link to private repositories. Private projects use `privateNote`.
- The site currently has no third-party scripts, analytics or cookies. Keep it that way unless the owner agrees otherwise.

## Where things are

- `docs/ARCHITECTURE.md` describes the rendering, input, audio and fallback behaviour.
- `docs/DESIGN.md` lists the design principles and what is deliberately absent.
- `docs/CONTENT.md` explains how to add a project and how the guardrails work.

## Security

Report vulnerabilities by email, not in a public issue. See `SECURITY.md`.

## License

By contributing, you agree that your contribution is released under the MIT License in `LICENSE`.
