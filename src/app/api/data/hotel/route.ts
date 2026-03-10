import { NextResponse } from 'next/server';

const LITEAPI_KEY = 'prod_836dbd63-00e5-443a-9b49-ce47adc49202';

async function getHeroVideo(hotelId: string, poster?: string) {
    const videoUrl = `https://static.nuitee.cloud/videos/${hotelId}.mp4`;

    try {
        const res = await fetch(videoUrl, {
            method: 'HEAD',
            cache: 'no-store',
        });

        if (!res.ok) return null;

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('video/')) return null;

        return {
            url: videoUrl,
            poster: poster || null,
        };
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const timeout = searchParams.get('timeout');

    if (!hotelId) {
        return NextResponse.json({ error: 'hotelId is required' }, { status: 400 });
    }

    const upstreamParams = new URLSearchParams({ hotelId });
    if (timeout) upstreamParams.set('timeout', timeout);

    try {
        const res = await fetch(`https://api.liteapi.travel/v3.0/data/hotel?${upstreamParams.toString()}`, {
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
        const hotel = data?.data || data;

        if (hotel?.id) {
            const poster = hotel.main_photo || hotel.hotelImages?.[0]?.url || null;
            const heroVideo = await getHeroVideo(hotel.id, poster);
            if (heroVideo) {
                hotel.heroVideo = heroVideo;
            }
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in data/hotel:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
