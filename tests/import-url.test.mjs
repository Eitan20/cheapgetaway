// node --test tests/  — offline URL → hotel/city/date parsing (no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHotelUrl, segmentWords, decodeGoogleEntity, nameQueryVariants, identityScore, pickBest } from '../api/import-url.js';

const P = (u) => parseHotelUrl('https://www.cheapgetaway.com/' + u.replace(/^https?:\/\//, ''));

test('booking hyphenless slugs segment into words', () => {
  assert.deepEqual(segmentWords('novotellondontower'), ['novotel', 'london', 'tower']);
  assert.equal(P('https://www.booking.com/hotel/gb/novotellondontower.html').hotelName, 'Novotel London Tower');
  assert.match(P('https://www.booking.com/hotel/gb/londonbridgehotel.html').hotelName, /London Bridge Hotel/);
});

test('tripadvisor pagination does not leak and region tail sets country', () => {
  const a = P('https://www.tripadvisor.com/Hotel_Review-g60982-d596760-Reviews-or50-Hotel_Renew_Waikiki_Beach-Honolulu_Oahu_Hawaii.html');
  assert.equal(a.hotelName, 'Hotel Renew Waikiki Beach');
  assert.equal(a.cityName, 'Honolulu');
  assert.equal(a.countryCode, 'US');
  const b = P('https://www.tripadvisor.com/Hotel_Review-g187234-d195659-Reviews-or30-Hotel_Negresco-Nice_French_Riviera_Cote_d_Azur_Provence_Alpes_Cote_d_Azur.html');
  assert.equal(b.hotelName, 'Hotel Negresco');
  assert.equal(b.countryCode, 'FR');
});

test('priceline hotel-deals .ssp slug', () => {
  const a = P('https://www.priceline.com/hotel-deals/en-us/P5000463463/H30001603/hotel-relax-marrakech.ssp');
  assert.equal(a.ok, true);
  assert.equal(a.cityName, 'Marrakech');
  assert.equal(a.countryCode, 'MA');
});

test('uk.hotels.com regional host parses', () => {
  const a = P('https://uk.hotels.com/ho2516048704/hotel-ho-merida-mexico/?locale=en_GB');
  assert.equal(a.source, 'hotels');
  assert.equal(a.countryCode, 'MX');
});

test('kayak details + dates', () => {
  const a = P('https://www.kayak.com/hotels/Hampton-Inn-Gatlinburg,Gatlinburg-p56518-h79337-details');
  assert.equal(a.hotelName, 'Hampton Inn Gatlinburg');
  assert.equal(a.cityName, 'Gatlinburg');
  const b = P('https://www.kayak.com/hotels/The-Waldorf-Astoria%2CNew-York-City%2CNew-York-c49192-h1070238072/2026-05-07/2026-05-14/2adults');
  assert.equal(b.checkin, '2026-05-07');
  assert.equal(b.checkout, '2026-05-14');
  assert.equal(b.countryCode, 'US');
  assert.equal(b.cityName, 'New York');
});

test('world city table gives country for non-hardcoded cities', () => {
  assert.equal(P('https://www.travelocity.com/Manila-Hotels-The-Manila-Hotel.h24224.Hotel-Information').countryCode, 'PH');
  assert.equal(P('https://www.hotels.com/ho105375/hotel-valley-ho-scottsdale-united-states-of-america/').cityName, 'Scottsdale');
});

test('apostrophe-dropped names get apostrophe + bare-token variants', () => {
  const p = P('https://www.expedia.com/Rome-Hotels-Hotel-DInghilterra-Roma.h34840.Hotel-Information');
  const v = nameQueryVariants(p);
  assert.ok(v.includes("Hotel D'Inghilterra Roma"));
  assert.ok(v.includes('Inghilterra'));
  assert.ok(nameQueryVariants(P('https://www.orbitz.com/Chicago-Hotels-Hyatt-Regency-OHare-Chicago.h5403.Hotel-Information')).includes("Hyatt Regency O'Hare"));
});

test('google entity ids expose KG mids when present', () => {
  assert.equal(decodeGoogleEntity('ChcI-6i_l_nu1O-mARoKL20vMDI3Z3B2dBAB').mid, '/m/027gpvt');
  const a = P('https://www.google.com/travel/hotels/entity/ChkI1obc9_L_9a9AGg0vZy8xMXJwNmJ4NW40EAE');
  assert.equal(a.googleMid, '/g/11rp6bx5n4');
  const q = P('https://www.google.com/travel/search?q=Pullman%20Paris%20Tour%20Eiffel%2C%20Paris');
  assert.equal(q.hotelName, 'Pullman Paris Tour Eiffel');
  assert.equal(q.cityName, 'Paris');
});

test('identity scoring rejects same-city different hotels', () => {
  const pick = pickBest([
    { id: 'a', name: 'Hotel Adeline', city: 'Scottsdale' },
    { id: 'b', name: 'Hotel Valley Ho', city: 'Scottsdale' }
  ], { hotelName: 'Hotel Valley Ho', cityName: 'Scottsdale' });
  assert.equal(pick.row.id, 'b');
  assert.ok(identityScore('Manila Grand Opera Hotel', 'The Manila Hotel', 'Manila') < 0.6);
  const w = pickBest([
    { id: 'pc', name: 'Waldorf Astoria Park City', city: 'Park City' },
    { id: 'ny', name: 'Waldorf Astoria New York', city: 'New York' }
  ], { hotelName: 'The Waldorf Astoria', cityName: 'New York' });
  assert.equal(w.row.id, 'ny');
});
