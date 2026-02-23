"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import Link from 'next/link';
import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────────────────
const RADIUS = 2.5;
const phi = (1 + Math.sqrt(5)) / 2;
const ROTATE_SPEED = (2 * Math.PI) / 30; // 360° per 30s (slow tumble)
const LINE_THICKNESS = 0.025; // Thicker wireframe

// Phase timing (seconds)
const SPIN_PHASE = 2;     // pentagon spins in place
const TILT_END = 4;       // pentagon tilts + moves to bottom face
const EDGE_DRAW_END = 7;  // edges fully drawn
const PANEL_DELAY_MS = EDGE_DRAW_END * 1000;

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
        const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
        const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);
        // After tilt R_x(π/2): world_Y = -local_z, so visual bottom = max local z
        segs.push({ ax, ay, az, bx, by, bz, sortY: -Math.max(az, bz) });
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
    renderContent: (hoverHandlers: { onMouseEnter: () => void, onMouseLeave: () => void }) => React.ReactNode;
}

function FaceCard({
    accent,
    slug,
    children,
    index = 0,
    onMouseEnter,
    onMouseLeave,
}: {
    accent: string;
    slug: string;
    children: React.ReactNode;
    index?: number;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}) {
    const delay = index * 0.15;
    return (
        <Link href={`/projects/${slug}`}>
            <div
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className="animate-line flex flex-col items-center justify-center gap-2 p-5 text-center cursor-pointer transition-transform hover:scale-105"
                style={{
                    width: "205px",
                    height: "205px",
                    clipPath: PENTAGON_CLIP,
                    background: "rgba(255, 255, 255, 1)",
                    border: "1.5px solid rgba(0,0,0,0.15)",
                    boxShadow: `inset 0 0 0 1.5px ${accent}, 0 2px 8px rgba(0,0,0,0.08)`,
                    animationDelay: `${delay}s`,
                }}
            >
                {children}
            </div>
        </Link>
    );
}

const FACE_DEFINITIONS: FaceData[] = [
    {
        direction: [0, 1, phi],
        label: "Portrait",
        slug: "portrait",
        accent: "rgba(6,182,212,0.6)",
        image: "/images/portrait/portrait.jpg",
        description: "Simon Jin. Robotics, ML, and Software Engineering. Passionate about building intelligent systems.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(6,182,212,0.6)" slug="portrait" index={0} {...handlers}>
                <img src="/images/portrait/SJ.png" alt="Portrait" className="w-15 h-15 " />
                <h2 className="text-sm font-bold text-zinc-900">Simon Shenghua Jin</h2>
                <p className="text-[9px] tracking-widest text-cyan-600 uppercase">
                    Robotics | ML | 3D Design
                </p>
            </FaceCard>
        ),
    },
    {
        direction: [0, -1, -phi],
        label: "Footer",
        slug: "footer",
        accent: "rgba(120,120,120,0.4)",
        description: "Connect with me on LinkedIn and GitHub, or download my resume to see my full experience.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(120,120,120,0.4)" slug="footer" index={1} {...handlers}>
                <h3 className="text-sm font-bold tracking-widest text-zinc-600 uppercase mb-2">Connect</h3>
                <div className="flex gap-4">
                    <img src="/images/footer/linkedin.svg" alt="Linkedin" className="w-7 h-7 hover:scale-110 transition-transform cursor-pointer" />
                    <img src="/images/footer/github.svg" alt="Github" className="w-7 h-7 hover:scale-110 transition-transform cursor-pointer" />
                    <img src="/images/footer/resume.svg" alt="Resume" className="w-7 h-7 hover:scale-110 transition-transform cursor-pointer" />
                </div>
            </FaceCard>
        ),
    },
    {
        direction: [0, 1, -phi],
        label: "HardHaQ",
        slug: "hardhaq",
        accent: "rgba(245,158,11,0.5)",
        image: "/images/hardhaq/circuit.png",
        description: "1st Place winner at HardHaQ 2025, a quantum hardware hackathon hosted by the North American Quantum Consortium. ",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(245,158,11,0.5)" slug="hardhaq" index={2} {...handlers}>
                <img src="/images/hardhaq/nasc.png" alt="HardHaQ" className="w-15 h-15 rounded-full" />
                <span className="text-[8px] font-bold tracking-widest text-amber-600 uppercase">🏆 1st Place</span>
                <h3 className="text-xs font-bold text-zinc-900">HardHaQ 2025</h3>
                <p className="text-[9px] text-zinc-500">Quantum Hardware Hackathon</p>
            </FaceCard>
        ),
    },
    {
        direction: [0, -1, phi],
        label: "HackML",
        slug: "hackml",
        accent: "rgba(139,92,246,0.5)",
        image: "https://placehold.co/800x600/ede9fe/6d28d9?text=HackML",
        description: "Developed advanced machine learning models with robust K-fold cross-validation techniques for optimal predictive performance.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(139,92,246,0.5)" slug="hackml" index={3} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-violet-600 uppercase">Machine Learning</span>
                <h3 className="text-xs font-bold text-zinc-900">HackML</h3>
                <p className="text-[9px] text-zinc-500">New Grade Study</p>
            </FaceCard>
        ),
    },
    {
        direction: [1, phi, 0],
        label: "Macropad",
        slug: "macropad",
        accent: "rgba(16,185,129,0.5)",
        image: "https://placehold.co/800x600/d1fae5/059669?text=Macropad",
        description: "Engineered a custom hall-effect macropad from scratch, featuring a custom KiCad PCB and embedded firmware.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(16,185,129,0.5)" slug="macropad" index={4} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-emerald-600 uppercase">Hardware</span>
                <h3 className="text-xs font-bold text-zinc-900">Custom Macropad</h3>
                <p className="text-[9px] text-zinc-500">Hall-effect · KiCad PCB</p>
            </FaceCard>
        ),
    },
    {
        direction: [-1, phi, 0],
        label: "Leadership",
        slug: "leadership",
        accent: "rgba(244,63,94,0.5)",
        image: "https://placehold.co/800x600/ffe4e6/e11d48?text=Leadership",
        description: "Served as 3-year captain for FTC Parabellum. Led the team to compete in the European Internationals and mentored junior members.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(244,63,94,0.5)" slug="leadership" index={5} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-rose-600 uppercase">Leadership</span>
                <h3 className="text-xs font-bold text-zinc-900">FTC Parabellum</h3>
                <p className="text-[9px] text-zinc-500">3-Year Captain · EU Intl.</p>
            </FaceCard>
        ),
    },
    {
        direction: [1, -phi, 0],
        label: "HUDson",
        slug: "hudson",
        accent: "rgba(59,130,246,0.5)",
        image: "https://placehold.co/800x600/dbeafe/2563eb?text=HUDson",
        description: "Software project built at nwHacks. Integrated ElevenLabs API for advanced text-to-speech functionality in a head-up display system.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(59,130,246,0.5)" slug="hudson" index={6} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-blue-600 uppercase">Software</span>
                <h3 className="text-xs font-bold text-zinc-900">HUDson</h3>
                <p className="text-[9px] text-zinc-500">nwHacks · ElevenLabs API</p>
            </FaceCard>
        ),
    },
    {
        direction: [-1, -phi, 0],
        label: "Air Mouse",
        slug: "air-mouse",
        accent: "rgba(249,115,22,0.5)",
        image: "https://placehold.co/800x600/ffedd5/ea580c?text=Air+Mouse",
        description: "Created an intuitive air mouse device during JourneyHacks. Utilized sensor fusion with IMUs to translate physical gestures to stable cursor movements.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(249,115,22,0.5)" slug="air-mouse" index={7} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-orange-600 uppercase">Integration</span>
                <h3 className="text-xs font-bold text-zinc-900">Air Mouse</h3>
                <p className="text-[9px] text-zinc-500">JourneyHacks · IMU Fusion</p>
            </FaceCard>
        ),
    },
    {
        direction: [phi, 0, 1],
        label: "Solder Bot",
        slug: "solder-bot",
        accent: "rgba(20,184,166,0.5)",
        image: "https://placehold.co/800x600/ccfbf1/0d9488?text=Solder+Bot",
        description: "A teleoperated robotic arm specifically designed for precision soldering tasks, leveraging the Dum-E mechanical architecture.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(20,184,166,0.5)" slug="solder-bot" index={8} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-teal-600 uppercase">Mechatronics</span>
                <h3 className="text-xs font-bold text-zinc-900">Solder Bot</h3>
                <p className="text-[9px] text-zinc-500">Dum-E · Teleoperation</p>
            </FaceCard>
        ),
    },
    {
        direction: [-phi, 0, 1],
        label: "Research",
        slug: "research",
        accent: "rgba(99,102,241,0.5)",
        image: "https://placehold.co/800x600/e0e7ff/4f46e5?text=Robotics+Lab",
        description: "Conducting research at the Robotics Lab. Developing automated pipelines for OBJ to URDF conversion using ROS and Docker.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(99,102,241,0.5)" slug="research" index={9} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-indigo-600 uppercase">Research</span>
                <h3 className="text-xs font-bold text-zinc-900">Robotics Lab</h3>
                <p className="text-[9px] text-zinc-500">OBJ→URDF · ROS · Docker</p>
            </FaceCard>
        ),
    },
    {
        direction: [phi, 0, -1],
        label: "Quant",
        slug: "quant",
        accent: "rgba(234,179,8,0.5)",
        image: "https://placehold.co/800x600/fef08a/ca8a04?text=Quant+Finance",
        description: "Competed in the CPABC Competition focusing on quantitative finance. Implemented portfolio optimization models.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(234,179,8,0.5)" slug="quant" index={10} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-yellow-600 uppercase">Quant Finance</span>
                <h3 className="text-xs font-bold text-zinc-900">CPABC Competition</h3>
                <p className="text-[9px] text-zinc-500">Portfolio Optimization</p>
            </FaceCard>
        ),
    },
    {
        direction: [-phi, 0, -1],
        label: "Awards",
        slug: "awards",
        accent: "rgba(236,72,153,0.5)",
        image: "https://placehold.co/800x600/fce7f3/db2777?text=Awards",
        description: "Recipient of prestigious academic awards, including the Leduc and SFU Alumni scholarships. Expanding horizons in academics.",
        renderContent: (handlers) => (
            <FaceCard accent="rgba(236,72,153,0.5)" slug="awards" index={11} {...handlers}>
                <span className="text-[8px] font-bold tracking-widest text-pink-600 uppercase">Awards</span>
                <h3 className="text-xs font-bold text-zinc-900">Scholarships</h3>
                <p className="text-[9px] text-zinc-500">Leduc · SFU Alumni</p>
            </FaceCard>
        ),
    },
];

// ─── Popup Window Components ──────────────────────────────────────────────────
function TerminalText({ text }: { text: string }) {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        setDisplayedText("");
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayedText(prev => prev + text[i]);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 30);
        return () => clearInterval(interval);
    }, [text]);

    return <span>{displayedText}</span>;
}

function BlinkingImage({ src, alt }: { src: string, alt: string }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(false);
        let count = 0;
        const totalBlinks = 4;

        const blinkInterval = setInterval(() => {
            setVisible(v => !v);
            count++;
            if (count > totalBlinks * 2 - 1) {
                clearInterval(blinkInterval);
                setVisible(true);
            }
        }, 80);

        return () => clearInterval(blinkInterval);
    }, [src]);

    return (
        <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-75 ${visible ? "opacity-100" : "opacity-0"}`}
        />
    );
}

function ProjectDetailsWindow({ face }: { face: FaceData | null }) {
    // Keep track of the last active face so the window elegantly fades out when closing 
    // instead of instantly snapping to empty content.
    const [activeFace, setActiveFace] = useState<FaceData | null>(null);
    const [prevFace, setPrevFace] = useState<FaceData | null>(null);
    const isVisible = face !== null;

    if (face !== prevFace) {
        setPrevFace(face);
        if (face) setActiveFace(face);
    }

    if (!activeFace) return null;

    return (
        <div
            className={`w-[400px] p-6 flex flex-col gap-5 z-50 pointer-events-none transition-all duration-300 ease-out`}
            style={{
                background: "rgba(255, 255, 255, 0.95)",
                border: "1px solid rgba(0,0,0,0.15)",
                boxShadow: `inset 0 0 0 2px ${activeFace.accent.replace(/[\d.]+\)$/g, '0.8)')}, 0 15px 50px rgba(0,0,0,0.2)`,
                backdropFilter: "blur(16px)",
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0) scale(1) perspective(800px) rotateY(-8deg)" : "translateY(15px) scale(0.95) perspective(800px) rotateY(-8deg)",
                transformOrigin: "bottom right",
                borderRadius: "2px",
            }}
        >
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="font-bold text-xl text-zinc-900" style={{ color: activeFace.accent.replace(/[\d.]+\)$/g, '1)') }}>{activeFace.label}</h3>
                <span className="text-xs font-mono text-zinc-400">~/{activeFace.slug}</span>
            </div>

            {activeFace.image && (
                <div className="w-full aspect-video bg-zinc-100 overflow-hidden relative border border-zinc-200 shadow-inner rounded-sm">
                    <BlinkingImage src={activeFace.image} alt={activeFace.label} />
                </div>
            )}

            <div className="font-mono text-[13px] text-zinc-700 min-h-[85px] leading-relaxed bg-zinc-50/80 p-4 border border-zinc-200 shadow-inner overflow-hidden rounded-sm">
                <span className="text-zinc-600 font-bold mr-2 select-none">&gt;</span>
                <TerminalText text={activeFace.description} />
                <span className="animate-pulse inline-block w-2 h-4 bg-zinc-400 ml-1.5 align-middle"></span>
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

function FacePanel({ face, onHoverFace }: { face: ComputedFace, onHoverFace: (face: FaceData | null) => void }) {
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
                        onMouseLeave: () => { if (isFacingFront) onHoverFace(null); }
                    })}
                </div>
            </Html>
        </group>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dodecahedron() {
    const groupRef = useRef<THREE.Group>(null);
    const pentGroupRef = useRef<THREE.Group>(null);
    const edgeLinesGroupRef = useRef<THREE.Group>(null);

    const [hoveredFace, setHoveredFace] = useState<FaceData | null>(null);
    const hoveredFaceRef = useRef<FaceData | null>(null);

    const onHoverFace = (face: FaceData | null) => {
        setHoveredFace(face);
        hoveredFaceRef.current = face;
    };

    // Pre-rotated dodecahedron with one face at -Y
    const { geo: alignedGeo, alignQ, bottomCenter } = useMemo(() => createAlignedDodecGeo(), []);
    const faces = useMemo(() => computeFaces(alignedGeo, alignQ), [alignedGeo, alignQ]);
    const pentGeo = useMemo(() => createPentagonGeo(), []);
    const pentPoints = useMemo(() => getPentagonPoints(), []);
    const [showPanels, setShowPanels] = useState(false);

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

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const elapsed = clock.getElapsedTime();

        const pent = pentGroupRef.current;

        if (elapsed < SPIN_PHASE) {
            // Phase 0: Pentagon spins in place (facing camera) on Z axis + scales up
            // Easing for acceleration/deceleration
            const p = elapsed / SPIN_PHASE;
            const ease = p * p * (3 - 2 * p);
            const spinAngle = ease * Math.PI * 4; // 2 full revolutions
            const scale = p; // Start small (0) -> End full size (1)
            groupRef.current.quaternion.setFromAxisAngle(axisZ, spinAngle);

            if (pent) {
                pent.visible = true;
                pent.scale.setScalar(Math.max(0.01, scale));
                pent.position.set(0, 0, 0);
            }
            if (edgeLinesGroupRef.current) edgeLinesGroupRef.current.visible = false;

            // Update initial pentagon cylinders
            pentCylindersRef.current.forEach((mesh, i) => {
                if (mesh) updateCylinder(mesh, pentPoints[i], pentPoints[i + 1]);
            });

        } else if (elapsed < TILT_END) {
            // Phase 1: Pentagon tilts + moves from center to bottom face position
            const progress = (elapsed - SPIN_PHASE) / (TILT_END - SPIN_PHASE);
            const ease = progress * progress * (3 - 2 * progress); // smoothstep
            tempQuat.slerpQuaternions(identityQuat, tiltQuat, ease);
            groupRef.current.quaternion.copy(tempQuat);

            if (pent) {
                pent.visible = true;
                pent.scale.setScalar(1);
                pent.position.lerpVectors(originVec, bottomCenter, ease);
            }
            if (edgeLinesGroupRef.current) edgeLinesGroupRef.current.visible = false;

            pentCylindersRef.current.forEach((mesh, i) => {
                if (mesh) updateCylinder(mesh, pentPoints[i], pentPoints[i + 1]);
            });

        } else if (elapsed < EDGE_DRAW_END) {
            // Phase 2: edges draw bottom-to-top from pentagon corners
            // Keep tilt orientation (no tumble yet)
            groupRef.current.quaternion.copy(tiltQuat);

            const p = (elapsed - TILT_END) / (EDGE_DRAW_END - TILT_END);
            const ease = 1 - Math.pow(1 - p, 2); // ease-out quad

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
                        v1.set(bcx + (seg.ax - bcx) * ep, bcy + (seg.ay - bcy) * ep, bcz + (seg.az - bcz) * ep);
                        v2.set(bcx + (seg.bx - bcx) * ep, bcy + (seg.by - bcy) * ep, bcz + (seg.bz - bcz) * ep);
                        updateCylinder(mesh, v1, v2);
                    } else {
                        mesh.visible = false;
                    }
                }
            }

        } else {
            // Phase 3+: construction complete, begin slow tumble
            if (pent) pent.visible = false;

            // Slow tumble starting FROM the tilt orientation
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

    return (
        <group ref={groupRef}>
            {/* ── Flat pentagon cylinders (phase 0-1) ── */}
            <group ref={pentGroupRef}>
                <mesh>
                    <primitive object={pentGeo} attach="geometry" />
                    <meshBasicMaterial color="rgb(255, 255, 255)" side={THREE.DoubleSide} />
                </mesh>
                {pentPoints.slice(0, 5).map((_, i) => (
                    <mesh key={`pedge-${i}`} ref={(el) => { if (el) pentCylindersRef.current[i] = el; }}>
                        <cylinderGeometry args={[LINE_THICKNESS, LINE_THICKNESS, 1, 6]} />
                        <meshBasicMaterial color="#000000" />
                    </mesh>
                ))}
            </group>

            {/* ── Morphing edges cylinders (phase 2+) ── */}
            <group ref={edgeLinesGroupRef}>
                {sortedEdges.map((_, i) => (
                    <mesh key={`edge-${i}`} ref={(el) => { if (el) edgeCylindersRef.current[i] = el; }}>
                        <cylinderGeometry args={[LINE_THICKNESS, LINE_THICKNESS, 1, 6]} />
                        <meshBasicMaterial color="#000000" />
                    </mesh>
                ))}
            </group>

            {/* ── Face panels — positioned from aligned geometry ── */}
            {showPanels &&
                faces.map((face, i) => (
                    <FacePanel key={`face-${i}`} face={face} onHoverFace={onHoverFace} />
                ))}

            {/* ── 2D Overlay Window (Shown on hover) ── */}
            {showPanels && (
                <Html center zIndexRange={[200, 100]}>
                    <div className="pointer-events-none w-[100vw] h-[100vh] flex items-center justify-end relative z-50">
                        <div className="mr-[5vw] mb-12">
                            <ProjectDetailsWindow face={hoveredFace} />
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}
