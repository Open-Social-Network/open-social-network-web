import { describe, expect, it } from 'vitest';

import { accountAccessCopy } from './account-access';

describe('account access copy', () => {
  it('presents page access with simple user-facing language', () => {
    expect(accountAccessCopy.disconnected.status).toBe('Create');
    expect(accountAccessCopy.disconnected.openExistingLabel).toBe('Open my page folder');
    expect(accountAccessCopy.disconnected.openExistingHelp).toBe(
      'Choose the folder created by Open Social Network. Nothing is uploaded.',
    );
    expect(accountAccessCopy.disconnected.technicalSummary).toBe('Technical details');
  });

  it('makes logout obvious and explains that it is local only', () => {
    expect(accountAccessCopy.connected.status).toBe('Logged in');
    expect(accountAccessCopy.connected.logoutTitle).toBe('Finished here?');
    expect(accountAccessCopy.connected.logoutLabel).toBe('Log out');
    expect(accountAccessCopy.connected.logoutHelp).toBe(
      'Log out only disconnects this browser. Your public page stays online.',
    );
    expect(accountAccessCopy.connected.logoutReturnHelp).toBe(
      'You can open the same page folder again whenever you want.',
    );
  });
});
