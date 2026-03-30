"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as THREE from "three";
import { useTheme } from "./ThemeProvider";

// ─── Constants ───────────────────────────────────────────────────────────────
const RADIUS = 2.5;
const phi = (1 + Math.sqrt(5)) / 2;
const ROTATE_SPEED = (2 * Math.PI) / 30; // 360° per 30s (slow tumble)
const LINE_THICKNESS = 0.025; // Thicker wireframe



// ─── Helper: read triangle vertex from indexed or non-indexed geometry ───────
function getTriVert(
    posAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    index: THREE.BufferAttribute | null,
    triIndex: number,
    vertOffset: number
): THREE.Vector3 {
    const vi = index ? index.getX(triIndex + vertOffset) : triIndex + vertOffset;
    return new THREE.Vector3().fromBufferAttribute(posAttr, vi);
}

// ─── Pre-rotate dodecahedron so one face aligns with -Y ─────────────────────
interface AlignedGeoResult {
    geo: THREE.DodecahedronGeometry;
    alignQ: THREE.Quaternion;
    bottomCenter: THREE.Vector3;
}

function createAlignedDodecGeo(): AlignedGeoResult {
    const geo = new THREE.DodecahedronGeometry(RADIUS, 0);
    const posAttr = geo.getAttribute("position");
    const idx = geo.getIndex();
    const triCount = idx ? idx.count / 3 : posAttr.count / 3;
    // Align to +Z because tilt R_x(π/2) maps local +Z → world -Y (visual bottom)
    const targetDir = new THREE.Vector3(0, 0, 1);
    let bestNormal = new THREE.Vector3();
    let bestDot = -Infinity;
    for (let t = 0; t < triCount; t++) {
        const base = t * 3;
        const a = getTriVert(posAttr, idx, base, 0);
        const b = getTriVert(posAttr, idx, base, 1);
        const c = getTriVert(posAttr, idx, base, 2);
        const n = new THREE.Triangle(a, b, c).getNormal(new THREE.Vector3());
        const d = n.dot(targetDir);
        if (d > bestDot) { bestDot = d; bestNormal = n.clone(); }
    }
    const alignQ = new THREE.Quaternion().setFromUnitVectors(bestNormal, targetDir);
    geo.applyQuaternion(alignQ);

    // Find the bottom face center after rotation
    const posAttr2 = geo.getAttribute("position");
    const idx2 = geo.getIndex();
    const triCount2 = idx2 ? idx2.count / 3 : posAttr2.count / 3;
    // Group triangles by shared normal to find the +Z face (visual bottom after tilt)
    const bottomVerts: THREE.Vector3[] = [];
    for (let t = 0; t < triCount2; t++) {
        const base = t * 3;
        const a = getTriVert(posAttr2, idx2, base, 0);
        const b = getTriVert(posAttr2, idx2, base, 1);
        const c = getTriVert(posAttr2, idx2, base, 2);
        const n = new THREE.Triangle(a, b, c).getNormal(new THREE.Vector3());
        if (n.dot(targetDir) > 0.99) {
            bottomVerts.push(a, b, c);
        }
    }
    const bottomCenter = new THREE.Vector3();
    bottomVerts.forEach(v => bottomCenter.add(v));
    if (bottomVerts.length > 0) bottomCenter.divideScalar(bottomVerts.length);

    return { geo, alignQ, bottomCenter };
}

// ─── Edge extraction with bottom-to-top sorting ──────────────────────────────
interface SortedEdge {
    ax: number; ay: number; az: number;
    bx: number; by: number; bz: number;
    sortY: number;
}

function extractSortedEdges(geo: THREE.BufferGeometry): SortedEdge[] {
    const edges = new THREE.EdgesGeometry(geo, 1);
    const pos = edges.getAttribute('position');
    const segs: SortedEdge[] = [];
    for (let i = 0; i < pos.count; i += 2) {
        let ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
        let bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);

        // Ensure A is visually lower than B (larger local Z)
        if (bz > az) {
            const tx = ax, ty = ay, tz = az;
            ax = bx; ay = by; az = bz;
            bx = tx; by = ty; bz = tz;
        }

        // After tilt R_x(π/2): world_Y = -local_z, so visual bottom = max local z (which is now az)
        segs.push({ ax, ay, az, bx, by, bz, sortY: -az });
    }
    segs.sort((a, b) => a.sortY - b.sortY); // bottom first
    return segs;
}


function createPentagonGeo() {
    const a = (RADIUS * 4) / (Math.sqrt(3) * (1 + Math.sqrt(5)));
    const faceR = a / (2 * Math.sin(Math.PI / 5));
    const shape = new THREE.Shape();
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + Math.PI / 2 + i * (2 * Math.PI) / 5;
        const x = faceR * Math.cos(angle);
        const y = faceR * Math.sin(angle);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
}


function getPentagonPoints() {
    const a = (RADIUS * 4) / (Math.sqrt(3) * (1 + Math.sqrt(5)));
    const faceR = a / (2 * Math.sin(Math.PI / 5));
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 5; i++) {
        const angle = -Math.PI / 2 + Math.PI / 2 + i * (2 * Math.PI) / 5;
        points.push(new THREE.Vector3(faceR * Math.cos(angle), faceR * Math.sin(angle), 0));
    }
    return points;
}

// Pentagon clip-path matching a centered regular pentagon
const PENTAGON_CLIP =
    "polygon(50% 0%, 97.55% 34.55%, 79.39% 90.45%, 20.61% 90.45%, 2.45% 34.55%)";

// ─── Face Data ───────────────────────────────────────────────────────────────
interface FaceData {
    direction: [number, number, number];
    label: string;
    slug: string;
    accent: string;
    image?: string;
    description: string;
    isFrosted?: boolean;
    renderContent: (hoverHandlers: { onMouseEnter: () => void, onMouseLeave: () => void, onClick?: (e: React.MouseEvent) => void }, isDark: boolean, isReturning: boolean) => React.ReactNode;
}

function FaceCard({
    accent,
    slug,
    children,
    index = 0,
    frosted = false,
    isDark = false,
    onMouseEnter,
    onMouseLeave,
    onClick,
    isReturning = false,
}: {
    accent: string;
    slug: string;
    children: React.ReactNode;
    index?: number;
    frosted?: boolean;
    isDark?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: (e: React.MouseEvent) => void;
    isReturning?: boolean;
}) {
    const delay = isReturning ? index * 0.05 : index * 0.15;
    const duration = isReturning ? "0.2s" : "0.6s";

    // Points corresponding exactly to PENTAGON_CLIP
    // (50% 0%, 97.55% 34.55%, 79.39% 90.45%, 20.61% 90.45%, 2.45% 34.55%)
    // scaled by 205 (width/height of FaceCard)
    const points = "102.5,0 199.9775,70.8275 162.7495,185.4225 42.2505,185.4225 5.0225,70.8275";

    const wrapper = (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="animate-line relative cursor-pointer group transition-all duration-300 hover:scale-[1.05] block"
            style={{
                width: "205px",
                height: "205px",
                clipPath: PENTAGON_CLIP,
                animationDuration: duration,
                animationDelay: `${delay}s`,
            }}
        >
            {/* Background & Border SVG mimicking CSS inset borders */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                viewBox="0 0 205 205"
            >
                {frosted ? (
                    <>
                        {/* Frosted glass: translucent fill + soft dashed border */}
                        <polygon
                            points={points}
                            fill={isDark ? "rgba(30, 30, 35, 0.85)" : "rgba(255, 255, 255, 0.85)"}
                            stroke={isDark ? "rgba(80,80,100,0.35)" : "rgba(160,160,180,0.35)"}
                            strokeWidth="6"
                            strokeDasharray="8 4"
                        />
                    </>
                ) : (
                    <>
                        {/* Background fill + 4px inner accent border (strokeWidth 8 clips 4px off) */}
                        <polygon
                            points={points}
                            fill={isDark ? "rgba(24, 24, 27, 1)" : "rgba(255, 255, 255, 1)"}
                            stroke={accent}
                            strokeWidth="8"
                        />
                        {/* 2px inner border (strokeWidth 4 clips 2px off), overlays the accent */}
                        <polygon
                            points={points}
                            fill="none"
                            stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)"}
                            strokeWidth="4"
                        />
                    </>
                )}
            </svg>

            {/* Content Container (z-index ensures it sits above the background SVG) */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full gap-2 p-5 text-center">
                {children}
            </div>
        </div>
    );

    if (frosted) return wrapper;

    return (
        <a href={`/projects/${slug}`} onClick={(e) => { e.preventDefault(); onClick?.(e); }}>
            {wrapper}
        </a>
    );
}

const FACE_DEFINITIONS: FaceData[] = [
    // ── 0: Portrait ──────────────────────────────────────────────────────────
    {
        direction: [0, 1, phi],
        label: "Portrait",
        slug: "portrait",
        accent: "rgba(6,182,212,0.6)",
        image: "/images/portrait/portrait-old.jpg",
        description: "Simon Jin. Robotics, ML, and Software Engineering. Passionate about building intelligent systems.",
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(6,182,212,0.6)" slug="portrait" index={0} isDark={isDark} isReturning={isReturning} {...handlers}>
                <div className="relative w-16 h-16 group mb-1">
                    <img src="/images/portrait/SJ.png" alt="Portrait" className="absolute inset-0 w-full h-full object-contain" />
                    <img src="/images/portrait/SJ.png" alt="Portrait" className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-70 group-hover:translate-x-[2px] group-hover:-translate-y-[1px] transition-all duration-100 mix-blend-screen" style={{ filter: 'hue-rotate(90deg) saturate(200%) blur(0.5px)' }} />
                    <img src="/images/portrait/SJ.png" alt="Portrait" className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-70 group-hover:-translate-x-[2px] group-hover:translate-y-[1px] transition-all duration-100 mix-blend-screen" style={{ filter: 'hue-rotate(-90deg) saturate(200%) blur(0.5px)' }} />
                </div>
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Simon Jin</h2>
                <p className="text-[9px] tracking-widest text-cyan-500 uppercase">
                    Robotics | ML | 3D Design
                </p>
            </FaceCard>
        ),
    },
    // ── 1: Frosted placeholder (was footer) ──────────────────────────────────
    {
        direction: [0, -1, -phi],
        label: "",
        slug: "placeholder-5",
        accent: "rgba(160,160,180,0.3)",
        description: "This project is currently under development. Check back soon for updates.",
        isFrosted: true,
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(160,160,180,0.3)" slug="placeholder-5" index={1} frosted isDark={isDark} isReturning={isReturning} {...handlers}>
                <div className="animate-shimmer absolute inset-0 pointer-events-none" />
            </FaceCard>
        ),
    },
    // ── 2: HardHaQ ───────────────────────────────────────────────────────────
    {
        direction: [0, 1, -phi],
        label: "HardHaQ",
        slug: "hardhaq",
        accent: "rgba(245,158,11,0.5)",
        image: "/images/hardhaq/circuit.png",
        description: "1st Place winner at HardHaQ 2025, a quantum hardware hackathon hosted by the North American Quantum Consortium. ",
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(245,158,11,0.5)" slug="hardhaq" index={2} isDark={isDark} isReturning={isReturning} {...handlers}>
                <img src="/images/hardhaq/nasc.png" alt="HardHaQ" className="w-15 h-15 rounded-full" />
                <span className="text-[8px] font-bold tracking-widest text-amber-600 uppercase">🏆 1st Place</span>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">HardHaQ 2025</h3>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400">Quantum Hardware Hackathon</p>
            </FaceCard>
        ),
    },
    // ── 3: Macropad (swapped from slot 4) ────────────────────────────────────
    {
        direction: [0, -1, phi],
        label: "Macropad",
        slug: "macropad",
        accent: "rgba(16,185,129,0.5)",
        image: "/images/macropad/switch.png",
        description: "Engineered a custom hall-effect macropad from scratch, featuring a custom KiCad PCB and embedded firmware.",
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(16,185,129,0.5)" slug="macropad" index={3} isDark={isDark} isReturning={isReturning} {...handlers}>
                <img src="/images/macropad/macropad.png" style={{ width: '100%', height: '75px', objectFit: 'contain' }} />
                <span className="text-[8px] font-bold tracking-widest text-emerald-600 uppercase">Hardware</span>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Custom Macropad</h3>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400">Hall-effect · KiCad PCB</p>
            </FaceCard>
        ),
    },
    // ── 4: Frosted placeholder (was hackml) ──────────────────────────────────
    {
        direction: [1, phi, 0],
        label: "",
        slug: "placeholder-1",
        accent: "rgba(160,160,180,0.3)",
        description: "This project is currently under development. Check back soon for updates.",
        isFrosted: true,
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(160,160,180,0.3)" slug="placeholder-1" index={4} frosted isDark={isDark} isReturning={isReturning} {...handlers}>
                <div className="animate-shimmer absolute inset-0 pointer-events-none" />
            </FaceCard>
        ),
    },
    // ── 5: Parabellum ────────────────────────────────────────────────────────
    {
        direction: [-1, phi, 0],
        label: "Parabellum",
        slug: "parabellum",
        accent: "rgba(96, 34, 44, 0.5)",
        image: "/images/parabellum/booth.jpg",
        description: "Served as 3-year captain for FTC Parabellum. Led the team to compete in the European Internationals and mentored junior members.",
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(96, 34, 44, 0.5)" slug="parabellum" index={5} isDark={isDark} isReturning={isReturning} {...handlers}>
                <img src="/images/parabellum/logo.svg" alt="Parabellum Logo" className="w-20 h-20" />
                <span className="text-[8px] font-bold tracking-widest text-rose-600 uppercase">Parabellum</span>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">FTC Parabellum</h3>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400">3-Year Captain · EU Intl.</p>
            </FaceCard>
        ),
    },
    // ── 6: HUDson ────────────────────────────────────────────────────────────
    {
        direction: [1, -phi, 0],
        label: "HUDson",
        slug: "hudson",
        accent: "rgba(59,130,246,0.5)",
        image: "/images/hudson/gallery.jpg",
        description: "Software project built at nwHacks. Integrated ElevenLabs API for advanced text-to-speech functionality in a head-up display system.",
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(59,130,246,0.5)" slug="hudson" index={6} isDark={isDark} isReturning={isReturning} {...handlers}>
                <img src="/images/hudson/logo.jpg" alt="HUDson" className="w-15 h-15" />
                <span className="text-[8px] font-bold tracking-widest text-blue-600 uppercase">Software</span>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">HUDson</h3>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400">nwHacks · ElevenLabs API</p>
            </FaceCard>
        ),
    },
    // ── 7: Telebuddy (swapped from slot 8) ───────────────────────────────────
    {
        direction: [-1, -phi, 0],
        label: "Telebuddy (Solder Bot)",
        slug: "telebuddy",
        accent: "rgba(20,184,166,0.5)",
        image: "/images/telebuddy/telebuddy.jpg",
        description: "A 6-DOF teleoperated robotic arm specifically designed for precision soldering tasks. Won Science Tech for Social Good at Hack the Coast.",
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(20,184,166,0.5)" slug="telebuddy" index={7} isDark={isDark} isReturning={isReturning} {...handlers}>
                <img src="/images/telebuddy/hackthecoast.png" alt="Telebuddy" className="w-10 h-10" />
                <span className="text-[8px] font-bold tracking-widest text-teal-600 uppercase">Mechatronics</span>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Telebuddy</h3>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400">AR and Teleoperation</p>
            </FaceCard>
        ),
    },
    // ── 8: Frosted placeholder (was airmouse) ────────────────────────────────
    {
        direction: [phi, 0, 1],
        label: "",
        slug: "placeholder-2",
        accent: "rgba(160,160,180,0.3)",
        description: "This project is currently under development. Check back soon for updates.",
        isFrosted: true,
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(160,160,180,0.3)" slug="placeholder-2" index={8} frosted isDark={isDark} isReturning={isReturning} {...handlers}>
                <div className="animate-shimmer absolute inset-0 pointer-events-none" />
            </FaceCard>
        ),
    },
    // ── 9: Resume Builder (swapped from slot 10) ─────────────────────────────
    {
        direction: [-phi, 0, 1],
        label: "Resume Builder",
        slug: "resume-builder",
        accent: "rgba(16,185,129,0.5)",
        image: "/images/resume-builder/preview.png",
        description: "A local-first AI resume builder powered by a local LLM (llama.cpp). Generates tailored LaTeX resumes from structured experience data, with live editor and Tauri-native PDF export.",
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(16,185,129,0.5)" slug="resume-builder" index={9} isDark={isDark} isReturning={isReturning} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-emerald-600 uppercase">Dev Tool</span>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Resume Builder</h3>
                <p className="text-[9px] text-zinc-500 dark:text-zinc-400">Local LLM · LaTeX · Tauri</p>
            </FaceCard>
        ),
    },
    // ── 10: Frosted placeholder (was roboticslab) ────────────────────────────
    {
        direction: [phi, 0, -1],
        label: "",
        slug: "placeholder-3",
        accent: "rgba(160,160,180,0.3)",
        description: "This project is currently under development. Check back soon for updates.",
        isFrosted: true,
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(160,160,180,0.3)" slug="placeholder-3" index={10} frosted isDark={isDark} isReturning={isReturning} {...handlers}>
                <div className="animate-shimmer absolute inset-0 pointer-events-none" />
            </FaceCard>
        ),
    },
    // ── 11: Frosted placeholder (was awards) ─────────────────────────────────
    {
        direction: [-phi, 0, -1],
        label: "",
        slug: "placeholder-4",
        accent: "rgba(160,160,180,0.3)",
        description: "This project is currently under development. Check back soon for updates.",
        isFrosted: true,
        renderContent: (handlers, isDark, isReturning) => (
            <FaceCard accent="rgba(160,160,180,0.3)" slug="placeholder-4" index={11} frosted isDark={isDark} isReturning={isReturning} {...handlers}>
                <div className="animate-shimmer absolute inset-0 pointer-events-none" />
            </FaceCard>
        ),
    },
];

// ─── Popup Window Components ──────────────────────────────────────────────────
function TerminalText({ text, isReturning = false }: { text: string; isReturning?: boolean }) {
    const [charCount, setCharCount] = useState(0);
    const countRef = useRef(0);
    const speed = isReturning ? 15 : 30;

    useEffect(() => {
        setCharCount(0);
        countRef.current = 0;
        const interval = setInterval(() => {
            countRef.current += 1;
            if (countRef.current >= text.length) {
                setCharCount(text.length);
                clearInterval(interval);
            } else {
                setCharCount(countRef.current);
            }
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed]);

    return <span>{text.slice(0, charCount)}</span>;
}

function ProjectDetailsWindow({ face, isExpanding, isDark, isReturning }: { face: FaceData | null; isExpanding: boolean; isDark: boolean; isReturning: boolean }) {
    // Keep track of the last active face so the window elegantly fades out when closing 
    // instead of instantly snapping to empty content.
    const [activeFace, setActiveFace] = useState<FaceData | null>(null);
    const [prevFace, setPrevFace] = useState<FaceData | null>(null);
    const [lingerVisible, setLingerVisible] = useState(false);

    if (face !== prevFace) {
        setPrevFace(face);
        if (face) setActiveFace(face);
    }

    useEffect(() => {
        if (!face && !isExpanding) {
            // Linger for 1.5 seconds after losing focus/unhovering before fading out
            const timer = setTimeout(() => setLingerVisible(false), 1500);
            return () => clearTimeout(timer);
        } else {
            setLingerVisible(true);
        }
    }, [face, isExpanding]);

    const isVisible = face !== null || isExpanding || lingerVisible;

    if (!activeFace) return null;

    // Don't show popup for frosted placeholder faces
    if (activeFace.isFrosted) return null;

    // The entire window's opacity is controlled by both its general visibility (is hovering?) 
    // AND the rapid blinking state effect.
    const finalOpacity = isVisible ? 1 : 0;

    const isFrosted = activeFace.isFrosted;

    const baseBgColor = isFrosted
        ? (isDark ? "rgba(20, 20, 25, 0.6)" : "rgba(255, 255, 255, 0.6)")
        : (isDark ? "rgba(24, 24, 27, 1)" : "rgba(255, 255, 255, 1)");
        
    const bgColor = isExpanding 
        ? (isDark ? "rgb(9, 9, 11)" : "rgb(255, 255, 255)") 
        : baseBgColor;

    const borderColor = isExpanding 
        ? "transparent"
        : (isFrosted
            ? (isDark ? "1px solid rgba(60,60,70,0.4)" : "1px solid rgba(200,200,210,0.4)")
            : (isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.15)"));

    return (
        <div
            className={`flex flex-col gap-5 z-50 pointer-events-none transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden ${
                isExpanding ? "w-[100vw] h-[100vh] mr-0 mb-0 justify-center items-center p-[5vw]" : "w-[400px] mr-[5vw] mb-12 p-6"
            }`}
            style={{
                background: bgColor,
                border: borderColor,
                boxShadow: isExpanding 
                    ? "none"
                    : (isFrosted
                        ? `0 8px 32px rgba(0,0,0,0.08)`
                        : `inset 0 0 0 2px ${activeFace.accent.replace(/[\d.]+\)$/g, '0.8)')}, 0 15px 50px rgba(0,0,0,${isDark ? '0.5' : '0.2'})`),
                backdropFilter: isExpanding ? "none" : (isFrosted ? "blur(20px) saturate(1.2)" : "none"),
                opacity: finalOpacity,
                transform: isVisible 
                    ? (isExpanding ? "translateY(0) scale(1) perspective(800px) rotateY(0deg)" : "translateY(0) scale(1) perspective(800px) rotateY(-8deg)") 
                    : "translateY(15px) scale(0.95) perspective(800px) rotateY(-8deg)",
                transformOrigin: "bottom right",
                borderRadius: isExpanding ? "0px" : "2px",
            }}
        >
            <div className={`flex items-center justify-between pb-3 border-b transition-opacity duration-300 ${isExpanding ? 'opacity-0' : 'opacity-100'} w-full ${isFrosted ? 'border-zinc-300/40' : (isDark ? 'border-zinc-700' : 'border-zinc-200')}`}>
                <h3 className={`font-bold text-xl ${isFrosted ? 'text-zinc-400' : (isDark ? 'text-zinc-100' : 'text-zinc-900')}`}
                    style={isFrosted ? {} : { color: activeFace.accent.replace(/[\d.]+\)$/g, '1)') }}>
                    {isFrosted ? '🔒 ' : ''}{activeFace.label}
                </h3>
                <span className={`text-xs font-mono ${isFrosted ? 'text-zinc-400/60' : (isDark ? 'text-zinc-500' : 'text-zinc-400')}`}>~/{activeFace.slug}</span>
            </div>

            {!isFrosted && activeFace.image && (
                <div className={`w-full aspect-video overflow-hidden relative shadow-inner rounded-sm transition-opacity duration-300 ${isExpanding ? 'opacity-0' : 'opacity-100'} ${isDark ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-100 border border-zinc-200'}`}>
                    <img src={activeFace.image} alt={activeFace.label} className="w-full h-full object-cover" />
                </div>
            )}

            <div className={`font-mono text-[13px] min-h-[85px] leading-relaxed p-4 border overflow-hidden rounded-sm transition-opacity duration-300 ${isExpanding ? 'opacity-0' : 'opacity-100'} w-full ${isFrosted
                ? 'text-zinc-400/70 bg-white/30 border-zinc-200/40'
                : (isDark
                    ? 'text-zinc-300 bg-zinc-800/80 border-zinc-700 shadow-inner'
                    : 'text-zinc-700 bg-zinc-50/80 border-zinc-200 shadow-inner')
                }`}
                style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                <div style={{ display: 'table-row' }}>
                    <span className={`font-bold select-none ${isFrosted ? 'text-zinc-400/50' : (isDark ? 'text-zinc-500' : 'text-zinc-600')}`} style={{ display: 'table-cell', width: '1.2em', verticalAlign: 'top' }}>&gt;</span>
                    <span style={{ display: 'table-cell', verticalAlign: 'top' }}>
                        <TerminalText text={activeFace.description} isReturning={isReturning} />
                        <span className={`animate-pulse inline-block w-2 h-4 ml-1.5 align-middle ${isFrosted ? 'bg-zinc-300/50' : (isDark ? 'bg-zinc-500' : 'bg-zinc-400')}`}></span>
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Extract face centers & orientations from actual geometry ─────────────────
interface ComputedFace {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    data: FaceData;
}

function computeFaces(geo: THREE.DodecahedronGeometry | THREE.BufferGeometry, alignQ?: THREE.Quaternion): ComputedFace[] {
    const posAttr = geo.getAttribute("position");
    const index = geo.getIndex();
    const triCount = index ? index.count / 3 : posAttr.count / 3;

    // Group triangles by shared normal → recovers the 12 pentagonal faces
    const groups: { verts: THREE.Vector3[]; normal: THREE.Vector3 }[] = [];

    for (let t = 0; t < triCount; t++) {
        const base = t * 3;
        const a = getTriVert(posAttr, index, base, 0);
        const b = getTriVert(posAttr, index, base, 1);
        const c = getTriVert(posAttr, index, base, 2);
        const normal = new THREE.Triangle(a, b, c).getNormal(new THREE.Vector3());

        let matched = false;
        for (const g of groups) {
            if (g.normal.dot(normal) > 0.99) {
                g.verts.push(a, b, c);
                matched = true;
                break;
            }
        }
        if (!matched) {
            groups.push({ verts: [a, b, c], normal });
        }
    }

    return groups.map((g) => {
        // Extract the 5 unique vertices of the pentagon explicitly
        const unique: THREE.Vector3[] = [];
        for (const v of g.verts) {
            if (!unique.some((u) => u.distanceTo(v) < 0.001)) unique.push(v);
        }

        // True geometric centroid using unique vertices
        const center = new THREE.Vector3();
        unique.forEach((v) => center.add(v));
        center.divideScalar(unique.length);

        // Match to closest FACE_DEFINITION by normal direction
        // Rotate the definition direction by alignQ so it matches the rotated geometry
        const n = g.normal.clone().normalize();
        let best = FACE_DEFINITIONS[0];
        let bestDot = -Infinity;
        for (const fd of FACE_DEFINITIONS) {
            const dir = new THREE.Vector3(...fd.direction).normalize();
            if (alignQ) dir.applyQuaternion(alignQ);
            const d = dir.dot(n);
            if (d > bestDot) {
                bestDot = d;
                best = fd;
            }
        }

        // Build orientation from geometry: compute a visual up based on world orientation
        const zAxis = n;
        let worldUp = new THREE.Vector3(0, 1, 0);
        if (Math.abs(n.dot(worldUp)) > 0.99) {
            worldUp = new THREE.Vector3(0, 0, 1);
        }
        const visualUp = worldUp.clone().sub(n.clone().multiplyScalar(worldUp.dot(n))).normalize();

        // CSS "top" (Y=0) is mapped to local +Y by Drei's CSS3DObject. We want CSS top to be a geometric vertex.
        // Therefore, local +Y (up) must point from center to a vertex.
        // We pick the vertex that points closest to visualUp for maximum text readability.
        let bestVertex = unique[0];
        let maxDot = -Infinity;
        for (const v of unique) {
            const dir = v.clone().sub(center).normalize();
            const d = dir.dot(visualUp);
            if (d > maxDot) {
                maxDot = d;
                bestVertex = v;
            }
        }

        const up = bestVertex.clone().sub(center).normalize();
        const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
        const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
        const mat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(mat);

        // Position exactly on the surface to prevent parallax clipping
        const position = center.clone();

        return { position, quaternion, data: best };
    });
}

function FacePanel({ face, onHoverFace, onClickFace, isDark, isReturning }: { face: ComputedFace, onHoverFace: (face: FaceData | null) => void, onClickFace: (face: FaceData) => void, isDark: boolean, isReturning: boolean }) {
    const groupRef = useRef<THREE.Group>(null);
    const htmlRef = useRef<HTMLDivElement>(null);
    // Use state instead of ref for visibility to avoid reading ref during render
    const [isFacingFront, setIsFacingFront] = useState(true);

    useFrame(({ camera }) => {
        if (!groupRef.current || !htmlRef.current) return;
        const worldPos = new THREE.Vector3();
        groupRef.current.getWorldPosition(worldPos);

        const worldNormal = new THREE.Vector3(0, 0, 1);
        worldNormal.transformDirection(groupRef.current.matrixWorld);

        const cameraDir = new THREE.Vector3().subVectors(camera.position, worldPos).normalize();

        // If dot product > 0, the face normal is pointing roughly towards the camera
        const isFacing = worldNormal.dot(cameraDir) > -0.05;

        if (isFacingFront !== isFacing) {
            setIsFacingFront(isFacing);
            htmlRef.current.style.opacity = isFacing ? "1" : "0";
            htmlRef.current.style.pointerEvents = isFacing ? "auto" : "none";
            if (!isFacing) {
                onHoverFace(null); // Force unhover if it rotates away while hovered
            }
        }
    });

    return (
        <group ref={groupRef} position={face.position} quaternion={face.quaternion}>
            <Html
                transform
                center
                distanceFactor={6}
                zIndexRange={[1000, 0]}
                wrapperClass="z-50"
            >
                <div ref={htmlRef} style={{ transition: 'opacity 0.4s ease-in-out', pointerEvents: 'auto' }}>
                    {face.data.renderContent({
                        onMouseEnter: () => { if (isFacingFront) onHoverFace(face.data); },
                        onMouseLeave: () => { if (isFacingFront) onHoverFace(null); },
                        onClick: (e: React.MouseEvent) => { if (isFacingFront) onClickFace(face.data); }
                    }, isDark, isReturning)}
                </div>
            </Html>
        </group>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dodecahedron({ isReturning = false }: { isReturning?: boolean }) {
    const PENT_REVEAL_END = isReturning ? 1 : 2;
    const EDGE_DRAW_END = isReturning ? 2.5 : 5;
    const PANEL_DELAY_MS = EDGE_DRAW_END * 1000;

    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const groupRef = useRef<THREE.Group>(null);
    const pentGroupRef = useRef<THREE.Group>(null);
    const edgeLinesGroupRef = useRef<THREE.Group>(null);

    const [hoveredFace, setHoveredFace] = useState<FaceData | null>(null);
    const hoveredFaceRef = useRef<FaceData | null>(null);
    
    const [expandingFace, setExpandingFace] = useState<FaceData | null>(null);

    const onHoverFace = (face: FaceData | null) => {
        if (expandingFace) return;
        setHoveredFace(face);
        hoveredFaceRef.current = face;
    };

    const onClickFace = (face: FaceData) => {
        if (face.isFrosted || expandingFace) return;
        setExpandingFace(face);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('start-expansion'));
        }
        setTimeout(() => {
            router.push(`/projects/${face.slug}`);
        }, 1950);
    };

    // Pre-rotated dodecahedron with one face at -Y
    const { geo: alignedGeo, alignQ, bottomCenter } = useMemo(() => createAlignedDodecGeo(), []);
    const faces = useMemo(() => computeFaces(alignedGeo, alignQ), [alignedGeo, alignQ]);
    const pentGeo = useMemo(() => createPentagonGeo(), []);
    const pentPoints = useMemo(() => getPentagonPoints(), []);
    const [showPanels, setShowPanels] = useState(false);
    const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 4), []);

    // Sorted edges from aligned geometry
    const sortedEdges = useMemo(() => extractSortedEdges(alignedGeo), [alignedGeo]);
    const bcx = bottomCenter.x, bcy = bottomCenter.y, bcz = bottomCenter.z;

    const edgeCylindersRef = useRef<THREE.Mesh[]>([]);
    const pentCylindersRef = useRef<THREE.Mesh[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => setShowPanels(true), PANEL_DELAY_MS);
        return () => clearTimeout(timer);
    }, []);

    // Helper to update a cylinder mesh between two points
    const updateCylinder = (mesh: THREE.Mesh, p1: THREE.Vector3, p2: THREE.Vector3) => {
        const dist = p1.distanceTo(p2);
        if (dist < 0.0001) {
            mesh.visible = false;
            return;
        }
        mesh.visible = true;
        mesh.position.copy(p1).lerp(p2, 0.5);
        mesh.scale.set(1, dist, 1);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
    };

    const v1 = useMemo(() => new THREE.Vector3(), []);
    const v2 = useMemo(() => new THREE.Vector3(), []);

    // Tilt quaternion: pentagon +Z normal → face-down -Y
    const tiltQuat = useMemo(
        () => new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, -1, 0)
        ), []);


    const identityQuat = useMemo(() => new THREE.Quaternion(), []);
    const tempQuat = useMemo(() => new THREE.Quaternion(), []);
    const tumbleQuat = useMemo(() => new THREE.Quaternion(), []);
    const originVec = useMemo(() => new THREE.Vector3(0, 0, 0), []);
    const qx = useMemo(() => new THREE.Quaternion(), []);
    const qy = useMemo(() => new THREE.Quaternion(), []);
    const axisX = useMemo(() => new THREE.Vector3(1, 0, 0), []);
    const axisY = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    const axisZ = useMemo(() => new THREE.Vector3(0, 0, 1), []); // Z axis for flat spin

    const speedRef = useRef(ROTATE_SPEED);
    const tumbleAngleRef = useRef(0);

    useFrame(({ clock, camera }, delta) => {
        if (!groupRef.current) return;
        const elapsed = clock.getElapsedTime();

        const pent = pentGroupRef.current;

        if (elapsed < PENT_REVEAL_END) {
            // Phase 0: Pentagon reveal with UPWARDS clipping plane
            groupRef.current.quaternion.copy(tiltQuat);

            if (pent) {
                pent.visible = true;
                pent.scale.setScalar(1);
                // Already at bottom face position
                pent.position.copy(bottomCenter);
            }
            if (edgeLinesGroupRef.current) edgeLinesGroupRef.current.visible = false;

            pentCylindersRef.current.forEach((mesh, i) => {
                if (mesh) updateCylinder(mesh, pentPoints[i], pentPoints[i + 1]);
            });

            const progress = elapsed / PENT_REVEAL_END;
            const ease = progress * progress * (3 - 2 * progress); // smoothstep

            // Limit moves from -3.5 to 0.5 (world Y).
            // Normal (0, 1, 0), so equation: y > limit is clipped.
            // constant = -limit
            const limit = -3.5 + ease * 4; // -3.5 to 0.5
            clipPlane.constant = -limit;

        } else if (elapsed < EDGE_DRAW_END) {
            // Phase 1: edges draw bottom-to-top from pentagon corners
            // Keep base orientation (no tumble yet)
            groupRef.current.quaternion.copy(tiltQuat);

            const p = (elapsed - PENT_REVEAL_END) / (EDGE_DRAW_END - PENT_REVEAL_END);
            const ease = 1 - Math.pow(1 - p, 2); // ease-out quad

            // Maintain fully revealed plane
            clipPlane.constant = -0.5;

            // Pentagon disappears in place at start of edge drawing
            if (pent) {
                pent.visible = ease < 0.2;
                pent.scale.setScalar(1);
                pent.position.copy(bottomCenter);
            }

            pentCylindersRef.current.forEach((mesh, i) => {
                if (mesh) updateCylinder(mesh, pentPoints[i], pentPoints[i + 1]);
            });

            // Reveal edges bottom-to-top using cylinders
            if (edgeLinesGroupRef.current) {
                edgeLinesGroupRef.current.visible = true;
                const total = sortedEdges.length;
                const revealCount = Math.ceil(ease * total);

                for (let i = 0; i < total; i++) {
                    const mesh = edgeCylindersRef.current[i];
                    if (!mesh) continue;
                    const seg = sortedEdges[i];
                    if (i < revealCount) {
                        const edgeProgress = Math.min(1, (ease * total - i) / 3);
                        const ep = edgeProgress * edgeProgress;
                        // Draw from point A to point B linearly
                        v1.set(seg.ax, seg.ay, seg.az);
                        v2.set(
                            seg.ax + (seg.bx - seg.ax) * ep,
                            seg.ay + (seg.by - seg.ay) * ep,
                            seg.az + (seg.bz - seg.az) * ep
                        );
                        updateCylinder(mesh, v1, v2);
                    } else {
                        mesh.visible = false;
                    }
                }
            }

        } else {
            // Phase 2+: construction complete, begin slow tumble
            if (pent) pent.visible = false;

            // Slow tumble starting FROM the base orientation
            const isHovered = hoveredFaceRef.current !== null;
            const targetSpeed = isHovered ? ROTATE_SPEED * 0.15 : ROTATE_SPEED;
            // Frame-independent lerp for smooth transition
            speedRef.current = THREE.MathUtils.lerp(speedRef.current, targetSpeed, 5 * delta);

            tumbleAngleRef.current += speedRef.current * delta;

            const tumbleT = tumbleAngleRef.current;
            qx.setFromAxisAngle(axisX, tumbleT);
            qy.setFromAxisAngle(axisY, -tumbleT);
            tumbleQuat.copy(qx).multiply(qy);
            tempQuat.copy(tumbleQuat).premultiply(tiltQuat);
            groupRef.current.quaternion.copy(tempQuat);

            // Set all edges to final positions
            if (edgeLinesGroupRef.current) {
                edgeLinesGroupRef.current.visible = true;
                for (let i = 0; i < sortedEdges.length; i++) {
                    const mesh = edgeCylindersRef.current[i];
                    if (!mesh) continue;
                    const seg = sortedEdges[i];
                    v1.set(seg.ax, seg.ay, seg.az);
                    v2.set(seg.bx, seg.by, seg.bz);
                    updateCylinder(mesh, v1, v2);
                }
            }
        }
    });

    const overlayPortal = useRef<HTMLElement>(null!);
    useEffect(() => {
        overlayPortal.current = document.body;
    }, []);

    return (
        <group ref={groupRef}>
            {/* ── Flat pentagon cylinders (phase 0-1) ── */}
            <group ref={pentGroupRef} visible={!expandingFace}>
                <mesh>
                    <primitive object={pentGeo} attach="geometry" />
                    <meshBasicMaterial color={isDark ? "#18181b" : "#ffffff"} side={THREE.DoubleSide} clippingPlanes={[clipPlane]} />
                </mesh>
                {pentPoints.slice(0, 5).map((_, i) => (
                    <mesh key={`pedge-${i}`} ref={(el) => { if (el) pentCylindersRef.current[i] = el; }}>
                        <cylinderGeometry args={[LINE_THICKNESS, LINE_THICKNESS, 1, 6]} />
                        <meshBasicMaterial color={isDark ? "#a1a1aa" : "#000000"} clippingPlanes={[clipPlane]} />
                    </mesh>
                ))}
            </group>

            {/* ── Morphing edges cylinders (phase 2+) ── */}
            <group ref={edgeLinesGroupRef} visible={!expandingFace}>
                {sortedEdges.map((_, i) => (
                    <mesh key={`edge-${i}`} ref={(el) => { if (el) edgeCylindersRef.current[i] = el; }}>
                        <cylinderGeometry args={[LINE_THICKNESS, LINE_THICKNESS, 1, 6]} />
                        <meshBasicMaterial color={isDark ? "#a1a1aa" : "#000000"} />
                    </mesh>
                ))}
            </group>

            {/* ── Face panels — positioned from aligned geometry ── */}
            {showPanels &&
                faces.map((face, i) => (
                    <FacePanel key={`face-${i}`} face={face} onHoverFace={onHoverFace} onClickFace={onClickFace} isDark={isDark} isReturning={isReturning} />
                ))}

            {/* ── 2D Overlay Window (Shown on hover) ── */}
            {showPanels && (
                <Html center portal={overlayPortal} zIndexRange={[999999, 999998]} style={{ pointerEvents: 'none' }}>
                    <div className="pointer-events-none w-[100vw] h-[100vh] flex items-center justify-end relative z-[999999] overflow-hidden">
                        <ProjectDetailsWindow face={expandingFace || hoveredFace} isExpanding={!!expandingFace} isDark={isDark} isReturning={isReturning} />
                    </div>
                </Html>
            )}
        </group>
    );
}
