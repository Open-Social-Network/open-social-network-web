export type SignedOutSocialAction = 'react' | 'comment' | 'message';

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
