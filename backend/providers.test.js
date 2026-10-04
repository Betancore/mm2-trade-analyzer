const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getSupremeCategory,
  parseSupremeValue,
  runWithConcurrency,
  toSupremeSlug,
  toStarpetsSlug
} = require('./providers');

test('routes StarPets rarity to the matching Supreme category', () => {
  assert.equal(getSupremeCategory({ rare: 'ancient' }), 'ancients');
  assert.equal(getSupremeCategory({ rare: 'godly' }), 'godlies');
  assert.equal(getSupremeCategory({ rare: 'ancient', chroma: true }), 'chromas');
  assert.equal(getSupremeCategory({ rare: '' }), null);
});

test('normalizes item names to Supreme item slugs', () => {
  assert.equal(toSupremeSlug('Batwing'), 'Batwing');
  assert.equal(toSupremeSlug("Vampire's Gun"), 'Vampires_Gun');
  assert.equal(toSupremeSlug('Chroma Raygun'), 'Chroma_Raygun');
});

test('creates item-page links from the displayed StarPets name, not its internal asset name', () => {
  assert.equal(toStarpetsSlug('Batwing'), 'batwing');
  assert.equal(toStarpetsSlug("Traveler's Gun"), 'travelers_gun');
});

test('parses only the named item value from Supreme detail text', () => {
  const html = '<html><body><p>Batwing is an MM2 Ancient item from the Halloween 2018 event with a value of 42.</p></body></html>';
  assert.equal(parseSupremeValue(html, 'Batwing'), 42);
  assert.throws(() => parseSupremeValue(html, 'Harvester'), /did not return a value/);
});

test('rejects challenge pages instead of trying to infer a value', () => {
  assert.throws(() => parseSupremeValue('<html><body>Just a moment... Cloudflare challenge</body></html>', 'Batwing'), /blocking automated requests/);
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
