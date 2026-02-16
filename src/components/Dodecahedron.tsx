"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────────────────
const RADIUS = 2.5;
const phi = (1 + Math.sqrt(5)) / 2;
const AUTO_ROTATE_SPEED = 0.15;
const PANEL_DELAY_MS = 16_000;

// Pentagon clip-path matching a centered regular pentagon
const PENTAGON_CLIP =
    "polygon(50% 0%, 97.55% 34.55%, 79.39% 90.45%, 20.61% 90.45%, 2.45% 34.55%)";

// ─── Face Data ───────────────────────────────────────────────────────────────
interface FaceData {
    direction: [number, number, number];
    label: string;
    accent: string;
    content: React.ReactNode;
}

function FaceCard({
    accent,
    children,
    index = 0,
}: {
    accent: string;
    children: React.ReactNode;
    index?: number;
}) {
    const delay = 16 + index * 0.3;
    return (
        <div
            className="animate-line flex flex-col items-center justify-center gap-1 p-4 text-center"
            style={{
                width: "160px",
                height: "160px",
                clipPath: PENTAGON_CLIP,
                background: "rgba(255, 255, 255, 0.85)",
                boxShadow: `inset 0 0 0 1.5px ${accent}`,
                animationDelay: `${delay}s`,
            }}
        >
            {children}
        </div>
    );
}

const FACE_DEFINITIONS: FaceData[] = [
    {
        direction: [0, 1, phi],
        label: "Portrait",
        accent: "rgba(6,182,212,0.6)",
        content: (
            <FaceCard accent="rgba(6,182,212,0.6)" index={0}>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600" />
                <h2 className="text-sm font-bold text-zinc-900">Simon Shenghua Jin</h2>
                <p className="text-[9px] tracking-widest text-cyan-600 uppercase">
                    Robotics | ML | Software
                </p>
            </FaceCard>
        ),
    },
    {
        direction: [0, -1, -phi],
        label: "Footer",
        accent: "rgba(120,120,120,0.4)",
        content: (
            <FaceCard accent="rgba(120,120,120,0.4)" index={1}>
                <p className="text-[9px] font-semibold tracking-widest text-zinc-500 uppercase">Connect</p>
                <div className="flex gap-2">
                    <span className="rounded bg-zinc-200 px-2 py-1 text-[9px] text-zinc-700">LinkedIn</span>
                    <span className="rounded bg-zinc-200 px-2 py-1 text-[9px] text-zinc-700">GitHub</span>
                    <span className="rounded bg-cyan-100 px-2 py-1 text-[9px] text-cyan-700">Resume</span>
                </div>
            </FaceCard>
        ),
    },
    {
        direction: [0, 1, -phi],
        label: "HardHaQ",
        accent: "rgba(245,158,11,0.5)",
        content: (
            <FaceCard accent="rgba(245,158,11,0.5)" index={2}>
                <span className="text-[8px] font-bold tracking-widest text-amber-600 uppercase">🏆 1st Place</span>
                <h3 className="text-xs font-bold text-zinc-900">HardHaQ 2026</h3>
                <p className="text-[9px] text-zinc-500">Quantum Hardware Hackathon</p>
            </FaceCard>
        ),
    },
    {
        direction: [0, -1, phi],
        label: "HackML",
        accent: "rgba(139,92,246,0.5)",
        content: (
            <FaceCard accent="rgba(139,92,246,0.5)" index={3}>
                <span className="text-[8px] font-bold tracking-widest text-violet-600 uppercase">Machine Learning</span>
                <h3 className="text-xs font-bold text-zinc-900">HackML</h3>
                <p className="text-[9px] text-zinc-500">K-fold cross-validation</p>
            </FaceCard>
        ),
    },
    {
        direction: [1, phi, 0],
        label: "Hardware",
        accent: "rgba(16,185,129,0.5)",
        content: (
            <FaceCard accent="rgba(16,185,129,0.5)" index={4}>
                <span className="text-[8px] font-bold tracking-widest text-emerald-600 uppercase">Hardware</span>
                <h3 className="text-xs font-bold text-zinc-900">Custom Macropad</h3>
                <p className="text-[9px] text-zinc-500">Hall-effect · KiCad PCB</p>
            </FaceCard>
        ),
    },
    {
        direction: [-1, phi, 0],
        label: "Leadership",
        accent: "rgba(244,63,94,0.5)",
        content: (
            <FaceCard accent="rgba(244,63,94,0.5)" index={5}>
                <span className="text-[8px] font-bold tracking-widest text-rose-600 uppercase">Leadership</span>
                <h3 className="text-xs font-bold text-zinc-900">FTC Parabellum</h3>
                <p className="text-[9px] text-zinc-500">3-Year Captain · EU Intl.</p>
            </FaceCard>
        ),
    },
    {
        direction: [1, -phi, 0],
        label: "HUDson",
        accent: "rgba(59,130,246,0.5)",
        content: (
            <FaceCard accent="rgba(59,130,246,0.5)" index={6}>
                <span className="text-[8px] font-bold tracking-widest text-blue-600 uppercase">Software</span>
                <h3 className="text-xs font-bold text-zinc-900">HUDson</h3>
                <p className="text-[9px] text-zinc-500">nwHacks · ElevenLabs API</p>
            </FaceCard>
        ),
    },
    {
        direction: [-1, -phi, 0],
        label: "Air Mouse",
        accent: "rgba(249,115,22,0.5)",
        content: (
            <FaceCard accent="rgba(249,115,22,0.5)" index={7}>
                <span className="text-[8px] font-bold tracking-widest text-orange-600 uppercase">Integration</span>
                <h3 className="text-xs font-bold text-zinc-900">Air Mouse</h3>
                <p className="text-[9px] text-zinc-500">JourneyHacks · IMU Fusion</p>
            </FaceCard>
        ),
    },
    {
        direction: [phi, 0, 1],
        label: "Solder Bot",
        accent: "rgba(20,184,166,0.5)",
        content: (
            <FaceCard accent="rgba(20,184,166,0.5)" index={8}>
                <span className="text-[8px] font-bold tracking-widest text-teal-600 uppercase">Mechatronics</span>
                <h3 className="text-xs font-bold text-zinc-900">Solder Bot</h3>
                <p className="text-[9px] text-zinc-500">Dum-E · Teleoperation</p>
            </FaceCard>
        ),
    },
    {
        direction: [-phi, 0, 1],
        label: "Research",
        accent: "rgba(99,102,241,0.5)",
        content: (
            <FaceCard accent="rgba(99,102,241,0.5)" index={9}>
                <span className="text-[8px] font-bold tracking-widest text-indigo-600 uppercase">Research</span>
                <h3 className="text-xs font-bold text-zinc-900">Robotics Lab</h3>
                <p className="text-[9px] text-zinc-500">OBJ→URDF · ROS · Docker</p>
            </FaceCard>
        ),
    },
    {
        direction: [phi, 0, -1],
        label: "Quant",
        accent: "rgba(234,179,8,0.5)",
        content: (
            <FaceCard accent="rgba(234,179,8,0.5)" index={10}>
                <span className="text-[8px] font-bold tracking-widest text-yellow-600 uppercase">Quant Finance</span>
                <h3 className="text-xs font-bold text-zinc-900">CPABC Competition</h3>
                <p className="text-[9px] text-zinc-500">Portfolio Optimization</p>
            </FaceCard>
        ),
    },
    {
        direction: [-phi, 0, -1],
        label: "Awards",
        accent: "rgba(236,72,153,0.5)",
        content: (
            <FaceCard accent="rgba(236,72,153,0.5)" index={11}>
                <span className="text-[8px] font-bold tracking-widest text-pink-600 uppercase">Awards</span>
                <h3 className="text-xs font-bold text-zinc-900">Scholarships</h3>
                <p className="text-[9px] text-zinc-500">Leduc · SFU Alumni</p>
            </FaceCard>
        ),
    },
];

// ─── Extract face centers & orientations from actual geometry ─────────────────
interface ComputedFace {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    data: FaceData;
}

function computeFaces(): ComputedFace[] {
    const geo = new THREE.DodecahedronGeometry(RADIUS, 0);
    const posAttr = geo.getAttribute("position");
    const index = geo.getIndex();
    if (!index) return [];

    // Group triangles by shared normal → recovers the 12 pentagonal faces
    const groups: { verts: THREE.Vector3[]; normal: THREE.Vector3 }[] = [];

    for (let i = 0; i < index.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(posAttr, index.getX(i));
        const b = new THREE.Vector3().fromBufferAttribute(posAttr, index.getX(i + 1));
        const c = new THREE.Vector3().fromBufferAttribute(posAttr, index.getX(i + 2));
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
        // Centroid of all triangle vertices on this face
        const center = new THREE.Vector3();
        g.verts.forEach((v) => center.add(v));
        center.divideScalar(g.verts.length);

        // Match to closest FACE_DEFINITION by normal direction
        const n = g.normal.clone().normalize();
        let best = FACE_DEFINITIONS[0];
        let bestDot = -Infinity;
        for (const fd of FACE_DEFINITIONS) {
            const d = new THREE.Vector3(...fd.direction).normalize().dot(n);
            if (d > bestDot) {
                bestDot = d;
                best = fd;
            }
        }

        // Build orientation from geometry: use first unique vertex for "up" reference
        const unique: THREE.Vector3[] = [];
        for (const v of g.verts) {
            if (!unique.some((u) => u.distanceTo(v) < 0.001)) unique.push(v);
        }
        const up = unique[0].clone().sub(center).normalize();
        const zAxis = n;
        const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
        const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
        const mat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(mat);

        // Position just above the surface
        const position = center.clone().add(n.clone().multiplyScalar(0.03));

        return { position, quaternion, data: best };
    });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Dodecahedron() {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const faces = useMemo(() => computeFaces(), []);
    const [showPanels, setShowPanels] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowPanels(true), PANEL_DELAY_MS);
        return () => clearTimeout(timer);
    }, []);

    useFrame((_state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * AUTO_ROTATE_SPEED;
        }
    });

    return (
        <group ref={groupRef} position={[1.5, 0, 0]}>
            {/* Geometry base */}
            <mesh ref={meshRef}>
                <dodecahedronGeometry args={[RADIUS, 0]} />
                <meshStandardMaterial
                    color="#e2e8f0"
                    transparent
                    opacity={0.15}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Black pentagonal edges */}
            <lineSegments>
                <edgesGeometry
                    args={[new THREE.DodecahedronGeometry(RADIUS, 0), 1]}
                />
                <lineBasicMaterial color="#000000" />
            </lineSegments>

            {/* HTML overlays — extracted from actual geometry for perfect alignment */}
            {showPanels &&
                faces.map((face) => (
                    <group
                        key={face.data.label}
                        position={face.position}
                        quaternion={face.quaternion}
                    >
                        <Html
                            transform
                            distanceFactor={6}
                            style={{ pointerEvents: "auto", userSelect: "none" }}
                        >
                            {face.data.content}
                        </Html>
                    </group>
                ))}
        </group>
    );
}
