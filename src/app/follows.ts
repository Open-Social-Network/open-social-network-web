const FOLLOW_STORAGE_KEY = 'opensocial.followedProfiles.v1';

export function loadStoredFollows(fallback: string[]): string[] {
  try {
    const storedValue = window.localStorage.getItem(FOLLOW_STORAGE_KEY);

    if (!storedValue) {
      return fallback;
    }

    const parsed = JSON.parse(storedValue);

    if (!Array.isArray(parsed)) {
      return fallback;
    }

    return dedupeUrls(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return fallback;
  }
}

export function saveStoredFollows(follows: string[]): void {
  window.localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(dedupeUrls(follows)));
}

export function normalizeProfileUrl(value: string, baseUrl: string): string {
  return new URL(value.trim(), baseUrl).toString();
}

export function toggleFollow(follows: string[], profileUrl: string): string[] {
  if (follows.includes(profileUrl)) {
    return follows.filter((follow) => follow !== profileUrl);
  }

  return [...follows, profileUrl];
}

function dedupeUrls(urls: string[]): string[] {
  return [...new Set(urls)];
}
