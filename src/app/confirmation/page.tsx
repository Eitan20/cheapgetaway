"use client";

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Home } from 'lucide-react';

export default function ConfirmationPage() {
    return (
        <React.Suspense fallback={<div className="confirmation-page"><div className="loading-state"><div className="spinner"></div><p>Loading...</p></div></div>}>
            <ConfirmationContent />
        </React.Suspense>
    );
}

function ConfirmationContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const bookingId = searchParams.get('bookingId');
    const code = searchParams.get('code');

    if (!bookingId) {
        return (
            <div className="confirmation-page">
                <div className="error-state">
                    <p>No booking information found.</p>
                    <button className="btn-primary" onClick={() => router.push('/')}>Go Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="confirmation-page">
            <div className="conf-container">
                <CheckCircle size={64} color="var(--accent)" className="success-icon" />
                <h1>Booking Confirmed!</h1>
                <p className="subtitle">Pack your bags, your premium getaway is booked.</p>

                <div className="conf-details">
                    <div className="conf-item">
                        <span>Booking ID:</span>
                        <strong>{bookingId}</strong>
                    </div>
                    {code && (
                        <div className="conf-item">
                            <span>Hotel Confirmation Code:</span>
                            <strong>{code}</strong>
                        </div>
                    )}
                </div>

                <button className="btn-primary-outline home-btn" onClick={() => router.push('/')}>
                    <Home size={18} /> Back to Home
                </button>
            </div>
        </div>
    );
}
