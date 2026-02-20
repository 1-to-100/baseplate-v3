/**
 * Unit tests for cosine similarity
 */
import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { cosineSimilarity } from './cosine-similarity.ts';

Deno.test('cosineSimilarity: identical vectors return 1', () => {
  const v = [1, 2, 3];
  assertEquals(cosineSimilarity(v, v), 1);
});

Deno.test('cosineSimilarity: orthogonal vectors return 0', () => {
  assertEquals(cosineSimilarity([1, 0, 0], [0, 1, 0]), 0);
  assertEquals(cosineSimilarity([1, 0], [0, 1]), 0);
});

Deno.test('cosineSimilarity: opposite vectors return -1', () => {
  assertEquals(cosineSimilarity([1, 0], [-1, 0]), -1);
});

Deno.test('cosineSimilarity: known value', () => {
  // [1,0] and [0.6, 0.8] -> dot=0.6, |a|=1, |b|=1 -> 0.6
  const a = [1, 0];
  const b = [0.6, 0.8];
  assertEquals(cosineSimilarity(a, b), 0.6);
});

Deno.test('cosineSimilarity: throws when lengths differ', () => {
  assertThrows(
    () => cosineSimilarity([1, 2], [1, 2, 3]),
    Error,
    'Vectors must have the same length'
  );
});
