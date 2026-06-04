import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { exportPrivateKeyJwk, exportPublicKeyJwk, generateIdentityKeyPair } from '../protocol/keys';
import { signPost, verifyPost } from '../protocol/signing';
import type {
  OpenSocialNetworkActionInbox,
  OpenSocialNetworkActionLog,
  OpenSocialNetworkFeed,
  OpenSocialNetworkIdentity,
} from '../protocol/types';
import { signOwnerReaction } from './owner-actions';
import {
  connectOwnerPage,
  clearStoredOwnerSession,
  createOwnerPage,
  exportOwnerFeed,
  exportOwnerPublicUpdatesZip,
  exportOwnerSiteFiles,
  exportOwnerSiteZip,
  loadStoredOwnerSession,
  mergeOwnerTimeline,
  saveStoredOwnerSession,
  signOwnerPost,
  type OwnerSession,
} from './owner-session';

describe('owner session', () => {
  it('connects a page only when the private key matches the profile public key', async () => {
    const { profile, feed, privateKeyJwk } = await createOwnerFixture();

    const session = await connectOwnerPage({ profile, feed, privateKeyJwk });

    expect(session.profile.handle).toBe('owner@example.test');
    expect(session.feed.posts).toHaveLength(1);
  });

  it('creates a new page with a valid profile, key, and signed first post', async () => {
    const session = await createOwnerPage({
      name: 'Ada Lovelace',
      handle: 'ada@example.test',
      bio: 'Building a social page.',
      firstPost: 'Hello from my page.',
    });

    expect(session.profile.name).toBe('Ada Lovelace');
    expect(session.profile.handle).toBe('ada@example.test');
    expect(session.profile.messagePublicKey?.alg).toBe('ECDH-P256');
    expect(session.profile.endpoints.messages).toBe('/opensocial/messages/inbox/index.json');
    expect(session.messagePrivateKeyJwk?.d).toBeTypeOf('string');
    expect(session.feed.posts).toHaveLength(1);
    expect(session.feed.posts[0]?.content).toBe('Hello from my page.');
    await expect(verifyPost(session.feed.posts[0]!, session.profile)).resolves.toBe(true);
  });

  it('rejects a private key that does not own the profile', async () => {
    const { profile, feed } = await createOwnerFixture();
    const wrongKeyPair = await generateIdentityKeyPair();

    await expect(
      connectOwnerPage({
        profile,
        feed,
        privateKeyJwk: await exportPrivateKeyJwk(wrongKeyPair.privateKey),
      }),
    ).rejects.toThrow('private key does not match');
  });

  it('signs a new post with the stored owner key and prepends it to the feed', async () => {
    const { profile, feed, privateKeyJwk } = await createOwnerFixture();
    const session = await connectOwnerPage({ profile, feed, privateKeyJwk });

    const updated = await signOwnerPost(session, 'Hello from my own page.', {
      createdAt: '2026-06-03T21:00:00.000Z',
      id: 'owner_post_002',
    });

    expect(updated.feed.posts.map((post) => post.id)).toEqual(['owner_post_002', 'owner_post_001']);
    expect(updated.feed.posts[0]?.content).toBe('Hello from my own page.');
    await expect(verifyPost(updated.feed.posts[0]!, profile)).resolves.toBe(true);
  });

  it('exports the updated feed as stable pretty JSON', async () => {
    const { profile, feed, privateKeyJwk } = await createOwnerFixture();
    const session = await signOwnerPost(
      await connectOwnerPage({ profile, feed, privateKeyJwk }),
      'Export me.',
      {
        createdAt: '2026-06-03T22:00:00.000Z',
        id: 'owner_post_002',
      },
    );

    expect(JSON.parse(exportOwnerFeed(session))).toEqual(session.feed);
    expect(exportOwnerFeed(session)).toContain('\n  "posts": [\n');
  });

  it('exports public site files and keeps private key out of public-only exports', async () => {
    const session = await createOwnerPage({
      name: 'Ada Lovelace',
      handle: 'ada@example.test',
      bio: 'Building a social page.',
      firstPost: 'Hello from my page.',
    });

    const publicFiles = exportOwnerSiteFiles(session, { includePrivate: false });
    const fullFiles = exportOwnerSiteFiles(session, { includePrivate: true });

    expect(Object.keys(publicFiles).sort()).toEqual([
      'public/.well-known/open-social-network.json',
      'public/feed.json',
      'public/index.html',
      'public/opensocial/actions/inbox/index.json',
      'public/opensocial/actions/index.json',
      'public/opensocial/messages/inbox/index.json',
      'public/page-social.js',
      'public/page.js',
      'public/profile.json',
      'public/styles.css',
    ]);
    expect(publicFiles['private/identity.private.jwk.json']).toBeUndefined();
    expect(JSON.parse(publicFiles['public/opensocial/actions/index.json']!)).toEqual({
      protocol: 'open-social-network',
      version: '0.1',
      actor: session.profile.handle,
      actions: [],
    });
    expect(JSON.parse(publicFiles['public/opensocial/actions/inbox/index.json']!)).toEqual({
      protocol: 'open-social-network',
      version: '0.1',
      owner: session.profile.handle,
      actions: [],
    } satisfies OpenSocialNetworkActionInbox);
    expect(JSON.parse(fullFiles['private/identity.private.jwk.json']!)).toEqual(session.privateKeyJwk);
    expect(publicFiles['private/messages.private.jwk.json']).toBeUndefined();
    expect(JSON.parse(fullFiles['private/messages.private.jwk.json']!)).toEqual(
      session.messagePrivateKeyJwk,
    );
    expect(JSON.parse(publicFiles['public/opensocial/messages/inbox/index.json']!)).toEqual({
      protocol: 'open-social-network',
      version: '0.1',
      owner: session.profile.handle,
      messages: [],
    });
    expect(publicFiles['public/page.js']).toContain(
      "import { renderPostSocialSummary, summarizePostActions } from './page-social.js';",
    );
    expect(publicFiles['public/page.js']).toContain(
      "fetchOptionalJson('./opensocial/actions/inbox/index.json'",
    );
    expect(publicFiles['public/page-social.js']).toContain('export function summarizePostActions');
    expect(publicFiles['public/page-social.js']).toContain('escapeHtml(comment.content)');
    expect(publicFiles['public/styles.css']).toContain('.post-social-summary');
    expect(publicFiles['public/index.html']).toContain('rel="icon"');
  });

  it('exports signed public actions into the portable action folder', async () => {
    const session = await createOwnerPage({
      name: 'Ada Lovelace',
      handle: 'ada@example.test',
      bio: 'Building a social page.',
      firstPost: 'Hello from my page.',
    });
    const action = await signOwnerReaction(
      session,
      {
        type: 'post',
        id: session.feed.posts[0]!.id,
        author: session.feed.posts[0]!.author,
      },
      'like',
      {
        id: 'reaction_1',
        createdAt: '2026-06-03T12:00:00.000Z',
      },
    );

    const publicFiles = exportOwnerSiteFiles(session, {
      includePrivate: false,
      actions: [action],
    });
    const actionLog = JSON.parse(
      publicFiles['public/opensocial/actions/index.json']!,
    ) as OpenSocialNetworkActionLog;

    expect(actionLog.actor).toBe(session.profile.handle);
    expect(actionLog.actions).toEqual([action]);
  });

  it('exports zip archives for the full site and public-only site', async () => {
    const session = await createOwnerPage({
      name: 'Ada Lovelace',
      handle: 'ada@example.test',
      bio: 'Building a social page.',
      firstPost: 'Hello from my page.',
    });

    const publicZip = unzipSync(exportOwnerSiteZip(session, { includePrivate: false }));
    const fullZip = unzipSync(exportOwnerSiteZip(session, { includePrivate: true }));

    expect(Object.keys(publicZip).sort()).toEqual(Object.keys(exportOwnerSiteFiles(session, { includePrivate: false })).sort());
    expect(publicZip['private/identity.private.jwk.json']).toBeUndefined();
    expect(JSON.parse(strFromU8(fullZip['private/identity.private.jwk.json']!))).toEqual(session.privateKeyJwk);
  });

  it('exports a small public updates zip with only the portable action log', async () => {
    const session = await createOwnerPage({
      name: 'Ada Lovelace',
      handle: 'ada@example.test',
      bio: 'Building a social page.',
      firstPost: 'Hello from my page.',
    });
    const action = await signOwnerReaction(
      session,
      {
        type: 'post',
        id: session.feed.posts[0]!.id,
        author: session.feed.posts[0]!.author,
      },
      'like',
      {
        id: 'reaction_1',
        createdAt: '2026-06-03T12:00:00.000Z',
      },
    );

    const updatesZip = unzipSync(exportOwnerPublicUpdatesZip(session, { actions: [action] }));

    expect(Object.keys(updatesZip).sort()).toEqual(['public/opensocial/actions/index.json']);
    expect(updatesZip['private/identity.private.jwk.json']).toBeUndefined();
    expect(updatesZip['public/feed.json']).toBeUndefined();
    expect(JSON.parse(strFromU8(updatesZip['public/opensocial/actions/index.json']!))).toEqual({
      protocol: 'open-social-network',
      version: '0.1',
      actor: session.profile.handle,
      actions: [action],
    });
  });

  it('restores a locally saved owner session', async () => {
    const storage = new MemoryStorage();
    const session = await connectOwnerPage(await createOwnerFixture());

    saveStoredOwnerSession(session, storage);

    expect(loadStoredOwnerSession(storage)).toEqual(session);

    clearStoredOwnerSession(storage);
    expect(loadStoredOwnerSession(storage)).toBeNull();
  });

  it('merges local owner posts into the verified timeline without duplicating them', async () => {
    const session = await signOwnerPost(
      await connectOwnerPage(await createOwnerFixture()),
      'Local draft is visible immediately.',
      {
        createdAt: '2026-06-03T22:00:00.000Z',
        id: 'owner_post_002',
      },
    );

    const merged = mergeOwnerTimeline(
      {
        profiles: [session.profile],
        posts: [{ ...session.feed.posts[1]!, profile: session.profile }],
        actions: [],
        rejectedPosts: [],
        rejectedActions: [],
        failures: [],
      },
      session,
    );

    expect(merged.posts.map((post) => post.id)).toEqual(['owner_post_002', 'owner_post_001']);
    expect(merged.profiles).toHaveLength(1);
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

async function createOwnerFixture(): Promise<
  OwnerSession & {
    privateKeyJwk: JsonWebKey;
  }
> {
  const keyPair = await generateIdentityKeyPair();
  const profile: OpenSocialNetworkIdentity = {
    protocol: 'open-social-network',
    version: '0.1',
    handle: 'owner@example.test',
    name: 'Owner',
    publicKey: {
      alg: 'ES256',
      jwk: await exportPublicKeyJwk(keyPair.publicKey),
    },
    endpoints: {
      profile: 'https://owner.example.test/profile.json',
      feed: 'https://owner.example.test/feed.json',
    },
  };
  const feed: OpenSocialNetworkFeed = {
    protocol: 'open-social-network',
    version: '0.1',
    author: profile.handle,
    posts: [
      await signPost(
        {
          id: 'owner_post_001',
          author: profile.handle,
          createdAt: '2026-06-03T20:00:00.000Z',
          content: 'Already published.',
        },
        keyPair.privateKey,
      ),
    ],
  };

  return {
    profile,
    feed,
    privateKeyJwk: await exportPrivateKeyJwk(keyPair.privateKey),
  };
}
