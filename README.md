<p align="center">
  <img src="./public/assets/open-social-network-logo.png" width="96" alt="Open Social Network logo" />
</p>

# Open Social Network Web

Open Social Network Web is the official browser interface for the Open Social Network.

It is not the network. It is not an account provider. It is not a central authority.

It is a web client that follows sovereign Open Social Network profiles, reads their signed feeds, verifies post ownership locally, and renders a chronological timeline.

## In One Minute

Open Social Network Web is the easiest place to use Open Social Network.

It keeps the main flow simple:

1. read signed posts from people you follow
2. create your own page
3. write posts
4. download your site and host it anywhere

There is no account system in this MVP. Follows are stored locally in your browser.

If you already have a sovereign page, the browser can also log in locally with that page folder. The private key stays in your browser and is used only to sign new posts.

## The Social Browser for a Protocol-First Network

The internet already has powerful protocols:

- HTTP for websites
- DNS for names
- SMTP for email
- RSS for feeds
- MCP for connecting AI systems to tools and context

But social media still behaves as if identity must live inside centralized platforms.

Open Social Network Web is built around a different assumption: social content can be browsed from the open web. A profile can be hosted anywhere. A feed can be a signed JSON file. An aggregator can be replaced without losing the person, the posts, or the audience.

This app is the first official interface for that idea.

## Philosophy

Open Social Network Web exists to prove that social media can be browsed like the open web:

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

- Loads a demo Open Social Network profile directory.
- Follows profile URLs in local browser storage.
- Fetches each `profile.json` and `feed.json`.
- Verifies ES256 signatures on every post.
- Rejects posts that fail signature verification.
- Merges verified posts chronologically.
- Shows trust diagnostics for rejected posts and failed feeds.
- Supports manual following by entering a `profile.json` URL.
- Creates a new page directly in the browser.
- Logs in locally with a generated page folder.
- Signs new posts in the browser and exports an updated `feed.json`.
- Creates encrypted direct-message envelopes for profiles that advertise a message inbox.
- Attempts automatic message delivery to compatible inbox endpoints and falls back to a downloadable encrypted message file on static-only hosts.
- Exports public files that can be hosted anywhere static files are supported.

## What This MVP Does Not Do Yet

- It does not create accounts.
- It does not upload your private key to a server.
- It does not deploy posts automatically.
- It does not run a central message server.
- It does not provide global search.
- It does not implement moderation or ranking.
- It does not store data on a server.

Those are separate layers. This client is a first proof that sovereign pages and signed feeds are usable.

## How To Use It

### Publish Your Own Profile

The easiest way to publish a compatible Open Social Network profile is:

```bash
npx open-social-network
```

That guided CLI creates a sovereign page, signs posts, validates the feed, and deploys it to a free static host.

You can also create a page directly in Open Social Network Web with `Create my page`.

### Run the Demo

```bash
npm install
npm run generate:demo
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`.

The app starts with demo profiles and signed posts.

### Follow a Profile

Paste a URL to a compatible `profile.json` file into the profile input and select `Follow`.

The profile must expose:

- a valid Open Social Network identity file
- a feed endpoint
- posts signed by the matching private key

### Log In With Your Page

If you created a page with the CLI, select `Log in with page folder` and choose the generated project folder.

The folder must contain:

```text
public/profile.json
public/feed.json
private/identity.private.jwk.json
```

Open Social Network Web validates that the private key owns the profile. After that, it remembers the session in local browser storage, shows your page as logged in, lets you sign a new post, and lets you download the updated `feed.json`.

### Host It Anywhere

Open Social Network does not require a specific host.

Download the public site and upload it to any static host:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel
- S3-compatible hosting
- your own server

Only publish the public files. Never publish the private folder.

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

- [`open-social-network-cli`](https://github.com/Open-Social-Network/open-social-network-cli) - guided publishing for real sovereign profiles
- [`open-social-network-core`](https://github.com/Open-Social-Network/open-social-network-core) - protocol primitives, schemas, and specification
- [`open-social-network-page`](https://github.com/Open-Social-Network/open-social-network-page) - sovereign page template

## Status

Open Social Network Web is early alpha. The current priority is correctness, clarity, and protocol usability before social features expand.

The long-term goal is not to create another social platform. The goal is to make platforms optional.

## How Open Social Network Differs From Existing Decentralized Social Platforms

Open Social Network does not start from the claim that decentralized social media is new.

Mastodon, ActivityPub, Nostr, Bluesky, Diaspora, Matrix, and the broader fediverse have already proven that open social systems matter. They have advanced federation, decentralized identity, relays, public protocols, community governance, and user choice.

Open Social Network exists because we think some problems still deserve a simpler protocol-first experiment: ownership that starts at the user's page, an experience that feels familiar to nontechnical people, and social records that remain portable across clients, hosts, and aggregators.

The goal is to learn from prior work, not to erase it.

### The Different Bet

Open Social Network treats a profile as a sovereign web object. It should feel closer to a website, a domain, or an email identity than to an account rented from one instance, relay, provider, or app.

The protocol keeps the first layer small: profiles, feeds, signed posts, signed public actions, and encrypted message envelopes. Everything else - ranking, moderation, search, media hosting, notifications, recommendation systems, and managed hosting - can be built as replaceable layers around that foundation.

### Problems We Are Designing Around

Identity should not be trapped in infrastructure users do not control. A person should be able to move hosts, change apps, use mirrors, or self-host without restarting their social existence.

Decentralization should not become homework for everyday users. People should not need to understand federation, relays, instances, key formats, or static hosting before they can create a page and post.

Creators should keep their audience and reputation. Followers, visibility, comments, reactions, and trust signals should be portable protocol data, not private database rows that disappear when a user changes clients.

Aggregators should be replaceable. They should read, verify, rank, moderate, and display the network, but they should not own the identities or the graph. Different aggregators and algorithms should be able to compete.

The protocol should stay small enough to inspect. Open Social Network should feel more like a set of web conventions for social identity than a distributed operating system.

### What This Means In Practice

- A page can be hosted anywhere static files work.
- The public folder is safe to publish; private keys are never published.
- Posts and public actions are signed so any client can verify them.
- Direct messages are stored as encrypted envelopes so hosts can carry them without reading them.
- Official tools are reference implementations, not the network itself.
- Moderation remains possible at the host, app, aggregator, community, and user layer without creating one global protocol owner.

### Final Note

Open Social Network does not claim to have solved decentralized social media. Moderation, spam, abuse handling, discovery, scaling, onboarding, incentives, and safety are hard problems.

This project is an attempt to explore a smaller and more user-centered path: social identity as open internet infrastructure, where platforms become interfaces and users keep the underlying identity, audience, and content.
