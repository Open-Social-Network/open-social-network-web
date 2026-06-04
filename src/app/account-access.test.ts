import { describe, expect, it } from 'vitest';

import { accountAccessCopy } from './account-access';

describe('account access copy', () => {
  it('presents page access with simple user-facing language', () => {
    expect(accountAccessCopy.disconnected.status).toBe('Not logged in');
    expect(accountAccessCopy.disconnected.openExistingTitle).toBe('Already have a page?');
    expect(accountAccessCopy.disconnected.openExistingLabel).toBe('Open my page folder');
    expect(accountAccessCopy.disconnected.openExistingHelp).toBe(
      'Choose the page folder you saved earlier. It opens only in this browser, and nothing is uploaded.',
    );
    expect(accountAccessCopy.disconnected.openExistingSteps).toEqual([
      'Click Open my page folder.',
      'Choose your saved page folder.',
      'You are logged in only in this browser.',
    ]);
    expect(accountAccessCopy.disconnected.openExistingPrivateHelp).toBe(
      'Your owner file proves the page is yours. Keep it backed up and never share it.',
    );
    expect(accountAccessCopy.disconnected.technicalSummary).toBe('Technical details');
  });

  it('makes logout obvious and explains that it is local only', () => {
    expect(accountAccessCopy.connected.status).toBe('Logged in');
    expect(accountAccessCopy.connected.logoutTitle).toBe('Log out from this browser');
    expect(accountAccessCopy.connected.logoutLabel).toBe('Log out');
    expect(accountAccessCopy.connected.logoutHelp).toBe(
      'This only disconnects this browser. Your public page stays online.',
    );
    expect(accountAccessCopy.connected.logoutReturnHelp).toBe(
      'To sign in again, choose Open my page folder and select the same folder.',
    );
    expect(accountAccessCopy.connected.logoutSuccess).toBe(
      'Logged out from this browser. Your public page is still online.',
    );
  });
});
