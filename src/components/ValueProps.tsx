"use client";

import React from 'react';
import { Clock, ShieldCheck, CreditCard } from 'lucide-react';

export default function ValueProps() {
    return (
        <section className="value-props-section" id="trust">
            <div className="value-grid">
                <div className="value-item">
                    <div className="value-icon"><Clock size={32} /></div>
                    <h3>Real-time Pricing</h3>
                    <p>Live rates direct from global suppliers.</p>
                </div>
                <div className="value-item">
                    <div className="value-icon"><ShieldCheck size={32} /></div>
                    <h3>Instant Confirmation</h3>
                    <p>No waiting around. Guaranteed rooms.</p>
                </div>
                <div className="value-item">
                    <div className="value-icon"><CreditCard size={32} /></div>
                    <h3>Zero Hidden Fees</h3>
                    <p>What you see is exactly what you pay.</p>
                </div>
            </div>
        </section>
    );
}
