import { loadVerifiedTimeline, type TimelineResult } from './aggregator/timeline';
import { accountAccessCopy } from './app/account-access';
import { loadDirectory } from './app/directory';
import {
  loadStoredFollows,
  normalizeProfileUrl,
  saveStoredFollows,
  toggleFollow,
} from './app/follows';
import {
  loadStoredOwnerActions,
  saveStoredOwnerActions,
  signOwnerComment,
  signOwnerReaction,
} from './app/owner-actions';
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
import { profileAvatarUrl, profilePageUrl } from './app/profile-links';
import { summarizePostActions, type OpenSocialNetworkPostActionSummary } from './protocol/public-actions';
import type {
  OpenSocialNetworkAction,
  OpenSocialNetworkActionTarget,
  OpenSocialNetworkReaction,
} from './protocol/types';
import './styles.css';

interface AppState {
  directoryProfiles: string[];
  follows: string[];
  timeline: TimelineResult | null;
  owner: OwnerSession | null;
  actions: OpenSocialNetworkAction[];
  loading: boolean;
  error: string | null;
  ownerError: string | null;
  commentTargetKey: string | null;
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
  loading: true,
  error: null,
  ownerError: null,
  commentTargetKey: null,
};

void boot();

async function boot(): Promise<void> {
  render();

  try {
    state.owner = loadStoredOwnerSession();
    state.actions = loadStoredOwnerActions();
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
      state.error = 'Enter a valid profile.json URL';
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

  app.querySelector<HTMLButtonElement>('[data-action="owner-disconnect"]')?.addEventListener('click', () => {
    clearStoredOwnerSession();
    state.owner = null;
    state.ownerError = null;
    state.commentTargetKey = null;
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
        state.ownerError = 'Open your page to comment.';
        render();
        return;
      }

      state.commentTargetKey = state.commentTargetKey === targetKey ? null : targetKey;
      state.ownerError = null;
      render();
    });
  }

  for (const form of app.querySelectorAll<HTMLFormElement>('[data-form="post-comment"]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void commentOnPost(form);
    });
  }
}

function renderFollowForm(): string {
  return `
    <form class="follow-form" data-form="follow">
      <label class="sr-only" for="profileUrl">Profile URL</label>
      <input id="profileUrl" name="profileUrl" type="url" placeholder="Paste a profile link" />
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
        const actionSummary = summarizePostActions(state.actions, target);

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
          </header>
          <p class="post-content">${escapeHtml(post.content)}</p>
          ${renderPostActions(target, targetKey, actionSummary)}
          ${renderPostComments(actionSummary)}
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
): string {
  const ownerHandle = state.owner?.profile.handle;
  const activeReaction = ownerHandle ? summary.reactionsByActor[ownerHandle] : null;
  const disabled = state.owner ? '' : 'disabled';
  const disabledTitle = state.owner ? '' : ' title="Open your page to interact"';
  const commentOpen = state.commentTargetKey === targetKey;

  return `
    <footer class="post-social-bar" aria-label="Post actions">
      <button
        class="post-action-button ${activeReaction === 'like' ? 'post-action-active' : ''}"
        type="button"
        data-post-reaction="like"
        data-target-key="${escapeAttribute(targetKey)}"
        aria-label="Like post"
        ${disabled}
        ${disabledTitle}
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
        ${disabled}
        ${disabledTitle}
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
        ${disabled}
        ${disabledTitle}
      >
        ${commentIcon()}
        <span>${summary.comments.length}</span>
      </button>
    </footer>
    ${
      commentOpen
        ? `
          <form class="post-comment-form" data-form="post-comment">
            <input type="hidden" name="targetKey" value="${escapeAttribute(targetKey)}" />
            <label class="sr-only" for="comment-${escapeAttribute(target.id)}">Comment</label>
            <textarea id="comment-${escapeAttribute(target.id)}" name="content" rows="2" maxlength="600" placeholder="Write a comment..."></textarea>
            <button class="button button-primary" type="submit">Post</button>
          </form>
        `
        : ''
    }
  `;
}

function renderPostComments(summary: OpenSocialNetworkPostActionSummary): string {
  if (summary.comments.length === 0) {
    return '';
  }

  return `
    <div class="post-comments" aria-label="Comments">
      ${summary.comments
        .map(
          (comment) => `
            <article class="post-comment">
              <strong>${escapeHtml(comment.actor)}</strong>
              <p>${escapeHtml(comment.content)}</p>
            </article>
          `,
        )
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
      <section class="owner-panel" aria-label="My Page">
        <div class="panel-header">
          <h2>My Page</h2>
          <span>${disconnected.status}</span>
        </div>
        <p class="owner-copy">Create a page, write posts, and host it anywhere.</p>
        ${state.ownerError ? `<p class="app-error">${escapeHtml(state.ownerError)}</p>` : ''}
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
        <section class="owner-access-card" aria-label="Open existing page">
          <div>
            <strong>${disconnected.openExistingTitle}</strong>
            <p>${disconnected.openExistingHelp}</p>
          </div>
          <label class="button button-secondary owner-folder-button" for="ownerFolder">${disconnected.openExistingLabel}</label>
          <input
            class="sr-only"
            id="ownerFolder"
            type="file"
            data-owner-folder
            webkitdirectory
            multiple
          />
        </section>
        <details class="technical-details">
          <summary>${disconnected.technicalSummary}</summary>
          <p>${disconnected.technicalHelp}</p>
        </details>
      </section>
    `;
  }

  const pageUrl = ownerPageUrl(state.owner);
  const avatarUrl = profileAvatarUrl(state.owner.profile, state.owner.pageUrl ?? window.location.href);

  return `
    <section class="owner-panel" aria-label="My Page">
      <div class="panel-header">
        <h2>My Page</h2>
        <span>${connected.status}</span>
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
      <form class="owner-post-form" data-form="owner-post">
        <label class="sr-only" for="ownerPostContent">New signed post</label>
        <textarea id="ownerPostContent" name="content" rows="4" maxlength="1000" placeholder="What do you want to post?"></textarea>
        <button class="button button-primary" type="submit">Post</button>
      </form>
      <div class="owner-actions">
        <a class="button button-secondary owner-link" href="${escapeAttribute(pageUrl)}" target="_blank" rel="noreferrer">My page</a>
        <button class="button button-secondary" type="button" data-owner-download="full">Download my site</button>
        <button class="button button-secondary" type="button" data-owner-download="public">Download public site</button>
        <button class="button button-secondary owner-logout-button" type="button" data-action="owner-disconnect" aria-label="Log out of this page">${connected.logoutLabel}</button>
      </div>
      <p class="owner-session-note">${connected.logoutHelp}</p>
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
    const owner = await connectOwnerPage({
      profile: (await readJsonFile(profileFile)) as OwnerSession['profile'],
      feed: (await readJsonFile(feedFile)) as OwnerSession['feed'],
      privateKeyJwk: (await readJsonFile(privateKeyFile)) as JsonWebKey,
    });

    state.owner = owner;
    state.ownerError = null;
    saveStoredOwnerSession(owner);
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
    saveStoredOwnerSession(state.owner);
    render();
  } catch (error) {
    state.ownerError = error instanceof Error ? error.message : 'Could not sign this post';
    render();
  }
}

async function reactToPost(button: HTMLButtonElement): Promise<void> {
  if (!state.owner) {
    state.ownerError = 'Open your page to react.';
    render();
    return;
  }

  const targetKey = button.dataset.targetKey;
  const requestedReaction = button.dataset.postReaction as OpenSocialNetworkReaction | undefined;

  if (!targetKey || (requestedReaction !== 'like' && requestedReaction !== 'dislike')) {
    return;
  }

  try {
    const target = decodeActionTarget(targetKey);
    const currentReaction = summarizePostActions(state.actions, target).reactionsByActor[
      state.owner.profile.handle
    ];
    const nextReaction: OpenSocialNetworkReaction =
      currentReaction === requestedReaction ? 'none' : requestedReaction;
    const signedAction = await signOwnerReaction(state.owner, target, nextReaction);

    state.actions = [signedAction, ...state.actions];
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
    state.ownerError = 'Open your page to comment.';
    render();
    return;
  }

  try {
    const targetKey = formValue(form, 'targetKey');
    const content = formValue(form, 'content');
    const signedAction = await signOwnerComment(state.owner, decodeActionTarget(targetKey), content);

    state.actions = [signedAction, ...state.actions];
    state.commentTargetKey = null;
    state.ownerError = null;
    saveStoredOwnerActions(state.actions);
    render();
  } catch (error) {
    state.ownerError = error instanceof Error ? error.message : 'Could not post this comment';
    render();
  }
}

function currentTimeline(): TimelineResult {
  return mergeOwnerTimeline(state.timeline, state.owner);
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

function ownerProjectFile(files: File[], path: string): File {
  const file = files.find((candidate) => filePath(candidate).endsWith(path));

  if (!file) {
    throw new Error('Choose the page folder that contains public/ and private/.');
  }

  return file;
}

function filePath(file: File): string {
  return file.webkitRelativePath || file.name;
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
