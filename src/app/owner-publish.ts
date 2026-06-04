import type { OwnerPublicUpdatesSummary } from './owner-actions';

export interface OwnerPublishReadyInput {
  pageCreated: boolean;
  postCount: number;
  publicUpdates: OwnerPublicUpdatesSummary | null;
}

export interface OwnerPublishReadySummary {
  title: string;
  detail: string;
}

export function summarizeOwnerPublishReady(
  input: OwnerPublishReadyInput,
): OwnerPublishReadySummary | null {
  if (input.pageCreated) {
    return {
      title: 'Page ready to publish',
      detail: 'Download your public site to publish this page.',
    };
  }

  if (input.postCount === 0 && !input.publicUpdates) {
    return null;
  }

  if (input.postCount === 0) {
    return input.publicUpdates
      ? {
          title: input.publicUpdates.title,
          detail: input.publicUpdates.detail,
        }
      : null;
  }

  if (!input.publicUpdates) {
    return {
      title:
        input.postCount === 1
          ? 'Post ready to publish'
          : `${input.postCount} posts ready to publish`,
      detail: `Download your public site to publish your latest ${postLabel(input.postCount)}.`,
    };
  }

  const totalUpdates = input.postCount + input.publicUpdates.count;

  return {
    title: `${totalUpdates} updates ready to publish`,
    detail: `Download your public site to publish your latest ${postLabel(input.postCount)} and ${publicUpdateLabel(input.publicUpdates.count)}.`,
  };
}

function postLabel(count: number): string {
  return count === 1 ? 'post' : 'posts';
}

function publicUpdateLabel(count: number): string {
  return count === 1 ? 'public update' : 'public updates';
}
