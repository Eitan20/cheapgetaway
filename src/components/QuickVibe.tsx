"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const VIBES = [
    {
        title: "Romantic escape in Paris",
        query: "A romantic hotel in Paris near the Eiffel Tower with a balcony",
        image: "/images/quickvibe-poolside.webp"
    },
    {
        title: "Budget ski trip in Colorado",
        query: "Affordable ski lodge in Colorado near the slopes",
        image: "/images/quickvibe-city.webp"
    },
    {
        title: "Beachfront party in Miami",
        query: "Fun beachfront hotel in Miami South Beach with a pool party",
        image: "/images/quickvibe-romantic.webp"
    },
    {
        title: "Cozy cabin in the woods",
        query: "A quiet, cozy cabin in the woods with a fireplace",
        image: "/images/quickvibe-roadtrip.webp"
    }
];

export default function QuickVibe() {
    const router = useRouter();

    const handleVibeClick = (query: string) => {
        const checkin = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Tomorrow
        const checkout = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]; // 3 days from now

        const params = new URLSearchParams({
            type: 'ai',
            aiQuery: query,
            checkin,
            checkout,
            adults: '2'
        });

        router.push(`/search?${params.toString()}`);
    };

    return (
        <section className="quick-vibe">
            <div className="section-header">
                <h2><Sparkles size={24} className="icon-sparkle" /> Pick Your Vibe</h2>
                <p>Let AI find your perfect getaway.</p>
            </div>
            <div className="vibe-grid">
                {VIBES.map((vibe, idx) => (
                    <div
                        key={idx}
                        className="vibe-card"
                        onClick={() => handleVibeClick(vibe.query)}
                        style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.1)), url(${vibe.image})` }}
                    >
                        <h3>{vibe.title}</h3>
                    </div>
                ))}
            </div>
        </section>
    );
}
