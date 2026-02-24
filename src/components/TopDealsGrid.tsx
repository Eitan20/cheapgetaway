"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TopDealsGrid() {
    const router = useRouter();
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const getNextMonthDates = () => {
        const today = new Date();
        const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
        const checkin = new Date(nextMonth);
        const checkout = new Date(nextMonth);
        checkout.setDate(checkin.getDate() + 3);

        return {
            checkin: checkin.toISOString().split('T')[0],
            checkout: checkout.toISOString().split('T')[0]
        };
    };

    const { checkin, checkout } = getNextMonthDates();

    useEffect(() => {
        async function fetchTopDeals() {
            try {
                // Using aiSearch to find diverse value hotels
                const res = await fetch('/api/rates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        aiSearch: "top rated value hotels in major US cities",
                        checkin,
                        checkout,
                        occupancies: [{ adults: 2 }],
                        currency: 'USD',
                        guestNationality: 'US',
                        limit: 8
                    })
                });

                if (!res.ok) return;
                const data = await res.json();

                // aiSearch on /rates endpoint returns hotels with their rates and hotelData (if included/implied by aiSearch)
                const enrichedDeals = (data.data || []).map((item: any) => {
                    return {
                        id: item.hotelId,
                        name: item.hotelData?.name || item.hotelName || "Top Deal Hotel",
                        city: item.hotelData?.city || "Featured City",
                        image: item.hotelData?.main_photo || item.hotelData?.images?.[0]?.url || "/images/hotel-fallback-sm.webp",
                        price: item.rates?.[0]?.price || 0,
                        rating: item.hotelData?.rating || null
                    };
                }).filter((d: any) => d.price > 0).slice(0, 8); // Display top 8

                setDeals(enrichedDeals);
            } catch (err) {
                console.error("Error fetching top deals:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchTopDeals();
    }, [checkin, checkout]);

    if (loading) {
        return (
            <section className="top-deals-section" id="deals">
                <div className="section-header">
                    <h2>Top Deals Right Now</h2>
                    <p>Hand-picked stays offering incredible value.</p>
                </div>
                <div className="top-deals-grid">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="top-deal-card skeleton"></div>
                    ))}
                </div>
            </section>
        );
    }

    if (deals.length === 0) return null;

    return (
        <section className="top-deals-section" id="deals">
            <div className="section-header">
                <h2>Top Deals Right Now</h2>
                <p>Hand-picked stays offering incredible value.</p>
            </div>

            <div className="top-deals-grid">
                {deals.map(deal => (
                    <div
                        key={deal.id}
                        className="top-deal-card"
                        onClick={() => router.push(`/hotel/${deal.id}?checkin=${checkin}&checkout=${checkout}&adults=2`)}
                    >
                        <div className="top-deal-img">
                            <img src={deal.image} alt={deal.name} loading="lazy" />
                            {deal.rating && (
                                <div className="deal-rating">
                                    ★ {deal.rating}
                                </div>
                            )}
                        </div>
                        <div className="top-deal-info">
                            <div className="top-deal-header">
                                <h3>{deal.name}</h3>
                                <div className="top-deal-price">
                                    <span className="price-val">${Math.round(deal.price)}</span>
                                    <span className="price-label">/night</span>
                                </div>
                            </div>
                            <p className="text-muted">{deal.city}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
