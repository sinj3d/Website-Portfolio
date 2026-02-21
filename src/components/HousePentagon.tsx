"use client";

import { motion } from "framer-motion";

export default function HousePentagon() {
    const lineVariant = {
        hidden: { pathLength: 0 },
        visible: { pathLength: 1 }
    };

    return (
        <div className="flex items-center justify-center bg-white p-4">
            <motion.svg
                width="200"
                height="200"
                viewBox="0 0 100 100"
                initial="hidden"
                animate="visible"
                className="stroke-zinc-900 stroke-[2px] overflow-visible"
                style={{ strokeLinecap: "round", fill: "none" }}
            >
                {/* Base: Horizontal (y=90) - Limit constraint: Horizontal means y1=y2 */}
                <motion.line
                    x1="20" y1="90" x2="80" y2="90"
                    variants={lineVariant}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0 }}
                />

                {/* Walls: Bottom-up (y1=90 > y2=50) - Draws second */}
                <motion.line
                    x1="20" y1="90" x2="20" y2="50"
                    variants={lineVariant}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.5 }}
                />
                <motion.line
                    x1="80" y1="90" x2="80" y2="50"
                    variants={lineVariant}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.5 }}
                />

                {/* Roof: Bottom-up (y1=50 > y2=5) - Draws third */}
                <motion.line
                    x1="20" y1="50" x2="50" y2="5"
                    variants={lineVariant}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 1.0 }}
                />
                <motion.line
                    x1="80" y1="50" x2="50" y2="5"
                    variants={lineVariant}
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 1.0 }}
                />
            </motion.svg>
        </div>
    );
}
