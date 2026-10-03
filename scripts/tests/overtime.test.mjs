import test from 'node:test';
import assert from 'node:assert/strict';
import { overtime } from '../../src/site/overtime.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('time and a half on the basic rate, fringe at the straight amount', () => {
  const r = overtime({ st: 40, ot: 6, rate: 38.5, fringe: 18.25 });
  close(r.stPay, 1540);
  close(r.otRate, 57.75);
  close(r.otPay, 346.5);
  close(r.premium, 115.5);
  close(r.wages, 1886.5);
  close(r.fringeOwed, 839.5);      // 46 hours x 18.25, no premium
  close(r.total, 2726);
});

test('no overtime and no fringe', () => {
  const r = overtime({ st: 32, ot: 0, rate: 24.15 });
  close(r.premium, 0);
  close(r.total, 772.8);
});
