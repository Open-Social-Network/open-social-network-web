export type OpenSocialNetworkVersion = '0.1';
export type OpenSocialNetworkSignatureAlgorithm = 'ES256';

export interface OpenSocialNetworkSignature {
  alg: OpenSocialNetworkSignatureAlgorithm;
  value: string;
}

export interface OpenSocialNetworkPublicKey {
  alg: OpenSocialNetworkSignatureAlgorithm;
  jwk: JsonWebKey;
}

export interface OpenSocialNetworkIdentity {
  protocol: 'open-social-network';
  version: OpenSocialNetworkVersion;
  handle: string;
  name: string;
  bio?: string;
  avatar?: string;
  website?: string;
  publicKey: OpenSocialNetworkPublicKey;
  endpoints: {
    profile: string;
    feed: string;
    avatar?: string;
  };
}

export interface UnsignedOpenSocialNetworkPost {
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

export interface OpenSocialNetworkPost extends UnsignedOpenSocialNetworkPost {
  signature: OpenSocialNetworkSignature;
}

export interface OpenSocialNetworkFeed {
  protocol: 'open-social-network';
  version: OpenSocialNetworkVersion;
  author: string;
  posts: OpenSocialNetworkPost[];
}
