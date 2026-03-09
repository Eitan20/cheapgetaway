"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloudRain, Sun, Cloud, ThermometerSun } from 'lucide-react';

const CITIES = [
    { name: 'Las Vegas', lat: 36.1699, lng: -115.1398, hotelIds: ["lp1a278", "lp1a7fc", "lp1a88f"] },
    { name: 'Miami', lat: 25.7617, lng: -80.1918, hotelIds: ["lp27e5a", "lp27f9", "lp26c48"] },
    { name: 'New Orleans', lat: 29.9511, lng: -90.0715, hotelIds: ["lp3b4f5", "lp3b5d2", "lp3b610"] }
];

export default function WeekendShowdown() {
    const router = useRouter();
    const [cityData, setCityData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const checkin = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]; // Weekend
    const checkout = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];

    useEffect(() => {
        async function fetchShowdownData() {
            try {
                const results = await Promise.all(CITIES.map(async (city) => {
                    // 1. Fetch Weather
                    let weather = null;
                    try {
                        const weatherRes = await fetch(`/api/data/weather?latitude=${city.lat}&longitude=${city.lng}&startDate=${checkin}&endDate=${checkout}`);
                        if (weatherRes.ok) {
                            const weatherData = await weatherRes.json();
                            // LiteAPI weather format: { weatherData: [{ detailedWeatherData: { daily: [...] } }] }
                            if (weatherData.weatherData?.[0]?.detailedWeatherData?.daily?.length > 0) {
                                weather = weatherData.weatherData[0].detailedWeatherData.daily[0];
                            }
                        } else {
                            console.error(`Weather API returned status ${weatherRes.status} for ${city.name}`);
                        }
                    } catch (e) {
                        console.error(`Weather failed for ${city.name}`, e);
                    }

                    // 2. Fetch Min Rates
                    let minPrice = null;
                    try {
                        const rateRes = await fetch('/api/min-rates', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                hotelIds: city.hotelIds,
                                checkin,
                                checkout,
                                occupancies: [{ adults: 2 }],
                                currency: 'USD',
                                guestNationality: 'US'
                            })
                        });

                        if (rateRes.ok) {
                            const contentType = rateRes.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                                const rateData = await rateRes.json();
                                if (rateData.data && rateData.data.length > 0) {
                                    // LiteAPI min-rates returns 'price' field
                                    const prices = rateData.data.map((d: any) => d.price || d.minPrice).filter((p: any) => typeof p === 'number');
                                    if (prices.length > 0) {
                                        minPrice = Math.min(...prices);
                                    }
                                }
                            } else {
                                const text = await rateRes.text();
                                console.error(`Rates API returned non-JSON response for ${city.name}:`, text.substring(0, 100));
                            }
                        } else {
                            console.error(`Rates API returned status ${rateRes.status} for ${city.name}`);
                        }
                    } catch (e) {
                        console.error(`Rates failed for ${city.name}`, e);
                    }

                    return { ...city, weather, minPrice };
                }));

                setCityData(results);
            } catch (error) {
                console.error("Showdown failed", error);
            } finally {
                setLoading(false);
            }
        }

        fetchShowdownData();
    }, []);

    const getWeatherIcon = (summary: string) => {
        if (!summary) return <Sun size={24} />;
        const s = summary.toLowerCase();
        if (s.includes('rain')) return <CloudRain size={24} />;
        if (s.includes('cloud')) return <Cloud size={24} />;
        return <Sun size={24} />;
    };

    if (loading) {
        return (
            <section className="weekend-showdown">
                <h2><ThermometerSun size={24} /> Weekend Showdown</h2>
                <div className="showdown-columns">
                    {[1, 2, 3].map(i => <div key={i} className="showdown-city skeleton"></div>)}
                </div>
            </section>
        );
    }

    return (
        <section className="weekend-showdown">
            <div className="section-header">
                <h2><ThermometerSun size={24} className="icon-sun" /> Weekend Showdown</h2>
                <p>Compare top spots for {checkin}. Weather vs. Wallet.</p>
            </div>
            <div className="showdown-columns">
                {cityData.map((city, idx) => (
                    <div
                        key={idx}
                        className="showdown-city"
                        onClick={() => router.push(`/search?type=standard&placeName=${encodeURIComponent(city.name)}&checkin=${checkin}&checkout=${checkout}&adults=2`)}
                    >
                        <h3>{city.name}</h3>

                        <div className="showdown-stats">
                            <div className="stat weather-stat">
                                {getWeatherIcon(city.weather?.summary)}
                                <div className="stat-details">
                                    <span className="temp">{city.weather?.temperature ? `${Math.round(city.weather.temperature.max)}°C` : '--'}</span>
                                    <span className="desc">{city.weather?.summary || 'Sunny'}</span>
                                </div>
                            </div>

                            <div className="stat price-stat">
                                <span className="label">Cheapest Stay</span>
                                <span className="price">{city.minPrice && city.minPrice !== Infinity ? `$${Math.round(city.minPrice)}` : '--'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
