import { verifyPost } from '../protocol/signing';
import type { OpenSocialFeed, OpenSocialIdentity, OpenSocialPost } from '../protocol/types';

export type JsonFetcher = (url: string) => Promise<unknown>;

export interface RejectedPost {
  postId: string;
  author: string;
  reason: string;
}

export interface TimelineFailure {
  source: string;
  reason: string;
}

export interface TimelinePost extends OpenSocialPost {
  profile: OpenSocialIdentity;
}

export interface TimelineResult {
  profiles: OpenSocialIdentity[];
  posts: TimelinePost[];
  rejectedPosts: RejectedPost[];
  failures: TimelineFailure[];
}

export async function loadVerifiedTimeline(
  profileUrls: string[],
  fetcher: JsonFetcher = fetchJson,
): Promise<TimelineResult> {
  const results = await Promise.all(
    profileUrls.map((profileUrl) => loadProfileFeed(profileUrl, fetcher)),
  );
  const timeline: TimelineResult = {
    profiles: [],
    posts: [],
    rejectedPosts: [],
    failures: [],
  };

  for (const result of results) {
    if ('failure' in result) {
      timeline.failures.push(result.failure);
      continue;
    }

    timeline.profiles.push(result.profile);
    timeline.posts.push(...result.posts);
    timeline.rejectedPosts.push(...result.rejectedPosts);
  }

  timeline.posts.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return timeline;
}

async function loadProfileFeed(
  profileUrl: string,
  fetcher: JsonFetcher,
): Promise<
  | {
      profile: OpenSocialIdentity;
      posts: TimelinePost[];
      rejectedPosts: RejectedPost[];
    }
  | { failure: TimelineFailure }
> {
  try {
    const profile = parseIdentity(await fetcher(profileUrl));
    const feedUrl = resolveEndpoint(profile.endpoints.feed, profileUrl);
    const feed = parseFeed(await fetcher(feedUrl));

    if (feed.author !== profile.handle) {
      return {
        failure: {
          source: profileUrl,
          reason: `Feed author ${feed.author} does not match profile ${profile.handle}`,
        },
      };
    }

    const posts: TimelinePost[] = [];
    const rejectedPosts: RejectedPost[] = [];

    for (const post of feed.posts) {
      if (await verifyPost(post, profile)) {
        posts.push({ ...post, profile });
      } else {
        rejectedPosts.push({
          postId: post.id,
          author: post.author,
          reason: 'Signature verification failed',
        });
      }
    }

    return { profile, posts, rejectedPosts };
  } catch (error) {
    return {
      failure: {
        source: profileUrl,
        reason: error instanceof Error ? error.message : 'Unknown loading error',
      },
    };
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

function resolveEndpoint(endpoint: string, profileUrl: string): string {
  return new URL(endpoint, profileUrl).toString();
}

function parseIdentity(value: unknown): OpenSocialIdentity {
  if (!isRecord(value)) {
    throw new Error('Profile response is not an object');
  }

  if (
    value.protocol !== 'opensocial' ||
    value.version !== '0.1' ||
    typeof value.handle !== 'string' ||
    typeof value.name !== 'string' ||
    !isRecord(value.publicKey) ||
    value.publicKey.alg !== 'ES256' ||
    !isRecord(value.publicKey.jwk) ||
    !isRecord(value.endpoints) ||
    typeof value.endpoints.feed !== 'string' ||
    typeof value.endpoints.profile !== 'string'
  ) {
    throw new Error('Profile response is not a valid OpenSocial identity file');
  }

  return value as unknown as OpenSocialIdentity;
}

function parseFeed(value: unknown): OpenSocialFeed {
  if (!isRecord(value)) {
    throw new Error('Feed response is not an object');
  }

  if (
    value.protocol !== 'opensocial' ||
    value.version !== '0.1' ||
    typeof value.author !== 'string' ||
    !Array.isArray(value.posts)
  ) {
    throw new Error('Feed response is not a valid OpenSocial feed file');
  }

  return value as unknown as OpenSocialFeed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
