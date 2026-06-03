import { describe, expect, it } from 'vitest';
import { exportPublicKeyJwk, generateIdentityKeyPair } from './keys';
import {
  summarizePostActions,
  signAction,
  verifyAction,
} from './public-actions';
import type {
  OpenSocialNetworkIdentity,
  UnsignedOpenSocialNetworkAction,
} from './types';

describe('signed public actions', () => {
  it('verifies a signed like action and rejects tampering', async () => {
    const { identity, privateKey } = await createIdentity('ada@example.test', 'Ada');
    const action: UnsignedOpenSocialNetworkAction = {
      id: 'action_1',
      kind: 'reaction',
      actor: identity.handle,
      createdAt: '2026-06-03T12:00:00.000Z',
      target: {
        type: 'post',
        id: 'post_1',
        author: 'tommy@example.test',
      },
      reaction: 'like',
    };

    const signedAction = await signAction(action, privateKey);

    if (signedAction.kind !== 'reaction') {
      throw new Error('Expected a signed reaction action');
    }

    await expect(verifyAction(signedAction, identity)).resolves.toBe(true);
    await expect(
      verifyAction({ ...signedAction, reaction: 'dislike' }, identity),
    ).resolves.toBe(false);
  });

  it('summarizes the latest reaction per actor and keeps comments', async () => {
    const ada = await createIdentity('ada@example.test', 'Ada');
    const target = {
      type: 'post' as const,
      id: 'post_1',
      author: 'tommy@example.test',
    };
    const actions = [
      await signAction(
        {
          id: 'action_like',
          kind: 'reaction',
          actor: ada.identity.handle,
          createdAt: '2026-06-03T12:00:00.000Z',
          target,
          reaction: 'like',
        },
        ada.privateKey,
      ),
      await signAction(
        {
          id: 'action_none',
          kind: 'reaction',
          actor: ada.identity.handle,
          createdAt: '2026-06-03T12:01:00.000Z',
          target,
          reaction: 'none',
        },
        ada.privateKey,
      ),
      await signAction(
        {
          id: 'action_comment',
          kind: 'comment',
          actor: ada.identity.handle,
          createdAt: '2026-06-03T12:02:00.000Z',
          target,
          content: 'A signed public comment.',
        },
        ada.privateKey,
      ),
    ];

    expect(summarizePostActions(actions, target)).toMatchObject({
      likes: 0,
      dislikes: 0,
      comments: [
        {
          id: 'action_comment',
          actor: 'ada@example.test',
          content: 'A signed public comment.',
        },
      ],
    });
  });
});

async function createIdentity(
  handle: string,
  name: string,
): Promise<{ identity: OpenSocialNetworkIdentity; privateKey: CryptoKey }> {
  const keyPair = await generateIdentityKeyPair();

  return {
    identity: {
      protocol: 'open-social-network',
      version: '0.1',
      handle,
      name,
      publicKey: {
        alg: 'ES256',
        jwk: await exportPublicKeyJwk(keyPair.publicKey),
      },
      endpoints: {
        profile: `https://${handle}/profile.json`,
        feed: `https://${handle}/feed.json`,
      },
    },
    privateKey: keyPair.privateKey,
  };
}
