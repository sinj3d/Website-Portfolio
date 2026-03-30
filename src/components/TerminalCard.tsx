"use client";

import { useRef, useState } from 'react';

// Terminal-styled card with a subtle 3D mouse hover tilt + idle wobble
export default function TerminalCard({ children, className = "", delay = "0s", reverseWobble = false }: { children: React.ReactNode, className?: string, delay?: string, reverseWobble?: boolean }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -3;
        const rotateY = ((x - centerX) / centerX) * 3;
        setStyle({ transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` });
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setStyle({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' });
        setIsHovered(false);
    };

    const idleClass = reverseWobble ? 'animate-wobble-2' : 'animate-wobble-1';

    return (
        <div className={`transition-transform duration-1000 ease-in-out ${isHovered ? '' : idleClass}`} style={isHovered ? {} : { animationDelay: delay, transformOrigin: 'center center' }}>
            <div
                ref={cardRef}
                className={`transition-transform duration-200 ease-out shadow-[0_0_30px_rgba(0,0,0,0.3)] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md ${className}`}
                style={style}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Terminal Header */}
                <div className="h-8 bg-zinc-100 dark:bg-zinc-800/80 flex items-center px-4 gap-2 border-b border-zinc-200 dark:border-zinc-700/50 relative z-10 box-border">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 flex-shrink-0"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50 flex-shrink-0"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 flex-shrink-0"></div>
                </div>
                {/* Terminal Content */}
                <div className="relative">
                    {children}
                </div>
            </div>
        </div>
    );
}
