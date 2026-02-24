"use client";

import React, { useEffect, useState, use, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import HorizontalScrollArrows from '@/components/HorizontalScrollArrows';
import {
    Star, MapPin, Check, ChevronRight, ChevronLeft, Clock, Info,
    Wifi, Car, Dumbbell, Coffee, Shield, Users, Bed, Maximize,
    X, ChevronDown, ChevronUp, ArrowLeft, Image as ImageIcon
} from 'lucide-react';

export default function HotelDetailsPage({ params }: { params: Promise<{ hotelId: string }> }) {
    return (
        <React.Suspense fallback={<div className="hotel-details-page"><div className="loading-state"><div className="spinner"></div><p>Loading hotel details...</p></div></div>}>
            <HotelDetailsContent params={params} />
        </React.Suspense>
    );
}

// ---------- Image Gallery Component ----------
function ImageGallery({ images }: { images: any[] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const thumbRef = useRef<HTMLDivElement>(null);

    if (!images || images.length === 0) return null;

    const next = () => setActiveIndex((prev) => (prev + 1) % images.length);
    const prev = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length);

    return (
        <>
            {/* Main Gallery Grid */}
            <div className="hd-gallery">
                <div className="hd-gallery-main" onClick={() => setLightboxOpen(true)}>
                    <img src={images[0]?.urlHd || images[0]?.url} alt={images[0]?.caption || 'Hotel'} />
                    <div className="hd-gallery-overlay">
                        <ImageIcon size={20} />
                        <span>{images.length} photos</span>
                    </div>
                </div>
                <div className="hd-gallery-side">
                    {images.slice(1, 5).map((img, i) => (
                        <div key={i} className="hd-gallery-thumb" onClick={() => { setActiveIndex(i + 1); setLightboxOpen(true); }}>
                            <img src={img.url} alt={img.caption || `Photo ${i + 2}`} />
                            {i === 3 && images.length > 5 && (
                                <div className="hd-gallery-more">+{images.length - 5}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
                <div className="hd-lightbox" onClick={() => setLightboxOpen(false)}>
                    <div className="hd-lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <button className="hd-lightbox-close" onClick={() => setLightboxOpen(false)}><X size={24} /></button>
                        <button className="hd-lightbox-nav hd-lightbox-prev" onClick={prev}><ChevronLeft size={28} /></button>
                        <img src={images[activeIndex]?.urlHd || images[activeIndex]?.url} alt={images[activeIndex]?.caption || ''} />
                        <button className="hd-lightbox-nav hd-lightbox-next" onClick={next}><ChevronRight size={28} /></button>
                        <div className="hd-lightbox-caption">
                            <span>{images[activeIndex]?.caption}</span>
                            <span className="hd-lightbox-count">{activeIndex + 1} / {images.length}</span>
                        </div>
                    </div>
                    {/* Thumbnail strip */}
                    <div className="hd-lightbox-thumbstrip-wrap">
                        <div className="hd-lightbox-thumbstrip" ref={thumbRef}>
                            {images.map((img, i) => (
                                <div
                                    key={i}
                                    className={`hd-lightbox-thumb ${i === activeIndex ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                                >
                                    <img src={img.url} alt={img.caption || ''} />
                                </div>
                            ))}
                        </div>
                        <HorizontalScrollArrows targetRef={thumbRef} variant="light" stepPx={240} />
                    </div>
                </div>
            )}
        </>
    );
}

// ---------- Star Rating Display ----------
function StarRating({ rating }: { rating: number }) {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    for (let i = 0; i < fullStars; i++) {
        stars.push(<Star key={i} size={18} fill="#eab308" color="#eab308" />);
    }
    if (hasHalf) {
        stars.push(<Star key="half" size={18} fill="#eab308" color="#eab308" style={{ opacity: 0.5 }} />);
    }
    for (let i = stars.length; i < 5; i++) {
        stars.push(<Star key={`empty-${i}`} size={18} color="#d2d2d7" />);
    }
    return <div className="hd-stars">{stars}</div>;
}

// ---------- Facility Icon Mapper ----------
function getFacilityIcon(name: string) {
    const lower = name.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi size={16} />;
    if (lower.includes('parking') || lower.includes('garage')) return <Car size={16} />;
    if (lower.includes('fitness') || lower.includes('gym')) return <Dumbbell size={16} />;
    if (lower.includes('breakfast') || lower.includes('dining') || lower.includes('restaurant')) return <Coffee size={16} />;
    if (lower.includes('security') || lower.includes('safety') || lower.includes('cctv')) return <Shield size={16} />;
    if (lower.includes('family') || lower.includes('pet')) return <Users size={16} />;
    return <Check size={16} />;
}

// ---------- Room Card Component ----------
function RoomCard({ room }: { room: any }) {
    const [expanded, setExpanded] = useState(false);
    const [photoIndex, setPhotoIndex] = useState(0);

    const photos = room.photos || [];
    const amenities = room.roomAmenities || [];
    const beds = room.bedTypes || [];

    return (
        <div className="hd-room-card">
            {/* Room Image */}
            <div className="hd-room-photo">
                {photos.length > 0 ? (
                    <>
                        <img src={photos[photoIndex]?.url} alt={room.roomName} />
                        {photos.length > 1 && (
                            <div className="hd-room-photo-nav">
                                <button onClick={() => setPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)}><ChevronLeft size={16} /></button>
                                <span>{photoIndex + 1}/{photos.length}</span>
                                <button onClick={() => setPhotoIndex((prev) => (prev + 1) % photos.length)}><ChevronRight size={16} /></button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="hd-room-photo-placeholder">
                        <ImageIcon size={32} />
                    </div>
                )}
            </div>

            {/* Room Info */}
            <div className="hd-room-details">
                <h3>{room.roomName}</h3>

                <div className="hd-room-meta">
                    {room.roomSizeSquare && (
                        <span className="hd-room-tag">
                            <Maximize size={14} />
                            {room.roomSizeSquare} {room.roomSizeUnit || 'sqm'}
                        </span>
                    )}
                    {beds.map((bed: any, i: number) => (
                        <span key={i} className="hd-room-tag">
                            <Bed size={14} />
                            {bed.quantity}× {bed.bedType}
                        </span>
                    ))}
                    {room.maxAdults && (
                        <span className="hd-room-tag">
                            <Users size={14} />
                            Max {room.maxAdults} adults
                        </span>
                    )}
                </div>

                {room.description && (
                    <p className="hd-room-desc">{room.description}</p>
                )}

                {/* Expandable amenities */}
                {amenities.length > 0 && (
                    <div className="hd-room-amenities-section">
                        <button className="hd-room-amenities-toggle" onClick={() => setExpanded(!expanded)}>
                            {expanded ? 'Hide' : 'Show'} amenities ({amenities.length})
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {expanded && (
                            <div className="hd-room-amenities-grid">
                                {amenities.map((a: any, i: number) => (
                                    <span key={i} className="hd-room-amenity">{getFacilityIcon(a.name)} {a.name}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------- Main Content ----------
function HotelDetailsContent({ params }: { params: Promise<{ hotelId: string }> }) {
    const resolvedParams = use(params);
    const searchParams = useSearchParams();
    const router = useRouter();

    const hotelId = resolvedParams.hotelId;
    const checkin = searchParams.get('checkin');
    const checkout = searchParams.get('checkout');
    const adults = searchParams.get('adults') || '2';

    const [hotel, setHotel] = useState<any>(null);
    const [rates, setRates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showImportantInfo, setShowImportantInfo] = useState(false);
    const roomsScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const hotelRes = await fetch(`/api/hotel?hotelId=${hotelId}`);
                if (!hotelRes.ok) throw new Error('Failed to fetch hotel details');
                const hotelData = await hotelRes.json();
                setHotel(hotelData.data || hotelData);

                if (checkin && checkout) {
                    const ratesRes = await fetch('/api/rates', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            hotelIds: [hotelId],
                            checkin,
                            checkout,
                            occupancies: [{ adults: Number(adults) }],
                            includeHotelData: false,
                            roomMapping: true
                        })
                    });
                    if (ratesRes.ok) {
                        const ratesData = await ratesRes.json();
                        const rawRates = ratesData.data?.[0]?.roomTypes || [];
                        let validRates: any[] = [];
                        rawRates.forEach((rt: any) => {
                            if (rt.rates && rt.rates.length > 0) {
                                rt.rates.forEach((r: any) => {
                                    validRates.push({ ...r, offerId: rt.offerId });
                                });
                            }
                        });
                        setRates(validRates);
                    }
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        if (hotelId) fetchData();
    }, [hotelId, checkin, checkout, adults]);

    const handlePrebook = (offerId: string) => {
        router.push(`/checkout?offerId=${offerId}&hotelId=${hotelId}&checkin=${checkin}&checkout=${checkout}&adults=${adults}`);
    };

    if (loading) return (
        <div className="hotel-details-page">
            <div className="loading-state"><div className="spinner"></div><p>Loading hotel details...</p></div>
        </div>
    );
    if (error) return <div className="hotel-details-page"><div className="error-state">Error: {error}</div></div>;
    if (!hotel) return <div className="hotel-details-page"><div className="empty-state">Hotel not found.</div></div>;

    const hotelPhotos = hotel.hotelImages || (hotel.main_photo ? [{ url: hotel.main_photo }] : []);
    const facilities = hotel.hotelFacilities || [];
    const rooms = hotel.rooms || [];
    const checkinInfo = hotel.checkinCheckoutTimes;
    const importantInfo = hotel.hotelImportantInformation;

    // Group rates by mappedRoomId
    const groupedRates = rates.reduce((acc: any, rate: any) => {
        const roomId = rate.mappedRoomId || 'unknown';
        if (!acc[roomId]) acc[roomId] = [];
        acc[roomId].push(rate);
        return acc;
    }, {});

    // Core amenities to highlight (max 6)
    const coreAmenities = facilities.filter((f: string) => {
        const l = f.toLowerCase();
        return l.includes('wifi') || l.includes('internet') || l.includes('parking') || l.includes('fitness') ||
            l.includes('air conditioning') || l.includes('pet') || l.includes('elevator') || l.includes('pool') ||
            l.includes('breakfast') || l.includes('restaurant') || l.includes('spa');
    }).slice(0, 6);

    return (
        <div className="hotel-details-page">
            {/* Back button */}
            <button className="hd-back-btn" onClick={() => router.back()}>
                <ArrowLeft size={18} /> Back to results
            </button>

            {/* Image Gallery */}
            <ImageGallery images={hotelPhotos} />

            {/* Hotel Header */}
            <div className="hd-header">
                <div className="hd-header-left">
                    <div className="hd-title-row">
                        <h1>{hotel.name}</h1>
                        {hotel.starRating && <StarRating rating={hotel.starRating} />}
                    </div>
                    <p className="hd-location">
                        <MapPin size={16} />
                        {hotel.address}{hotel.city ? `, ${hotel.city}` : ''}{hotel.country ? `, ${hotel.country.toUpperCase()}` : ''}
                        {hotel.zip ? ` ${hotel.zip}` : ''}
                    </p>
                </div>
                {hotel.rating && (
                    <div className="hd-rating-badge">
                        <span className="hd-rating-score">{hotel.rating}</span>
                        <span className="hd-rating-label">Guest Rating</span>
                    </div>
                )}
            </div>

            {/* Quick Info Cards */}
            <div className="hd-quick-info">
                {checkinInfo && (
                    <div className="hd-info-card">
                        <div className="hd-info-icon"><Clock size={20} /></div>
                        <div>
                            <strong>Check-in</strong>
                            <span>{checkinInfo.checkin_start || 'N/A'}{checkinInfo.checkin_end ? ` – ${checkinInfo.checkin_end}` : ''}</span>
                        </div>
                    </div>
                )}
                {checkinInfo && (
                    <div className="hd-info-card">
                        <div className="hd-info-icon"><Clock size={20} /></div>
                        <div>
                            <strong>Check-out</strong>
                            <span>By {checkinInfo.checkout || 'N/A'}</span>
                        </div>
                    </div>
                )}
                {coreAmenities.slice(0, 4).map((fac: string, i: number) => (
                    <div key={i} className="hd-info-card">
                        <div className="hd-info-icon">{getFacilityIcon(fac)}</div>
                        <div>
                            <strong>{fac}</strong>
                            <span>Available</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Two-Column Layout */}
            <div className="hd-body">
                {/* Left Column - Description & Amenities */}
                <div className="hd-main-col">
                    {/* About */}
                    <div className="hd-section-card">
                        <h2>About this hotel</h2>
                        <div className="hd-description" dangerouslySetInnerHTML={{ __html: hotel.hotelDescription || 'A premium stay awaits you.' }} />
                    </div>

                    {/* All Amenities */}
                    {facilities.length > 0 && (
                        <div className="hd-section-card">
                            <h2>Amenities & Facilities</h2>
                            <div className="hd-amenities-grid">
                                {facilities.slice(0, 16).map((fac: string, i: number) => (
                                    <div key={i} className="hd-amenity-item">
                                        {getFacilityIcon(fac)}
                                        <span>{fac}</span>
                                    </div>
                                ))}
                            </div>
                            {facilities.length > 16 && (
                                <p className="hd-more-amenities">+{facilities.length - 16} more amenities</p>
                            )}
                        </div>
                    )}

                    {/* Important Info */}
                    {importantInfo && (
                        <div className="hd-section-card hd-important">
                            <button className="hd-important-toggle" onClick={() => setShowImportantInfo(!showImportantInfo)}>
                                <div className="hd-important-left">
                                    <Info size={18} />
                                    <h3>Important Information</h3>
                                </div>
                                {showImportantInfo ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            {showImportantInfo && (
                                <div className="hd-important-content">
                                    <p>{importantInfo}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column - Rates */}
                <div className="hd-rates-col">
                    <h2>Available Rooms</h2>
                    {!checkin || !checkout ? (
                        <div className="hd-no-dates-card">
                            <Info size={24} />
                            <p>Select dates to see available rooms and prices.</p>
                        </div>
                    ) : Object.keys(groupedRates).length === 0 && rates.length === 0 ? (
                        <div className="hd-no-dates-card">
                            <p>No rooms available for the selected dates.</p>
                        </div>
                    ) : (
                        Object.keys(groupedRates).map(roomId => {
                            const roomRates = groupedRates[roomId];
                            const roomDetail = rooms.find((r: any) => r.id === Number(roomId));
                            const roomName = roomDetail?.roomName || roomRates[0].name || 'Standard Room';

                            return (
                                <div key={roomId} className="hd-rate-group">
                                    {/* Room detail card if found */}
                                    {roomDetail && <RoomCard room={roomDetail} />}
                                    {!roomDetail && (
                                        <div className="hd-rate-group-header">
                                            <h3>{roomName}</h3>
                                        </div>
                                    )}

                                    {/* Rate options */}
                                    <div className="hd-rate-options">
                                        {roomRates.map((rate: any, i: number) => (
                                            <div key={i} className="hd-rate-option">
                                                <div className="hd-rate-option-left">
                                                    <h4>{rate.boardName || 'Room Only'}</h4>
                                                    <div className="hd-rate-tags">
                                                        <span className={`refund-tag ${rate.cancellationPolicies?.refundableTag === 'RFN' ? 'rfn' : 'nrfn'}`}>
                                                            {rate.cancellationPolicies?.refundableTag === 'RFN' ? 'Free cancellation' : 'Non-refundable'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="hd-rate-option-right">
                                                    <div className="hd-rate-price">
                                                        <strong>${rate.retailRate?.total?.[0]?.amount?.toFixed(2)}</strong>
                                                        <small>total incl. taxes</small>
                                                    </div>
                                                    <button className="btn-primary hd-reserve-btn" onClick={() => handlePrebook(rate.offerId)}>
                                                        Reserve <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Room Showcase - Full Width Section Below */}
            {rooms.length > 0 && (
                <div className="hd-rooms-showcase">
                    <h2>Room Types at {hotel.name}</h2>
                    <div className="hd-rooms-scroll-wrap">
                        <div className="hd-rooms-scroll" ref={roomsScrollRef}>
                            {rooms.map((room: any, i: number) => (
                                <RoomCard key={i} room={room} />
                            ))}
                        </div>
                        <HorizontalScrollArrows targetRef={roomsScrollRef} />
                    </div>
                </div>
            )}
        </div>
    );
}
