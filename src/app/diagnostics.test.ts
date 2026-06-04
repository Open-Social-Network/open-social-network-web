import { describe, expect, it } from 'vitest';
import { renderVerificationDiagnostics } from './diagnostics';
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
