import type { OpenSocialNetworkIdentity } from '../protocol/types';

const profileFileSuffix = '/profile.json';

export function profilePageUrl(profile: OpenSocialNetworkIdentity, baseUrl: string): string {
  const profileEndpoint = new URL(profile.endpoints.profile, baseUrl).toString();

  if (profileEndpoint.endsWith(profileFileSuffix)) {
    const pageRoot = profileEndpoint.slice(0, -'profile.json'.length);
    const endpointUrl = new URL(profileEndpoint);

    if (isLocalExampleHost(endpointUrl.hostname)) {
      return new URL('index.html', pageRoot).toString();
    }

    return pageRoot;
  }

  return profile.website || profileEndpoint;
}

export function profileAvatarUrl(
  profile: OpenSocialNetworkIdentity,
  baseUrl: string,
): string | null {
  const avatar = profile.avatar || profile.endpoints.avatar;

  if (!avatar) {
    return null;
  }

  return new URL(avatar, new URL(profile.endpoints.profile, baseUrl)).toString();
}

function isLocalExampleHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}
