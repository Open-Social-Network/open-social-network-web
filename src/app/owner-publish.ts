import type { OwnerPublicUpdatesSummary } from './owner-actions';
import type { OpenSocialNetworkAction } from '../protocol/types';

const OWNER_PUBLISH_STORAGE_KEY = 'open-social-network.ownerPublishChanges.v1';

export interface OwnerPublishChanges {
  pageCreated: boolean;
  postCount: number;
  actions: OpenSocialNetworkAction[];
}

export interface OwnerPublishReadyInput {
  pageCreated: boolean;
  postCount: number;
  publicUpdates: OwnerPublicUpdatesSummary | null;
}

export interface OwnerPublishReadySummary {
  title: string;
  detail: string;
}

export function emptyOwnerPublishChanges(): OwnerPublishChanges {
  return {
    pageCreated: false,
    postCount: 0,
    actions: [],
  };
}

export function loadStoredOwnerPublishChanges(
  ownerHandle: string,
  storage: Storage = window.localStorage,
): OwnerPublishChanges {
  try {
    const storedValue = storage.getItem(OWNER_PUBLISH_STORAGE_KEY);

    if (!storedValue) {
      return emptyOwnerPublishChanges();
    }

    const parsed = JSON.parse(storedValue) as Partial<OwnerPublishChanges> & {
      ownerHandle?: unknown;
    };

    if (parsed.ownerHandle !== ownerHandle) {
      return emptyOwnerPublishChanges();
    }

    return {
      pageCreated: parsed.pageCreated === true,
      postCount:
        typeof parsed.postCount === 'number' &&
        Number.isInteger(parsed.postCount) &&
        parsed.postCount > 0
          ? parsed.postCount
          : 0,
      actions: Array.isArray(parsed.actions) ? parsed.actions.filter(isStoredAction) : [],
    };
  } catch {
    return emptyOwnerPublishChanges();
  }
}

export function saveStoredOwnerPublishChanges(
  ownerHandle: string,
  changes: OwnerPublishChanges,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(
    OWNER_PUBLISH_STORAGE_KEY,
    JSON.stringify({
      ownerHandle,
      pageCreated: changes.pageCreated,
      postCount: Math.max(0, Math.trunc(changes.postCount)),
      actions: changes.actions.filter(isStoredAction),
    }),
  );
}

export function clearStoredOwnerPublishChanges(storage: Storage = window.localStorage): void {
  storage.removeItem(OWNER_PUBLISH_STORAGE_KEY);
}

export function summarizeOwnerPublishReady(
  input: OwnerPublishReadyInput,
): OwnerPublishReadySummary | null {
  if (input.pageCreated) {
    return {
      title: 'Page ready to publish',
      detail: 'Download your public site to publish this page.',
    };
  }

  if (input.postCount === 0 && !input.publicUpdates) {
    return null;
  }

  if (input.postCount === 0) {
    return input.publicUpdates
      ? {
          title: input.publicUpdates.title,
          detail: input.publicUpdates.detail,
        }
      : null;
  }

  if (!input.publicUpdates) {
    return {
      title:
        input.postCount === 1
          ? 'Post ready to publish'
          : `${input.postCount} posts ready to publish`,
      detail: `Download your public site to publish your latest ${postLabel(input.postCount)}.`,
    };
  }

  const totalUpdates = input.postCount + input.publicUpdates.count;

  return {
    title: `${totalUpdates} updates ready to publish`,
    detail: `Download your public site to publish your latest ${postLabel(input.postCount)} and ${publicUpdateLabel(input.publicUpdates.count)}.`,
  };
}

function postLabel(count: number): string {
  return count === 1 ? 'post' : 'posts';
}

function publicUpdateLabel(count: number): string {
  return count === 1 ? 'public update' : 'public updates';
}

function isStoredAction(value: unknown): value is OpenSocialNetworkAction {
  if (!value || typeof value !== 'object') {
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
