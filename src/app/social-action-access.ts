export type SignedOutSocialAction = 'react' | 'comment' | 'message';

export const socialInteractionCopy = {
  commentPlaceholder: 'Write a comment...',
  commentSubmit: 'Comment',
  messagePlaceholder: 'Write a message...',
  messageSubmit: 'Send',
  messageSent: 'Message sent.',
  messagePrepared: 'Encrypted message ready. Download it and send it any way you like.',
  messageDownload: 'Download encrypted message',
} as const;

export function signedOutSocialActionMessage(action: SignedOutSocialAction): string {
  if (action === 'react') {
    return 'Create or open your page to like or dislike posts.';
  }

  if (action === 'comment') {
    return 'Create or open your page to comment.';
  }

  return 'Create or open your page to send messages.';
}

export function focusMyPageAccess(root: ParentNode = document): boolean {
  const panel = root.querySelector<HTMLElement>('[data-owner-access]');

  if (!panel) {
    return false;
  }

  panel.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const preferredControl =
    panel.querySelector<HTMLElement>('[data-owner-folder-button]') ??
    panel.querySelector<HTMLElement>('input, textarea, button');

  preferredControl?.focus();

  return true;
}

export function focusOpenCommentComposer(root: ParentNode = document): boolean {
  return focusFirst(root, '[data-form="post-comment"] textarea');
}

export function focusOpenMessageComposer(root: ParentNode = document): boolean {
  return focusFirst(root, '[data-form="direct-message"] textarea');
}

function focusFirst(root: ParentNode, selector: string): boolean {
  const element = root.querySelector<HTMLElement>(selector);

  if (!element) {
    return false;
  }

  element.focus();

  return true;
}
