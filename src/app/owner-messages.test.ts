import { describe, expect, it, vi } from 'vitest';
import { importMessagePrivateKeyJwk } from '../protocol/keys';
import { decryptDirectMessage, verifyDirectMessage } from '../protocol/direct-messages';
import { createOwnerPage } from './owner-session';
import { createOwnerDirectMessage, deliverDirectMessage } from './owner-messages';

describe('owner direct messages', () => {
  it('creates an encrypted signed message for a recipient inbox', async () => {
    const sender = await createOwnerPage({
      name: 'Sender',
      handle: 'sender@example.test',
      bio: '',
      firstPost: 'Sender page',
    });
    const recipient = await createOwnerPage({
      name: 'Recipient',
      handle: 'recipient@example.test',
      bio: '',
      firstPost: 'Recipient page',
    });

    const prepared = await createOwnerDirectMessage(
      sender,
      recipient.profile,
      'This should stay private.',
      {
        id: 'message_1',
        createdAt: '2026-06-04T12:00:00.000Z',
        profileBaseUrl: 'https://recipient.example.test/profile.json',
      },
    );

    expect(prepared.inboxUrl).toBe('https://recipient.example.test/opensocial/messages/inbox/index.json');
    expect(prepared.message.sender).toBe('sender@example.test');
    expect(prepared.message.recipient).toBe('recipient@example.test');
    expect(prepared.message.encryption.ciphertext).not.toContain('This should stay private.');
    await expect(verifyDirectMessage(prepared.message, sender.profile)).resolves.toBe(true);

    const recipientPrivateKey = await importMessagePrivateKeyJwk(recipient.messagePrivateKeyJwk!);

    await expect(
      decryptDirectMessage(prepared.message, recipientPrivateKey, sender.profile),
    ).resolves.toBe('This should stay private.');
  });

  it('rejects recipients that do not advertise message support', async () => {
    const sender = await createOwnerPage({
      name: 'Sender',
      handle: 'sender@example.test',
      bio: '',
      firstPost: 'Sender page',
    });
    const recipient = await createOwnerPage({
      name: 'Recipient',
      handle: 'recipient@example.test',
      bio: '',
      firstPost: 'Recipient page',
    });
    const { messagePublicKey: _messagePublicKey, ...recipientWithoutMessages } = recipient.profile;

    await expect(
      createOwnerDirectMessage(sender, recipientWithoutMessages, 'Hello'),
    ).rejects.toThrow('This profile cannot receive encrypted messages yet');
  });

  it('posts encrypted envelopes to compatible inbox endpoints without plaintext', async () => {
    const sender = await createOwnerPage({
      name: 'Sender',
      handle: 'sender@example.test',
      bio: '',
      firstPost: 'Sender page',
    });
    const recipient = await createOwnerPage({
      name: 'Recipient',
      handle: 'recipient@example.test',
      bio: '',
      firstPost: 'Recipient page',
    });
    const prepared = await createOwnerDirectMessage(sender, recipient.profile, 'Hidden text', {
      id: 'message_1',
      createdAt: '2026-06-04T12:00:00.000Z',
      profileBaseUrl: 'https://recipient.example.test/profile.json',
    });
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, { status: 202 }),
    );

    await expect(deliverDirectMessage(prepared, { fetcher })).resolves.toEqual({
      status: 'sent',
      inboxUrl: prepared.inboxUrl,
    });

    expect(fetcher).toHaveBeenCalledWith(
      prepared.inboxUrl,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    const [, requestInit] = fetcher.mock.calls[0] as [RequestInfo | URL, RequestInit];

    expect(JSON.stringify(requestInit.body)).not.toContain('Hidden text');
  });

  it('does not treat a generic static 200 response as delivered', async () => {
    const sender = await createOwnerPage({
      name: 'Sender',
      handle: 'sender@example.test',
      bio: '',
      firstPost: 'Sender page',
    });
    const recipient = await createOwnerPage({
      name: 'Recipient',
      handle: 'recipient@example.test',
      bio: '',
      firstPost: 'Recipient page',
    });
    const prepared = await createOwnerDirectMessage(sender, recipient.profile, 'Hidden text', {
      id: 'message_1',
      createdAt: '2026-06-04T12:00:00.000Z',
      profileBaseUrl: 'https://recipient.example.test/profile.json',
    });
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response('{}', { status: 200 }),
    );

    await expect(deliverDirectMessage(prepared, { fetcher })).resolves.toMatchObject({
      status: 'prepared',
      inboxUrl: prepared.inboxUrl,
    });
  });
});
