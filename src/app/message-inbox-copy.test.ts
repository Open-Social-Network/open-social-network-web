import { describe, expect, it } from 'vitest';
import { messageInboxCopy } from './message-inbox-copy';

describe('message inbox copy', () => {
  it('uses simple message language before technical details', () => {
    expect(messageInboxCopy.help).toBe(
      'Open an encrypted message file someone sent you. It is read only in this browser.',
    );
    expect(messageInboxCopy.openLabel).toBe('Open message');
    expect(messageInboxCopy.empty).toBe(
      'No messages yet. When someone sends you an encrypted message file, open it here.',
    );
    expect(messageInboxCopy.invalidFile).toBe('Open an encrypted message file to read it.');
  });
});
