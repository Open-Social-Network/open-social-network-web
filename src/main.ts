import { loadVerifiedTimeline, type TimelineResult } from './aggregator/timeline';
import { loadDirectory } from './app/directory';
import {
  loadStoredFollows,
  normalizeProfileUrl,
  saveStoredFollows,
  toggleFollow,
} from './app/follows';
import './styles.css';

interface AppState {
  directoryProfiles: string[];
  follows: string[];
  timeline: TimelineResult | null;
  loading: boolean;
  error: string | null;
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
  loading: true,
  error: null,
};

void boot();

async function boot(): Promise<void> {
  render();

  try {
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
            <p>Signed sovereign feeds</p>
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

        <aside class="panel diagnostics-panel" aria-label="Diagnostics">
          <div class="panel-header">
            <h2>Trust</h2>
            <span>${state.timeline?.rejectedPosts.length ?? 0} rejected</span>
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
}

function renderFollowForm(): string {
  return `
    <form class="follow-form" data-form="follow">
      <label class="sr-only" for="profileUrl">Profile URL</label>
      <input id="profileUrl" name="profileUrl" type="url" placeholder="Profile URL" />
      <button class="button button-secondary" type="submit">Follow</button>
    </form>
  `;
}

function renderProfiles(): string {
  const profilesByUrl = new Map(
    state.timeline?.profiles.map((profile) => [profile.endpoints.profile, profile]) ?? [],
  );
  const knownProfiles = [...new Set([...state.directoryProfiles, ...state.follows])];

  if (knownProfiles.length === 0) {
    return '<p class="empty-state">No profiles loaded.</p>';
  }

  return knownProfiles
    .map((profileUrl) => {
      const profile =
        profilesByUrl.get(profileUrl) ??
        state.timeline?.profiles.find((item) => item.endpoints.profile === new URL(profileUrl).pathname);
      const followed = state.follows.includes(profileUrl);
      const name = profile?.name ?? shortUrl(profileUrl);
      const handle = profile?.handle ?? profileUrl;

      return `
        <article class="profile-row ${followed ? 'profile-row-active' : ''}">
          <div>
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(handle)}</span>
          </div>
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
  const postCount = state.timeline?.posts.length ?? 0;
  const profileCount = state.timeline?.profiles.length ?? 0;

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
  if (state.loading && !state.timeline) {
    return renderSkeletonPosts();
  }

  if (!state.timeline || state.timeline.posts.length === 0) {
    return '<p class="empty-state">Follow a profile to load signed posts.</p>';
  }

  return state.timeline.posts
    .map(
      (post) => `
        <article class="post-card">
          <header>
            <div class="avatar">${initials(post.profile.name)}</div>
            <div>
              <h3>${escapeHtml(post.profile.name)}</h3>
              <p>${escapeHtml(post.author)} · ${formatDate(post.createdAt)}</p>
            </div>
          </header>
          <p class="post-content">${escapeHtml(post.content)}</p>
          <footer>
            <span>ES256</span>
            <code>${escapeHtml(post.signature.value.slice(0, 18))}...</code>
          </footer>
        </article>
      `,
    )
    .join('');
}

function renderDiagnostics(): string {
  if (!state.timeline) {
    return '<p class="empty-state">Diagnostics load with the timeline.</p>';
  }

  const rejected = state.timeline.rejectedPosts
    .map(
      (post) => `
        <li>
          <strong>${escapeHtml(post.postId)}</strong>
          <span>${escapeHtml(post.reason)}</span>
        </li>
      `,
    )
    .join('');
  const failures = state.timeline.failures
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
