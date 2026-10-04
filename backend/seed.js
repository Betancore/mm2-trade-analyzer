const db = require('./database');

// Helper to generate dynamic placeholder data URIs
function generatePlaceholder(text, color1, color2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs>
      <linearGradient id="grad${text.replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="60" height="60" fill="url(#grad${text.replace(/[^a-zA-Z0-9]/g, '')})" rx="10" />
    <text x="50%" y="50%" font-family="Arial" font-size="12" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${text.substring(0, 3)}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const MOCK_ITEMS = [
  { name: "Traveler's Gun", category: 'Godlies', supremeValue: 5200, starpetsPrice: 187.20 },
  { name: 'Evergun', category: 'Godlies', supremeValue: 3450, starpetsPrice: 124.20 },
  { name: 'Evergreen', category: 'Godlies', supremeValue: 2675, starpetsPrice: 96.30 },
  { name: 'Constellation', category: 'Godlies', supremeValue: 2600, starpetsPrice: 93.60 },
  { name: 'Alienbeam', category: 'Godlies', supremeValue: 1900, starpetsPrice: 68.40 },
  { name: 'Turkey', category: 'Godlies', supremeValue: 1900, starpetsPrice: 68.40 },
  { name: "Vampire's Gun", category: 'Godlies', supremeValue: 1900, starpetsPrice: 68.40 },
  { name: 'Darkshot', category: 'Godlies', supremeValue: 1800, starpetsPrice: 64.80 },
  { name: 'Darksword', category: 'Godlies', supremeValue: 1775, starpetsPrice: 63.90 },
  { name: 'Raygun', category: 'Godlies', supremeValue: 1775, starpetsPrice: 63.90 },
  { name: 'Blossom', category: 'Godlies', supremeValue: 1350, starpetsPrice: 48.60 },
  { name: 'Sakura', category: 'Godlies', supremeValue: 1340, starpetsPrice: 48.24 },
  { name: 'Sunrise', category: 'Godlies', supremeValue: 1050, starpetsPrice: 37.80 },
  { name: 'Soul', category: 'Godlies', supremeValue: 680, starpetsPrice: 24.48 },
  { name: 'Bauble', category: 'Godlies', supremeValue: 675, starpetsPrice: 24.30 },
  { name: 'Snowcannon', category: 'Godlies', supremeValue: 675, starpetsPrice: 24.27 },
  { name: 'Spirit', category: 'Godlies', supremeValue: 670, starpetsPrice: 24.12 },
  { name: 'Sunset', category: 'Godlies', supremeValue: 650, starpetsPrice: 23.40 },
  { name: 'Rainbow Gun', category: 'Godlies', supremeValue: 420, starpetsPrice: 15.12 },
  { name: 'Flora', category: 'Godlies', supremeValue: 410, starpetsPrice: 14.76 },
  { name: 'Rainbow', category: 'Godlies', supremeValue: 410, starpetsPrice: 14.76 },
  { name: 'Xenoknife', category: 'Godlies', supremeValue: 405, starpetsPrice: 14.58 },
  { name: 'Xenoshot', category: 'Godlies', supremeValue: 405, starpetsPrice: 14.58 },
  { name: 'Bloom', category: 'Godlies', supremeValue: 400, starpetsPrice: 14.40 },
  { name: 'Batwing', category: 'Godlies', supremeValue: 1000000, starpetsPrice: 2.00 },
  { name: 'Harvester', category: 'Ancients', supremeValue: 1350000, starpetsPrice: 8.09 },
  { name: 'Icepiercer', category: 'Ancients', supremeValue: 1250000, starpetsPrice: 5.99 },
  { name: 'Corrupt', category: 'Uniques', supremeValue: 1500000, starpetsPrice: 9.50 },
  { name: 'Black Luger', category: 'Godlies', supremeValue: 1000000, starpetsPrice: 2.10 },
  { name: 'Heart Wand', category: 'Godlies', supremeValue: 340, starpetsPrice: 12.24 },
  { name: 'Blizzard', category: 'Godlies', supremeValue: 300, starpetsPrice: 10.80 },
  { name: 'Snowstorm', category: 'Godlies', supremeValue: 300, starpetsPrice: 10.80 },
  { name: 'Ocean', category: 'Godlies', supremeValue: 265, starpetsPrice: 9.54 },
  { name: 'Waves', category: 'Godlies', supremeValue: 260, starpetsPrice: 9.36 },
  { name: 'Flowerwood Gun', category: 'Godlies', supremeValue: 245, starpetsPrice: 8.82 },
  { name: 'Flowerwood', category: 'Godlies', supremeValue: 240, starpetsPrice: 8.64 },
  { name: 'Snow Dagger', category: 'Godlies', supremeValue: 175, starpetsPrice: 6.30 },
  { name: 'Icecream', category: 'Godlies', supremeValue: 155, starpetsPrice: 5.58 },
  { name: 'Treat', category: 'Godlies', supremeValue: 155, starpetsPrice: 5.58 },
  { name: 'Watergun', category: 'Godlies', supremeValue: 155, starpetsPrice: 5.58 },
  { name: 'Sweet', category: 'Godlies', supremeValue: 150, starpetsPrice: 5.40 },
  { name: 'Borealis', category: 'Godlies', supremeValue: 145, starpetsPrice: 5.22 },
  { name: 'Australis', category: 'Godlies', supremeValue: 140, starpetsPrice: 5.04 },
  { name: 'Bat', category: 'Godlies', supremeValue: 125, starpetsPrice: 4.50 },
  { name: 'Beachy', category: 'Godlies', supremeValue: 90, starpetsPrice: 3.24 },
  { name: 'Sands', category: 'Godlies', supremeValue: 90, starpetsPrice: 3.24 },
  { name: 'Pearlshine', category: 'Godlies', supremeValue: 80, starpetsPrice: 2.88 },
  { name: 'Candy', category: 'Godlies', supremeValue: 80, starpetsPrice: 3.11 },
  { name: 'Pearl', category: 'Godlies', supremeValue: 75, starpetsPrice: 2.70 },
  { name: 'Ornament', category: 'Godlies', supremeValue: 70, starpetsPrice: 2.52 },
  { name: 'Heartblade', category: 'Godlies', supremeValue: 65, starpetsPrice: 2.37 },
  { name: 'Phantom', category: 'Godlies', supremeValue: 35, starpetsPrice: 1.26 },
  { name: 'Red Luger', category: 'Godlies', supremeValue: 35, starpetsPrice: 1.26 },
  { name: 'Spectre', category: 'Godlies', supremeValue: 35, starpetsPrice: 1.26 },
  { name: 'Candleflame', category: 'Godlies', supremeValue: 33, starpetsPrice: 1.18 },
  { name: 'Darkbringer', category: 'Godlies', supremeValue: 33, starpetsPrice: 1.18 },
  { name: 'Elderwood Blade', category: 'Godlies', supremeValue: 33, starpetsPrice: 1.18 },
  { name: 'Elderwood Revolver', category: 'Godlies', supremeValue: 33, starpetsPrice: 1.18 },
  { name: 'Iceblaster', category: 'Godlies', supremeValue: 33, starpetsPrice: 1.30 },
  { name: 'Makeshift', category: 'Godlies', supremeValue: 33, starpetsPrice: 1.18 },
  { name: 'Lightbringer', category: 'Godlies', supremeValue: 32, starpetsPrice: 1.15 },
  { name: 'Sugar', category: 'Godlies', supremeValue: 32, starpetsPrice: 1.27 },
  { name: 'Green Luger', category: 'Godlies', supremeValue: 23, starpetsPrice: 0.82 },
  { name: 'Amerilaser', category: 'Godlies', supremeValue: 22, starpetsPrice: 0.79 },
  { name: 'Laser', category: 'Godlies', supremeValue: 22, starpetsPrice: 0.79 },
  { name: 'Hallowgun', category: 'Godlies', supremeValue: 20, starpetsPrice: 0.72 },
  { name: 'Nightblade', category: 'Godlies', supremeValue: 20, starpetsPrice: 0.72 },
  { name: 'Shark', category: 'Godlies', supremeValue: 20, starpetsPrice: 0.72 }
];

console.log("Seeding database...");
let count = 0;

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    category TEXT,
    supremeValue INTEGER,
    starpetsPrice REAL,
    image TEXT,
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  for (const item of MOCK_ITEMS) {
    const image = generatePlaceholder(item.name.substring(0,3).toUpperCase(), '#1f2937', '#111827');
    
    db.run(
      `INSERT INTO items (name, category, supremeValue, starpetsPrice, image, lastUpdated) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(name) DO UPDATE SET 
         supremeValue = excluded.supremeValue,
         starpetsPrice = excluded.starpetsPrice,
         image = excluded.image,
         lastUpdated = CURRENT_TIMESTAMP`,
      [item.name, item.category, item.supremeValue, item.starpetsPrice, image],
      function(err) {
        if (err) {
          console.error("Error inserting", item.name, err.message);
        } else {
          count++;
          if (count === MOCK_ITEMS.length) {
            console.log(`Successfully seeded ${count} items into SQLite database.`);
          }
        }
      }
    );
  }
});
