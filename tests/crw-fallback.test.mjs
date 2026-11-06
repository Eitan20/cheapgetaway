import assert from 'node:assert/strict';
import test from 'node:test';
import {
  needsScrapeFallback,
  extractHotelFromCrw,
  tryCrwHotelFallback,
  _resetCrwFallbackState,
  CRW_SESSION_CAP,
  CRW_MAX_INFLIGHT
} from '../api/_crw-fallback.js';
import { parseHotelUrl } from '../api/import-url.js';

test('needsScrapeFallback: slug success never scrapes', () => {
  const p = parseHotelUrl('https://www.booking.com/hotel/gr/eteoro-suites.html');
  assert.equal(p.ok, true);
  assert.match(p.hotelName, /Eteoro/i);
  assert.equal(needsScrapeFallback(p), false);
});

test('needsScrapeFallback: hotels.com id-only is a miss', () => {
  const p = parseHotelUrl('https://www.hotels.com/ho2981195328/');
  assert.equal(p.ok, false);
  assert.equal(needsScrapeFallback(p), true);
});

test('extractHotelFromCrw strips booking/hotels title cruft and rejects bot wall', () => {
  const a = extractHotelFromCrw('Eteoro Suites, Imerovigli (updated prices 2027)', '');
  assert.equal(a.hotelName, 'Eteoro Suites');
  assert.equal(a.cityName, 'Imerovigli');
  const b = extractHotelFromCrw('Luxor Hotel and Casino - Hotels.com', '');
  assert.match(b.hotelName, /Luxor/i);
  assert.equal(extractHotelFromCrw('Bot or Not?', '# Bot or Not?'), null);
});

test('tryCrwHotelFallback: no key → null; success path mocked; timeout/queue/session fast-fail', async () => {
  _resetCrwFallbackState();
  assert.equal(await tryCrwHotelFallback('https://www.hotels.com/ho1/', { env: {} }), null);

  const okFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { markdown: '# Hi', metadata: { title: 'So Paris Hotel, Paris - Hotels.com' } } })
  });
  const hit = await tryCrwHotelFallback('https://www.hotels.com/ho1/', {
    env: { CRW_API_URL: 'https://crw.example', CRW_API_KEY: 'test-key' },
    fetchImpl: okFetch,
    sessionId: 's1'
  });
  assert.equal(hit.hotelName, 'So Paris Hotel');
  assert.equal(hit.cityName, 'Paris');

  // Session cap: burn remaining slots then refuse
  _resetCrwFallbackState();
  let calls = 0;
  const counting = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ success: true, data: { metadata: { title: 'A Hotel, Rome' } } }) };
  };
  for (let i = 0; i < CRW_SESSION_CAP; i += 1) {
    const r = await tryCrwHotelFallback('https://www.hotels.com/ho2/', {
      env: { CRW_API_URL: 'https://crw.example', CRW_API_KEY: 'k' },
      fetchImpl: counting,
      sessionId: 'cap'
    });
    assert.ok(r && r.hotelName);
  }
  const blocked = await tryCrwHotelFallback('https://www.hotels.com/ho3/', {
    env: { CRW_API_URL: 'https://crw.example', CRW_API_KEY: 'k' },
    fetchImpl: counting,
    sessionId: 'cap'
  });
  assert.equal(blocked, null);
  assert.equal(calls, CRW_SESSION_CAP);

  // Inflight full → immediate null (no wait)
  _resetCrwFallbackState();
  let release;
  const gate = new Promise((r) => { release = r; });
  const slow = async () => {
    await gate;
    return { ok: true, status: 200, json: async () => ({ success: true, data: { metadata: { title: 'Slow Hotel, Berlin' } } }) };
  };
  const pending = [];
  for (let i = 0; i < CRW_MAX_INFLIGHT; i += 1) {
    pending.push(tryCrwHotelFallback('https://www.hotels.com/ho' + i + '/', {
      env: { CRW_API_URL: 'https://crw.example', CRW_API_KEY: 'k' },
      fetchImpl: slow,
      sessionId: 'q' + i,
      timeoutMs: 2000
    }));
  }
  await new Promise((r) => setTimeout(r, 20));
  const skipped = await tryCrwHotelFallback('https://www.hotels.com/ho999/', {
    env: { CRW_API_URL: 'https://crw.example', CRW_API_KEY: 'k' },
    fetchImpl: slow,
    sessionId: 'q-skip',
    timeoutMs: 2000
  });
  assert.equal(skipped, null);
  release();
  await Promise.all(pending);
});

test('tryCrwHotelFallback aborts on timeout without throwing', async () => {
  _resetCrwFallbackState();
  const slow = () => new Promise(() => {}); // never resolves
  const t0 = Date.now();
  const out = await tryCrwHotelFallback('https://www.hotels.com/ho9/', {
    env: { CRW_API_URL: 'https://crw.example', CRW_API_KEY: 'k' },
    fetchImpl: slow,
    timeoutMs: 80,
    sessionId: 't'
  });
  assert.equal(out, null);
  assert.ok(Date.now() - t0 < 500);
});
