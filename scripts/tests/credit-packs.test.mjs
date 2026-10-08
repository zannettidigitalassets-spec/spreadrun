// Credit packs on the site: six packs everywhere they are listed, the /terms line, and the price table column.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APIS, CREDIT_PACKS, runsPer } from '../../src/catalog.js';
import { PACKS } from '../../api/_lib/clients.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('the site and the server offer the same six packs', () => {
  assert.deepEqual(CREDIT_PACKS.map((p) => p.priceCents), [500, 2000, 5000, 10000, 25000, 50000]);
  assert.deepEqual(CREDIT_PACKS.map((p) => p.id), Object.keys(PACKS));
  for (const p of CREDIT_PACKS) {
    assert.equal(PACKS[p.id].priceCents, p.priceCents);
    assert.equal(p.calls, p.priceCents / 25);
  }
});

test('/terms lists all six packs and nothing else changed in that line', () => {
  const terms = read('src/Terms.jsx');
  assert.match(terms, /Packs are currently \$5, \$20, \$50, \$100, \$250 and \$500\. A pack buys that many cents of credit/);
  assert.match(terms, /refund the unused credits from that purchase/);
});

test('runs per $250 pack: whole where exact, one decimal otherwise', () => {
  const expected = { 25: '1000', 100: '250', 2500: '10', 10000: '2.5', 20000: '1.2', 25000: '1' };
  for (const a of APIS) assert.equal(runsPer(25000, a.priceCents), expected[a.priceCents], a.slug);
  assert.equal(runsPer(25000, 10000), '2.5');
  assert.equal(runsPer(25000, 30000), '0.8');
  assert.equal(runsPer(25000, 25000), '1');
  assert.equal(runsPer(25000, 2500), '10');
  assert.match(read('src/pages/Catalog.jsx'), /<th>Runs per \$250 pack<\/th>/);
  assert.ok(!/Runs per \$50 pack/.test(read('src/pages/Catalog.jsx')));
});

test('no page still lists only four packs', () => {
  for (const f of ['src/pages/PecosApi.jsx', 'src/pages/PbjApi.jsx', 'src/pages/CobraApi.jsx', 'src/pages/CmmcApi.jsx',
    'src/pages/ScaApi.jsx', 'src/pages/Wh347Api.jsx', 'src/pages/Docs.jsx', 'src/pages/Home.jsx', 'src/Terms.jsx']) {
    const s = read(f);
    assert.ok(!/\$50 (or|and) \$100( packs| of credit|\.)/.test(s), f);
    assert.ok(/\$250/.test(s) && /\$500/.test(s), f);
    assert.ok(!/[–—−]/.test(s), f);
  }
});
