import { NextResponse } from 'next/server';

const LITEAPI_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const textQuery = searchParams.get('textQuery');
    const type = searchParams.get('type');

    if (!textQuery) {
        return NextResponse.json({ error: 'textQuery is required' }, { status: 400 });
    }

    try {
        const upstreamParams = new URLSearchParams({ textQuery });
        if (type) upstreamParams.set('type', type);

        const res = await fetch(`https://api.liteapi.travel/v3.0/data/places?${upstreamParams.toString()}`, {
            headers: {
                'X-API-Key': LITEAPI_KEY,
                'accept': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`LiteAPI error: ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in /api/places:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
