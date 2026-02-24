import Hero from '@/components/Hero';
import WeekendDeals from '@/components/WeekendDeals';
import FeaturedCollections from '@/components/FeaturedCollections';
import TopDealsGrid from '@/components/TopDealsGrid';
import VibeSearchModule from '@/components/VibeSearchModule';
import ValueProps from '@/components/ValueProps';
import HowItWorks from '@/components/HowItWorks';

export default function HomePage() {
    return (
        <main>
            <Hero />

            <div className="home-container">
                <WeekendDeals />
                <FeaturedCollections />
                <TopDealsGrid />
                <VibeSearchModule />
                <ValueProps />
                <HowItWorks />
            </div>
        </main>
    );
}
