"use client";

import Link from 'next/link';
import TerminalCard from '@/components/TerminalCard';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SLIDE_DATA = [
    {
        title: "Impedance & Transmission",
        text: "The process began with the transmission line, calculating the precise geometry required to achieve a 50-ohm impedance match. This critical first step ensures minimal signal reflection and optimal power transfer when interfacing with external microwave control electronics."
    },
    {
        title: "Resonator & Qubit Frequency",
        text: "After establishing the feedline, we iteratively determined the optimal resonator and qubit frequencies. The design of the resonator claw was heavily optimized—its geometry directly dictates the capacitive coupling strength (g) between the qubit and the readout resonator, enabling high-fidelity state measurement."
    },
    {
        title: "Circuit Parameters (Ej/Ec)",
        text: "Operating in the transmon regime necessitates a large ratio between the Josephson Energy (Ej) and Charging Energy (Ec). By maintaining Ej/Ec >> 1, the circuit exponentially suppresses sensitivity to charge noise. However, it must also retain enough anharmonicity to cleanly isolate the computational states (0 and 1) from higher energy levels to prevent leakage."
    },
    {
        title: "Engineering Tradeoffs",
        text: "Superconducting circuit design is defined by tradeoffs. Increasing the coupling strength improves readout speed and accuracy, but it aggressively degrades the qubit coherence lifetime (T1) via the Purcell effect. We navigated these constraints to maximize coherence without sacrificing the speed needed to manipulate and measure the quantum state before decoherence occurs."
    },
    {
        title: "Substrate Selection",
        text: "Material choice heavily impacts dielectric loss and two-level system (TLS) noise, which dominate decoherence mechanisms: Silicon is highly scalable and leverages existing CMOS manufacturing infrastructure, but often exhibits slightly higher surface dielectric losses. Sapphire provides a crystalline structure with exceptionally low dielectric loss tangents, favoring longer coherence times (T1), though introducing more complex and expensive fabrication requirements."
    }
];

function ProjectCircuit() {
    return (
        <div className="w-full h-full flex-grow p-6 flex flex-col items-center justify-center relative bg-zinc-100/10 dark:bg-zinc-900/40 backdrop-blur-sm min-h-[50vh]">
            <img 
                src="/images/hardhaq/circuit.png" 
                alt="Quantum Circuit Design" 
                className="w-full h-full max-h-[500px] object-contain filter drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] dark:invert-[0.1]" 
            />
        </div>
    );
}

function ProjectMetadata() {
    return (
        <div className="w-full h-full flex-grow p-8 md:p-12 flex flex-col justify-center items-center text-center lg:text-left lg:items-start font-mono bg-zinc-100/10 dark:bg-zinc-900/40 min-h-[50vh]">
            <div className="max-w-full">
                <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center justify-center lg:justify-start gap-3 border-b border-zinc-300 dark:border-zinc-800 pb-4">
                     <span className="text-rose-500">{'>'}</span> HardHaQ 1st Place
                </h2>
                <p className="text-zinc-700 dark:text-zinc-400 mb-8 leading-relaxed text-sm md:text-base">
                    Designed and optimized a superconducting quantum circuit based on a transmon architecture. This process involved advanced microwave engineering to accurately match impedances, define capacitive coupling strengths, and balance critical quantum system tradeoffs like coherence times ($T_1$/$T_2$) against computational readout bandwidth.
                </p>
                
                <div className="bg-white/50 dark:bg-black/30 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-inner w-full">
                    <h3 className="text-emerald-600 dark:text-emerald-500 font-bold mb-3 flex items-center justify-center lg:justify-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Project_Collaborators
                    </h3>
                    <ul className="flex flex-col gap-3 items-center lg:items-start">
                        <li>
                            <a href="https://www.linkedin.com/in/william-chenyin/" target="_blank" rel="noreferrer" className="group text-zinc-800 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-3 w-fit text-sm">
                                <span>- William Chenyin</span> 
                                <span className="text-[10px] border border-zinc-300 dark:border-zinc-700 rounded px-2 py-0.5 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30 group-hover:border-cyan-500 transition-colors uppercase tracking-widest shadow-sm">LinkedIn</span>
                            </a>
                        </li>
                        <li>
                            <a href="https://www.linkedin.com/in/jeffrey-x-1a9a3b272/" target="_blank" rel="noreferrer" className="group text-zinc-800 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-3 w-fit text-sm">
                                <span>- Jeffrey Xue</span>
                                <span className="text-[10px] border border-zinc-300 dark:border-zinc-700 rounded px-2 py-0.5 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30 group-hover:border-cyan-500 transition-colors uppercase tracking-widest shadow-sm">LinkedIn</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function SlideCarousel({ currentIndex, onNext, onPrev }: { currentIndex: number, onNext: () => void, onPrev: () => void }) {
    const numSlides = SLIDE_DATA.length;

    const getZIndex = (index: number) => {
        if (index === currentIndex) return 30;
        if (index === currentIndex - 1 || index === currentIndex + 1) return 20;
        return 10;
    };

    const getOpacity = (index: number) => {
        if (index === currentIndex) return 1;
        if (index === currentIndex - 1 || index === currentIndex + 1) return 0.25;
        return 0;
    };
    
    const getScale = (index: number) => {
        if (index === currentIndex) return 1;
        return 0.8;
    };

    const getXOffset = (index: number) => {
        if (index === currentIndex) return '0%';
        if (index === currentIndex - 1) return '-30%';
        if (index === currentIndex + 1) return '30%';
        if (index < currentIndex) return '-60%';
        return '60%';
    };

    return (
        <div className="relative w-full h-full min-h-[400px] lg:min-h-[500px] flex items-center justify-center group my-0 overflow-hidden rounded-xl">
            
            {SLIDE_DATA.map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-[80%] aspect-[16/9] bg-white/5 dark:bg-zinc-900/50 backdrop-blur-md rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-zinc-300/50 dark:border-zinc-700/50 pointer-events-none"
                    initial={false}
                    animate={{ x: getXOffset(i), scale: getScale(i), opacity: getOpacity(i), zIndex: getZIndex(i) }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                >
                    <img 
                        src={`/images/hardhaq/slides/slide${i+1}.jpg`} 
                        alt={`Slide ${i+1}`}
                        className="w-full h-full object-cover pointer-events-auto"
                        onError={(e) => {
                            const el = e.currentTarget;
                            el.style.display = 'none';
                            const parent = el.parentElement;
                            if (parent && !parent.querySelector('.fallback-text')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-text absolute inset-0 flex flex-col items-center justify-center text-zinc-500 font-mono bg-zinc-100 dark:bg-[#1a1c1e] p-8 text-center';
                                fallback.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" className="mb-4 opacity-50"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><h3 class="text-xl font-bold mb-2 text-zinc-400">Missing Image Data</h3><p class="text-xs">slide${i+1}.jpg not found in public/images/hardhaq/slides/</p>`;
                                parent.appendChild(fallback);
                            }
                        }}
                    />
                </motion.div>
            ))}

            {/* Navigation Overlays */}
            <button 
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-white/80 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-zinc-900 dark:text-white p-4 rounded-full transition-all disabled:opacity-0 font-mono text-2xl backdrop-blur-md border border-zinc-300 dark:border-zinc-700/50 hover:scale-110 active:scale-95 shadow-lg shadow-black/20"
            >
                &larr;
            </button>
            
            <button 
                onClick={onNext}
                disabled={currentIndex === numSlides - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-white/80 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-zinc-900 dark:text-white p-4 rounded-full transition-all disabled:opacity-0 font-mono text-2xl backdrop-blur-md border border-zinc-300 dark:border-zinc-700/50 hover:scale-110 active:scale-95 shadow-lg shadow-black/20"
            >
                &rarr;
            </button>

            {/* Pagination dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-40 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                {SLIDE_DATA.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-cyan-400' : 'bg-white/30'}`}></div>
                ))}
            </div>
        </div>
    );
}

function WalkthroughTerminal({ slideIndex }: { slideIndex: number }) {
    const [charCount, setCharCount] = useState(0);
    const data = SLIDE_DATA[slideIndex];

    useEffect(() => {
        setCharCount(0); // Reset count on slide change
        
        // Use a fast timeout to rapidly type out the new explanatory text
        let current = 0;
        const speed = 15; // ms per frame
        const charsPerFrame = Math.max(1, Math.floor(data.text.length / 50)); // ensures it finishes quickly enough to not block the user

        const interval = setInterval(() => {
            current += charsPerFrame;
            if (current >= data.text.length) {
                setCharCount(data.text.length);
                clearInterval(interval);
            } else {
                setCharCount(current);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [slideIndex, data.text.length]);

    return (
        <div className="p-5 md:p-6 min-h-[250px] overflow-y-auto w-full custom-scrollbar bg-zinc-900/10 dark:bg-black/20">
            <h2 className="text-lg md:text-xl font-bold text-cyan-600 dark:text-cyan-400 mb-4 font-mono border-b border-cyan-900/30 pb-3 inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                [SYS_INFO_LAYER_{slideIndex + 1}] {data.title}
            </h2>
            <p className="font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed text-xs md:text-sm">
                {data.text.slice(0, charCount)}
                {charCount < data.text.length && (
                    <span className="bg-zinc-600 dark:bg-zinc-300 text-transparent inline-block w-[8px] h-[14px] ml-[2px] align-middle">_</span>
                )}
            </p>
        </div>
    );
}

export default function HardHaqPage() {
    const [currentIndex, setCurrentIndex] = useState(0);

    return (
        <div className="relative h-screen w-full bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors overflow-y-auto overflow-x-hidden pt-24 pb-24">
            
            {/* Custom scrollbars inside terminal content */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(161, 161, 170, 0.3); border-radius: 10px; }
            `}</style>

            <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 pointer-events-auto flex flex-col gap-12 z-10 relative">
                
                {/* Navbar / Back (Centered to 1200px) */}
                <div className="max-w-[1200px] mx-auto w-full">
                    <motion.nav 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="flex justify-start"
                    >
                        <Link href="/" className="inline-flex items-center text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-mono text-sm tracking-widest uppercase bg-zinc-200/50 dark:bg-zinc-900/50 px-4 py-2 rounded-md backdrop-blur-sm border border-zinc-300/50 dark:border-zinc-800/50 shadow-lg shadow-black/10 dark:shadow-black/40">
                            &lt; back_to_portfolio
                        </Link>
                    </motion.nav>
                </div>

                {/* Top Section: Circuit & Meta (Centered to 1200px) */}
                <div className="max-w-[1200px] mx-auto w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                        className="flex flex-col lg:flex-row gap-8 w-full items-stretch justify-center"
                    >
                        <div className="w-full lg:w-1/2 flex flex-col" style={{ perspective: '1000px' }}>
                            <TerminalCard delay="0s" reverseWobble={false} className="w-full h-full flex flex-col">
                                <ProjectCircuit />
                            </TerminalCard>
                        </div>
                        <div className="w-full lg:w-1/2 flex flex-col" style={{ perspective: '1000px' }}>
                            <TerminalCard delay="-1s" reverseWobble={true} className="w-full h-full flex flex-col">
                                <ProjectMetadata />
                            </TerminalCard>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom Section: Carousel & Walkthrough Side-by-Side (Wider - 1400px) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                    className="flex flex-col lg:flex-row gap-8 w-full items-stretch"
                >
                    {/* Left: Interactive Carousel */}
                    <div className="w-full lg:w-[73.4%] relative z-20 flex flex-col">
                        <SlideCarousel 
                            currentIndex={currentIndex} 
                            onNext={() => setCurrentIndex(Math.min(currentIndex + 1, SLIDE_DATA.length - 1))}
                            onPrev={() => setCurrentIndex(Math.max(currentIndex - 1, 0))}
                        />
                    </div>

                    {/* Right: Walkthrough Terminal */}
                    <div className="w-full lg:w-[26.6%] flex flex-col" style={{ perspective: '1000px' }}>
                        <TerminalCard delay="-4s" reverseWobble={false} className="w-full h-full flex flex-col border-t-4 border-t-cyan-500">
                            <WalkthroughTerminal slideIndex={currentIndex} />
                        </TerminalCard>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}

