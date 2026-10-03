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
  { name: "Traveler's Gun", category: 'Godlies', supremeValue: 5200, starpetsPrice: 18.2 },
  { name: 'Evergun', category: 'Godlies', supremeValue: 3450, starpetsPrice: 12.08 },
  { name: 'Evergreen', category: 'Godlies', supremeValue: 2675, starpetsPrice: 9.36 },
  { name: 'Constellation', category: 'Godlies', supremeValue: 2600, starpetsPrice: 9.1 },
  { name: 'Alienbeam', category: 'Godlies', supremeValue: 1900, starpetsPrice: 6.65 },
  { name: 'Turkey', category: 'Godlies', supremeValue: 1900, starpetsPrice: 6.65 },
  { name: "Vampire's Gun", category: 'Godlies', supremeValue: 1900, starpetsPrice: 6.65 },
  { name: 'Darkshot', category: 'Godlies', supremeValue: 1800, starpetsPrice: 6.3 },
  { name: 'Darksword', category: 'Godlies', supremeValue: 1775, starpetsPrice: 6.21 },
  { name: 'Raygun', category: 'Godlies', supremeValue: 1775, starpetsPrice: 6.21 },
  { name: 'Blossom', category: 'Godlies', supremeValue: 1350, starpetsPrice: 4.73 },
  { name: 'Sakura', category: 'Godlies', supremeValue: 1340, starpetsPrice: 4.69 },
  { name: 'Sunrise', category: 'Godlies', supremeValue: 1050, starpetsPrice: 3.68 },
  { name: 'Soul', category: 'Godlies', supremeValue: 680, starpetsPrice: 2.38 },
  { name: 'Bauble', category: 'Godlies', supremeValue: 675, starpetsPrice: 2.36 },
  { name: 'Snowcannon', category: 'Godlies', supremeValue: 675, starpetsPrice: 2.36 },
  { name: 'Spirit', category: 'Godlies', supremeValue: 670, starpetsPrice: 2.35 },
  { name: 'Sunset', category: 'Godlies', supremeValue: 650, starpetsPrice: 2.27 },
  { name: 'Rainbow Gun', category: 'Godlies', supremeValue: 420, starpetsPrice: 1.47 },
  { name: 'Flora', category: 'Godlies', supremeValue: 410, starpetsPrice: 1.44 },
  { name: 'Rainbow', category: 'Godlies', supremeValue: 410, starpetsPrice: 1.44 },
  { name: 'Xenoknife', category: 'Godlies', supremeValue: 405, starpetsPrice: 1.42 },
  { name: 'Xenoshot', category: 'Godlies', supremeValue: 405, starpetsPrice: 1.42 },
  { name: 'Bloom', category: 'Godlies', supremeValue: 400, starpetsPrice: 1.4 },
  { name: 'Batwing', category: 'Godlies', supremeValue: 1000000, starpetsPrice: 3500 },
  { name: 'Black Luger', category: 'Godlies', supremeValue: 1000000, starpetsPrice: 3500 },
  { name: 'Heart Wand', category: 'Godlies', supremeValue: 340, starpetsPrice: 1.19 },
  { name: 'Blizzard', category: 'Godlies', supremeValue: 300, starpetsPrice: 1.05 },
  { name: 'Snowstorm', category: 'Godlies', supremeValue: 300, starpetsPrice: 1.05 },
  { name: 'Ocean', category: 'Godlies', supremeValue: 265, starpetsPrice: 0.93 },
  { name: 'Waves', category: 'Godlies', supremeValue: 260, starpetsPrice: 0.91 },
  { name: 'Flowerwood Gun', category: 'Godlies', supremeValue: 245, starpetsPrice: 0.86 },
  { name: 'Flowerwood', category: 'Godlies', supremeValue: 240, starpetsPrice: 0.84 },
  { name: 'Snow Dagger', category: 'Godlies', supremeValue: 175, starpetsPrice: 0.61 },
  { name: 'Icecream', category: 'Godlies', supremeValue: 155, starpetsPrice: 0.54 },
  { name: 'Treat', category: 'Godlies', supremeValue: 155, starpetsPrice: 0.54 },
  { name: 'Watergun', category: 'Godlies', supremeValue: 155, starpetsPrice: 0.54 },
  { name: 'Sweet', category: 'Godlies', supremeValue: 150, starpetsPrice: 0.53 },
  { name: 'Borealis', category: 'Godlies', supremeValue: 145, starpetsPrice: 0.51 },
  { name: 'Australis', category: 'Godlies', supremeValue: 140, starpetsPrice: 0.5 },
  { name: 'Bat', category: 'Godlies', supremeValue: 125, starpetsPrice: 0.5 },
  { name: 'Beachy', category: 'Godlies', supremeValue: 90, starpetsPrice: 0.5 },
  { name: 'Sands', category: 'Godlies', supremeValue: 90, starpetsPrice: 0.5 },
  { name: 'Pearlshine', category: 'Godlies', supremeValue: 80, starpetsPrice: 0.5 },
  { name: 'Candy', category: 'Godlies', supremeValue: 80, starpetsPrice: 0.5 },
  { name: 'Pearl', category: 'Godlies', supremeValue: 75, starpetsPrice: 0.5 },
  { name: 'Ornament', category: 'Godlies', supremeValue: 70, starpetsPrice: 0.5 },
  { name: 'Heartblade', category: 'Godlies', supremeValue: 65, starpetsPrice: 0.5 },
  { name: 'Phantom', category: 'Godlies', supremeValue: 35, starpetsPrice: 0.5 },
  { name: 'Red Luger', category: 'Godlies', supremeValue: 35, starpetsPrice: 0.5 },
  { name: 'Spectre', category: 'Godlies', supremeValue: 35, starpetsPrice: 0.5 },
  { name: 'Candleflame', category: 'Godlies', supremeValue: 33, starpetsPrice: 0.5 },
  { name: 'Darkbringer', category: 'Godlies', supremeValue: 33, starpetsPrice: 0.5 },
  { name: 'Elderwood Blade', category: 'Godlies', supremeValue: 33, starpetsPrice: 0.5 },
  { name: 'Elderwood Revolver', category: 'Godlies', supremeValue: 33, starpetsPrice: 0.5 },
  { name: 'Iceblaster', category: 'Godlies', supremeValue: 33, starpetsPrice: 0.5 },
  { name: 'Makeshift', category: 'Godlies', supremeValue: 33, starpetsPrice: 0.5 },
  { name: 'Lightbringer', category: 'Godlies', supremeValue: 32, starpetsPrice: 0.5 },
  { name: 'Sugar', category: 'Godlies', supremeValue: 32, starpetsPrice: 0.5 },
  { name: 'Green Luger', category: 'Godlies', supremeValue: 23, starpetsPrice: 0.5 },
  { name: 'Amerilaser', category: 'Godlies', supremeValue: 22, starpetsPrice: 0.5 },
  { name: 'Laser', category: 'Godlies', supremeValue: 22, starpetsPrice: 0.5 },
  { name: 'Hallowgun', category: 'Godlies', supremeValue: 20, starpetsPrice: 0.5 },
  { name: 'Nightblade', category: 'Godlies', supremeValue: 20, starpetsPrice: 0.5 },
  { name: 'Shark', category: 'Godlies', supremeValue: 20, starpetsPrice: 0.5 }
];

console.log("Seeding database...");
let count = 0;

for (const item of MOCK_ITEMS) {
  const image = generatePlaceholder(item.name.substring(0,3).toUpperCase(), '#1f2937', '#111827');
  
  db.run(
    `INSERT INTO items (name, category, supremeValue, starpetsPrice, image, lastUpdated) 
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(name) DO UPDATE SET 
       supremeValue = excluded.supremeValue,
       starpetsPrice = excluded.starpetsPrice,
       lastUpdated = CURRENT_TIMESTAMP`,
    [item.name, item.category, item.supremeValue, item.starpetsPrice, image],
    function(err) {
      if (err) {
        console.error("Error inserting", item.name, err.message);
      } else {
        count++;
        if (count === MOCK_ITEMS.length) {
          console.log(`Successfully seeded ${count} items into SQLite database.`);
          db.close();
        }
      }
    }
  );
}
