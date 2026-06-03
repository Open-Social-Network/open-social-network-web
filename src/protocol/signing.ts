import { base64UrlToBytes, bytesToBase64Url } from './base64url';
import { canonicalStringify, postSigningPayload } from './canonical';
import { importPublicKeyJwk } from './keys';
import type {
  OpenSocialIdentity,
  OpenSocialPost,
  UnsignedOpenSocialPost,
} from './types';

const SIGNING_ALGORITHM: EcdsaParams = {
  name: 'ECDSA',
  hash: 'SHA-256',
};

export async function signPost(
  post: UnsignedOpenSocialPost,
  privateKey: CryptoKey,
): Promise<OpenSocialPost> {
  const payload = new TextEncoder().encode(canonicalStringify(postSigningPayload(post)));
  const signature = await crypto.subtle.sign(SIGNING_ALGORITHM, privateKey, payload);

  return {
    ...post,
    signature: {
      alg: 'ES256',
      value: bytesToBase64Url(signature),
    },
  };
}

export async function verifyPost(
  post: OpenSocialPost,
  identity: OpenSocialIdentity,
): Promise<boolean> {
  if (post.author !== identity.handle || post.signature?.alg !== 'ES256') {
    return false;
  }

  try {
    const publicKey = await importPublicKeyJwk(identity.publicKey.jwk);
    const payload = new TextEncoder().encode(canonicalStringify(postSigningPayload(post)));

    return crypto.subtle.verify(
      SIGNING_ALGORITHM,
      publicKey,
      base64UrlToBytes(post.signature.value),
      payload,
    );
  } catch {
    return false;
  }
}
