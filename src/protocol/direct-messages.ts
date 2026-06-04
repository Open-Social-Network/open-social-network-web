import { base64UrlToBytes, bytesToBase64Url } from './base64url';
import { canonicalStringify, directMessageSigningPayload } from './canonical';
import {
  exportMessagePublicKeyJwk,
  importMessagePublicKeyJwk,
  importPublicKeyJwk,
} from './keys';
import type {
  OpenSocialNetworkDirectMessage,
  OpenSocialNetworkIdentity,
  UnsignedOpenSocialNetworkDirectMessage,
} from './types';

const SIGNING_ALGORITHM: EcdsaParams = {
  name: 'ECDSA',
  hash: 'SHA-256',
};

const MESSAGE_KEY_ALGORITHM: EcKeyGenParams = {
  name: 'ECDH',
  namedCurve: 'P-256',
};

const MESSAGE_ENCRYPTION_ALGORITHM = 'ECDH-P256-A256GCM' as const;

export interface DirectMessageDraft {
  id: string;
  sender: string;
  recipient: string;
  createdAt: string;
}

export async function encryptDirectMessage(
  draft: DirectMessageDraft,
  plaintext: string,
  senderPrivateKey: CryptoKey,
  recipientMessagePublicKey: CryptoKey,
): Promise<OpenSocialNetworkDirectMessage> {
  const ephemeralKeys = await crypto.subtle.generateKey(MESSAGE_KEY_ALGORITHM, true, ['deriveKey']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptionHeader = {
    alg: MESSAGE_ENCRYPTION_ALGORITHM,
    epk: await exportMessagePublicKeyJwk(ephemeralKeys.publicKey),
    iv: bytesToBase64Url(iv.buffer),
  };
  const unsignedHeader = directMessageHeader(draft, encryptionHeader);
  const aesKey = await deriveMessageKey(ephemeralKeys.privateKey, recipientMessagePublicKey);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: directMessageAdditionalData(unsignedHeader),
    },
    aesKey,
    new TextEncoder().encode(plaintext),
  );
  const unsignedMessage: UnsignedOpenSocialNetworkDirectMessage = {
    ...unsignedHeader,
    encryption: {
      ...unsignedHeader.encryption,
      ciphertext: bytesToBase64Url(ciphertext),
    },
  };
  const signaturePayload = new TextEncoder().encode(
    canonicalStringify(directMessageSigningPayload(unsignedMessage)),
  );
  const signature = await crypto.subtle.sign(SIGNING_ALGORITHM, senderPrivateKey, signaturePayload);

  return {
    ...unsignedMessage,
    signature: {
      alg: 'ES256',
      value: bytesToBase64Url(signature),
    },
  };
}

export async function verifyDirectMessage(
  message: OpenSocialNetworkDirectMessage,
  senderIdentity: OpenSocialNetworkIdentity,
): Promise<boolean> {
  if (
    message.protocol !== 'open-social-network' ||
    message.version !== '0.1' ||
    message.kind !== 'direct-message' ||
    message.sender !== senderIdentity.handle ||
    message.encryption.alg !== MESSAGE_ENCRYPTION_ALGORITHM ||
    message.signature?.alg !== 'ES256'
  ) {
    return false;
  }

  try {
    const publicKey = await importPublicKeyJwk(senderIdentity.publicKey.jwk);
    const payload = new TextEncoder().encode(canonicalStringify(directMessageSigningPayload(message)));

    return crypto.subtle.verify(
      SIGNING_ALGORITHM,
      publicKey,
      base64UrlToBytes(message.signature.value),
      payload,
    );
  } catch {
    return false;
  }
}

export async function decryptDirectMessage(
  message: OpenSocialNetworkDirectMessage,
  recipientMessagePrivateKey: CryptoKey,
  senderIdentity: OpenSocialNetworkIdentity,
): Promise<string> {
  if (!(await verifyDirectMessage(message, senderIdentity))) {
    throw new Error('Direct message signature is invalid');
  }

  try {
    const ephemeralPublicKey = await importMessagePublicKeyJwk(message.encryption.epk);
    const aesKey = await deriveMessageKey(recipientMessagePrivateKey, ephemeralPublicKey);
    const unsignedHeader = directMessageHeader(message, {
      alg: message.encryption.alg,
      epk: message.encryption.epk,
      iv: message.encryption.iv,
    });
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64UrlToBytes(message.encryption.iv),
        additionalData: directMessageAdditionalData(unsignedHeader),
      },
      aesKey,
      base64UrlToBytes(message.encryption.ciphertext),
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('Direct message could not be decrypted');
  }
}

async function deriveMessageKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

function directMessageHeader(
  draft: Pick<DirectMessageDraft, 'id' | 'sender' | 'recipient' | 'createdAt'>,
  encryption: Omit<UnsignedOpenSocialNetworkDirectMessage['encryption'], 'ciphertext'>,
): Omit<UnsignedOpenSocialNetworkDirectMessage, 'encryption'> & {
  encryption: Omit<UnsignedOpenSocialNetworkDirectMessage['encryption'], 'ciphertext'>;
} {
  return {
    protocol: 'open-social-network',
    version: '0.1',
    kind: 'direct-message',
    id: draft.id,
    sender: draft.sender,
    recipient: draft.recipient,
    createdAt: draft.createdAt,
    encryption,
  };
}

function directMessageAdditionalData(
  messageHeader: Omit<UnsignedOpenSocialNetworkDirectMessage, 'encryption'> & {
    encryption: Omit<UnsignedOpenSocialNetworkDirectMessage['encryption'], 'ciphertext'>;
  },
): ArrayBuffer {
  const bytes = new TextEncoder().encode(canonicalStringify(messageHeader));

  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
