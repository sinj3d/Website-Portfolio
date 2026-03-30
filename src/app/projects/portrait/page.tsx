"use client";

import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SkillNetwork from '@/components/SkillNetwork';
import { useRef, useState, useEffect } from 'react';
import TerminalCard from '@/components/TerminalCard';


const TYPE_SPEED = 10; // ms per char (rapid typing)

function TerminalBioContent() {
    const fullStatus = "Status: Active // Building resume-builder";
    const fullName = "> Simon_Jin";
    const fullTitle = "Robotics | Machine Learning | Software";
    const fullBio1 = "Mechatronics engineer and software developer with a passion for robotics, machine learning, and building things that bridge the digital-physical divide.";
    const fullBio2 = "Currently studying at SFU, winning hackathons, and pushing the boundaries of what hardware and software can do together.";

    const [counts, setCounts] = useState({
        status: 0,
        name: 0,
        title: 0,
        bio1: 0,
        bio2: 0,
    });
    const [showSocials, setShowSocials] = useState(false);

    useEffect(() => {
        let current = { status: 0, name: 0, title: 0, bio1: 0, bio2: 0 };
        const sequence = [
            { key: 'status', text: fullStatus },
            { key: 'name', text: fullName },
            { key: 'title', text: fullTitle },
            { key: 'bio1', text: fullBio1 },
            { key: 'bio2', text: fullBio2 },
        ];

        const interval = setInterval(() => {
            let typedAnything = false;
            for (let i = 0; i < sequence.length; i++) {
                const seg = sequence[i];
                if (current[seg.key as keyof typeof current] < seg.text.length) {
                    current[seg.key as keyof typeof current] += 1;
                    typedAnything = true;
                    setCounts({ ...current });
                    break;
                }
            }
            if (!typedAnything) {
                setShowSocials(true);
                clearInterval(interval);
            }
        }, TYPE_SPEED);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 flex-grow flex flex-col justify-center min-h-[500px]">
            <div className="flex items-center gap-2 mb-6 h-4">
                {counts.status > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0 mt-[1px]"></span>}
                <span className="font-mono text-xs tracking-widest text-zinc-500 uppercase flex items-center h-4">
                    {fullStatus.slice(0, counts.status)}
                    {counts.status < fullStatus.length && <span className="bg-zinc-500 text-transparent w-[6px] h-[12px] ml-1">_</span>}
                </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 font-mono h-12 flex items-center">
                {fullName.slice(0, counts.name)}
                {(counts.status === fullStatus.length && counts.name < fullName.length) && <span className="bg-zinc-900 dark:bg-zinc-100 text-transparent w-[14px] h-[34px] ml-[2px]">_</span>}
            </h1>

            <h2 className="text-md font-mono text-cyan-600 dark:text-cyan-500 tracking-widest uppercase mb-10 h-6 flex items-center">
                {fullTitle.slice(0, counts.title)}
                {(counts.name === fullName.length && counts.title < fullTitle.length) && <span className="bg-cyan-500 text-transparent w-[8px] h-[14px] ml-[2px]">_</span>}
            </h2>

            <p className="text-zinc-700 dark:text-zinc-400 leading-relaxed max-w-2xl mb-10 font-mono text-[13px] sm:text-sm h-32 relative z-10 w-full">
                {counts.bio1 > 0 && <span className="text-cyan-600 dark:text-cyan-400 font-bold">[SYS_INFO] </span>}
                {fullBio1.slice(0, counts.bio1)}
                {(counts.title === fullTitle.length && counts.bio1 < fullBio1.length) && <span className="bg-cyan-500 text-transparent inline-block w-[8px] h-[14px] ml-[2px] align-middle">_</span>}

                {counts.bio2 > 0 && (
                    <>
                        <br /><br />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">[LOC_DATA] </span>
                        {fullBio2.slice(0, counts.bio2)}
                        {(counts.bio1 === fullBio1.length && counts.bio2 < fullBio2.length) && <span className="bg-emerald-500 text-transparent inline-block w-[8px] h-[14px] ml-[2px] align-middle">_</span>}
                    </>
                )}
            </p>

            <div className={`flex flex-wrap gap-4 mt-auto pt-8 border-t border-zinc-200 dark:border-zinc-800/50 relative z-20 transition-all duration-1000 ease-out transform ${showSocials ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <a href="https://linkedin.com/in/simon-jin" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition border border-zinc-300 dark:border-zinc-700 px-4 py-2 rounded-md group font-mono text-sm shadow-lg">
                    <img src="/images/footer/linkedin.svg" alt="LinkedIn" className="w-5 h-5 dark:invert opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span className="text-zinc-800 dark:text-zinc-200">LinkedIn</span>
                </a>
                <a href="https://github.com/ShenghuaJin" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition border border-zinc-300 dark:border-zinc-700 px-4 py-2 rounded-md group font-mono text-sm shadow-lg">
                    <img src="/images/footer/github.svg" alt="GitHub" className="w-5 h-5 dark:invert opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span className="text-zinc-800 dark:text-zinc-200">GitHub</span>
                </a>
                <a href="/resume" className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 transition px-4 py-2 rounded-md shadow-lg shadow-cyan-900/20 font-mono text-sm">
                    <img src="/images/footer/resume.svg" alt="Resume" className="w-5 h-5 invert" />
                    <span className="text-white">Download_Resume</span>
                </a>
            </div>
        </div>
    );
}

function AsciiPortrait() {
    const [ascii, setAscii] = useState("");
    const [charCount, setCharCount] = useState(0);
    const [isDone, setIsDone] = useState(false);
    const [fadeImage, setFadeImage] = useState(false);

    useEffect(() => {
        fetch('/images/portrait/ascii-art.txt')
            .then(res => res.text())
            .then(text => setAscii(text))
            .catch(err => {
                console.error("Failed to fetch ASCII art", err);
                setIsDone(true); // Fallback to image if missing
            });
    }, []);

    useEffect(() => {
        if (!ascii) return;
        // The TerminalBioContent takes ~3.5s to type (350 chars at 10ms).
        // To precisely sync, ASCII needs to finish in exactly ~3.5s (218 frames at 16ms).
        const charsPerFrame = Math.max(1, Math.floor(ascii.length / 218));
        let current = 0;
        const interval = setInterval(() => {
            current += charsPerFrame;
            if (current >= ascii.length) {
                setCharCount(ascii.length);
                setTimeout(() => setFadeImage(true), 150);
                setTimeout(() => setIsDone(true), 1150); // Fully replace after fade-in
                clearInterval(interval);
            } else {
                setCharCount(current);
            }
        }, 16);
        return () => clearInterval(interval);
    }, [ascii]);

    return (
        <div className="@container w-full bg-zinc-950 flex flex-col justify-start overflow-hidden shadow-inner relative" style={{ aspectRatio: '3/4' }}>
            {/* ASCII Layer */}
            {!isDone && (
                <pre className="font-mono text-cyan-400 opacity-80 whitespace-pre text-left w-full h-full box-border leading-none pt-4 px-[1cqw]"
                    style={{
                        fontSize: 'calc(100cqw / 52)',
                        letterSpacing: '0px'
                    }}>
                    {ascii.slice(0, charCount)}
                    {!fadeImage && <span className="bg-cyan-400 text-transparent inline-block ml-[2px]" style={{ width: 'calc(100cqw / 52 * 0.6)', height: 'calc(100cqw / 52 * 0.8)' }}>_</span>}
                </pre>
            )}

            {/* Fade In Image (object-left-top pushes image down and right based on user request) */}
            {fadeImage && (
                <img
                    src="/images/portrait/portrait.jpg"
                    alt="Simon Jin Portrait"
                    className="absolute inset-0 w-full h-auto min-h-full object-cover object-left-top filter drop-shadow-[0_0_20px_rgba(0,0,0,0.6)] animate-fade-in-slow z-10"
                    style={{ aspectRatio: '3/4' }}
                />
            )}
        </div>
    );
}

export default function PortraitPage() {
    return (
        // Enforce actual scroll layer securely bypassing body
        <div className="relative h-screen w-full bg-zinc-50 dark:bg-zinc-950 font-sans transition-colors overflow-y-auto overflow-x-hidden">

            <style>{`
                @keyframes slowFadeIn {
                    0% { opacity: 0; filter: blur(4px); }
                    100% { opacity: 1; filter: blur(0px); }
                }
                .animate-fade-in-slow {
                    animation: slowFadeIn 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                @keyframes wobble1 {
                    0% { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
                    33% { transform: perspective(1000px) rotateY(1.5deg) rotateX(0.5deg); }
                    66% { transform: perspective(1000px) rotateY(-1.0deg) rotateX(-0.5deg); }
                    100% { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
                }
                @keyframes wobble2 {
                    0% { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
                    33% { transform: perspective(1000px) rotateY(-1.5deg) rotateX(-0.5deg); }
                    66% { transform: perspective(1000px) rotateY(1.0deg) rotateX(0.5deg); }
                    100% { transform: perspective(1000px) rotateY(0deg) rotateX(0deg); }
                }
                .animate-wobble-1 {
                    animation: wobble1 7.5s ease-in-out infinite;
                }
                .animate-wobble-2 {
                    animation: wobble2 9.2s ease-in-out infinite;
                }
            `}</style>

            {/* Content Layer */}
            <div className="relative z-10 w-full flex flex-col items-center justify-start pb-24">

                {/* Navbar / Back */}
                <nav className="w-full p-6 sm:px-12 pointer-events-auto flex justify-start">
                    <Link href="/" className="inline-flex items-center text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 transition-colors font-mono text-sm tracking-widest uppercase bg-zinc-900/50 px-4 py-2 rounded-md backdrop-blur-sm border border-zinc-800/50 shadow-lg shadow-black/20">
                        &lt; back_to_portfolio
                    </Link>
                </nav>

                {/* Top Section */}
                <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 flex flex-col lg:flex-row gap-8 items-stretch pt-2 mb-24">

                    {/* Logo / Avatar Column */}
                    <div className="lg:w-1/3 flex flex-col z-20" style={{ perspective: '1000px' }}>
                        <TerminalCard className="h-full" delay="0s" reverseWobble={false}>
                            <div className="flex h-full items-center justify-center p-0">
                                <AsciiPortrait />
                            </div>
                        </TerminalCard>
                    </div>

                    {/* Bio & Socials Column */}
                    <div className="lg:w-2/3 flex flex-col z-20" style={{ perspective: '1000px' }}>
                        <TerminalCard className="h-full flex flex-col items-stretch" delay="-4s" reverseWobble={true}>
                            <TerminalBioContent />
                        </TerminalCard>
                    </div>
                </div>

                {/* Bottom 3D Canvas Area */}
                <div className="relative w-full h-[800px] bg-transparent">
                    <Canvas camera={{ position: [0, 0, 26], fov: 45 }}>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} intensity={1} />
                        <SkillNetwork />
                        <OrbitControls
                            enableZoom={false}
                            enablePan={false}
                            autoRotate={false}
                            dampingFactor={0.05}
                        />
                    </Canvas>
                </div>

            </div>

        </div>
    );
}
