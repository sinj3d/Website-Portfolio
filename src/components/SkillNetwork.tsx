"use client";

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

function generateNodes(count: number, center: [number, number, number], spread: number) {
    const nodes = [];
    for (let i = 0; i < count; i++) {
        // Flattened completely into the Z=0 plane (XY plane circle)
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * spread;
        nodes.push(new THREE.Vector3(
            center[0] + Math.cos(angle) * radius,
            center[1] + Math.sin(angle) * radius,
            center[2] // keeping whatever z center was assigned
        ));
    }
    return nodes;
}

function AnimatedCluster({ initialNodes, color, label, labelPos }: { initialNodes: THREE.Vector3[], color: string, label: string, labelPos: [number, number, number] }) {
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const linesRef = useRef<THREE.LineSegments>(null);

    // Build line segments indices based on distance
    const indices = useMemo(() => {
        const arr = [];
        for (let i = 0; i < initialNodes.length; i++) {
            for (let j = i + 1; j < initialNodes.length; j++) {
                if (initialNodes[i].distanceTo(initialNodes[j]) < 2.5) {
                    arr.push(i, j);
                }
            }
        }
        return new Uint16Array(arr);
    }, [initialNodes]);

    // Initial dummy array for positions
    const posArray = useMemo(() => {
        const arr = new Float32Array(initialNodes.length * 3);
        initialNodes.forEach((v, i) => {
            arr[i * 3] = v.x;
            arr[i * 3 + 1] = v.y;
            arr[i * 3 + 2] = v.z;
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
            const base = initialNodes[i];
            
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

export default function SkillNetwork() {
    // Generate all clusters on the EXACT SAME Z=0 plane per user request
    const HARDWARE = useMemo(() => generateNodes(20, [0, 4, 0], 3), []);
    const WEB = useMemo(() => generateNodes(15, [-4.5, -3, 0], 2.5), []);
    const ML = useMemo(() => generateNodes(15, [4.5, -3, 0], 2.5), []);

    // Inter-domain connections (connecting closest points between hardware and others)
    const connectClusters = (nodesA: THREE.Vector3[], nodesB: THREE.Vector3[]) => {
        const arr = [];
        for (let i = 0; i < nodesA.length; i++) {
            for (let j = 0; j < nodesB.length; j++) {
                if (nodesA[i].distanceTo(nodesB[j]) < 6.0) { // Connect if they are within bounding distance
                    arr.push(nodesA[i].x, nodesA[i].y, nodesA[i].z);
                    arr.push(nodesB[j].x, nodesB[j].y, nodesB[j].z);
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
            <AnimatedCluster initialNodes={HARDWARE} color="#0ea5e9" label="MECHATRONICS // HARDWARE" labelPos={[0, 8, 0]} />
            <AnimatedCluster initialNodes={WEB} color="#10b981" label="SOFTWARE // WEB" labelPos={[-4.5, -6.5, 0]} />
            <AnimatedCluster initialNodes={ML} color="#f43f5e" label="MACHINE LEARNING // DATA" labelPos={[4.5, -6.5, 0]} />
            
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
