"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpDown, ChevronDown, Globe, MapPin, Search, SlidersHorizontal, Star, User, Heart, CalendarDays, Wifi, Dumbbell, ChevronRight, PersonStanding } from 'lucide-react';
type SearchMode = 'standard' | 'ai';
type SortOption = 'recommended' | 'priceAsc' | 'priceDesc' | 'starsAsc' | 'starsDesc' | 'distanceAsc' | 'ratingDesc';

type Hotel = {
    hotelId: string;
    name: string;
    mainPhoto: string;
    address: string;
    rating: number | null;
    stars: number | null;
    reviewCount: number;
    priceTotal: number;
    priceNightly: number;
    currency: string;
    latitude: number | null;
    longitude: number | null;
    chainId: number | null;
    chainName: string;
    hotelTypeId: number | null;
    hotelTypeName: string;
    facilityIds: number[];
    facilityNames: string[];
    boardName: string;
    freeCancellation: boolean;
    distanceKm: number | null;
    matchLabel?: string;
    matchStory?: string;
};

type Filters = {
    name: string;
    maxPrice: number;
    popular: string[];
    ratings: number[];
    distances: number[];
    brands: number[];
    propertyTypes: number[];
    stars: number[];
    facilities: number[];
};

type RefOption = { id: number; label: string; count: number };
type SearchCenter = { latitude: number; longitude: number };

const DEFAULT_FILTERS: Filters = { name: '', maxPrice: 0, popular: [], ratings: [], distances: [], brands: [], propertyTypes: [], stars: [], facilities: [] };
const POPULAR_FILTERS = [
    { key: 'freeCancellation', label: 'Free cancellation' },
    { key: 'parking', label: 'Parking' },
    { key: 'breakfastIncluded', label: 'Breakfast included' },
    { key: 'swimmingPool', label: 'Swimming pool' },
    { key: 'hotels', label: 'Hotels' },
    { key: 'apartments', label: 'Apartments' },
];
const RATING_FILTERS = [{ value: 9, label: 'Wonderful: 9+' }, { value: 8, label: 'Very Good: 8+' }, { value: 7, label: 'Good: 7+' }, { value: 6, label: 'Pleasant: 6+' }];
const DISTANCE_FILTERS = [{ value: 1, label: 'Less than 1 km' }, { value: 3, label: 'Less than 3 km' }, { value: 5, label: 'Less than 5 km' }, { value: 10, label: 'Less than 10 km' }];
const STAR_FILTERS = [5, 4, 3, 2, 1];

function getRateMaps(payload: any) {
    const details = new Map<string, any>();
    const rates = new Map<string, any>();
    (Array.isArray(payload?.hotels) ? payload.hotels : []).forEach((hotel: any) => hotel?.id && details.set(hotel.id, hotel));
    (Array.isArray(payload?.data) ? payload.data : []).forEach((row: any) => row?.hotelId && rates.set(row.hotelId, row));
    return { details, rates };
}

function nightsBetween(checkin: string, checkout: string) {
    return Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000) || 1);
}

function getRateSummary(rateData: any, nights: number) {
    const rate = rateData?.roomTypes?.[0]?.rates?.[0] || {};
    const total = Number(rate?.retailRate?.total?.[0]?.amount || rateData?.rates?.[0]?.price || 0) || 0;
    return {
        total,
        nightly: total / Math.max(1, nights),
        currency: rate?.retailRate?.total?.[0]?.currency || rateData?.rates?.[0]?.currency || 'USD',
        boardName: rate?.boardName || '',
        freeCancellation: !!rate?.cancellationPolicies?.refundableTag && rate.cancellationPolicies.refundableTag !== 'NRFN',
    };
}

async function fetchJson(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
}

async function fetchRates(hotelIds: string[], checkin: string, checkout: string, adults: string) {
    return fetchJson('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelIds, checkin, checkout, occupancies: [{ adults: Number(adults) }] }),
    });
}

function uniq(values: Array<number | null | undefined>) {
    return Array.from(new Set(values.filter((value): value is number => Number.isFinite(value as number))));
}

function toggle<T>(values: T[], value: T) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function chunk(values: number[], size: number) {
    const out: number[][] = [];
    for (let index = 0; index < values.length; index += size) out.push(values.slice(index, index + size));
    return out;
}

async function fetchRefMap(url: string, ids: number[], idKey: string, labelKey: string) {
    if (!ids.length) return new Map<number, string>();
    const parts = await Promise.all(chunk(ids, 100).map((set) => fetchJson(`${url}?ids=${set.join(',')}`)));
    const map = new Map<number, string>();
    parts.forEach((payload) => {
        (Array.isArray(payload?.data) ? payload.data : []).forEach((row: any) => {
            const id = Number(row?.[idKey]);
            const label = String(row?.[labelKey] || '').trim();
            if (Number.isFinite(id) && label) map.set(id, label);
        });
    });
    return map;
}

function ratingLabel(rating: number | null) {
    if (rating === null) return 'New';
    if (rating >= 9) return 'Wonderful';
    if (rating >= 8) return 'Very Good';
    if (rating >= 7) return 'Good';
    if (rating >= 6) return 'Pleasant';
    return 'Rated';
}

function distanceLabel(value: number | null) {
    if (value === null) return '';
    return value < 1 ? `${Math.round(value * 1000)} m from center` : `${value.toFixed(1)} km from center`;
}

function hasWord(hotel: Hotel, words: string[]) {
    const haystack = `${hotel.boardName} ${hotel.facilityNames.join(' ')} ${hotel.hotelTypeName}`.toLowerCase();
    return words.some((word) => haystack.includes(word));
}

function matchesPopular(hotel: Hotel, key: string) {
    if (key === 'freeCancellation') return hotel.freeCancellation;
    if (key === 'parking') return hasWord(hotel, ['parking', 'garage', 'valet']);
    if (key === 'breakfastIncluded') return hotel.boardName.toLowerCase().includes('breakfast');
    if (key === 'swimmingPool') return hasWord(hotel, ['pool', 'swimming']);
    if (key === 'hotels') return hotel.hotelTypeName.toLowerCase().includes('hotel');
    if (key === 'apartments') return hotel.hotelTypeName.toLowerCase().includes('apartment');
    return true;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const aa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * (2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa)));
}

function buildSearchCenter(hotels: Hotel[]) {
    const points = hotels.filter((hotel) => hotel.latitude !== null && hotel.longitude !== null);
    if (!points.length) return null;
    const lats = points.map((hotel) => hotel.latitude as number);
    const lngs = points.map((hotel) => hotel.longitude as number);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
    };
}

function sortHotels(hotels: Hotel[], sortBy: SortOption) {
    const list = [...hotels];
    if (sortBy === 'priceAsc') return list.sort((a, b) => a.priceNightly - b.priceNightly);
    if (sortBy === 'priceDesc') return list.sort((a, b) => b.priceNightly - a.priceNightly);
    if (sortBy === 'starsAsc') return list.sort((a, b) => (a.stars || 0) - (b.stars || 0));
    if (sortBy === 'starsDesc') return list.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    if (sortBy === 'distanceAsc') return list.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
    if (sortBy === 'ratingDesc') return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return list;
}

export default function SearchResultsPage() {
    return (
        <Suspense fallback={<div className="search-results-page"><div className="loading-state"><div className="spinner"></div><p>Finding the best premium stays...</p></div></div>}>
            <SearchResultsContent />
        </Suspense>
    );
}

function SearchResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchParamString = searchParams.toString();
    const mode = ((searchParams.get('mode') || searchParams.get('type') || 'standard').replace('semantic', 'ai') as SearchMode);
    const placeId = searchParams.get('placeId');
    const placeName = searchParams.get('placeName');
    const aiQuery = searchParams.get('aiQuery') || searchParams.get('semanticQuery') || searchParams.get('query') || searchParams.get('aiSearch');
    const fallbackCheckin = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const fallbackCheckout = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const checkin = searchParams.get('checkin') || fallbackCheckin;
    const checkout = searchParams.get('checkout') || fallbackCheckout;
    const adults = searchParams.get('adults') || '2';
    const nights = nightsBetween(checkin, checkout);
    const maxPriceFromUrl = Number(searchParams.get('maxPrice') || 0);

    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortOption>('recommended');
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [searchCenter, setSearchCenter] = useState<SearchCenter | null>(null);
    const [showAllBrands, setShowAllBrands] = useState(false);
    const [showAllFacilities, setShowAllFacilities] = useState(false);

    useEffect(() => {
        document.body.classList.add('search-page-active');
        return () => document.body.classList.remove('search-page-active');
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadHotels() {
            setLoading(true);
            setError(null);

            try {
                let placePayload: any = null;
                if (placeId) {
                    try {
                        placePayload = await fetchJson(`/api/data/places/${encodeURIComponent(placeId)}`);
                    } catch (placeError) {
                        console.warn('Failed to load place center', placeError);
                    }
                }

                let rawHotels: Hotel[] = [];

                if (mode === 'ai' || aiQuery) {
                    const semantic = await fetchJson(`/api/data/hotels/semantic-search?query=${encodeURIComponent(aiQuery || placeName || 'romantic couples retreat')}&limit=30`);
                    const semanticHotels = Array.isArray(semantic?.data) ? semantic.data : [];
                    const hotelIds = semanticHotels.map((hotel: any) => hotel.id).filter(Boolean).slice(0, 30);
                    if (!hotelIds.length) {
                        if (!cancelled) {
                            setHotels([]);
                            setSearchCenter(null);
                        }
                        return;
                    }

                    const ratesPayload = await fetchRates(hotelIds, checkin, checkout, adults);
                    const { details, rates } = getRateMaps(ratesPayload);
                    rawHotels = semanticHotels.map((hotel: any) => {
                        const rateData = rates.get(hotel.id);
                        const hotelDetails = details.get(hotel.id) || rateData?.hotelData || {};
                        const rate = getRateSummary(rateData, nights);
                        return {
                            hotelId: hotel.id,
                            name: hotelDetails.name || hotel.name || 'Lovely Hotel',
                            mainPhoto: hotelDetails.main_photo || hotel.main_photo || '/images/hotel-fallback-search.webp',
                            address: hotelDetails.address || hotel.address || [hotelDetails.city || hotel.city, String(hotel.country || '').toUpperCase()].filter(Boolean).join(', ') || 'Great location',
                            rating: hotelDetails.rating || hotel.rating || null,
                            stars: hotelDetails.stars || hotel.stars || null,
                            reviewCount: Number(hotelDetails.reviewCount || hotel.reviewCount || 0),
                            priceTotal: rate.total,
                            priceNightly: rate.nightly,
                            currency: rate.currency,
                            latitude: hotelDetails.latitude ?? hotel.latitude ?? null,
                            longitude: hotelDetails.longitude ?? hotel.longitude ?? null,
                            chainId: Number(hotelDetails.chainId || hotel.chainId || 0) || null,
                            chainName: String(hotelDetails.chain || hotel.chain || '').trim(),
                            hotelTypeId: Number(hotelDetails.hotelTypeId || hotel.hotelTypeId || 0) || null,
                            hotelTypeName: '',
                            facilityIds: Array.isArray(hotelDetails.facilityIds || hotel.facilityIds) ? (hotelDetails.facilityIds || hotel.facilityIds).map((id: any) => Number(id)).filter(Number.isFinite) : [],
                            facilityNames: [],
                            boardName: rate.boardName,
                            freeCancellation: rate.freeCancellation,
                            distanceKm: null,
                            matchLabel: hotel.persona || hotel.style,
                            matchStory: hotel.story,
                        };
                    });
                } else if (placeId) {
                    const listPayload = await fetchJson(`/api/data/hotels?placeId=${encodeURIComponent(placeId)}&limit=60`);
                    const listedHotels = Array.isArray(listPayload?.data) ? listPayload.data : [];
                    const hotelIds = listedHotels.map((hotel: any) => hotel.id).filter(Boolean).slice(0, 60);
                    if (!hotelIds.length) {
                        if (!cancelled) {
                            setHotels([]);
                            setSearchCenter(null);
                        }
                        return;
                    }

                    const ratesPayload = await fetchRates(hotelIds, checkin, checkout, adults);
                    const { details, rates } = getRateMaps(ratesPayload);
                    rawHotels = listedHotels.map((hotel: any) => {
                        const rateData = rates.get(hotel.id);
                        const hotelDetails = details.get(hotel.id) || {};
                        const rate = getRateSummary(rateData, nights);
                        return {
                            hotelId: hotel.id,
                            name: hotelDetails.name || hotel.name || 'Lovely Hotel',
                            mainPhoto: hotelDetails.main_photo || hotel.main_photo || '/images/hotel-fallback-search.webp',
                            address: hotelDetails.address || hotel.address || [hotelDetails.city || hotel.city, String(hotel.country || '').toUpperCase()].filter(Boolean).join(', ') || 'Great location',
                            rating: hotelDetails.rating || hotel.rating || null,
                            stars: hotelDetails.stars || hotel.stars || null,
                            reviewCount: Number(hotelDetails.reviewCount || hotel.reviewCount || 0),
                            priceTotal: rate.total,
                            priceNightly: rate.nightly,
                            currency: rate.currency,
                            latitude: hotelDetails.latitude ?? hotel.latitude ?? null,
                            longitude: hotelDetails.longitude ?? hotel.longitude ?? null,
                            chainId: Number(hotelDetails.chainId || hotel.chainId || 0) || null,
                            chainName: String(hotelDetails.chain || hotel.chain || '').trim(),
                            hotelTypeId: Number(hotelDetails.hotelTypeId || hotel.hotelTypeId || 0) || null,
                            hotelTypeName: '',
                            facilityIds: Array.isArray(hotelDetails.facilityIds || hotel.facilityIds) ? (hotelDetails.facilityIds || hotel.facilityIds).map((id: any) => Number(id)).filter(Number.isFinite) : [],
                            facilityNames: [],
                            boardName: rate.boardName,
                            freeCancellation: rate.freeCancellation,
                            distanceKm: null,
                        };
                    });
                } else {
                    const fallbackPayload = await fetchJson('/api/rates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            checkin,
                            checkout,
                            occupancies: [{ adults: Number(adults) }],
                            aiSearch: placeName ? `hotels in ${placeName}` : 'top rated value hotels',
                        }),
                    });
                    const { details } = getRateMaps(fallbackPayload);
                    rawHotels = (Array.isArray(fallbackPayload?.data) ? fallbackPayload.data : []).map((rateData: any) => {
                        const hotelDetails = details.get(rateData.hotelId) || {};
                        const rate = getRateSummary(rateData, nights);
                        return {
                            hotelId: rateData.hotelId,
                            name: hotelDetails.name || 'Lovely Hotel',
                            mainPhoto: hotelDetails.main_photo || '/images/hotel-fallback-search.webp',
                            address: hotelDetails.address || 'Great location',
                            rating: hotelDetails.rating || 4.5,
                            stars: hotelDetails.stars || null,
                            reviewCount: Number(hotelDetails.reviewCount || 0),
                            priceTotal: rate.total,
                            priceNightly: rate.nightly,
                            currency: rate.currency,
                            latitude: hotelDetails.latitude ?? null,
                            longitude: hotelDetails.longitude ?? null,
                            chainId: Number(hotelDetails.chainId || 0) || null,
                            chainName: String(hotelDetails.chain || '').trim(),
                            hotelTypeId: Number(hotelDetails.hotelTypeId || 0) || null,
                            hotelTypeName: '',
                            facilityIds: Array.isArray(hotelDetails.facilityIds) ? hotelDetails.facilityIds.map((id: any) => Number(id)).filter(Number.isFinite) : [],
                            facilityNames: [],
                            boardName: rate.boardName,
                            freeCancellation: rate.freeCancellation,
                            distanceKm: null,
                        };
                    });
                }

                rawHotels = rawHotels.filter((hotel) => hotel.priceTotal > 0 && (!maxPriceFromUrl || hotel.priceNightly <= maxPriceFromUrl));

                const chainIds = uniq(rawHotels.map((hotel) => hotel.chainId));
                const propertyTypeIds = uniq(rawHotels.map((hotel) => hotel.hotelTypeId));
                const facilityCounts = new Map<number, number>();
                rawHotels.forEach((hotel) => hotel.facilityIds.forEach((id) => facilityCounts.set(id, (facilityCounts.get(id) || 0) + 1)));
                const facilityIds = Array.from(facilityCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 160).map(([id]) => id);

                const [chains, hotelTypes, facilities] = await Promise.all([
                    fetchRefMap('/api/data/chains', chainIds, 'id', 'name'),
                    fetchRefMap('/api/data/hoteltypes', propertyTypeIds, 'id', 'name'),
                    fetchRefMap('/api/data/facilities', facilityIds, 'facility_id', 'facility'),
                ]);

                const placeCenter = Number.isFinite(Number(placePayload?.data?.location?.latitude)) && Number.isFinite(Number(placePayload?.data?.location?.longitude))
                    ? {
                        latitude: Number(placePayload.data.location.latitude),
                        longitude: Number(placePayload.data.location.longitude),
                    }
                    : null;
                const nextSearchCenter = placeCenter || buildSearchCenter(rawHotels);

                const decoratedHotels = rawHotels.map((hotel) => {
                    const distanceKm = nextSearchCenter && hotel.latitude !== null && hotel.longitude !== null
                        ? haversineKm(nextSearchCenter.latitude, nextSearchCenter.longitude, Number(hotel.latitude), Number(hotel.longitude))
                        : null;
                    return {
                        ...hotel,
                        chainName: hotel.chainName || (hotel.chainId ? chains.get(hotel.chainId) || '' : ''),
                        hotelTypeName: hotel.hotelTypeId ? hotelTypes.get(hotel.hotelTypeId) || 'Property' : 'Property',
                        facilityNames: hotel.facilityIds.map((id) => facilities.get(id) || '').filter(Boolean),
                        distanceKm,
                    };
                });

                const maxPrice = Math.ceil(Math.max(...decoratedHotels.map((hotel) => hotel.priceNightly), 0));
                if (!cancelled) {
                    setHotels(decoratedHotels);
                    setSearchCenter(nextSearchCenter);
                    setFilters({ ...DEFAULT_FILTERS, maxPrice });
                    setSortBy('recommended');
                    setShowAllBrands(false);
                    setShowAllFacilities(false);
                }
            } catch (err: any) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadHotels();
        return () => {
            cancelled = true;
        };
    }, [searchParamString, adults, aiQuery, checkin, checkout, maxPriceFromUrl, mode, nights, placeId, placeName]);

    const maxNightlyPrice = Math.ceil(Math.max(...hotels.map((hotel) => hotel.priceNightly), 0));
    const filteredHotels = sortHotels(hotels.filter((hotel) => {
        if (filters.name && !hotel.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
        if (sortBy === 'recommended' && (hotel.stars ?? 0) < 4) return false;
        if (filters.maxPrice && hotel.priceNightly > filters.maxPrice) return false;
        if (filters.popular.length && !filters.popular.every((key) => matchesPopular(hotel, key))) return false;
        if (filters.ratings.length && (hotel.rating ?? 0) < Math.min(...filters.ratings)) return false;
        if (filters.distances.length && (hotel.distanceKm === null || hotel.distanceKm > Math.max(...filters.distances))) return false;
        if (filters.brands.length && !filters.brands.includes(hotel.chainId || 0)) return false;
        if (filters.propertyTypes.length && !filters.propertyTypes.includes(hotel.hotelTypeId || 0)) return false;
        if (filters.stars.length && !filters.stars.includes(hotel.stars || 0)) return false;
        if (filters.facilities.length && !filters.facilities.every((id) => hotel.facilityIds.includes(id))) return false;
        return true;
    }), sortBy);

    const brandOptions = Object.values(hotels.reduce((acc, hotel) => {
        if (!hotel.chainId || !hotel.chainName || hotel.chainName === 'Not Available') return acc;
        acc[hotel.chainId] = acc[hotel.chainId] || { id: hotel.chainId, label: hotel.chainName, count: 0 };
        acc[hotel.chainId].count += 1;
        return acc;
    }, {} as Record<number, RefOption>)).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const propertyTypeOptions = Object.values(hotels.reduce((acc, hotel) => {
        if (!hotel.hotelTypeId || !hotel.hotelTypeName) return acc;
        acc[hotel.hotelTypeId] = acc[hotel.hotelTypeId] || { id: hotel.hotelTypeId, label: hotel.hotelTypeName, count: 0 };
        acc[hotel.hotelTypeId].count += 1;
        return acc;
    }, {} as Record<number, RefOption>)).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const facilityOptions = Object.values(hotels.reduce((acc, hotel) => {
        hotel.facilityIds.forEach((id, index) => {
            const label = hotel.facilityNames[index];
            if (!label || label.length > 34) return;
            acc[id] = acc[id] || { id, label, count: 0 };
            acc[id].count += 1;
        });
        return acc;
    }, {} as Record<number, RefOption>)).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const heading = mode === 'ai' && aiQuery ? `AI matches for "${aiQuery}"` : `Hotels in ${placeName || 'your destination'}`;
    const subtitle = [checkin, `to ${checkout}`, `${adults} adult${adults === '1' ? '' : 's'}`].join(' ');
    const clearFilters = () => setFilters({ ...DEFAULT_FILTERS, maxPrice: maxNightlyPrice });

    function openHotel(hotelId: string) {
        router.push(`/hotel/${hotelId}?checkin=${checkin}&checkout=${checkout}&adults=${adults}`);
    }

    return (
        <div className="min-h-screen bg-[#f6f7fb] text-[#0b0f1f]">
            {/* 1) TOP SEARCH RAIL */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-soft-sm transition-all duration-300">
                <Link href="/" className="flex-shrink-0 transition-opacity hover:opacity-80">
                    <Image src="/logo.webp" alt="cheapgetaway.com" width={160} height={40} className="h-8 w-auto object-contain" />
                </Link>

                <div className="hidden lg:flex flex-1 max-w-3xl mx-8">
                    <div className="flex w-full items-center bg-white border border-gray-200 hover:shadow-soft-md transition-all duration-200 rounded-full pl-2 pr-1.5 py-1.5 shadow-soft-sm cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
                        <div className="flex-[1.5] px-4 text-sm font-semibold truncate text-[#0e1556] border-r border-gray-200">{placeName || aiQuery || 'Destination'}</div>
                        <div className="flex-1 px-4 text-sm font-medium truncate text-gray-600 border-r border-gray-200">
                            {checkin ? `${checkin.slice(5)} - ${checkout.slice(5)}` : 'Add dates'}
                        </div>
                        <div className="flex-1 pl-4 pr-2 flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-gray-600 truncate">{adults} Guests</span>
                            <button className="bg-[#ff6500] hover:bg-[#e65a00] text-white p-2 rounded-full transition-colors flex-shrink-0">
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 text-[#0e1556]">
                    <button className="hidden sm:flex items-center gap-1.5 text-sm font-semibold hover:text-[#38b6ff] transition-colors">
                        <Globe size={18} /> USD
                    </button>
                    <button className="flex items-center gap-2 p-1 border border-gray-200 rounded-full hover:shadow-soft-sm transition-shadow bg-white">
                        <div className="bg-gray-100 p-1.5 rounded-full"><User size={16} className="text-gray-600" /></div>
                    </button>
                </div>
            </nav>

            {loading ? (
                <div className="loading-state"><div className="spinner"></div><p>Finding the best premium stays...</p></div>
            ) : error ? (
                <div className="error-state"><p>Oops, something went wrong: {error}</p></div>
            ) : hotels.length === 0 ? (
                <div className="empty-state"><p>No hotels found for your search. Try changing the destination or AI prompt.</p></div>
            ) : (
                <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-6 pb-20 flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
                    <aside className="hidden w-full md:w-[280px] lg:w-[320px] flex-shrink-0 md:flex flex-col gap-6">
                        <div className="bg-white rounded-[24px] border border-gray-200 shadow-soft-sm overflow-hidden flex flex-col">
                            <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-2.5"><SlidersHorizontal size={20} className="text-[#0e1556]" /><h2 className="text-[#0e1556] font-bold text-lg m-0">Filters</h2></div>
                                <button type="button" className="text-sm font-semibold text-gray-500 hover:text-[#ff6500] transition-colors" onClick={clearFilters}>Clear all</button>
                            </div>

                            <div className="p-5 flex flex-col gap-7 max-h-[calc(100vh-220px)] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                <div className="flex flex-col gap-3.5">
                                    <h3 className="text-xs font-bold text-[#0e1556] uppercase tracking-wider">Property name</h3>
                                    <label className="flex items-center gap-2.5 bg-[#f6f7fb] border border-gray-200 rounded-xl px-3.5 py-3 focus-within:border-[#38b6ff] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#38b6ff]/20 transition-all">
                                        <Search size={18} className="text-gray-400" />
                                        <input className="bg-transparent border-none outline-none w-full text-sm font-medium text-[#0b0f1f] placeholder:text-gray-400 placeholder:font-normal" type="text" placeholder="e.g. Hilton" value={filters.name} onChange={(event) => setFilters((current) => ({ ...current, name: event.target.value }))} />
                                    </label>
                                </div>

                                <div className="flex flex-col gap-3.5">
                                    <div className="flex justify-between items-end">
                                        <h3 className="text-xs font-bold text-[#0e1556] uppercase tracking-wider m-0">Price (per night)</h3>
                                        <span className="text-sm font-bold text-[#38b6ff]">${filters.maxPrice || 0}</span>
                                    </div>
                                    <input className="w-full accent-[#38b6ff] h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-1" type="range" min={0} max={Math.max(1, maxNightlyPrice)} step={5} value={Math.min(filters.maxPrice || maxNightlyPrice, Math.max(1, maxNightlyPrice))} onChange={(event) => setFilters((current) => ({ ...current, maxPrice: Number(event.target.value) }))} />
                                    <div className="flex justify-between items-center text-xs font-medium text-gray-400">
                                        <span>$0</span><span>${maxNightlyPrice}+</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3.5">
                                    <h3 className="text-xs font-bold text-[#0e1556] uppercase tracking-wider">Popular filters</h3>
                                    <div className="flex flex-col gap-3">
                                        {POPULAR_FILTERS.map((item) => (
                                            <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input type="checkbox" className="peer appearance-none w-5 h-5 border-[1.5px] border-gray-300 rounded focus:ring-2 focus:ring-[#38b6ff]/30 checked:bg-[#38b6ff] checked:border-[#38b6ff] transition-all cursor-pointer bg-white group-hover:border-[#38b6ff]" checked={filters.popular.includes(item.key)} onChange={() => setFilters((current) => ({ ...current, popular: toggle(current.popular, item.key) }))} />
                                                    <svg className="absolute w-3.5 h-3.5 left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 7 6 10.5 11.5 3"></polyline></svg>
                                                </div>
                                                <span className="text-[15px] font-medium text-gray-700 group-hover:text-[#0b0f1f] transition-colors">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {!!searchCenter && (
                                    <div className="flex flex-col gap-3.5">
                                        <h3 className="text-xs font-bold text-[#0e1556] uppercase tracking-wider">Distance from center</h3>
                                        <div className="flex flex-col gap-3">
                                            {DISTANCE_FILTERS.map((item) => (
                                                <label key={item.value} className="flex items-center gap-3 cursor-pointer group">
                                                    <div className="relative flex items-center">
                                                        <input type="checkbox" className="peer appearance-none w-5 h-5 border-[1.5px] border-gray-300 rounded focus:ring-2 focus:ring-[#38b6ff]/30 checked:bg-[#38b6ff] checked:border-[#38b6ff] transition-all cursor-pointer bg-white group-hover:border-[#38b6ff]" checked={filters.distances.includes(item.value)} onChange={() => setFilters((current) => ({ ...current, distances: toggle(current.distances, item.value) }))} />
                                                        <svg className="absolute w-3.5 h-3.5 left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 7 6 10.5 11.5 3"></polyline></svg>
                                                    </div>
                                                    <span className="text-[15px] font-medium text-gray-700 group-hover:text-[#0b0f1f] transition-colors">{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3.5">
                                    <h3 className="text-xs font-bold text-[#0e1556] uppercase tracking-wider">Guest rating</h3>
                                    <div className="flex flex-col gap-3">
                                        {RATING_FILTERS.map((item) => (
                                            <label key={item.value} className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input type="checkbox" className="peer appearance-none w-5 h-5 border-[1.5px] border-gray-300 rounded focus:ring-2 focus:ring-[#38b6ff]/30 checked:bg-[#38b6ff] checked:border-[#38b6ff] transition-all cursor-pointer bg-white group-hover:border-[#38b6ff]" checked={filters.ratings.includes(item.value)} onChange={() => setFilters((current) => ({ ...current, ratings: toggle(current.ratings, item.value) }))} />
                                                    <svg className="absolute w-3.5 h-3.5 left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 7 6 10.5 11.5 3"></polyline></svg>
                                                </div>
                                                <span className="text-[15px] font-medium text-gray-700 group-hover:text-[#0b0f1f] transition-colors">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {!!brandOptions.length && (
                                    <div className="flex flex-col gap-3.5">
                                        <div className="flex items-center justify-between"><h3 className="text-xs font-bold text-[#0e1556] uppercase tracking-wider m-0">Brand</h3><button type="button" className="text-xs font-semibold text-[#38b6ff] hover:text-[#2da1e6]" onClick={() => setShowAllBrands((current) => !current)}>{showAllBrands ? 'Show less' : `Show all ${brandOptions.length}`}</button></div>
                                        <div className="flex flex-col gap-3">
                                            {(showAllBrands ? brandOptions : brandOptions.slice(0, 8)).map((item) => (
                                                <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                                                    <div className="relative flex items-center">
                                                        <input type="checkbox" className="peer appearance-none w-5 h-5 border-[1.5px] border-gray-300 rounded focus:ring-2 focus:ring-[#38b6ff]/30 checked:bg-[#38b6ff] checked:border-[#38b6ff] transition-all cursor-pointer bg-white group-hover:border-[#38b6ff]" checked={filters.brands.includes(item.id)} onChange={() => setFilters((current) => ({ ...current, brands: toggle(current.brands, item.id) }))} />
                                                        <svg className="absolute w-3.5 h-3.5 left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 7 6 10.5 11.5 3"></polyline></svg>
                                                    </div>
                                                    <span className="text-[15px] font-medium text-gray-700 group-hover:text-[#0b0f1f] transition-colors">{item.label} <span className="text-gray-400 font-normal ml-1">({item.count})</span></span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!!propertyTypeOptions.length && (
                                    <div className="flex flex-col gap-3.5">
                                        <h3 className="text-xs font-bold text-[#0e1556] uppercase tracking-wider">Property type</h3>
                                        <div className="flex flex-col gap-3">
                                            {propertyTypeOptions.slice(0, 8).map((item) => (
                                                <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                                                    <div className="relative flex items-center">
                                                        <input type="checkbox" className="peer appearance-none w-5 h-5 border-[1.5px] border-gray-300 rounded focus:ring-2 focus:ring-[#38b6ff]/30 checked:bg-[#38b6ff] checked:border-[#38b6ff] transition-all cursor-pointer bg-white group-hover:border-[#38b6ff]" checked={filters.propertyTypes.includes(item.id)} onChange={() => setFilters((current) => ({ ...current, propertyTypes: toggle(current.propertyTypes, item.id) }))} />
                                                        <svg className="absolute w-3.5 h-3.5 left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 7 6 10.5 11.5 3"></polyline></svg>
                                                    </div>
                                                    <span className="text-[15px] font-medium text-gray-700 group-hover:text-[#0b0f1f] transition-colors">{item.label} <span className="text-gray-400 font-normal ml-1">({item.count})</span></span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3.5">
                                    <h3 className="text-xs font-bold text-[#0e1556] uppercase tracking-wider">Star rating</h3>
                                    <div className="flex flex-col gap-3">
                                        {STAR_FILTERS.map((stars) => (
                                            <label key={stars} className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input type="checkbox" className="peer appearance-none w-5 h-5 border-[1.5px] border-gray-300 rounded focus:ring-2 focus:ring-[#38b6ff]/30 checked:bg-[#38b6ff] checked:border-[#38b6ff] transition-all cursor-pointer bg-white group-hover:border-[#38b6ff]" checked={filters.stars.includes(stars)} onChange={() => setFilters((current) => ({ ...current, stars: toggle(current.stars, stars) }))} />
                                                    <svg className="absolute w-3.5 h-3.5 left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 7 6 10.5 11.5 3"></polyline></svg>
                                                </div>
                                                <div className="flex items-center text-[#ffb400] gap-0.5 drop-shadow-sm">
                                                    {Array.from({ length: stars }).map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {!!facilityOptions.length && (
                                    <div className="flex flex-col gap-3.5">
                                        <div className="flex items-center justify-between"><h3 className="text-xs font-bold text-[#0e1556] uppercase tracking-wider m-0">Facilities</h3><button type="button" className="text-xs font-semibold text-[#38b6ff] hover:text-[#2da1e6]" onClick={() => setShowAllFacilities((current) => !current)}>{showAllFacilities ? 'Show less' : `Show all ${facilityOptions.length}`}</button></div>
                                        <div className="flex flex-col gap-3">
                                            {(showAllFacilities ? facilityOptions : facilityOptions.slice(0, 12)).map((item) => (
                                                <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                                                    <div className="relative flex items-center">
                                                        <input type="checkbox" className="peer appearance-none w-5 h-5 border-[1.5px] border-gray-300 rounded focus:ring-2 focus:ring-[#38b6ff]/30 checked:bg-[#38b6ff] checked:border-[#38b6ff] transition-all cursor-pointer bg-white group-hover:border-[#38b6ff]" checked={filters.facilities.includes(item.id)} onChange={() => setFilters((current) => ({ ...current, facilities: toggle(current.facilities, item.id) }))} />
                                                        <svg className="absolute w-3.5 h-3.5 left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 7 6 10.5 11.5 3"></polyline></svg>
                                                    </div>
                                                    <span className="text-[15px] font-medium text-gray-700 group-hover:text-[#0b0f1f] transition-colors">{item.label} <span className="text-gray-400 font-normal ml-1">({item.count})</span></span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    <section className="results-main">
                        <div className="results-toolbar">
                            <div className="results-toolbar-count"><strong>{filteredHotels.length}</strong><span>properties in {placeName || 'your destination'}</span></div>
                            <div className="results-toolbar-controls">
                                <label className="sort-select-wrap">
                                    <ArrowUpDown size={16} />
                                    <span>Sort by</span>
                                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                                        <option value="recommended">Our top picks</option>
                                        <option value="priceAsc">Price (low to high)</option>
                                        <option value="priceDesc">Price (high to low)</option>
                                        <option value="starsAsc">Stars (low to high)</option>
                                        <option value="starsDesc">Stars (high to low)</option>
                                        <option value="distanceAsc">Distance from center</option>
                                        <option value="ratingDesc">Rating (high to low)</option>
                                    </select>
                                    <ChevronDown size={16} />
                                </label>
                            </div>
                        </div>

                        <div className="results-content-grid">
                            <div className="results-list">
                                    {filteredHotels.length === 0 ? (
                                        <div className="empty-results-card"><p>No stays match the current filters.</p></div>
                                    ) : (
                                        filteredHotels.map((hotel) => (
                                            <article
                                                key={hotel.hotelId}
                                                className="hotel-result-card"
                                                onClick={() => openHotel(hotel.hotelId)}
                                            >
                                                <div className="hotel-result-image">
                                                    <button type="button" className="favorite-btn" onClick={(e) => e.stopPropagation()}><Heart size={18} /></button>
                                                    <img src={hotel.mainPhoto} alt={hotel.name} />
                                                </div>
                                                <div className="hotel-result-body">
                                                    <div className="hotel-result-content">
                                                        <div className="hotel-result-stars">
                                                            {Array.from({ length: hotel.stars || 0 }).map((_, index) => <Star key={index} size={14} fill="#ff7f00" color="#ff7f00" />)}
                                                        </div>
                                                        <div className="hotel-result-header">
                                                            <div className="flex-1">
                                                                <h3>{hotel.name}</h3>
                                                                <div className="flex flex-col gap-1 mt-1 text-sm text-gray-500">
                                                                    <p className="flex items-center gap-1.5"><MapPin size={14} className="text-gray-400" /><span>{hotel.address}</span></p>
                                                                    {hotel.distanceKm !== null && <p className="flex items-center gap-1.5"><PersonStanding size={14} className="text-gray-400" /><span>{distanceLabel(hotel.distanceKm)} from center</span></p>}
                                                                    <p className="flex items-center gap-1.5 font-medium mt-1 text-[#0b8f57]"><CalendarDays size={14} /><span>Free cancellation</span></p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="hotel-amenity-pill"><Wifi size={13} className="text-gray-500" /> WiFi available</span>
                                                            <span className="hotel-amenity-pill"><Dumbbell size={13} className="text-gray-500" /> Fitness Center</span>
                                                        </div>
                                                    </div>
                                                    <div className="hotel-result-right-col">
                                                        <div className="hotel-score-badge">
                                                            <div>
                                                                <strong>{ratingLabel(hotel.rating)}</strong>
                                                                <span>{hotel.reviewCount ? `${hotel.reviewCount} reviews` : 'Fresh listing'}</span>
                                                            </div>
                                                            <em>{hotel.rating ? hotel.rating.toFixed(1) : 'New'}</em>
                                                        </div>
                                                        <div className="hotel-result-price">
                                                            <span className="discount-pill">8% off</span>
                                                            <p className="hotel-result-rate flex items-baseline gap-1">
                                                                <span className="font-bold text-2xl tracking-tight text-gray-900">US${hotel.priceNightly.toFixed(0)}</span>
                                                                <span className="text-sm font-normal text-gray-500">/ night</span>
                                                            </p>
                                                            <p className="hotel-result-total text-xs text-gray-500 mb-2 whitespace-nowrap">
                                                                1 night, 1 room, incl. taxes & fees
                                                            </p>
                                                            <button type="button" className="btn-primary hotel-cta" onClick={(event) => { event.stopPropagation(); openHotel(hotel.hotelId); }}>
                                                                See availability <ChevronRight size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        ))
                                    )}
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
