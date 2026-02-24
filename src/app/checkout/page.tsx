"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function CheckoutPage() {
    return (
        <React.Suspense fallback={<div className="checkout-page"><div className="loading-state"><div className="spinner"></div><p>Loading...</p></div></div>}>
            <CheckoutContent />
        </React.Suspense>
    );
}

function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const offerId = searchParams.get('offerId');
    const hotelId = searchParams.get('hotelId');
    const checkin = searchParams.get('checkin');
    const checkout = searchParams.get('checkout');
    const adults = parseInt(searchParams.get('adults') || '2', 10);

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    // Booking State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1); // 1 = details, 2 = payment

    const [prebookData, setPrebookData] = useState<any>(null);

    // If we return from payment
    const returnedPrebookId = searchParams.get('prebookId');
    const returnedTransactionId = searchParams.get('transactionId');

    useEffect(() => {
        // Return from payment gateway successful
        if (returnedPrebookId && returnedTransactionId) {
            finalizeBooking(returnedPrebookId, returnedTransactionId);
        }
    }, [returnedPrebookId, returnedTransactionId]);

    const handlePrebookSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!offerId) return;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/prebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Prebooking failed');

            setPrebookData(data.data);
            setStep(2); // Move to payment step

            // We must save the current form data to localStorage since we will navigate away for payment
            localStorage.setItem('booking_guest', JSON.stringify({ firstName, lastName, email, adults }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initialize Payment SDK when step changes to 2
        if (step === 2 && prebookData) {
            const returnUrl = `${window.location.origin}/checkout?prebookId=${prebookData.prebookId}&transactionId=${prebookData.transactionId}`;

            // Inject Script
            const script = document.createElement('script');
            script.src = "https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1";
            script.async = true;
            script.onload = () => {
                const liteAPIConfig = {
                    publicKey: 'sandbox', // We are using sand_ prefix
                    secretKey: prebookData.secretKey,
                    returnUrl: returnUrl,
                    targetElement: '#payment-target',
                    appearance: { theme: 'flat' },
                    options: { business: { name: 'Cheap Getaway' } }
                };
                // @ts-ignore
                const liteAPIPayment = new LiteAPIPayment(liteAPIConfig);
                liteAPIPayment.handlePayment();
            };
            document.body.appendChild(script);
        }
    }, [step, prebookData]);

    const finalizeBooking = async (pId: string, tId: string) => {
        setLoading(true);
        setError(null);
        try {
            // Retrieve guest details
            const c = localStorage.getItem('booking_guest');
            const guest = c ? JSON.parse(c) : { firstName: 'Guest', lastName: 'User', email: 'guest@test.com', adults: 2 };

            const payload = {
                prebookId: pId,
                holder: { firstName: guest.firstName, lastName: guest.lastName, email: guest.email },
                transactionId: tId,
                guests: [{
                    occupancyNumber: 1,
                    firstName: guest.firstName,
                    lastName: guest.lastName,
                    email: guest.email
                }]
            };

            const res = await fetch('/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Booking failed');

            const conf = data.data;
            // Redirect to confirmation page
            router.push(`/confirmation?bookingId=${conf.bookingId}&code=${conf.hotelConfirmationCode}`);

        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    if (loading || returnedPrebookId) {
        return (
            <div className="checkout-page">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>{returnedPrebookId ? 'Finalizing your booking...' : 'Processing...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="checkout-container">
                <h1>Secure Checkout</h1>

                {error && <div className="error-alert">{error}</div>}

                {step === 1 && (
                    <div className="checkout-step">
                        <h2>1. Guest Details</h2>
                        <form onSubmit={handlePrebookSubmit} className="guest-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                            </div>

                            <button type="submit" className="btn-primary checkout-btn">
                                Continue to Payment
                            </button>
                        </form>
                    </div>
                )}

                {step === 2 && prebookData && (
                    <div className="checkout-step">
                        <h2>2. Payment Details</h2>
                        <div className="order-summary">
                            <h3>Order Summary</h3>
                            <div className="summary-row">
                                <span>Total Price</span>
                                <strong>${prebookData.price.toFixed(2)} {prebookData.currency}</strong>
                            </div>
                            <p className="sandbox-note">
                                Note: Sandbox environment. Use test card <strong>4242 4242 4242 4242</strong> with any future date and CVV.
                            </p>
                        </div>

                        {/* The payment SDK mounts inside this div */}
                        <div id="payment-target" className="payment-container"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
