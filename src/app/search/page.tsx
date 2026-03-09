"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MapPin, Star, Sparkles } from 'lucide-react';

type HotelCard = {
    hotelId: string;
    name: string;
    main_photo: string;
    address: string;
    rating: number | null;
    price: number;
    currency: string;
    matchLabel?: string;
    matchStory?: string;
};

type SearchMode = 'standard' | 'ai';

function getRateMaps(ratesPayload: any) {
    const detailsMap = new Map<string, any>();
    const ratesMap = new Map<string, any>();

    if (Array.isArray(ratesPayload?.hotels)) {
        ratesPayload.hotels.forEach((hotel: any) => {
            if (hotel?.id) detailsMap.set(hotel.id, hotel);
        });
    }

    if (Array.isArray(ratesPayload?.data)) {
        ratesPayload.data.forEach((row: any) => {
            if (row?.hotelId) ratesMap.set(row.hotelId, row);
        });
    }

    return { detailsMap, ratesMap };
}

function getRateSummary(rateData: any) {
    const room0 = rateData?.roomTypes?.[0]?.rates?.[0] || {};
    const amount = room0?.retailRate?.total?.[0]?.amount || rateData?.rates?.[0]?.price || 0;
    const currency = room0?.retailRate?.total?.[0]?.currency || rateData?.rates?.[0]?.currency || 'USD';

    return {
        amount: Number(amount) || 0,
        currency,
    };
}

async function fetchRates(hotelIds: string[], checkin: string, checkout: string, adults: string) {
    const ratesRes = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            hotelIds,
            checkin,
            checkout,
            occupancies: [{ adults: Number(adults) }],
        })
    });

    if (!ratesRes.ok) {
        throw new Error('Failed to fetch rates for selected hotels');
    }

    return ratesRes.json();
}

export default function SearchResultsPage() {
    return (
        <React.Suspense
            fallback={
                <div className="search-results-page">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Finding the best premium stays...</p>
                    </div>
                </div>
            }
        >
            <SearchResultsContent />
        </React.Suspense>
    );
}

function SearchResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const searchParamString = searchParams.toString();
    const requestedMode = searchParams.get('mode') || searchParams.get('type') || 'standard';
    const mode = ((requestedMode === 'semantic' ? 'ai' : requestedMode) as SearchMode);
    const placeId = searchParams.get('placeId');
    const placeName = searchParams.get('placeName');
    const aiQuery = searchParams.get('aiQuery') || searchParams.get('semanticQuery') || searchParams.get('query') || searchParams.get('aiSearch');
    const maxPrice = Number(searchParams.get('maxPrice') || 0);

    const fallbackCheckin = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const fallbackCheckout = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

    const checkin = searchParams.get('checkin') || fallbackCheckin;
    const checkout = searchParams.get('checkout') || fallbackCheckout;
    const adults = searchParams.get('adults') || '2';

    const [hotels, setHotels] = useState<HotelCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHotels() {
            setLoading(true);
            setError(null);

            try {
                let mergedHotels: HotelCard[] = [];

                if (mode === 'ai' || Boolean(aiQuery)) {
                    const query = aiQuery || placeName || 'romantic couples retreat';
                    const semanticRes = await fetch(`/api/data/hotels/semantic-search?query=${encodeURIComponent(query)}&limit=30`);
                    if (!semanticRes.ok) throw new Error('Failed to fetch AI hotel matches');

                    const semanticPayload = await semanticRes.json();
                    const semanticHotels = Array.isArray(semanticPayload?.data) ? semanticPayload.data : [];
                    const hotelIds = semanticHotels.map((hotel: any) => hotel.id).filter(Boolean).slice(0, 30);

                    if (hotelIds.length === 0) {
                        setHotels([]);
                        return;
                    }

                    const ratesPayload = await fetchRates(hotelIds, checkin, checkout, adults);
                    const { detailsMap, ratesMap } = getRateMaps(ratesPayload);

                    mergedHotels = semanticHotels.map((semantic: any) => {
                        const rateData = ratesMap.get(semantic.id);
                        const hotelDetails = detailsMap.get(semantic.id) || rateData?.hotelData || {};
                        const rate = getRateSummary(rateData);
                        const city = hotelDetails.city || semantic.city;
                        const country = semantic.country ? String(semantic.country).toUpperCase() : '';

                        return {
                            hotelId: semantic.id,
                            name: hotelDetails.name || semantic.name || 'Lovely Hotel',
                            main_photo: hotelDetails.main_photo || semantic.main_photo || '/images/hotel-fallback-search.webp',
                            address: hotelDetails.address || semantic.address || [city, country].filter(Boolean).join(', ') || 'Great location',
                            rating: hotelDetails.rating || semantic.rating || null,
                            price: rate.amount,
                            currency: rate.currency,
                            matchLabel: semantic.persona || semantic.style,
                            matchStory: semantic.story,
                        };
                    });
                } else if (placeId) {
                    const listRes = await fetch(`/api/data/hotels?placeId=${encodeURIComponent(placeId)}&limit=60`);
                    if (!listRes.ok) throw new Error('Failed to fetch hotel list');

                    const listPayload = await listRes.json();
                    const listedHotels = Array.isArray(listPayload?.data) ? listPayload.data : [];
                    const hotelIds = listedHotels.map((hotel: any) => hotel.id).filter(Boolean).slice(0, 60);

                    if (hotelIds.length === 0) {
                        setHotels([]);
                        return;
                    }

                    const ratesPayload = await fetchRates(hotelIds, checkin, checkout, adults);
                    const { detailsMap, ratesMap } = getRateMaps(ratesPayload);

                    mergedHotels = listedHotels.map((listedHotel: any) => {
                        const rateData = ratesMap.get(listedHotel.id);
                        const hotelDetails = detailsMap.get(listedHotel.id) || {};
                        const rate = getRateSummary(rateData);
                        const city = hotelDetails.city || listedHotel.city;
                        const country = listedHotel.country ? String(listedHotel.country).toUpperCase() : '';

                        return {
                            hotelId: listedHotel.id,
                            name: hotelDetails.name || listedHotel.name || 'Lovely Hotel',
                            main_photo: hotelDetails.main_photo || listedHotel.main_photo || '/images/hotel-fallback-search.webp',
                            address: hotelDetails.address || listedHotel.address || [city, country].filter(Boolean).join(', ') || 'Great location',
                            rating: hotelDetails.rating || listedHotel.rating || null,
                            price: rate.amount,
                            currency: rate.currency,
                        };
                    });
                } else {
                    const fallbackRes = await fetch('/api/rates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            checkin,
                            checkout,
                            occupancies: [{ adults: Number(adults) }],
                            aiSearch: placeName ? `hotels in ${placeName}` : 'top rated value hotels'
                        })
                    });

                    if (!fallbackRes.ok) throw new Error('Failed to fetch hotels');

                    const fallbackPayload = await fallbackRes.json();
                    const { detailsMap } = getRateMaps(fallbackPayload);

                    mergedHotels = (Array.isArray(fallbackPayload?.data) ? fallbackPayload.data : []).map((rateData: any) => {
                        const hotelDetails = detailsMap.get(rateData.hotelId) || {};
                        const rate = getRateSummary(rateData);

                        return {
                            hotelId: rateData.hotelId,
                            name: hotelDetails.name || 'Lovely Hotel',
                            main_photo: hotelDetails.main_photo || '/images/hotel-fallback-search.webp',
                            address: hotelDetails.address || 'Great location',
                            rating: hotelDetails.rating || 4.5,
                            price: rate.amount,
                            currency: rate.currency,
                        };
                    });
                }

                const filteredHotels = mergedHotels
                    .filter((hotel) => hotel.price > 0)
                    .filter((hotel) => !maxPrice || hotel.price <= maxPrice);

                setHotels(filteredHotels);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchHotels();
    }, [searchParamString]);

    const heading =
        mode === 'ai' && aiQuery
            ? `AI matches for "${aiQuery}"`
            : `Hotels in ${placeName || 'your destination'}`;

    const subtitleParts = [checkin, checkout ? `to ${checkout}` : '', `${adults} adult${adults === '1' ? '' : 's'}`]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="search-results-page">
            <div className="search-header">
                <h1>{heading}</h1>
                <p>{subtitleParts}</p>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Finding the best premium stays...</p>
                </div>
            ) : error ? (
                <div className="error-state">
                    <p>Oops, something went wrong: {error}</p>
                </div>
            ) : hotels.length === 0 ? (
                <div className="empty-state">
                    <p>No hotels found for your search. Try changing the destination or AI prompt.</p>
                </div>
            ) : (
                <div className="results-grid">
                    {hotels.map((hotel) => (
                        <div
                            key={hotel.hotelId}
                            className="hotel-card"
                            onClick={() => router.push(`/hotel/${hotel.hotelId}?checkin=${checkin}&checkout=${checkout}&adults=${adults}`)}
                        >
                            <div className="hotel-img">
                                <img src={hotel.main_photo} alt={hotel.name} />
                                <div className="rating-badge">
                                    <Star size={14} fill="currentColor" /> {hotel.rating ?? 'New'}
                                </div>
                            </div>
                            <div className="hotel-info">
                                <h3>{hotel.name}</h3>
                                <p className="address"><MapPin size={14} /> {hotel.address}</p>
                                {hotel.matchLabel && (
                                    <div className="hotel-match-badge">
                                        <Sparkles size={14} />
                                        <span>{hotel.matchLabel}</span>
                                    </div>
                                )}
                                {hotel.matchStory && <p className="hotel-match-copy">{hotel.matchStory}</p>}
                                <div className="hotel-footer">
                                    <div className="price">
                                        <strong>${hotel.price.toFixed(2)}</strong> <small>{hotel.currency} total</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
