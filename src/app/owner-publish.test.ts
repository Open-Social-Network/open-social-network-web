import { describe, expect, it } from 'vitest';
import type { OpenSocialNetworkAction } from '../protocol/types';
import {
  clearStoredOwnerPublishChanges,
  loadStoredOwnerPublishChanges,
  markOwnerPublishChangesPublished,
  saveStoredOwnerPublishChanges,
  summarizeOwnerPublishReady,
} from './owner-publish';

describe('owner publish reminder', () => {
  it('does not show a reminder when nothing changed in this session', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 0,
        followCount: 0,
        publicUpdates: null,
      }),
    ).toBeNull();
  });

  it('shows a simple reminder after creating a page', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: true,
        postCount: 0,
        followCount: 0,
        publicUpdates: null,
      }),
    ).toEqual({
      title: 'Page ready to publish',
      detail: 'Download your public site to publish this page.',
      downloadLabel: 'Download public site',
      downloadTarget: 'public-site',
    });
  });

  it('shows a simple reminder after writing posts', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 2,
        followCount: 0,
        publicUpdates: null,
      }),
    ).toEqual({
      title: '2 posts ready to publish',
      detail: 'Download your public site to publish your latest posts.',
      downloadLabel: 'Download public site',
      downloadTarget: 'public-site',
    });
  });

  it('uses only pending public actions when summarizing interaction updates', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 0,
        followCount: 0,
        publicUpdates: {
          count: 1,
          reactions: 1,
          comments: 0,
          title: '1 public update ready',
          detail: 'Download your public updates to publish your latest reaction.',
        },
      }),
    ).toEqual({
      title: '1 public update ready',
      detail: 'Download your public updates to publish your latest reaction.',
      downloadLabel: 'Download public updates',
      downloadTarget: 'public-updates',
    });
  });

  it('combines new posts and pending public actions into one user-facing reminder', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 1,
        followCount: 0,
        publicUpdates: {
          count: 2,
          reactions: 1,
          comments: 1,
          title: '2 public updates ready',
          detail: 'Download your public site to publish your latest reaction and comment.',
        },
      }),
    ).toEqual({
      title: '3 updates ready to publish',
      detail: 'Download your public site to publish your latest post and public updates.',
      downloadLabel: 'Download public site',
      downloadTarget: 'public-site',
    });
  });

  it('shows a simple reminder after changing follows', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 0,
        followCount: 1,
        publicUpdates: null,
      }),
    ).toEqual({
      title: 'Follow list ready to publish',
      detail: 'Download your public site to publish your updated follows.',
      downloadLabel: 'Download public site',
      downloadTarget: 'public-site',
    });
  });

  it('includes follow changes in combined public site reminders', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 0,
        followCount: 1,
        publicUpdates: {
          count: 1,
          reactions: 1,
          comments: 0,
          title: '1 public update ready',
          detail: 'Download your public updates to publish your latest reaction.',
        },
      }),
    ).toEqual({
      title: '2 updates ready to publish',
      detail: 'Download your public site to publish your latest public update and follow change.',
      downloadLabel: 'Download public site',
      downloadTarget: 'public-site',
    });
  });

  it('restores pending publish changes for the same page identity', () => {
    const storage = new MemoryStorage();
    const pendingAction = actionFor('action_1', 'owner@example.test');

    saveStoredOwnerPublishChanges(
      'owner@example.test',
      {
        pageCreated: false,
        postCount: 1,
        followCount: 1,
        actions: [pendingAction],
      },
      storage,
    );

    expect(loadStoredOwnerPublishChanges('owner@example.test', storage)).toEqual({
      pageCreated: false,
      postCount: 1,
      followCount: 1,
      actions: [pendingAction],
    });
  });

  it('does not restore pending publish changes for a different page identity', () => {
    const storage = new MemoryStorage();

    saveStoredOwnerPublishChanges(
      'owner@example.test',
      {
        pageCreated: true,
        postCount: 0,
        followCount: 0,
        actions: [],
      },
      storage,
    );

    expect(loadStoredOwnerPublishChanges('other@example.test', storage)).toEqual({
      pageCreated: false,
      postCount: 0,
      followCount: 0,
      actions: [],
    });
  });

  it('clears stored pending publish changes on logout or folder login', () => {
    const storage = new MemoryStorage();

    saveStoredOwnerPublishChanges(
      'owner@example.test',
      {
        pageCreated: true,
        postCount: 0,
        followCount: 0,
        actions: [],
      },
      storage,
    );
    clearStoredOwnerPublishChanges(storage);

    expect(loadStoredOwnerPublishChanges('owner@example.test', storage)).toEqual({
      pageCreated: false,
      postCount: 0,
      followCount: 0,
      actions: [],
    });
  });

  it('marks pending publish changes as published and returns an empty reminder state', () => {
    const storage = new MemoryStorage();

    saveStoredOwnerPublishChanges(
      'owner@example.test',
      {
        pageCreated: true,
        postCount: 1,
        followCount: 1,
        actions: [actionFor('action_1', 'owner@example.test')],
      },
      storage,
    );

    expect(markOwnerPublishChangesPublished(storage)).toEqual({
      pageCreated: false,
      postCount: 0,
      followCount: 0,
      actions: [],
    });
    expect(loadStoredOwnerPublishChanges('owner@example.test', storage)).toEqual({
      pageCreated: false,
      postCount: 0,
      followCount: 0,
      actions: [],
    });
  });
});

function actionFor(id: string, actor: string): OpenSocialNetworkAction {
  return {
    id,
    kind: 'reaction',
    actor,
    createdAt: '2026-06-03T12:00:00.000Z',
    target: {
      type: 'post',
      id: 'post_1',
      author: 'author@example.test',
    },
    reaction: 'like',
    signature: {
      alg: 'ES256',
      value: 'signature',
    },
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
