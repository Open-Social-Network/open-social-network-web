import { describe, expect, it } from 'vitest';
import { renderPostCommentComposer } from './comment-composer';

describe('post comment composer', () => {
  it('shows who is commenting and provides a clear cancel action', () => {
    const html = renderPostCommentComposer({
      targetId: 'post_123',
      targetKey: 'encoded-target',
      ownerName: 'Alice Example',
      ownerHandle: 'alice@example.test',
      placeholder: 'Write a comment...',
      submitLabel: 'Comment',
    });

    expect(html).toContain('class="post-comment-form post-comment-composer"');
    expect(html).toContain('data-form="post-comment"');
    expect(html).toContain('Commenting as');
    expect(html).toContain('Alice Example');
    expect(html).toContain('alice@example.test');
    expect(html).toContain('placeholder="Write a comment..."');
    expect(html).toContain('data-action="cancel-comment"');
    expect(html).toContain('aria-label="Cancel comment"');
    expect(html).toContain('>Cancel<');
    expect(html).toContain('>Comment<');
  });
});
