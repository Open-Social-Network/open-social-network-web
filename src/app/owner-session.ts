import { importPrivateKeyJwk } from '../protocol/keys';
import { signPost, verifyPost } from '../protocol/signing';
import type { TimelinePost, TimelineResult } from '../aggregator/timeline';
import type {
  OpenSocialNetworkFeed,
  OpenSocialNetworkIdentity,
  OpenSocialNetworkPost,
  UnsignedOpenSocialNetworkPost,
} from '../protocol/types';

const OWNER_STORAGE_KEY = 'open-social-network.ownerSession.v1';

export interface OwnerSession {
  profile: OpenSocialNetworkIdentity;
  feed: OpenSocialNetworkFeed;
  privateKeyJwk: JsonWebKey;
  pageUrl?: string;
}

export interface OwnerPostOptions {
  createdAt?: string;
  id?: string;
}

export async function connectOwnerPage(input: OwnerSession): Promise<OwnerSession> {
  assertValidProfile(input.profile);
  assertValidFeed(input.feed);

  if (input.feed.author !== input.profile.handle) {
    throw new Error('Owner feed author does not match the profile handle');
  }

  const privateKey = await importPrivateKeyJwk(input.privateKeyJwk);
  const proof = await signPost(
    {
      id: 'owner_proof',
      author: input.profile.handle,
      createdAt: '2026-01-01T00:00:00.000Z',
      content: 'Open Social Network owner proof',
    },
    privateKey,
  );

  if (!(await verifyPost(proof, input.profile))) {
    throw new Error('The private key does not match this profile public key');
  }

  for (const post of input.feed.posts) {
    if (!(await verifyPost(post, input.profile))) {
      throw new Error(`Post ${post.id} is not signed by this profile`);
    }
  }

  return {
    profile: input.profile,
    feed: input.feed,
    privateKeyJwk: input.privateKeyJwk,
    pageUrl: input.pageUrl,
  };
}

export async function signOwnerPost(
  session: OwnerSession,
  content: string,
  options: OwnerPostOptions = {},
): Promise<OwnerSession> {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error('Post content is required');
  }

  const privateKey = await importPrivateKeyJwk(session.privateKeyJwk);
  const createdAt = options.createdAt ?? new Date().toISOString();
  const post: UnsignedOpenSocialNetworkPost = {
    id: options.id ?? createPostId(createdAt),
    author: session.profile.handle,
    createdAt,
    content: trimmedContent,
  };
  const signedPost = await signPost(post, privateKey);

  if (!(await verifyPost(signedPost, session.profile))) {
    throw new Error('Signed post could not be verified with this profile');
  }

  return {
    ...session,
    feed: {
      ...session.feed,
      posts: [signedPost, ...session.feed.posts],
    },
  };
}

export function exportOwnerFeed(session: OwnerSession): string {
  return `${JSON.stringify(session.feed, null, 2)}\n`;
}

export function loadStoredOwnerSession(storage: Storage = window.localStorage): OwnerSession | null {
  try {
    const storedValue = storage.getItem(OWNER_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue) as Partial<OwnerSession>;

    assertValidProfile(parsed.profile as OpenSocialNetworkIdentity);
    assertValidFeed(parsed.feed as OpenSocialNetworkFeed);

    if (!isRecord(parsed.privateKeyJwk)) {
      return null;
    }

    return {
      profile: parsed.profile as OpenSocialNetworkIdentity,
      feed: parsed.feed as OpenSocialNetworkFeed,
      privateKeyJwk: parsed.privateKeyJwk,
      pageUrl: typeof parsed.pageUrl === 'string' ? parsed.pageUrl : undefined,
    };
  } catch {
    return null;
  }
}

export function saveStoredOwnerSession(
  session: OwnerSession,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(OWNER_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredOwnerSession(storage: Storage = window.localStorage): void {
  storage.removeItem(OWNER_STORAGE_KEY);
}

export function mergeOwnerTimeline(
  timeline: TimelineResult | null,
  session: OwnerSession | null,
): TimelineResult {
  const baseTimeline: TimelineResult = timeline ?? {
    profiles: [],
    posts: [],
    rejectedPosts: [],
    failures: [],
  };

  if (!session) {
    return baseTimeline;
  }

  const profilesByHandle = new Map<string, OpenSocialNetworkIdentity>();

  for (const profile of [session.profile, ...baseTimeline.profiles]) {
    profilesByHandle.set(profile.handle, profile);
  }

  const postsByKey = new Map<string, TimelinePost>();

  for (const post of [
    ...session.feed.posts.map((post) => ({ ...post, profile: session.profile })),
    ...baseTimeline.posts,
  ]) {
    postsByKey.set(`${post.author}:${post.id}`, post);
  }

  return {
    profiles: [...profilesByHandle.values()],
    posts: [...postsByKey.values()].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    rejectedPosts: baseTimeline.rejectedPosts,
    failures: baseTimeline.failures,
  };
}

function assertValidProfile(value: OpenSocialNetworkIdentity): void {
  if (
    value.protocol !== 'open-social-network' ||
    value.version !== '0.1' ||
    typeof value.handle !== 'string' ||
    typeof value.name !== 'string' ||
    value.publicKey?.alg !== 'ES256' ||
    !value.publicKey.jwk ||
    typeof value.endpoints?.profile !== 'string' ||
    typeof value.endpoints.feed !== 'string'
  ) {
    throw new Error('Profile file is not a valid Open Social Network identity');
  }
}

function assertValidFeed(value: OpenSocialNetworkFeed): void {
  if (
    value.protocol !== 'open-social-network' ||
    value.version !== '0.1' ||
    typeof value.author !== 'string' ||
    !Array.isArray(value.posts) ||
    !value.posts.every(isSignedPost)
  ) {
    throw new Error('Feed file is not a valid Open Social Network feed');
  }
}

function isSignedPost(value: unknown): value is OpenSocialNetworkPost {
  if (!isRecord(value)) {
    return false;
  }

  const post = value as Partial<OpenSocialNetworkPost>;

  return (
    typeof post.id === 'string' &&
    typeof post.author === 'string' &&
    typeof post.createdAt === 'string' &&
    typeof post.content === 'string' &&
    post.signature?.alg === 'ES256' &&
    typeof post.signature.value === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createPostId(createdAt: string): string {
  const normalizedTime = createdAt.replace(/[^0-9]/gu, '').slice(0, 17);
  const entropy = crypto.getRandomValues(new Uint32Array(1))[0]?.toString(36) ?? '0';

  return `post_${normalizedTime}_${entropy}`;
}
