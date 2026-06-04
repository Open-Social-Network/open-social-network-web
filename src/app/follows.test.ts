import { describe, expect, it } from 'vitest';
import { normalizeProfileUrl } from './follows';
import { createFollowList, followsFromFollowList } from '../protocol/follows';

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

describe('portable follow lists', () => {
  it('loads follows only from the matching profile owner', () => {
    const followList = createFollowList('ada@example.test', [
      'https://tommy.example.test/profile.json',
    ]);

    expect(followsFromFollowList('ada@example.test', followList)).toEqual([
      'https://tommy.example.test/profile.json',
    ]);
    expect(followsFromFollowList('other@example.test', followList)).toEqual([]);
  });
});
