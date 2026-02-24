import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="footer-site">
            <div className="footer-content">
                <div className="footer-brand">
                    <Link href="/" className="footer-logo-link" aria-label="cheapgetaway.com home">
                        <Image
                            src="/logo.webp"
                            alt="cheapgetaway.com logo"
                            width={420}
                            height={105}
                            className="footer-logo-img"
                        />
                    </Link>
                    <p>Seriously good stays, zero hassle.</p>
                </div>
                <div className="footer-links-group">
                    <h4>Company</h4>
                    <Link href="/about">About us</Link>
                    <Link href="/contact">Contact</Link>
                </div>
                <div className="footer-links-group">
                    <h4>Legal</h4>
                    <Link href="/terms">Terms of Service</Link>
                    <Link href="/privacy">Privacy Policy</Link>
                </div>
                <div className="footer-links-group">
                    <h4>Destinations</h4>
                    <Link href="/search?aiSearch=top+deals">Top Deals</Link>
                    <Link href="/search?aiSearch=beach+resorts">Beach Resorts</Link>
                </div>
            </div>
            <div className="footer-copyright">
                <p>&copy; {new Date().getFullYear()} cheapgetaway.com. All rights reserved.</p>
            </div>
        </footer>
    );
}
