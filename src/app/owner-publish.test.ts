import { describe, expect, it } from 'vitest';
import { summarizeOwnerPublishReady } from './owner-publish';

describe('owner publish reminder', () => {
  it('does not show a reminder when nothing changed in this session', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 0,
        publicUpdates: null,
      }),
    ).toBeNull();
  });

  it('shows a simple reminder after creating a page', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: true,
        postCount: 0,
        publicUpdates: null,
      }),
    ).toEqual({
      title: 'Page ready to publish',
      detail: 'Download your public site to publish this page.',
    });
  });

  it('shows a simple reminder after writing posts', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 2,
        publicUpdates: null,
      }),
    ).toEqual({
      title: '2 posts ready to publish',
      detail: 'Download your public site to publish your latest posts.',
    });
  });

  it('uses only pending public actions when summarizing interaction updates', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 0,
        publicUpdates: {
          count: 1,
          reactions: 1,
          comments: 0,
          title: '1 public update ready',
          detail: 'Download your public site to publish your latest reaction.',
        },
      }),
    ).toEqual({
      title: '1 public update ready',
      detail: 'Download your public site to publish your latest reaction.',
    });
  });

  it('combines new posts and pending public actions into one user-facing reminder', () => {
    expect(
      summarizeOwnerPublishReady({
        pageCreated: false,
        postCount: 1,
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
    });
  });
});
