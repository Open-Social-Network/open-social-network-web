import { describe, expect, it } from 'vitest';

import { profilePageAction } from './profile-actions';

describe('profile page action', () => {
  it('keeps profile opening icon-only while preserving accessible text', () => {
    expect(profilePageAction('Ada Lovelace')).toEqual({
      title: 'View page',
      ariaLabel: 'View Ada Lovelace page',
    });
  });
});
