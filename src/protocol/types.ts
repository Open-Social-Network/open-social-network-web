export type OpenSocialVersion = '0.1';
export type OpenSocialSignatureAlgorithm = 'ES256';

export interface OpenSocialSignature {
  alg: OpenSocialSignatureAlgorithm;
  value: string;
}

export interface OpenSocialPublicKey {
  alg: OpenSocialSignatureAlgorithm;
  jwk: JsonWebKey;
}

export interface OpenSocialIdentity {
  protocol: 'opensocial';
  version: OpenSocialVersion;
  handle: string;
  name: string;
  bio?: string;
  avatar?: string;
  website?: string;
  publicKey: OpenSocialPublicKey;
  endpoints: {
    profile: string;
    feed: string;
    avatar?: string;
  };
}

export interface UnsignedOpenSocialPost {
  id: string;
  author: string;
  createdAt: string;
  content: string;
  replyTo?: string;
  links?: string[];
  media?: Array<{
    type: 'image' | 'video' | 'audio';
    url: string;
    alt?: string;
  }>;
}

export interface OpenSocialPost extends UnsignedOpenSocialPost {
  signature: OpenSocialSignature;
}

export interface OpenSocialFeed {
  protocol: 'opensocial';
  version: OpenSocialVersion;
  author: string;
  posts: OpenSocialPost[];
}
