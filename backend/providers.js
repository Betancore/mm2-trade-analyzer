const axios = require('axios');
const STARPETS_API = 'https://mm2-market.apineural.com/api/v2/store/items/all';
const STARPETS_TYPES = [{ type: 'weapon' }, { type: 'pet' }, { type: 'misc' }];
const CATEGORY_BY_RARITY = {
  ancient: 'ancients',
  godly: 'godlies',
  legendary: 'legendaries',
  vintage: 'vintages',
  unique: 'uniques',
  rare: 'rares',
  uncommon: 'uncommons',
  common: 'commons'
};

class ProviderError extends Error {
  constructor(publicMessage, options = {}) {
    super(publicMessage);
    this.publicMessage = publicMessage;
    this.code = options.code || 'UPSTREAM_UNAVAILABLE';
    this.sourceUrl = options.sourceUrl;
  }
}

function formatStarpetsItem(item) {
  return {
    id: String(item.id),
    name: item.name,
    category: item.subtype || item.type,
    rare: item.rare || '',
    chroma: item.chroma === true,
    year: item.year,
    subtype: item.subtype || '',
    image: item.imageUri || ''
  };
}

async function queryStarpets(name) {
  let response;
  try {
    response = await axios.post(STARPETS_API, {
      filter: { types: STARPETS_TYPES, name },
      page: 1,
      amount: 30,
      currency: 'usd',
      sort: { popularity: 'desc' }
    }, {
      timeout: 12000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'MM2TradeAnalyzer/1.0'
      }
    });
  } catch (error) {
    throw new ProviderError('StarPets live market data could not be reached.', {
      code: 'STARPETS_UNAVAILABLE',
      sourceUrl: 'https://starpets.gg/mm2'
    });
  }

  const data = response.data;
  if (!data?.status || data.currency !== 'usd' || !Array.isArray(data.items)) {
    throw new ProviderError('StarPets returned an invalid or non-USD response.', { code: 'STARPETS_INVALID_RESPONSE' });
  }
  return data.items;
}

async function fetchStarpetsSearch(query) {
  const items = await queryStarpets(query);
  return items.map(formatStarpetsItem);
}

async function fetchLiveStarpetsItem(selected) {
  const items = await queryStarpets(selected.name);
  const match = items.find(item => String(item.id) === selected.id && item.name === selected.name);
  if (!match) {
    throw new ProviderError('No current StarPets listing matches this exact item variant.', { code: 'STARPETS_LISTING_NOT_FOUND' });
  }

  const price = Number(match.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new ProviderError('StarPets did not return a valid current listing price.', { code: 'STARPETS_INVALID_PRICE' });
  }

  return {
    status: 'ok',
    price,
    currency: 'USD',
    source: 'StarPets current listing',
    sourceUrl: `https://starpets.gg/mm2/shop/${encodeURIComponent(match.type)}/${encodeURIComponent(toStarpetsSlug(match.name))}/${match.id}`,
    observedAt: new Date().toISOString(),
    marketItem: {
      id: String(match.id),
      name: match.name,
      rare: match.rare || '',
      chroma: match.chroma === true
    }
  };
}

function getSupremeCategory(item) {
  if (item.chroma) return 'chromas';
  return CATEGORY_BY_RARITY[String(item.rare || '').toLowerCase()] || null;
}

function toStarpetsSlug(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function supremePermissionStatus(item) {
  const category = getSupremeCategory(item);
  return {
    status: 'permission_required',
    error: 'Supreme Values prohibits reusing its value-list data in third-party apps without authorization. An official API or written permission is required.',
    sourceUrl: category ? `https://supremevalues.com/mm2/${category}` : 'https://supremevalues.com/'
  };
}

async function runWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = await task(items[index]);
      } catch (error) {
        results[index] = error;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

module.exports = {
  ProviderError,
  fetchStarpetsSearch,
  fetchLiveStarpetsItem,
  getSupremeCategory,
  supremePermissionStatus,
  runWithConcurrency,
  toStarpetsSlug
};
