import { verifyPost } from '../protocol/signing';
import { verifyAction } from '../protocol/public-actions';
import type {
  OpenSocialNetworkAction,
  OpenSocialNetworkActionInbox,
  OpenSocialNetworkFeed,
  OpenSocialNetworkIdentity,
  OpenSocialNetworkPost,
} from '../protocol/types';

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

export interface RejectedAction {
  actionId: string;
  actor: string;
  reason: string;
}

export interface TimelinePost extends OpenSocialNetworkPost {
  profile: OpenSocialNetworkIdentity;
}

export interface TimelineResult {
  profiles: OpenSocialNetworkIdentity[];
  posts: TimelinePost[];
  actions: OpenSocialNetworkAction[];
  rejectedPosts: RejectedPost[];
  rejectedActions: RejectedAction[];
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
    actions: [],
    rejectedPosts: [],
    rejectedActions: [],
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

  const actionResult = await loadProfileActionInboxes(timeline.profiles, fetcher);
  timeline.actions = actionResult.actions;
  timeline.rejectedActions = actionResult.rejectedActions;
  timeline.failures.push(...actionResult.failures);

  return timeline;
}

async function loadProfileActionInboxes(
  profiles: OpenSocialNetworkIdentity[],
  fetcher: JsonFetcher,
): Promise<{
  actions: OpenSocialNetworkAction[];
  rejectedActions: RejectedAction[];
  failures: TimelineFailure[];
}> {
  const profilesByHandle = new Map(profiles.map((profile) => [profile.handle, profile]));
  const actions: OpenSocialNetworkAction[] = [];
  const rejectedActions: RejectedAction[] = [];
  const failures: TimelineFailure[] = [];

  for (const profile of profiles) {
    if (!profile.endpoints.actions) {
      continue;
    }

    const inboxUrl = resolveEndpoint(profile.endpoints.actions, profile.endpoints.profile);

    try {
      const inbox = parseActionInbox(await fetcher(inboxUrl));

      if (inbox.owner !== profile.handle) {
        failures.push({
          source: inboxUrl,
          reason: `Action inbox owner ${inbox.owner} does not match profile ${profile.handle}`,
        });
        continue;
      }

      for (const action of inbox.actions) {
        if (action.target.author !== inbox.owner) {
          rejectedActions.push({
            actionId: action.id,
            actor: action.actor,
            reason: 'Action target does not belong to this inbox',
          });
          continue;
        }

        const actorProfile = profilesByHandle.get(action.actor);

        if (!actorProfile) {
          rejectedActions.push({
            actionId: action.id,
            actor: action.actor,
            reason: 'Actor profile is not loaded',
          });
          continue;
        }

        if (await verifyAction(action, actorProfile)) {
          actions.push(action);
        } else {
          rejectedActions.push({
            actionId: action.id,
            actor: action.actor,
            reason: 'Signature verification failed',
          });
        }
      }
    } catch (error) {
      failures.push({
        source: inboxUrl,
        reason: error instanceof Error ? error.message : 'Unknown action inbox loading error',
      });
    }
  }

  return { actions: dedupeActions(actions), rejectedActions, failures };
}

async function loadProfileFeed(
  profileUrl: string,
  fetcher: JsonFetcher,
): Promise<
  | {
      profile: OpenSocialNetworkIdentity;
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

function parseIdentity(value: unknown): OpenSocialNetworkIdentity {
  if (!isRecord(value)) {
    throw new Error('Profile response is not an object');
  }

  if (
    value.protocol !== 'open-social-network' ||
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
    throw new Error('Profile response is not a valid Open Social Network identity file');
  }

  return value as unknown as OpenSocialNetworkIdentity;
}

function parseFeed(value: unknown): OpenSocialNetworkFeed {
  if (!isRecord(value)) {
    throw new Error('Feed response is not an object');
  }

  if (
    value.protocol !== 'open-social-network' ||
    value.version !== '0.1' ||
    typeof value.author !== 'string' ||
    !Array.isArray(value.posts)
  ) {
    throw new Error('Feed response is not a valid Open Social Network feed file');
  }

  return value as unknown as OpenSocialNetworkFeed;
}

function parseActionInbox(value: unknown): OpenSocialNetworkActionInbox {
  if (!isRecord(value)) {
    throw new Error('Action inbox response is not an object');
  }

  if (
    value.protocol !== 'open-social-network' ||
    value.version !== '0.1' ||
    typeof value.owner !== 'string' ||
    !Array.isArray(value.actions)
  ) {
    throw new Error('Action inbox response is not a valid Open Social Network action inbox file');
  }

  return {
    protocol: 'open-social-network',
    version: '0.1',
    owner: value.owner,
    actions: value.actions.filter(isSignedAction),
  };
}

function isSignedAction(value: unknown): value is OpenSocialNetworkAction {
  if (!isRecord(value)) {
    return false;
  }

  const action = value as Partial<OpenSocialNetworkAction>;

  return (
    typeof action.id === 'string' &&
    typeof action.actor === 'string' &&
    typeof action.createdAt === 'string' &&
    action.target?.type === 'post' &&
    typeof action.target.id === 'string' &&
    typeof action.target.author === 'string' &&
    action.signature?.alg === 'ES256' &&
    typeof action.signature.value === 'string' &&
    ((action.kind === 'reaction' &&
      (action.reaction === 'like' || action.reaction === 'dislike' || action.reaction === 'none')) ||
      (action.kind === 'comment' && typeof action.content === 'string'))
  );
}

function dedupeActions(actions: OpenSocialNetworkAction[]): OpenSocialNetworkAction[] {
  const actionsById = new Map<string, OpenSocialNetworkAction>();

  for (const action of actions) {
    if (!actionsById.has(action.id)) {
      actionsById.set(action.id, action);
    }
  }

  return [...actionsById.values()];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
