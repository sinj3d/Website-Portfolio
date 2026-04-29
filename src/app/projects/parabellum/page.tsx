"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";

// ─── Timeline Data ──────────────────────────────────────────────────────────
// Each entry represents a milestone in the FTC Parabellum journey.
// mediaSlots are placeholder zones where images/exploded views can be dropped.

interface MediaSlot {
  id: string;
  label: string;
  aspect: "landscape" | "square" | "portrait";
}

interface TimelineEntry {
  year: string;
  season: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  side: "left" | "right";
  accentColor: string;
  mediaSlots: MediaSlot[];
}

const TIMELINE_DATA: TimelineEntry[] = [
  {
    year: "2019",
    season: "Season 1",
    title: "The Beginning",
    subtitle: "Founding Team Parabellum",
    description:
      "Founded FTC Team Parabellum from scratch — recruiting members, securing sponsorships, and establishing a workshop. Built our first competition robot from the ground up with no prior FTC experience.",
    tags: ["Leadership", "Mechanical Design", "Team Building"],
    side: "left",
    accentColor: "cyan",
    mediaSlots: [
      { id: "s1-robot", label: "Season 1 Robot — Full Assembly", aspect: "landscape" },
      { id: "s1-team", label: "Founding Team Photo", aspect: "landscape" },
    ],
  },
  {
    year: "2020",
    season: "Season 2",
    title: "Iterating the Drivetrain",
    subtitle: "Mecanum Wheels & Custom Chassis",
    description:
      "Designed and manufactured a custom aluminum chassis with mecanum wheel drivetrain for omnidirectional movement. Implemented PID control loops for precise autonomous navigation. Our first season making it past qualifiers.",
    tags: ["Mecanum Drive", "PID Control", "CAD", "Autonomous"],
    side: "right",
    accentColor: "violet",
    mediaSlots: [
      { id: "s2-drivetrain", label: "Mecanum Drivetrain — Exploded View", aspect: "landscape" },
      { id: "s2-cad", label: "Chassis CAD Model", aspect: "square" },
    ],
  },
  {
    year: "2021",
    season: "Season 3",
    title: "The Intake Revolution",
    subtitle: "Custom Roller Intake & Linear Slides",
    description:
      "Engineered a high-speed roller intake system with compliant wheel geometry for reliable game element capture. Paired it with cascading linear slides for vertical extension, achieving sub-2-second scoring cycles.",
    tags: ["Intake Design", "Linear Slides", "3D Printing", "Prototyping"],
    side: "left",
    accentColor: "emerald",
    mediaSlots: [
      { id: "s3-intake", label: "Roller Intake — Exploded View", aspect: "landscape" },
      { id: "s3-slides", label: "Linear Slide Assembly", aspect: "portrait" },
      { id: "s3-robot", label: "Full Robot — Competition Ready", aspect: "landscape" },
    ],
  },
  {
    year: "2022",
    season: "Season 4",
    title: "Vision & Autonomy",
    subtitle: "OpenCV Pipeline & Odometry",
    description:
      "Integrated a custom OpenCV pipeline for real-time object detection during autonomous periods. Built a three dead-wheel odometry system for field-centric localization with sub-inch accuracy. Reached provincial championships.",
    tags: ["OpenCV", "Odometry", "Java", "Sensor Fusion"],
    side: "right",
    accentColor: "amber",
    mediaSlots: [
      { id: "s4-vision", label: "Vision Pipeline — Detection Output", aspect: "landscape" },
      { id: "s4-odometry", label: "Dead Wheel Odometry Module", aspect: "square" },
    ],
  },
  {
    year: "2023",
    season: "Season 5",
    title: "Captain's Final Stand",
    subtitle: "Leading to Provincials as Team Captain",
    description:
      "Led Team Parabellum as Captain in the final season. Overhauled the entire robot architecture — new custom gearboxes, redesigned arm linkage, and a turret-mounted scoring mechanism. Mentored junior members to ensure the team's legacy beyond graduation.",
    tags: ["Team Captain", "Gearbox Design", "Mentorship", "Provincials"],
    side: "left",
    accentColor: "rose",
    mediaSlots: [
      { id: "s5-turret", label: "Turret Mechanism — Exploded View", aspect: "landscape" },
      { id: "s5-gearbox", label: "Custom Gearbox Assembly", aspect: "square" },
      { id: "s5-team", label: "Final Season Team Photo", aspect: "landscape" },
    ],
  },
];

// ─── Accent color utilities ─────────────────────────────────────────────────
const ACCENT_MAP: Record<string, { dot: string; glow: string; text: string; border: string; bg: string; tagBg: string; tagText: string }> = {
  cyan: {
    dot: "bg-cyan-500",
    glow: "shadow-cyan-500/50",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    tagBg: "bg-cyan-500/15",
    tagText: "text-cyan-300",
  },
  violet: {
    dot: "bg-violet-500",
    glow: "shadow-violet-500/50",
    text: "text-violet-400",
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
    tagBg: "bg-violet-500/15",
    tagText: "text-violet-300",
  },
  emerald: {
    dot: "bg-emerald-500",
    glow: "shadow-emerald-500/50",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    tagBg: "bg-emerald-500/15",
    tagText: "text-emerald-300",
  },
  amber: {
    dot: "bg-amber-500",
    glow: "shadow-amber-500/50",
    text: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    tagBg: "bg-amber-500/15",
    tagText: "text-amber-300",
  },
  rose: {
    dot: "bg-rose-500",
    glow: "shadow-rose-500/50",
    text: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
    tagBg: "bg-rose-500/15",
    tagText: "text-rose-300",
  },
};

// ─── Animated Timeline Entry ────────────────────────────────────────────────
function TimelineEntryCard({
  entry,
  index,
}: {
  entry: TimelineEntry;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const accent = ACCENT_MAP[entry.accentColor] || ACCENT_MAP.cyan;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "start 0.3"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 25,
    restDelta: 0.001,
  });

  const opacity = useTransform(smoothProgress, [0, 0.4], [0, 1]);
  const y = useTransform(smoothProgress, [0, 0.4], [60, 0]);
  const scale = useTransform(smoothProgress, [0, 0.4], [0.95, 1]);

  // Exploded-view spread animation for media placeholders
  const spread = useTransform(smoothProgress, [0.3, 0.8], [0, 1]);

  const isLeft = entry.side === "left";

  return (
    <div ref={ref} className="relative grid grid-cols-[1fr_80px_1fr] items-start gap-0 min-h-[400px]">
      {/* ── Left Content / Spacer ──────────────────────────── */}
      <div className={`flex ${isLeft ? "justify-end" : "justify-start"}`}>
        {isLeft ? (
          <EntryContent entry={entry} accent={accent} opacity={opacity} y={y} scale={scale} spread={spread} index={index} />
        ) : (
          <div />
        )}
      </div>

      {/* ── Center Spine ────────────────────────────────────── */}
      <div className="flex flex-col items-center relative">
        {/* Glowing dot */}
        <motion.div
          style={{ opacity, scale }}
          className={`w-5 h-5 rounded-full ${accent.dot} shadow-lg ${accent.glow} ring-4 ring-zinc-950 z-10 flex-shrink-0 mt-2`}
        />
        {/* Connecting line */}
        <div className="w-[2px] flex-1 bg-gradient-to-b from-zinc-700/60 to-transparent" />
      </div>

      {/* ── Right Content / Spacer ─────────────────────────── */}
      <div className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
        {!isLeft ? (
          <EntryContent entry={entry} accent={accent} opacity={opacity} y={y} scale={scale} spread={spread} index={index} />
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

// ─── Entry Content Card ─────────────────────────────────────────────────────
function EntryContent({
  entry,
  accent,
  opacity,
  y,
  scale,
  spread,
  index,
}: {
  entry: TimelineEntry;
  accent: (typeof ACCENT_MAP)[string];
  opacity: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  spread: MotionValue<number>;
  index: number;
}) {
  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="max-w-xl w-full"
    >
      {/* Year badge */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`font-mono text-xs tracking-[0.3em] uppercase ${accent.text}`}>
          {entry.season}
        </span>
        <span className={`font-mono text-2xl font-bold ${accent.text}`}>
          {entry.year}
        </span>
      </div>

      {/* Main card */}
      <div className={`rounded-xl border ${accent.border} bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/30`}>
        {/* Title */}
        <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1 font-[family-name:var(--font-geist-sans)]">
          {entry.title}
        </h3>
        <p className={`font-mono text-sm ${accent.text} mb-4 tracking-wide`}>
          {entry.subtitle}
        </p>

        {/* Description */}
        <p className="text-zinc-400 leading-relaxed text-sm sm:text-base mb-6 font-[family-name:var(--font-geist-sans)]">
          {entry.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className={`font-mono text-[11px] tracking-wider px-3 py-1 rounded-full ${accent.tagBg} ${accent.tagText} border ${accent.border}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* ── Media Placeholder Slots (Exploded View Zone) ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-1.5 h-1.5 rounded-full ${accent.dot} animate-pulse`} />
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-zinc-500">
              Media / Exploded Views
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entry.mediaSlots.map((slot, i) => (
              <MediaPlaceholder
                key={slot.id}
                slot={slot}
                spread={spread}
                delayIndex={i}
                accent={accent}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Media Placeholder ──────────────────────────────────────────────────────
// Drag-and-drop-ready placeholder zone for robot images / exploded views.
function MediaPlaceholder({
  slot,
  spread,
  delayIndex,
  accent,
}: {
  slot: MediaSlot;
  spread: MotionValue<number>;
  delayIndex: number;
  accent: (typeof ACCENT_MAP)[string];
}) {
  const aspectMap = {
    landscape: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
  };

  // Each slot fans out slightly differently as user scrolls
  const offsetX = useTransform(spread, [0, 1], [0, (delayIndex % 2 === 0 ? -8 : 8)]);
  const offsetY = useTransform(spread, [0, 1], [0, delayIndex * -4]);
  const rotate = useTransform(spread, [0, 1], [0, (delayIndex % 2 === 0 ? -1.5 : 1.5)]);
  const slotScale = useTransform(spread, [0, 1], [0.97, 1]);

  return (
    <motion.div
      style={{
        x: offsetX,
        y: offsetY,
        rotate,
        scale: slotScale,
      }}
      className={`
        ${aspectMap[slot.aspect]}
        ${slot.aspect === "portrait" ? "sm:col-span-1" : ""}
        rounded-lg border border-dashed border-zinc-700/60
        bg-zinc-900/50 backdrop-blur-sm
        flex flex-col items-center justify-center
        cursor-pointer
        group
        transition-colors duration-300
        hover:border-zinc-500/80 hover:bg-zinc-800/50
        relative overflow-hidden
      `}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 animate-shimmer opacity-20 pointer-events-none" />

      {/* Upload icon */}
      <svg
        className={`w-8 h-8 text-zinc-600 group-hover:${accent.text} transition-colors mb-2`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
        />
      </svg>

      {/* Slot label */}
      <span className="font-mono text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors text-center px-4 leading-tight">
        {slot.label}
      </span>

      {/* Drop zone hint */}
      <span className="font-mono text-[9px] text-zinc-700 mt-1 tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
        drop image here
      </span>
    </motion.div>
  );
}

// ─── Hero Section ───────────────────────────────────────────────────────────
function TimelineHero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div ref={ref} className="relative min-h-[70vh] flex flex-col items-center justify-center px-6">
      <motion.div
        style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
        className="text-center max-w-3xl"
      >
        {/* Terminal-style header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 mb-6 bg-white/[0.03] backdrop-blur-sm border border-zinc-800/50 rounded-full px-5 py-2"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-xs tracking-[0.3em] uppercase text-zinc-500">
            FTC Team Parabellum
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl sm:text-7xl font-bold text-zinc-100 mb-4 font-[family-name:var(--font-geist-sans)] leading-[1.1]"
        >
          Parabellum
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="font-mono text-sm sm:text-base text-zinc-500 max-w-xl mx-auto leading-relaxed mb-8"
        >
          Five seasons of building robots, leading a team, and pushing the limits of what a student
          FTC team can achieve — from founding to provincials.
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-zinc-600">
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
    </div>
  );
}

// ─── Scroll Progress Bar ────────────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500 origin-left z-50"
    />
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function ParabellumPage() {
  return (
    <div className="relative min-h-screen w-full bg-zinc-950 text-zinc-100 overflow-y-auto overflow-x-hidden">
      <ScrollProgress />

      {/* Background pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 p-6 sm:px-12 pointer-events-none">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center text-zinc-500 hover:text-cyan-400 transition-colors font-mono text-sm tracking-widest uppercase bg-zinc-900/70 px-4 py-2 rounded-md backdrop-blur-md border border-zinc-800/50 shadow-lg shadow-black/20"
        >
          &lt; back_to_portfolio
        </Link>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <TimelineHero />

      {/* ── Timeline ───────────────────────────────────────── */}
      <div className="relative max-w-6xl mx-auto px-6 sm:px-12 pb-32">
        {/* Central spine line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-gradient-to-b from-zinc-800 via-zinc-800/50 to-transparent" />

        <div className="space-y-24 sm:space-y-32">
          {TIMELINE_DATA.map((entry, i) => (
            <TimelineEntryCard key={entry.year} entry={entry} index={i} />
          ))}
        </div>

        {/* ── Timeline End Marker ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="relative flex flex-col items-center mt-32"
        >
          <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center shadow-lg z-10">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="mt-6 text-center">
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-zinc-600 mb-2">
              Legacy Continues
            </p>
            <p className="text-zinc-500 text-sm max-w-md font-[family-name:var(--font-geist-sans)]">
              Team Parabellum lives on — the systems, the culture, and the drive to build.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Footer spacer ──────────────────────────────────── */}
      <div className="h-32" />
    </div>
  );
}
