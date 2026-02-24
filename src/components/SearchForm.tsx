"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Calendar, Users, Navigation2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SearchForm() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    // Standard Search State
    const [placeId, setPlaceId] = useState('');
    const [places, setPlaces] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Shared Form State
    const [checkin, setCheckin] = useState(
        new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
    );
    const [checkout, setCheckout] = useState(
        new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] // 3 days from now
    );
    const [adults, setAdults] = useState(2);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const handlePlacesSearch = async (query: string) => {
        setSearchQuery(query);
        setPlaceId('');
        if (query.length < 3) {
            setPlaces([]);
            setShowDropdown(false);
            return;
        }

        try {
            const res = await fetch(`/api/places?textQuery=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setPlaces(data.data || []);
                setShowDropdown(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectPlace = (place: any) => {
        setSearchQuery(place.displayName);
        setPlaceId(place.placeId);
        setShowDropdown(false);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!placeId && !searchQuery) return; // Need a location

        const query = new URLSearchParams({
            checkin,
            checkout,
            adults: adults.toString(),
            type: 'standard',
        });

        if (placeId) {
            query.append('placeId', placeId);
        }
        query.append('placeName', searchQuery);

        router.push(`/search?${query.toString()}`);
    };

    // Quick Chips Handlers
    const setThisWeekend = () => {
        const today = new Date();
        const friday = new Date(today);
        friday.setDate(today.getDate() + (5 - today.getDay() + 7) % 7);
        const sunday = new Date(friday);
        sunday.setDate(friday.getDate() + 2);

        setCheckin(friday.toISOString().split('T')[0]);
        setCheckout(sunday.toISOString().split('T')[0]);
    };

    const setUnder120 = () => {
        // We'll pass this as a query param later or just visually select it.
        // For now, it's a visual toggle that would append to the search URL.
        const query = new URLSearchParams({
            checkin,
            checkout,
            adults: adults.toString(),
            type: 'standard',
            maxPrice: '120'
        });
        if (placeId) query.append('placeId', placeId);
        query.append('placeName', searchQuery);
        router.push(`/search?${query.toString()}`);
    };

    return (
        <div className="search-module">
            <form className="search-pill-cluster" onSubmit={handleSearchSubmit}>
                <div className="search-inputs-row">
                    <div className="input-group location-input" ref={dropdownRef}>
                        <label>Where to?</label>
                        <div className="input-wrapper">
                            <Search size={20} className="icon-subtle" />
                            <input
                                type="text"
                                placeholder="City, airport, or region..."
                                value={searchQuery}
                                onChange={(e) => handlePlacesSearch(e.target.value)}
                                required
                            />
                        </div>
                        {/* Auto-complete Dropdown */}
                        {showDropdown && places.length > 0 && (
                            <ul className="places-dropdown">
                                {places.map((place) => (
                                    <li key={place.placeId} onClick={() => handleSelectPlace(place)}>
                                        <Navigation2 size={16} className="icon-subtle" />
                                        <span>{place.displayName}</span>
                                        <small className="text-muted">{place.formattedAddress}</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="divider-vert"></div>

                    <div className="input-group dates-input">
                        <label>Dates</label>
                        <div className="dates-wrapper">
                            <Calendar size={20} className="icon-subtle" />
                            <input
                                type="date"
                                value={checkin}
                                onChange={(e) => setCheckin(e.target.value)}
                                required
                            />
                            <span className="date-separator">-</span>
                            <input
                                type="date"
                                value={checkout}
                                onChange={(e) => setCheckout(e.target.value)}
                                min={checkin}
                                required
                            />
                        </div>
                    </div>

                    <div className="divider-vert"></div>

                    <div className="input-group guests-input">
                        <label>Guests</label>
                        <div className="input-wrapper">
                            <Users size={20} className="icon-subtle" />
                            <select value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
                                {[1, 2, 3, 4, 5, 6].map(num => (
                                    <option key={num} value={num}>{num} {num === 1 ? 'Adult' : 'Adults'}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="btn-search-submit">
                        Search hotels
                    </button>
                </div>
            </form>

            <div className="quick-chips">
                <button type="button" className="chip" onClick={setThisWeekend}>
                    This weekend
                </button>
                <button type="button" className="chip" onClick={setUnder120}>
                    Under $120/night
                </button>
            </div>
        </div>
    );
}

