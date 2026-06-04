import { strToU8, zipSync } from 'fflate';
import {
  exportMessagePrivateKeyJwk,
  exportMessagePublicKeyJwk,
  exportPrivateKeyJwk,
  exportPublicKeyJwk,
  generateIdentityKeyPair,
  generateMessageKeyPair,
  importPrivateKeyJwk,
} from '../protocol/keys';
import { signPost, verifyPost } from '../protocol/signing';
import type { TimelinePost, TimelineResult } from '../aggregator/timeline';
import type {
  OpenSocialNetworkFeed,
  OpenSocialNetworkAction,
  OpenSocialNetworkActionLog,
  OpenSocialNetworkDirectMessageLog,
  OpenSocialNetworkIdentity,
  OpenSocialNetworkPost,
  UnsignedOpenSocialNetworkPost,
} from '../protocol/types';

const OWNER_STORAGE_KEY = 'open-social-network.ownerSession.v1';

export interface OwnerSession {
  profile: OpenSocialNetworkIdentity;
  feed: OpenSocialNetworkFeed;
  privateKeyJwk: JsonWebKey;
  messagePrivateKeyJwk?: JsonWebKey;
  pageUrl?: string;
}

export interface CreateOwnerPageOptions {
  name: string;
  handle: string;
  bio: string;
  firstPost: string;
}

export interface OwnerPostOptions {
  createdAt?: string;
  id?: string;
}

export interface OwnerSiteExportOptions {
  includePrivate: boolean;
  actions?: OpenSocialNetworkAction[];
}

export type OwnerSiteFiles = Record<string, string>;

export async function createOwnerPage(options: CreateOwnerPageOptions): Promise<OwnerSession> {
  const name = options.name.trim();
  const handle = options.handle.trim();
  const bio = options.bio.trim();
  const firstPost = options.firstPost.trim();

  if (!name) {
    throw new Error('Page name is required');
  }

  if (!handle) {
    throw new Error('Handle is required');
  }

  if (!firstPost) {
    throw new Error('First post is required');
  }

  const keyPair = await generateIdentityKeyPair();
  const messageKeyPair = await generateMessageKeyPair();
  const privateKeyJwk = await exportPrivateKeyJwk(keyPair.privateKey);
  const publicKeyJwk = await exportPublicKeyJwk(keyPair.publicKey);
  const messagePrivateKeyJwk = await exportMessagePrivateKeyJwk(messageKeyPair.privateKey);
  const messagePublicKeyJwk = await exportMessagePublicKeyJwk(messageKeyPair.publicKey);
  const profile: OpenSocialNetworkIdentity = {
    protocol: 'open-social-network',
    version: '0.1',
    handle,
    name,
    bio,
    publicKey: {
      alg: 'ES256',
      jwk: publicKeyJwk,
    },
    messagePublicKey: {
      alg: 'ECDH-P256',
      jwk: messagePublicKeyJwk,
    },
    endpoints: {
      profile: '/profile.json',
      feed: '/feed.json',
      actions: '/opensocial/actions/inbox/index.json',
      messages: '/opensocial/messages/inbox/index.json',
    },
  };
  const feed: OpenSocialNetworkFeed = {
    protocol: 'open-social-network',
    version: '0.1',
    author: handle,
    posts: [
      await signPost(
        {
          id: 'post_001',
          author: handle,
          createdAt: new Date().toISOString(),
          content: firstPost,
        },
        keyPair.privateKey,
      ),
    ],
  };

  return connectOwnerPage({ profile, feed, privateKeyJwk, messagePrivateKeyJwk });
}

export async function connectOwnerPage(input: OwnerSession): Promise<OwnerSession> {
  assertValidProfile(input.profile);
  assertValidFeed(input.feed);

  if (input.feed.author !== input.profile.handle) {
    throw new Error('Owner feed author does not match the profile handle');
  }

  const privateKey = await importPrivateKeyJwk(input.privateKeyJwk);
  const proof = await signPost(
    {
      id: 'owner_proof',
      author: input.profile.handle,
      createdAt: '2026-01-01T00:00:00.000Z',
      content: 'Open Social Network owner proof',
    },
    privateKey,
  );

  if (!(await verifyPost(proof, input.profile))) {
    throw new Error('The private key does not match this profile public key');
  }

  for (const post of input.feed.posts) {
    if (!(await verifyPost(post, input.profile))) {
      throw new Error(`Post ${post.id} is not signed by this profile`);
    }
  }

  const messageKeyResult = await ensureOwnerMessageKey(input.profile, input.messagePrivateKeyJwk);

  return {
    profile: messageKeyResult.profile,
    feed: input.feed,
    privateKeyJwk: input.privateKeyJwk,
    messagePrivateKeyJwk: messageKeyResult.messagePrivateKeyJwk,
    pageUrl: input.pageUrl,
  };
}

async function ensureOwnerMessageKey(
  profile: OpenSocialNetworkIdentity,
  messagePrivateKeyJwk: JsonWebKey | undefined,
): Promise<{ profile: OpenSocialNetworkIdentity; messagePrivateKeyJwk: JsonWebKey }> {
  if (isRecord(messagePrivateKeyJwk) && hasPublicMessageCoordinates(messagePrivateKeyJwk)) {
    return {
      profile: withMessagePublicKey(profile, publicMessageJwkFromPrivate(messagePrivateKeyJwk)),
      messagePrivateKeyJwk,
    };
  }

  const messageKeyPair = await generateMessageKeyPair();
  const generatedPrivateJwk = await exportMessagePrivateKeyJwk(messageKeyPair.privateKey);
  const generatedPublicJwk = await exportMessagePublicKeyJwk(messageKeyPair.publicKey);

  return {
    profile: withMessagePublicKey(profile, generatedPublicJwk),
    messagePrivateKeyJwk: generatedPrivateJwk,
  };
}

function withMessagePublicKey(
  profile: OpenSocialNetworkIdentity,
  publicKeyJwk: JsonWebKey,
): OpenSocialNetworkIdentity {
  return {
    ...profile,
    messagePublicKey: {
      alg: 'ECDH-P256',
      jwk: publicKeyJwk,
    },
    endpoints: {
      ...profile.endpoints,
      messages: profile.endpoints.messages ?? '/opensocial/messages/inbox/index.json',
    },
  };
}

function hasPublicMessageCoordinates(jwk: JsonWebKey): boolean {
  return typeof jwk.x === 'string' && typeof jwk.y === 'string';
}

function publicMessageJwkFromPrivate(jwk: JsonWebKey): JsonWebKey {
  const { d: _d, key_ops: _keyOps, ...publicJwk } = jwk;

  return {
    ...publicJwk,
    kty: publicJwk.kty ?? 'EC',
    crv: publicJwk.crv ?? 'P-256',
    ext: true,
  };
}

export async function signOwnerPost(
  session: OwnerSession,
  content: string,
  options: OwnerPostOptions = {},
): Promise<OwnerSession> {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error('Post content is required');
  }

  const privateKey = await importPrivateKeyJwk(session.privateKeyJwk);
  const createdAt = options.createdAt ?? new Date().toISOString();
  const post: UnsignedOpenSocialNetworkPost = {
    id: options.id ?? createPostId(createdAt),
    author: session.profile.handle,
    createdAt,
    content: trimmedContent,
  };
  const signedPost = await signPost(post, privateKey);

  if (!(await verifyPost(signedPost, session.profile))) {
    throw new Error('Signed post could not be verified with this profile');
  }

  return {
    ...session,
    feed: {
      ...session.feed,
      posts: [signedPost, ...session.feed.posts],
    },
  };
}

export function exportOwnerFeed(session: OwnerSession): string {
  return `${JSON.stringify(session.feed, null, 2)}\n`;
}

export function exportOwnerSiteFiles(
  session: OwnerSession,
  options: OwnerSiteExportOptions,
): OwnerSiteFiles {
  const actionLog: OpenSocialNetworkActionLog = {
    protocol: 'open-social-network',
    version: '0.1',
    actor: session.profile.handle,
    actions: options.actions ?? [],
  };
  const messageLog: OpenSocialNetworkDirectMessageLog = {
    protocol: 'open-social-network',
    version: '0.1',
    owner: session.profile.handle,
    messages: [],
  };
  const files: OwnerSiteFiles = {
    'public/.well-known/open-social-network.json': jsonFile(session.profile),
    'public/feed.json': exportOwnerFeed(session),
    'public/index.html': pageHtml(session.profile),
    'public/opensocial/actions/index.json': jsonFile(actionLog),
    'public/opensocial/messages/inbox/index.json': jsonFile(messageLog),
    'public/page.js': pageScript(),
    'public/profile.json': jsonFile(session.profile),
    'public/styles.css': pageStyles(),
  };

  if (options.includePrivate) {
    files['private/identity.private.jwk.json'] = jsonFile(session.privateKeyJwk);
    if (session.messagePrivateKeyJwk) {
      files['private/messages.private.jwk.json'] = jsonFile(session.messagePrivateKeyJwk);
    }
  }

  return files;
}

export function exportOwnerSiteZip(
  session: OwnerSession,
  options: OwnerSiteExportOptions,
): Uint8Array {
  const files = exportOwnerSiteFiles(session, options);

  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, content]) => [path, strToU8(content)]),
    ),
  );
}

export function loadStoredOwnerSession(storage: Storage = window.localStorage): OwnerSession | null {
  try {
    const storedValue = storage.getItem(OWNER_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue) as Partial<OwnerSession>;

    assertValidProfile(parsed.profile as OpenSocialNetworkIdentity);
    assertValidFeed(parsed.feed as OpenSocialNetworkFeed);

    if (!isRecord(parsed.privateKeyJwk)) {
      return null;
    }

    return {
      profile: parsed.profile as OpenSocialNetworkIdentity,
      feed: parsed.feed as OpenSocialNetworkFeed,
      privateKeyJwk: parsed.privateKeyJwk,
      messagePrivateKeyJwk: isRecord(parsed.messagePrivateKeyJwk)
        ? parsed.messagePrivateKeyJwk
        : undefined,
      pageUrl: typeof parsed.pageUrl === 'string' ? parsed.pageUrl : undefined,
    };
  } catch {
    return null;
  }
}

export function saveStoredOwnerSession(
  session: OwnerSession,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(OWNER_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredOwnerSession(storage: Storage = window.localStorage): void {
  storage.removeItem(OWNER_STORAGE_KEY);
}

export function mergeOwnerTimeline(
  timeline: TimelineResult | null,
  session: OwnerSession | null,
): TimelineResult {
  const baseTimeline: TimelineResult = timeline ?? {
    profiles: [],
    posts: [],
    actions: [],
    rejectedPosts: [],
    rejectedActions: [],
    failures: [],
  };

  if (!session) {
    return baseTimeline;
  }

  const profilesByHandle = new Map<string, OpenSocialNetworkIdentity>();

  for (const profile of [session.profile, ...baseTimeline.profiles]) {
    profilesByHandle.set(profile.handle, profile);
  }

  const postsByKey = new Map<string, TimelinePost>();

  for (const post of [
    ...session.feed.posts.map((post) => ({ ...post, profile: session.profile })),
    ...baseTimeline.posts,
  ]) {
    postsByKey.set(`${post.author}:${post.id}`, post);
  }

  return {
    profiles: [...profilesByHandle.values()],
    posts: [...postsByKey.values()].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    actions: baseTimeline.actions,
    rejectedPosts: baseTimeline.rejectedPosts,
    rejectedActions: baseTimeline.rejectedActions,
    failures: baseTimeline.failures,
  };
}

function assertValidProfile(value: OpenSocialNetworkIdentity): void {
  if (
    value.protocol !== 'open-social-network' ||
    value.version !== '0.1' ||
    typeof value.handle !== 'string' ||
    typeof value.name !== 'string' ||
    value.publicKey?.alg !== 'ES256' ||
    !value.publicKey.jwk ||
    typeof value.endpoints?.profile !== 'string' ||
    typeof value.endpoints.feed !== 'string'
  ) {
    throw new Error('Profile file is not a valid Open Social Network identity');
  }
}

function assertValidFeed(value: OpenSocialNetworkFeed): void {
  if (
    value.protocol !== 'open-social-network' ||
    value.version !== '0.1' ||
    typeof value.author !== 'string' ||
    !Array.isArray(value.posts) ||
    !value.posts.every(isSignedPost)
  ) {
    throw new Error('Feed file is not a valid Open Social Network feed');
  }
}

function isSignedPost(value: unknown): value is OpenSocialNetworkPost {
  if (!isRecord(value)) {
    return false;
  }

  const post = value as Partial<OpenSocialNetworkPost>;

  return (
    typeof post.id === 'string' &&
    typeof post.author === 'string' &&
    typeof post.createdAt === 'string' &&
    typeof post.content === 'string' &&
    post.signature?.alg === 'ES256' &&
    typeof post.signature.value === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createPostId(createdAt: string): string {
  const normalizedTime = createdAt.replace(/[^0-9]/gu, '').slice(0, 17);
  const entropy = crypto.getRandomValues(new Uint32Array(1))[0]?.toString(36) ?? '0';

  return `post_${normalizedTime}_${entropy}`;
}

function jsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function pageHtml(profile: OpenSocialNetworkIdentity): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(profile.name)} - Open Social Network</title>
    <meta name="description" content="${escapeHtml(profile.bio || profile.handle)}" />
    <link rel="stylesheet" href="./styles.css" />
    <link rel="alternate" type="application/json" href="./profile.json" title="Open Social Network profile" />
    <link rel="alternate" type="application/json" href="./feed.json" title="Open Social Network feed" />
  </head>
  <body>
    <main class="page-shell">
      <section class="profile-hero">
        <p class="network-label">Open Social Network</p>
        <h1 data-profile-name>${escapeHtml(profile.name)}</h1>
        <p data-profile-bio>${escapeHtml(profile.bio || profile.handle)}</p>
      </section>
      <section class="feed-section">
        <div class="section-header">
          <h2>Posts</h2>
          <span data-verification-status>Checking</span>
        </div>
        <div class="post-list" data-posts></div>
        <details class="technical-details">
          <summary>Technical details</summary>
          <a href="./profile.json">Profile file</a>
          <a href="./feed.json">Feed file</a>
          <a href="./.well-known/open-social-network.json">Discovery file</a>
        </details>
      </section>
    </main>
    <script type="module" src="./page.js"></script>
  </body>
</html>
`;
}

function pageScript(): string {
  return `const profileName = document.querySelector('[data-profile-name]');
const profileBio = document.querySelector('[data-profile-bio]');
const postsRoot = document.querySelector('[data-posts]');
const verificationStatus = document.querySelector('[data-verification-status]');

await boot();

async function boot() {
  try {
    const profile = await fetchJson('./profile.json');
    const feed = await fetchJson('./feed.json');
    const verifiedPosts = [];

    profileName.textContent = profile.name;
    profileBio.textContent = profile.bio || profile.handle;

    for (const post of feed.posts) {
      if (await verifyPost(post, profile)) {
        verifiedPosts.push(post);
      }
    }

    verifiedPosts.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    verificationStatus.textContent = verifiedPosts.length === 1 ? '1 verified post' : \`\${verifiedPosts.length} verified posts\`;
    postsRoot.innerHTML = renderPosts(verifiedPosts);
  } catch (error) {
    verificationStatus.textContent = 'Unavailable';
    postsRoot.innerHTML = \`<p class="empty-state">\${escapeHtml(error.message || 'Could not load feed')}</p>\`;
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(\`HTTP \${response.status} for \${url}\`);
  return response.json();
}

async function verifyPost(post, profile) {
  if (post.author !== profile.handle || post.signature?.alg !== 'ES256') return false;
  try {
    const publicKey = await crypto.subtle.importKey('jwk', profile.publicKey.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']);
    const payload = new TextEncoder().encode(canonicalStringify(postSigningPayload(post)));
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, base64UrlToBytes(post.signature.value), payload);
  } catch {
    return false;
  }
}

function postSigningPayload(post) {
  const { signature, ...payload } = post;
  return payload;
}

function canonicalStringify(value) {
  return JSON.stringify(toCanonicalValue(value));
}

function toCanonicalValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON does not support non-finite numbers.');
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => (item === undefined ? null : toCanonicalValue(item)));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => [key, toCanonicalValue(value[key])]));
  }
  throw new TypeError(\`Canonical JSON does not support \${typeof value} values.\`);
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function renderPosts(posts) {
  if (posts.length === 0) return '<p class="empty-state">No verified posts yet.</p>';
  return posts.map((post) => \`
    <article class="post-card">
      <h3>\${escapeHtml(formatDate(post.createdAt))}</h3>
      <p>\${escapeHtml(post.content)}</p>
      <details class="technical-details post-details">
        <summary>Signature</summary>
        <code>\${escapeHtml(post.signature.value)}</code>
      </details>
    </article>
  \`).join('');
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
`;
}

function pageStyles(): string {
  return `:root {
  color: #edf6ff;
  background: #070a12;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --surface: #101624;
  --surface-strong: #151d2e;
  --ink: #edf6ff;
  --muted: #9dacbf;
  --border: #29364f;
  --accent: #4d7cff;
  --cyan: #2ce7f0;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(77, 124, 255, 0.1), transparent 320px), linear-gradient(180deg, #060810 0%, #0b1020 58%, #070a12 100%);
}
a { color: #b9caff; }
.page-shell { width: min(920px, 100%); margin: 0 auto; padding: 48px 20px; }
.profile-hero, .feed-section {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(16, 22, 36, 0.92);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
}
.profile-hero { padding: 32px; margin-bottom: 20px; }
.network-label, h1, h2, p { margin: 0; }
.network-label { color: var(--cyan); font-size: 0.82rem; font-weight: 800; text-transform: uppercase; }
h1 { margin-top: 8px; font-size: clamp(2rem, 7vw, 4rem); line-height: 1; }
.profile-hero p:last-child { max-width: 680px; margin-top: 14px; color: var(--muted); font-size: 1.05rem; line-height: 1.55; }
.feed-section { padding: 24px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
[data-verification-status] {
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(77, 124, 255, 0.18), rgba(44, 231, 240, 0.15));
  color: #b9caff;
  padding: 8px 12px;
  font-size: 0.84rem;
  font-weight: 750;
}
.post-list { display: grid; gap: 12px; }
.post-card { padding: 18px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-strong); }
.post-card h3 { color: var(--muted); font-size: 0.86rem; }
.post-card p { margin-top: 10px; color: #dce7f7; font-size: 1.05rem; line-height: 1.58; }
.post-card code { color: var(--cyan); overflow-wrap: anywhere; }
.technical-details { margin-top: 20px; color: var(--muted); }
.technical-details summary { color: var(--ink); cursor: pointer; font-weight: 800; }
.technical-details a { display: inline-flex; margin: 10px 12px 0 0; }
.post-details { padding-top: 12px; border-top: 1px solid var(--border); }
.empty-state { color: var(--muted); }
@media (max-width: 640px) {
  .page-shell { padding: 20px 16px; }
  .section-header { align-items: flex-start; flex-direction: column; }
}
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
