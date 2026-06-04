import type { OpenSocialNetworkIdentity } from '../protocol/types';

export interface MessageAccessState {
  canSend: boolean;
  buttonDisabled: boolean;
  buttonTitle: string;
  notice: string | null;
}

export function messageAccessState(
  profile: OpenSocialNetworkIdentity,
  ownerHandle: string | undefined,
): MessageAccessState {
  if (!ownerHandle) {
    return {
      canSend: false,
      buttonDisabled: false,
      buttonTitle: 'Open your page to send messages',
      notice: 'Create or open your page to send messages.',
    };
  }

  if (ownerHandle === profile.handle) {
    return {
      canSend: false,
      buttonDisabled: false,
      buttonTitle: 'This is your page',
      notice: 'This is your page. Choose another profile to send a message.',
    };
  }

  if (
    profile.messagePublicKey?.alg === 'ECDH-P256' &&
    Boolean(profile.messagePublicKey.jwk) &&
    Boolean(profile.endpoints.messages)
  ) {
    return {
      canSend: true,
      buttonDisabled: false,
      buttonTitle: `Message ${profile.name}`,
      notice: null,
    };
  }

  return {
    canSend: false,
    buttonDisabled: false,
    buttonTitle: 'This page cannot receive messages yet',
    notice: `${profile.name} cannot receive messages yet.`,
  };
}
