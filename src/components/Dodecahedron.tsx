"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────────────────
const RADIUS = 2.5;
const phi = (1 + Math.sqrt(5)) / 2;
const ROTATE_SPEED = (2 * Math.PI) / 30; // 360° per 30s (slow tumble)

// Phase timing (seconds)
const SPIN_PHASE = 2;     // pentagon spins in place
const TILT_END = 4;       // pentagon tilts + moves to bottom face
const EDGE_DRAW_END = 7;  // edges fully drawn
const PANEL_DELAY_MS = (EDGE_DRAW_END + 1) * 1000;

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

// ─── Flat pentagon (point-down) geometry ─────────────────────────────────────
function createPentagonGeo() {
    const a = RADIUS * 4 / (Math.sqrt(3) * (1 + Math.sqrt(5)));
    const faceR = a / (2 * Math.sin(Math.PI / 5));
    const shape = new THREE.Shape();
    for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + Math.PI / 2 + i * (2 * Math.PI) / 5; // +36° (total +90°) to align with dodec
        const x = faceR * Math.cos(angle);
        const y = faceR * Math.sin(angle);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
}

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
    const delay = 8 + index * 0.3;
    return (
        <div
            className="animate-line flex flex-col items-center justify-center gap-1 p-4 text-center"
            style={{
                width: "160px",
                height: "160px",
                clipPath: PENTAGON_CLIP,
                background: "rgba(255, 255, 255, 0.92)",
                border: "1.5px solid rgba(0,0,0,0.15)",
                boxShadow: `inset 0 0 0 1.5px ${accent}, 0 2px 8px rgba(0,0,0,0.08)`,
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
        // Centroid of all triangle vertices on this face
        const center = new THREE.Vector3();
        g.verts.forEach((v) => center.add(v));
        center.divideScalar(g.verts.length);

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

// ─── Component ────────────────────────────────────────────────────────────────
export default function Dodecahedron() {
    const groupRef = useRef<THREE.Group>(null);
    const pentGroupRef = useRef<THREE.Group>(null);
    const edgeLinesRef = useRef<THREE.LineSegments>(null);

    // Pre-rotated dodecahedron with one face at -Y
    const { geo: alignedGeo, alignQ, bottomCenter } = useMemo(() => createAlignedDodecGeo(), []);
    const faces = useMemo(() => computeFaces(alignedGeo, alignQ), [alignedGeo, alignQ]);
    const pentGeo = useMemo(() => createPentagonGeo(), []);
    const pentEdgesGeo = useMemo(() => new THREE.EdgesGeometry(pentGeo), [pentGeo]);
    const [showPanels, setShowPanels] = useState(false);

    // Sorted edges from aligned geometry
    const sortedEdges = useMemo(() => extractSortedEdges(alignedGeo), [alignedGeo]);
    // Bottom face center Y for edge interpolation origin
    const bcx = bottomCenter.x, bcy = bottomCenter.y, bcz = bottomCenter.z;
    const morphGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(sortedEdges.length * 6);
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, [sortedEdges]);

    useEffect(() => {
        const timer = setTimeout(() => setShowPanels(true), PANEL_DELAY_MS);
        return () => clearTimeout(timer);
    }, []);

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

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const elapsed = clock.getElapsedTime();

        const pent = pentGroupRef.current;
        const edgeLines = edgeLinesRef.current;

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
            if (edgeLines) edgeLines.visible = false;

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
            if (edgeLines) edgeLines.visible = false;

        } else if (elapsed < EDGE_DRAW_END) {
            // Phase 2: edges draw bottom-to-top from pentagon corners
            // Keep tilt orientation (no tumble yet)
            groupRef.current.quaternion.copy(tiltQuat);

            const p = (elapsed - TILT_END) / (EDGE_DRAW_END - TILT_END);
            const ease = 1 - Math.pow(1 - p, 2); // ease-out quad

            // Pentagon shrinks away at start of edge drawing
            if (pent) {
                pent.visible = ease < 0.4;
                pent.scale.setScalar(Math.max(0, 1 - ease * 3));
                pent.position.copy(bottomCenter);
            }

            // Reveal edges bottom-to-top
            if (edgeLines) {
                edgeLines.visible = true;
                const posAttr = morphGeo.getAttribute('position') as THREE.BufferAttribute;
                const arr = posAttr.array as Float32Array;
                const total = sortedEdges.length;
                const revealCount = Math.ceil(ease * total);

                for (let i = 0; i < total; i++) {
                    const off = i * 6;
                    const seg = sortedEdges[i];
                    if (i < revealCount) {
                        const edgeProgress = Math.min(1, (ease * total - i) / 3);
                        const ep = edgeProgress * edgeProgress;
                        arr[off] = bcx + (seg.ax - bcx) * ep;
                        arr[off + 1] = bcy + (seg.ay - bcy) * ep;
                        arr[off + 2] = bcz + (seg.az - bcz) * ep;
                        arr[off + 3] = bcx + (seg.bx - bcx) * ep;
                        arr[off + 4] = bcy + (seg.by - bcy) * ep;
                        arr[off + 5] = bcz + (seg.bz - bcz) * ep;
                    } else {
                        // Not yet revealed — hide at bottom center
                        arr[off] = arr[off + 3] = bcx;
                        arr[off + 1] = arr[off + 4] = bcy;
                        arr[off + 2] = arr[off + 5] = bcz;
                    }
                }
                posAttr.needsUpdate = true;
                morphGeo.computeBoundingSphere();
            }

        } else {
            // Phase 3+: construction complete, begin slow tumble
            if (pent) pent.visible = false;

            // Slow tumble starting FROM the tilt orientation
            const tumbleT = (elapsed - EDGE_DRAW_END) * ROTATE_SPEED;
            qx.setFromAxisAngle(axisX, tumbleT);
            qy.setFromAxisAngle(axisY, -tumbleT);
            tumbleQuat.copy(qx).multiply(qy);
            tempQuat.copy(tumbleQuat).premultiply(tiltQuat);
            groupRef.current.quaternion.copy(tempQuat);

            // Set all edges to final positions
            if (edgeLines) {
                edgeLines.visible = true;
                const posAttr = morphGeo.getAttribute('position') as THREE.BufferAttribute;
                const arr = posAttr.array as Float32Array;
                for (let i = 0; i < sortedEdges.length; i++) {
                    const off = i * 6;
                    const seg = sortedEdges[i];
                    arr[off] = seg.ax;
                    arr[off + 1] = seg.ay;
                    arr[off + 2] = seg.az;
                    arr[off + 3] = seg.bx;
                    arr[off + 4] = seg.by;
                    arr[off + 5] = seg.bz;
                }
                posAttr.needsUpdate = true;
                morphGeo.computeBoundingSphere();
            }
        }
    });

    return (
        <group ref={groupRef}>
            {/* ── Flat pentagon, point-down (phase 1: tilts + moves to bottom face) ── */}
            <group ref={pentGroupRef}>
                <lineSegments>
                    <primitive object={pentEdgesGeo} attach="geometry" />
                    <lineBasicMaterial color="#000000" />
                </lineSegments>
            </group>

            {/* ── Morphing edges (phase 2: bottom-to-top construction) ── */}
            <lineSegments ref={edgeLinesRef}>
                <primitive object={morphGeo} attach="geometry" />
                <lineBasicMaterial color="#000000" />
            </lineSegments>

            {/* ── Face panels — positioned from aligned geometry ── */}
            {showPanels &&
                faces.map((face, i) => (
                    <group
                        key={`face-${i}`}
                        position={face.position}
                        quaternion={face.quaternion}
                    >
                        <Html
                            transform
                            distanceFactor={6}
                            zIndexRange={[100, 0]}
                            style={{ pointerEvents: "auto", userSelect: "none" }}
                        >
                            {face.data.content}
                        </Html>
                    </group>
                ))}
        </group>
    );
}
