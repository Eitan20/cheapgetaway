import React from 'react';

export default function HowItWorks() {
    return (
        <section className="how-it-works-section" id="how-it-works">
            <div className="section-header text-center">
                <h2>How it works.</h2>
                <p>Booking your next getaway is seriously simple.</p>
            </div>

            <div className="steps-grid">
                <div className="step-item">
                    <div className="step-number">1</div>
                    <h3>Search</h3>
                    <p>Tell us where and when, or let our AI find the perfect vibe for you.</p>
                </div>
                <div className="step-item">
                    <div className="step-number">2</div>
                    <h3>Select</h3>
                    <p>Pick from real-time rates at world-class hotels.</p>
                </div>
                <div className="step-item">
                    <div className="step-number">3</div>
                    <h3>Stay</h3>
                    <p>Book instantly and pack your bags.</p>
                </div>
            </div>
        </section>
    );
}
