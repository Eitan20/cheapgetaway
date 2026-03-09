"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const useSolidNav = pathname !== '/' || scrolled;

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 900) {
                setMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <nav className={`nav-glass ${useSolidNav ? 'scrolled' : ''}`}>
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

                <button
                    type="button"
                    className="nav-menu-toggle"
                    aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    {menuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <div className={`nav-mobile-panel ${menuOpen ? 'open' : ''}`}>
                    <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
                        <a href="/#deals" onClick={() => setMenuOpen(false)}>Deals</a>
                        <a href="/#weekend" onClick={() => setMenuOpen(false)}>Weekend</a>
                        <a href="/#find-your-vibe" onClick={() => setMenuOpen(false)}>Vibes</a>
                    </div>

                    <div className={`nav-actions ${menuOpen ? 'open' : ''}`}>
                        <Link href="/signin" className="nav-signin" onClick={() => setMenuOpen(false)}>Sign in</Link>
                        <button className="btn-find-deal" onClick={() => setMenuOpen(false)}>Find a deal</button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
