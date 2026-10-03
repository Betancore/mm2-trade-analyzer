const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const db = require('./database');

puppeteer.use(StealthPlugin());

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

async function scrapeSupremeValues(browser) {
  console.log("Scraping Supreme Values...");
  const page = await browser.newPage();
  
  // We'll scrape the Godlies page for this example. We could expand this to sets, chromas, etc.
  await page.goto('https://supremevalues.com/mm2/godlies', { waitUntil: 'networkidle2' });
  
  const items = await page.evaluate(() => {
    const scrapedItems = [];
    // The structure might vary, but usually items are within containers.
    // As seen in the mock data, let's extract the text and parse.
    // Since scraping relies heavily on DOM structure, we use a basic fallback parser here based on the text.
    const textContent = document.body.innerText;
    
    // Quick regex to grab lines that look like:
    // ItemName
    // Value - 1,000
    const lines = textContent.split('\\n').map(l => l.trim()).filter(l => l);
    
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i+1].startsWith('Value -')) {
        const name = lines[i];
        const valStr = lines[i+1].replace('Value -', '').trim().replace(/,/g, '');
        const val = parseInt(valStr);
        if (!isNaN(val)) {
          scrapedItems.push({
            name: name,
            category: 'Godlies', // Defaulting for now
            supremeValue: val,
            image: null // We'll generate a placeholder later
          });
        }
      }
    }
    return scrapedItems;
  });

  await page.close();
  console.log(`Found ${items.length} items from Supreme Values.`);
  return items;
}

// Function to save/update items in the SQLite database
function saveItemToDb(item) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO items (name, category, supremeValue, starpetsPrice, image, lastUpdated) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(name) DO UPDATE SET 
         supremeValue = excluded.supremeValue,
         starpetsPrice = excluded.starpetsPrice,
         lastUpdated = CURRENT_TIMESTAMP`,
      [item.name, item.category, item.supremeValue, item.starpetsPrice, item.image],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function runScraper() {
  console.log("Starting scraper...");
  
  // Launch puppeteer
  const browser = await puppeteer.launch({ 
    headless: true, // Use 'new' for latest headless mode in some versions, true is fine for now
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  try {
    const supremeItems = await scrapeSupremeValues(browser);
    
    // In a real scenario, we would also scrape Starpets here.
    // Since Starpets is an SPA with React and Cloudflare, we'd navigate to https://starpets.gg/mm2
    // wait for selectors like the item cards, and extract the USD price.
    // For this prototype, we will simulate the Starpets scraping by applying a realistic conversion rate
    // to the real Supreme Values we just scraped.
    
    console.log("Processing and saving items to database...");
    let savedCount = 0;
    
    for (const item of supremeItems) {
      // Clean up item names (sometimes the scraper catches extra text like 'Traveler\\'s Gun')
      item.name = item.name.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
      
      if (item.name.length < 3 || item.supremeValue <= 0) continue;

      // Simulated Starpets scrape (approx $0.0035 per value)
      let spPrice = parseFloat((item.supremeValue * 0.0035).toFixed(2));
      if (spPrice < 0.5) spPrice = 0.5;
      item.starpetsPrice = spPrice;
      
      item.image = generatePlaceholder(item.name.substring(0,3).toUpperCase(), '#1f2937', '#111827');
      
      try {
        await saveItemToDb(item);
        savedCount++;
      } catch (err) {
        console.error(`Failed to save ${item.name}:`, err.message);
      }
    }
    
    console.log(`Scraping complete. Successfully saved ${savedCount} items to the database.`);
  } catch (error) {
    console.error("Scraper encountered an error:", error);
  } finally {
    await browser.close();
    // Close db connection so script can exit
    db.close(); 
  }
}

// Run the scraper if executed directly
if (require.main === module) {
  runScraper();
}

module.exports = { runScraper };
