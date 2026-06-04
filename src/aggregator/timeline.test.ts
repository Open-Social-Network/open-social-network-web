import { describe, expect, it } from 'vitest';
import { loadVerifiedTimeline } from './timeline';
import { exportPublicKeyJwk, generateIdentityKeyPair } from '../protocol/keys';
import { signAction } from '../protocol/public-actions';
import { signPost } from '../protocol/signing';
import type {
  OpenSocialNetworkAction,
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

  it('loads verified public actions from profile action inboxes', async () => {
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
        actions: 'https://tommy.example.test/opensocial/actions/inbox/index.json',
      },
    };
    const tommyPost = await signPost(
      {
        id: 'post_1',
        author: tommy.handle,
        createdAt: '2026-06-03T13:00:00.000Z',
        content: 'A public post.',
      },
      tommyKeys.privateKey,
    );
    const verifiedAction = await signAction(
      {
        id: 'ada_like',
        kind: 'reaction',
        actor: ada.handle,
        createdAt: '2026-06-03T13:01:00.000Z',
        target: {
          type: 'post',
          id: tommyPost.id,
          author: tommy.handle,
        },
        reaction: 'like',
      },
      adaKeys.privateKey,
    );

    if (verifiedAction.kind !== 'reaction') {
      throw new Error('Expected a signed reaction action');
    }

    const tamperedAction: OpenSocialNetworkAction = {
      ...verifiedAction,
      reaction: 'dislike',
    };
    const unknownActorAction: OpenSocialNetworkAction = {
      ...verifiedAction,
      id: 'unknown_like',
      actor: 'unknown@example.test',
    };
    const fixtures: Record<string, unknown> = {
      'https://ada.example.test/profile.json': ada,
      'https://ada.example.test/feed.json': {
        protocol: 'open-social-network',
        version: '0.1',
        author: ada.handle,
        posts: [],
      },
      'https://tommy.example.test/profile.json': tommy,
      'https://tommy.example.test/feed.json': {
        protocol: 'open-social-network',
        version: '0.1',
        author: tommy.handle,
        posts: [tommyPost],
      },
      'https://tommy.example.test/opensocial/actions/inbox/index.json': {
        protocol: 'open-social-network',
        version: '0.1',
        owner: tommy.handle,
        actions: [verifiedAction, tamperedAction, unknownActorAction],
      },
    };

    const result = await loadVerifiedTimeline(
      ['https://ada.example.test/profile.json', 'https://tommy.example.test/profile.json'],
      async (url) => fixtures[url],
    );

    expect(result.actions).toEqual([verifiedAction]);
    expect(result.rejectedActions).toEqual([
      {
        actionId: 'ada_like',
        actor: 'ada@example.test',
        reason: 'Signature verification failed',
      },
      {
        actionId: 'unknown_like',
        actor: 'unknown@example.test',
        reason: 'Actor profile is not loaded',
      },
    ]);
    expect(result.failures).toEqual([]);
  });
});
