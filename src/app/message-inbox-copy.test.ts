import { describe, expect, it } from 'vitest';
import { messageInboxCopy } from './message-inbox-copy';

describe('message inbox copy', () => {
  it('uses simple message language before technical details', () => {
    expect(messageInboxCopy.help).toBe(
      'Messages sent to this page appear here. Open message files to read them privately.',
    );
    expect(messageInboxCopy.openLabel).toBe('Open messages');
    expect(messageInboxCopy.empty).toBe(
      'No messages yet. When someone sends you a message file, open it here.',
    );
    expect(messageInboxCopy.invalidFile).toBe('Choose a message file to read it.');
  });
});
