import { describe, expect, it } from 'vitest';
import { messageInboxCopy } from './message-inbox-copy';

describe('message inbox copy', () => {
  it('uses simple message language before technical details', () => {
    expect(messageInboxCopy.help).toBe(
      'Open message files sent to this page. They stay private in this browser.',
    );
    expect(messageInboxCopy.openLabel).toBe('Open message file');
    expect(messageInboxCopy.empty).toBe('No messages opened yet.');
    expect(messageInboxCopy.invalidFile).toBe('Choose a message file');
  });
});
