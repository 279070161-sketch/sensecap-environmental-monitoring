const fs = require('fs');
const path = require('path');
const https = require('https');

const appJsPath = 'F:/projects/气象站&传感器&采集器落地页/落地页 v0.4 sensecap-environmental-monitoring-static-v4/app.js';
const outDir = 'F:/projects/气象站&传感器&采集器落地页/落地页 v0.4 sensecap-environmental-monitoring-static-v4/images/products';

const content = fs.readFileSync(appJsPath, 'utf8');
const match = content.match(/window\.SENSECAP_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);
const products = JSON.parse(match[1]);

// Correct Seeed Studio URLs for SKUs that were broken or truncated
const urlFixes = {
  "101991101": "https://www.seeedstudio.com/RS485-Air-Temperature-Humidity-and-Pressure-Sensor-p-5800.html",
  "314990634": "https://www.seeedstudio.com/RS485-Noise-Sensor-Connector-p-5100.html",
  "314990742": "https://www.seeedstudio.com/RS485-UV-Sensor-Connector-p-5102.html",
  "101990982": "https://www.seeedstudio.com/RS485-Multi-Depth-Soil-Moisture-Temperature-and-EC-Sensor-Connector-p-5387.html",
  "314990737": "https://www.seeedstudio.com/RS485-CO2-Sensor-Connector-p-5103.html",
  "314990738": "https://www.seeedstudio.com/RS485-Leaf-Moisture-Sensor-Connector-p-5104.html",
  "314990739": "https://www.seeedstudio.com/RS485-Light-Intensity-Sensor-p-4863.html",
  "314990740": "https://www.seeedstudio.com/RS485-Light-Intensity-Sensor-Connector-p-5105.html",
  "100046309": "https://www.seeedstudio.com/RS485-Oxygen-Concentration-O2-Sensor-p-6941.html",
  "100069114": "https://www.seeedstudio.com/RS485-Carbon-Monoxide-CO-Sensor-p-6942.html",
  "100089706": "https://www.seeedstudio.com/RS485-VOC-NOx-Temperature-and-Humidity-Sensor-p-6943.html",
  "101990863": "https://www.seeedstudio.com/RS485-H2S-Temperature-and-Humidity-Sensor-Connector-p-5114.html",
  "101991041": "https://www.seeedstudio.com/RS485-750cm-Ultrasonic-Level-Sensor-p-5587.html",
  "101991042": "https://www.seeedstudio.com/RS485-500cm-Ultrasonic-Level-Sensor-p-5588.html",
  "101991044": "https://www.seeedstudio.com/SenseCAP-S200-Wind-Speed-and-Direction-Sensor-p-5717.html",
  "101991024": "https://www.seeedstudio.com/SenseCAP-S1000-10-in-1-Compact-Weather-Station-p-5716.html",
  "101991141": "https://www.seeedstudio.com/SenseCAP-S700C-7-in-1-Compact-Weather-Station-p-6587.html",
  "101991022": "https://www.seeedstudio.com/SenseCAP-S700-7-in-1-Compact-Weather-Station-p-5651.html",
  "101991102": "https://www.seeedstudio.com/SenseCAP-S700B-7-in-1-Compact-Weather-Station-p-6305.html",
  "101991021": "https://www.seeedstudio.com/SenseCAP-S500-5-in-1-Compact-Weather-Station-p-5652.html",
  "206001060": "https://www.seeedstudio.com/Industrial-IP68-Modbus-RS485-1-to-4-Splitter-Hub-p-4880.html",
  "114992222": "https://www.seeedstudio.com/Solar-Radiation-Shield-for-Outdoor-Sensor-Protection-A10-p-4601.html",
  "114992872": "https://www.seeedstudio.com/SenseCAP-S2100-LoRaWAN-Data-Logger-p-5361.html",
  "114992171": "https://www.seeedstudio.com/Sensor-Hub-Industrial-grade-4G-Data-Logger-DC-Only-p-4881.html",
  "101990961": "https://www.seeedstudio.com/SenseCAP-S2103-LoRaWAN-CO2-Temperature-and-Humidity-Sensor-p-5765.html",
  "101990962": "https://www.seeedstudio.com/SenseCAP-S2101-LoRaWAN-Air-Temperature-and-Humidity-Sensor-p-5764.html",
  "101990960": "https://www.seeedstudio.com/SenseCAP-S2102-LoRaWAN-Light-Intensity-Sensor-p-5874.html",
  "101990963": "https://www.seeedstudio.com/SenseCAP-S2104-LoRaWAN-Soil-Temperature-and-Moisture-Sensor-p-5765.html",
  "101990964": "https://www.seeedstudio.com/SenseCAP-S2105-LoRaWAN-Soil-Temperature-Moisture-and-EC-Sensor-p-5766.html",
  "114993003": "https://www.seeedstudio.com/SenseCAP-S2110-LoRaWAN-RS485-Sensor-Controller-p-5628.html"
};

headers = {
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
  const m1 = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (m1 && m1[1]) return m1[1];
  const m2 = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (m2 && m2[1]) return m2[1];
  const m3 = html.match(/property=["']og:image["'][\s\S]*?content=["']([^"']+)["']/i);
  if (m3 && m3[1]) return m3[1];
  const m4 = html.match(/content=["']([^"']+)["'][\s\S]*?property=["']og:image["']/i);
  if (m4 && m4[1]) return m4[1];
  return null;
}

async function run() {
  let count = 0;
  for (const product of products) {
    if (urlFixes[product.sku]) {
      product.url = urlFixes[product.sku];
    }
    const html = await fetchText(product.url);
    const imgUrl = extractOgImage(html);
    if (imgUrl) {
      const cleanUrl = imgUrl.split('?')[0];
      const ext = cleanUrl.split('.').pop() || 'jpg';
      const imgFilename = `${product.sku}.${ext}`;
      const destPath = path.join(outDir, imgFilename);
      const relativePath = `images/products/${imgFilename}`;
      const ok = await downloadImage(cleanUrl, destPath);
      if (ok) {
        product.image = relativePath;
        count++;
        console.log(`[OK] ${product.sku} -> ${relativePath}`);
      }
    }
  }

  console.log(`Successfully fixed & downloaded ${count} products.`);
  const updatedContent = content.replace(
    /window\.SENSECAP_PRODUCTS\s*=\s*\[[\s\S]*?\];/,
    `window.SENSECAP_PRODUCTS = ${JSON.stringify(products, null, 2)};`
  );
  fs.writeFileSync(appJsPath, updatedContent, 'utf8');
  console.log('Saved app.js successfully!');
}

run();
