import type { OpenSocialNetworkIdentity } from '../protocol/types';
import { profilePageUrl } from './profile-links';

export interface CommentAuthorDisplay {
  name: string;
  handle: string | null;
  profile: OpenSocialNetworkIdentity | null;
}

export interface CommentAuthorPageLink {
  href: string;
  ariaLabel: string;
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

export function commentAuthorPageLink(
  author: CommentAuthorDisplay,
  baseUrl: string,
): CommentAuthorPageLink | null {
  if (!author.profile) {
    return null;
  }

  return {
    href: profilePageUrl(author.profile, baseUrl),
    ariaLabel: `View ${author.name} page`,
  };
}
