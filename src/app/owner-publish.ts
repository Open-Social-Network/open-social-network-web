import type { OwnerPublicUpdatesSummary } from './owner-actions';
import type { OpenSocialNetworkAction } from '../protocol/types';

const OWNER_PUBLISH_STORAGE_KEY = 'open-social-network.ownerPublishChanges.v1';

export interface OwnerPublishChanges {
  pageCreated: boolean;
  postCount: number;
  followCount: number;
  actions: OpenSocialNetworkAction[];
}

export interface OwnerPublishReadyInput {
  pageCreated: boolean;
  postCount: number;
  followCount?: number;
  publicUpdates: OwnerPublicUpdatesSummary | null;
}

export interface OwnerPublishReadySummary {
  title: string;
  detail: string;
  downloadLabel: string;
  downloadTarget: 'public-site' | 'public-updates';
}

export function emptyOwnerPublishChanges(): OwnerPublishChanges {
  return {
    pageCreated: false,
    postCount: 0,
    followCount: 0,
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
      followCount:
        typeof parsed.followCount === 'number' &&
        Number.isInteger(parsed.followCount) &&
        parsed.followCount > 0
          ? parsed.followCount
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
      followCount: Math.max(0, Math.trunc(changes.followCount)),
      actions: changes.actions.filter(isStoredAction),
    }),
  );
}

export function clearStoredOwnerPublishChanges(storage: Storage = window.localStorage): void {
  storage.removeItem(OWNER_PUBLISH_STORAGE_KEY);
}

export function markOwnerPublishChangesPublished(
  storage: Storage = window.localStorage,
): OwnerPublishChanges {
  clearStoredOwnerPublishChanges(storage);
  return emptyOwnerPublishChanges();
}

export function summarizeOwnerPublishReady(
  input: OwnerPublishReadyInput,
): OwnerPublishReadySummary | null {
  const followCount = Math.max(0, Math.trunc(input.followCount ?? 0));

  if (input.pageCreated) {
    return {
      title: 'Page ready to publish',
      detail: 'Download your public site to publish this page.',
      downloadLabel: 'Download public site',
      downloadTarget: 'public-site',
    };
  }

  if (input.postCount === 0 && followCount === 0 && !input.publicUpdates) {
    return null;
  }

  if (input.postCount === 0 && followCount === 0) {
    return input.publicUpdates
      ? {
          title: input.publicUpdates.title,
          detail: input.publicUpdates.detail,
          downloadLabel: 'Download activity update',
          downloadTarget: 'public-updates',
        }
      : null;
  }

  if (input.postCount === 0 && !input.publicUpdates) {
    return {
      title: 'Follow list ready to publish',
      detail: 'Download your public site to publish your updated follows.',
      downloadLabel: 'Download public site',
      downloadTarget: 'public-site',
    };
  }

  if (!input.publicUpdates) {
    return {
      title:
        input.postCount === 1
          ? 'Post ready to publish'
          : `${input.postCount} posts ready to publish`,
      detail: `Download your public site to publish your latest ${postLabel(input.postCount)}.`,
      downloadLabel: 'Download public site',
      downloadTarget: 'public-site',
    };
  }

  const totalUpdates = input.postCount + input.publicUpdates.count + followCount;
  const updateLabels = [
    input.postCount > 0 ? postLabel(input.postCount) : null,
    input.publicUpdates.count > 0 ? publicUpdateLabel(input.publicUpdates.count) : null,
    followCount > 0 ? followLabel(followCount) : null,
  ].filter((label): label is string => Boolean(label));

  return {
    title: `${totalUpdates} updates ready to publish`,
    detail: `Download your public site to publish your latest ${joinReadableList(updateLabels)}.`,
    downloadLabel: 'Download public site',
    downloadTarget: 'public-site',
  };
}

function postLabel(count: number): string {
  return count === 1 ? 'post' : 'posts';
}

function publicUpdateLabel(count: number): string {
  return count === 1 ? 'activity update' : 'activity updates';
}

function followLabel(count: number): string {
  return count === 1 ? 'follow change' : 'follow changes';
}

function joinReadableList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? 'updates';
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
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
