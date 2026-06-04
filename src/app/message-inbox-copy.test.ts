import { describe, expect, it } from 'vitest';
import { messageInboxCopy } from './message-inbox-copy';

describe('message inbox copy', () => {
  it('uses simple message language before technical details', () => {
    expect(messageInboxCopy.help).toBe('Messages stay private and open only in this browser.');
    expect(messageInboxCopy.openLabel).toBe('Import message');
    expect(messageInboxCopy.empty).toBe('No messages yet.');
    expect(messageInboxCopy.invalidFile).toBe('Choose a message file to open.');
    expect(`${messageInboxCopy.help} ${messageInboxCopy.empty}`).not.toMatch(/encrypted message file/i);
  });
});
