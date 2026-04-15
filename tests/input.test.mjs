import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Joystick } from '../js/input.js';

test('joystick is zero when idle', () => {
  const j = new Joystick();
  assert.deepEqual(j.value(), { x: 0, y: 0 });
});

test('joystick outputs normalized vector within radius', () => {
  const j = new Joystick({ radius: 200, deadZone: 0.08 });
  j.down(500, 500);
  j.move(600, 500); // +100 x, 0 y → jx = 0.5
  const v = j.value();
  assert.equal(Math.round(v.x * 100), 50);
  assert.equal(v.y, 0);
});

test('joystick clamps to radius', () => {
  const j = new Joystick({ radius: 200, deadZone: 0 });
  j.down(0, 0);
  j.move(1000, 0); // way past radius
  const v = j.value();
  assert.equal(v.x, 1);
});

test('dead zone zeros small inputs', () => {
  const j = new Joystick({ radius: 200, deadZone: 0.08 });
  j.down(0, 0);
  j.move(10, 0); // 0.05 normalized → under dead zone
  assert.deepEqual(j.value(), { x: 0, y: 0 });
});

test('release eases toward zero', () => {
  const j = new Joystick({ radius: 200, deadZone: 0, releaseEase: 0.5 });
  j.down(0, 0);
  j.move(200, 0); // x = 1
  j.up();
  j.tick(1); // one tick
  assert.ok(j.value().x < 1);
  assert.ok(j.value().x > 0);
});
