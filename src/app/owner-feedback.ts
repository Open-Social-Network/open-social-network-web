import type { OpenSocialNetworkReaction } from '../protocol/types';

export type OwnerLocalSaveResult = 'saved' | 'unavailable' | 'failed';

export interface OwnerReactionNoticeInput {
  reaction: OpenSocialNetworkReaction;
  saveResult: OwnerLocalSaveResult;
  manualPublishNeeded: boolean;
}

export interface OwnerCommentNoticeInput {
  saveResult: OwnerLocalSaveResult;
  manualPublishNeeded: boolean;
}

export function ownerPostNotice(saveResult: OwnerLocalSaveResult): string | null {
  if (saveResult === 'failed') {
    return null;
  }

  if (saveResult === 'saved') {
    return 'Posted. Saved to your page folder.';
  }

  return 'Posted. Saved in this browser. Download your public site to put it on your page.';
}

export function ownerReactionNotice(input: OwnerReactionNoticeInput): string | null {
  if (input.saveResult === 'failed') {
    return null;
  }

  return withSaveDetail(reactionCopy(input.reaction), input.saveResult, input.manualPublishNeeded);
}

export function ownerCommentNotice(input: OwnerCommentNoticeInput): string | null {
  if (input.saveResult === 'failed') {
    return null;
  }

  return withSaveDetail('Comment posted.', input.saveResult, input.manualPublishNeeded);
}

function withSaveDetail(
  baseCopy: string,
  saveResult: OwnerLocalSaveResult,
  manualPublishNeeded: boolean,
): string {
  if (saveResult === 'saved') {
    return `${baseCopy} Saved to your page folder.`;
  }

  if (manualPublishNeeded) {
    return `${baseCopy} Saved in this browser. Download the update file to put it on your page.`;
  }

  return baseCopy;
}

function reactionCopy(reaction: OpenSocialNetworkReaction): string {
  if (reaction === 'like') {
    return 'Liked.';
  }

  if (reaction === 'dislike') {
    return 'Disliked.';
  }

  return 'Reaction removed.';
}
