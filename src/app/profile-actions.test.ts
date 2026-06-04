import { describe, expect, it } from 'vitest';

import { profilePageAction } from './profile-actions';

describe('profile page action', () => {
  it('uses familiar copy for opening a profile page', () => {
    expect(profilePageAction('Ada Lovelace')).toEqual({
      label: 'View page',
      ariaLabel: 'View Ada Lovelace page',
    });
  });
});
