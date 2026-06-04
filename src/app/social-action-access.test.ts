import { describe, expect, it } from 'vitest';
import {
  focusMyPageAccess,
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

class FakeFocusableElement {
  focused = false;

  focus(): void {
    this.focused = true;
  }
}
