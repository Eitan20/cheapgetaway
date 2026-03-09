"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag } from 'lucide-react';

// Hardcoded premium budget hotels (using generic liteAPI test IDs/famous spots)
const HOTEL_IDS = ["lp1a278", "lp1a7fc", "lp1a88f", "lp194b6"];

export default function DailySteals() {
    const router = useRouter();
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const checkin = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]; // Next week
    const checkout = new Date(Date.now() + 86400000 * 9).toISOString().split('T')[0];

    useEffect(() => {
        async function fetchSteals() {
            try {
                // Fetch min rates
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

                // Fetch hotel details to get names and images
                // In a real app we'd bulk fetch or cache this, but doing sequential for demo
                const enrichedDeals = [];
                for (const item of rateData.data || []) {
                    const hotelId = item.hotelId;
                    const price = item.minPrice;
                    const currency = item.currency || 'USD';

                    if (price) {
                        try {
                            const detailsRes = await fetch(`/api/data/hotel?hotelId=${hotelId}`);
                            const details = await detailsRes.json();
                            if (details.data) {
                                enrichedDeals.push({
                                    id: hotelId,
                                    name: details.data.name,
                                    city: details.data.city,
                                    image: details.data.main_photo || details.data.images?.[0]?.url,
                                    price,
                                    currency,
                                    rating: details.data.rating
                                });
                            }
                        } catch (e) {
                            console.error(`Failed to fetch details for ${hotelId}`, e);
                        }
                    }
                }

                setDeals(enrichedDeals);
            } catch (error) {
                console.error("Error fetching daily steals:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchSteals();
    }, []);

    if (loading) {
        return (
            <section className="daily-steals">
                <h2><Tag size={24} /> Daily Steals</h2>
                <div className="steals-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="steal-card skeleton"></div>
                    ))}
                </div>
            </section>
        );
    }

    if (deals.length === 0) return null;

    return (
        <section className="daily-steals">
            <div className="section-header">
                <h2><Tag size={24} className="icon-tag" /> Daily Steals</h2>
                <p>Incredible bottom-line prices for next weekend.</p>
            </div>
            <div className="steals-grid">
                {deals.map(deal => (
                    <div
                        key={deal.id}
                        className="steal-card"
                        onClick={() => router.push(`/hotel/${deal.id}?checkin=${checkin}&checkout=${checkout}&adults=2`)}
                    >
                        <div className="steal-img">
                            <img src={deal.image} alt={deal.name} />
                            <div className="price-tag">
                                Starting at <strong>${Math.round(deal.price)}</strong>
                            </div>
                        </div>
                        <div className="steal-info">
                            <h3>{deal.name}</h3>
                            <p>{deal.city}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
