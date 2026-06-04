import { describe, expect, it } from 'vitest';
import {
  focusMyPageAccess,
  focusOpenCommentComposer,
  focusOpenMessageComposer,
  socialInteractionCopy,
  signedOutSocialActionMessage,
} from './social-action-access';

describe('signed-out social action access', () => {
  it('uses a simple page-first prompt for social actions', () => {
    expect(signedOutSocialActionMessage('react')).toBe(
      'Create or open your page to like or dislike posts.',
    );
    expect(signedOutSocialActionMessage('comment')).toBe('Create or open your page to comment.');
    expect(signedOutSocialActionMessage('message')).toBe('Create or open your page to send messages.');
  });

  it('uses familiar labels for logged-in comments and messages', () => {
    expect(socialInteractionCopy.commentPlaceholder).toBe('Write a comment...');
    expect(socialInteractionCopy.commentSubmit).toBe('Comment');
    expect(socialInteractionCopy.messagePlaceholder).toBe('Write a message...');
    expect(socialInteractionCopy.messageSubmit).toBe('Send');
    expect(socialInteractionCopy.messageSent).toBe('Message sent.');
    expect(socialInteractionCopy.messagePrepared).toBe(
      'Message ready to download. This page host does not accept automatic delivery yet.',
    );
    expect(socialInteractionCopy.messageDownload).toBe('Download message file');
  });

  it('focuses the first simple page access field', () => {
    const input = new FakeFocusableElement();
    const panel = new FakePanel(input);
    const root = {
      querySelector: (selector: string) => (selector === '[data-owner-access]' ? panel : null),
    } as ParentNode;

    expect(focusMyPageAccess(root)).toBe(true);
    expect(panel.scrolledIntoView).toBe(true);
    expect(input.focused).toBe(true);
  });

  it('prefers the visible folder login control over hidden file inputs', () => {
    const folderControl = new FakeFocusableElement();
    const hiddenInput = new FakeFocusableElement();
    const panel = new FakePanelWithFolderControl(folderControl, hiddenInput);
    const root = {
      querySelector: (selector: string) => (selector === '[data-owner-access]' ? panel : null),
    } as ParentNode;

    expect(focusMyPageAccess(root)).toBe(true);
    expect(panel.scrolledIntoView).toBe(true);
    expect(folderControl.focused).toBe(true);
    expect(hiddenInput.focused).toBe(false);
  });

  it('focuses the open comment composer', () => {
    const textarea = new FakeFocusableElement();
    const root = {
      querySelector: (selector: string) =>
        selector === '[data-form="post-comment"] textarea' ? textarea : null,
    } as ParentNode;

    expect(focusOpenCommentComposer(root)).toBe(true);
    expect(textarea.focused).toBe(true);
  });

  it('focuses the open message composer', () => {
    const textarea = new FakeFocusableElement();
    const root = {
      querySelector: (selector: string) =>
        selector === '[data-form="direct-message"] textarea' ? textarea : null,
    } as ParentNode;

    expect(focusOpenMessageComposer(root)).toBe(true);
    expect(textarea.focused).toBe(true);
  });

  it('returns false when the page access panel is unavailable', () => {
    const root = {
      querySelector: () => null,
    } as unknown as ParentNode;

    expect(focusMyPageAccess(root)).toBe(false);
  });
});

class FakePanel {
  scrolledIntoView = false;

  constructor(private readonly focusable: FakeFocusableElement) {}

  querySelector(): FakeFocusableElement {
    return this.focusable;
  }

  scrollIntoView(): void {
    this.scrolledIntoView = true;
  }
}

class FakePanelWithFolderControl {
  scrolledIntoView = false;

  constructor(
    private readonly folderControl: FakeFocusableElement,
    private readonly hiddenInput: FakeFocusableElement,
  ) {}

  querySelector(selector: string): FakeFocusableElement | null {
    if (selector === '[data-owner-folder-button]') {
      return this.folderControl;
    }

    if (selector === 'input, textarea, button') {
      return this.hiddenInput;
    }

    return null;
  }

  scrollIntoView(): void {
    this.scrolledIntoView = true;
  }
}

class FakeFocusableElement {
  focused = false;

  focus(): void {
    this.focused = true;
  }
}
