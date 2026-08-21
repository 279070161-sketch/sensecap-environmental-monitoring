const fs = require('fs');
const path = require('path');
const https = require('https');

const appJsPath = 'F:/projects/气象站&传感器&采集器落地页/落地页 v0.4 sensecap-environmental-monitoring-static-v4/app.js';
const outDir = 'F:/projects/气象站&传感器&采集器落地页/落地页 v0.4 sensecap-environmental-monitoring-static-v4/images/products';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = fs.readFileSync(appJsPath, 'utf8');
const match = content.match(/window\.SENSECAP_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not find window.SENSECAP_PRODUCTS in app.js');
  process.exit(1);
}

const products = JSON.parse(match[1]);
console.log(`Downloading exact og:image for all ${products.length} products...`);

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function fetchText(url, redirectCount = 0) {
  if (redirectCount > 5 || !url) return Promise.resolve('');
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const req = https.get(parsedUrl, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('/')) nextUrl = parsedUrl.origin + nextUrl;
          return fetchText(nextUrl, redirectCount + 1).then(resolve);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', () => resolve(''));
      req.setTimeout(12000, () => { req.destroy(); resolve(''); });
    } catch (e) {
      resolve('');
    }
  });
}

function downloadImage(imgUrl, destPath, redirectCount = 0) {
  if (redirectCount > 5 || !imgUrl) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(imgUrl);
      const req = https.get(parsedUrl, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('/')) nextUrl = parsedUrl.origin + nextUrl;
          return downloadImage(nextUrl, destPath, redirectCount + 1).then(resolve);
        }
        if (res.statusCode !== 200) {
          resolve(false);
          return;
        }
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(true);
        });
      });
      req.on('error', () => resolve(false));
      req.setTimeout(12000, () => { req.destroy(); resolve(false); });
    } catch (e) {
      resolve(false);
    }
  });
}

function extractOgImage(html) {
  if (!html) return null;

  // Multiline og:image extraction
  const m1 = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (m1 && m1[1]) return m1[1];

  const m2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (m2 && m2[1]) return m2[1];

  // Backup regex with whitespace/newlines
  const m3 = html.match(/property=["']og:image["'][\s\S]*?content=["']([^"']+)["']/i);
  if (m3 && m3[1]) return m3[1];

  const m4 = html.match(/content=["']([^"']+)["'][\s\S]*?property=["']og:image["']/i);
  if (m4 && m4[1]) return m4[1];

  return null;
}

async function run() {
  let successCount = 0;
  const batchSize = 5;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(products.length / batchSize)}...`);

    await Promise.all(batch.map(async (product, idxInBatch) => {
      const globalIdx = i + idxInBatch + 1;
      const sku = product.sku;
      const url = product.url;

      if (!url) return;

      const html = await fetchText(url);
      const imgUrl = extractOgImage(html);

      if (imgUrl) {
        // clean query string from url
        const cleanUrl = imgUrl.split('?')[0];
        const ext = cleanUrl.split('.').pop() || 'jpg';
        const imgFilename = `${sku}.${ext}`;
        const destPath = path.join(outDir, imgFilename);
        const relativePath = `images/products/${imgFilename}`;

        const downloaded = await downloadImage(cleanUrl, destPath);
        if (downloaded) {
          product.image = relativePath;
          successCount++;
          console.log(`[${globalIdx}/${products.length}] [SUCCESS] SKU ${sku} -> ${relativePath} (from ${cleanUrl})`);
        } else {
          console.warn(`[${globalIdx}/${products.length}] [DOWNLOAD FAILED] SKU ${sku} (${cleanUrl})`);
        }
      } else {
        console.warn(`[${globalIdx}/${products.length}] [NO OG:IMAGE] SKU ${sku} (${url})`);
      }
    }));
  }

  console.log(`Downloaded ${successCount}/${products.length} exact product photos to images/products/!`);

  // Update app.js
  const newProductsJson = JSON.stringify(products, null, 2);
  const updatedContent = content.replace(
    /window\.SENSECAP_PRODUCTS\s*=\s*\[[\s\S]*?\];/,
    `window.SENSECAP_PRODUCTS = ${newProductsJson};`
  );
  fs.writeFileSync(appJsPath, updatedContent, 'utf8');
  console.log('App.js updated with exact local image paths!');
}

run();
