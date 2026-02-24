"use client";

import React from 'react';
import SearchForm from './SearchForm';

export default function Hero() {
    return (
        <section className="hero-section">
            <div className="hero-bg-overlay"></div>
            <div className="hero-content">
                <h1>Cheap getaways, seriously good stays.</h1>
                <p>Hotels with real-time prices. Book in minutes. Leave tomorrow.</p>
                <SearchForm />
            </div>
        </section>
    );
}
