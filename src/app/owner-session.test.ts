import { describe, expect, it } from 'vitest';
import { exportPrivateKeyJwk, exportPublicKeyJwk, generateIdentityKeyPair } from '../protocol/keys';
import { signPost, verifyPost } from '../protocol/signing';
import type { OpenSocialNetworkFeed, OpenSocialNetworkIdentity } from '../protocol/types';
import {
  connectOwnerPage,
  clearStoredOwnerSession,
  exportOwnerFeed,
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
        rejectedPosts: [],
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
