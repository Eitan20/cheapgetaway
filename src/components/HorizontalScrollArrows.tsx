"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type HorizontalScrollArrowsProps = {
    targetRef: React.RefObject<HTMLElement | null>;
    variant?: "default" | "light";
    stepPx?: number;
    className?: string;
};

export default function HorizontalScrollArrows({
    targetRef,
    variant = "default",
    stepPx,
    className = ""
}: HorizontalScrollArrowsProps) {
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const target = targetRef.current;
        if (!target) return;

        const updateState = () => {
            const maxScrollLeft = target.scrollWidth - target.clientWidth;
            setCanScrollLeft(target.scrollLeft > 4);
            setCanScrollRight(maxScrollLeft - target.scrollLeft > 4);
        };

        updateState();
        const raf = window.requestAnimationFrame(updateState);
        target.addEventListener("scroll", updateState, { passive: true });
        window.addEventListener("resize", updateState);

        const observer = new ResizeObserver(() => updateState());
        observer.observe(target);

        return () => {
            window.cancelAnimationFrame(raf);
            target.removeEventListener("scroll", updateState);
            window.removeEventListener("resize", updateState);
            observer.disconnect();
        };
    }, [targetRef]);

    const handleScroll = (direction: "left" | "right") => {
        const target = targetRef.current;
        if (!target) return;

        const amount = stepPx ?? Math.max(280, Math.round(target.clientWidth * 0.85));
        target.scrollBy({
            left: direction === "left" ? -amount : amount,
            behavior: "smooth"
        });
    };

    if (!canScrollLeft && !canScrollRight) return null;

    return (
        <div className={`scroll-arrows-overlay ${className}`.trim()}>
            <button
                type="button"
                className={`scroll-arrow-btn ${variant === "light" ? "scroll-arrow-btn-light" : ""}`}
                onClick={() => handleScroll("left")}
                aria-label="Scroll left"
                disabled={!canScrollLeft}
            >
                <ChevronLeft size={20} />
            </button>
            <button
                type="button"
                className={`scroll-arrow-btn ${variant === "light" ? "scroll-arrow-btn-light" : ""}`}
                onClick={() => handleScroll("right")}
                aria-label="Scroll right"
                disabled={!canScrollRight}
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
}
