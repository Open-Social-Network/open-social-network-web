import { describe, expect, it } from 'vitest';
import { commentAuthorDisplay, commentAuthorPageLink } from './comment-display';
import type { OpenSocialNetworkIdentity } from '../protocol/types';

describe('comment display', () => {
  it('uses the loaded profile name for known comment authors', () => {
    expect(commentAuthorDisplay('ada@example.test', [profile('ada@example.test', 'Ada Lovelace')])).toEqual({
      name: 'Ada Lovelace',
      handle: 'ada@example.test',
      profile: profile('ada@example.test', 'Ada Lovelace'),
    });
  });

  it('falls back to the handle when the comment author profile is not loaded', () => {
    expect(commentAuthorDisplay('unknown@example.test', [])).toEqual({
      name: 'unknown@example.test',
      handle: null,
      profile: null,
    });
  });

  it('links known comment authors to their human profile page', () => {
    expect(
      commentAuthorPageLink(
        commentAuthorDisplay('ada@example.test', [profile('ada@example.test', 'Ada Lovelace')]),
        'http://127.0.0.1:5173/',
      ),
    ).toEqual({
      href: 'https://ada@example.test/',
      ariaLabel: 'View Ada Lovelace page',
    });
  });

  it('does not link unknown comment authors', () => {
    expect(
      commentAuthorPageLink(
        commentAuthorDisplay('unknown@example.test', []),
        'http://127.0.0.1:5173/',
      ),
    ).toBeNull();
  });
});

function profile(handle: string, name: string): OpenSocialNetworkIdentity {
  return {
    protocol: 'open-social-network',
    version: '0.1',
    handle,
    name,
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
      profile: `https://${handle}/profile.json`,
      feed: `https://${handle}/feed.json`,
    },
  };
}
