const express = require('express');
const cors = require('cors');
const {
  fetchStarpetsSearch,
  fetchLiveStarpetsItem,
  supremePermissionStatus,
  runWithConcurrency
} = require('./providers');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/items', async (req, res) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  if (!query || query.length > 80) {
    return res.status(400).json({ error: 'Enter an item name (up to 80 characters).' });
  }

  try {
    const items = await fetchStarpetsSearch(query);
    res.set('Cache-Control', 'no-store');
    res.json(items);
  } catch (error) {
    console.error('StarPets search failed:', error.message);
    res.status(502).json({ error: error.publicMessage || 'StarPets search is unavailable right now.' });
  }
});

app.post('/api/calculate', async (req, res) => {
  const requestedItems = req.body?.items;
  if (!Array.isArray(requestedItems) || requestedItems.length === 0 || requestedItems.length > 20) {
    return res.status(400).json({ error: 'Provide between 1 and 20 trade items.' });
  }

  const items = requestedItems.map(item => ({
    id: String(item?.id ?? ''),
    name: typeof item?.name === 'string' ? item.name.trim() : ''
  }));
  if (items.some(item => !item.id || !item.name || item.name.length > 100)) {
    return res.status(400).json({ error: 'Each item needs its StarPets item ID and name.' });
  }

  const uniqueItems = [...new Map(items.map(item => [item.id, item])).values()];
  const results = await runWithConcurrency(uniqueItems, 4, async item => {
    let starpets;
    let supreme;
    try {
      starpets = await fetchLiveStarpetsItem(item);
      supreme = supremePermissionStatus(starpets.marketItem);
    } catch (error) {
      const failure = {
        status: 'unavailable',
        error: error.publicMessage || 'Could not fetch a live source result.',
        sourceUrl: error.sourceUrl
      };
      if (!starpets) {
        starpets = failure;
        supreme = supremePermissionStatus({ rare: '', chroma: false });
      } else {
        supreme = failure;
      }
    }

    if (starpets.marketItem) {
      const { marketItem: _marketItem, ...publicStarpets } = starpets;
      starpets = publicStarpets;
    }

    return {
      id: item.id,
      name: item.name,
      starpets,
      supreme
    };
  });

  res.set('Cache-Control', 'no-store');
  res.json({ fetchedAt: new Date().toISOString(), items: results });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`MM2 trade API listening on port ${PORT}`));
}

module.exports = app;
