"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`nav-glass ${scrolled ? 'scrolled' : ''}`}>
            <div className="nav-content">
                <Link href="/" className="nav-logo">
                    <Image
                        src="/logo.webp"
                        alt="cheapgetaway.com logo"
                        width={420}
                        height={105}
                        className="nav-logo-img"
                        priority
                    />
                </Link>

                <div className="nav-links">
                    <a href="/#deals">Deals</a>
                    <a href="/#weekend">Weekend</a>
                    <a href="/#vibes">Vibes</a>
                    <a href="/#how-it-works">How it works</a>
                </div>

                <div className="nav-actions">
                    <Link href="/signin" className="nav-signin">Sign in</Link>
                    <button className="btn-find-deal">Find a deal</button>
                </div>
            </div>
        </nav>
    );
}
