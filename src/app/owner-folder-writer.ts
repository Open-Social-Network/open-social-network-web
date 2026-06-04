import type { OpenSocialNetworkAction } from '../protocol/types';
import { exportOwnerActionLog, exportOwnerFeed, type OwnerSession } from './owner-session';

const OWNER_FEED_PATH = 'public/feed.json';
const OWNER_ACTION_LOG_PATH = 'public/opensocial/actions/index.json';

export interface WritableOwnerProject {
  writeText(path: string, content: string): Promise<void>;
}

export interface BrowserDirectoryHandle {
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<BrowserDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<BrowserFileHandle>;
}

interface BrowserFileHandle {
  getFile(): Promise<BrowserFile>;
  createWritable(): Promise<BrowserWritableFileStream>;
}

interface BrowserFile {
  text(): Promise<string>;
}

interface BrowserWritableFileStream {
  write(content: string): Promise<void>;
  close(): Promise<void>;
}

export async function readOwnerProjectJsonFromDirectoryHandle(
  directoryHandle: BrowserDirectoryHandle,
  path: string,
): Promise<unknown> {
  const fileHandle = await resolveFileHandle(directoryHandle, path, false);
  const file = await fileHandle.getFile();

  return JSON.parse(await file.text());
}

export async function saveOwnerFeedToProjectFolder(
  writer: WritableOwnerProject,
  session: OwnerSession,
): Promise<void> {
  await writer.writeText(OWNER_FEED_PATH, exportOwnerFeed(session));
}

export async function saveOwnerActionsToProjectFolder(
  writer: WritableOwnerProject,
  session: OwnerSession,
  actions: OpenSocialNetworkAction[],
): Promise<void> {
  await writer.writeText(OWNER_ACTION_LOG_PATH, exportOwnerActionLog(session, actions));
}

export function ownerProjectWriterFromDirectoryHandle(
  directoryHandle: BrowserDirectoryHandle,
): WritableOwnerProject {
  return {
    async writeText(path, content) {
      const fileHandle = await resolveFileHandle(directoryHandle, path, true);
      const writable = await fileHandle.createWritable();

      try {
        await writable.write(content);
      } finally {
        await writable.close();
      }
    },
  };
}

async function resolveFileHandle(
  rootHandle: BrowserDirectoryHandle,
  path: string,
  create: boolean,
): Promise<BrowserFileHandle> {
  const parts = path.split('/').filter(Boolean);
  const fileName = parts.pop();

  if (!fileName || parts.some((part) => part === '..' || part.includes('\\'))) {
    throw new Error('Owner project path is invalid');
  }

  let directoryHandle = rootHandle;

  for (const part of parts) {
    directoryHandle = await directoryHandle.getDirectoryHandle(part, { create });
  }

  return directoryHandle.getFileHandle(fileName, { create });
}
