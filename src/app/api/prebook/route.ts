import { NextResponse } from 'next/server';

const LITEAPI_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.offerId) {
            return NextResponse.json({ error: 'offerId is required' }, { status: 400 });
        }

        const payload = {
            usePaymentSdk: true,
            offerId: body.offerId
        };

        const res = await fetch('https://book.liteapi.travel/v3.0/rates/prebook', {
            method: 'POST',
            headers: {
                'X-API-Key': LITEAPI_KEY,
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || data.error) {
            return NextResponse.json({ error: 'Failed to prebook', details: data.error || data }, { status: res.status || 400 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in /api/prebook:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
