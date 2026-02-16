"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Dodecahedron from "@/components/Dodecahedron";
import Loader from "@/components/Loader";
import { useState, useEffect, useRef } from "react";

// ─── Typewriter component ────────────────────────────────────────────────────
function TypewriterLine({
  text,
  delay,
  speed = 30,
  className,
}: {
  text: string;
  delay: number;
  speed?: number;
  className: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    indexRef.current = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [started, text, speed]);

  if (!started) return null;

  return (
    <p className={className}>
      {displayed}
      <span className="animate-blink text-cyan-500">|</span>
    </p>
  );
}

// ─── Bio data ────────────────────────────────────────────────────────────────
const BIO_LINES = [
  {
    text: "Portfolio",
    delay: 8000,
    speed: 60,
    className: "mb-3 text-xs font-semibold tracking-[0.3em] text-cyan-600 uppercase",
  },
  {
    text: "Simon",
    delay: 9000,
    speed: 80,
    className: "text-4xl font-bold leading-tight tracking-tight text-zinc-900",
  },
  {
    text: "Shenghua Jin",
    delay: 9800,
    speed: 50,
    className: "mb-4 text-4xl font-bold leading-tight tracking-tight text-zinc-900",
  },
  {
    text: "Mechatronics engineer and software developer with a passion for robotics, machine learning, and building things that bridge the digital-physical divide.",
    delay: 11000,
    speed: 15,
    className: "max-w-sm text-sm leading-relaxed text-zinc-500",
  },
  {
    text: "Currently studying at SFU, winning hackathons, and pushing the boundaries of what hardware and software can do together.",
    delay: 14000,
    speed: 15,
    className: "mt-2 max-w-sm text-sm leading-relaxed text-zinc-500",
  },
];

export default function Home() {
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowButtons(true), 17000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-white">
      {/* Loader overlay */}
      <Loader />

      {/* Left-side bio text — typewriter effect */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-[40%] flex-col justify-center px-12">
        {BIO_LINES.map((line, i) => (
          <TypewriterLine
            key={i}
            text={line.text}
            delay={line.delay}
            speed={line.speed}
            className={line.className}
          />
        ))}

        {showButtons && (
          <div
            className="animate-line mt-6 flex gap-3 pointer-events-auto"
            style={{ animationDelay: "0s" }}
          >
            <a
              href="#"
              className="rounded-full border border-zinc-200 bg-zinc-50 px-5 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              View Projects
            </a>
            <a
              href="#"
              className="rounded-full bg-cyan-500 px-5 py-2 text-xs font-medium text-white transition hover:bg-cyan-600"
            >
              Contact
            </a>
          </div>
        )}
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: "#ffffff" }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        <Dodecahedron />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </main>
  );
}
