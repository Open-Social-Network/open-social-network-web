import { describe, expect, it } from 'vitest';
import {
  ownerCommentNotice,
  ownerFollowNotice,
  ownerPostNotice,
  ownerReactionNotice,
} from './owner-feedback';

describe('owner action feedback', () => {
  it('speaks like a social app after posting', () => {
    expect(ownerPostNotice('saved')).toBe('Posted. Saved to your page folder.');
    expect(ownerPostNotice('unavailable')).toBe(
      'Posted. Saved in this browser. Download your public site to put it on your page.',
    );
    expect(ownerPostNotice('failed')).toBeNull();
  });

  it('uses simple reaction feedback before explaining publish state', () => {
    expect(
      ownerReactionNotice({
        reaction: 'like',
        saveResult: 'saved',
        manualPublishNeeded: true,
      }),
    ).toBe('Liked. Saved to your page folder.');

    expect(
      ownerReactionNotice({
        reaction: 'dislike',
        saveResult: 'unavailable',
        manualPublishNeeded: true,
      }),
    ).toBe('Disliked. Saved in this browser. Download the update file to put it on your page.');

    expect(
      ownerReactionNotice({
        reaction: 'none',
        saveResult: 'unavailable',
        manualPublishNeeded: false,
      }),
    ).toBe('Reaction removed.');
  });

  it('uses simple comment feedback before explaining publish state', () => {
    expect(
      ownerCommentNotice({
        saveResult: 'saved',
        manualPublishNeeded: true,
      }),
    ).toBe('Comment posted. Saved to your page folder.');

    expect(
      ownerCommentNotice({
        saveResult: 'unavailable',
        manualPublishNeeded: true,
      }),
    ).toBe('Comment posted. Saved in this browser. Download the update file to put it on your page.');

    expect(
      ownerCommentNotice({
        saveResult: 'unavailable',
        manualPublishNeeded: false,
      }),
    ).toBe('Comment posted.');
  });

  it('uses simple follow feedback before explaining publish state', () => {
    expect(
      ownerFollowNotice({
        action: 'followed',
        saveResult: 'saved',
      }),
    ).toBe('Followed. Saved to your page folder.');

    expect(
      ownerFollowNotice({
        action: 'unfollowed',
        saveResult: 'unavailable',
      }),
    ).toBe('Unfollowed. Saved in this browser. Download your public site to put it on your page.');

    expect(
      ownerFollowNotice({
        action: 'followed',
        saveResult: 'failed',
      }),
    ).toBeNull();
  });
});
