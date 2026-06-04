import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('demo profile copy', () => {
  it('keeps demo posts approachable for nontechnical users', async () => {
    const demoSource = await readFile('scripts/generate-demo-profiles.mjs', 'utf8');
    const publicFeeds = await Promise.all(
      ['ada', 'tommy', 'relay'].map((slug) =>
        readFile(`public/profiles/${slug}/feed.json`, 'utf8'),
      ),
    );
    const visibleDemoCopy = [demoSource, ...publicFeeds].join('\n');

    expect(visibleDemoCopy).not.toMatch(/static JSON/i);
    expect(visibleDemoCopy).not.toMatch(/identity file/i);
    expect(visibleDemoCopy).not.toMatch(/MVP target/i);
    expect(visibleDemoCopy).not.toMatch(/signed JSON/i);
    expect(visibleDemoCopy).not.toMatch(/public keys/i);
  });
});
