import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Plane } from '../js/plane.js';

test('plane integrates forward velocity along its heading', () => {
  const p = new Plane({ speed: 80 });
  p.update(1, { x: 0, y: 0 });
  // heading is +X start? We'll define: initial forward = -Z
  assert.equal(Math.round(p.position.z), -80);
});

test('joystick y drives pitch rate', () => {
  const p = new Plane();
  for (let i = 0; i < 60; i++) p.update(1 / 60, { x: 0, y: -1 });
  assert.ok(p.pitch > 0.5, `expected pitch > 0.5, got ${p.pitch}`);
});

test('joystick x drives roll toward max', () => {
  const p = new Plane();
  for (let i = 0; i < 120; i++) p.update(1 / 60, { x: 1, y: 0 });
  assert.ok(p.roll > Math.PI / 4, `expected roll > 45deg, got ${p.roll}`);
});

test('bank induces yaw', () => {
  const p = new Plane();
  for (let i = 0; i < 60; i++) p.update(1 / 60, { x: 1, y: 0 }); // roll right
  const yawBefore = p.yaw;
  for (let i = 0; i < 60; i++) p.update(1 / 60, { x: 1, y: 0 });
  assert.ok(p.yaw < yawBefore, `yaw should decrease (turn right): before ${yawBefore} after ${p.yaw}`);
});

test('drift recovery applies yaw bias when beyond soft radius', () => {
  const p = new Plane();
  p.position.x = 2000; p.position.z = 0; // past soft radius 1800
  const yawBefore = p.yaw;
  p.update(1, { x: 0, y: 0 });
  assert.notEqual(p.yaw, yawBefore, 'yaw should change from recovery bias');
});

test('no recovery bias inside safe radius', () => {
  const p = new Plane();
  p.position.x = 100;
  const yawBefore = p.yaw;
  p.update(1, { x: 0, y: 0 });
  assert.equal(p.yaw, yawBefore);
});
