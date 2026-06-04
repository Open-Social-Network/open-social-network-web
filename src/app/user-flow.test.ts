import { describe, expect, it, vi } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { verifyAction, summarizePostActions } from '../protocol/public-actions';
import { verifyPost } from '../protocol/signing';
import type { OpenSocialNetworkActionLog } from '../protocol/types';
import { signOwnerComment, signOwnerReaction } from './owner-actions';
import { createOwnerDirectMessage, deliverDirectMessage, readOwnerDirectMessage } from './owner-messages';
import {
  connectOwnerPage,
  createOwnerPage,
  exportOwnerSiteFiles,
  exportOwnerSiteZip,
  signOwnerPost,
} from './owner-session';

describe('common user flow', () => {
  it('creates, opens, posts, reacts, comments, messages, and exports a page safely', async () => {
    const alice = await createOwnerPage({
      name: 'Alice Creator',
      handle: 'alice@example.test',
      bio: 'Building on the open social web.',
      firstPost: 'My first Open Social Network post.',
    });
    const bob = await createOwnerPage({
      name: 'Bob Reader',
      handle: 'bob@example.test',
      bio: 'Reading sovereign pages.',
      firstPost: 'Hello from Bob.',
    });
    const exportedFolder = exportOwnerSiteFiles(alice, {
      includePrivate: true,
      actions: [],
    });
    const reopenedAlice = await connectOwnerPage({
      profile: JSON.parse(exportedFolder['public/profile.json']!),
      feed: JSON.parse(exportedFolder['public/feed.json']!),
      privateKeyJwk: JSON.parse(exportedFolder['private/identity.private.jwk.json']!),
      messagePrivateKeyJwk: JSON.parse(exportedFolder['private/messages.private.jwk.json']!),
      pageUrl: 'https://alice.example.test/',
    });

    const postedAlice = await signOwnerPost(reopenedAlice, 'A new post from my page.', {
      id: 'alice_post_002',
      createdAt: '2026-06-04T12:00:00.000Z',
    });

    expect(postedAlice.feed.posts[0]?.content).toBe('A new post from my page.');
    await expect(verifyPost(postedAlice.feed.posts[0]!, postedAlice.profile)).resolves.toBe(true);

    const target = {
      type: 'post' as const,
      id: bob.feed.posts[0]!.id,
      author: bob.profile.handle,
      url: 'https://bob.example.test/',
    };
    const like = await signOwnerReaction(postedAlice, target, 'like', {
      id: 'alice_like_bob',
      createdAt: '2026-06-04T12:01:00.000Z',
    });
    const comment = await signOwnerComment(postedAlice, target, 'Good post.', {
      id: 'alice_comment_bob',
      createdAt: '2026-06-04T12:02:00.000Z',
    });

    await expect(verifyAction(like, postedAlice.profile)).resolves.toBe(true);
    await expect(verifyAction(comment, postedAlice.profile)).resolves.toBe(true);
    const actionSummary = summarizePostActions([like, comment], target);

    expect(actionSummary).toMatchObject({
      likes: 1,
      dislikes: 0,
    });
    expect(actionSummary.comments).toHaveLength(1);
    expect(actionSummary.comments[0]).toMatchObject({
      id: comment.id,
      actor: postedAlice.profile.handle,
      content: 'Good post.',
    });

    const preparedMessage = await createOwnerDirectMessage(
      postedAlice,
      bob.profile,
      'This message is private.',
      {
        id: 'alice_message_bob',
        createdAt: '2026-06-04T12:03:00.000Z',
        profileBaseUrl: 'https://bob.example.test/profile.json',
      },
    );
    const staticHostFetch = vi.fn(async () => new Response('{}', { status: 200 }));

    await expect(
      deliverDirectMessage(preparedMessage, { fetcher: staticHostFetch }),
    ).resolves.toMatchObject({
      status: 'prepared',
      inboxUrl: 'https://bob.example.test/opensocial/messages/inbox/index.json',
    });
    expect(JSON.stringify(preparedMessage.message)).not.toContain('This message is private.');
    await expect(
      readOwnerDirectMessage(bob, preparedMessage.message, {
        senderProfiles: [postedAlice.profile],
      }),
    ).resolves.toMatchObject({
      sender: postedAlice.profile.handle,
      recipient: bob.profile.handle,
      content: 'This message is private.',
    });

    const publicSite = exportOwnerSiteFiles(postedAlice, {
      includePrivate: false,
      actions: [like, comment],
    });
    const fullSiteZip = unzipSync(
      exportOwnerSiteZip(postedAlice, {
        includePrivate: true,
        actions: [like, comment],
      }),
    );
    const publicActionLog = JSON.parse(
      publicSite['public/opensocial/actions/index.json']!,
    ) as OpenSocialNetworkActionLog;

    expect(publicSite['private/identity.private.jwk.json']).toBeUndefined();
    expect(publicSite['private/messages.private.jwk.json']).toBeUndefined();
    expect(JSON.parse(publicSite['public/profile.json']!)).toEqual(postedAlice.profile);
    expect(JSON.parse(publicSite['public/feed.json']!)).toEqual(postedAlice.feed);
    expect(publicActionLog.actor).toBe(postedAlice.profile.handle);
    expect(publicActionLog.actions).toEqual([like, comment]);
    expect(JSON.parse(strFromU8(fullSiteZip['private/identity.private.jwk.json']!))).toEqual(
      postedAlice.privateKeyJwk,
    );
  });
});
