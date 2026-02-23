"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Dodecahedron from "@/components/Dodecahedron";
import { useState, useEffect, useRef } from "react";

// ─── Terminal-style typewriter ───────────────────────────────────────────────
// All lines rendered at once with visibility: hidden to reserve space.
// Characters revealed one at a time across all lines sequentially.

const TERMINAL_LINES = [
  { text: "> portfolio", style: "text-cyan-600 text-xs tracking-widest uppercase" },
  { text: "", style: "h-2" }, // spacer
  { text: "Simon", style: "text-3xl font-bold text-zinc-900" },
  { text: "Shenghua Jin", style: "text-3xl font-bold text-zinc-900" },
  { text: "", style: "h-3" }, // spacer
  { text: "Mechatronics engineer and software", style: "text-sm text-zinc-600" },
  { text: "developer with a passion for robotics,", style: "text-sm text-zinc-600" },
  { text: "machine learning, and building things", style: "text-sm text-zinc-600" },
  { text: "that bridge the digital-physical divide.", style: "text-sm text-zinc-600" },
  { text: "", style: "h-2" }, // spacer
  { text: "Currently studying at SFU, winning", style: "text-sm text-zinc-600" },
  { text: "hackathons, and pushing the boundaries", style: "text-sm text-zinc-600" },
  { text: "of what hardware and software can do", style: "text-sm text-zinc-600" },
  { text: "together.", style: "text-sm text-zinc-600" },
];

// Flatten all characters with line/char indices for sequential reveal
function buildCharMap() {
  const chars: { line: number; char: number }[] = [];
  for (let l = 0; l < TERMINAL_LINES.length; l++) {
    const t = TERMINAL_LINES[l].text;
    for (let c = 0; c < t.length; c++) {
      chars.push({ line: l, char: c });
    }
  }
  return chars;
}

const CHAR_MAP = buildCharMap();
const CHAR_SPEED_MS = 20; // ms per character
const FIRST_LINE_DELAY = 2000;

function TerminalText() {
  const [revealedCount, setRevealedCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setRevealedCount((prev) => {
          if (prev >= CHAR_MAP.length) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, CHAR_SPEED_MS);
    }, FIRST_LINE_DELAY);

    return () => {
      clearTimeout(startTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Figure out how many chars are revealed per line
  const revealedPerLine: number[] = new Array(TERMINAL_LINES.length).fill(0);
  for (let i = 0; i < revealedCount && i < CHAR_MAP.length; i++) {
    revealedPerLine[CHAR_MAP[i].line]++;
  }

  // Which line is currently being typed
  const currentLine = revealedCount < CHAR_MAP.length ? CHAR_MAP[revealedCount]?.line ?? -1 : -1;
  const allDone = revealedCount >= CHAR_MAP.length;

  return (
    <div className="font-[family-name:var(--font-geist-mono)] leading-relaxed">
      {TERMINAL_LINES.map((line, i) => {
        if (!line.text) {
          // Spacer
          return <div key={i} className={line.style} />;
        }
        const shown = line.text.slice(0, revealedPerLine[i]);
        const isCurrentLine = i === currentLine;

        return (
          <div key={i} className={`${line.style} whitespace-pre`}>
            {shown || "\u00A0"}
            {isCurrentLine && !allDone && (
              <span className="animate-blink text-cyan-500">▌</span>
            )}
          </div>
        );
      })}

      {allDone && (
        <div className="mt-4 animate-line flex gap-3 pointer-events-auto" style={{ animationDelay: "0s" }}>
          <a
            href="#"
            className="rounded border border-zinc-300 px-4 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-100"
          >
            view_projects
          </a>
          <a
            href="#"
            className="rounded bg-cyan-600 px-4 py-1.5 text-xs text-white transition hover:bg-cyan-500"
          >
            contact
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-white">


      {/* Left-side terminal text */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[200] flex w-[40%] flex-col justify-center px-12">
        <TerminalText />
      </div>

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <Canvas
          camera={{ position: [0, 0, 8], fov: 50 }}
          style={{ background: "#ffffff", pointerEvents: "auto" }}
        >
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={0.6} />
          <Dodecahedron />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>
    </main>
  );
}
