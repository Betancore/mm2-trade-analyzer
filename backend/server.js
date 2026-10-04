const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./database'); // This initializes the DB
const { runScraper, fetchLivePrices } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API endpoint to fetch items
app.get('/api/items', (req, res) => {
  const { query } = req.query;
  
  let sql = 'SELECT * FROM items';
  let params = [];
  
  if (query) {
    sql += ' WHERE name LIKE ?';
    params.push(`%${query}%`);
  }
  
  // Sort by highest supreme value by default
  sql += ' ORDER BY supremeValue DESC LIMIT 50';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Failed to fetch items from database' });
      return;
    }
    res.json(rows);
  });
});

// API endpoint to calculate live prices on demand
app.post('/api/calculate', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required' });
  }
  
  try {
    // Remove duplicates
    const uniqueItems = [...new Set(items)];
    const livePrices = await fetchLivePrices(uniqueItems);
    
    // Asynchronously update the database with these new exact prices in the background
    for (const [name, price] of Object.entries(livePrices)) {
      if (price) {
        db.run('UPDATE items SET starpetsPrice = ?, lastUpdated = CURRENT_TIMESTAMP WHERE name = ?', [price, name]);
      }
    }
    
    res.json(livePrices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to calculate live prices' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Schedule the scraper to run automatically every hour
  cron.schedule('0 * * * *', () => {
    console.log('Running scheduled scraper...');
    runScraper().catch(console.error);
  });
  
  console.log('Scraper scheduled to run every hour at minute 0.');
});
