# Contributing to OpenSocial Web

OpenSocial Web should stay protocol-first, neutral, and easy to inspect.

## Principles

- Render only verified posts.
- Keep follows local unless the user explicitly chooses a sync layer.
- Do not make the official aggregator a central authority.
- Prefer clear diagnostics over silent failures.
- Keep UI copy precise and understandable for non-technical users.

## Local Development

```bash
npm install
npm run generate:demo
npm test
npm run build
```

## Pull Requests

Pull requests should include:

- a concise explanation of user impact
- tests or verification notes
- screenshots for visible UI changes
- notes on protocol compatibility when applicable
