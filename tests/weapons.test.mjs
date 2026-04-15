import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inCone, leadTarget } from '../js/weapons.js';

const DEG = Math.PI / 180;

test('enemy directly ahead is in cone', () => {
  const self = { x: 0, y: 0, z: 0 };
  const forward = { x: 0, y: 0, z: -1 };
  const enemy = { x: 0, y: 0, z: -100 };
  assert.equal(inCone(self, forward, enemy, { angle: 15 * DEG, range: 400 }), true);
});

test('enemy behind is NOT in cone', () => {
  const self = { x: 0, y: 0, z: 0 };
  const forward = { x: 0, y: 0, z: -1 };
  const enemy = { x: 0, y: 0, z: 200 };
  assert.equal(inCone(self, forward, enemy, { angle: 15 * DEG, range: 400 }), false);
});

test('enemy beyond range is NOT in cone', () => {
  const self = { x: 0, y: 0, z: 0 };
  const forward = { x: 0, y: 0, z: -1 };
  const enemy = { x: 0, y: 0, z: -500 };
  assert.equal(inCone(self, forward, enemy, { angle: 15 * DEG, range: 400 }), false);
});

test('enemy at 20° is NOT in a 15° cone', () => {
  const self = { x: 0, y: 0, z: 0 };
  const forward = { x: 0, y: 0, z: -1 };
  const d = 100;
  const a = 20 * DEG;
  const enemy = { x: Math.sin(a) * d, y: 0, z: -Math.cos(a) * d };
  assert.equal(inCone(self, forward, enemy, { angle: 15 * DEG, range: 400 }), false);
});

test('leadTarget predicts intercept point', () => {
  const shooter = { x: 0, y: 0, z: 0 };
  const target = { x: 100, y: 0, z: -100, vx: 0, vy: 0, vz: 10 };
  const bulletSpeed = 200;
  const pt = leadTarget(shooter, target, bulletSpeed);
  assert.ok(pt.z > -100);
});
