import React, { useEffect, useRef, useState } from "react";
import {
    motion,
    useAnimationFrame,
    useMotionValue,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
} from "framer-motion";

interface ScrollVelocityProps {
    children: React.ReactNode;
    baseVelocity: number;
    direction: number;
    className?: string;
}

export function ScrollVelocityRow({
    children,
    baseVelocity = 100,
    direction = 1,
    className,
}: ScrollVelocityProps) {
    const baseX = useMotionValue(0);
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, {
        damping: 50,
        stiffness: 400,
    });
    const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
        clamp: false,
    });

    const [repetitions, setRepetitions] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const calculateRepetitions = () => {
            if (containerRef.current && textRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const textWidth = textRef.current.offsetWidth;
                const newRepetitions = Math.ceil(containerWidth / textWidth) + 2;
                setRepetitions(newRepetitions);
            }
        };

        calculateRepetitions();

        window.addEventListener("resize", calculateRepetitions);
        return () => window.removeEventListener("resize", calculateRepetitions);
    }, [children]);

    const x = useTransform(baseX, (v) => `${wrap(-100 / repetitions, 0, v)}%`);

    const directionFactor = useRef<number>(1);
    useAnimationFrame((t, delta) => {
        let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

        if (velocityFactor.get() < 0) {
            directionFactor.current = -1;
        } else if (velocityFactor.get() > 0) {
            directionFactor.current = 1;
        }

        moveBy += directionFactor.current * moveBy * velocityFactor.get();

        baseX.set(baseX.get() + moveBy * direction);
    });

    return (
        <div
            className={`overflow-hidden whitespace-nowrap ${className}`}
            ref={containerRef}
        >
            <motion.div className="inline-block" style={{ x }}>
                {Array.from({ length: repetitions }).map((_, i) => (
                    <span key={i} ref={i === 0 ? textRef : null} className="inline-block">
                        {children}
                    </span>
                ))}
            </motion.div>
        </div>
    );
}

export function ScrollVelocityContainer({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            {children}
        </div>
    );
}

function wrap(min: number, max: number, v: number) {
    const rangeSize = max - min;
    return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
}
