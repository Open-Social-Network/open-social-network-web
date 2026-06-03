import type { OpenSocialNetworkIdentity } from '../protocol/types';

const profileFileSuffix = '/profile.json';

export function profilePageUrl(profile: OpenSocialNetworkIdentity, baseUrl: string): string {
  const profileEndpoint = new URL(profile.endpoints.profile, baseUrl).toString();

  if (profileEndpoint.endsWith(profileFileSuffix)) {
    return profileEndpoint.slice(0, -'profile.json'.length);
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
