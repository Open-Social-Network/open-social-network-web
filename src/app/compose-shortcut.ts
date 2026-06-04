export function shouldShowFloatingComposeButton(ownerConnected: boolean): boolean {
  return ownerConnected;
}

export function focusOwnerPostComposer(root: ParentNode = document): boolean {
  const composer = root.querySelector<HTMLElement>('[data-owner-post-content]');

  if (!composer) {
    return false;
  }

  composer.scrollIntoView({ block: 'center', behavior: 'smooth' });
  composer.focus();

  return true;
}
