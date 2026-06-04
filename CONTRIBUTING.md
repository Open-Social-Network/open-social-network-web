# Contributing to Open Social Network Web

Open Social Network Web should stay protocol-first, neutral, and easy to inspect.

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

## Project Context

Open Social Network is not trying to erase the work of Mastodon, ActivityPub, Nostr, Bluesky/AT Protocol, Diaspora, Matrix, or the broader fediverse. Those projects have already moved open social infrastructure forward in serious ways.

This web app is a social browser for a protocol-first network. Contributions should keep the interface familiar for everyday users while preserving the deeper guarantees: verified posts, portable follows, signed public actions, local ownership, and replaceable aggregators.
