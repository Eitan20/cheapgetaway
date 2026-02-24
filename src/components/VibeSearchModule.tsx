"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function VibeSearchModule() {
    const router = useRouter();

    const vibes = [
        {
            id: 'romantic',
            title: 'Romantic Getaway',
            query: 'romantic couples retreat',
            image: '/images/vibe-beach.webp'
        },
        {
            id: 'party',
            title: 'Weekend Party',
            query: 'great nightlife and party vibes',
            image: '/images/vibe-nightlife.webp'
        },
        {
            id: 'family',
            title: 'Family Friendly',
            query: 'family friendly resort with kids activities',
            image: '/images/vibe-hiking.webp'
        },
        {
            id: 'luxury',
            title: 'Quiet Luxury',
            query: '5 star luxury quiet premium premium service',
            image: '/images/vibe-staycation.webp'
        }
    ];

    const getDates = () => {
        const checkin = new Date();
        checkin.setDate(checkin.getDate() + 14); // 2 weeks out
        const checkout = new Date(checkin);
        checkout.setDate(checkout.getDate() + 3);

        return {
            checkin: checkin.toISOString().split('T')[0],
            checkout: checkout.toISOString().split('T')[0]
        };
    };

    const handleVibeClick = (query: string) => {
        const { checkin, checkout } = getDates();
        const searchParams = new URLSearchParams({
            type: 'semantic',
            semanticQuery: query,
            checkin,
            checkout,
            adults: '2'
        });
        router.push(`/search?${searchParams.toString()}`);
    };

    return (
        <section className="vibe-search-section" id="vibes">
            <div className="section-header">
                <h2>Find Your Vibe</h2>
                <p>AI-powered searches matching exactly what you're feeling.</p>
            </div>

            <div className="vibe-grid">
                {vibes.map((vibe) => (
                    <div
                        key={vibe.id}
                        className="vibe-card"
                        style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 100%), url(${vibe.image})` }}
                        onClick={() => handleVibeClick(vibe.query)}
                    >
                        <h3>{vibe.title}</h3>
                    </div>
                ))}
            </div>
        </section>
    );
}
