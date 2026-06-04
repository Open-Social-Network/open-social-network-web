import { describe, expect, it, vi } from 'vitest';

import { createOwnerPage } from './owner-session';
import { signOwnerReaction } from './owner-actions';
import {
  deliverOwnerAction,
  needsManualActionPublish,
  prepareOwnerActionDelivery,
} from './owner-action-delivery';

describe('owner public action delivery', () => {
  it('posts signed public actions to compatible action inbox endpoints', async () => {
    const owner = await createOwnerPage({
      name: 'Owner',
      handle: 'owner@example.test',
      bio: '',
      firstPost: 'Owner page',
    });
    const recipient = await createOwnerPage({
      name: 'Recipient',
      handle: 'recipient@example.test',
      bio: '',
      firstPost: 'Recipient page',
    });
    const target = {
      type: 'post' as const,
      id: recipient.feed.posts[0]!.id,
      author: recipient.profile.handle,
      url: 'https://recipient.example.test/',
    };
    const action = await signOwnerReaction(owner, target, 'like', {
      id: 'reaction_1',
      createdAt: '2026-06-04T12:00:00.000Z',
    });
    const prepared = prepareOwnerActionDelivery(action, recipient.profile, {
      profileBaseUrl: 'https://recipient.example.test/profile.json',
    });
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, { status: 202 }),
    );

    await expect(deliverOwnerAction(prepared, { fetcher })).resolves.toEqual({
      status: 'sent',
      inboxUrl: 'https://recipient.example.test/opensocial/actions/inbox/index.json',
    });

    expect(fetcher).toHaveBeenCalledWith(
      'https://recipient.example.test/opensocial/actions/inbox/index.json',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(action),
      }),
    );
  });

  it('keeps public actions prepared when a profile has no action inbox', async () => {
    const owner = await createOwnerPage({
      name: 'Owner',
      handle: 'owner@example.test',
      bio: '',
      firstPost: 'Owner page',
    });
    const recipient = await createOwnerPage({
      name: 'Recipient',
      handle: 'recipient@example.test',
      bio: '',
      firstPost: 'Recipient page',
    });
    const action = await signOwnerReaction(
      owner,
      {
        type: 'post',
        id: recipient.feed.posts[0]!.id,
        author: recipient.profile.handle,
      },
      'like',
      {
        id: 'reaction_1',
        createdAt: '2026-06-04T12:00:00.000Z',
      },
    );
    const recipientWithoutInbox = {
      ...recipient.profile,
      endpoints: {
        ...recipient.profile.endpoints,
        actions: undefined,
      },
    };

    expect(() => prepareOwnerActionDelivery(action, recipientWithoutInbox)).toThrow(
      'This profile does not accept automatic public actions yet',
    );
  });

  it('requires manual publish only when automatic delivery is not accepted', () => {
    expect(
      needsManualActionPublish({
        status: 'sent',
        inboxUrl: 'https://recipient.example.test/opensocial/actions/inbox/index.json',
      }),
    ).toBe(false);

    expect(
      needsManualActionPublish({
        status: 'prepared',
        inboxUrl: 'https://recipient.example.test/opensocial/actions/inbox/index.json',
        reason: 'Action inbox returned HTTP 405',
      }),
    ).toBe(true);
  });
});
