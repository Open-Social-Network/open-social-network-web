import { describe, expect, it } from 'vitest';

import type { OpenSocialNetworkIdentity } from '../protocol/types';
import { messageAccessState } from './message-access';

function profile(input: Partial<OpenSocialNetworkIdentity> = {}): OpenSocialNetworkIdentity {
  return {
    protocol: 'open-social-network',
    version: '0.1',
    handle: 'ada@example.test',
    name: 'Ada',
    publicKey: {
      alg: 'ES256',
      jwk: {},
    },
    endpoints: {
      profile: 'https://ada.example.test/profile.json',
      feed: 'https://ada.example.test/feed.json',
    },
    ...input,
  };
}

describe('message access state', () => {
  it('keeps unsupported message buttons clickable and explains the limitation', () => {
    expect(messageAccessState(profile(), 'owner@example.test')).toEqual({
      canSend: false,
      buttonDisabled: false,
      buttonTitle: 'Messages are not turned on for this page yet',
      notice: 'Ada has not turned on messages yet.',
    });
  });

  it('allows messages to profiles that advertise encrypted message support', () => {
    expect(
      messageAccessState(
        profile({
          messagePublicKey: {
            alg: 'ECDH-P256',
            jwk: {},
          },
          endpoints: {
            profile: 'https://ada.example.test/profile.json',
            feed: 'https://ada.example.test/feed.json',
            messages: '/opensocial/messages/inbox/index.json',
          },
        }),
        'owner@example.test',
      ),
    ).toEqual({
      canSend: true,
      buttonDisabled: false,
      buttonTitle: 'Message Ada',
      notice: null,
    });
  });
});
