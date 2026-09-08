import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProgress, accuracy } from './progress.js';

test('missing or malformed progress safely starts fresh', () => {
  for (const value of [null, undefined, 'broken', 12, { completed: {}, answers: null }]) {
    assert.deepEqual(cleanProgress(value, ['lesson'], ['hand']), { completed: [], answers: {} });
  }
});

test('only known lessons and boolean first answers survive loading', () => {
  assert.deepEqual(cleanProgress({
    completed: ['lesson', 'lesson', 'unknown'],
    answers: { hand: { pattern: true, discard: false, extra: 1 }, other: { pattern: 1, discard: true } },
  }, ['lesson'], ['hand', 'other']), {
    completed: ['lesson'], answers: { hand: { pattern: true, discard: false } },
  });
});

test('accuracy requires both answers to be correct', () => {
  assert.equal(accuracy({}), 0);
  assert.equal(accuracy({ a: { pattern: true, discard: false } }), 0);
  assert.equal(accuracy({ a: { pattern: true, discard: true }, b: { pattern: false, discard: true } }), 50);
});
