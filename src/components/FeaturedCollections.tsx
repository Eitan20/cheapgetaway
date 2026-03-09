"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function FeaturedCollections() {
    const router = useRouter();

    const collections = [
        {
            title: "Beach Escapes",
            subtitle: "Sun, sand, and savings",
            image: "/images/featured-beach.webp",
            query: "beachfront resort"
        },
        {
            title: "City Breaks",
            subtitle: "Neon lights and late nights",
            image: "/images/featured-roadtrip.webp",
            query: "downtown city center"
        },
        {
            title: "Mountain Retreats",
            subtitle: "Cabins and cozy fireplaces",
            image: "/images/featured-mountain.webp",
            query: "mountain cabin resort"
        },
        {
            title: "Desert Vibes",
            subtitle: "Oasis luxury",
            image: "/images/featured-forest.webp",
            query: "desert oasis resort"
        }
    ];

    const getDates = () => {
        const checkin = new Date();
        checkin.setDate(checkin.getDate() + 14);
        const checkout = new Date(checkin);
        checkout.setDate(checkout.getDate() + 3);

        return {
            checkin: checkin.toISOString().split('T')[0],
            checkout: checkout.toISOString().split('T')[0]
        };
    };

    const handleClick = (query: string) => {
        const { checkin, checkout } = getDates();
        const searchParams = new URLSearchParams({
            aiSearch: query,
            checkin,
            checkout,
            adults: '2',
            type: 'ai'
        });
        router.push(`/search?${searchParams.toString()}`);
    };

    return (
        <section className="featured-destinations" id="vibes">
            <div className="section-header">
                <h2>Featured Collections</h2>
                <p>Curated trips for whatever vibe you're chasing.</p>
            </div>

            <div className="bento-grid">
                {collections.map((coll, idx) => (
                    <div
                        key={idx}
                        className={`bento-card bento-item-${idx + 1}`}
                        onClick={() => handleClick(coll.query)}
                    >
                        <img src={coll.image} alt={coll.title} loading="lazy" />
                        <div className="bento-info">
                            <h3>{coll.title}</h3>
                            <p>{coll.subtitle}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
