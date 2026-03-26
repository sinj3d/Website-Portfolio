"use client";

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

export type SkillNode = { pos: THREE.Vector3; label: string };

function generateNodes(labels: string[], center: [number, number, number], spread: number): SkillNode[] {
    const nodes: SkillNode[] = [];
    for (let i = 0; i < labels.length; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const radius = Math.random() * spread;
        
        nodes.push({
            pos: new THREE.Vector3(
                center[0] + radius * Math.sin(phi) * Math.cos(theta),
                center[1] + radius * Math.sin(phi) * Math.sin(theta),
                center[2] + radius * Math.cos(phi)
            ),
            label: labels[i]
        });
    }
    return nodes;
}

function AnimatedCluster({ initialNodes, color, label, labelPos }: { initialNodes: SkillNode[], color: string, label: string, labelPos: [number, number, number] }) {
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const linesRef = useRef<THREE.LineSegments>(null);
    const textRefs = useRef<(THREE.Group | null)[]>([]);

    // Build line segments indices based on distance
    const indices = useMemo(() => {
        const arr = [];
        for (let i = 0; i < initialNodes.length; i++) {
            for (let j = i + 1; j < initialNodes.length; j++) {
                if (initialNodes[i].pos.distanceTo(initialNodes[j].pos) < 2.5) {
                    arr.push(i, j);
                }
            }
        }
        return new Uint16Array(arr);
    }, [initialNodes]);

    // Initial dummy array for positions
    const posArray = useMemo(() => {
        const arr = new Float32Array(initialNodes.length * 3);
        initialNodes.forEach((node, i) => {
            arr[i * 3] = node.pos.x;
            arr[i * 3 + 1] = node.pos.y;
            arr[i * 3 + 2] = node.pos.z;
        });
        return arr;
    }, [initialNodes]);

    // Random drift parameters assigned per node
    const driftParams = useMemo(() => {
        return initialNodes.map(() => ({
            speedX: 0.5 + Math.random() * 0.5,
            speedY: 0.5 + Math.random() * 0.5,
            offsetX: Math.random() * Math.PI * 2,
            offsetY: Math.random() * Math.PI * 2,
        }));
    }, [initialNodes]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (!instancedMeshRef.current || !linesRef.current) return;
        
        const linePos = linesRef.current.geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < initialNodes.length; i++) {
            const p = driftParams[i];
            const base = initialNodes[i].pos;
            
            // Apply drift
            const dx = Math.sin(t * p.speedX + p.offsetX) * 0.15;
            const dy = Math.cos(t * p.speedY + p.offsetY) * 0.15;
            
            const newX = base.x + dx;
            const newY = base.y + dy;
            const newZ = base.z;
            
            // Sync sphere position
            dummy.position.set(newX, newY, newZ);
            dummy.updateMatrix();
            instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
            
            // Sync line position
            linePos[i * 3] = newX;
            linePos[i * 3 + 1] = newY;
            linePos[i * 3 + 2] = newZ;

            // Sync text label position
            const textRef = textRefs.current[i];
            if (textRef) {
                textRef.position.set(newX + 0.12, newY + 0.12, newZ);
            }
        }
        
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        linesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <group>
            {/* Label - Reduced font size from 0.4 to 0.25 */}
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
            
            <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, initialNodes.length]}>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} transparent opacity={0.9} />
            </instancedMesh>
            
            {initialNodes.map((node, i) => (
                <Text 
                    key={i}
                    ref={(el) => { textRefs.current[i] = el as any; }}
                    position={[node.pos.x + 0.2, node.pos.y + 0.15, node.pos.z]}
                    fontSize={0.2} 
                    color={color}
                    anchorX="left"
                    anchorY="middle"
                    fillOpacity={0.85}
                >
                    {node.label}
                </Text>
            ))}

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

export default function SkillNetwork() {
    const hwLabels = ["C++", "ROS", "KiCad", "PCB Design", "3D Printing", "Hall-Effect Sensors", "Microcontrollers", "Firmware"];
    const swLabels = ["Next.js", "React", "Tailwind CSS", "TypeScript", "Python", "Docker", "Three.js", "Node.js"];
    const mlLabels = ["PyTorch", "Model Optimization", "K-Fold CV", "Quant Analysis", "Pandas", "NumPy", "Scikit-Learn"];

    // Generate clusters with 3D nodes but centers on same Z=0 plane, brought closer together vertically
    const HARDWARE = useMemo(() => generateNodes(hwLabels, [0, 2.5, 0], 3), []);
    const WEB = useMemo(() => generateNodes(swLabels, [-4.0, -1, 0], 2.5), []);
    const ML = useMemo(() => generateNodes(mlLabels, [4.0, -1, 0], 2.5), []);

    // Inter-domain connections (connecting closest points between hardware and others)
    const connectClusters = (nodesA: SkillNode[], nodesB: SkillNode[]) => {
        const arr = [];
        for (let i = 0; i < nodesA.length; i++) {
            for (let j = 0; j < nodesB.length; j++) {
                if (nodesA[i].pos.distanceTo(nodesB[j].pos) < 6.0) { // Connect if they are within bounding distance
                    arr.push(nodesA[i].pos.x, nodesA[i].pos.y, nodesA[i].pos.z);
                    arr.push(nodesB[j].pos.x, nodesB[j].pos.y, nodesB[j].pos.z);
                    // Just 1-2 connections max so we break early if found
                    break;
                }
            }
        }
        return new Float32Array(arr);
    };

    const crossLines = useMemo(() => {
        return new Float32Array([
            ...connectClusters(HARDWARE, WEB),
            ...connectClusters(HARDWARE, ML),
            ...connectClusters(WEB, ML)
        ]);
    }, [HARDWARE, WEB, ML]);

    return (
        <group scale={1.6}>
            <AnimatedCluster initialNodes={HARDWARE} color="#0ea5e9" label="MECHATRONICS // HARDWARE" labelPos={[0, 6.0, 0]} />
            <AnimatedCluster initialNodes={WEB} color="#10b981" label="SOFTWARE // WEB" labelPos={[-4.0, 2.0, 0]} />
            <AnimatedCluster initialNodes={ML} color="#f43f5e" label="MACHINE LEARNING // DATA" labelPos={[4.0, 2.0, 0]} />
            
            {/* Very faint background lines connecting the clusters */}
            <lineSegments>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[crossLines, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color="#71717a" transparent opacity={0.06} linewidth={1} />
            </lineSegments>
        </group>
    );
}
