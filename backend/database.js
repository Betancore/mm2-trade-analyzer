const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create items table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      category TEXT,
      supremeValue INTEGER,
      starpetsPrice REAL,
      image TEXT,
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

module.exports = db;
