import { describe, expect, it } from 'vitest';
import {
  ownerCommentNotice,
  ownerPostNotice,
  ownerReactionNotice,
} from './owner-feedback';

describe('owner action feedback', () => {
  it('speaks like a social app after posting', () => {
    expect(ownerPostNotice('saved')).toBe('Posted. Saved to your page folder.');
    expect(ownerPostNotice('unavailable')).toBe(
      'Posted. Download your public site when you want to publish it.',
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
    ).toBe('Disliked. Public update is ready to publish.');

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
    ).toBe('Comment posted. Public update is ready to publish.');

    expect(
      ownerCommentNotice({
        saveResult: 'unavailable',
        manualPublishNeeded: false,
      }),
    ).toBe('Comment posted.');
  });
});
