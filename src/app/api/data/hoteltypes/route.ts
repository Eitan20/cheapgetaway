import { NextResponse } from 'next/server';

const LITEAPI_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';
let hotelTypesCache: any[] | null = null;

async function getHotelTypes(): Promise<any[]> {
    if (hotelTypesCache) return hotelTypesCache;

    const res = await fetch(`https://api.liteapi.travel/v3.0/data/hotelTypes`, {
        headers: {
            'X-API-Key': LITEAPI_KEY,
            'accept': 'application/json'
        }
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`LiteAPI error: ${res.status} ${err}`);
    }

    const data = await res.json();
    hotelTypesCache = Array.isArray(data?.data) ? data.data : [];
    return hotelTypesCache || [];
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    try {
        const ids = (searchParams.get('ids') || '')
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isFinite(value));
        const hotelTypes = await getHotelTypes();
        const filtered = ids.length
            ? hotelTypes.filter((item) => ids.includes(Number(item?.id)))
            : hotelTypes;

        return NextResponse.json({ data: filtered });
    } catch (error) {
        console.error('Error in data/hoteltypes:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
