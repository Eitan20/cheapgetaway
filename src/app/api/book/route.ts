import { NextResponse } from 'next/server';

const LITEAPI_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { prebookId, holder, transactionId, guests } = body;
        if (!prebookId || !holder || !transactionId || !guests) {
            return NextResponse.json({ error: 'Missing required booking parameters' }, { status: 400 });
        }

        const payload = {
            prebookId: prebookId,
            holder: holder,
            payment: {
                method: "TRANSACTION_ID",
                transactionId: transactionId
            },
            guests: guests
        };

        const res = await fetch('https://book.liteapi.travel/v3.0/rates/book', {
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
            return NextResponse.json({ error: 'Failed to book', details: data.error || data }, { status: res.status || 400 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in /api/book:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
