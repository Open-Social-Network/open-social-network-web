import { describe, expect, it } from 'vitest';
import { summarizePostActions, verifyAction } from '../protocol/public-actions';
import type { OpenSocialNetworkActionTarget } from '../protocol/types';
import { createOwnerPage } from './owner-session';
import {
  loadStoredOwnerActions,
  loadOwnerActionsFromActionLog,
  saveStoredOwnerActions,
  signOwnerComment,
  signOwnerReaction,
  summarizeOwnerPublicUpdates,
} from './owner-actions';

describe('owner public actions', () => {
  it('signs reactions with the current page key', async () => {
    const owner = await createOwnerPage({
      name: 'Owner',
      handle: 'owner@example.test',
      bio: '',
      firstPost: 'First post',
    });
    const target = targetFor(owner.feed.posts[0]!.id, owner.feed.posts[0]!.author);

    const like = await signOwnerReaction(owner, target, 'like', {
      id: 'reaction_1',
      createdAt: '2026-06-03T12:00:00.000Z',
    });
    const clear = await signOwnerReaction(owner, target, 'none', {
      id: 'reaction_2',
      createdAt: '2026-06-03T12:01:00.000Z',
    });

    await expect(verifyAction(like, owner.profile)).resolves.toBe(true);
    expect(summarizePostActions([like, clear], target)).toMatchObject({
      likes: 0,
      dislikes: 0,
    });
  });

  it('signs public comments and rejects empty comments', async () => {
    const owner = await createOwnerPage({
      name: 'Owner',
      handle: 'owner@example.test',
      bio: '',
      firstPost: 'First post',
    });
    const target = targetFor(owner.feed.posts[0]!.id, owner.feed.posts[0]!.author);

    const comment = await signOwnerComment(owner, target, 'This is portable.', {
      id: 'comment_1',
      createdAt: '2026-06-03T12:00:00.000Z',
    });

    await expect(verifyAction(comment, owner.profile)).resolves.toBe(true);
    await expect(signOwnerComment(owner, target, ' ')).rejects.toThrow('Comment is required');
  });

  it('stores signed public actions in browser storage', async () => {
    const owner = await createOwnerPage({
      name: 'Owner',
      handle: 'owner@example.test',
      bio: '',
      firstPost: 'First post',
    });
    const target = targetFor(owner.feed.posts[0]!.id, owner.feed.posts[0]!.author);
    const action = await signOwnerReaction(owner, target, 'like', {
      id: 'reaction_1',
      createdAt: '2026-06-03T12:00:00.000Z',
    });
    const storage = new MemoryStorage();

    saveStoredOwnerActions([action], storage);

    expect(loadStoredOwnerActions(storage)).toEqual([action]);
  });

  it('summarizes only the current owner public updates for publishing', async () => {
    const owner = await createOwnerPage({
      name: 'Owner',
      handle: 'owner@example.test',
      bio: '',
      firstPost: 'First post',
    });
    const otherOwner = await createOwnerPage({
      name: 'Other',
      handle: 'other@example.test',
      bio: '',
      firstPost: 'Other post',
    });
    const target = targetFor(owner.feed.posts[0]!.id, owner.feed.posts[0]!.author);
    const reaction = await signOwnerReaction(owner, target, 'like', {
      id: 'reaction_1',
      createdAt: '2026-06-03T12:00:00.000Z',
    });
    const comment = await signOwnerComment(owner, target, 'Portable comment', {
      id: 'comment_1',
      createdAt: '2026-06-03T12:01:00.000Z',
    });
    const otherReaction = await signOwnerReaction(otherOwner, target, 'dislike', {
      id: 'reaction_2',
      createdAt: '2026-06-03T12:02:00.000Z',
    });

    expect(summarizeOwnerPublicUpdates(owner, [otherReaction, reaction, comment])).toEqual({
      count: 2,
      reactions: 1,
      comments: 1,
      title: '2 updates ready',
      detail: 'Download the update file to make your latest activity visible on your page.',
    });
  });

  it('returns no publish summary when the owner has no public updates', async () => {
    const owner = await createOwnerPage({
      name: 'Owner',
      handle: 'owner@example.test',
      bio: '',
      firstPost: 'First post',
    });
    const otherOwner = await createOwnerPage({
      name: 'Other',
      handle: 'other@example.test',
      bio: '',
      firstPost: 'Other post',
    });
    const target = targetFor(owner.feed.posts[0]!.id, owner.feed.posts[0]!.author);
    const otherReaction = await signOwnerReaction(otherOwner, target, 'dislike', {
      id: 'reaction_2',
      createdAt: '2026-06-03T12:02:00.000Z',
    });

    expect(summarizeOwnerPublicUpdates(owner, [otherReaction])).toBeNull();
  });

  it('loads verified owner actions from a public action log', async () => {
    const owner = await createOwnerPage({
      name: 'Owner',
      handle: 'owner@example.test',
      bio: '',
      firstPost: 'First post',
    });
    const target = targetFor(owner.feed.posts[0]!.id, owner.feed.posts[0]!.author);
    const action = await signOwnerReaction(owner, target, 'like', {
      id: 'reaction_1',
      createdAt: '2026-06-03T12:00:00.000Z',
    });

    await expect(
      loadOwnerActionsFromActionLog(owner, {
        protocol: 'open-social-network',
        version: '0.1',
        actor: owner.profile.handle,
        actions: [action],
      }),
    ).resolves.toEqual([action]);
  });

  it('ignores malformed, tampered, and non-owner actions from a public action log', async () => {
    const owner = await createOwnerPage({
      name: 'Owner',
      handle: 'owner@example.test',
      bio: '',
      firstPost: 'First post',
    });
    const otherOwner = await createOwnerPage({
      name: 'Other',
      handle: 'other@example.test',
      bio: '',
      firstPost: 'Other post',
    });
    const target = targetFor(owner.feed.posts[0]!.id, owner.feed.posts[0]!.author);
    const ownerAction = await signOwnerReaction(owner, target, 'like', {
      id: 'reaction_1',
      createdAt: '2026-06-03T12:00:00.000Z',
    });
    const tamperedAction = {
      ...ownerAction,
      reaction: 'dislike' as const,
    };
    const otherAction = await signOwnerReaction(otherOwner, target, 'like', {
      id: 'reaction_2',
      createdAt: '2026-06-03T12:02:00.000Z',
    });

    await expect(
      loadOwnerActionsFromActionLog(owner, {
        protocol: 'open-social-network',
        version: '0.1',
        actor: owner.profile.handle,
        actions: [tamperedAction, otherAction, { broken: true }],
      }),
    ).resolves.toEqual([]);
  });
});

function targetFor(id: string, author: string): OpenSocialNetworkActionTarget {
  return {
    type: 'post',
    id,
    author,
  };
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
