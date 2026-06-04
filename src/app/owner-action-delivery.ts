import type { OpenSocialNetworkAction, OpenSocialNetworkIdentity } from '../protocol/types';

export interface PreparedOwnerActionDelivery {
  action: OpenSocialNetworkAction;
  inboxUrl: string;
}

export interface OwnerActionDeliveryOptions {
  fetcher?: typeof fetch;
}

export interface PrepareOwnerActionDeliveryOptions {
  profileBaseUrl?: string;
}

export type OwnerActionDeliveryResult =
  | {
      status: 'sent';
      inboxUrl: string;
    }
  | {
      status: 'prepared';
      inboxUrl: string;
      reason: string;
    };

export function prepareOwnerActionDelivery(
  action: OpenSocialNetworkAction,
  recipient: OpenSocialNetworkIdentity,
  options: PrepareOwnerActionDeliveryOptions = {},
): PreparedOwnerActionDelivery {
  return {
    action,
    inboxUrl: resolveRecipientActionInboxUrl(recipient, options.profileBaseUrl),
  };
}

export async function deliverOwnerAction(
  prepared: PreparedOwnerActionDelivery,
  options: OwnerActionDeliveryOptions = {},
): Promise<OwnerActionDeliveryResult> {
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(prepared.inboxUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(prepared.action),
    });

    if (response.status === 201 || response.status === 202 || response.status === 204) {
      return {
        status: 'sent',
        inboxUrl: prepared.inboxUrl,
      };
    }

    return {
      status: 'prepared',
      inboxUrl: prepared.inboxUrl,
      reason: `Action inbox returned HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'prepared',
      inboxUrl: prepared.inboxUrl,
      reason: error instanceof Error ? error.message : 'Action inbox did not accept the update',
    };
  }
}

export function needsManualActionPublish(result: OwnerActionDeliveryResult): boolean {
  return result.status === 'prepared';
}

function resolveRecipientActionInboxUrl(
  recipient: OpenSocialNetworkIdentity,
  profileBaseUrl?: string,
): string {
  const endpoint = recipient.endpoints.actions;

  if (!endpoint) {
    throw new Error('This profile does not accept automatic public actions yet');
  }

  if (isAbsoluteUrl(endpoint)) {
    return endpoint;
  }

  const baseUrl = profileBaseUrl ?? recipient.endpoints.profile;

  if (isAbsoluteUrl(baseUrl)) {
    return new URL(endpoint, baseUrl).toString();
  }

  return endpoint;
}

function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
