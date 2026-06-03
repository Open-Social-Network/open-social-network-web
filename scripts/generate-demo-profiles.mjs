import { mkdir, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const profilesRoot = join(root, 'public', 'profiles');
const encoder = new TextEncoder();

const demoProfiles = [
  {
    slug: 'ada',
    handle: 'ada@open-social-network.local',
    name: 'Ada Lovelace',
    bio: 'Protocol designer testing sovereign pages.',
    website: 'https://example.com/ada',
    colors: ['#5338f2', '#00c7d9'],
    posts: [
      {
        id: 'ada_001',
        createdAt: '2026-06-03T12:10:00.000Z',
        content:
          'Published my identity file and feed as static JSON. The aggregator can verify this post without an account.',
      },
      {
        id: 'ada_002',
        createdAt: '2026-06-02T18:25:00.000Z',
        content:
          'The important invariant: followers should track public keys and handles, not platforms.',
      },
    ],
  },
  {
    slug: 'tommy',
    handle: 'tommy@tommy.page',
    name: 'Tommy',
    bio: 'Building an open social layer on plain web infrastructure.',
    website: 'https://tommy.page',
    colors: ['#102a43', '#12b886'],
    posts: [
      {
        id: 'tommy_001',
        createdAt: '2026-06-03T13:15:00.000Z',
        content:
          'MVP target: identity file, signed posts, static feeds, and one aggregator that merges follows chronologically.',
      },
      {
        id: 'tommy_002',
        createdAt: '2026-06-01T09:00:00.000Z',
        content:
          'No blockchain, no token, no central account. HTTP and signed JSON are enough for the first proof.',
      },
    ],
  },
  {
    slug: 'relay',
    handle: 'relay@indieweb.test',
    name: 'Indie Relay',
    bio: 'A sample profile showing aggregators can read any compatible page.',
    website: 'https://indieweb.test',
    colors: ['#f9734d', '#7c3aed'],
    posts: [
      {
        id: 'relay_001',
        createdAt: '2026-06-03T10:45:00.000Z',
        content:
          'Aggregators are social browsers. They can index, rank, and display, but they do not own the graph.',
      },
    ],
  },
];

await mkdir(profilesRoot, { recursive: true });

const directory = {
  protocol: 'open-social-network',
  version: '0.1',
  profiles: [
    'https://open-social-network.github.io/profile.json',
    ...demoProfiles.map((profile) => `/profiles/${profile.slug}/profile.json`),
  ],
};

await writeJson(join(profilesRoot, 'directory.json'), directory);

for (const demoProfile of demoProfiles) {
  const profileDirectory = join(profilesRoot, demoProfile.slug);
  const avatarPath = `/profiles/${demoProfile.slug}/avatar.svg`;
  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify'],
  );
  const publicJwk = await webcrypto.subtle.exportKey('jwk', keyPair.publicKey);
  const profile = {
    protocol: 'open-social-network',
    version: '0.1',
    handle: demoProfile.handle,
    name: demoProfile.name,
    bio: demoProfile.bio,
    avatar: avatarPath,
    website: demoProfile.website,
    publicKey: {
      alg: 'ES256',
      jwk: publicJwk,
    },
    endpoints: {
      profile: `/profiles/${demoProfile.slug}/profile.json`,
      feed: `/profiles/${demoProfile.slug}/feed.json`,
      avatar: avatarPath,
    },
  };
  const posts = [];

  for (const post of demoProfile.posts) {
    posts.push(
      await signPost(
        {
          id: post.id,
          author: demoProfile.handle,
          createdAt: post.createdAt,
          content: post.content,
        },
        keyPair.privateKey,
      ),
    );
  }

  const feed = {
    protocol: 'open-social-network',
    version: '0.1',
    author: demoProfile.handle,
    posts,
  };

  await mkdir(profileDirectory, { recursive: true });
  await writeFile(join(profileDirectory, 'avatar.svg'), renderAvatarSvg(demoProfile), 'utf8');
  await writeFile(join(profileDirectory, 'index.html'), renderProfilePage(demoProfile), 'utf8');
  await writeJson(join(profileDirectory, 'profile.json'), profile);
  await writeJson(join(profileDirectory, 'feed.json'), feed);
}

async function signPost(post, privateKey) {
  const signature = await webcrypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    privateKey,
    encoder.encode(canonicalStringify(post)),
  );

  return {
    ...post,
    signature: {
      alg: 'ES256',
      value: bytesToBase64Url(signature),
    },
  };
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function canonicalStringify(value) {
  return JSON.stringify(toCanonicalValue(value));
}

function toCanonicalValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON does not support non-finite numbers.');
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : toCanonicalValue(item)));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, toCanonicalValue(value[key])]),
    );
  }

  throw new TypeError(`Canonical JSON does not support ${typeof value} values.`);
}

function bytesToBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function renderAvatarSvg(profile) {
  const initials = profile.name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${escapeHtml(profile.name)}">
  <defs>
    <linearGradient id="avatarGradient" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${profile.colors[0]}" />
      <stop offset="1" stop-color="${profile.colors[1]}" />
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="52" fill="url(#avatarGradient)" />
  <circle cx="190" cy="48" r="38" fill="rgba(255,255,255,0.2)" />
  <circle cx="46" cy="198" r="58" fill="rgba(255,255,255,0.12)" />
  <text x="120" y="137" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="68" font-weight="800">${escapeHtml(initials)}</text>
</svg>
`;
}

function renderProfilePage(profile) {
  const posts = profile.posts
    .map(
      (post) => `<article>
        <time datetime="${escapeHtml(post.createdAt)}">${escapeHtml(new Date(post.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }))}</time>
        <p>${escapeHtml(post.content)}</p>
      </article>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(profile.name)} · Open Social Network</title>
    <style>
      :root { color: #14242c; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f9; }
      * { box-sizing: border-box; }
      body { margin: 0; min-width: 320px; background: linear-gradient(135deg, rgba(15, 118, 110, 0.1), transparent 38%), #f4f7f9; }
      main { width: min(760px, 100%); margin: 0 auto; padding: 42px 18px; }
      header, article { border: 1px solid #d8e1e7; border-radius: 8px; background: rgba(255,255,255,0.94); box-shadow: 0 18px 55px rgba(20, 36, 44, 0.1); }
      header { display: grid; grid-template-columns: 92px 1fr; gap: 18px; align-items: center; padding: 24px; margin-bottom: 14px; }
      img { width: 92px; height: 92px; border-radius: 8px; object-fit: cover; }
      h1, p { margin: 0; }
      h1 { font-size: clamp(2rem, 6vw, 3.6rem); line-height: 1; }
      header p { margin-top: 10px; color: #667883; line-height: 1.5; }
      nav { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
      a { display: inline-flex; align-items: center; min-height: 34px; padding: 0 12px; border-radius: 8px; background: #d9f0ee; color: #0b4f49; font-weight: 750; text-decoration: none; }
      section { display: grid; gap: 12px; }
      article { padding: 18px; }
      time { color: #667883; font-size: 0.84rem; }
      article p { margin-top: 8px; font-size: 1.05rem; line-height: 1.58; }
      @media (max-width: 580px) { header { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <img src="./avatar.svg" alt="" />
        <div>
          <h1>${escapeHtml(profile.name)}</h1>
          <p>${escapeHtml(profile.bio)}</p>
          <nav>
            <a href="./profile.json">profile.json</a>
            <a href="./feed.json">feed.json</a>
          </nav>
        </div>
      </header>
      <section>${posts}</section>
    </main>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
