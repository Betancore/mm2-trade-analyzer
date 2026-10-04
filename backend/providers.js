const axios = require('axios');
const cheerio = require('cheerio');

const STARPETS_API = 'https://mm2-market.apineural.com/api/v2/store/items/all';
const SUPREME_BASE = 'https://supremevalues.com/mm2';
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
    throw new ProviderError('StarPets live market data could not be reached.', { code: 'STARPETS_UNAVAILABLE' });
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

function toSupremeSlug(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseSupremeValue(html, itemName) {
  const text = cheerio.load(html)('body').text().replace(/\s+/g, ' ').trim();
  if (/just a moment|attention required|cf-chl-|cloudflare/i.test(text.slice(0, 1500))) {
    throw new ProviderError('Supreme Values is blocking automated requests from the API host.', { code: 'SUPREME_BLOCKED' });
  }

  const name = escapeRegExp(itemName);
  const sentence = new RegExp(`${name}\\s+is\\s+an?\\s+MM2\\s+[^.]{0,300}?\\s+with\\s+a\\s+value\\s+of\\s+([\\d,]+)\\b`, 'i');
  const sentenceMatch = text.match(sentence);
  if (sentenceMatch) return Number(sentenceMatch[1].replace(/,/g, ''));

  const card = new RegExp(`${name}\\s+Value\\s*-\\s*([\\d,]+)\\b`, 'i');
  const cardMatch = text.match(card);
  if (cardMatch) return Number(cardMatch[1].replace(/,/g, ''));

  throw new ProviderError(`Supreme Values did not return a value for ${itemName}.`, { code: 'SUPREME_ITEM_NOT_FOUND' });
}

async function fetchLiveSupremeValue(item) {
  const category = getSupremeCategory(item);
  if (!category) {
    throw new ProviderError('This listing does not identify a Supreme Values category.', { code: 'SUPREME_CATEGORY_UNKNOWN' });
  }

  const sourceUrl = `${SUPREME_BASE}/${category}?item=${encodeURIComponent(toSupremeSlug(item.name))}`;
  let response;
  try {
    response = await axios.get(sourceUrl, {
      timeout: 12000,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'MM2TradeAnalyzer/1.0'
      }
    });
  } catch (error) {
    const blocked = error.response?.status === 403 || error.response?.status === 503;
    throw new ProviderError(
      blocked ? 'Supreme Values is blocking automated requests from the API host.' : 'Supreme Values could not be reached.',
      { code: blocked ? 'SUPREME_BLOCKED' : 'SUPREME_UNAVAILABLE' }
    );
  }

  const value = parseSupremeValue(response.data, item.name);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ProviderError(`Supreme Values returned an invalid value for ${item.name}.`, { code: 'SUPREME_INVALID_VALUE' });
  }

  return {
    status: 'ok',
    value,
    source: 'Supreme Values',
    sourceUrl,
    observedAt: new Date().toISOString()
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
  fetchLiveSupremeValue,
  getSupremeCategory,
  parseSupremeValue,
  runWithConcurrency,
  toSupremeSlug,
  toStarpetsSlug
};
