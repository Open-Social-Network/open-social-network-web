import { describe, expect, it } from 'vitest';
import {
  focusOwnerPostComposer,
  shouldShowFloatingComposeButton,
} from './compose-shortcut';

describe('floating compose shortcut', () => {
  it('shows only when a page is open', () => {
    expect(shouldShowFloatingComposeButton(true)).toBe(true);
    expect(shouldShowFloatingComposeButton(false)).toBe(false);
  });

  it('focuses the existing post composer for the open page', () => {
    const textarea = new FakeTextarea();
    const root = {
      querySelector: (selector: string) =>
        selector === '[data-owner-post-content]' ? textarea : null,
    } as ParentNode;

    expect(focusOwnerPostComposer(root)).toBe(true);
    expect(textarea.focused).toBe(true);
    expect(textarea.scrolledIntoView).toBe(true);
  });

  it('returns false when there is no post composer to focus', () => {
    const root = {
      querySelector: () => null,
    } as unknown as ParentNode;

    expect(focusOwnerPostComposer(root)).toBe(false);
  });
});

class FakeTextarea {
  focused = false;
  scrolledIntoView = false;

  focus(): void {
    this.focused = true;
  }

  scrollIntoView(): void {
    this.scrolledIntoView = true;
  }
}
