const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./database'); // This initializes the DB
const { runScraper } = require('./scraper');

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Schedule the scraper to run automatically every hour
  cron.schedule('0 * * * *', () => {
    console.log('Running scheduled scraper...');
    runScraper().catch(console.error);
  });
  
  console.log('Scraper scheduled to run every hour at minute 0.');
});
