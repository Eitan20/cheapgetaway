"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Users, Navigation2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

type SearchMode = 'standard' | 'ai';

export default function SearchForm() {
    const router = useRouter();
    const [mode, setMode] = useState<SearchMode>('standard');
    const [searchQuery, setSearchQuery] = useState('');
    const [aiQuery, setAiQuery] = useState('');

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
    const checkinRef = useRef<HTMLInputElement>(null);
    const checkoutRef = useRef<HTMLInputElement>(null);

    const openDatePicker = (inputRef: React.RefObject<HTMLInputElement | null>) => {
        const input = inputRef.current;
        if (!input) return;

        input.focus({ preventScroll: true });
        if (typeof input.showPicker === 'function') {
            try {
                input.showPicker();
            } catch {
                // Some browsers block showPicker() without a direct user gesture.
            }
        }
    };

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
        if (mode !== 'standard') return;

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

        const query = new URLSearchParams({
            checkin,
            checkout,
            adults: adults.toString(),
            mode,
        });

        if (mode === 'standard') {
            if (!placeId && !searchQuery.trim()) return;
            query.append('type', 'standard');

            if (placeId) {
                query.append('placeId', placeId);
            }
            if (searchQuery.trim()) {
                query.append('placeName', searchQuery.trim());
            }
        } else if (mode === 'ai') {
            if (!aiQuery.trim()) return;
            query.append('type', 'ai');
            query.append('aiQuery', aiQuery.trim());
        }

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
        const query = new URLSearchParams({
            checkin,
            checkout,
            adults: adults.toString(),
            mode,
            maxPrice: '120'
        });

        if (mode === 'standard') {
            if (!placeId && !searchQuery.trim()) return;
            query.append('type', 'standard');
            if (placeId) query.append('placeId', placeId);
            if (searchQuery.trim()) query.append('placeName', searchQuery.trim());
        } else if (mode === 'ai') {
            if (!aiQuery.trim()) return;
            query.append('type', 'ai');
            query.append('aiQuery', aiQuery.trim());
        }

        router.push(`/search?${query.toString()}`);
    };

    return (
        <div className="search-module">
            <div className="search-mode-switch" role="tablist" aria-label="Search mode">
                <button
                    type="button"
                    className={`search-mode-chip ${mode === 'standard' ? 'active' : ''}`}
                    onClick={() => setMode('standard')}
                >
                    <Search size={16} /> Hotels
                </button>
                <button
                    type="button"
                    className={`search-mode-chip ${mode === 'ai' ? 'active' : ''}`}
                    onClick={() => setMode('ai')}
                >
                    <Sparkles size={16} /> AI Search
                </button>
            </div>

            <form className="search-pill-cluster" onSubmit={handleSearchSubmit}>
                <div className="search-inputs-row">
                    {mode === 'standard' ? (
                        <div className="input-group location-input" ref={dropdownRef}>
                            <label>Destination</label>
                            <div className="input-wrapper">
                                <Search size={20} className="icon-subtle" />
                                <input
                                    type="text"
                                    placeholder="City or airport"
                                    value={searchQuery}
                                    onChange={(e) => handlePlacesSearch(e.target.value)}
                                    required
                                />
                            </div>
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
                    ) : (
                        <div className="input-group location-input search-mode-wide">
                            <label>AI search</label>
                            <div className="input-wrapper">
                                <Sparkles size={20} className="icon-subtle" />
                                <input
                                    type="text"
                                    placeholder="Romantic getaway with spa and late checkout"
                                    value={aiQuery}
                                    onChange={(e) => setAiQuery(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div className="divider-vert"></div>

                    <div className="input-group dates-input">
                        <label>Dates</label>
                        <div
                            className="dates-wrapper"
                            onClick={(e) => {
                                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                                    openDatePicker(checkinRef);
                                }
                            }}
                        >
                            <Calendar size={20} className="icon-subtle" />
                            <input
                                type="date"
                                value={checkin}
                                onChange={(e) => setCheckin(e.target.value)}
                                onClick={() => openDatePicker(checkinRef)}
                                ref={checkinRef}
                                required
                            />
                            <span className="date-separator">-</span>
                            <input
                                type="date"
                                value={checkout}
                                onChange={(e) => setCheckout(e.target.value)}
                                onClick={() => openDatePicker(checkoutRef)}
                                ref={checkoutRef}
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
                                    <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="divider-vert"></div>

                    <div className="search-submit-row">
                        <button type="submit" className="btn-search-submit">
                            Search
                        </button>
                    </div>
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
