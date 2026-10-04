const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getSupremeCategory,
  runWithConcurrency,
  supremePermissionStatus,
  toStarpetsSlug
} = require('./providers');

test('routes StarPets rarity to the matching Supreme category', () => {
  assert.equal(getSupremeCategory({ rare: 'ancient' }), 'ancients');
  assert.equal(getSupremeCategory({ rare: 'godly' }), 'godlies');
  assert.equal(getSupremeCategory({ rare: 'ancient', chroma: true }), 'chromas');
  assert.equal(getSupremeCategory({ rare: '' }), null);
});

test('creates item-page links from the displayed StarPets name, not its internal asset name', () => {
  assert.equal(toStarpetsSlug('Batwing'), 'batwing');
  assert.equal(toStarpetsSlug("Traveler's Gun"), 'travelers_gun');
});

test('marks Supreme values unavailable until authorized data access is configured', () => {
  const result = supremePermissionStatus({ rare: 'ancient', chroma: false });
  assert.equal(result.status, 'permission_required');
  assert.match(result.error, /written permission/i);
  assert.equal(result.sourceUrl, 'https://supremevalues.com/mm2/ancients');
});

test('runs tasks within the configured concurrency bound and preserves order', async () => {
  let active = 0;
  let maxActive = 0;
  const results = await runWithConcurrency([1, 2, 3, 4], 2, async value => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return value * 2;
  });
  assert.deepEqual(results, [2, 4, 6, 8]);
  assert.equal(maxActive, 2);
});
