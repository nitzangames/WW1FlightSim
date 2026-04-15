import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldToRadar } from '../js/minimap.js';

test('enemy directly ahead maps above center (negative dy)', () => {
  const player = { position: { x: 0, y: 0, z: 0 }, yaw: 0 };
  const enemy = { x: 0, y: 0, z: -500 };
  const p = worldToRadar(player, enemy, 100, 2000);
  assert.equal(p.x, 0);
  assert.ok(p.y < 0, `expected y<0, got ${p.y}`);
});

test('enemy behind maps below center (positive dy)', () => {
  const player = { position: { x: 0, y: 0, z: 0 }, yaw: 0 };
  const enemy = { x: 0, y: 0, z: 500 };
  const p = worldToRadar(player, enemy, 100, 2000);
  assert.ok(p.y > 0);
});

test('enemy beyond range clamps to edge of radar', () => {
  const player = { position: { x: 0, y: 0, z: 0 }, yaw: 0 };
  const enemy = { x: 10000, y: 0, z: 0 };
  const p = worldToRadar(player, enemy, 100, 2000);
  assert.ok(Math.hypot(p.x, p.y) <= 100.01);
});

test('yaw rotates the radar', () => {
  const player = { position: { x: 0, y: 0, z: 0 }, yaw: Math.PI / 2 };
  const enemy = { x: 0, y: 0, z: -500 };
  const p = worldToRadar(player, enemy, 100, 2000);
  // With player yaw=π/2, player forward=(-1,0,0). Enemy at -Z is on player's right.
  assert.ok(p.x > 0, `expected x>0, got ${p.x}`);
});
