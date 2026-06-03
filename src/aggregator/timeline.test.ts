import { describe, expect, it } from 'vitest';
import { loadVerifiedTimeline } from './timeline';
import { exportPublicKeyJwk, generateIdentityKeyPair } from '../protocol/keys';
import { signPost } from '../protocol/signing';
import type {
  OpenSocialNetworkFeed,
  OpenSocialNetworkIdentity,
  UnsignedOpenSocialNetworkPost,
} from '../protocol/types';

describe('loadVerifiedTimeline', () => {
  it('loads followed profiles, keeps verified posts, and sorts newest first', async () => {
    const adaKeys = await generateIdentityKeyPair();
    const tommyKeys = await generateIdentityKeyPair();
    const ada: OpenSocialNetworkIdentity = {
      protocol: 'open-social-network',
      version: '0.1',
      handle: 'ada@example.test',
      name: 'Ada',
      publicKey: { alg: 'ES256', jwk: await exportPublicKeyJwk(adaKeys.publicKey) },
      endpoints: {
        profile: 'https://ada.example.test/profile.json',
        feed: 'https://ada.example.test/feed.json',
      },
    };
    const tommy: OpenSocialNetworkIdentity = {
      protocol: 'open-social-network',
      version: '0.1',
      handle: 'tommy@example.test',
      name: 'Tommy',
      publicKey: { alg: 'ES256', jwk: await exportPublicKeyJwk(tommyKeys.publicKey) },
      endpoints: {
        profile: 'https://tommy.example.test/profile.json',
        feed: 'https://tommy.example.test/feed.json',
      },
    };
    const olderPost: UnsignedOpenSocialNetworkPost = {
      id: 'older',
      author: ada.handle,
      createdAt: '2026-06-03T11:00:00.000Z',
      content: 'Older but valid',
    };
    const newestPost = await signPost(
      {
        id: 'newest',
        author: tommy.handle,
        createdAt: '2026-06-03T13:00:00.000Z',
        content: 'Newest valid post',
      },
      tommyKeys.privateKey,
    );
    const tamperedPost = {
      ...(await signPost(olderPost, adaKeys.privateKey)),
      content: 'Tampered later',
    };
    const adaFeed: OpenSocialNetworkFeed = {
      protocol: 'open-social-network',
      version: '0.1',
      author: ada.handle,
      posts: [await signPost(olderPost, adaKeys.privateKey), tamperedPost],
    };
    const tommyFeed: OpenSocialNetworkFeed = {
      protocol: 'open-social-network',
      version: '0.1',
      author: tommy.handle,
      posts: [newestPost],
    };
    const fixtures: Record<string, unknown> = {
      'https://ada.example.test/profile.json': ada,
      'https://ada.example.test/feed.json': adaFeed,
      'https://tommy.example.test/profile.json': tommy,
      'https://tommy.example.test/feed.json': tommyFeed,
    };

    const result = await loadVerifiedTimeline(
      ['https://ada.example.test/profile.json', 'https://tommy.example.test/profile.json'],
      async (url) => fixtures[url],
    );

    expect(result.posts.map((post) => post.id)).toEqual(['newest', 'older']);
    expect(result.profiles.map((profile) => profile.handle)).toEqual([
      'ada@example.test',
      'tommy@example.test',
    ]);
    expect(result.rejectedPosts).toEqual([
      {
        postId: 'older',
        author: 'ada@example.test',
        reason: 'Signature verification failed',
      },
    ]);
    expect(result.failures).toEqual([]);
  });
});
