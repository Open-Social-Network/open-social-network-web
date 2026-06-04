import { describe, expect, it } from 'vitest';
import { createOwnerPage, signOwnerPost } from './owner-session';
import { signOwnerReaction } from './owner-actions';
import {
  ownerProjectWriterFromDirectoryHandle,
  readOwnerProjectJsonFromDirectoryHandle,
  saveOwnerActionsToProjectFolder,
  saveOwnerFeedToProjectFolder,
  saveOwnerFollowsToProjectFolder,
  type WritableOwnerProject,
} from './owner-folder-writer';

describe('owner folder writer', () => {
  it('saves an updated signed feed to the opened page folder', async () => {
    const writer = new MemoryOwnerProjectWriter();
    const session = await signOwnerPost(
      await createOwnerPage({
        name: 'Ada Lovelace',
        handle: 'ada@example.test',
        bio: 'Building a social page.',
        firstPost: 'Hello from my page.',
      }),
      'Saved directly to my folder.',
      {
        id: 'post_saved_to_folder',
        createdAt: '2026-06-04T10:00:00.000Z',
      },
    );

    await saveOwnerFeedToProjectFolder(writer, session);

    expect(JSON.parse(writer.files.get('public/feed.json') ?? '{}')).toEqual(session.feed);
  });

  it('saves signed public actions without writing private files', async () => {
    const writer = new MemoryOwnerProjectWriter();
    const session = await createOwnerPage({
      name: 'Ada Lovelace',
      handle: 'ada@example.test',
      bio: 'Building a social page.',
      firstPost: 'Hello from my page.',
    });
    const action = await signOwnerReaction(
      session,
      {
        type: 'post',
        id: session.feed.posts[0]!.id,
        author: session.feed.posts[0]!.author,
      },
      'like',
      {
        id: 'reaction_saved_to_folder',
        createdAt: '2026-06-04T10:01:00.000Z',
      },
    );

    await saveOwnerActionsToProjectFolder(writer, session, [action]);

    expect(JSON.parse(writer.files.get('public/opensocial/actions/index.json') ?? '{}')).toEqual({
      protocol: 'open-social-network',
      version: '0.1',
      actor: session.profile.handle,
      actions: [action],
    });
    expect([...writer.files.keys()].some((path) => path.startsWith('private/'))).toBe(false);
  });

  it('saves portable follows without writing private files', async () => {
    const writer = new MemoryOwnerProjectWriter();
    const session = await createOwnerPage({
      name: 'Ada Lovelace',
      handle: 'ada@example.test',
      bio: 'Building a social page.',
      firstPost: 'Hello from my page.',
    });

    await saveOwnerFollowsToProjectFolder(writer, session, [
      'https://tommy.example.test/profile.json',
    ]);

    expect(JSON.parse(writer.files.get('public/opensocial/follows/index.json') ?? '{}')).toEqual({
      protocol: 'open-social-network',
      version: '0.1',
      owner: session.profile.handle,
      follows: [{ profile: 'https://tommy.example.test/profile.json' }],
    });
    expect([...writer.files.keys()].some((path) => path.startsWith('private/'))).toBe(false);
  });

  it('adapts a browser directory handle into nested text writes', async () => {
    const root = new FakeDirectoryHandle();
    const writer = ownerProjectWriterFromDirectoryHandle(root);

    await writer.writeText('public/opensocial/actions/index.json', '{"actions":[]}\n');

    expect(
      root.directory('public').directory('opensocial').directory('actions').file('index.json')
        .content,
    ).toBe('{"actions":[]}\n');
  });

  it('reads JSON files from a browser directory handle', async () => {
    const root = new FakeDirectoryHandle();
    root.directory('public').file('profile.json').content = '{"handle":"ada@example.test"}';

    await expect(
      readOwnerProjectJsonFromDirectoryHandle(root, 'public/profile.json'),
    ).resolves.toEqual({
      handle: 'ada@example.test',
    });
  });
});

class MemoryOwnerProjectWriter implements WritableOwnerProject {
  readonly files = new Map<string, string>();

  async writeText(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }
}

class FakeDirectoryHandle {
  private readonly directories = new Map<string, FakeDirectoryHandle>();
  private readonly files = new Map<string, FakeFileHandle>();

  async getDirectoryHandle(name: string): Promise<FakeDirectoryHandle> {
    return this.directory(name);
  }

  async getFileHandle(name: string): Promise<FakeFileHandle> {
    return this.file(name);
  }

  directory(name: string): FakeDirectoryHandle {
    const existing = this.directories.get(name);

    if (existing) {
      return existing;
    }

    const created = new FakeDirectoryHandle();
    this.directories.set(name, created);
    return created;
  }

  file(name: string): FakeFileHandle {
    const existing = this.files.get(name);

    if (existing) {
      return existing;
    }

    const created = new FakeFileHandle();
    this.files.set(name, created);
    return created;
  }
}

class FakeFileHandle {
  content = '';

  async createWritable(): Promise<FakeWritableFileStream> {
    return new FakeWritableFileStream(this);
  }

  async getFile(): Promise<FakeFile> {
    return new FakeFile(this.content);
  }
}

class FakeWritableFileStream {
  constructor(private readonly fileHandle: FakeFileHandle) {}

  async write(content: string): Promise<void> {
    this.fileHandle.content = content;
  }

  async close(): Promise<void> {}
}

class FakeFile {
  constructor(private readonly content: string) {}

  async text(): Promise<string> {
    return this.content;
  }
}
