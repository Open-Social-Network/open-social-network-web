import { importPrivateKeyJwk } from '../protocol/keys';
import { signAction, verifyAction } from '../protocol/public-actions';
import type {
  OpenSocialNetworkAction,
  OpenSocialNetworkActionTarget,
  OpenSocialNetworkReaction,
  UnsignedOpenSocialNetworkAction,
} from '../protocol/types';
import type { OwnerSession } from './owner-session';

const OWNER_ACTIONS_STORAGE_KEY = 'open-social-network.ownerActions.v1';

export interface OwnerActionOptions {
  createdAt?: string;
  id?: string;
}

export async function signOwnerReaction(
  session: OwnerSession,
  target: OpenSocialNetworkActionTarget,
  reaction: OpenSocialNetworkReaction,
  options: OwnerActionOptions = {},
): Promise<OpenSocialNetworkAction> {
  return signOwnerAction(
    session,
    {
      id: options.id ?? createActionId('reaction', options.createdAt),
      kind: 'reaction',
      actor: session.profile.handle,
      createdAt: options.createdAt ?? new Date().toISOString(),
      target,
      reaction,
    },
  );
}

export async function signOwnerComment(
  session: OwnerSession,
  target: OpenSocialNetworkActionTarget,
  content: string,
  options: OwnerActionOptions = {},
): Promise<OpenSocialNetworkAction> {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error('Comment is required');
  }

  return signOwnerAction(
    session,
    {
      id: options.id ?? createActionId('comment', options.createdAt),
      kind: 'comment',
      actor: session.profile.handle,
      createdAt: options.createdAt ?? new Date().toISOString(),
      target,
      content: trimmedContent,
    },
  );
}

export function loadStoredOwnerActions(
  storage: Storage = window.localStorage,
): OpenSocialNetworkAction[] {
  try {
    const storedValue = storage.getItem(OWNER_ACTIONS_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsed = JSON.parse(storedValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSignedAction);
  } catch {
    return [];
  }
}

export function saveStoredOwnerActions(
  actions: OpenSocialNetworkAction[],
  storage: Storage = window.localStorage,
): void {
  storage.setItem(OWNER_ACTIONS_STORAGE_KEY, JSON.stringify(actions));
}

async function signOwnerAction(
  session: OwnerSession,
  action: UnsignedOpenSocialNetworkAction,
): Promise<OpenSocialNetworkAction> {
  const privateKey = await importPrivateKeyJwk(session.privateKeyJwk);
  const signedAction = await signAction(action, privateKey);

  if (!(await verifyAction(signedAction, session.profile))) {
    throw new Error('Signed action could not be verified with this profile');
  }

  return signedAction;
}

function createActionId(kind: 'reaction' | 'comment', createdAt?: string): string {
  const entropy =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${kind}_${Date.parse(createdAt ?? new Date().toISOString()).toString(36)}_${entropy}`;
}

function isSignedAction(value: unknown): value is OpenSocialNetworkAction {
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
