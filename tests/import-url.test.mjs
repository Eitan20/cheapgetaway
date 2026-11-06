// node --test tests/  — offline URL → hotel/city/date parsing (no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHotelUrl, segmentWords, decodeGoogleEntity, nameQueryVariants, identityScore, pickBest } from '../api/import-url.js';

const P = (u) => parseHotelUrl('https://www.cheapgetaway.com/' + u); // canonical /https://… wrap

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

test('canonical /https:// wrap, collapsed https:/ and legacy host-only wraps all decode', () => {
  const u = 'https://www.expedia.com/Vienna-Hotels-Hotel-Sacher-Wien.h25831.Hotel-Information';
  for (const w of ['https://www.cheapgetaway.com/' + u, 'https://www.cheapgetaway.com/https:/www.expedia.com/Vienna-Hotels-Hotel-Sacher-Wien.h25831.Hotel-Information', 'https://www.cheapgetaway.com/www.expedia.com/Vienna-Hotels-Hotel-Sacher-Wien.h25831.Hotel-Information', '/https://www.expedia.com/Vienna-Hotels-Hotel-Sacher-Wien.h25831.Hotel-Information']) {
    const p = parseHotelUrl(w);
    assert.equal(p.hotelName, 'Hotel Sacher Wien', w);
    assert.equal(p.countryCode, 'AT');
  }
});

test('kayak .ksp hotel pages and agoda -hNNN slugs parse', () => {
  const k = P('https://www.kayak.com/London-Hotels-K-Hotel-Kensington.136817.ksp');
  assert.equal(k.hotelName, 'K Hotel Kensington');
  assert.equal(k.countryCode, 'GB');
  assert.equal(P('https://www.agoda.com/conrad-new-york-midtown-h55831834/hotel/new-york-ny-us.html').hotelName, 'Conrad New York Midtown');
});

test('a single shared token is not enough to accept a LiteAPI match', () => {
  assert.ok(identityScore('South', '1 Hotel South Beach', 'Miami Beach') < 0.7);
});

test('priceline P-city id gives the city for city-less slugs', () => {
  const p = P('https://www.priceline.com/hotel-deals/en-us/P3000015284/H49325/mgm-grand-hotel-and-casino.ssp');
  assert.equal(p.cityName, 'Las Vegas');
  assert.equal(p.countryCode, 'US');
});

test('booking hyphenless slugs keep whole words and city', () => {
  const b = (x) => P('https://www.booking.com/hotel/' + x + '.html');
  assert.equal(b('nl/hoteartemisamsterdam').hotelName, 'Hotel Artemis');
  assert.equal(b('nl/hoteartemisamsterdam').cityName, 'Amsterdam');
  assert.equal(b('at/rathauspark').hotelName, 'Rathauspark');
  assert.equal(b('at/pensionaviano').hotelName, 'Pension Aviano');
  assert.equal(b('nl/damsterdam').hotelName, 'Damsterdam');
  assert.equal(b('nl/i').hotelName, 'I Hotel');
  assert.equal(b('de/new-berlin').hotelName, 'New Berlin');
  assert.equal(b('fr/kensington').urlCountry, 'FR');
});

test('url city/country are hard filters in pickBest', async () => {
  const { pickBest } = await import('../api/import-url.js');
  const p = { hotelName: 'Hotel du Louvre', cityName: 'Paris', urlCity: 'Paris', countryCode: 'FR' };
  const best = pickBest([{ name: 'Hotel du Louvre', city: 'Cherbourg', country: 'fr' }, { name: 'Hotel du Louvre', city: 'Paris', country: 'fr' }], p);
  assert.equal(best.row.city, 'Paris');
  const k = pickBest([{ name: 'The Kensington Hotel', city: 'London', country: 'gb' }], { hotelName: 'Kensington', urlCountry: 'FR', countryCode: 'FR' });
  assert.equal(k, null);
});

test('hotels.com strips marketing noise and peels lake buena vista', () => {
  const a = P('https://www.hotels.com/ho2541600928/so-paris-hotel-opening-summer-2022-paris-france/');
  assert.equal(a.hotelName, 'So Paris Hotel');
  assert.equal(a.cityName, 'Paris');
  assert.equal(a.countryCode, 'FR');
  const b = P('https://www.hotels.com/ho121463/b-resort-spa-in-the-disney-springs-resort-area-lake-buena-vista-united-states-of-america/');
  assert.equal(b.cityName, 'Lake Buena Vista');
  assert.match(b.hotelName, /B Resort/i);
  const c = P('https://www.hotels.com/ho3198568960/hotel-mousai-cancun-adults-only-punta-sam-mexico/');
  assert.equal(c.countryCode, 'MX');
  assert.equal(c.cityName, 'Punta Sam');
  assert.match(c.hotelName, /Mousai/i);
  // Bare /hoNNNN/ must not invent a name
  const d = P('https://www.hotels.com/ho2981195328/');
  assert.equal(d.ok, false);
  assert.equal(d.error, 'no-hotel-or-destination');
});

test('booking country-aware peel, amp entity, trailing digit, intercontinental', () => {
  const b = (x) => P('https://www.booking.com/hotel/' + x + '.html');
  // "best" is a Dutch town — must not peel when path country is TR
  assert.equal(b('tr/the-best').hotelName, 'The Best');
  assert.equal(b('tr/the-best').urlCountry, 'TR');
  assert.equal(b('tr/the-best').cityName, '');
  assert.equal(b('tr/blue-istanbul').hotelName, 'Blue Istanbul');
  assert.equal(b('tr/blue-istanbul').cityName, 'Istanbul');
  assert.equal(b('tr/istanbul-amp-suites').hotelName, 'Istanbul Suites');
  assert.equal(b('us/the-new-yorker1').hotelName, 'The New Yorker');
  assert.equal(b('us/inter-continental-miami').hotelName, 'Intercontinental');
  assert.equal(b('us/inter-continental-miami').cityName, 'Miami');
  // Famous city name in the wrong country keeps path country
  assert.equal(b('rs/amsterdam').countryCode, 'RS');
  assert.equal(b('rs/amsterdam').urlCountry, 'RS');
  assert.match(b('rs/amsterdam').hotelName, /Amsterdam/i);
  assert.equal(b('fr/kensington').urlCountry, 'FR');
  // pickBest rejects cross-country weak matches even without row.country
  const k = pickBest(
    [{ name: 'Eindhovenseweg Best', city: 'Best', country: '' }],
    { hotelName: 'The Best', urlCountry: 'TR', countryCode: 'TR' }
  );
  // empty country on row → city Best maps to NL → filtered
  assert.equal(k, null);
});

test('brand city: New Yorker defaults to New York', () => {
  const a = P('https://www.booking.com/hotel/us/the-new-yorker1.html');
  assert.equal(a.hotelName, 'The New Yorker');
  assert.equal(a.cityName, 'New York');
  assert.equal(a.countryCode, 'US');
});
