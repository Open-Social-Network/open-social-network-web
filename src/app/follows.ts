const FOLLOW_STORAGE_KEY = 'open-social-network.followedProfiles.v1';

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
  const url = new URL(value.trim(), baseUrl);
  const lastPathSegment = url.pathname.split('/').filter(Boolean).at(-1) ?? '';

  url.search = '';
  url.hash = '';

  if (url.pathname.endsWith('/profile.json')) {
    return url.toString();
  }

  if (url.pathname.endsWith('/index.html')) {
    url.pathname = `${url.pathname.slice(0, -'index.html'.length)}profile.json`;
    return url.toString();
  }

  if (!lastPathSegment || !lastPathSegment.includes('.')) {
    url.pathname = `${url.pathname.replace(/\/?$/, '/')}profile.json`;
  }

  return url.toString();
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
