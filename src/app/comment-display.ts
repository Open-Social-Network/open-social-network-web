import type { OpenSocialNetworkIdentity } from '../protocol/types';

export interface CommentAuthorDisplay {
  name: string;
  handle: string | null;
  profile: OpenSocialNetworkIdentity | null;
}

export function commentAuthorDisplay(
  actor: string,
  profiles: OpenSocialNetworkIdentity[],
): CommentAuthorDisplay {
  const profile = profiles.find((item) => item.handle === actor) ?? null;

  if (!profile) {
    return {
      name: actor,
      handle: null,
      profile: null,
    };
  }

  return {
    name: profile.name,
    handle: profile.handle,
    profile,
  };
}
