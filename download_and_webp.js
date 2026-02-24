const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const repo = process.cwd();
const outDir = path.join(repo, 'public', 'images');
fs.mkdirSync(outDir, { recursive: true });

const urlToFile = {
  "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=800": "/images/quickvibe-roadtrip.webp",
  "https://images.unsplash.com/photo-1449844908441-8829872d2607?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80": "/images/featured-roadtrip.webp",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80": "/images/featured-mountain.webp",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80": "/images/vibe-nightlife.webp",
  "https://images.unsplash.com/photo-1494522358652-f30e61a60313?auto=format&fit=crop&w=1200&q=80": "/images/weekend-city.webp",
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80": "/images/hero-bg.webp",
  "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80": "/images/vibe-hiking.webp",
  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80": "/images/featured-beach.webp",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80": "/images/weekend-beach.webp",
  "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=80": "/images/featured-forest.webp",
  "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&q=80&w=800": "/images/quickvibe-poolside.webp",
  "https://images.unsplash.com/photo-1514282402170-0ebcc8b4bf2a?auto=format&fit=crop&q=80&w=800": "/images/quickvibe-romantic.webp",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80": "/images/vibe-beach.webp",
  "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=1200&q=80": "/images/weekend-adventure.webp",
  "https://images.unsplash.com/photo-1551524164-687a0b3f55de?auto=format&fit=crop&q=80&w=800": "/images/quickvibe-city.webp",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80": "/images/hotel-fallback-xl.webp",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=800&q=80": "/images/hotel-fallback-sm.webp",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80": "/images/hotel-fallback-search.webp",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80": "/images/vibe-staycation.webp",
  "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?auto=format&fit=crop&w=1200&q=80": "/images/weekend-family.webp"
};

const aliasFallback = {
  "/images/quickvibe-romantic.webp": "/images/quickvibe-poolside.webp"
};

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
    }
  });
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

async function ensureImage(url, publicPath) {
  const localPath = path.join(repo, 'public', publicPath.replace(/^\//, ''));
  if (fs.existsSync(localPath)) return { ok: true, skipped: true };
  try {
    const buf = await fetchBuffer(url);
    await sharp(buf).webp({ quality: 82 }).toFile(localPath);
    return { ok: true, skipped: false };
  } catch {
    const alias = aliasFallback[publicPath];
    if (alias) {
      const aliasPath = path.join(repo, 'public', alias.replace(/^\//, ''));
      if (fs.existsSync(aliasPath)) {
        fs.copyFileSync(aliasPath, localPath);
        return { ok: true, aliased: alias };
      }
    }
    return { ok: false };
  }
}

async function main() {
  for (const [url, publicPath] of Object.entries(urlToFile)) {
    const result = await ensureImage(url, publicPath);
    if (!result.ok) {
      console.log(`failed ${publicPath} (${url})`);
    } else if (result.aliased) {
      console.log(`aliased ${publicPath} from ${result.aliased}`);
    } else if (result.skipped) {
      console.log(`exists ${publicPath}`);
    } else {
      console.log(`saved ${publicPath}`);
    }
  }

  const logoPng = path.join(repo, 'public', 'logo.png');
  const logoWebp = path.join(repo, 'public', 'logo.webp');
  if (fs.existsSync(logoPng) && !fs.existsSync(logoWebp)) {
    await sharp(logoPng).webp({ quality: 90 }).toFile(logoWebp);
    console.log('saved /logo.webp');
  } else if (fs.existsSync(logoWebp)) {
    console.log('exists /logo.webp');
  }

  const files = [
    'src/components/QuickVibe.tsx',
    'src/components/FeaturedCollections.tsx',
    'src/components/WeekendDeals.tsx',
    'src/components/TopDealsGrid.tsx',
    'src/components/VibeSearchModule.tsx',
    'src/app/globals.css',
    'src/app/search/page.tsx',
    'src/components/Navbar.tsx',
    'src/components/Footer.tsx'
  ];

  for (const rel of files) {
    const abs = path.join(repo, rel);
    if (!fs.existsSync(abs)) continue;
    let content = fs.readFileSync(abs, 'utf8');
    for (const [url, publicPath] of Object.entries(urlToFile)) {
      content = content.split(url).join(publicPath);
    }
    content = content.split('/logo.png').join('/logo.webp');
    fs.writeFileSync(abs, content);
    console.log(`updated ${rel}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
