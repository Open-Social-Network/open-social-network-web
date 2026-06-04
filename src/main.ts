import { loadVerifiedTimeline, type TimelineResult } from './aggregator/timeline';
import { accountAccessCopy } from './app/account-access';
import { commentAuthorDisplay } from './app/comment-display';
import {
  focusOwnerPostComposer,
  shouldShowFloatingComposeButton,
} from './app/compose-shortcut';
import { loadDirectory } from './app/directory';
import { messageAccessState, type MessageAccessState } from './app/message-access';
import {
  deliverOwnerAction,
  needsManualActionPublish,
  prepareOwnerActionDelivery,
} from './app/owner-action-delivery';
import {
  loadStoredFollows,
  normalizeProfileUrl,
  saveStoredFollows,
  toggleFollow,
} from './app/follows';
import {
  loadStoredOwnerActions,
  loadOwnerActionsFromActionLog,
  saveStoredOwnerActions,
  signOwnerComment,
  signOwnerReaction,
  summarizeOwnerPublicUpdates,
} from './app/owner-actions';
import {
  createOwnerDirectMessage,
  deliverDirectMessage,
  readOwnerDirectMessage,
} from './app/owner-messages';
import {
  clearStoredOwnerPublishChanges,
  emptyOwnerPublishChanges,
  loadStoredOwnerPublishChanges,
  markOwnerPublishChangesPublished,
  saveStoredOwnerPublishChanges,
  summarizeOwnerPublishReady,
  type OwnerPublishChanges,
  type OwnerPublishReadySummary,
} from './app/owner-publish';
import type {
  PreparedDirectMessage,
  ReadOwnerDirectMessage as OwnerInboxMessage,
} from './app/owner-messages';
import {
  clearStoredOwnerSession,
  connectOwnerPage,
  createOwnerPage,
  exportOwnerFeed,
  exportOwnerSiteZip,
  loadStoredOwnerSession,
  mergeOwnerTimeline,
  saveStoredOwnerSession,
  signOwnerPost,
  type OwnerSession,
} from './app/owner-session';
import { profilePageAction } from './app/profile-actions';
import { profileAvatarUrl, profilePageUrl } from './app/profile-links';
import {
  focusMyPageAccess,
  focusOpenCommentComposer,
  focusOpenMessageComposer,
  socialInteractionCopy,
  signedOutSocialActionMessage,
  type SignedOutSocialAction,
} from './app/social-action-access';
import { summarizePostActions, type OpenSocialNetworkPostActionSummary } from './protocol/public-actions';
import type {
  OpenSocialNetworkAction,
  OpenSocialNetworkActionTarget,
  OpenSocialNetworkDirectMessage,
  OpenSocialNetworkIdentity,
  OpenSocialNetworkReaction,
} from './protocol/types';
import './styles.css';

type MessageStatus =
  | {
      targetKey: string;
      kind: 'sent';
      text: string;
    }
  | {
      targetKey: string;
      kind: 'prepared';
      text: string;
      downloadHref: string;
      downloadName: string;
    };

interface AppState {
  directoryProfiles: string[];
  follows: string[];
  timeline: TimelineResult | null;
  owner: OwnerSession | null;
  actions: OpenSocialNetworkAction[];
  pendingPublish: OwnerPublishChanges;
  loading: boolean;
  error: string | null;
  ownerError: string | null;
  commentTargetKey: string | null;
  messageTargetKey: string | null;
  messageStatus: MessageStatus | null;
  inboxMessages: OwnerInboxMessage[];
  inboxError: string | null;
}

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('Missing #app root element');
}

const app: HTMLDivElement = appRoot;

const state: AppState = {
  directoryProfiles: [],
  follows: [],
  timeline: null,
  owner: null,
  actions: [],
  pendingPublish: emptyOwnerPublishChanges(),
  loading: true,
  error: null,
  ownerError: null,
  commentTargetKey: null,
  messageTargetKey: null,
  messageStatus: null,
  inboxMessages: [],
  inboxError: null,
};

void boot();

async function boot(): Promise<void> {
  render();

  try {
    state.owner = loadStoredOwnerSession();
    state.actions = loadStoredOwnerActions();
    state.pendingPublish = state.owner
      ? loadStoredOwnerPublishChanges(state.owner.profile.handle)
      : emptyOwnerPublishChanges();

    if (state.pendingPublish.actions.length > 0) {
      state.actions = mergeActionsById(state.pendingPublish.actions, state.actions);
      saveStoredOwnerActions(state.actions);
    }

    state.directoryProfiles = await loadDirectory();
    state.follows = loadStoredFollows(state.directoryProfiles);
    await refreshTimeline();
  } catch (error) {
    state.loading = false;
    state.error = error instanceof Error ? error.message : 'Could not start Open Social Network';
    render();
  }
}

async function refreshTimeline(): Promise<void> {
  state.loading = true;
  state.error = null;
  render();

  try {
    state.timeline = await loadVerifiedTimeline(state.follows);
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Could not load timeline';
  } finally {
    state.loading = false;
    render();
  }
}

function render(): void {
  app.innerHTML = `
    <main class="shell">
      <section class="topbar">
        <div class="brand">
          <img class="brand-logo" src="/assets/open-social-network-logo.png" alt="" aria-hidden="true" />
          <div>
            <h1>Open Social Network</h1>
            <p>Read, create, post, publish anywhere</p>
          </div>
        </div>
        <button class="button button-primary" data-action="refresh" type="button">
          ${state.loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <section class="workspace">
        <aside class="panel follows-panel" aria-label="Profiles">
          <div class="panel-header">
            <h2>Profiles</h2>
            <span>${state.follows.length} followed</span>
          </div>
          ${renderFollowForm()}
          <div class="profile-list">
            ${renderProfiles()}
          </div>
        </aside>

        <section class="timeline-panel" aria-label="Timeline">
          ${renderTimelineSummary()}
          <div class="timeline">
            ${renderTimeline()}
          </div>
        </section>

        <aside class="panel diagnostics-panel" aria-label="My Page and Verification">
          ${renderOwnerPanel()}
          <div class="panel-divider"></div>
          <div class="panel-header">
            <h2>Verification</h2>
            <span>${currentTimeline().rejectedPosts.length} rejected</span>
          </div>
          ${renderDiagnostics()}
        </aside>
      </section>
      ${renderFloatingComposeButton()}
    </main>
  `;

  bindEvents();
}

function bindEvents(): void {
  app.querySelector<HTMLButtonElement>('[data-action="refresh"]')?.addEventListener('click', () => {
    void refreshTimeline();
  });

  app.querySelector<HTMLFormElement>('[data-form="follow"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const input = form.elements.namedItem('profileUrl') as HTMLInputElement | null;

    if (!input?.value.trim()) {
      return;
    }

    try {
      const profileUrl = normalizeProfileUrl(input.value, window.location.href);

      if (!state.follows.includes(profileUrl)) {
        state.follows = [...state.follows, profileUrl];
        state.directoryProfiles = [...new Set([...state.directoryProfiles, profileUrl])];
        saveStoredFollows(state.follows);
      }

      input.value = '';
      void refreshTimeline();
    } catch {
      state.error = 'Enter a valid Open Social Network page link';
      render();
    }
  });

  for (const button of app.querySelectorAll<HTMLButtonElement>('[data-profile-url]')) {
    button.addEventListener('click', () => {
      const profileUrl = button.dataset.profileUrl;

      if (!profileUrl) {
        return;
      }

      state.follows = toggleFollow(state.follows, profileUrl);
      saveStoredFollows(state.follows);
      void refreshTimeline();
    });
  }

  const ownerFolderInput = app.querySelector<HTMLInputElement>('[data-owner-folder]');
  ownerFolderInput?.addEventListener('change', () => {
    void connectOwnerFromFolder(ownerFolderInput.files);
  });

  app.querySelector<HTMLFormElement>('[data-form="owner-create"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void createOwnerFromForm(event.currentTarget as HTMLFormElement);
  });

  app.querySelector<HTMLFormElement>('[data-form="owner-post"]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void publishOwnerPost(event.currentTarget as HTMLFormElement);
  });

  for (const button of app.querySelectorAll<HTMLButtonElement>('[data-owner-download]')) {
    button.addEventListener('click', () => {
      const includePrivate = button.dataset.ownerDownload === 'full';
      downloadOwnerSite(includePrivate);
    });
  }

  const ownerMessageInput = app.querySelector<HTMLInputElement>('[data-owner-message-file]');
  ownerMessageInput?.addEventListener('change', () => {
    void openOwnerMessageFiles(ownerMessageInput.files);
  });

  app.querySelector<HTMLButtonElement>('[data-action="owner-disconnect"]')?.addEventListener('click', () => {
    clearStoredOwnerSession();
    state.owner = null;
    state.ownerError = null;
    state.commentTargetKey = null;
    state.messageTargetKey = null;
    state.messageStatus = null;
    state.inboxMessages = [];
    state.inboxError = null;
    state.pendingPublish = emptyOwnerPublishChanges();
    clearStoredOwnerPublishChanges();
    render();
  });

  app.querySelector<HTMLButtonElement>('[data-action="owner-published"]')?.addEventListener('click', () => {
    state.pendingPublish = markOwnerPublishChangesPublished();
    state.ownerError = null;
    render();
  });

  app.querySelector<HTMLButtonElement>('[data-action="focus-owner-post"]')?.addEventListener('click', () => {
    if (focusOwnerPostComposer(app)) {
      state.ownerError = null;
      return;
    }

    state.ownerError = 'Open your page to post.';
    render();
  });

  for (const button of app.querySelectorAll<HTMLButtonElement>('[data-post-reaction]')) {
    button.addEventListener('click', () => {
      void reactToPost(button);
    });
  }

  for (const button of app.querySelectorAll<HTMLButtonElement>('[data-action="toggle-comment"]')) {
    button.addEventListener('click', () => {
      const targetKey = button.dataset.targetKey;

      if (!targetKey) {
        return;
      }

      if (!state.owner) {
        showSignedOutSocialPrompt('comment');
        return;
      }

      state.commentTargetKey = state.commentTargetKey === targetKey ? null : targetKey;
      state.messageTargetKey = null;
      state.ownerError = null;
      render();
      focusOpenCommentComposer(app);
    });
  }

  for (const button of app.querySelectorAll<HTMLButtonElement>('[data-action="toggle-message"]')) {
    button.addEventListener('click', () => {
      const targetKey = button.dataset.messageTargetKey;

      if (!targetKey) {
        return;
      }

      if (!state.owner) {
        showSignedOutSocialPrompt('message');
        return;
      }

      state.messageTargetKey = state.messageTargetKey === targetKey ? null : targetKey;
      state.commentTargetKey = null;
      state.ownerError = null;
      render();
      focusOpenMessageComposer(app);
    });
  }

  for (const form of app.querySelectorAll<HTMLFormElement>('[data-form="post-comment"]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void commentOnPost(form);
    });
  }

  for (const form of app.querySelectorAll<HTMLFormElement>('[data-form="direct-message"]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void sendDirectMessage(form);
    });
  }
}

function renderFollowForm(): string {
  return `
    <form class="follow-form" data-form="follow">
      <label class="sr-only" for="profileUrl">Profile link</label>
      <input id="profileUrl" name="profileUrl" type="text" inputmode="url" placeholder="Paste a profile page link" />
      <button class="button button-secondary" type="submit">Follow</button>
    </form>
  `;
}

function renderProfiles(): string {
  const timeline = currentTimeline();
  const profilesByUrl = new Map(
    timeline.profiles.map((profile) => [profile.endpoints.profile, profile]),
  );
  const knownProfiles = [...new Set([...state.directoryProfiles, ...state.follows])];

  if (knownProfiles.length === 0) {
    return '<p class="empty-state">No profiles loaded.</p>';
  }

  return knownProfiles
    .map((profileUrl) => {
      const profile =
        profilesByUrl.get(profileUrl) ??
        timeline.profiles.find((item) => item.endpoints.profile === new URL(profileUrl).pathname);
      const followed = state.follows.includes(profileUrl);
      const name = profile?.name ?? shortUrl(profileUrl);
      const handle = profile?.handle ?? profileUrl;
      const pageUrl = profile ? profilePageUrl(profile, profileUrl) : profileUrl;
      const avatarUrl = profile ? profileAvatarUrl(profile, profileUrl) : null;

      return `
        <article class="profile-row ${followed ? 'profile-row-active' : ''}">
          <a class="profile-link" href="${escapeAttribute(pageUrl)}" aria-label="Open ${escapeAttribute(name)} page">
            ${renderAvatar(name, avatarUrl, 'profile-picture')}
            <span class="profile-copy">
              <strong>${escapeHtml(name)}</strong>
              <span>${escapeHtml(handle)}</span>
            </span>
          </a>
          <button
            class="icon-button ${followed ? 'icon-button-active' : ''}"
            type="button"
            data-profile-url="${escapeAttribute(profileUrl)}"
            aria-label="${followed ? 'Unfollow' : 'Follow'} ${escapeAttribute(name)}"
            title="${followed ? 'Unfollow' : 'Follow'}"
          >
            ${followed ? 'On' : 'Off'}
          </button>
        </article>
      `;
    })
    .join('');
}

function renderTimelineSummary(): string {
  const timeline = currentTimeline();
  const postCount = timeline.posts.length;
  const profileCount = timeline.profiles.length;

  return `
    <div class="timeline-summary">
      <div>
        <h2>Timeline</h2>
        <p>${postCount} verified posts from ${profileCount} profiles</p>
      </div>
      <div class="status-pill ${state.error ? 'status-error' : ''}">
        ${state.error ? 'Needs attention' : state.loading ? 'Loading' : 'Verified'}
      </div>
    </div>
    ${state.error ? `<p class="app-error">${escapeHtml(state.error)}</p>` : ''}
  `;
}

function renderTimeline(): string {
  const timeline = currentTimeline();

  if (state.loading && !state.timeline && !state.owner) {
    return renderSkeletonPosts();
  }

  if (timeline.posts.length === 0) {
    return '<p class="empty-state">Follow a profile to load signed posts.</p>';
  }

  return timeline.posts
    .map(
      (post) => {
        const pageUrl = profilePageUrl(post.profile, window.location.href);
        const avatarUrl = profileAvatarUrl(post.profile, window.location.href);
        const target = postActionTarget(post);
        const targetKey = encodeActionTarget(target);
        const messageTargetKey = encodeMessageTarget(post.profile, targetKey);
        const actionSummary = summarizePostActions(visibleActions(), target);
        const pageAction = profilePageAction(post.profile.name);

        return `
        <article class="post-card">
          <header>
            <a class="post-author-link" href="${escapeAttribute(pageUrl)}" aria-label="Open ${escapeAttribute(post.profile.name)} page">
              ${renderAvatar(post.profile.name, avatarUrl, 'avatar')}
              <span>
                <h3>${escapeHtml(post.profile.name)}</h3>
                <p>${escapeHtml(post.author)} · ${formatDate(post.createdAt)}</p>
              </span>
            </a>
            <a
              class="button button-secondary post-view-page"
              href="${escapeAttribute(pageUrl)}"
              aria-label="${escapeAttribute(pageAction.ariaLabel)}"
            >
              ${escapeHtml(pageAction.label)}
            </a>
          </header>
          <p class="post-content">${escapeHtml(post.content)}</p>
          ${renderPostActions(target, targetKey, actionSummary, post.profile, messageTargetKey)}
          ${renderPostComments(actionSummary, currentTimeline().profiles)}
          <details class="technical-details post-details">
            <summary>Technical details</summary>
            <span>Signature algorithm: ES256</span>
            <code>${escapeHtml(post.signature.value.slice(0, 18))}...</code>
          </details>
        </article>
      `;
      },
    )
    .join('');
}

function renderPostActions(
  target: OpenSocialNetworkActionTarget,
  targetKey: string,
  summary: OpenSocialNetworkPostActionSummary,
  profile: OpenSocialNetworkIdentity,
  messageTargetKey: string,
): string {
  const ownerHandle = state.owner?.profile.handle;
  const activeReaction = ownerHandle ? summary.reactionsByActor[ownerHandle] : null;
  const reactionTitle = state.owner ? '' : ` title="${signedOutSocialActionMessage('react')}"`;
  const commentTitle = state.owner ? '' : ` title="${signedOutSocialActionMessage('comment')}"`;
  const commentOpen = state.commentTargetKey === targetKey;
  const messageAccess = messageAccessState(profile, ownerHandle);
  const messageOpen = state.messageTargetKey === messageTargetKey;
  const messageDisabled = messageAccess.buttonDisabled ? 'disabled' : '';
  const messageTitle = state.owner ? messageAccess.buttonTitle : signedOutSocialActionMessage('message');

  return `
    <footer class="post-social-bar" aria-label="Post actions">
      <button
        class="post-action-button ${activeReaction === 'like' ? 'post-action-active' : ''}"
        type="button"
        data-post-reaction="like"
        data-target-key="${escapeAttribute(targetKey)}"
        aria-label="Like post"
        ${reactionTitle}
      >
        ${heartIcon(activeReaction === 'like')}
        <span>${summary.likes}</span>
      </button>
      <button
        class="post-action-button ${activeReaction === 'dislike' ? 'post-action-active' : ''}"
        type="button"
        data-post-reaction="dislike"
        data-target-key="${escapeAttribute(targetKey)}"
        aria-label="Dislike post"
        ${reactionTitle}
      >
        ${thumbDownIcon(activeReaction === 'dislike')}
        <span>${summary.dislikes}</span>
      </button>
      <button
        class="post-action-button ${commentOpen ? 'post-action-active' : ''}"
        type="button"
        data-action="toggle-comment"
        data-target-key="${escapeAttribute(targetKey)}"
        aria-label="Comment on post"
        ${commentTitle}
      >
        ${commentIcon()}
        <span>${summary.comments.length}</span>
      </button>
      <button
        class="post-action-button ${messageOpen ? 'post-action-active' : ''}"
        type="button"
        data-action="toggle-message"
        data-message-target-key="${escapeAttribute(messageTargetKey)}"
        aria-label="Message ${escapeAttribute(profile.name)}"
        ${messageDisabled}
        title="${escapeAttribute(messageTitle)}"
      >
        ${messageIcon()}
      </button>
    </footer>
    ${
      commentOpen
        ? `
          <form class="post-comment-form" data-form="post-comment">
            <input type="hidden" name="targetKey" value="${escapeAttribute(targetKey)}" />
            <label class="sr-only" for="comment-${escapeAttribute(target.id)}">Comment</label>
            <textarea id="comment-${escapeAttribute(target.id)}" name="content" rows="2" maxlength="600" placeholder="${socialInteractionCopy.commentPlaceholder}"></textarea>
            <button class="button button-primary" type="submit">${socialInteractionCopy.commentSubmit}</button>
          </form>
        `
        : ''
    }
    ${messageOpen ? renderMessageComposer(profile, messageTargetKey, messageAccess) : ''}
  `;
}

function renderMessageComposer(
  profile: OpenSocialNetworkIdentity,
  targetKey: string,
  access: MessageAccessState,
): string {
  const status = state.messageStatus?.targetKey === targetKey ? state.messageStatus : null;

  if (!access.canSend) {
    return `
      <section class="post-message-form post-message-notice" aria-label="Message ${escapeAttribute(profile.name)}">
        <strong>Messages unavailable</strong>
        <p>${escapeHtml(access.notice ?? 'This profile cannot receive encrypted messages yet.')}</p>
      </section>
    `;
  }

  return `
    <form class="post-message-form" data-form="direct-message">
      <input type="hidden" name="targetKey" value="${escapeAttribute(targetKey)}" />
      <label class="sr-only" for="message-${escapeAttribute(targetKey)}">Message ${escapeHtml(profile.name)}</label>
      <textarea id="message-${escapeAttribute(targetKey)}" name="content" rows="3" maxlength="1200" placeholder="${socialInteractionCopy.messagePlaceholder}"></textarea>
      <button class="button button-primary" type="submit">${socialInteractionCopy.messageSubmit}</button>
    </form>
    ${status ? renderMessageStatus(status) : ''}
  `;
}

function renderMessageStatus(status: MessageStatus): string {
  if (status.kind === 'sent') {
    return `<p class="message-status message-status-sent">${escapeHtml(status.text)}</p>`;
  }

  return `
    <p class="message-status message-status-prepared">
      ${escapeHtml(status.text)}
      <a href="${escapeAttribute(status.downloadHref)}" download="${escapeAttribute(status.downloadName)}">${socialInteractionCopy.messageDownload}</a>
    </p>
  `;
}

function renderPostComments(
  summary: OpenSocialNetworkPostActionSummary,
  profiles: OpenSocialNetworkIdentity[],
): string {
  if (summary.comments.length === 0) {
    return '';
  }

  return `
    <div class="post-comments" aria-label="Comments">
      ${summary.comments
        .map((comment) => {
          const author = commentAuthorDisplay(comment.actor, profiles);
          const avatarUrl = author.profile ? profileAvatarUrl(author.profile, window.location.href) : null;

          return `
            <article class="post-comment">
              <div class="post-comment-author">
                ${renderAvatar(author.name, avatarUrl, 'comment-avatar')}
                <span>
                  <strong>${escapeHtml(author.name)}</strong>
                  ${author.handle ? `<span>${escapeHtml(author.handle)}</span>` : ''}
                </span>
              </div>
              <p>${escapeHtml(comment.content)}</p>
            </article>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderDiagnostics(): string {
  const timeline = currentTimeline();

  if (!state.timeline && !state.owner) {
    return '<p class="empty-state">Diagnostics load with the timeline.</p>';
  }

  const rejected = timeline.rejectedPosts
    .map(
      (post) => `
        <li>
          <strong>${escapeHtml(post.postId)}</strong>
          <span>${escapeHtml(post.reason)}</span>
        </li>
      `,
    )
    .join('');
  const failures = timeline.failures
    .map(
      (failure) => `
        <li>
          <strong>${escapeHtml(shortUrl(failure.source))}</strong>
          <span>${escapeHtml(failure.reason)}</span>
        </li>
      `,
    )
    .join('');

  if (!rejected && !failures) {
    return `
      <div class="trust-ok">
        <strong>All followed posts verified.</strong>
        <span>Each visible post matched its identity public key.</span>
      </div>
    `;
  }

  return `
    <ul class="diagnostic-list">
      ${rejected}
      ${failures}
    </ul>
  `;
}

function renderOwnerPanel(): string {
  const { connected, disconnected } = accountAccessCopy;

  if (!state.owner) {
    return `
      <section class="owner-panel" aria-label="My Page" data-owner-access>
        <div class="panel-header">
          <h2>My Page</h2>
          <span>${disconnected.status}</span>
        </div>
        <p class="owner-copy">Create a page, write posts, and host it anywhere.</p>
        ${state.ownerError ? `<p class="app-error">${escapeHtml(state.ownerError)}</p>` : ''}
        <section class="owner-access-card owner-access-primary" aria-label="Open existing page">
          <div>
            <strong>${disconnected.openExistingTitle}</strong>
            <p>${disconnected.openExistingHelp}</p>
            <ol class="owner-access-steps">
              ${disconnected.openExistingSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
            </ol>
            <p>${disconnected.openExistingPrivateHelp}</p>
          </div>
          <label class="button button-primary owner-folder-button" for="ownerFolder" tabindex="0" data-owner-folder-button>${disconnected.openExistingLabel}</label>
          <input
            class="sr-only"
            id="ownerFolder"
            type="file"
            data-owner-folder
            webkitdirectory
            multiple
          />
        </section>
        <div class="owner-create-heading">
          <strong>New here?</strong>
          <span>Create a page in this browser.</span>
        </div>
        <form class="owner-create-form" data-form="owner-create">
          <label class="sr-only" for="ownerName">Name</label>
          <input id="ownerName" name="name" type="text" autocomplete="name" placeholder="Your name or project" required />
          <label class="sr-only" for="ownerHandle">Handle</label>
          <input id="ownerHandle" name="handle" type="text" autocomplete="username" placeholder="your-name@example.com" required />
          <label class="sr-only" for="ownerBio">Bio</label>
          <textarea id="ownerBio" name="bio" rows="2" maxlength="240" placeholder="Short bio"></textarea>
          <label class="sr-only" for="ownerFirstPost">First post</label>
          <textarea id="ownerFirstPost" name="firstPost" rows="3" maxlength="1000" placeholder="Write your first post..." required></textarea>
          <button class="button button-primary" type="submit">Create my page</button>
        </form>
        <details class="technical-details">
          <summary>${disconnected.technicalSummary}</summary>
          <p>${disconnected.technicalHelp}</p>
        </details>
      </section>
    `;
  }

  const pageUrl = ownerPageUrl(state.owner);
  const avatarUrl = profileAvatarUrl(state.owner.profile, state.owner.pageUrl ?? window.location.href);
  const publishReady = summarizeOwnerPublishReady({
    pageCreated: state.pendingPublish.pageCreated,
    postCount: state.pendingPublish.postCount,
    publicUpdates: summarizeOwnerPublicUpdates(state.owner, state.pendingPublish.actions),
  });

  return `
    <section class="owner-panel" aria-label="My Page" data-owner-access>
      <div class="panel-header">
        <h2>My Page</h2>
        <div class="owner-status-actions">
          <span>${connected.status}</span>
          <button class="button button-secondary owner-logout-button" type="button" data-action="owner-disconnect" aria-label="${connected.logoutTitle}">${connected.logoutLabel}</button>
        </div>
      </div>
      ${state.ownerError ? `<p class="app-error">${escapeHtml(state.ownerError)}</p>` : ''}
      <p class="owner-warning">This file proves this page is yours. Back it up.</p>
      <div class="owner-identity">
        ${renderAvatar(state.owner.profile.name, avatarUrl, 'profile-picture')}
        <span>
          <strong>${escapeHtml(state.owner.profile.name)}</strong>
          <span>${escapeHtml(state.owner.profile.handle)}</span>
        </span>
      </div>
      <p class="owner-session-note">${connected.logoutHelp} ${connected.logoutReturnHelp}</p>
      <form class="owner-post-form" data-form="owner-post">
        <label class="sr-only" for="ownerPostContent">New signed post</label>
        <textarea id="ownerPostContent" name="content" rows="4" maxlength="1000" placeholder="What do you want to post?" data-owner-post-content></textarea>
        <button class="button button-primary" type="submit">Post</button>
      </form>
      <div class="owner-actions">
        <a class="button button-secondary owner-link" href="${escapeAttribute(pageUrl)}" target="_blank" rel="noreferrer">My page</a>
        <button class="button button-secondary" type="button" data-owner-download="full">Download my site</button>
        <button class="button button-secondary" type="button" data-owner-download="public">Download public site</button>
      </div>
      ${publishReady ? renderPublishReady(publishReady) : ''}
      ${renderOwnerInbox()}
      <section class="publish-anywhere">
        <strong>Publish anywhere</strong>
        <p>Upload the public folder to any static host.</p>
        <p>Examples: GitHub Pages, Cloudflare Pages, Netlify, Vercel, S3, or your own server.</p>
      </section>
      <details class="technical-details">
        <summary>Technical details</summary>
        <p>The private folder must never be hosted publicly.</p>
        <a href="${escapeAttribute(ownerFeedDownloadHref(state.owner))}" download="feed.json">Download feed only</a>
      </details>
    </section>
  `;
}

function renderFloatingComposeButton(): string {
  if (!shouldShowFloatingComposeButton(Boolean(state.owner))) {
    return '';
  }

  return `
    <button
      class="floating-compose-button"
      type="button"
      data-action="focus-owner-post"
      aria-label="Write a post"
      title="Write a post"
    >
      ${composeIcon()}
      <span>Post</span>
    </button>
  `;
}

function renderPublishReady(summary: OwnerPublishReadySummary): string {
  return `
    <section class="owner-publish-ready" aria-label="Public changes ready">
      <strong>${escapeHtml(summary.title)}</strong>
      <p>${escapeHtml(summary.detail)}</p>
      <p>Upload the public folder anywhere your page is hosted.</p>
      <button class="button button-secondary" type="button" data-action="owner-published">I published this</button>
    </section>
  `;
}

function renderOwnerInbox(): string {
  return `
    <section class="owner-inbox" aria-label="Messages">
      <div class="owner-inbox-header">
        <div>
          <strong>Messages</strong>
          <p>Open encrypted message files. They are read only in this browser.</p>
        </div>
        <label class="button button-secondary owner-message-button" for="ownerMessageFile">Open message</label>
        <input
          class="sr-only"
          id="ownerMessageFile"
          type="file"
          data-owner-message-file
          accept="application/json,.json"
          multiple
        />
      </div>
      ${state.inboxError ? `<p class="message-status message-status-prepared">${escapeHtml(state.inboxError)}</p>` : ''}
      ${renderOwnerInboxMessages()}
    </section>
  `;
}

function renderOwnerInboxMessages(): string {
  if (state.inboxMessages.length === 0) {
    return '<p class="owner-inbox-empty">No messages opened yet.</p>';
  }

  return `
    <div class="owner-message-list">
      ${state.inboxMessages
        .map(
          (message) => `
            <article class="owner-message-row">
              <header>
                <strong>${escapeHtml(message.senderName)}</strong>
                <span>${escapeHtml(formatDate(message.createdAt))}</span>
              </header>
              <p>${escapeHtml(message.content)}</p>
            </article>
          `,
        )
        .join('')}
    </div>
  `;
}

async function createOwnerFromForm(form: HTMLFormElement): Promise<void> {
  try {
    const owner = await createOwnerPage({
      name: formValue(form, 'name'),
      handle: formValue(form, 'handle'),
      bio: formValue(form, 'bio'),
      firstPost: formValue(form, 'firstPost'),
    });

    state.owner = owner;
    state.ownerError = null;
    state.inboxMessages = [];
    state.inboxError = null;
    savePendingPublishChanges({
      pageCreated: true,
      postCount: 0,
      actions: [],
    });
    saveStoredOwnerSession(owner);
    render();
  } catch (error) {
    state.ownerError = error instanceof Error ? error.message : 'Could not create your page';
    render();
  }
}

async function connectOwnerFromFolder(files: FileList | null): Promise<void> {
  try {
    const projectFiles = Array.from(files ?? []);
    const profileFile = ownerProjectFile(projectFiles, 'public/profile.json');
    const feedFile = ownerProjectFile(projectFiles, 'public/feed.json');
    const privateKeyFile = ownerProjectFile(projectFiles, 'private/identity.private.jwk.json');
    const messagePrivateKeyFile = optionalOwnerProjectFile(
      projectFiles,
      'private/messages.private.jwk.json',
    );
    const actionLogFile = optionalOwnerProjectFile(
      projectFiles,
      'public/opensocial/actions/index.json',
    );
    const owner = await connectOwnerPage({
      profile: (await readJsonFile(profileFile)) as OwnerSession['profile'],
      feed: (await readJsonFile(feedFile)) as OwnerSession['feed'],
      privateKeyJwk: (await readJsonFile(privateKeyFile)) as JsonWebKey,
      messagePrivateKeyJwk: messagePrivateKeyFile
        ? ((await readJsonFile(messagePrivateKeyFile)) as JsonWebKey)
        : undefined,
    });
    const importedActions = actionLogFile
      ? await loadOwnerActionsFromActionLog(owner, await readJsonFile(actionLogFile))
      : [];

    state.owner = owner;
    state.actions = mergeActionsById(importedActions, state.actions);
    state.ownerError = null;
    state.inboxMessages = [];
    state.inboxError = null;
    state.pendingPublish = emptyOwnerPublishChanges();
    clearStoredOwnerPublishChanges();
    saveStoredOwnerSession(owner);
    saveStoredOwnerActions(state.actions);
    render();
  } catch (error) {
    state.ownerError = error instanceof Error ? error.message : 'Could not log in with this folder';
    render();
  }
}

async function publishOwnerPost(form: HTMLFormElement): Promise<void> {
  if (!state.owner) {
    return;
  }

  try {
    const content = (form.elements.namedItem('content') as HTMLTextAreaElement | null)?.value ?? '';
    state.owner = await signOwnerPost(state.owner, content);
    state.ownerError = null;
    savePendingPublishChanges({
      ...state.pendingPublish,
      postCount: state.pendingPublish.postCount + 1,
    });
    saveStoredOwnerSession(state.owner);
    render();
  } catch (error) {
    state.ownerError = error instanceof Error ? error.message : 'Could not sign this post';
    render();
  }
}

async function reactToPost(button: HTMLButtonElement): Promise<void> {
  if (!state.owner) {
    showSignedOutSocialPrompt('react');
    return;
  }

  const targetKey = button.dataset.targetKey;
  const requestedReaction = button.dataset.postReaction as OpenSocialNetworkReaction | undefined;

  if (!targetKey || (requestedReaction !== 'like' && requestedReaction !== 'dislike')) {
    return;
  }

  try {
    const target = decodeActionTarget(targetKey);
    const currentReaction = summarizePostActions(visibleActions(), target).reactionsByActor[
      state.owner.profile.handle
    ];
    const nextReaction: OpenSocialNetworkReaction =
      currentReaction === requestedReaction ? 'none' : requestedReaction;
    const signedAction = await signOwnerReaction(state.owner, target, nextReaction);
    const manualPublishNeeded = await shouldManuallyPublishOwnerAction(signedAction, target);

    state.actions = [signedAction, ...state.actions];
    if (manualPublishNeeded) {
      savePendingPublishChanges({
        ...state.pendingPublish,
        actions: [signedAction, ...state.pendingPublish.actions],
      });
    }
    state.ownerError = null;
    saveStoredOwnerActions(state.actions);
    render();
  } catch (error) {
    state.ownerError = error instanceof Error ? error.message : 'Could not react to this post';
    render();
  }
}

async function commentOnPost(form: HTMLFormElement): Promise<void> {
  if (!state.owner) {
    showSignedOutSocialPrompt('comment');
    return;
  }

  try {
    const targetKey = formValue(form, 'targetKey');
    const content = formValue(form, 'content');
    const target = decodeActionTarget(targetKey);
    const signedAction = await signOwnerComment(state.owner, target, content);
    const manualPublishNeeded = await shouldManuallyPublishOwnerAction(signedAction, target);

    state.actions = [signedAction, ...state.actions];
    if (manualPublishNeeded) {
      savePendingPublishChanges({
        ...state.pendingPublish,
        actions: [signedAction, ...state.pendingPublish.actions],
      });
    }
    state.commentTargetKey = null;
    state.messageTargetKey = null;
    state.ownerError = null;
    saveStoredOwnerActions(state.actions);
    render();
  } catch (error) {
    state.ownerError = error instanceof Error ? error.message : 'Could not post this comment';
    render();
  }
}

async function sendDirectMessage(form: HTMLFormElement): Promise<void> {
  if (!state.owner) {
    showSignedOutSocialPrompt('message');
    return;
  }

  try {
    const targetKey = formValue(form, 'targetKey');
    const profile = findMessageTargetProfile(targetKey);
    const prepared = await createOwnerDirectMessage(state.owner, profile, formValue(form, 'content'), {
      profileBaseUrl: new URL(profile.endpoints.profile, window.location.href).toString(),
    });
    const delivery = await deliverDirectMessage(prepared);

    if (delivery.status === 'sent') {
      state.messageStatus = {
        targetKey,
        kind: 'sent',
        text: socialInteractionCopy.messageSent,
      };
    } else {
      state.messageStatus = {
        targetKey,
        kind: 'prepared',
        text: socialInteractionCopy.messagePrepared,
        downloadHref: directMessageDownloadHref(prepared),
        downloadName: prepared.fileName,
      };
    }

    state.ownerError = null;
    render();
  } catch (error) {
    state.ownerError = error instanceof Error ? error.message : 'Could not send this message';
    render();
  }
}

async function openOwnerMessageFiles(files: FileList | null): Promise<void> {
  if (!state.owner) {
    state.ownerError = 'Open your page to read messages.';
    render();
    return;
  }

  const selectedFiles = Array.from(files ?? []);

  if (selectedFiles.length === 0) {
    return;
  }

  try {
    const openedMessages: OwnerInboxMessage[] = [];
    const senderProfiles = currentTimeline().profiles;

    for (const file of selectedFiles) {
      const message = assertDirectMessageFile(await readJsonFile(file));
      openedMessages.push(
        await readOwnerDirectMessage(state.owner, message, {
          senderProfiles,
        }),
      );
    }

    const messagesById = new Map<string, OwnerInboxMessage>();

    for (const message of [...openedMessages, ...state.inboxMessages]) {
      messagesById.set(message.id, message);
    }

    state.inboxMessages = [...messagesById.values()].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    state.inboxError = null;
    state.ownerError = null;
    render();
  } catch (error) {
    state.inboxError = error instanceof Error ? error.message : 'Could not open this message';
    render();
  }
}

function mergeActionsById(
  preferredActions: OpenSocialNetworkAction[],
  fallbackActions: OpenSocialNetworkAction[],
): OpenSocialNetworkAction[] {
  const actionsById = new Map<string, OpenSocialNetworkAction>();

  for (const action of [...preferredActions, ...fallbackActions]) {
    if (!actionsById.has(action.id)) {
      actionsById.set(action.id, action);
    }
  }

  return [...actionsById.values()];
}

function currentTimeline(): TimelineResult {
  return mergeOwnerTimeline(state.timeline, state.owner);
}

function visibleActions(): OpenSocialNetworkAction[] {
  const timelineActions = currentTimeline().actions;

  return mergeActionsById(state.actions, timelineActions);
}

function savePendingPublishChanges(changes: OwnerPublishChanges): void {
  state.pendingPublish = changes;

  if (state.owner) {
    saveStoredOwnerPublishChanges(state.owner.profile.handle, changes);
  }
}

async function shouldManuallyPublishOwnerAction(
  action: OpenSocialNetworkAction,
  target: OpenSocialNetworkActionTarget,
): Promise<boolean> {
  const recipient = currentTimeline().profiles.find((profile) => profile.handle === target.author);

  if (!recipient) {
    return true;
  }

  try {
    const prepared = prepareOwnerActionDelivery(action, recipient, {
      profileBaseUrl: new URL(recipient.endpoints.profile, window.location.href).toString(),
    });
    const delivery = await deliverOwnerAction(prepared);

    return needsManualActionPublish(delivery);
  } catch {
    return true;
  }
}

function showSignedOutSocialPrompt(action: SignedOutSocialAction): void {
  state.ownerError = signedOutSocialActionMessage(action);
  state.commentTargetKey = null;
  state.messageTargetKey = null;
  render();
  focusMyPageAccess(app);
}

function postActionTarget(post: TimelineResult['posts'][number]): OpenSocialNetworkActionTarget {
  return {
    type: 'post',
    id: post.id,
    author: post.author,
    url: profilePageUrl(post.profile, window.location.href),
  };
}

function encodeActionTarget(target: OpenSocialNetworkActionTarget): string {
  return encodeURIComponent(JSON.stringify(target));
}

function decodeActionTarget(encoded: string): OpenSocialNetworkActionTarget {
  const target = JSON.parse(decodeURIComponent(encoded)) as Partial<OpenSocialNetworkActionTarget>;

  if (target.type !== 'post' || typeof target.id !== 'string' || typeof target.author !== 'string') {
    throw new Error('Post target is invalid');
  }

  return {
    type: 'post',
    id: target.id,
    author: target.author,
    url: typeof target.url === 'string' ? target.url : undefined,
  };
}

function encodeMessageTarget(profile: OpenSocialNetworkIdentity, postTargetKey: string): string {
  return encodeURIComponent(JSON.stringify({ handle: profile.handle, postTargetKey }));
}

function findMessageTargetProfile(targetKey: string): OpenSocialNetworkIdentity {
  const target = JSON.parse(decodeURIComponent(targetKey)) as { handle?: unknown };
  const handle = typeof target.handle === 'string' ? target.handle : '';
  const profile = currentTimeline().profiles.find((item) => item.handle === handle);

  if (!profile) {
    throw new Error('Profile is no longer loaded');
  }

  return profile;
}

function heartIcon(filled: boolean): string {
  return `
    <svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.8 4.6c-2-1.8-5.1-1.5-6.9.6L12 7.4l-1.9-2.2C8.3 3.1 5.2 2.8 3.2 4.6 1 6.6.9 10 .9 10.1c0 4.9 7.8 10 10.2 11.4.6.3 1.2.3 1.8 0C15.3 20.1 23.1 15 23.1 10.1c0-.1-.1-3.5-2.3-5.5Z"
        fill="${filled ? 'currentColor' : 'none'}"
        stroke="currentColor"
        stroke-width="1.8"
      />
    </svg>
  `;
}

function thumbDownIcon(filled: boolean): string {
  return `
    <svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 3.5h9.4c1.1 0 2.1.7 2.5 1.8l2 5.5c.6 1.6-.6 3.2-2.3 3.2h-4.4l.6 4.1c.2 1.3-.8 2.4-2.1 2.4h-.3c-.8 0-1.5-.4-1.9-1.1L6.5 14"
        fill="${filled ? 'currentColor' : 'none'}"
        stroke="currentColor"
        stroke-linejoin="round"
        stroke-width="1.8"
      />
      <path d="M3.5 4v10" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
    </svg>
  `;
}

function commentIcon(): string {
  return `
    <svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.2 5.1h13.6c1.2 0 2.2 1 2.2 2.2v6.9c0 1.2-1 2.2-2.2 2.2h-5.5L8 20.4v-4H5.2c-1.2 0-2.2-1-2.2-2.2V7.3c0-1.2 1-2.2 2.2-2.2Z"
        fill="none"
        stroke="currentColor"
        stroke-linejoin="round"
        stroke-width="1.8"
      />
    </svg>
  `;
}

function messageIcon(): string {
  return `
    <svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3.5 11.7 20.6 4.2c.8-.4 1.6.4 1.2 1.2l-7.5 17.1c-.3.8-1.5.7-1.7-.1l-1.7-7.2-7.2-1.7c-.8-.2-.9-1.4-.2-1.8Z"
        fill="none"
        stroke="currentColor"
        stroke-linejoin="round"
        stroke-width="1.8"
      />
      <path d="m10.9 15.2 4.4-4.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
    </svg>
  `;
}

function composeIcon(): string {
  return `
    <svg class="floating-compose-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 19.5h4.1L19.2 8.9c1.1-1.1 1.1-2.8 0-3.9s-2.8-1.1-3.9 0L4.5 15.8v3.7Z"
        fill="none"
        stroke="currentColor"
        stroke-linejoin="round"
        stroke-width="1.9"
      />
      <path d="m13.7 6.6 3.7 3.7" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
    </svg>
  `;
}

function ownerPageUrl(session: OwnerSession): string {
  return session.pageUrl ?? session.profile.website ?? profilePageUrl(session.profile, window.location.href);
}

function ownerFeedDownloadHref(session: OwnerSession): string {
  return `data:application/json;charset=utf-8,${encodeURIComponent(exportOwnerFeed(session))}`;
}

function downloadOwnerSite(includePrivate: boolean): void {
  if (!state.owner) {
    return;
  }

  const ownerActions = state.actions.filter((action) => action.actor === state.owner?.profile.handle);
  const zip = exportOwnerSiteZip(state.owner, { includePrivate, actions: ownerActions });
  const blob = new Blob([zip as BlobPart], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = includePrivate ? 'open-social-network-site.zip' : 'open-social-network-public-site.zip';
  link.click();
  URL.revokeObjectURL(url);
}

function directMessageDownloadHref(prepared: PreparedDirectMessage): string {
  return `data:application/json;charset=utf-8,${encodeURIComponent(
    `${JSON.stringify(prepared.message, null, 2)}\n`,
  )}`;
}

function formValue(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    return field.value.trim();
  }

  return '';
}

async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text());
}

function assertDirectMessageFile(value: unknown): OpenSocialNetworkDirectMessage {
  if (!isRecord(value)) {
    throw new Error('Choose an encrypted message file');
  }

  const message = value as Partial<OpenSocialNetworkDirectMessage>;

  if (
    message.protocol !== 'open-social-network' ||
    message.version !== '0.1' ||
    message.kind !== 'direct-message' ||
    typeof message.id !== 'string' ||
    typeof message.sender !== 'string' ||
    typeof message.recipient !== 'string' ||
    typeof message.createdAt !== 'string' ||
    message.encryption?.alg !== 'ECDH-P256-A256GCM' ||
    typeof message.encryption.iv !== 'string' ||
    typeof message.encryption.ciphertext !== 'string' ||
    !isRecord(message.encryption.epk) ||
    message.signature?.alg !== 'ES256' ||
    typeof message.signature.value !== 'string'
  ) {
    throw new Error('Choose an encrypted message file');
  }

  return message as OpenSocialNetworkDirectMessage;
}

function ownerProjectFile(files: File[], path: string): File {
  const file = files.find((candidate) => filePath(candidate).endsWith(path));

  if (!file) {
    throw new Error('Choose the page folder that contains public/ and private/.');
  }

  return file;
}

function optionalOwnerProjectFile(files: File[], path: string): File | null {
  return files.find((candidate) => filePath(candidate).endsWith(path)) ?? null;
}

function filePath(file: File): string {
  return file.webkitRelativePath || file.name;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function renderSkeletonPosts(): string {
  return Array.from({ length: 3 })
    .map(
      () => `
        <article class="post-card skeleton">
          <div></div>
          <div></div>
          <div></div>
        </article>
      `,
    )
    .join('');
}

function initials(name: string): string {
  return name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function renderAvatar(name: string, avatarUrl: string | null, className: string): string {
  if (avatarUrl) {
    return `<img class="${className}" src="${escapeAttribute(avatarUrl)}" alt="" loading="lazy" />`;
  }

  return `<span class="${className}" aria-hidden="true">${initials(name)}</span>`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function shortUrl(value: string): string {
  try {
    const url = new URL(value);

    return `${url.host}${url.pathname}`;
  } catch {
    return value;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
