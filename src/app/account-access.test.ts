import { describe, expect, it } from 'vitest';

import { accountAccessCopy } from './account-access';

describe('account access copy', () => {
  it('presents page access with simple user-facing language', () => {
    expect(accountAccessCopy.disconnected.status).toBe('Not logged in');
    expect(accountAccessCopy.disconnected.openExistingTitle).toBe('Already have a page?');
    expect(accountAccessCopy.disconnected.openExistingLabel).toBe('Open my page folder');
    expect(accountAccessCopy.disconnected.openExistingHelp).toBe(
      'Choose the folder for your Open Social Network page. Nothing is uploaded.',
    );
    expect(accountAccessCopy.disconnected.openExistingSteps).toEqual([
      'Click Open my page folder.',
      'Choose the whole page folder.',
      'You will be logged in only in this browser.',
    ]);
    expect(accountAccessCopy.disconnected.openExistingPrivateHelp).toBe(
      'Private files prove the page is yours. They stay on your device.',
    );
    expect(accountAccessCopy.disconnected.technicalSummary).toBe('Technical details');
  });

  it('makes logout obvious and explains that it is local only', () => {
    expect(accountAccessCopy.connected.status).toBe('Logged in');
    expect(accountAccessCopy.connected.logoutTitle).toBe('Log out anytime');
    expect(accountAccessCopy.connected.logoutLabel).toBe('Log out');
    expect(accountAccessCopy.connected.logoutHelp).toBe(
      'This only logs out of this browser. Your public page stays online.',
    );
    expect(accountAccessCopy.connected.logoutReturnHelp).toBe(
      'To come back, choose Open my page and select the same folder.',
    );
  });
});
