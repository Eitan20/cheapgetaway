"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";

type RecommendedHotel = {
    name: string;
    address: string;
    image: string;
    score: number;
    reviews: number;
    price: number;
    stars: number;
};

const RECOMMENDED_HOTELS: RecommendedHotel[] = [
    { name: "The Royal Park Hotel Iconic Tokyo Shiodome", address: "Tokyo, 1-6-3 Higashishimbashi, Minato City", image: "https://static.cupid.travel/hotels/287763048.jpg", score: 9.1, reviews: 684, price: 412, stars: 5 },
    { name: "Four Seasons Resort Dubai at Jumeirah Beach", address: "Dubai, Jumeirah Beach Road, Jumeirah 2", image: "https://static.cupid.travel/hotels/ex_2debbc87_z.jpg", score: 9.4, reviews: 112, price: 995, stars: 5 },
    { name: "Pullman Paris Tour Eiffel", address: "Paris, 18 avenue de Suffren", image: "https://static.cupid.travel/hotels/428663598.jpg", score: 8.9, reviews: 1394, price: 468, stars: 5 },
    { name: "Sofitel Dubai Jumeirah Beach", address: "Dubai, Jumeirah Beach Residence, The Walk", image: "https://static.cupid.travel/hotels/ex_ca3a9677_z.jpg", score: 9.2, reviews: 827, price: 382, stars: 5 },
    { name: "St. James' Court, A Taj Hotel, London", address: "London, 54 Buckingham Gate, Westminster", image: "https://static.cupid.travel/hotels/177109798.jpg", score: 9.0, reviews: 948, price: 514, stars: 5 },
    { name: "Shangri-La Paris", address: "Paris, 10 avenue d'Iena", image: "https://static.cupid.travel/hotels/428663598.jpg", score: 9.5, reviews: 301, price: 1478, stars: 5 },
    { name: "Novotel Paris Les Halles", address: "Paris, 8 Place Marguerite de Navarre", image: "https://static.cupid.travel/hotels/ex_7cc26002_z.jpg", score: 8.8, reviews: 2104, price: 354, stars: 5 },
    { name: "The Prince Park Tower Tokyo - Preferred Hotels & Resorts, LVX Collection", address: "Tokyo, 4-8-1 Shibakoen, Minato City", image: "https://static.cupid.travel/hotels/619238700.jpg", score: 9.3, reviews: 763, price: 529, stars: 5 },
    { name: "Excelsior Hotel Gallia, a Luxury Collection Hotel, Milan", address: "Milan, Piazza Duca d'Aosta 9", image: "https://static.cupid.travel/hotels/ex_5a0106a4_z.jpg", score: 9.1, reviews: 419, price: 709, stars: 5 },
    { name: "Hotel Splendide Royal - The Leading Hotels of the World", address: "Rome, Via di Porta Pinciana 14", image: "https://static.cupid.travel/hotels/ex_74a7f292_z.jpg", score: 9.2, reviews: 188, price: 862, stars: 5 },
    { name: "The St. Regis Rome", address: "Rome, Via Vittorio Emanuele Orlando 3", image: "https://static.cupid.travel/hotels/ex_74a7f292_z.jpg", score: 9.4, reviews: 244, price: 1136, stars: 5 },
    { name: "The Peninsula Tokyo", address: "Tokyo, 1-8-1 Yurakucho, Chiyoda City", image: "https://static.cupid.travel/hotels/ex_b51d3c88_z.jpg", score: 9.6, reviews: 517, price: 1264, stars: 5 },
    { name: "UNA Hotels Galles Milano", address: "Milan, Piazza Lima 2", image: "https://static.cupid.travel/hotels/31473350.jpg", score: 8.7, reviews: 1312, price: 318, stars: 5 },
    { name: "Rome Cavalieri, A Waldorf Astoria Hotel", address: "Rome, Via Alberto Cadlolo 101", image: "https://static.cupid.travel/hotels/506518250.jpg", score: 9.3, reviews: 672, price: 921, stars: 5 },
    { name: "Jumeirah Burj Al Arab Dubai", address: "Dubai, Jumeirah Beach Road, Umm Suqeim 3", image: "https://static.cupid.travel/hotels/ex_1094b396_edited_12e1_z.jpg", score: 9.7, reviews: 945, price: 1777, stars: 5 },
    { name: "Mandarin Oriental Jumeira, Dubai", address: "Dubai, Jumeirah 1, Jumeirah Road", image: "https://static.cupid.travel/hotels/ex_2debbc87_z.jpg", score: 9.4, reviews: 503, price: 1088, stars: 5 },
    { name: "Shangri-La The Shard, London", address: "London, 31 St Thomas Street", image: "https://static.cupid.travel/hotels/177109798.jpg", score: 9.3, reviews: 736, price: 1196, stars: 5 },
    { name: "THE BLOSSOM HIBIYA", address: "Tokyo, 1-1-13 Shinbashi, Minato City", image: "https://static.cupid.travel/hotels/287763048.jpg", score: 9.0, reviews: 892, price: 337, stars: 5 },
    { name: "The Peninsula Paris", address: "Paris, 19 avenue Kleber", image: "https://static.cupid.travel/hotels/428663598.jpg", score: 9.6, reviews: 268, price: 1694, stars: 5 },
    { name: "H\u00f4tel Napoleon Paris", address: "Paris, 40 avenue de Friedland", image: "https://static.cupid.travel/hotels/428663598.jpg", score: 9.2, reviews: 817, price: 354, stars: 5 },
    { name: "Tokyo Bay Shiomi Prince Hotel", address: "Tokyo, 2-8-16 Shiomi, Koto City", image: "https://static.cupid.travel/hotels/117744158.jpg", score: 9.1, reviews: 1248, price: 286, stars: 5 },
    { name: "Magna Pars- L'Hotel \u00e0 Parfum Small Luxury Hotels of the World", address: "Milan, Via Forcella 6", image: "https://static.cupid.travel/hotels/506555007.jpg", score: 9.4, reviews: 205, price: 674, stars: 5 },
    { name: "London Hilton on Park Lane", address: "London, 22 Park Lane, Mayfair", image: "https://static.cupid.travel/hotels/177109798.jpg", score: 8.9, reviews: 1106, price: 602, stars: 5 },
    { name: "The Savoy", address: "London, Strand, Westminster", image: "https://static.cupid.travel/hotels/177109798.jpg", score: 9.5, reviews: 1237, price: 1388, stars: 5 },
    { name: "Hassler Roma", address: "Rome, Piazza Trinita Dei Monti 6, Rome, RM, 00187", image: "https://static.cupid.travel/hotels/ex_74a7f292_z.jpg", score: 9.4, reviews: 56, price: 1177, stars: 5 },
    { name: "Hyatt Regency London - The Churchill", address: "London, 30 Portman Square, Marylebone", image: "https://static.cupid.travel/hotels/ex_c46594db_z.jpg", score: 9.0, reviews: 688, price: 559, stars: 5 },
    { name: "Melia Milano", address: "Milan, Via Masaccio 19", image: "https://static.cupid.travel/hotels/31473350.jpg", score: 8.8, reviews: 972, price: 301, stars: 5 },
    { name: "Address Sky View, Downtown Dubai", address: "Dubai, Sheikh Mohammed bin Rashid Boulevard", image: "https://static.cupid.travel/hotels/ex_1094b396_edited_12e1_z.jpg", score: 9.3, reviews: 632, price: 744, stars: 5 },
    { name: "Villa Agrippina Gran Meli\u00e1 \u2013 The Leading Hotels of the World", address: "Rome, Via del Gianicolo 3", image: "https://static.cupid.travel/hotels/506518250.jpg", score: 9.5, reviews: 341, price: 984, stars: 5 }
];

function getReviewLabel(score: number) {
    if (score >= 9.5) return "Exceptional";
    if (score >= 9) return "Wonderful";
    if (score >= 8.5) return "Excellent";
    return "Very good";
}

function getNextStayDates() {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const checkin = new Date(nextMonth);
    const checkout = new Date(nextMonth);
    checkout.setDate(checkin.getDate() + 1);

    return {
        checkin: checkin.toISOString().split("T")[0],
        checkout: checkout.toISOString().split("T")[0]
    };
}

export default function RecommendedHotels() {
    const router = useRouter();
    const [resolvingHotel, setResolvingHotel] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const { checkin, checkout } = getNextStayDates();
    const pageSize = 3;
    const pageCount = Math.ceil(RECOMMENDED_HOTELS.length / pageSize);
    const pageStart = page * pageSize;
    const visibleHotels = RECOMMENDED_HOTELS.slice(pageStart, pageStart + pageSize);
    const canGoLeft = page > 0;
    const canGoRight = page < pageCount - 1;

    const handleHotelClick = async (hotel: RecommendedHotel) => {
        if (resolvingHotel) return;

        const fallbackQuery = `${hotel.name} ${hotel.address}`.trim();
        setResolvingHotel(hotel.name);

        try {
            const params = new URLSearchParams({
                name: hotel.name,
                address: hotel.address,
            });
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 3500);

            let res: Response;
            try {
                res = await fetch(`/api/data/hotel/resolve?${params.toString()}`, {
                    signal: controller.signal,
                });
            } finally {
                window.clearTimeout(timeoutId);
            }

            if (res.ok) {
                const payload = await res.json();
                if (payload?.hotelId) {
                    router.push(`/hotel/${payload.hotelId}?checkin=${checkin}&checkout=${checkout}&adults=2`);
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to resolve recommended hotel:", error);
        } finally {
            setResolvingHotel(null);
        }

        router.push(`/search?type=ai&mode=ai&aiQuery=${encodeURIComponent(fallbackQuery)}&checkin=${checkin}&checkout=${checkout}&adults=2`);
    };

    const handlePrev = () => {
        if (!canGoLeft) return;
        setPage((current) => Math.max(0, current - 1));
    };

    const handleNext = () => {
        if (!canGoRight) return;
        setPage((current) => Math.min(pageCount - 1, current + 1));
    };

    return (
        <section className="recommended-hotels-section" id="recommended-hotels">
            <div className="recommended-hotels-header">
                <div className="section-header section-header-tight">
                    <h2>Recommended hotels</h2>
                </div>

                <div className="recommended-hotels-nav">
                    <button
                        type="button"
                        className="recommended-hotels-nav-btn"
                        aria-label="Show previous recommended hotels"
                        onClick={handlePrev}
                        disabled={!canGoLeft}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        type="button"
                        className="recommended-hotels-nav-btn"
                        aria-label="Show more recommended hotels"
                        onClick={handleNext}
                        disabled={!canGoRight}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            <div className="recommended-hotels-track">
                {visibleHotels.map((hotel) => (
                    <article
                        key={hotel.name}
                        className="recommended-hotel-card"
                        onClick={() => void handleHotelClick(hotel)}
                        aria-busy={resolvingHotel === hotel.name}
                    >
                        <div className="recommended-hotel-image-wrap">
                            <img src={hotel.image} alt={hotel.name} loading="lazy" />
                        </div>

                        <div className="recommended-hotel-body">
                            <div className="recommended-hotel-stars" aria-label={`${hotel.stars} star hotel`}>
                                {Array.from({ length: hotel.stars }).map((_, index) => (
                                    <Star key={index} size={16} fill="currentColor" strokeWidth={1.8} />
                                ))}
                            </div>

                            <h3>{hotel.name}</h3>

                            <p className="recommended-hotel-address">
                                <MapPin size={16} />
                                <span>{hotel.address}</span>
                            </p>

                            <div className="recommended-hotel-footer">
                                <div className="recommended-hotel-review">
                                    <span className="recommended-hotel-score">{hotel.score.toFixed(1)}</span>
                                    <div>
                                        <strong>{getReviewLabel(hotel.score)}</strong>
                                        <span>{hotel.reviews.toLocaleString()} reviews</span>
                                    </div>
                                </div>

                                <div className="recommended-hotel-price">
                                    <strong>US${hotel.price.toLocaleString()}</strong>
                                    <span>1 room x 1 night incl. taxes</span>
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
