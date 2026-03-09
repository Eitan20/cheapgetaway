import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: 'Cheap Getaway | Premium Travel',
    description: 'Book extraordinary hotels worldwide built with LiteAPI',
    icons: {
        icon: '/images/favicon-cheap-getaway.png',
        shortcut: '/images/favicon-cheap-getaway.png',
        apple: '/images/favicon-cheap-getaway.png',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <Navbar />
                {children}
                <Footer />
            </body>
        </html>
    );
}
