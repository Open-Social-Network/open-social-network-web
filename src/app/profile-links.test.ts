import { describe, expect, it } from 'vitest';
import { profileAvatarUrl, profilePageUrl } from './profile-links';
import type { OpenSocialNetworkIdentity } from '../protocol/types';

const baseProfile: OpenSocialNetworkIdentity = {
  protocol: 'open-social-network',
  version: '0.1',
  handle: 'ada@example.test',
  name: 'Ada',
  publicKey: {
    alg: 'ES256',
    jwk: {
      kty: 'EC',
      crv: 'P-256',
      x: 'x',
      y: 'y',
    },
  },
  endpoints: {
    profile: 'https://ada.example.test/profile.json',
    feed: 'https://ada.example.test/feed.json',
  },
};

describe('profile links', () => {
  it('opens the human page next to profile.json', () => {
    expect(profilePageUrl(baseProfile, 'http://127.0.0.1:5173/')).toBe(
      'https://ada.example.test/',
    );
  });

  it('opens local example pages through their static index file', () => {
    expect(
      profilePageUrl(
        {
          ...baseProfile,
          endpoints: {
            ...baseProfile.endpoints,
            profile: '/profiles/ada/profile.json',
          },
        },
        'http://127.0.0.1:5173/profiles/ada/profile.json',
      ),
    ).toBe('http://127.0.0.1:5173/profiles/ada/index.html');
  });

  it('falls back to website when the profile endpoint is not a profile.json file', () => {
    expect(
      profilePageUrl(
        {
          ...baseProfile,
          website: 'https://ada.example.test/site',
          endpoints: {
            ...baseProfile.endpoints,
            profile: 'https://api.example.test/ada',
          },
        },
        'http://127.0.0.1:5173/',
      ),
    ).toBe('https://ada.example.test/site');
  });

  it('resolves avatar URLs from profile and endpoint fields', () => {
    expect(
      profileAvatarUrl(
        {
          ...baseProfile,
          avatar: './assets/avatar.png',
        },
        'https://ada.example.test/profile.json',
      ),
    ).toBe('https://ada.example.test/assets/avatar.png');

    expect(
      profileAvatarUrl(
        {
          ...baseProfile,
          endpoints: {
            ...baseProfile.endpoints,
            profile: '/profiles/ada/profile.json',
            avatar: '/profiles/ada/avatar.svg',
          },
        },
        'http://127.0.0.1:5173/profiles/ada/profile.json',
      ),
    ).toBe('http://127.0.0.1:5173/profiles/ada/avatar.svg');
  });
});
