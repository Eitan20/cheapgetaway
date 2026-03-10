import { NextResponse } from 'next/server';

const LITEAPI_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';

type LiteApiHotel = {
    id?: string;
    name?: string;
    address?: string;
    city?: string;
};

type LiteApiPlace = {
    placeId?: string;
    displayName?: string;
    formattedAddress?: string;
};

function normalize(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getCity(address: string) {
    return address.split(',')[0]?.trim() || '';
}

function tokenOverlap(target: string, candidate: string) {
    const targetTokens = new Set(normalize(target).split(' ').filter(Boolean));
    const candidateTokens = new Set(normalize(candidate).split(' ').filter(Boolean));

    if (targetTokens.size === 0 || candidateTokens.size === 0) return 0;

    let matches = 0;
    for (const token of Array.from(targetTokens)) {
        if (candidateTokens.has(token)) matches += 1;
    }

    return matches / targetTokens.size;
}

function scoreHotelMatch(hotel: LiteApiHotel, requestedName: string, requestedAddress: string) {
    const normalizedRequestedName = normalize(requestedName);
    const normalizedRequestedAddress = normalize(requestedAddress);
    const normalizedHotelName = normalize(hotel.name || '');
    const normalizedHotelAddress = normalize(hotel.address || '');
    const normalizedRequestedCity = normalize(getCity(requestedAddress));
    const normalizedHotelCity = normalize(hotel.city || '');

    let score = 0;

    if (!normalizedHotelName) return score;

    if (normalizedHotelName === normalizedRequestedName) {
        score += 4;
    } else {
        score += tokenOverlap(requestedName, hotel.name || '') * 2.5;

        if (
            normalizedRequestedName.includes(normalizedHotelName) ||
            normalizedHotelName.includes(normalizedRequestedName)
        ) {
            score += 1;
        }
    }

    if (normalizedRequestedAddress) {
        score += tokenOverlap(requestedAddress, hotel.address || '') * 1.5;

        if (
            normalizedHotelAddress &&
            (normalizedRequestedAddress.includes(normalizedHotelAddress) ||
                normalizedHotelAddress.includes(normalizedRequestedAddress))
        ) {
            score += 0.75;
        }
    }

    if (normalizedRequestedCity && normalizedHotelCity && normalizedRequestedCity === normalizedHotelCity) {
        score += 0.75;
    }

    return score;
}

async function liteApiFetch<T>(path: string) {
    const res = await fetch(`https://api.liteapi.travel/v3.0${path}`, {
        headers: {
            'X-API-Key': LITEAPI_KEY,
            accept: 'application/json',
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`LiteAPI error: ${res.status} ${body}`);
    }

    return (await res.json()) as T;
}

async function resolveFromPlaces(name: string, address: string) {
    const placeQueries = [`${name} ${address}`.trim(), name].filter(Boolean);
    let bestMatch: { hotel: LiteApiHotel; score: number; source: string } | null = null;

    for (const query of placeQueries) {
        const placesPayload = await liteApiFetch<{ data?: LiteApiPlace[] }>(
            `/data/places?textQuery=${encodeURIComponent(query)}&type=hotel`
        );
        const places = Array.isArray(placesPayload.data) ? placesPayload.data.slice(0, 3) : [];

        for (const place of places) {
            if (!place.placeId) continue;

            const hotelsPayload = await liteApiFetch<{ data?: LiteApiHotel[] }>(
                `/data/hotels?placeId=${encodeURIComponent(place.placeId)}&limit=10`
            );
            const hotels = Array.isArray(hotelsPayload.data) ? hotelsPayload.data : [];

            for (const hotel of hotels) {
                const score = scoreHotelMatch(hotel, name, address);
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { hotel, score, source: 'places' };
                }
            }
        }
    }

    return bestMatch;
}

async function resolveFromSemanticSearch(name: string, address: string) {
    const semanticPayload = await liteApiFetch<{ data?: LiteApiHotel[] }>(
        `/data/hotels/semantic-search?query=${encodeURIComponent(`${name} ${address}`.trim())}&limit=20`
    );
    const hotels = Array.isArray(semanticPayload.data) ? semanticPayload.data : [];

    let bestMatch: { hotel: LiteApiHotel; score: number; source: string } | null = null;
    for (const hotel of hotels) {
        const score = scoreHotelMatch(hotel, name, address);
        if (!bestMatch || score > bestMatch.score) {
            bestMatch = { hotel, score, source: 'semantic-search' };
        }
    }

    return bestMatch;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim() || '';
    const address = searchParams.get('address')?.trim() || '';

    if (!name) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    try {
        const [placeMatch, semanticMatch] = await Promise.all([
            resolveFromPlaces(name, address),
            resolveFromSemanticSearch(name, address),
        ]);

        const bestMatch =
            !semanticMatch || (placeMatch && placeMatch.score >= semanticMatch.score)
                ? placeMatch
                : semanticMatch;

        if (!bestMatch?.hotel?.id || bestMatch.score < 2.2) {
            return NextResponse.json({ error: 'No exact hotel match found' }, { status: 404 });
        }

        return NextResponse.json({
            hotelId: bestMatch.hotel.id,
            hotel: bestMatch.hotel,
            source: bestMatch.source,
            score: bestMatch.score,
        });
    } catch (error) {
        console.error('Error in data/hotel/resolve:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
