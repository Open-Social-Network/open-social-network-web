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
4. open encrypted messages locally
5. download your site and host it anywhere

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
- Signs likes, dislikes, and comments as public portable updates.
- Creates encrypted direct-message envelopes for profiles that advertise a message inbox.
- Attempts automatic message delivery to compatible inbox endpoints and falls back to a downloadable encrypted message file on static-only hosts.
- Opens encrypted message files locally when the current page owns the matching message key and the sender profile is loaded.
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

If you created a page with the CLI, select `Open my page folder` and choose the generated project folder.

The folder must contain:

```text
public/profile.json
public/feed.json
private/identity.private.jwk.json
private/messages.private.jwk.json
public/opensocial/actions/index.json
```

Open Social Network Web validates that the private key owns the profile. After that, it remembers the session in local browser storage, shows your page as logged in, loads your published public reactions and comments, lets you sign a new post, and lets you download the updated `feed.json`.

### React And Comment

When your page is open, likes, dislikes, and comments become signed public updates.

After you interact, Open Social Network Web shows when public updates are ready. Download the public site and upload the public folder wherever your page is hosted.

### Read Messages

When your page is open, use `Messages` -> `Open message` to choose encrypted message files.

Messages are decrypted only in this browser. The app verifies that the message was sent to your page and that the sender profile is loaded before showing the text.

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

### Read Verification Diagnostics

The `Verification` panel tells you whether posts were rejected or feeds failed to load. Rejected posts are not rendered in the timeline.

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

## Relationship To Existing Decentralized Social Platforms

Open Social Network does not claim that decentralized social media starts here.

Mastodon, ActivityPub, Nostr, Bluesky/AT Protocol, Diaspora, Matrix, and the broader fediverse have already advanced open social infrastructure in important ways. They have explored federation, portable identity, relays, moderation, community governance, and protocol-based communication at real scale.

Open Social Network exists because we believe a few hard problems still need a simpler path for mainstream adoption.

Email has protocols. DNS has protocols. The web has protocols. AI systems are beginning to use open interoperability layers. Social identity should have the same kind of open, inspectable foundation instead of living only inside applications that can change the rules, the algorithm, or the audience relationship at any time.

This web aggregator is one interface for that network, not the network itself.

### What Still Feels Unresolved

- **Identity is often attached to infrastructure.** Many systems still ask users to depend on an instance, relay, provider, app, or hosted account namespace. Open Social Network starts from a sovereign web identity: a page and key that can move across hosts and interfaces.
- **The user experience is still too technical.** Most people want a profile, posts, follows, reactions, comments, messages, discoverability, and portability. They should not need to understand federation, relays, static hosting, keys, or JSON to participate.
- **Creator ownership remains fragile.** Visibility, reputation, audiences, and social history can still become tied to one app, one server, or one algorithm. Open Social Network is designed so followers, public actions, and reputation can become portable protocol data instead of platform data.
- **Core systems can become too large to explain.** Open Social Network keeps the base layer small: profiles, feeds, signed posts, signed public actions, encrypted messages, and discovery. More complex systems should be optional modules, not requirements for reading a page.

### The Open Social Network Direction

- **Profiles are sovereign.** A profile belongs to the person, organization, project, or community that publishes it.
- **Aggregators are replaceable.** Aggregators browse, verify, rank, moderate, and display the network. They do not own the identities underneath.
- **Publishing should work anywhere.** A public folder can live on static hosting, a personal server, a community host, object storage, mirrors, or future compatible storage layer.
- **Algorithms should compete.** Different clients should be able to offer different ranking, moderation, and discovery without controlling the protocol.
- **Decentralization should feel familiar.** Users should experience simple actions: create a page, post, follow, react, comment, message, and publish. The protocol details should be there for verification, not forced into daily use.
- **The protocol has no global account switch.** Safety and moderation are real requirements, but they should be handled by hosts, apps, communities, filters, and user choice rather than a central protocol owner.

### What v0.1 Is Trying To Prove

v0.1 is intentionally small. It focuses on sovereign profiles, signed feeds, signed public actions, encrypted direct-message envelopes, and static web compatibility.

The goal is not to defeat every previous approach. The goal is to learn from them and test a different primitive: social identity as ordinary web infrastructure, inspectable by developers and usable by normal people.

The protocol should feel closer to HTML or RSS for social identity than to a massive distributed operating system.

### Final Thought

Open Social Network has not solved every hard problem in decentralized social media. Spam, safety, abuse, discovery, onboarding, moderation, scaling, and creator incentives require serious work.

This project exists to make that work possible on top of a simple foundation: user-owned social identity, signed public records, portable relationships, encrypted private communication, and interfaces that ordinary people can use.

The long-term goal is not to create the dominant social platform. The goal is to make social platforms optional.
