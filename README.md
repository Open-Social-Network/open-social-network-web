<p align="center">
  <img src="./public/assets/open-social-logo.png" width="96" alt="OpenSocial logo" />
</p>

# OpenSocial Web

OpenSocial Web is the official browser interface for the OpenSocial network.

It is not the network. It is not an account provider. It is not a central authority.

It is a web client that follows sovereign OpenSocial profiles, reads their signed feeds, verifies post ownership locally, and renders a chronological timeline.

## In One Minute

OpenSocial Web is a social browser.

It does three simple things:

1. follows OpenSocial profile URLs
2. reads each profile's signed feed
3. shows only posts that verify against the profile public key

There is no account system in this MVP. Follows are stored locally in your browser.

## The Social Browser for a Protocol-First Network

The internet already has powerful protocols:

- HTTP for websites
- DNS for names
- SMTP for email
- RSS for feeds
- MCP for connecting AI systems to tools and context

But social media still behaves as if identity must live inside centralized platforms.

OpenSocial Web is built around a different assumption: social content can be browsed from the open web. A profile can be hosted anywhere. A feed can be a signed JSON file. An aggregator can be replaced without losing the person, the posts, or the audience.

This app is the first official interface for that idea.

## Philosophy

OpenSocial Web exists to prove that social media can be browsed like the open web:

- profiles are independent pages
- posts are signed by their authors
- feeds can be hosted anywhere
- follows live in the client
- aggregators can compete without owning the graph

The aggregator is intentionally neutral. It reads the network, but it does not own the network.

## Benefits

### For Users

- follow identities instead of platforms
- keep your audience when switching clients
- use different aggregators for different experiences
- verify that posts came from the stated identity
- avoid rebuilding your social life every time a product changes

### For Developers

- build clients without permission from a central API owner
- experiment with timelines, ranking, moderation, and discovery
- create specialized social browsers for communities, teams, media, research, or AI workflows
- interoperate through a public protocol instead of private platform contracts

### For the Ecosystem

- aggregators become interfaces, not owners
- hosting providers can compete on reliability and portability
- recommendation systems can be user-selectable
- social identity can become part of the web's public infrastructure

## What This MVP Does

- Loads a demo OpenSocial profile directory.
- Follows profile URLs in local browser storage.
- Fetches each `profile.json` and `feed.json`.
- Verifies ES256 signatures on every post.
- Rejects posts that fail signature verification.
- Merges verified posts chronologically.
- Shows trust diagnostics for rejected posts and failed feeds.
- Supports manual following by entering a `profile.json` URL.

## What This MVP Does Not Do Yet

- It does not create accounts.
- It does not publish posts.
- It does not provide global search.
- It does not implement moderation or ranking.
- It does not store data on a server.

Those are separate layers. This client is a first proof that sovereign pages and signed feeds are usable.

## How To Use It

### Publish Your Own Profile

The easiest way to publish a compatible OpenSocial profile is:

```bash
npx opensocial
```

That guided CLI creates a sovereign page, signs posts, validates the feed, and deploys it to a free static host.

### Run the Demo

```bash
npm install
npm run generate:demo
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`.

The app starts with three demo profiles and five signed posts.

### Follow a Profile

Paste a URL to a compatible `profile.json` file into the profile input and select `Follow`.

The profile must expose:

- a valid OpenSocial identity file
- a feed endpoint
- posts signed by the matching private key

### Read Trust Diagnostics

The `Trust` panel tells you whether posts were rejected or feeds failed to load. Rejected posts are not rendered in the timeline.

## Run Locally

```bash
npm install
npm run generate:demo
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`.

## Validate

```bash
npm test
npm run build
npm audit
```

## Demo Data

Demo profiles are generated into `public/profiles`:

```text
public/profiles/
├── directory.json
├── ada/
│   ├── profile.json
│   └── feed.json
├── relay/
│   ├── profile.json
│   └── feed.json
└── tommy/
    ├── profile.json
    └── feed.json
```

Regenerate demo identities and signed feeds with:

```bash
npm run generate:demo
```

## Related Repositories

- [`opensocial-cli`](https://github.com/Open-Social-Organization/opensocial-cli) - guided publishing for real sovereign profiles
- [`opensocial-core`](https://github.com/Open-Social-Organization/opensocial-core) - protocol primitives, schemas, and specification
- [`opensocial-page`](https://github.com/Open-Social-Organization/opensocial-page) - sovereign page template

## Status

OpenSocial Web is early alpha. The current priority is correctness, clarity, and protocol usability before social features expand.

The long-term goal is not to create another social platform. The goal is to make platforms optional.
