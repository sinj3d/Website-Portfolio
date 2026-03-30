"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode, useContext, useRef } from "react";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

function FrozenRoute({ children }: { children: ReactNode }) {
    const context = useContext(LayoutRouterContext);
    const frozen = useRef(context).current;

    return (
        <LayoutRouterContext.Provider value={frozen}>
            {children}
        </LayoutRouterContext.Provider>
    );
}

export default function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, scaleY: 1, scaleX: 1, filter: "brightness(1) blur(0px)" }}
                exit={
                    pathname !== "/" 
                    ? {
                        opacity: [1, 1, 0],
                        scaleY: [1, 0.02, 0],
                        scaleX: [1, 1, 0],
                        filter: ["brightness(1) blur(0px)", "brightness(2) blur(1px)", "brightness(0) blur(4px)"],
                        transition: { duration: 1.5, times: [0, 0.4, 1], ease: "easeInOut" }
                      }
                    : { opacity: 0, transition: { duration: 0.5 } }
                }
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="w-full h-full relative z-10 origin-center bg-zinc-950"
            >
                <FrozenRoute>{children}</FrozenRoute>
            </motion.div>
        </AnimatePresence>
    );
}
