"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MapPin, Star, ArrowRight } from 'lucide-react';

export default function SearchResultsPage() {
    return (
        <React.Suspense fallback={
            <div className="search-results-page">
                <div className="loading-state"><div className="spinner"></div><p>Finding the best premium stays...</p></div>
            </div>
        }>
            <SearchResultsContent />
        </React.Suspense>
    );
}

function SearchResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const type = searchParams.get('type');
    const aiSearch = searchParams.get('aiSearch') || searchParams.get('aiQuery');
    const semanticQuery = searchParams.get('semanticQuery');
    const placeId = searchParams.get('placeId');
    const placeName = searchParams.get('placeName');

    const fallbackCheckin = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const fallbackCheckout = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

    const checkin = searchParams.get('checkin') || fallbackCheckin;
    const checkout = searchParams.get('checkout') || fallbackCheckout;
    const adults = searchParams.get('adults') || '2';

    const [hotels, setHotels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHotels() {
            setLoading(true);
            setError(null);

            try {
                if (type === 'semantic' || semanticQuery) {
                    const query = semanticQuery || aiSearch || placeName || 'romantic couples retreat';
                    const semanticRes = await fetch(`/api/data/hotels/semantic-search?query=${encodeURIComponent(query)}&limit=30`);
                    if (!semanticRes.ok) throw new Error('Failed to fetch semantic hotel matches');

                    const semanticPayload = await semanticRes.json();
                    const semanticHotels = semanticPayload.data || [];
                    const hotelIds = semanticHotels.map((h: any) => h.id).filter(Boolean).slice(0, 30);

                    if (hotelIds.length === 0) {
                        setHotels([]);
                        return;
                    }

                    const ratesRes = await fetch('/api/rates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            checkin,
                            checkout,
                            occupancies: [{ adults: Number(adults) }],
                            hotelIds
                        })
                    });

                    if (!ratesRes.ok) throw new Error('Failed to fetch rates for semantic matches');
                    const ratesPayload = await ratesRes.json();

                    const detailsMap = new Map();
                    if (ratesPayload.hotels) {
                        ratesPayload.hotels.forEach((h: any) => detailsMap.set(h.id, h));
                    }

                    const ratesMap = new Map();
                    (ratesPayload.data || []).forEach((r: any) => ratesMap.set(r.hotelId, r));

                    const mergedSemantic = semanticHotels.map((semantic: any) => {
                        const rateData = ratesMap.get(semantic.id);
                        const info = detailsMap.get(semantic.id) || rateData?.hotelData || {};
                        const room0 = rateData?.roomTypes?.[0]?.rates?.[0] || {};
                        const price = room0.retailRate?.total?.[0]?.amount || rateData?.rates?.[0]?.price || 0;
                        const city = info.city || semantic.city;
                        const country = semantic.country ? String(semantic.country).toUpperCase() : '';

                        return {
                            hotelId: semantic.id,
                            name: info.name || semantic.name || 'Lovely Hotel',
                            main_photo: info.main_photo || semantic.main_photo || '/images/hotel-fallback-search.webp',
                            address: info.address || semantic.address || [city, country].filter(Boolean).join(', ') || 'Great Location',
                            rating: info.rating || null,
                            price,
                            currency: room0.retailRate?.total?.[0]?.currency || rateData?.rates?.[0]?.currency || 'USD',
                        };
                    }).filter((h: any) => h.price > 0);

                    setHotels(mergedSemantic);
                    return;
                }

                const payload: any = {
                    checkin,
                    checkout,
                    occupancies: [{ adults: Number(adults) }],
                };

                if (aiSearch) {
                    payload.aiSearch = aiSearch;
                } else if (type === 'ai') {
                    payload.aiSearch = searchParams.get('aiQuery');
                } else if (placeId) {
                    payload.placeId = placeId;
                } else {
                    payload.aiSearch = placeName ? `hotels in ${placeName}` : 'top rated value hotels';
                }

                const res = await fetch('/api/rates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error('Failed to fetch hotels');
                const data = await res.json();

                // Match rate data with hotel details
                const detailsMap = new Map();
                if (data.hotels) {
                    data.hotels.forEach((h: any) => detailsMap.set(h.id, h));
                }

                const merged = (data.data || []).map((rateData: any) => {
                    const info = detailsMap.get(rateData.hotelId) || {};
                    const room0 = rateData.roomTypes?.[0]?.rates?.[0] || {};

                    return {
                        hotelId: rateData.hotelId,
                        name: info.name || 'Lovely Hotel',
                        main_photo: info.main_photo || '/images/hotel-fallback-search.webp',
                        address: info.address || 'Great Location',
                        rating: info.rating || 4.5,
                        price: room0.retailRate?.total?.[0]?.amount || 0,
                        currency: room0.retailRate?.total?.[0]?.currency || 'USD',
                    };
                }).filter((h: any) => h.price > 0);

                setHotels(merged);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchHotels();
    }, [searchParams]);

    return (
        <div className="search-results-page">
            <div className="search-header">
                <h1>{semanticQuery ? `Vibe matches for "${semanticQuery}"` : aiSearch ? `Search results for "${aiSearch}"` : `Hotels in ${placeName || 'your destination'}`}</h1>
                <p>{checkin} to {checkout} • {adults} Adults</p>
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
                    <p>No hotels found for your dates. Try adjusting your search.</p>
                </div>
            ) : (
                <div className="results-grid">
                    {hotels.map((hotel) => (
                        <div key={hotel.hotelId} className="hotel-card" onClick={() => router.push(`/hotel/${hotel.hotelId}?checkin=${checkin}&checkout=${checkout}&adults=${adults}`)}>
                            <div className="hotel-img">
                                <img src={hotel.main_photo} alt={hotel.name} />
                                <div className="rating-badge">
                                    <Star size={14} fill="currentColor" /> {hotel.rating}
                                </div>
                            </div>
                            <div className="hotel-info">
                                <h3>{hotel.name}</h3>
                                <p className="address"><MapPin size={14} /> {hotel.address}</p>
                                <div className="hotel-footer">
                                    <div className="price">
                                        <strong>${hotel.price.toFixed(2)}</strong> <small>avg/night</small>
                                    </div>
                                    <button className="book-btn">
                                        View <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
