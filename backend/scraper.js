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

async function scrapeStarpets(browser, supremeItems) {
  console.log("Scraping Starpets for real USD prices...");
  const page = await browser.newPage();
  
  // Starpets uses infinite scrolling or pagination. We'll try to scroll a few times to load more items.
  await page.goto('https://starpets.gg/mm2', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));
  
  // Scroll a few times to load more elements
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 1000));
  }

  const starpetsData = await page.evaluate(() => {
    // Starpets renders items roughly as blocks with the name and a price string like "24.27 $" or "0.68 €"
    // Let's grab all text blocks and try to pair them.
    // Looking at the console output, it looks like:
    // Snowcannon
    // 24.27 $
    // OR
    // Batwing
    // 2 €
    const itemsMap = {};
    const elements = document.body.innerText.split('\\n').map(l => l.trim()).filter(l => l);
    
    for (let i = 0; i < elements.length - 1; i++) {
      const name = elements[i];
      const nextLine = elements[i+1];
      
      // Match something that looks like a price (e.g. "24.27 $", "2.50 €", etc.)
      const priceMatch = nextLine.match(/^([0-9.,]+)\s*[$€]$/);
      if (priceMatch) {
        // Convert to USD roughly if it's Euro, or just parse the number
        // Starpets shows Euro for some regions, we'll assume 1:1 or 1:1.1 for this prototype
        let price = parseFloat(priceMatch[1].replace(',', '.'));
        if (nextLine.includes('€')) {
           price = price * 1.08; // Rough EUR to USD conversion
        }
        itemsMap[name.toLowerCase()] = parseFloat(price.toFixed(2));
      }
    }
    return itemsMap;
  });

  await page.close();
  console.log(`Extracted ${Object.keys(starpetsData).length} unique prices from Starpets.`);
  
  // Map back to our supreme items
  for (const item of supremeItems) {
    const spPrice = starpetsData[item.name.toLowerCase()];
    if (spPrice) {
      item.starpetsPrice = spPrice;
    } else {
      // Fallback if not found on the page we scrolled
      // Some items are very rare or out of stock and won't appear easily
      let estimated = parseFloat((item.supremeValue * 0.036).toFixed(2));
      item.starpetsPrice = estimated < 0.5 ? 0.5 : estimated; 
    }
  }
  
  return supremeItems;
}
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
    
    // We will now scrape Starpets here.
    const mergedItems = await scrapeStarpets(browser, supremeItems);
    
    console.log("Processing and saving items to database...");
    let savedCount = 0;
    
    for (const item of mergedItems) {
      // Clean up item names (sometimes the scraper catches extra text like 'Traveler\\'s Gun')
      item.name = item.name.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
      
      if (item.name.length < 3 || item.supremeValue <= 0) continue;

      // Simulated Starpets scrape (approx $0.0035 per value)
      // Removed because it is now handled by the scrapeStarpets function
      
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
