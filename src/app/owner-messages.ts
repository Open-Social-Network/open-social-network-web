import { decryptDirectMessage, encryptDirectMessage } from '../protocol/direct-messages';
import {
  importMessagePrivateKeyJwk,
  importMessagePublicKeyJwk,
  importPrivateKeyJwk,
} from '../protocol/keys';
import type {
  OpenSocialNetworkDirectMessage,
  OpenSocialNetworkDirectMessageLog,
  OpenSocialNetworkIdentity,
} from '../protocol/types';
import type { OwnerSession } from './owner-session';

export interface OwnerDirectMessageOptions {
  createdAt?: string;
  id?: string;
  profileBaseUrl?: string;
}

export interface PreparedDirectMessage {
  message: OpenSocialNetworkDirectMessage;
  inboxUrl: string;
  fileName: string;
}

export interface DirectMessageDeliveryOptions {
  fetcher?: typeof fetch;
}

export interface ReadOwnerDirectMessageOptions {
  senderProfiles: OpenSocialNetworkIdentity[];
}

export interface ReadOwnerDirectMessage {
  id: string;
  sender: string;
  senderName: string;
  recipient: string;
  createdAt: string;
  content: string;
}

export interface ReadOwnerDirectMessageInbox {
  messages: ReadOwnerDirectMessage[];
  failures: string[];
}

export type DirectMessageDeliveryResult =
  | {
      status: 'sent';
      inboxUrl: string;
    }
  | {
      status: 'prepared';
      inboxUrl: string;
      reason: string;
    };

export async function createOwnerDirectMessage(
  session: OwnerSession,
  recipient: OpenSocialNetworkIdentity,
  content: string,
  options: OwnerDirectMessageOptions = {},
): Promise<PreparedDirectMessage> {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error('Message is required');
  }

  if (recipient.handle === session.profile.handle) {
    throw new Error('Choose another profile to message');
  }

  if (recipient.messagePublicKey?.alg !== 'ECDH-P256' || !recipient.messagePublicKey.jwk) {
    throw new Error('This profile cannot receive encrypted messages yet');
  }

  const senderPrivateKey = await importPrivateKeyJwk(session.privateKeyJwk);
  const recipientMessagePublicKey = await importMessagePublicKeyJwk(recipient.messagePublicKey.jwk);
  const createdAt = options.createdAt ?? new Date().toISOString();
  const message = await encryptDirectMessage(
    {
      id: options.id ?? createMessageId(createdAt),
      sender: session.profile.handle,
      recipient: recipient.handle,
      createdAt,
    },
    trimmedContent,
    senderPrivateKey,
    recipientMessagePublicKey,
  );

  return {
    message,
    inboxUrl: resolveRecipientInboxUrl(recipient, options.profileBaseUrl),
    fileName: `${message.id}.json`,
  };
}

export async function deliverDirectMessage(
  prepared: PreparedDirectMessage,
  options: DirectMessageDeliveryOptions = {},
): Promise<DirectMessageDeliveryResult> {
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(prepared.inboxUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(prepared.message),
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
      reason: `Inbox returned HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'prepared',
      inboxUrl: prepared.inboxUrl,
      reason: error instanceof Error ? error.message : 'Inbox did not accept the message',
    };
  }
}

export async function readOwnerDirectMessage(
  session: OwnerSession,
  message: OpenSocialNetworkDirectMessage,
  options: ReadOwnerDirectMessageOptions,
): Promise<ReadOwnerDirectMessage> {
  if (message.recipient !== session.profile.handle) {
    throw new Error('This message was sent to a different page.');
  }

  if (!session.messagePrivateKeyJwk) {
    throw new Error('Open your page folder again to read encrypted messages.');
  }

  const senderProfile = options.senderProfiles.find((profile) => profile.handle === message.sender);

  if (!senderProfile) {
    throw new Error("Follow or open the sender's page before reading this message.");
  }

  const recipientMessagePrivateKey = await importMessagePrivateKeyJwk(session.messagePrivateKeyJwk);
  const content = await decryptDirectMessage(message, recipientMessagePrivateKey, senderProfile);

  return {
    id: message.id,
    sender: message.sender,
    senderName: senderProfile.name,
    recipient: message.recipient,
    createdAt: message.createdAt,
    content,
  };
}

export async function readOwnerDirectMessageInbox(
  session: OwnerSession,
  messageLog: unknown,
  options: ReadOwnerDirectMessageOptions,
): Promise<ReadOwnerDirectMessageInbox> {
  if (!isDirectMessageLog(messageLog)) {
    throw new Error('Choose a valid Open Social Network message inbox.');
  }

  if (messageLog.owner !== session.profile.handle) {
    throw new Error('This message inbox belongs to another page.');
  }

  const messages: ReadOwnerDirectMessage[] = [];
  const failures: string[] = [];

  for (const value of messageLog.messages) {
    if (!isDirectMessage(value)) {
      failures.push('Skipped a message that was not a valid Open Social Network message.');
      continue;
    }

    try {
      messages.push(await readOwnerDirectMessage(session, value, options));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : 'Could not open one message.');
    }
  }

  messages.sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return { messages, failures };
}

function resolveRecipientInboxUrl(
  recipient: OpenSocialNetworkIdentity,
  profileBaseUrl?: string,
): string {
  const endpoint = recipient.endpoints.messages;

  if (!endpoint) {
    throw new Error('This profile cannot receive encrypted messages yet');
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

function createMessageId(createdAt: string): string {
  const entropy =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `message_${Date.parse(createdAt).toString(36)}_${entropy}`;
}

function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isDirectMessageLog(value: unknown): value is OpenSocialNetworkDirectMessageLog {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.protocol === 'open-social-network' &&
    value.version === '0.1' &&
    typeof value.owner === 'string' &&
    Array.isArray(value.messages)
  );
}

function isDirectMessage(value: unknown): value is OpenSocialNetworkDirectMessage {
  if (!isRecord(value) || !isRecord(value.encryption) || !isRecord(value.signature)) {
    return false;
  }

  return (
    value.protocol === 'open-social-network' &&
    value.version === '0.1' &&
    value.kind === 'direct-message' &&
    typeof value.id === 'string' &&
    typeof value.sender === 'string' &&
    typeof value.recipient === 'string' &&
    typeof value.createdAt === 'string' &&
    value.encryption.alg === 'ECDH-P256-A256GCM' &&
    isRecord(value.encryption.epk) &&
    typeof value.encryption.iv === 'string' &&
    typeof value.encryption.ciphertext === 'string' &&
    value.signature.alg === 'ES256' &&
    typeof value.signature.value === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
