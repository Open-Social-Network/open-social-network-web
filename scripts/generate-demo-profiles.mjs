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
    'https://open-social-network.github.io/open-social-network-official/profile.json',
    ...demoProfiles.map((profile) => `/profiles/${profile.slug}/profile.json`),
  ],
};

await writeJson(join(profilesRoot, 'directory.json'), directory);

for (const demoProfile of demoProfiles) {
  const profileDirectory = join(profilesRoot, demoProfile.slug);
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
    website: demoProfile.website,
    publicKey: {
      alg: 'ES256',
      jwk: publicJwk,
    },
    endpoints: {
      profile: `/profiles/${demoProfile.slug}/profile.json`,
      feed: `/profiles/${demoProfile.slug}/feed.json`,
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
