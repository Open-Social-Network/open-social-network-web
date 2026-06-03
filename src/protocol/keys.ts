const KEY_ALGORITHM: EcKeyGenParams = {
  name: 'ECDSA',
  namedCurve: 'P-256',
};

export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(KEY_ALGORITHM, true, ['sign', 'verify']);
}

export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', publicKey);
}

export async function exportPrivateKeyJwk(privateKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', privateKey);
}

export async function importPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, KEY_ALGORITHM, true, ['verify']);
}

export async function importPrivateKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, KEY_ALGORITHM, true, ['sign']);
}
