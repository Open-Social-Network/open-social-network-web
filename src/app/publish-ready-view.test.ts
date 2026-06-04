import { describe, expect, it } from 'vitest';
import { renderPublishReady } from './publish-ready-view';

describe('publish ready view', () => {
  it('puts the public download action directly in the publish reminder', () => {
    const html = renderPublishReady({
      title: '2 posts ready to publish',
      detail: 'Download your public site to publish your latest posts.',
    });

    expect(html).toContain('2 posts ready to publish');
    expect(html).toContain('Download your public site to publish your latest posts.');
    expect(html).toContain('data-owner-download="public"');
    expect(html).toContain('Download public site');
    expect(html).toContain('data-action="owner-published"');
  });

  it('escapes summary copy before rendering it', () => {
    const html = renderPublishReady({
      title: '<script>alert("bad")</script>',
      detail: 'Publish <strong>now</strong>',
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<strong>now</strong>');
    expect(html).toContain('&lt;script&gt;alert(&quot;bad&quot;)&lt;/script&gt;');
    expect(html).toContain('Publish &lt;strong&gt;now&lt;/strong&gt;');
  });
});
