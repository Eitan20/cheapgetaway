"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import HorizontalScrollArrows from './HorizontalScrollArrows';

// Sample top hotel IDs for weekend deals (e.g., Vegas, Miami, NYC style spots)
const HOTEL_IDS = ["lp1a278", "lp1a7fc", "lp1a88f", "lp194b6", "lp1a5a0", "lp1a6b0"];
const FALLBACK_DEALS = [
    {
        id: "fallback-vegas",
        name: "Downtown Las Vegas Stay",
        city: "Las Vegas",
        image: "/images/weekend-family.webp",
        price: 99
    },
    {
        id: "fallback-miami",
        name: "South Beach Escape",
        city: "Miami",
        image: "/images/weekend-beach.webp",
        price: 119
    },
    {
        id: "fallback-nyc",
        name: "Midtown Weekend Pick",
        city: "New York",
        image: "/images/weekend-adventure.webp",
        price: 139
    },
    {
        id: "fallback-nola",
        name: "French Quarter Retreat",
        city: "New Orleans",
        image: "/images/weekend-city.webp",
        price: 109
    }
];

export default function WeekendDeals() {
    const router = useRouter();
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const carouselRef = useRef<HTMLDivElement>(null);

    // Calculate dates for the upcoming weekend (Friday to Sunday)
    const getNextWeekend = () => {
        const today = new Date();
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + ((7 - today.getDay() + 5) % 7 || 7));

        const nextSunday = new Date(nextFriday);
        nextSunday.setDate(nextFriday.getDate() + 2);

        return {
            checkin: nextFriday.toISOString().split('T')[0],
            checkout: nextSunday.toISOString().split('T')[0]
        };
    };

    const { checkin, checkout } = getNextWeekend();

    useEffect(() => {
        async function fetchWeekendDeals() {
            try {
                const rateRes = await fetch('/api/min-rates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        hotelIds: HOTEL_IDS,
                        checkin,
                        checkout,
                        occupancies: [{ adults: 2 }],
                        currency: 'USD',
                        guestNationality: 'US'
                    })
                });

                if (!rateRes.ok) return;
                const rateData = await rateRes.json();
                const rateRows = Array.isArray(rateData?.data)
                    ? rateData.data
                    : Array.isArray(rateData)
                        ? rateData
                        : [];

                // Fetch details for names and images
                const enrichedDeals = [];
                for (const item of rateRows) {
                    const hotelId = item.hotelId;
                    const price = item.minPrice ?? item.price;
                    const currency = item.currency || 'USD';

                    if (price) {
                        try {
                            const detailsRes = await fetch(`/api/hotel?hotelId=${hotelId}`);
                            const details = await detailsRes.json();
                            if (details.data || item.hotelData) {
                                const hotelData = details.data || item.hotelData || {};
                                enrichedDeals.push({
                                    id: hotelId,
                                    name: hotelData.name || item.hotelName || "Weekend Stay",
                                    city: hotelData.city || item.city || "Top Destination",
                                    image: hotelData.main_photo || hotelData.images?.[0]?.url || "/images/hotel-fallback-xl.webp",
                                    price,
                                    currency,
                                    rating: hotelData.rating
                                });
                            }
                        } catch (e) {
                            console.error(`Failed to fetch details for ${hotelId}`, e);
                        }
                    }
                }

                setDeals(enrichedDeals);
            } catch (error) {
                console.error("Error fetching weekend deals:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchWeekendDeals();
    }, [checkin, checkout]);

    if (loading) {
        return (
            <section className="deals-carousel-section" id="weekend">
                <div className="section-header">
                    <h2>Weekend Steals</h2>
                    <p>Prices just dropped for this upcoming weekend.</p>
                </div>
                <div className="carousel-container">
                    <div className="carousel-track" ref={carouselRef}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="deal-card skeleton"></div>
                        ))}
                    </div>
                    <HorizontalScrollArrows targetRef={carouselRef} />
                </div>
            </section>
        );
    }

    const visibleDeals = deals.length > 0 ? deals : FALLBACK_DEALS;

    return (
        <section className="deals-carousel-section" id="weekend">
            <div className="section-header">
                <h2>Weekend Steals</h2>
                <p>Prices just dropped for this upcoming weekend.</p>
            </div>

            <div className="carousel-container">
                <div className="carousel-track hide-scrollbar" ref={carouselRef}>
                    {visibleDeals.map((deal) => (
                        <div
                            key={deal.id}
                            className="deal-card"
                            onClick={() => {
                                if (deal.id.startsWith("fallback-")) {
                                    router.push(`/search?type=semantic&query=${encodeURIComponent(`${deal.city} weekend hotel deals`)}&checkin=${checkin}&checkout=${checkout}&adults=2`);
                                    return;
                                }
                                router.push(`/hotel/${deal.id}?checkin=${checkin}&checkout=${checkout}&adults=2`);
                            }}
                        >
                            <div className="deal-img-wrapper">
                                <img src={deal.image} alt={deal.name} loading="lazy" />
                                <div className="deal-glass-pill price-pill">
                                    <span className="deal-price">${Math.round(deal.price)}</span>
                                    <span className="deal-night">/night</span>
                                </div>
                            </div>
                            <div className="deal-info">
                                <h3>{deal.name}</h3>
                                <p className="text-muted">{deal.city}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <HorizontalScrollArrows targetRef={carouselRef} />
            </div>
        </section>
    );
}
