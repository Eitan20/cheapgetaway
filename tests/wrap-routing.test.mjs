import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseHotelUrl, unwrapImportUrl } from '../api/import-url.js';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
const html = readFileSync(new URL('../import.html', import.meta.url), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const booking = 'www.booking.com/hotel/us/the-plaza-new-york.html';
const dates = '?checkin=2027-01-10&checkout=2027-01-12';

function postedUrl(pathname, search = '') {
  let posted;
  const node = { textContent: '', innerHTML: '', addEventListener() {} };
  vm.runInNewContext(script, {
    URLSearchParams, Date,
    location: { origin: 'https://www.cheapgetaway.com', pathname, search },
    document: { getElementById: () => node },
    fetch: (_url, options) => {
      posted = JSON.parse(options.body).url;
      return new Promise(() => {});
    }
  });
  return posted;
}

test('apex redirect is host-restricted and captures literal double/trailing slashes', () => {
  // :path* rejects empty path segments, including the // inside a wrapped URL.
  assert.deepEqual(config.redirects[0], {
    source: '/:path(.*)',
    has: [{ type: 'host', value: 'cheapgetaway.com' }],
    destination: 'https://www.cheapgetaway.com/:path',
    permanent: false
  });
});

test('explicit scheme rewrites cover arbitrary hosts without swallowing normal routes', () => {
  const wraps = config.rewrites.filter(r => r.source.includes(':wrapped'));
  assert.deepEqual(wraps.map(r => r.source), [
    '/https\\://:wrapped(.*)', '/https\\:/:wrapped(.*)',
    '/http\\://:wrapped(.*)', '/http\\:/:wrapped(.*)'
  ]);
  for (const rule of wraps) assert.equal(rule.destination, '/import.html');
  assert.ok(config.rewrites.some(r => r.source === '/www.booking.com/:path*'));
  assert.ok(config.rewrites.some(r => r.source === '/www.hotels.com/:path*'));
  assert.ok(config.rewrites.some(r => r.source === '/api/liteapi/:path*'));
});

test('browser and parser preserve Booking dates through full, collapsed and host-only wraps', () => {
  for (const prefix of ['https://', 'https:/', 'http://', 'http:/', '']) {
    const path = '/' + prefix + booking;
    const raw = postedUrl(path, dates);
    const expected = (prefix.startsWith('http:') ? 'http://' : 'https://') + booking + dates;
    assert.equal(raw, expected);
    assert.equal(unwrapImportUrl('https://cheapgetaway.com' + path + dates), expected);
    const parsed = parseHotelUrl(raw);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.hotelName, 'The Plaza New York');
    assert.equal(parsed.checkin, '2027-01-10');
    assert.equal(parsed.checkout, '2027-01-12');
  }
});

test('Hotels.com trailing-slash wraps and boutique hosts retain their original URLs', () => {
  for (const inner of [
    'www.hotels.com/ho105375/hotel-valley-ho-scottsdale-united-states-of-america/',
    'www.theritzlondon.com/'
  ]) {
    const raw = postedUrl('/https:/' + inner, dates);
    assert.equal(raw, 'https://' + inner + dates);
    assert.equal(unwrapImportUrl('https://cheapgetaway.com/https:/' + inner + dates), raw);
    assert.equal(parseHotelUrl(raw).checkin, '2027-01-10');
  }
});

test('hotel query u/url cannot override the wrapped path; import envelope still works', () => {
  assert.equal(postedUrl('/https://' + booking, dates + '&url=tracking&u=campaign'),
    'https://' + booking + dates + '&url=tracking&u=campaign');
  for (const path of ['/import', '/import.html', '/']) {
    assert.equal(postedUrl(path, '?url=' + encodeURIComponent('https://' + booking + dates)),
      'https://' + booking + dates);
    assert.equal(postedUrl(path), undefined);
  }
});

test('nested wrap routes load analytics from the site root', () => {
  assert.match(html, /src="\/cg-analytics\.js\?v=1"/);
});
