export interface OpenSocialDirectory {
  protocol: 'opensocial';
  version: '0.1';
  profiles: string[];
}

export async function loadDirectory(
  directoryUrl = '/profiles/directory.json',
): Promise<string[]> {
  const response = await fetch(directoryUrl, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Could not load directory: HTTP ${response.status}`);
  }

  const directory = (await response.json()) as OpenSocialDirectory;

  if (
    directory.protocol !== 'opensocial' ||
    directory.version !== '0.1' ||
    !Array.isArray(directory.profiles)
  ) {
    throw new Error('Directory file is not a valid OpenSocial directory');
  }

  return directory.profiles.map((profileUrl) =>
    new URL(profileUrl, window.location.origin).toString(),
  );
}
