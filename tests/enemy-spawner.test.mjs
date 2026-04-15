import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetCount } from '../js/enemy-spawner.js';

test('starts at 2 enemies with 0 kills', () => {
  assert.equal(targetCount(0), 2);
});

test('ramps to 3 at 5 kills', () => {
  assert.equal(targetCount(5), 3);
});

test('ramps to 4 at 10 kills', () => {
  assert.equal(targetCount(10), 4);
});

test('caps at 4', () => {
  assert.equal(targetCount(50), 4);
});
