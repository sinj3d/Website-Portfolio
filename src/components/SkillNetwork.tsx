"use client";

import { useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';

// ── Skill data per cluster ──────────────────────────────────────────
const HARDWARE_SKILLS = [
    "KiCad", "PCB Design", "3D Printing", "SolidWorks", "Arduino",
    "ESP32", "Soldering", "FDM/SLA", "Sensors", "Actuators",
    "Motor Control", "Hall Effect", "CAD", "Prototyping", "CNC",
];

const SOFTWARE_SKILLS = [
    "React", "Next.js", "TypeScript", "Python", "C++",
    "Docker", "ROS2", "Git", "Node.js", "REST API",
    "PostgreSQL", "Linux", "Three.js", "CI/CD",
];

const ML_SKILLS = [
    "PyTorch", "TensorFlow", "OpenCV", "NumPy", "Pandas",
    "Scikit-learn", "YOLO", "CNNs", "NLP",
    "K-Fold CV", "Jupyter", "CUDA", "Matplotlib",
];

// ── Cluster definitions ─────────────────────────────────────────────
interface ClusterDef {
    center: [number, number, number];
    spread: number;
    color: string;
    label: string;
    labelPos: [number, number, number];
    skills: string[];
}

const CLUSTERS: ClusterDef[] = [
    { center: [0, 2.5, 0], spread: 3, color: "#0ea5e9", label: "MECHATRONICS // HARDWARE", labelPos: [0, 5.5, 0], skills: HARDWARE_SKILLS },
    { center: [-4.5, -4, 0], spread: 2.5, color: "#10b981", label: "SOFTWARE // WEB", labelPos: [-4.5, -7.5, 0], skills: SOFTWARE_SKILLS },
    { center: [4.5, -4, 0], spread: 2.5, color: "#f43f5e", label: "MACHINE LEARNING // DATA", labelPos: [4.5, -7.5, 0], skills: ML_SKILLS },
];

// ── Stable seeded random for reproducibility ────────────────────────
function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function generateNodes(count: number, center: [number, number, number], spread: number, seedOffset: number) {
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
        const angle = seededRandom(i * 7 + seedOffset) * Math.PI * 2;
        const radius = seededRandom(i * 13 + seedOffset + 1) * spread;
        nodes.push(new THREE.Vector3(
            center[0] + Math.cos(angle) * radius,
            center[1] + Math.sin(angle) * radius,
            center[2]
        ));
    }
    return nodes;
}

// ── Animated cluster with per-node skill labels ─────────────────────
interface AnimatedClusterProps {
    initialNodes: THREE.Vector3[];
    color: string;
    label: string;
    labelPos: [number, number, number];
    skills: string[];
    isFocused: boolean;
    onClick: () => void;
}

function AnimatedCluster({ initialNodes, color, label, labelPos, skills, isFocused, onClick }: AnimatedClusterProps) {
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const linesRef = useRef<THREE.LineSegments>(null);
    const groupRef = useRef<THREE.Group>(null);

    // Current positions for label tracking
    const currentPositions = useRef<Float32Array>(new Float32Array(initialNodes.length * 3));

    const indices = useMemo(() => {
        const arr: number[] = [];
        for (let i = 0; i < initialNodes.length; i++) {
            for (let j = i + 1; j < initialNodes.length; j++) {
                if (initialNodes[i].distanceTo(initialNodes[j]) < 2.5) {
                    arr.push(i, j);
                }
            }
        }
        return new Uint16Array(arr);
    }, [initialNodes]);

    const posArray = useMemo(() => {
        const arr = new Float32Array(initialNodes.length * 3);
        initialNodes.forEach((v, i) => {
            arr[i * 3] = v.x;
            arr[i * 3 + 1] = v.y;
            arr[i * 3 + 2] = v.z;
        });
        return arr;
    }, [initialNodes]);

    const driftParams = useMemo(() => {
        return initialNodes.map((_, i) => ({
            speedX: 0.5 + seededRandom(i * 31) * 0.5,
            speedY: 0.5 + seededRandom(i * 37) * 0.5,
            offsetX: seededRandom(i * 41) * Math.PI * 2,
            offsetY: seededRandom(i * 43) * Math.PI * 2,
        }));
    }, [initialNodes]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (!instancedMeshRef.current || !linesRef.current) return;

        const linePos = linesRef.current.geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < initialNodes.length; i++) {
            const p = driftParams[i];
            const base = initialNodes[i];

            const dx = Math.sin(t * p.speedX + p.offsetX) * 0.15;
            const dy = Math.cos(t * p.speedY + p.offsetY) * 0.15;

            const newX = base.x + dx;
            const newY = base.y + dy;
            const newZ = base.z;

            dummy.position.set(newX, newY, newZ);
            dummy.updateMatrix();
            instancedMeshRef.current.setMatrixAt(i, dummy.matrix);

            linePos[i * 3] = newX;
            linePos[i * 3 + 1] = newY;
            linePos[i * 3 + 2] = newZ;

            // Track positions for labels
            currentPositions.current[i * 3] = newX;
            currentPositions.current[i * 3 + 1] = newY;
            currentPositions.current[i * 3 + 2] = newZ;
        }

        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        linesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <group ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            {/* Cluster title label */}
            <Text
                position={labelPos}
                fontSize={0.25}
                color={color}
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.1}
            >
                {label}
            </Text>

            {/* Per-node skill labels */}
            {initialNodes.map((node, i) => {
                if (i >= skills.length) return null;
                return (
                    <SkillLabel
                        key={i}
                        nodeIndex={i}
                        skill={skills[i]}
                        basePosition={node}
                        color={color}
                        isFocused={isFocused}
                        driftParams={driftParams[i]}
                    />
                );
            })}

            <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, initialNodes.length]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} transparent opacity={0.9} />
            </instancedMesh>

            <lineSegments ref={linesRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[new Float32Array(posArray), 3]} />
                    <bufferAttribute attach="index" args={[indices, 1]} />
                </bufferGeometry>
                <lineBasicMaterial color={color} transparent opacity={0.15} linewidth={1} />
            </lineSegments>
        </group>
    );
}

// ── Individual skill label that follows its node ────────────────────
function SkillLabel({ nodeIndex, skill, basePosition, color, isFocused, driftParams }: {
    nodeIndex: number;
    skill: string;
    basePosition: THREE.Vector3;
    color: string;
    isFocused: boolean;
    driftParams: { speedX: number; speedY: number; offsetX: number; offsetY: number };
}) {
    const textRef = useRef<THREE.Object3D>(null);

    useFrame((state) => {
        if (!textRef.current) return;
        const t = state.clock.elapsedTime;
        const dx = Math.sin(t * driftParams.speedX + driftParams.offsetX) * 0.15;
        const dy = Math.cos(t * driftParams.speedY + driftParams.offsetY) * 0.15;
        textRef.current.position.set(
            basePosition.x + dx,
            basePosition.y + dy + 0.22,
            basePosition.z
        );
    });

    // Always render the label, but adjust size/opacity based on focus
    return (
        <Text
            ref={textRef as React.RefObject<THREE.Mesh>}
            position={[basePosition.x, basePosition.y + 0.22, basePosition.z]}
            fontSize={isFocused ? 0.16 : 0.09}
            color={color}
            anchorX="center"
            anchorY="bottom"
            letterSpacing={0.02}
            fillOpacity={isFocused ? 1 : 0.5}
        >
            {skill}
        </Text>
    );
}

// ── Camera controller: smooth zoom on cluster click ─────────────────
function CameraController({ focusedCluster }: { focusedCluster: number | null }) {
    const { camera } = useThree();
    const targetPos = useRef(new THREE.Vector3(0, 0, 26));
    const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

    // Precompute target camera positions per cluster (scaled by group scale 1.6)
    const clusterCameraTargets = useMemo(() => {
        const scale = 1.6;
        return CLUSTERS.map(c => ({
            position: new THREE.Vector3(c.center[0] * scale, c.center[1] * scale, 14),
            lookAt: new THREE.Vector3(c.center[0] * scale, c.center[1] * scale, 0),
        }));
    }, []);

    const defaultPos = useMemo(() => new THREE.Vector3(0, -1, 26), []);
    const defaultLookAt = useMemo(() => new THREE.Vector3(0, -1, 0), []);

    useFrame(() => {
        if (focusedCluster !== null && focusedCluster >= 0 && focusedCluster < clusterCameraTargets.length) {
            const t = clusterCameraTargets[focusedCluster];
            targetPos.current.copy(t.position);
            targetLookAt.current.copy(t.lookAt);
        } else {
            targetPos.current.copy(defaultPos);
            targetLookAt.current.copy(defaultLookAt);
        }

        // Smooth lerp
        camera.position.lerp(targetPos.current, 0.04);
        const currentLookAt = new THREE.Vector3();
        camera.getWorldDirection(currentLookAt);
        camera.lookAt(
            camera.position.x + (targetLookAt.current.x - camera.position.x) * 0.04,
            camera.position.y + (targetLookAt.current.y - camera.position.y) * 0.04,
            0
        );
    });

    return null;
}

// ── Main SkillNetwork export ────────────────────────────────────────
export default function SkillNetwork() {
    const [focusedCluster, setFocusedCluster] = useState<number | null>(null);

    const clusterNodes = useMemo(() =>
        CLUSTERS.map((c, i) => generateNodes(c.skills.length, c.center, c.spread, i * 100)),
        []
    );

    const handleClusterClick = useCallback((index: number) => {
        setFocusedCluster(prev => prev === index ? null : index);
    }, []);

    // Inter-domain connections
    const connectClusters = (nodesA: THREE.Vector3[], nodesB: THREE.Vector3[]) => {
        const arr: number[] = [];
        for (let i = 0; i < nodesA.length; i++) {
            for (let j = 0; j < nodesB.length; j++) {
                if (nodesA[i].distanceTo(nodesB[j]) < 6.0) {
                    arr.push(nodesA[i].x, nodesA[i].y, nodesA[i].z);
                    arr.push(nodesB[j].x, nodesB[j].y, nodesB[j].z);
                    break;
                }
            }
        }
        return arr;
    };

    const crossLines = useMemo(() => {
        return new Float32Array([
            ...connectClusters(clusterNodes[0], clusterNodes[1]),
            ...connectClusters(clusterNodes[0], clusterNodes[2]),
            ...connectClusters(clusterNodes[1], clusterNodes[2])
        ]);
    }, [clusterNodes]);

    return (
        <>
            <CameraController focusedCluster={focusedCluster} />
            {/* Click on empty space to deselect */}
            <mesh visible={false} position={[0, 0, -5]} onClick={() => setFocusedCluster(null)}>
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <group scale={1.6}>
                {CLUSTERS.map((cluster, i) => (
                    <AnimatedCluster
                        key={i}
                        initialNodes={clusterNodes[i]}
                        color={cluster.color}
                        label={cluster.label}
                        labelPos={cluster.labelPos}
                        skills={cluster.skills}
                        isFocused={focusedCluster === i}
                        onClick={() => handleClusterClick(i)}
                    />
                ))}

                {/* Faint cross-cluster connections */}
                <lineSegments>
                    <bufferGeometry>
                        <bufferAttribute attach="attributes-position" args={[crossLines, 3]} />
                    </bufferGeometry>
                    <lineBasicMaterial color="#71717a" transparent opacity={0.06} linewidth={1} />
                </lineSegments>
            </group>
        </>
    );
}
