import { messageAccessState } from './message-access';
import { signedOutSocialActionMessage } from './social-action-access';
import type { OpenSocialNetworkIdentity } from '../protocol/types';

export interface ProfileMessageActionInput {
  profile: OpenSocialNetworkIdentity;
  ownerHandle: string | undefined;
  messageTargetKey: string;
  iconHtml?: string;
}

export function renderProfileMessageAction(input: ProfileMessageActionInput): string {
  const access = messageAccessState(input.profile, input.ownerHandle);
  const title = input.ownerHandle ? access.buttonTitle : signedOutSocialActionMessage('message');
  const disabled = access.buttonDisabled ? ' disabled' : '';

  return `
    <button
      class="icon-button profile-message-button"
      type="button"
      data-action="toggle-message"
      data-message-target-key="${escapeAttribute(input.messageTargetKey)}"
      aria-label="Message ${escapeAttribute(input.profile.name)}"
      title="${escapeAttribute(title)}"${disabled}
    >
      ${input.iconHtml ?? 'Message'}
    </button>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
