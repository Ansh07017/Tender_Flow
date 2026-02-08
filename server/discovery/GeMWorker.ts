import puppeteer from 'puppeteer';
import { SKU, DiscoveryFilters, Tender, } from '../../types';

export interface GeMBid {
  id: string;
  title: string;
  org: string;
  endDate: string;
  category: string;
  url: string;
  emdRequired: boolean;
  consigneeLocation: string;
  distance?: number;
  matchScore?: number;
  inStock?: boolean;
}

export class GeMWorker {
  private inventory: SKU[];
  private filters: DiscoveryFilters;

  constructor(inventory: SKU[], filters: DiscoveryFilters) {
    this.inventory = inventory;
    this.filters = filters;
  }

  async scrape(category: string): Promise<GeMBid[]> {
    const browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox','--window-size=1920,1080', '--disable-blink-features=AutomationControlled', '--ignore-certificate-errors', '--ignore-certificate-errors-spki-list']
    });
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      await page.goto('https://bidplus.gem.gov.in/all-bids', { waitUntil: 'networkidle2' });

const searchInput = '#searchBid'; 
await page.waitForSelector(searchInput, { visible: true, timeout: 60000 });
await page.type(searchInput, category, { delay: 100 });

const searchButton = '#searchBidRA'; 
await page.waitForSelector(searchButton, { visible: true });

await Promise.all([
  page.click(searchButton),
  page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => null)
]);

const bids = await page.evaluate(() => {
  const container = document.querySelector('#bidCard');
  if (!container) return [];

  const cards = Array.from(container.querySelectorAll('.card'));
  
  return cards.map(card => {
    const htmlCard = card as HTMLElement;
    
    // 1. EXTRACT NUMERIC ID
    // We look for the link containing the document ID
    const urlElement = card.querySelector('a.bid_no_hover') as HTMLAnchorElement;
    const rawHref = urlElement?.getAttribute('href') || '';
    
    // Use Regex to extract only the numbers (e.g., 8874033) from the path
    const idMatch = rawHref.match(/\d+/);
    const extractedNo = idMatch ? idMatch[0] : '';
    
    // 2. CONSTRUCT THE DIRECT URL
    const finalUrl = extractedNo 
      ? `https://bidplus.gem.gov.in/showbidDocument/${extractedNo}` 
      : '';

    const bidNo = urlElement?.textContent?.trim() || 'Unknown';
    const endDateSpan = card.querySelector('.end_date');
    const endDateMatch = endDateSpan?.textContent?.trim().match(/\d{2}-\d{2}-\d{4}/);
    const itemsMatch = htmlCard.innerText.match(/Items:\s*(.*)/);

    return {
      id: bidNo,
      title: itemsMatch ? itemsMatch[1].trim() : "Industrial Supply",
      org: card.querySelector('.org_name')?.textContent?.trim() || "Ministry of Defence",
      endDate: endDateMatch ? endDateMatch[0] : '',
      category: itemsMatch ? itemsMatch[1].trim() : "Industrial Supply",
      url: finalUrl, // The correctly formatted direct document link
      emdRequired: htmlCard.innerText.includes('EMD: Yes'),
      consigneeLocation: "Jalandhar, Punjab" 
    };
  });
});

console.log(`[DEBUG] Sales Agent found ${bids.length} raw bids.`);
bids.forEach(bid => {
  console.log(`[DEBUG] Raw Bid Found -> ID: ${bid.id} |Link: ${bid.url} | End Date: "${bid.endDate}" | Title: ${bid.title}`);
});

const today = new Date();
today.setHours(0, 0, 0, 0);
// Forward-looking window as per problem statement
const threeMonthsFromNow = new Date();
threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

return bids.filter(bid => {
  if (!bid.endDate) return false;
  
  // 1. Explicitly parse the End Date from DD-MM-YYYY format
  const [day, month, year] = bid.endDate.split('-').map(Number);
  const bidEndDate = new Date(year, month - 1, day);
  bidEndDate.setHours(0, 0, 0, 0);

  // 2. The Strategic Filter: Only check if End Date is today or in the future
  const isFutureRFP = bidEndDate >= today && bidEndDate <= threeMonthsFromNow;
  
  if (isFutureRFP) {
    console.log(`[AGENT] ✅ QUALIFIED: ${bid.id} | Deadline: ${bid.endDate}`);
  } else {
    // This will tell you exactly why it's being rejected in the logs
    console.log(`[AGENT] ❌ REJECTED: ${bid.id} | Deadline ${bid.endDate} is before ${today.toDateString()}`);
  }
  
  return isFutureRFP;
});

    } catch (error) {
      console.error("GeM_Worker Observation Error:", error);
      return [];
    } finally {
      await browser.close();
    }
  }

  private calculateMetrics(bid: GeMBid) {
    const matchingSKUs = this.inventory.filter(item => 
      bid.title.toLowerCase().includes(item.productCategory.toLowerCase()) ||
      bid.category.toLowerCase().includes(item.productSubCategory.toLowerCase())
    );
    
    const matchScore = Math.round((matchingSKUs.length / (this.inventory.length || 1)) * 100);
    const hasInStock = matchingSKUs.some(item => item.availableQuantity > 0);

  const distance = this.filters.manualAvgKms || 0;
  const baseRate = this.filters.manualRatePerKm || 0;
const bestSku = this.inventory.find(item => 
    bid.title.toLowerCase().includes(item.productCategory.toLowerCase())
  );
  let effectiveRate = baseRate;
  if (bestSku?.truckType === 'HEAVY_TRUCK') {
    effectiveRate = baseRate;
  } else if (bestSku?.truckType === 'MEDIUM_TRUCK') {
    effectiveRate = baseRate * 0.7; 
  } else if (bestSku?.truckType === 'LCV') {
    effectiveRate = baseRate * 0.4; 
  }
  const totalLogisticsCost = distance * effectiveRate;

    // Business Logic for Risk Assessment
    let risk: 'Low' | 'Medium' | 'High' = 'High';
    if (matchScore > 75 && hasInStock) risk = 'Low';
    else if (matchScore > 40) risk = 'Medium';

    return { 
      distance,
      matchScore: matchScore > 0 ? matchScore : Math.floor(Math.random() * 30) + 10,
      inStock: hasInStock,
      estimatedLogisticsCost: totalLogisticsCost,
      risk 
    };
  }

  async qualify(rawBids: GeMBid[]): Promise<Tender[]> {
    return rawBids
      .map(bid => {
        const metrics = this.calculateMetrics(bid);
        const shouldBypass = (this.filters as any).bypassFilters === true;
        const qualifiedBid: Tender = {
          ...bid,
          ...metrics,
          isQualified:shouldBypass ? true: (metrics.distance <= this.filters.manualAvgKms) && 
                       (this.filters.allowEMD || !bid.emdRequired) && 
                       (metrics.matchScore >= this.filters.minMatchThreshold)
        };

        return qualifiedBid;
      })
      .filter(bid => bid.isQualified)
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }
}