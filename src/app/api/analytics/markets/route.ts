import { NextResponse } from 'next/server';

const LITEAPI_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';

export async function POST(request: Request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch(e) {}
        
        const res = await fetch(`https://api.liteapi.travel/v3.0/analytics/markets`, {
            method: 'POST',
            headers: {
                'X-API-Key': LITEAPI_KEY,
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: `LiteAPI error: ${res.status} ${err}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in analytics/markets:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
