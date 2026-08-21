import json
import re
import os
import urllib.request

app_js_path = r'f:\projects\气象站&传感器&采集器落地页\落地页 v0.4 sensecap-environmental-monitoring-static-v4\app.js'
out_dir = r'f:\projects\气象站&传感器&采集器落地页\落地页 v0.4 sensecap-environmental-monitoring-static-v4\images\products'

if not os.path.exists(out_dir):
    os.makedirs(out_dir)

with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'window\.SENSECAP_PRODUCTS\s*=\s*(\[[\s\S]*?\]);', content)
if not match:
    print('Could not find window.SENSECAP_PRODUCTS in app.js')
    exit(1)

products = json.loads(match.group(1))
print(f'Total products to download: {len(products)}')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
}

success_count = 0

for idx, p in enumerate(products):
    sku = p.get('sku')
    url = p.get('url')
    name = p.get('name')
    
    if not url:
        print(f'[{idx+1}/{len(products)}] No URL for {sku}')
        continue
        
    img_filename = f'{sku}.jpg'
    img_filepath = os.path.join(out_dir, img_filename)
    relative_path = f'images/products/{img_filename}'
    
    print(f'[{idx+1}/{len(products)}] Fetching og:image for SKU {sku} ({name[:30]}...): {url}')
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
        og_matches = re.findall(r'property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html, re.I)
        if not og_matches:
            og_matches = re.findall(r'content=["\']([^"\']+)["\']\s+property=["\']og:image["\']', html, re.I)
            
        if og_matches:
            img_url = og_matches[0]
            print(f'   -> Found og:image: {img_url}')
            img_req = urllib.request.Request(img_url, headers=headers)
            with urllib.request.urlopen(img_req, timeout=12) as img_res:
                img_data = img_res.read()
                with open(img_filepath, 'wb') as img_f:
                    img_f.write(img_data)
                print(f'   -> Saved {len(img_data)} bytes to {img_filepath}')
                p['image'] = relative_path
                success_count += 1
        else:
            print(f'   -> [WARNING] og:image not found for SKU {sku}')
    except Exception as e:
        print(f'   -> [ERROR] Failed SKU {sku}: {e}')

print(f'Successfully downloaded {success_count}/{len(products)} product images!')

# Update app.js
new_products_json = json.dumps(products, indent=2, ensure_ascii=False)
updated_content = re.sub(
    r'window\.SENSECAP_PRODUCTS\s*=\s*\[[\s\S]*?\];',
    f'window.SENSECAP_PRODUCTS = {new_products_json};',
    content
)

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print('Updated app.js with exact local image paths!')
