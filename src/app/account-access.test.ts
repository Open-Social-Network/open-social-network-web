import { describe, expect, it } from 'vitest';

import { accountAccessCopy } from './account-access';

describe('account access copy', () => {
  it('presents page access with simple user-facing language', () => {
    expect(accountAccessCopy.disconnected.status).toBe('Create');
    expect(accountAccessCopy.disconnected.openExistingTitle).toBe('Open your page');
    expect(accountAccessCopy.disconnected.openExistingLabel).toBe('Open my page');
    expect(accountAccessCopy.disconnected.openExistingHelp).toBe(
      'Choose your Open Social Network page folder. Nothing is uploaded.',
    );
    expect(accountAccessCopy.disconnected.openExistingSteps).toEqual([
      'Click Open my page.',
      'Choose the whole folder that contains your page.',
      'You will be logged in only in this browser.',
    ]);
    expect(accountAccessCopy.disconnected.openExistingPrivateHelp).toBe(
      'The folder includes private files that prove the page is yours. They stay on your device.',
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
