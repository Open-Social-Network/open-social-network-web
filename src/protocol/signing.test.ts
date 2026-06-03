import { describe, expect, it } from 'vitest';
import { exportPublicKeyJwk, generateIdentityKeyPair } from './keys';
import { signPost, verifyPost } from './signing';
import type { OpenSocialNetworkIdentity, UnsignedOpenSocialNetworkPost } from './types';

describe('signed posts', () => {
  it('verifies a post signed by the profile public key', async () => {
    const keyPair = await generateIdentityKeyPair();
    const profile: OpenSocialNetworkIdentity = {
      protocol: 'open-social-network',
      version: '0.1',
      handle: 'ada@example.test',
      name: 'Ada',
      publicKey: {
        alg: 'ES256',
        jwk: await exportPublicKeyJwk(keyPair.publicKey),
      },
      endpoints: {
        profile: 'https://example.test/profile.json',
        feed: 'https://example.test/feed.json',
      },
    };
    const post: UnsignedOpenSocialNetworkPost = {
      id: 'post_1',
      author: 'ada@example.test',
      createdAt: '2026-06-03T12:00:00.000Z',
      content: 'A sovereign page can publish a signed feed.',
    };

    const signedPost = await signPost(post, keyPair.privateKey);

    await expect(verifyPost(signedPost, profile)).resolves.toBe(true);
  });

  it('rejects content tampering after signing', async () => {
    const keyPair = await generateIdentityKeyPair();
    const profile: OpenSocialNetworkIdentity = {
      protocol: 'open-social-network',
      version: '0.1',
      handle: 'ada@example.test',
      name: 'Ada',
      publicKey: {
        alg: 'ES256',
        jwk: await exportPublicKeyJwk(keyPair.publicKey),
      },
      endpoints: {
        profile: 'https://example.test/profile.json',
        feed: 'https://example.test/feed.json',
      },
    };
    const signedPost = await signPost(
      {
        id: 'post_1',
        author: 'ada@example.test',
        createdAt: '2026-06-03T12:00:00.000Z',
        content: 'Original content',
      },
      keyPair.privateKey,
    );

    await expect(
      verifyPost({ ...signedPost, content: 'Edited by somebody else' }, profile),
    ).resolves.toBe(false);
  });

  it('rejects a post whose author does not match the identity file', async () => {
    const keyPair = await generateIdentityKeyPair();
    const profile: OpenSocialNetworkIdentity = {
      protocol: 'open-social-network',
      version: '0.1',
      handle: 'ada@example.test',
      name: 'Ada',
      publicKey: {
        alg: 'ES256',
        jwk: await exportPublicKeyJwk(keyPair.publicKey),
      },
      endpoints: {
        profile: 'https://example.test/profile.json',
        feed: 'https://example.test/feed.json',
      },
    };
    const signedPost = await signPost(
      {
        id: 'post_1',
        author: 'mallory@example.test',
        createdAt: '2026-06-03T12:00:00.000Z',
        content: 'Wrong identity',
      },
      keyPair.privateKey,
    );

    await expect(verifyPost(signedPost, profile)).resolves.toBe(false);
  });
});
