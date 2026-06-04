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

export interface OpenSocialNetworkMessagePublicKey {
  alg: 'ECDH-P256';
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
  messagePublicKey?: OpenSocialNetworkMessagePublicKey;
  endpoints: {
    profile: string;
    feed: string;
    avatar?: string;
    messages?: string;
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

export type OpenSocialNetworkActionKind = 'reaction' | 'comment';
export type OpenSocialNetworkReaction = 'like' | 'dislike' | 'none';

export interface OpenSocialNetworkActionTarget {
  type: 'post';
  id: string;
  author: string;
  url?: string;
}

interface UnsignedOpenSocialNetworkActionBase {
  id: string;
  kind: OpenSocialNetworkActionKind;
  actor: string;
  createdAt: string;
  target: OpenSocialNetworkActionTarget;
}

export interface UnsignedOpenSocialNetworkReactionAction
  extends UnsignedOpenSocialNetworkActionBase {
  kind: 'reaction';
  reaction: OpenSocialNetworkReaction;
}

export interface UnsignedOpenSocialNetworkCommentAction
  extends UnsignedOpenSocialNetworkActionBase {
  kind: 'comment';
  content: string;
}

export type UnsignedOpenSocialNetworkAction =
  | UnsignedOpenSocialNetworkReactionAction
  | UnsignedOpenSocialNetworkCommentAction;

export type OpenSocialNetworkAction = UnsignedOpenSocialNetworkAction & {
  signature: OpenSocialNetworkSignature;
};

export interface OpenSocialNetworkActionLog {
  protocol: 'open-social-network';
  version: OpenSocialNetworkVersion;
  actor: string;
  actions: OpenSocialNetworkAction[];
}

export interface OpenSocialNetworkDirectMessageLog {
  protocol: 'open-social-network';
  version: OpenSocialNetworkVersion;
  owner: string;
  messages: unknown[];
}
