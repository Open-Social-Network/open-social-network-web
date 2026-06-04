import type { OwnerPublishReadySummary } from './owner-publish';

export function renderPublishReady(summary: OwnerPublishReadySummary): string {
  return `
    <section class="owner-publish-ready" aria-label="Public changes ready">
      <strong>${escapeHtml(summary.title)}</strong>
      <p>${escapeHtml(summary.detail)}</p>
      <p>${escapeHtml(publishReadyHelper(summary.downloadTarget))}</p>
      <div class="owner-publish-ready-actions">
        <button class="button button-primary" type="button" data-owner-download="${downloadTargetAttribute(summary.downloadTarget)}">${escapeHtml(summary.downloadLabel)}</button>
        <button class="button button-secondary" type="button" data-action="owner-published">I published this</button>
      </div>
    </section>
  `;
}

function downloadTargetAttribute(target: OwnerPublishReadySummary['downloadTarget']): string {
  return target === 'public-updates' ? 'public-updates' : 'public';
}

function publishReadyHelper(target: OwnerPublishReadySummary['downloadTarget']): string {
  if (target === 'public-updates') {
    return 'Upload the update file to your site so this activity appears on your page.';
  }

  return 'Upload the public folder to your site.';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
