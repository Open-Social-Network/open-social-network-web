import { describe, expect, it } from 'vitest';
import { renderVerificationDiagnostics, verificationRejectedCount } from './diagnostics';
import type { TimelineResult } from '../aggregator/timeline';

describe('verification diagnostics', () => {
  it('shows rejected public actions instead of hiding them', () => {
    const html = renderVerificationDiagnostics({
      ...emptyTimeline(),
      rejectedActions: [
        {
          actionId: 'ada_like',
          actor: 'ada@example.test',
          reason: 'Signature verification failed',
        },
      ],
    });

    expect(html).toContain('Action ada_like');
    expect(html).toContain('ada@example.test');
    expect(html).toContain('Signature verification failed');
  });

  it('describes the healthy state as posts and actions verified', () => {
    const html = renderVerificationDiagnostics(emptyTimeline());

    expect(html).toContain('All visible posts and actions verified.');
  });

  it('counts rejected posts and public actions for the Verification header', () => {
    expect(
      verificationRejectedCount({
        ...emptyTimeline(),
        rejectedPosts: [
          {
            postId: 'post_1',
            author: 'ada@example.test',
            reason: 'Signature verification failed',
          },
        ],
        rejectedActions: [
          {
            actionId: 'like_1',
            actor: 'ada@example.test',
            reason: 'Signature verification failed',
          },
          {
            actionId: 'comment_1',
            actor: 'unknown@example.test',
            reason: 'Actor profile is not loaded',
          },
        ],
      }),
    ).toBe(3);
  });
});

function emptyTimeline(): TimelineResult {
  return {
    profiles: [],
    posts: [],
    actions: [],
    rejectedPosts: [],
    rejectedActions: [],
    failures: [],
  };
}
