import test from 'node:test';
import assert from 'node:assert/strict';
import { annualize } from '../../src/site/fringe.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('straight annualization over all hours worked', () => {
  // $9,360 a year of health insurance for a worker with 2,080 hours on all jobs: $4.50 an hour, not $9,360 / DBA hours.
  const r = annualize({ annualCost: 9360, totalHours: 2080 });
  close(r.credit, 4.5);
  close(r.provided, 4.5);
  assert.equal(r.difference, undefined);
});

test('cash in lieu adds to the plan credit', () => {
  const r = annualize({ annualCost: 12000, totalHours: 2000, cashPerHour: 2.25 });
  close(r.credit, 6);
  close(r.provided, 8.25);
});

test('shortfall and surplus against the required fringe rate', () => {
  const short = annualize({ annualCost: 10400, totalHours: 2080, cashPerHour: 1, requiredRate: 8.1 });
  close(short.credit, 5);
  close(short.difference, -2.1);
  close(short.shortfall, 2.1);
  const over = annualize({ annualCost: 20800, totalHours: 2080, requiredRate: 8.1 });
  close(over.difference, 1.9);
  assert.equal(over.shortfall, 0);
  // A shortfall of a fraction of a cent rounds up to a full cent.
  const tiny = annualize({ annualCost: 1000, totalHours: 3, requiredRate: 333.34 });
  close(tiny.shortfall, 0.01);
});
