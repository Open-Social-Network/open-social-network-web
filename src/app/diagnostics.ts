import type { TimelineResult } from '../aggregator/timeline';

export function verificationRejectedCount(timeline: TimelineResult): number {
  return timeline.rejectedPosts.length + timeline.rejectedActions.length;
}

export function renderVerificationDiagnostics(timeline: TimelineResult): string {
  const rejectedPosts = timeline.rejectedPosts
    .map(
      (post) => `
        <li>
          <strong>${escapeHtml(post.postId)}</strong>
          <span>${escapeHtml(post.reason)}</span>
        </li>
      `,
    )
    .join('');
  const rejectedActions = timeline.rejectedActions
    .map(
      (action) => `
        <li>
          <strong>Action ${escapeHtml(action.actionId)}</strong>
          <span>${escapeHtml(action.actor)} · ${escapeHtml(action.reason)}</span>
        </li>
      `,
    )
    .join('');
  const failures = timeline.failures
    .map(
      (failure) => `
        <li>
          <strong>${escapeHtml(shortUrl(failure.source))}</strong>
          <span>${escapeHtml(failure.reason)}</span>
        </li>
      `,
    )
    .join('');

  if (!rejectedPosts && !rejectedActions && !failures) {
    return `
      <div class="trust-ok">
        <strong>All visible posts and actions verified.</strong>
        <span>Each visible post and action matched its identity public key.</span>
      </div>
    `;
  }

  return `
    <ul class="diagnostic-list">
      ${rejectedPosts}
      ${rejectedActions}
      ${failures}
    </ul>
  `;
}

function shortUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return value;
  }
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
