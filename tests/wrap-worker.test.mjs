import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/cheapgetaway-expedia-import.mjs';

test('existing Cloudflare Worker redirects apex before discarding any hotel path/query', async () => {
  for (const path of [
    '/https://www.booking.com/hotel/us/the-plaza-new-york.html',
    '/https:/www.booking.com/hotel/us/the-plaza-new-york.html',
    '/https://www.hotels.com/ho105375/hotel-valley-ho-scottsdale-united-states-of-america/',
    '/https://www.theritzlondon.com/',
    '/www.booking.com/hotel/gr/eteoro-suites.html',
    '/http:/hotel.example/rooms/',
    '/'
  ]) {
    const query = '?checkin=2027-01-10&checkout=2027-01-12&url=campaign';
    const response = await worker.fetch(new Request('https://cheapgetaway.com' + path + query));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'https://www.cheapgetaway.com' + path + query);
  }
});

test('www Worker keeps the existing invisible import proxy without a redirect loop', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async request => {
    calls.push(request);
    return new Response('import page', { headers: { 'content-type': 'text/html' } });
  });
  const response = await worker.fetch(new Request(
    'https://www.cheapgetaway.com/https://www.theritzlondon.com/?checkin=2027-01-10',
    { headers: { 'x-test': 'preserved' } }
  ));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'import page');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://www.cheapgetaway.com/import');
  assert.equal(calls[0].headers.get('x-test'), 'preserved');
});
