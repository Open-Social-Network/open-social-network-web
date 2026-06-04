export interface PostCommentComposerInput {
  targetId: string;
  targetKey: string;
  ownerName: string;
  ownerHandle: string;
  placeholder: string;
  submitLabel: string;
}

export function renderPostCommentComposer(input: PostCommentComposerInput): string {
  return `
    <form class="post-comment-form post-comment-composer" data-form="post-comment">
      <input type="hidden" name="targetKey" value="${escapeAttribute(input.targetKey)}" />
      <div class="post-comment-composer-header">
        <span>Commenting as</span>
        <strong>${escapeHtml(input.ownerName)}</strong>
        <span>${escapeHtml(input.ownerHandle)}</span>
      </div>
      <label class="sr-only" for="comment-${escapeAttribute(input.targetId)}">Comment</label>
      <textarea id="comment-${escapeAttribute(input.targetId)}" name="content" rows="2" maxlength="600" placeholder="${escapeAttribute(input.placeholder)}"></textarea>
      <div class="post-comment-composer-actions">
        <button
          class="button button-secondary"
          type="button"
          data-action="cancel-comment"
          data-target-key="${escapeAttribute(input.targetKey)}"
          aria-label="Cancel comment"
        >Cancel</button>
        <button class="button button-primary" type="submit">${escapeHtml(input.submitLabel)}</button>
      </div>
    </form>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
