import { describe, expect, it } from 'vitest';
import { renderProfileFollowAction, renderProfileMessageAction } from './profile-card';
import type { OpenSocialNetworkIdentity } from '../protocol/types';

const profile: OpenSocialNetworkIdentity = {
  protocol: 'open-social-network',
  version: '0.1',
  name: 'Ada Lovelace',
  handle: 'ada@example.test',
  bio: 'Computing pioneer',
  publicKey: {
    alg: 'ES256',
    jwk: {
      kty: 'EC',
      crv: 'P-256',
      x: 'x',
      y: 'y',
    },
  },
  messagePublicKey: {
    alg: 'ECDH-P256',
    jwk: {
      kty: 'EC',
      crv: 'P-256',
      x: 'mx',
      y: 'my',
    },
  },
  endpoints: {
    profile: '/profile.json',
    feed: '/feed.json',
    messages: '/opensocial/messages/inbox/',
  },
};

describe('renderProfileMessageAction', () => {
  it('renders a familiar profile message button', () => {
    const html = renderProfileMessageAction({
      profile,
      ownerHandle: 'grace@example.test',
      messageTargetKey: 'profile-message-key',
      iconHtml: '<svg aria-hidden="true"></svg>',
    });

    expect(html).toContain('class="icon-button profile-message-button"');
    expect(html).toContain('data-action="toggle-message"');
    expect(html).toContain('data-message-target-key="profile-message-key"');
    expect(html).toContain('aria-label="Message Ada Lovelace"');
    expect(html).toContain('title="Message Ada Lovelace"');
    expect(html).toContain('<svg aria-hidden="true"></svg>');
  });

  it('uses simple signed-out guidance when no page is open', () => {
    const html = renderProfileMessageAction({
      profile,
      ownerHandle: undefined,
      messageTargetKey: 'profile-message-key',
      iconHtml: '<svg aria-hidden="true"></svg>',
    });

    expect(html).toContain('aria-label="Message Ada Lovelace"');
    expect(html).toContain('title="Create or open your page to send messages."');
    expect(html).not.toContain('disabled');
  });
});

describe('renderProfileFollowAction', () => {
  it('renders a familiar follow icon button', () => {
    const html = renderProfileFollowAction({
      name: 'Ada Lovelace',
      profileUrl: 'https://ada.example.test/profile.json',
      followed: false,
      iconHtml: '<svg aria-hidden="true"></svg>',
    });

    expect(html).toContain('class="icon-button profile-follow-button"');
    expect(html).toContain('data-profile-url="https://ada.example.test/profile.json"');
    expect(html).toContain('aria-label="Follow Ada Lovelace"');
    expect(html).toContain('title="Follow"');
    expect(html).toContain('<svg aria-hidden="true"></svg>');
    expect(html).not.toContain('>Off<');
  });

  it('renders a familiar active unfollow icon button', () => {
    const html = renderProfileFollowAction({
      name: 'Ada Lovelace',
      profileUrl: 'https://ada.example.test/profile.json',
      followed: true,
      iconHtml: '<svg aria-hidden="true"></svg>',
    });

    expect(html).toContain('class="icon-button profile-follow-button icon-button-active"');
    expect(html).toContain('aria-label="Unfollow Ada Lovelace"');
    expect(html).toContain('title="Unfollow"');
    expect(html).not.toContain('>On<');
  });
});
