import { NextResponse } from 'next/server';

const LITEAPI_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';

export async function GET(request: Request, { params }: { params: any }) {
    const { searchParams } = new URL(request.url);
    const queryStr = searchParams.toString() ? '?' + searchParams.toString() : '';
    
    try {
        const res = await fetch(`https://api.liteapi.travel/v3.0/guests/${params.guestId}/loyalty-points` + queryStr, {
            headers: {
                'X-API-Key': LITEAPI_KEY,
                'accept': 'application/json'
            }
        });

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: `LiteAPI error: ${res.status} ${err}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in guests/[guestId]/loyalty-points:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
