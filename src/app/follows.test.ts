import { describe, expect, it } from 'vitest';
import { normalizeProfileUrl } from './follows';

describe('follow URL normalization', () => {
  it('keeps direct profile.json URLs', () => {
    expect(normalizeProfileUrl('https://ada.example.test/profile.json', 'http://127.0.0.1:5173/')).toBe(
      'https://ada.example.test/profile.json',
    );
  });

  it('follows a generated page by using the profile file next to index.html', () => {
    expect(normalizeProfileUrl('/profiles/ada/index.html', 'http://127.0.0.1:5173/')).toBe(
      'http://127.0.0.1:5173/profiles/ada/profile.json',
    );
  });

  it('follows a normal page link by looking for profile.json in that page folder', () => {
    expect(normalizeProfileUrl('https://ada.example.test/', 'http://127.0.0.1:5173/')).toBe(
      'https://ada.example.test/profile.json',
    );
    expect(normalizeProfileUrl('/profiles/ada', 'http://127.0.0.1:5173/')).toBe(
      'http://127.0.0.1:5173/profiles/ada/profile.json',
    );
  });
});
