import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedApprentices, checkCrafts, parseRatio } from '../../src/site/apprentice.js';

const craft = (ratio, days, registration = 'PROGRAM-1') =>
  ({ name: 'Electrician', ratio, registration, days: days.map(([a, j], i) => ({ label: `Day ${i + 1}`, apprentices: a, journeyworkers: j })) });

test('ratio parsing', () => {
  assert.deepEqual(parseRatio('1:3'), { apprentices: 1, journeyworkers: 3 });
  assert.deepEqual(parseRatio(' 1 to 1 '), { apprentices: 1, journeyworkers: 1 });
  assert.deepEqual(parseRatio('2/5'), { apprentices: 2, journeyworkers: 5 });
  for (const bad of ['', '1', '0:3', '3:0', 'one to three', '1:3:5']) assert.equal(parseRatio(bad), null, bad);
});

test('brief cases: 2 apprentices to 3 journeyworkers at 1:3 breaches, 1 to 3 passes', () => {
  const r = checkCrafts([craft('1:3', [[2, 3], [1, 3]])]);
  assert.equal(r.breaches.length, 1);
  assert.deepEqual(r.breaches[0], { craft: 'Electrician', day: 'Day 1', apprentices: 2, journeyworkers: 3, ratio: '1:3', allowed: 1, over: 1 });
  assert.equal(checkCrafts([craft('1:3', [[1, 3]])]).ok, true);
});

test('edges', () => {
  const r = parseRatio('1:3');
  assert.equal(allowedApprentices(2, r), 0);      // fewer than 3 journeyworkers allows no apprentice at 1:3
  assert.equal(allowedApprentices(6, r), 2);
  assert.equal(allowedApprentices(4, parseRatio('1:1')), 4);
  assert.equal(allowedApprentices(5, parseRatio('2:5')), 2);
  // An apprentice alone on site is always a breach.
  assert.equal(checkCrafts([craft('1:1', [[1, 0]])]).breaches[0].allowed, 0);
  // Days without apprentices are not checked and cannot breach.
  assert.equal(checkCrafts([craft('1:3', [[0, 0], [0, 1]])]).checkedDays, 0);
  // Each classification is checked on its own.
  const two = checkCrafts([craft('1:3', [[1, 3]]), { ...craft('1:1', [[3, 2]]), name: 'Carpenter' }]);
  assert.deepEqual(two.breaches.map((b) => b.craft), ['Carpenter']);
});

test('registration presence and input problems', () => {
  assert.deepEqual(checkCrafts([craft('1:3', [[1, 3]], '  ')]).missingRegistration, [{ craft: 'Electrician' }]);
  assert.deepEqual(checkCrafts([craft('1:3', [[0, 3]], '')]).missingRegistration, [], 'no apprentices, nothing to register');
  assert.deepEqual(checkCrafts([craft('', [[1, 3]])]).problems, [{ craft: 'Electrician', kind: 'ratio' }]);
  assert.deepEqual(checkCrafts([craft('1:3', [[1.5, 3]])]).problems, [{ craft: 'Electrician', kind: 'count' }]);
});
