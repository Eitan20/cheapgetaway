const fs = require('fs');
const path = require('path');

const key = process.env.LITEAPI_KEY || 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';
const base = 'https://api.liteapi.travel/v3.0';

const routes = [
    // Method, dir, target
    { method: 'GET', dir: 'data/chains', target: '/data/chains' },
    { method: 'GET', dir: 'data/cities', target: '/data/cities' },
    { method: 'GET', dir: 'data/countries', target: '/data/countries' },
    { method: 'GET', dir: 'data/currencies', target: '/data/currencies' },
    { method: 'GET', dir: 'data/facilities', target: '/data/facilities' },
    { method: 'GET', dir: 'data/hotel/ask', target: '/data/hotel/ask' },
    { method: 'GET', dir: 'data/hotel/search', target: '/data/hotel/search' },
    { method: 'GET', dir: 'data/hotels', target: '/data/hotels' },
    { method: 'GET', dir: 'data/hotels/room-search', target: '/data/hotels/room-search' },
    { method: 'GET', dir: 'data/hotels/semantic-search', target: '/data/hotels/semantic-search' },
    { method: 'GET', dir: 'data/hoteltypes', target: '/data/hoteltypes' },
    { method: 'GET', dir: 'data/iatacodes', target: '/data/iatacodes' },
    { method: 'GET', dir: 'data/places/[placeId]', target: '/data/places/${params.placeId}' },
    { method: 'GET', dir: 'data/reviews', target: '/data/reviews' },
    { method: 'GET', dir: 'data/weather', target: '/data/weather' },

    { method: 'GET', dir: 'guests', target: '/guests' },
    { method: 'GET', dir: 'guests/[guestId]', target: '/guests/${params.guestId}' },
    { method: 'GET', dir: 'guests/[guestId]/bookings', target: '/guests/${params.guestId}/bookings' },
    { method: 'GET', dir: 'guests/[guestId]/loyalty-points', target: '/guests/${params.guestId}/loyalty-points' },
    { method: 'GET', dir: 'guests/[guestId]/vouchers', target: '/guests/${params.guestId}/vouchers' },
    { method: 'POST', dir: 'guests/[guestId]/loyalty-points/redeem', target: '/guests/${params.guestId}/loyalty-points/redeem' },

    { method: 'GET', dir: 'vouchers', target: '/vouchers' },
    { method: 'POST', dir: 'vouchers', target: '/vouchers' },
    { method: 'GET', dir: 'vouchers/history', target: '/vouchers/history' },
    { method: 'GET', dir: 'vouchers/[voucherId]', target: '/vouchers/${params.voucherId}' },
    { method: 'PUT', dir: 'vouchers/[voucherId]', target: '/vouchers/${params.voucherId}' },
    { method: 'DELETE', dir: 'vouchers/[voucherId]', target: '/vouchers/${params.voucherId}' },
    { method: 'PUT', dir: 'vouchers/[voucherId]/status', target: '/vouchers/${params.voucherId}/status' },

    { method: 'GET', dir: 'bookings', target: '/bookings' },
    { method: 'GET', dir: 'bookings/[bookingId]', target: '/bookings/${params.bookingId}' },
    { method: 'PUT', dir: 'bookings/[bookingId]', target: '/bookings/${params.bookingId}' },
    { method: 'PUT', dir: 'bookings/[bookingId]/amend', target: '/bookings/${params.bookingId}/amend' },

    { method: 'GET', dir: 'supply/customization', target: '/supply/customization' },
    { method: 'PUT', dir: 'supply/customization', target: '/supply/customization' },

    { method: 'GET', dir: 'loyalties', target: '/loyalties' },
    { method: 'PUT', dir: 'loyalties', target: '/loyalties' },

    { method: 'POST', dir: 'analytics/hotels', target: '/analytics/hotels' },
    { method: 'POST', dir: 'analytics/markets', target: '/analytics/markets' },
    { method: 'POST', dir: 'analytics/report', target: '/analytics/report' },
    { method: 'POST', dir: 'analytics/weekly', target: '/analytics/weekly' },

    { method: 'POST', dir: 'hotels/min-rates', target: '/hotels/min-rates' }
];

const apiDir = path.join(__dirname, 'src', 'app', 'api');

routes.forEach(({ method, dir, target }) => {
    const routeDir = path.join(apiDir, dir);
    if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
    }

    const routePath = path.join(routeDir, 'route.ts');
    let content = '';
    if (fs.existsSync(routePath)) {
        content = fs.readFileSync(routePath, 'utf8');
    } else {
        content = `import { NextResponse } from 'next/server';\n\nconst LITEAPI_KEY = '${key}';\n`;
    }

    if (content.includes(`export async function ${method}`)) {
        return;
    }

    const hasParams = target.includes('${params.');
    let newExport = '';

    if (method === 'GET') {
        newExport = `
export async function GET(request: Request${hasParams ? ', { params }: { params: any }' : ''}) {
    const { searchParams } = new URL(request.url);
    const queryStr = searchParams.toString() ? '?' + searchParams.toString() : '';
    
    try {
        const res = await fetch(\`${base}${target}\` + queryStr, {
            headers: {
                'X-API-Key': LITEAPI_KEY,
                'accept': 'application/json'
            }
        });

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: \`LiteAPI error: \${res.status} \${err}\` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in ${dir}:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
`;
    } else {
        newExport = `
export async function ${method}(request: Request${hasParams ? ', { params }: { params: any }' : ''}) {
    try {
        let body;
        try {
            body = await request.json();
        } catch(e) {}
        
        const res = await fetch(\`${base}${target}\`, {
            method: '${method}',
            headers: {
                'X-API-Key': LITEAPI_KEY,
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: \`LiteAPI error: \${res.status} \${err}\` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in ${dir}:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
`;
    }

    content += newExport;
    fs.writeFileSync(routePath, content);
    console.log(`Added ${method} to ${dir}`);
});
