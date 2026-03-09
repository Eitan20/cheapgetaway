import { NextResponse } from 'next/server';

const LITEAPI_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Set default standard options for rates/search
        const payload = {
            occupancies: body.occupancies || [{ adults: 2 }],
            currency: body.currency || 'USD',
            guestNationality: body.guestNationality || 'US',
            checkin: body.checkin,
            checkout: body.checkout,
            roomMapping: true,
            includeHotelData: true,
            maxRatesPerHotel: body.maxRatesPerHotel || 1, // Usually 1 for search list, omitted for single hotel details
            ...(body.placeId && { placeId: body.placeId }),
            ...(body.aiSearch && { aiSearch: body.aiSearch }),
            ...(body.hotelIds && { hotelIds: body.hotelIds })
        };

        const res = await fetch('https://api.liteapi.travel/v3.0/hotels/rates', {
            method: 'POST',
            headers: {
                'X-API-Key': LITEAPI_KEY,
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errPayload = await res.json().catch(() => ({}));
            return NextResponse.json({ error: 'Failed to fetch rates', details: errPayload }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in /api/rates:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
