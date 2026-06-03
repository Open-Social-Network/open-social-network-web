import { describe, expect, it } from 'vitest';
import { canonicalStringify, postSigningPayload } from './canonical';
import type { OpenSocialPost } from './types';

describe('canonicalStringify', () => {
  it('sorts object keys recursively while preserving array order', () => {
    const left = {
      z: 1,
      nested: { b: true, a: 'first' },
      list: [{ y: 2, x: 1 }],
    };
    const right = {
      list: [{ x: 1, y: 2 }],
      nested: { a: 'first', b: true },
      z: 1,
    };

    expect(canonicalStringify(left)).toBe(canonicalStringify(right));
    expect(canonicalStringify(left)).toBe(
      '{"list":[{"x":1,"y":2}],"nested":{"a":"first","b":true},"z":1}',
    );
  });
});

describe('postSigningPayload', () => {
  it('removes the mutable signature field before creating the signing payload', () => {
    const post: OpenSocialPost = {
      id: 'post_1',
      author: 'ada@example.test',
      createdAt: '2026-06-03T12:00:00.000Z',
      content: 'Signed content',
      signature: {
        alg: 'ES256',
        value: 'existing-signature',
      },
    };

    expect(postSigningPayload(post)).toEqual({
      id: 'post_1',
      author: 'ada@example.test',
      createdAt: '2026-06-03T12:00:00.000Z',
      content: 'Signed content',
    });
  });
});
